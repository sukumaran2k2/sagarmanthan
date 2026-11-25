import { pool } from "../../db.js";
import { dataScopePredicate } from "../../middleware/dataScope.js";
import { COMPLETED_SQL, completedStageNameSql } from "./parliamentaryIssue.js";

// Parliamentary issues span several issue types (Assurance, Zero Hours, Rule 377, ...), each with
// its own stages in mmt_parliamentary_stage. The same stage NAME repeats across types, so the
// dashboard groups by stage name, not by stage_id.
//
// Every figure counts the same issues as the Data List: Active / Completed follow the list's
// COMPLETED_SQL, and an issue with no stage or no wing is kept (as "No Status" / "Not
// specified") instead of being dropped by an inner join.

const NO_STAGE = "No Status";
const NO_WING = "Not specified";

const FROM_SQL = `
  FROM tbl_parliamentary_issue AS tpi
  LEFT JOIN mmt_parliamentary_stage AS mps ON mps.parlia_stage_id = tpi.stage_id
  LEFT JOIN mmt_wings AS wings ON wings.wing_id = tpi.wing
`;

// Date the issue entered its current (active) stage; matched by the words in the stage name so
// it keeps working if a misspelt name ("Soughted") is corrected in the master
const STAGE_NAME = `LOWER(ISNULL(mps.parlia_stage_name, N''))`;
const STAGE_DATE_SQL = `
  CASE
    WHEN ${STAGE_NAME} LIKE N'%received at ministry%' THEN tpi.received_at_ministry_date
    WHEN ${STAGE_NAME} LIKE N'%comment%sought%' THEN tpi.comment_soughted_date
    WHEN ${STAGE_NAME} LIKE N'%comment%received%' THEN tpi.comment_received_date
    WHEN ${STAGE_NAME} LIKE N'%extension%' THEN tpi.extension_time_soughted_date
    WHEN ${STAGE_NAME} LIKE N'%implementation report%' THEN tpi.implementation_report_furnished_date
    WHEN ${STAGE_NAME} LIKE N'%debated%' THEN tpi.debated_in_parliament_date
  END
`;
// Days in the current stage; with no stage date, days since the issue was entered. A stage date
// after today (entered by mistake) counts as 0 days, not a negative number.
const DAYS_IN_STAGE_SQL = `(SELECT MAX(d) FROM (VALUES
  (DATEDIFF(day, COALESCE(${STAGE_DATE_SQL}, tpi.created_date), GETDATE())), (0)) AS days(d))`;

async function getParliamentaryIssueDashboard(req, res) {
  const conn = await pool;
  try {
    // Issues carry no organisation_id, so the scope follows the creating user's organisation -
    // the same rule the Data List uses (QC PI-BE-02). Ministry / master scope sees everything;
    // a user with no scope sees nothing.
    const request = conn.request();
    const inScope = dataScopePredicate(request, req.user, {
      strategy: 'viaCreatedBy',
      alias: 'tpi',
    });
    const activeWhere = `WHERE ${inScope} AND NOT ${COMPLETED_SQL}`;

    // 1. Cards: totals (equal to the Data List's Active + Completed tabs), average age of the
    // active issues, and the latest entry or edit
    const kpiResult = await request.query(`
      SELECT
        COUNT(*)                                                    AS total_notes,
        SUM(CASE WHEN ${COMPLETED_SQL} THEN 0 ELSE 1 END)           AS active_notes,
        SUM(CASE WHEN ${COMPLETED_SQL} THEN 1 ELSE 0 END)           AS completed_notes,
        CAST(AVG(CASE WHEN NOT ${COMPLETED_SQL}
          THEN CAST(DATEDIFF(day, tpi.created_date, GETDATE()) AS FLOAT) END) AS INT) AS avg_age_active_days,
        MAX(COALESCE(tpi.updated_date, tpi.created_date))           AS last_data_update
      ${FROM_SQL}
      WHERE ${inScope}
    `);
    const kpi = kpiResult.recordset[0] || {};

    // 2. Active issues by stage name: every stage an active issue can be in (the master's
    // non-completed names, plus "No Status" for an issue without a stage), so the counts add
    // up to the Active card
    const heatResult = await request.query(`
      WITH active AS (
        SELECT ISNULL(mps.parlia_stage_name, N'${NO_STAGE}') AS stage_name, ${DAYS_IN_STAGE_SQL} AS days
        ${FROM_SQL}
        ${activeWhere}
      ),
      stages AS (
        SELECT parlia_stage_name AS stage_name, MIN(parlia_stage_id) AS ord
        FROM mmt_parliamentary_stage
        WHERE NOT ${completedStageNameSql(`LOWER(ISNULL(parlia_stage_name, N''))`)}
        GROUP BY parlia_stage_name
        UNION
        SELECT N'${NO_STAGE}', -1
        WHERE NOT EXISTS (SELECT 1 FROM mmt_parliamentary_stage WHERE parlia_stage_name = N'${NO_STAGE}')
      )
      SELECT
        stages.stage_name,
        COUNT(active.stage_name)                    AS note_count,
        CAST(AVG(CAST(active.days AS FLOAT)) AS INT) AS avg_days,
        MAX(active.days)                            AS max_days
      FROM stages
      LEFT JOIN active ON active.stage_name = stages.stage_name
      GROUP BY stages.stage_name, stages.ord
      ORDER BY stages.ord, stages.stage_name
    `);
    const heatMap = heatResult.recordset.map((row) => ({
      stage_name: row.stage_name,
      note_count: row.note_count,
      avg_days: row.avg_days,
      max_days: row.max_days,
    }));

    // 3. Active issues by wing (adds up to the Active card)
    const wingResult = await request.query(`
      SELECT
        wings.wing_id,
        ISNULL(wings.wing_name, N'${NO_WING}') AS wing_name,
        COUNT(*)                               AS pending_count
      ${FROM_SQL}
      ${activeWhere}
      GROUP BY wings.wing_id, wings.wing_name
      ORDER BY pending_count DESC, wing_name
    `);

    // 4. The 10 active issues longest in their current stage (ties by issue id, so the list
    // doesn't reorder between loads)
    const longPendingResult = await request.query(`
      SELECT TOP 10
        tpi.parliamentary_issue_id,
        tpi.subject,
        ISNULL(wings.wing_name, N'${NO_WING}')          AS wing_name,
        ISNULL(mps.parlia_stage_name, N'${NO_STAGE}')   AS current_stage,
        tpi.updated_date,
        ${DAYS_IN_STAGE_SQL}                             AS pending_days
      ${FROM_SQL}
      ${activeWhere}
      ORDER BY pending_days DESC, tpi.parliamentary_issue_id
    `);

    return res.json({
      kpi: {
        total: Number(kpi.total_notes) || 0,
        active: Number(kpi.active_notes) || 0,
        completed: Number(kpi.completed_notes) || 0,
        avgAgeDays: kpi.avg_age_active_days != null ? Number(kpi.avg_age_active_days) : null,
      },
      lastDataUpdate: kpi.last_data_update || null,
      heatMap,
      wingWise: wingResult.recordset,
      longPending: longPendingResult.recordset,
    });
  } catch (err) {
    console.error("[ParliamentaryIssueDashboard] Error:", err);
    return res.status(500).json({ error: "Could not load the dashboard. Please try again." });
  }
}

export default { getParliamentaryIssueDashboard };
