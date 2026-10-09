// ============================================================
// FILE: backend/src/controllers/Governance/vipReferenceDashboard.js
// ============================================================
// Then add the following to backend/src/routes.js:
//
//   import vipReferenceDashboard from "./controllers/Governance/vipReferenceDashboard.js";
//
//   router.get("/vip-reference-dashboard", vipReferenceDashboard.getVipReferenceDashboard);
// ============================================================

import { pool } from "../../db.js";

// SLA thresholds per stage (days). Tune with Harish/team if needed.
const SLA_THRESHOLDS = {
  0: { warn: 999, critical: 999 }, // No Status — no SLA
  1: { warn: 10,  critical: 20  }, // Received but yet to be sent for Comments
  2: { warn: 15,  critical: 30  }, // Submitted for Approval
  3: { warn: 20,  critical: 40  }, // Comments Sought
  4: { warn: 20,  critical: 40  }, // Comments Received
  5: { warn: 10,  critical: 20  }, // Reply Furnished
  6: { warn: 999, critical: 999 }, // Disposed — no SLA (complete)
};

function slaStatus(avgDays, stageId) {
  const t = SLA_THRESHOLDS[stageId];
  if (!t || t.critical >= 999) return null;
  if (avgDays >= t.critical) return "Critical";
  if (avgDays >= t.warn)     return "At Risk";
  return "Good";
}

// Each stage's own "entered stage" date column, matching mmt_vip_stage.vip_stage_id
const STAGE_DATE_CASE = `
  CASE notes.stage_id
    WHEN 1 THEN notes.received_at_ministry_date
    WHEN 2 THEN notes.submitted_for_approval_date
    WHEN 3 THEN notes.comments_sought_date
    WHEN 4 THEN notes.comments_received_date
    WHEN 5 THEN notes.reply_furnished_date
    WHEN 6 THEN notes.disposed_date
  END
`;

async function getVipReferenceDashboard(req, res) {
  const conn = await pool;
  try {
    // ── 1. KPI counters + average age of active references ─────────────────
    const kpiResult = await conn.query(`
      SELECT
        COUNT(*)                                                        AS total_notes,
        SUM(CASE WHEN notes.stage_id != 6 THEN 1 ELSE 0 END)          AS active_notes,
        SUM(CASE WHEN notes.stage_id  = 6 THEN 1 ELSE 0 END)          AS completed_notes,
        CAST(
          AVG(CASE
            WHEN notes.stage_id != 6
            THEN CAST(DATEDIFF(day, notes.created_date, GETDATE()) AS FLOAT)
          END)
        AS INT)                                                         AS avg_age_active_days,
        MAX(notes.updated_date)                                         AS last_data_update
      FROM tbl_vip_reference_change AS notes
    `);

    const kpi = kpiResult.recordset[0] || {};

    // ── 2. Stage-wise heat map ─────────────────────────────────────────────
    const heatResult = await conn.query(`
      SELECT
        stage.vip_stage_id                                              AS stage_id,
        stage.vip_stage_name                                            AS stage_name,
        COUNT(notes.vip_reference_id)                                   AS note_count,
        CAST(AVG(CAST(DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, notes.created_date),
          GETDATE()
        ) AS FLOAT)) AS INT)                                            AS avg_days,
        MAX(DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, notes.created_date),
          GETDATE()
        ))                                                               AS max_days
      FROM mmt_vip_stage AS stage
      LEFT JOIN tbl_vip_reference_change AS notes
        ON notes.stage_id = stage.vip_stage_id
        AND notes.stage_id != 6
      GROUP BY stage.vip_stage_id, stage.vip_stage_name
      ORDER BY stage.vip_stage_id
    `);

    const heatMap = heatResult.recordset.map((row) => ({
      stage_id:   row.stage_id,
      stage_name: row.stage_name,
      note_count: row.note_count,
      avg_days:   row.avg_days,
      max_days:   row.max_days,
      sla_status: row.note_count === 0 ? null : slaStatus(row.avg_days, row.stage_id),
    }));

    // ── 3. Wing-wise pending (active, non-disposed) references ────────────
    const wingResult = await conn.query(`
      SELECT
        wings.wing_id,
        wings.wing_name,
        COUNT(notes.vip_reference_id)                                   AS pending_count
      FROM mmt_wings AS wings
      LEFT JOIN tbl_vip_reference_change AS notes
        ON notes.wing = wings.wing_id
        AND notes.stage_id != 6
      GROUP BY wings.wing_id, wings.wing_name
      HAVING COUNT(notes.vip_reference_id) > 0
      ORDER BY pending_count DESC
    `);

    // ── 4. Long pending VIP references (top 10 by pending days) ───────────
    const longPendingResult = await conn.query(`
      SELECT TOP 10
        notes.vip_reference_id,
        notes.subject,
        wings.wing_name,
        stage.vip_stage_name                                            AS current_stage,
        notes.updated_date,
        DATEDIFF(day,
          COALESCE(${STAGE_DATE_CASE}, notes.created_date),
          GETDATE()
        )                                                                AS pending_days
      FROM tbl_vip_reference_change AS notes
      INNER JOIN mmt_vip_stage AS stage
        ON stage.vip_stage_id = notes.stage_id
      INNER JOIN mmt_wings AS wings
        ON wings.wing_id = notes.wing
      WHERE notes.stage_id != 6
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
    console.error("[VipReferenceDashboard] Error:", err);
    return res.sendStatus(500);
  }
}

export default { getVipReferenceDashboard };
