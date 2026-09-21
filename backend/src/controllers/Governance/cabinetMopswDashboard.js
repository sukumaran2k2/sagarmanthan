// ============================================================
// FILE: backend/src/controllers/Governance/cabinetMopswDashboard.js
// ============================================================
// Drop this file into:
//   sagarmanthan-repo/backend/src/controllers/Governance/cabinetMopswDashboard.js
//
// Then add the following to backend/src/routes.js:
//
//   import cabinetMopswDashboard from "./controllers/Governance/cabinetMopswDashboard.js";
//
//   // Cabinet Notes MOPSW – Dashboard (add near the other /cabinet-mopsw routes)
//   router.get(
//     "/cabinet-mopsw-dashboard",
//     auth,
//     requireModulePermission("CABINET_NOTES_MOPSW", "read"),
//     cabinetMopswDashboard.getCabinetMopswDashboard
//   );
// ============================================================

import { pool } from "../../db.js";

// SLA thresholds per stage (days).  Tune with Harish/team if needed.
const SLA_THRESHOLDS = {
  1:  { warn: 15,  critical: 30  }, // Preliminary DCN Prepared
  2:  { warn: 15,  critical: 30  }, // Preliminary DCN Approved by Minister
  3:  { warn: 30,  critical: 60  }, // Circulated for IMC
  4:  { warn: 60,  critical: 120 }, // IMC Comments Received
  5:  { warn: 20,  critical: 45  }, // Final DCN to be Prepared
  6:  { warn: 15,  critical: 30  }, // Final DCN Approved by Minister
  7:  { warn: 30,  critical: 60  }, // Advance Copy Sent to PMO
  8:  { warn: 15,  critical: 30  }, // Cabinet Approved
  9:  { warn: 999, critical: 999 }, // On Hold  — no SLA (always "—")
  10: { warn: 999, critical: 999 }, // Completed — no SLA
  // stage 11 (DCM Been Approved) excluded — unconfirmed, not in reference dashboard
};

function slaStatus(avgDays, stageId) {
  const t = SLA_THRESHOLDS[stageId];
  if (!t || t.critical >= 999) return null;
  if (avgDays >= t.critical) return "Critical";
  if (avgDays >= t.warn)     return "At Risk";
  return "Good";
}

// Reuse the same COMPLETED definition as the main controller
const COMPLETED_CONDITION = `(
  LOWER(LTRIM(RTRIM(stage.mopsw_stage_name))) = N'completed'
  OR notes.stage_id = 10
  OR notes.completed_date IS NOT NULL
)`;

