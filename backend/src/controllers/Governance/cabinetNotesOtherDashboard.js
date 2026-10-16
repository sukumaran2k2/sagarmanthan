// ============================================================
// FILE: backend/src/controllers/Governance/cabinetNotesOtherDashboard.js
// ============================================================
// Then add the following to backend/src/routes.js:
//
//   import cabinetNotesOtherDashboard from "./controllers/Governance/cabinetNotesOtherDashboard.js";
//
//   router.get("/cabinet-notes-other-dashboard", cabinetNotesOtherDashboard.getCabinetNotesOtherDashboard);
// ============================================================

import { pool } from "../../db.js";

// SLA thresholds per stage (days). Tune with Harish/team if needed.
const SLA_THRESHOLDS = {
  0: { warn: 999, critical: 999 }, // No Status — no SLA
  1: { warn: 10,  critical: 20  }, // Received at Ministry
  2: { warn: 20,  critical: 40  }, // Sent for Comments
  3: { warn: 20,  critical: 40  }, // Comments Received
  4: { warn: 15,  critical: 30  }, // File submitted for Approval
  5: { warn: 999, critical: 999 }, // Reply furnished to other ministry — no SLA (complete)
};

function slaStatus(avgDays, stageId) {
  const t = SLA_THRESHOLDS[stageId];
  if (!t || t.critical >= 999) return null;
  if (avgDays >= t.critical) return "Critical";
  if (avgDays >= t.warn)     return "At Risk";
  return "Good";
}

// Each stage's own "entered stage" date column, matching mmt_cabinet_ministry_stage.cab_ministry_stage_id
const STAGE_DATE_CASE = `
  CASE notes.stage_id
    WHEN 1 THEN notes.received_ministry_date
    WHEN 2 THEN notes.sent_for_comments_date
    WHEN 3 THEN notes.comments_rec_date
    WHEN 4 THEN notes.file_submitted_date
    WHEN 5 THEN notes.reply_furnished_date
  END
`;

async function getCabinetNotesOtherDashboard(req, res) {
  const conn = await pool;
  try {
    // ── 1. KPI counters + average age of active notes ──────────────────────
    const kpiResult = await conn.query(`
      SELECT
        COUNT(*)                                                        AS total_notes,
        SUM(CASE WHEN notes.stage_id != 5 THEN 1 ELSE 0 END)          AS active_notes,
        SUM(CASE WHEN notes.stage_id  = 5 THEN 1 ELSE 0 END)          AS completed_notes,
        CAST(
          AVG(CASE
            WHEN notes.stage_id != 5
            THEN CAST(DATEDIFF(day, notes.created_date, GETDATE()) AS FLOAT)
          END)
        AS INT)                                                         AS avg_age_active_days,
        MAX(notes.updated_date)                                         AS last_data_update
      FROM tbl_cabinet_notes_ministry_change AS notes
    `);

    const kpi = kpiResult.recordset[0] || {};

    // ── 2. Stage-wise heat map ─────────────────────────────────────────────
    const heatResult = await conn.query(`
      SELECT
        stage.cab_ministry_stage_id                                     AS stage_id,
        stage.cab_ministry_stage_name                                   AS stage_name,
        COUNT(notes.cabinet_notes_ministry_id)                          AS note_count,
        CAST(AVG(CAST(DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, notes.created_date),
          GETDATE()
        ) AS FLOAT)) AS INT)                                            AS avg_days,
        MAX(DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, notes.created_date),
          GETDATE()
        ))                                                               AS max_days
      FROM mmt_cabinet_ministry_stage AS stage
      LEFT JOIN tbl_cabinet_notes_ministry_change AS notes
        ON notes.stage_id = stage.cab_ministry_stage_id
        AND notes.stage_id != 5
      GROUP BY stage.cab_ministry_stage_id, stage.cab_ministry_stage_name
      ORDER BY stage.cab_ministry_stage_id
    `);

    const heatMap = heatResult.recordset.map((row) => ({
      stage_id:   row.stage_id,
      stage_name: row.stage_name,
      note_count: row.note_count,
      avg_days:   row.avg_days,
      max_days:   row.max_days,
      sla_status: row.note_count === 0 ? null : slaStatus(row.avg_days, row.stage_id),
    }));

    // ── 3. Ministry-wise pending (active, non-completed) notes ────────────
    // No wing column on this table — notes belong to other ministries, so we
    // group by ministry instead, falling back to the free-text ministry_name
    // column for notes whose ministry isn't in the mmt_ministry master list.
    const ministryResult = await conn.query(`
      SELECT
        ISNULL(ministries.ministry_name, notes.ministry_name)           AS ministry_name,
        COUNT(notes.cabinet_notes_ministry_id)                          AS pending_count
      FROM tbl_cabinet_notes_ministry_change AS notes
      LEFT JOIN mmt_ministry AS ministries
        ON ministries.ministry_id = notes.ministry_id
      WHERE notes.stage_id != 5
      GROUP BY ISNULL(ministries.ministry_name, notes.ministry_name)
      ORDER BY pending_count DESC
    `);

    // ── 4. Long pending cabinet notes (top 10 by pending days) ────────────
    const longPendingResult = await conn.query(`
      SELECT TOP 10
        notes.cabinet_notes_ministry_id,
        notes.subject,
        ISNULL(ministries.ministry_name, notes.ministry_name)           AS ministry_name,
        stage.cab_ministry_stage_name                                   AS current_stage,
        notes.updated_date,
        DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, notes.created_date),
          GETDATE()
        )                                                                AS pending_days
      FROM tbl_cabinet_notes_ministry_change AS notes
      LEFT JOIN mmt_ministry AS ministries
        ON ministries.ministry_id = notes.ministry_id
      INNER JOIN mmt_cabinet_ministry_stage AS stage
        ON stage.cab_ministry_stage_id = notes.stage_id
      WHERE notes.stage_id != 5
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
      ministryWise: ministryResult.recordset,
      longPending: longPendingResult.recordset,
    });
  } catch (err) {
    console.error("[CabinetNotesOtherDashboard] Error:", err);
    return res.sendStatus(500);
  }
}

export default { getCabinetNotesOtherDashboard };
