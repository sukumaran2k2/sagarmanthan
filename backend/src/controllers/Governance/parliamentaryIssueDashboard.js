// ============================================================
// FILE: backend/src/controllers/Governance/parliamentaryIssueDashboard.js
// ============================================================
// Then add the following to backend/src/routes.js:
//
//   import parliamentaryIssueDashboard from "./controllers/Governance/parliamentaryIssueDashboard.js";
//
//   router.get("/parliamentary-issue-dashboard", auth, requireModulePermission("PARLIAMENTARY_ISSUES", "read"), parliamentaryIssueDashboard.getParliamentaryIssueDashboard);
// ============================================================

import { pool } from "../../db.js";

// Parliamentary issues span 5 issue types (Assurance, Zero Hours, Rule 377,
// Special Mention, PSC Report), each with its own 6-7 stage sub-sequence in
// mmt_parliamentary_stage — the same numeric stage_id means different things
// in different types, but the stage NAMES repeat consistently across types.
// So the dashboard groups by stage NAME (9 distinct values), not raw stage_id.

// Reused verbatim from parliamentaryIssue.js's own completion logic, for consistency.
const COMPLETED_SQL = `(
  LOWER(mps.parlia_stage_name) LIKE N'%matter disposed%'
  OR (
    (LOWER(mps.parlia_stage_name) LIKE N'%reply%' OR LOWER(mps.parlia_stage_name) LIKE N'%replay%')
    AND (LOWER(mps.parlia_stage_name) LIKE N'%sent%' OR LOWER(mps.parlia_stage_name) LIKE N'%send%')
  )
  OR LOWER(LTRIM(RTRIM(mps.parlia_stage_name))) = N'completed'
  OR tpi.matter_disposed_date IS NOT NULL
  OR tpi.reply_send_date IS NOT NULL
)`;

// Each distinct stage NAME's own "entered stage" date column.
const STAGE_DATE_CASE = `
  CASE mps.parlia_stage_name
    WHEN 'Received At Ministry' THEN tpi.received_at_ministry_date
    WHEN 'Comments Sought' THEN tpi.comment_soughted_date
    WHEN 'Comments Received' THEN tpi.comment_received_date
    WHEN 'Extension Of Time Soughted' THEN tpi.extension_time_soughted_date
    WHEN 'Implementation Report Furnished/Request for dropping' THEN tpi.implementation_report_furnished_date
    WHEN 'Matter Disposed' THEN tpi.matter_disposed_date
    WHEN 'Debated in Parliament' THEN tpi.debated_in_parliament_date
    WHEN 'Replay sent' THEN tpi.reply_send_date
  END
`;

// SLA thresholds per stage name (days). Tune with Harish/team if needed.
const SLA_THRESHOLDS = {
  'No Status': { warn: 999, critical: 999 },
  'Received At Ministry': { warn: 10, critical: 20 },
  'Comments Sought': { warn: 20, critical: 40 },
  'Comments Received': { warn: 15, critical: 30 },
  'Extension Of Time Soughted': { warn: 15, critical: 30 },
  'Implementation Report Furnished/Request for dropping': { warn: 15, critical: 30 },
  'Debated in Parliament': { warn: 15, critical: 30 },
  'Matter Disposed': { warn: 999, critical: 999 },
  'Replay sent': { warn: 999, critical: 999 },
};

function slaStatus(avgDays, stageName) {
  const t = SLA_THRESHOLDS[stageName];
  if (!t || t.critical >= 999) return null;
  if (avgDays >= t.critical) return "Critical";
  if (avgDays >= t.warn)     return "At Risk";
  return "Good";
}