async function getCabinetMopswDashboard(req, res) {
  const conn = await pool;
  try {
    // ── 1. KPI counters + average age of active notes ──────────────────────
    const kpiResult = await conn.query(`
      SELECT
        COUNT(*)                                                        AS total_notes,
        SUM(CASE WHEN NOT ${COMPLETED_CONDITION} THEN 1 ELSE 0 END)   AS active_notes,
        SUM(CASE WHEN     ${COMPLETED_CONDITION} THEN 1 ELSE 0 END)   AS completed_notes,
        -- average age = avg days since created_date for active (non-completed) notes
        CAST(
          AVG(CASE
            WHEN NOT ${COMPLETED_CONDITION}
            THEN CAST(DATEDIFF(day, notes.created_date, GETDATE()) AS FLOAT)
          END)
        AS INT)                                                         AS avg_age_active_days
      FROM tbl_cabinet_notes_mopsw AS notes
      INNER JOIN mmt_cabinet_mopsw_stage AS stage
        ON stage.mopsw_stage_id = notes.stage_id
      WHERE notes.stage_id != 11
    `);

    const kpi = kpiResult.recordset[0] || {};

    // ── 2. Stage-wise heat map ─────────────────────────────────────────────
    //  For each stage: count of notes currently at that stage (active),
    //  average days in stage (since the stage's own date column was filled),
    //  and max days.  "Days in stage" = days since the relevant date column
    //  was set (we use created_date as fallback when stage date is null).
    const heatResult = await conn.query(`
      SELECT
        stage.mopsw_stage_id                                            AS stage_id,
        stage.mopsw_stage_name                                          AS stage_name,
        COUNT(notes.cabinet_notes_mopsw_id)                            AS note_count,
        CAST(AVG(CAST(DATEDIFF(day,
          COALESCE(
            CASE notes.stage_id
              WHEN  1 THEN notes.pre_dcn_prepared_date
              WHEN  2 THEN notes.pre_dcn_approved_date
              WHEN  3 THEN notes.cirucalted_for_imc_date
              WHEN  4 THEN notes.imc_comments_rec_date
              WHEN  5 THEN notes.final_dcn_prepared_date
              WHEN  6 THEN notes.final_dcn_approved_date
              WHEN  7 THEN notes.advance_copy_sent_to_pmo_date
              WHEN  8 THEN notes.cabinet_approved_date
              WHEN  9 THEN notes.on_hold_date
              WHEN 11 THEN notes.dcmbeen_approved_date
            END,
            notes.created_date
          ),
          GETDATE()
        ) AS FLOAT)) AS INT)                                            AS avg_days,
        MAX(DATEDIFF(day,
          COALESCE(
            CASE notes.stage_id
              WHEN  1 THEN notes.pre_dcn_prepared_date
              WHEN  2 THEN notes.pre_dcn_approved_date
              WHEN  3 THEN notes.cirucalted_for_imc_date
              WHEN  4 THEN notes.imc_comments_rec_date
              WHEN  5 THEN notes.final_dcn_prepared_date
              WHEN  6 THEN notes.final_dcn_approved_date
              WHEN  7 THEN notes.advance_copy_sent_to_pmo_date
              WHEN  8 THEN notes.cabinet_approved_date
              WHEN  9 THEN notes.on_hold_date
              WHEN 11 THEN notes.dcmbeen_approved_date
            END,
            notes.created_date
          ),
          GETDATE()
        ))                                                               AS max_days
      FROM mmt_cabinet_mopsw_stage AS stage
      LEFT JOIN tbl_cabinet_notes_mopsw AS notes
        ON notes.stage_id = stage.mopsw_stage_id
        AND NOT ${COMPLETED_CONDITION.replace(/notes\./g, 'notes.')}
      WHERE stage.mopsw_stage_id != 11  -- DCM Been Approved excluded: unconfirmed stage not in reference
      GROUP BY stage.mopsw_stage_id, stage.mopsw_stage_name
      ORDER BY stage.mopsw_stage_id
    `);

    const heatMap = heatResult.recordset.map((row) => ({
      stage_id:   row.stage_id,
      stage_name: row.stage_name,
      note_count: row.note_count,
      avg_days:   row.avg_days,
      max_days:   row.max_days,
      sla_status: row.note_count === 0 ? null : slaStatus(row.avg_days, row.stage_id),
    }));

    // ── 3. Wing-wise pending (active) notes ───────────────────────────────
    const wingResult = await conn.query(`
      SELECT
        wings.wing_id,
        wings.wing_name,
        COUNT(notes.cabinet_notes_mopsw_id)                            AS total_pending,
        SUM(CASE WHEN stage.mopsw_stage_id = 8 THEN 1 ELSE 0 END)    AS cabinet_approved,
        SUM(CASE WHEN stage.mopsw_stage_id = 9 THEN 1 ELSE 0 END)    AS on_hold,
        SUM(CASE WHEN stage.mopsw_stage_id NOT IN (8,9,10,11)
                       THEN 1 ELSE 0 END)                             AS in_progress
      FROM mmt_wings AS wings
      LEFT JOIN tbl_cabinet_notes_mopsw AS notes
        ON notes.wing = wings.wing_id
        AND notes.stage_id != 11
      LEFT JOIN mmt_cabinet_mopsw_stage AS stage
        ON stage.mopsw_stage_id = notes.stage_id
      WHERE notes.cabinet_notes_mopsw_id IS NULL
         OR NOT ${COMPLETED_CONDITION}
      GROUP BY wings.wing_id, wings.wing_name
      HAVING COUNT(notes.cabinet_notes_mopsw_id) > 0
      ORDER BY total_pending DESC
    `);

    // ── 4. Long pending cabinet notes (top 10 by pending days) ────────────
    const longPendingResult = await conn.query(`
      SELECT TOP 10
        notes.cabinet_notes_mopsw_id,
        notes.subject,
        wings.wing_name,
        stage.mopsw_stage_name                                          AS current_stage,
        DATEDIFF(day,
          COALESCE(
            CASE notes.stage_id
              WHEN  1 THEN notes.pre_dcn_prepared_date
              WHEN  2 THEN notes.pre_dcn_approved_date
              WHEN  3 THEN notes.cirucalted_for_imc_date
              WHEN  4 THEN notes.imc_comments_rec_date
              WHEN  5 THEN notes.final_dcn_prepared_date
              WHEN  6 THEN notes.final_dcn_approved_date
              WHEN  7 THEN notes.advance_copy_sent_to_pmo_date
              WHEN  8 THEN notes.cabinet_approved_date
              WHEN  9 THEN notes.on_hold_date
            END,
            notes.created_date
          ),
          GETDATE()
        )                                                                AS pending_days
      FROM tbl_cabinet_notes_mopsw AS notes
      INNER JOIN mmt_cabinet_mopsw_stage AS stage
        ON stage.mopsw_stage_id = notes.stage_id
      INNER JOIN mmt_wings AS wings
        ON wings.wing_id = notes.wing
      WHERE NOT ${COMPLETED_CONDITION}
        AND notes.stage_id != 11
      ORDER BY pending_days DESC
    `);

    return res.json({
      kpi: {
        total:     Number(kpi.total_notes)        || 0,
        active:    Number(kpi.active_notes)        || 0,
        completed: Number(kpi.completed_notes)     || 0,
        avgAgeDays: kpi.avg_age_active_days != null ? Number(kpi.avg_age_active_days) : null,
      },
      heatMap,
      wingWise:    wingResult.recordset,
      longPending: longPendingResult.recordset,
    });
  } catch (err) {
    console.error("[CabinetMopswDashboard] Error:", err);
    return res.sendStatus(500);
  }
}

export default { getCabinetMopswDashboard };
