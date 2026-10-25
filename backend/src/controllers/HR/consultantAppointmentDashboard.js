import { pool } from "../../db.js";

// Consultant Appointment dashboard, modelled on the VIP Reference dashboard:
// KPI counters, stage-wise heat map, wing-wise pending, and the longest-pending appointments.
//
// An appointment is complete once the contract is signed (stage 8, or a contract signed date),
// the same rule the Data List's Pending / Completed filter uses.
const COMPLETED = `(ca.stage_id = 8 OR ca.contract_signed_date IS NOT NULL)`;

// Each stage's own "entered stage" date column, matching mmt_consultant_appointment_stage.stage_id;
// stage 0 (No Status) and missing dates fall back to the record's created date
const STAGE_DATE = `
  COALESCE(
    CASE ca.stage_id
      WHEN 1 THEN ca.admin_approval_for_nkg_consultant_date
      WHEN 2 THEN ca.tender_published_date
      WHEN 3 THEN ca.pre_bid_queries_responded_date
      WHEN 4 THEN ca.bid_received_date
      WHEN 5 THEN ca.technical_bid_finalized_date
      WHEN 6 THEN ca.financial_bid_finalized_date
      WHEN 7 THEN ca.work_order_issued_date
      WHEN 8 THEN ca.contract_signed_date
    END,
    ca.created_date
  )
`;

async function getConsultantAppointmentDashboard(req, res) {
  const conn = await pool;
  try {
    // ── 1. KPI counters + average age of active appointments ──────────────
    const kpiResult = await conn.query(`
      SELECT
        COUNT(*)                                                        AS total,
        SUM(CASE WHEN ${COMPLETED} THEN 0 ELSE 1 END)                   AS active,
        SUM(CASE WHEN ${COMPLETED} THEN 1 ELSE 0 END)                   AS completed,
        CAST(AVG(CASE WHEN NOT ${COMPLETED}
          THEN CAST(DATEDIFF(day, ca.created_date, GETDATE()) AS FLOAT) END) AS INT) AS avg_age_active_days,
        MAX(COALESCE(ca.updated_date, ca.created_date))                 AS last_data_update
      FROM tbl_consultant_appointment AS ca
    `);
    const kpi = kpiResult.recordset[0] || {};

    // ── 2. Stage-wise heat map (active appointments; Contract Signed is the completed state) ──
    const heatResult = await conn.query(`
      SELECT
        stage.stage_id,
        stage.stage_name,
        COUNT(ca.consultant_appointment_id)                             AS note_count,
        CAST(AVG(CAST(DATEDIFF(day, ${STAGE_DATE}, GETDATE()) AS FLOAT)) AS INT) AS avg_days,
        MAX(DATEDIFF(day, ${STAGE_DATE}, GETDATE()))                    AS max_days
      FROM mmt_consultant_appointment_stage AS stage
      LEFT JOIN tbl_consultant_appointment AS ca
        ON ca.stage_id = stage.stage_id
        AND NOT ${COMPLETED}
      WHERE stage.stage_id <> 8
      GROUP BY stage.stage_id, stage.stage_name
      ORDER BY stage.stage_id
    `);

    // ── 3. Wing-wise pending (active) appointments ────────────────────────
    const wingResult = await conn.query(`
      SELECT
        wings.wing_id,
        wings.wing_name,
        COUNT(ca.consultant_appointment_id)                             AS pending_count
      FROM mmt_wings AS wings
      LEFT JOIN tbl_consultant_appointment AS ca
        ON ca.wing = wings.wing_id
        AND NOT ${COMPLETED}
      GROUP BY wings.wing_id, wings.wing_name
      HAVING COUNT(ca.consultant_appointment_id) > 0
      ORDER BY pending_count DESC
    `);

    // ── 4. Long pending appointments (top 10 by days in the current stage) ──
    const longPendingResult = await conn.query(`
      SELECT TOP 10
        ca.consultant_appointment_id,
        ca.appointment_type,
        ca.number_of_resources,
        NULLIF(LTRIM(RTRIM(ca.name_of_consulting_firm)), '')            AS consulting_firm,
        wings.wing_name,
        LTRIM(RTRIM(division.division_name))                            AS division_name,
        stage.stage_name                                                AS current_stage,
        COALESCE(ca.updated_date, ca.created_date)                      AS updated_date,
        DATEDIFF(day, ${STAGE_DATE}, GETDATE())                         AS pending_days
      FROM tbl_consultant_appointment AS ca
      INNER JOIN mmt_consultant_appointment_stage AS stage ON stage.stage_id = ca.stage_id
      INNER JOIN mmt_wings AS wings ON wings.wing_id = ca.wing
      LEFT JOIN mmt_division AS division ON division.division_id = ca.division
      WHERE NOT ${COMPLETED}
      ORDER BY pending_days DESC
    `);

    return res.json({
      kpi: {
        total: Number(kpi.total) || 0,
        active: Number(kpi.active) || 0,
        completed: Number(kpi.completed) || 0,
        avgAgeDays: kpi.avg_age_active_days != null ? Number(kpi.avg_age_active_days) : null,
      },
      lastDataUpdate: kpi.last_data_update || null,
      heatMap: heatResult.recordset,
      wingWise: wingResult.recordset,
      longPending: longPendingResult.recordset,
    });
  } catch (err) {
    console.error("[ConsultantAppointmentDashboard] Error:", err);
    return res.sendStatus(500);
  }
}

export default { getConsultantAppointmentDashboard };