async function getParliamentaryIssueDashboard(req, res) {
  const conn = await pool;
  try {
    // ── 1. KPI counters + average age of active issues ─────────────────────
    const kpiResult = await conn.query(`
      SELECT
        COUNT(*)                                                        AS total_notes,
        SUM(CASE WHEN NOT ${COMPLETED_SQL} THEN 1 ELSE 0 END)         AS active_notes,
        SUM(CASE WHEN     ${COMPLETED_SQL} THEN 1 ELSE 0 END)         AS completed_notes,
        CAST(
          AVG(CASE
            WHEN NOT ${COMPLETED_SQL}
            THEN CAST(DATEDIFF(day, tpi.created_date, GETDATE()) AS FLOAT)
          END)
        AS INT)                                                         AS avg_age_active_days,
        MAX(tpi.updated_date)                                           AS last_data_update
      FROM tbl_parliamentary_issue AS tpi
      INNER JOIN mmt_parliamentary_stage AS mps
        ON tpi.stage_id = mps.parlia_stage_id
    `);

    const kpi = kpiResult.recordset[0] || {};

    // ── 2. Stage-wise heat map (grouped by distinct stage NAME) ────────────
    const heatResult = await conn.query(`
      SELECT
        stageNames.parlia_stage_name                                     AS stage_name,
        COUNT(tpi.parliamentary_issue_id)                               AS note_count,
        CAST(AVG(CAST(DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, tpi.created_date),
          GETDATE()
        ) AS FLOAT)) AS INT)                                            AS avg_days,
        MAX(DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, tpi.created_date),
          GETDATE()
        ))                                                               AS max_days
      FROM (SELECT DISTINCT parlia_stage_name FROM mmt_parliamentary_stage) AS stageNames
      LEFT JOIN mmt_parliamentary_stage AS mps
        ON mps.parlia_stage_name = stageNames.parlia_stage_name
      LEFT JOIN tbl_parliamentary_issue AS tpi
        ON tpi.stage_id = mps.parlia_stage_id
        AND NOT ${COMPLETED_SQL}
      GROUP BY stageNames.parlia_stage_name
      ORDER BY MIN(mps.parlia_stage_id)
    `);

    const heatMap = heatResult.recordset.map((row) => ({
      stage_name: row.stage_name,
      note_count: row.note_count,
      avg_days:   row.avg_days,
      max_days:   row.max_days,
      sla_status: row.note_count === 0 ? null : slaStatus(row.avg_days, row.stage_name),
    }));

    // ── 3. Wing-wise pending (active) issues ────────────────────────────────
    const wingResult = await conn.query(`
      SELECT
        wings.wing_id,
        wings.wing_name,
        COUNT(tpi.parliamentary_issue_id)                               AS pending_count
      FROM mmt_wings AS wings
      LEFT JOIN tbl_parliamentary_issue AS tpi
        ON tpi.wing = wings.wing_id
      LEFT JOIN mmt_parliamentary_stage AS mps
        ON mps.parlia_stage_id = tpi.stage_id
      WHERE tpi.parliamentary_issue_id IS NULL
         OR NOT ${COMPLETED_SQL}
      GROUP BY wings.wing_id, wings.wing_name
      HAVING COUNT(tpi.parliamentary_issue_id) > 0
      ORDER BY pending_count DESC
    `);

    // ── 4. Long pending issues (top 10 by pending days) ─────────────────────
    const longPendingResult = await conn.query(`
      SELECT TOP 10
        tpi.parliamentary_issue_id,
        tpi.subject,
        wings.wing_name,
        mps.parlia_stage_name                                           AS current_stage,
        tpi.updated_date,
        DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, tpi.created_date),
          GETDATE()
        )                                                                AS pending_days
      FROM tbl_parliamentary_issue AS tpi
      INNER JOIN mmt_parliamentary_stage AS mps
        ON mps.parlia_stage_id = tpi.stage_id
      INNER JOIN mmt_wings AS wings
        ON wings.wing_id = tpi.wing
      WHERE NOT ${COMPLETED_SQL}
      ORDER BY pending_days DESC
    `);

    return res.json({
      kpi: {
        total:     Number(kpi.total_notes)        || 0,
        active:    Number(kpi.active_notes)        || 0,
        completed: Number(kpi.completed_notes)     || 0,
        avgAgeDays: kpi.avg_age_active_days != null ? Number(kpi.avg_age_active_days) : null,
      },
      lastDataUpdate: kpi.last_data_update || null,
      heatMap,
      wingWise:    wingResult.recordset,
      longPending: longPendingResult.recordset,
    });
  } catch (err) {
    console.error("[ParliamentaryIssueDashboard] Error:", err);
    return res.sendStatus(500);
  }
}

export default { getParliamentaryIssueDashboard };
