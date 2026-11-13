import { pool } from "../../db.js";
import sql from "mssql";

function actingUserId(req) {
  const id = Number(req.user?.userId ?? req.user?.user_id ?? req.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function actingOrgId(req) {
  const id = Number(req.user?.organisationId ?? req.user?.organisation_id ?? req.body?.organisation_id);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

function nullIfEmpty(val) {
  return val === '' || val === undefined || val === null ? null : val;
}

function numOrZero(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function dateOrNull(val) {
  if (!val || val === '' || val === 'null') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

async function getNmpDashboard(req, res) {
  try {
    const conn = await pool;
    const result = await conn.request().query(`
      SELECT
        (SELECT COUNT(*) FROM tbl_land_abstract) AS land_abstract_count,
        (SELECT COUNT(*) FROM tbl_nmp_past) AS past_land_count,
        (SELECT COUNT(*) FROM tbl_nmp) AS future_land_count
    `);
    const row = result.recordset[0] || {};
    row.total_count = (row.land_abstract_count || 0) + (row.past_land_count || 0) + (row.future_land_count || 0);
    res.status(200).json(row);
  } catch (err) {
    console.error("NMP Dashboard error:", err);
    res.status(500).json({ message: "Failed to fetch NMP dashboard data." });
  }
}

// ── Land Abstract List ───────────────────────────────────────────────────────

async function getLandAbstractList(req, res) {
  try {
    const conn = await pool;
    const result = await conn.request().query(`
      SELECT
        la.land_abstract_id,
        la.organisation_id,
        m.organisation_name AS port_name,
        la.total_land_by_pa AS total_land_acres,
        la.port_operation,
        la.connectivity,
        la.warehousing_storage,
        la.oil_gas_energy,
        la.manufacturing,
        la.commercial,
        la.residential,
        la.logistics_parks_trade_zones,
        la.other_uses,
        la.salt_land_acquired,
        la.vacant_land_encumbrance_free AS vacant_land_acres,
        la.vacant_land_litigated_encumbered AS land_under_litigation_acres,
        la.land_not_developable,
        la.land_likely_freed_by_rationalisation,
        la.land_reclaimable_from_sea_backwater_identified,
        la.salt_land_identified_for_acquisition,
        la.additional_land_identified,
        la.marshy_land_development_plan,
        la.created_date,
        la.updated_date
      FROM tbl_land_abstract la
      LEFT JOIN mmt_organisation m ON m.organisation_id = la.organisation_id
      ORDER BY la.created_date DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("NMP Land Abstract list error:", err);
    res.status(500).json({ message: "Failed to fetch land abstract list." });
  }
}

// ── Past Land List ───────────────────────────────────────────────────────────

// async function getPastLandList(req, res) {
//   try {
//     const conn = await pool;
//     const result = await conn.request().query(`
//       SELECT
//         p.nmp_past_id,
//         p.unique_nmp_id,
//         p.organisation_id,
//         m.organisation_name,
//         p.parcel_details AS parcel_detail,
//         p.area AS area_acres,
//         p.lease_status,
//         p.purpose,
//         p.sector,
//         p.name_of_industry AS industry_name,
//         p.mode_of_allotment,
//         p.status,
//         p.target_year,
//         p.upfront_premium,
//         p.annual_rental AS annual_base_lease_rental,
//         p.escalation_rate,
//         p.frequency_of_escalation,
//         p.lease_tenure AS lease_tenure_years,
//         p.npv_lease_rental AS npv_lease_rentals,
//         p.extimated_private_investment AS estimated_private_investment,
//         p.total_monetization_value AS total_monetisation_value,
//         p.lease_rental_received,
//         p.agency_name AS agency_lessee_name,
//         p.type_of_agency AS type_of_agency_lessee,
//         p.agreement_signed,
//         p.nit_target_date,
//         p.actual_nit_date AS nit_actual_date,
//         p.nit_reversed_date AS nit_revised,
//         p.original_agreement_date AS agreement_original_target_date,
//         p.actual_agreement_date,
//         p.agreement_revised_date AS agreement_revised,
//         p.original_completion_date,
//         p.actual_completion_date,
//         p.completion_revised_date AS construction_revised,
//         p.lease_expiration_date,
//         p.remarks,
//         p.created_date
//       FROM tbl_nmp_past p
//       LEFT JOIN mmt_organisation m ON m.organisation_id = p.organisation_id
//       ORDER BY p.created_date DESC
//     `);
//     res.status(200).json(result.recordset);
//   } catch (err) {
//     console.error("NMP Past Land list error:", err);
//     res.status(500).json({ message: "Failed to fetch past land list." });
//   }
// }
async function getPastLandList(req, res) {
  try {
    const conn = await pool;
    const result = await conn.request().query(`
      SELECT
        p.*,
        m.organisation_name,
        l.id                    AS sor_id,
        l.period_of_sor_from    AS sor_period_from,
        l.period_of_sor_to      AS sor_period_to,
        l.year_of_applicability AS sor_year_of_applicability,
        l.annual_base_lease     AS sor_annual_base_lease,
        l.escalation_rate       AS sor_escalation_rate,
        l.frequency_escalation  AS sor_frequency_escalation,
        l.lease_tenure          AS sor_lease_tenure,
        l.nvp_lease_rentals     AS sor_nvp
      FROM tbl_nmp_past p
      LEFT JOIN mmt_organisation m ON m.organisation_id = p.organisation_id
      LEFT JOIN tbl_lease_rental_details_past l ON l.sub_unique_nmp_id = p.unique_nmp_id
      ORDER BY p.created_date DESC, p.nmp_past_id DESC, l.id
    `);

    const p2 = (n) => String(n % 100).padStart(2, '0');
    const fyStart = (d) => { if (!d) return ''; const y = new Date(d).getUTCFullYear(); return `FY${p2(y)}-${p2(y + 1)}`; };
    const fyEnd   = (d) => { if (!d) return ''; const y = new Date(d).getUTCFullYear() - 1; return `FY${p2(y)}-${p2(y + 1)}`; };
    const fyShort = (s) => { const m = /(\d{4})-(\d{4})/.exec(s || ''); return m ? `FY${m[1].slice(2)}-${m[2].slice(2)}` : ''; };

    // group: one entry per parcel, with its lease rows attached
    const byId = new Map();
    for (const r of result.recordset) {
      let row = byId.get(r.nmp_past_id);
      if (!row) {
        const {
          sor_id, sor_period_from, sor_period_to, sor_year_of_applicability, sor_annual_base_lease,
          sor_escalation_rate, sor_frequency_escalation, sor_lease_tenure, sor_nvp, ...parcel
        } = r;
        row = { ...parcel, sor_rows: [] };
        byId.set(r.nmp_past_id, row);
      }
      if (r.sor_id != null) {
        row.sor_rows.push({
          sor_from: fyStart(r.sor_period_from),
          sor_to: fyEnd(r.sor_period_to),
          year_of_applicability: fyShort(r.sor_year_of_applicability),
          annual_base_lease_rental: r.sor_annual_base_lease,
          escalation_rate: r.sor_escalation_rate,
          frequency_of_escalation: r.sor_frequency_escalation,
          lease_tenure: r.sor_lease_tenure,
          npv: r.sor_nvp,
        });
      }
    }

    const join = (rows, k) => rows.map((s) => s[k]).filter((v) => v != null && v !== '').join(' | ');

    const rows = [...byId.values()].map((r) => ({
      ...r,
      parcel_detail: r.parcel_details,
      area_acres: r.area,
      industry_name: r.name_of_industry,
      npv_lease_rentals: r.npv_lease_rental,
      estimated_private_investment: r.extimated_private_investment,
      total_monetisation_value: r.total_monetization_value,
      agency_lessee_name: r.agency_name,
      type_of_agency_lessee: r.type_of_agency,

      // columns from tbl_lease_rental_details_past (multiple rows joined with " | ")
      annual_base_lease_rental: join(r.sor_rows, 'annual_base_lease_rental'),
      escalation_rate: join(r.sor_rows, 'escalation_rate'),
      frequency_of_escalation: join(r.sor_rows, 'frequency_of_escalation'),
      lease_tenure_years: join(r.sor_rows, 'lease_tenure'),
      sor_period: r.sor_rows.map((s) => `${s.sor_from} to ${s.sor_to}`).join(' | '),
      sor_year_of_applicability: join(r.sor_rows, 'year_of_applicability'),

      nit_original_target_date: r.target_nit_date,
      nit_actual_date: r.actual_nit_date,
      nit_revised: r.nit_reversed_date,
      nit_revised_2: r.nit_reversed_date_1,
      nit_revised_3: r.nit_reversed_date_2,
      agreement_original_target_date: r.target_agreement_date,
      agreement_revised: r.agreement_revised_date,
      agreement_revised_2: r.agreement_revised_date_1,
      agreement_revised_3: r.agreement_revised_date_2,
      original_completion_date: r.target_completion_date,
      construction_revised: r.completion_revised_date,
      construction_revised_2: r.completion_revised_date_1,
      construction_revised_3: r.completion_revised_date_2,
    }));

    res.status(200).json(rows);
  } catch (err) {
    console.error("NMP Past Land list error:", err);
    res.status(500).json({ message: "Failed to fetch past land list." });
  }
}
// ── Future Land List ─────────────────────────────────────────────────────────

async function getFutureLandList(req, res) {
  try {
    const conn = await pool;
    const result = await conn.request().query(`
      SELECT
       *
      FROM tbl_nmp f
      LEFT JOIN mmt_organisation m ON m.organisation_id = f.organisation_id
      ORDER BY f.created_date DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("NMP Future Land list error:", err);
    res.status(500).json({ message: "Failed to fetch future land list." });
  }
}

// ── Get by ID ────────────────────────────────────────────────────────────────

// async function getNmpById(req, res) {
//   try {
//     const conn = await pool;
//     const formType = req.query.form_type || 'future-land';
//     const id = parseInt(req.params.id, 10);

//     if (formType === 'past-land') {
//       const parcelRes = await conn.request()
//         .input("id", sql.Int, id)
//         .query(`
//           SELECT p.*, m.organisation_name
//           FROM tbl_nmp_past p
//           LEFT JOIN mmt_organisation m ON m.organisation_id = p.organisation_id
//           WHERE p.nmp_past_id = @id
//         `);

//       if (!parcelRes.recordset.length) {
//         return res.status(404).json({ message: "NMP entry not found." });
//       }
//       const parcel = parcelRes.recordset[0];

//       const sorRes = await conn.request()
//         .input("uid", sql.NVarChar(100), parcel.unique_nmp_id)
//         .input("org", sql.Int, parcel.organisation_id)
//         .query(`
//           SELECT *
//           FROM tbl_lease_rental_details_past
//           WHERE sub_unique_nmp_id = @uid AND organisation_id = @org
//           ORDER BY id
//         `);

//       const p2 = (n) => String(n % 100).padStart(2, '0');
//       const fyStart = (d) => { if (!d) return ''; const y = new Date(d).getUTCFullYear(); return `FY${p2(y)}-${p2(y + 1)}`; };
//       const fyEnd   = (d) => { if (!d) return ''; const y = new Date(d).getUTCFullYear() - 1; return `FY${p2(y)}-${p2(y + 1)}`; };
//       const fyShort = (s) => { const m = /(\d{4})-(\d{4})/.exec(s || ''); return m ? `FY${m[1].slice(2)}-${m[2].slice(2)}` : ''; };

//       const sor_rows = sorRes.recordset.map((r) => ({
//         sor_from: fyStart(r.period_of_sor_from),
//         sor_to: fyEnd(r.period_of_sor_to),
//         year_of_applicability: fyShort(r.year_of_applicability),
//         annual_base_lease_rental: r.annual_base_lease,
//         escalation_rate: r.escalation_rate,
//         frequency_of_escalation: r.frequency_escalation,
//         lease_tenure: r.lease_tenure,
//         npv: r.nvp_lease_rentals,
//       }));

//       return res.status(200).json({
//         ...parcel,
//         parcel_detail: parcel.parcel_details,
//         area_acres: parcel.area,
//         industry_name: parcel.name_of_industry,
//         npv_lease_rentals: parcel.npv_lease_rental,
//         estimated_private_investment: parcel.extimated_private_investment,
//         total_monetisation_value: parcel.total_monetization_value,
//         agency_lessee_name: parcel.agency_name,
//         type_of_agency_lessee: parcel.type_of_agency,
//         nit_original_target_date: parcel.target_nit_date,
//         nit_actual_date: parcel.actual_nit_date,
//         nit_revised: parcel.nit_reversed_date,
//         nit_revised_2: parcel.nit_reversed_date_1,
//         nit_revised_3: parcel.nit_reversed_date_2,
//         agreement_original_target_date: parcel.target_agreement_date,
//         agreement_revised: parcel.agreement_revised_date,
//         agreement_revised_2: parcel.agreement_revised_date_1,
//         agreement_revised_3: parcel.agreement_revised_date_2,
//         original_completion_date: parcel.target_completion_date,
//         construction_revised: parcel.completion_revised_date,
//         construction_revised_2: parcel.completion_revised_date_1,
//         construction_revised_3: parcel.completion_revised_date_2,
//         sor_rows,
//       });
//     }

//     const request = conn.request();
//     request.input("id", sql.Int, id);
//     let result;
//     if (formType === 'land-abstract') {
//       result = await request.query(`SELECT * FROM tbl_land_abstract WHERE land_abstract_id = @id`);
//     } else {
//       result = await request.query(`SELECT * FROM tbl_nmp WHERE nmp_id = @id`);
//     }

//     if (!result.recordset.length) {
//       return res.status(404).json({ message: "NMP entry not found." });
//     }
//     res.status(200).json(result.recordset[0]);
//   } catch (err) {
//     console.error("NMP getById error:", err);
//     res.status(500).json({ message: "Failed to fetch NMP entry." });
//   }
// }

async function getNmpById(req, res) {
  try {
    const conn = await pool;
    const formType = req.query.form_type || 'future-land';
    const id = parseInt(req.params.id, 10);

    if (!id) {
      return res.status(400).json({ message: "Invalid entry id." });
    }

    // ── Past land ────────────────────────────────────────────────────────────
    if (formType === 'past-land') {
      const parcelRes = await conn.request()
        .input("id", sql.Int, id)
        .query(`
          SELECT p.*, m.organisation_name
          FROM tbl_nmp_past p
          LEFT JOIN mmt_organisation m ON m.organisation_id = p.organisation_id
          WHERE p.nmp_past_id = @id
        `);

      if (!parcelRes.recordset.length) {
        return res.status(404).json({ message: "NMP entry not found." });
      }
      const parcel = parcelRes.recordset[0];

      const sorRes = await conn.request()
        .input("uid", sql.NVarChar(100), parcel.unique_nmp_id)
        .input("org", sql.Int, parcel.organisation_id)
        .query(`
          SELECT *
          FROM tbl_lease_rental_details_past
          WHERE sub_unique_nmp_id = @uid AND organisation_id = @org
          ORDER BY id
        `);

      const p2 = (n) => String(n % 100).padStart(2, '0');
      const fyStart = (d) => { if (!d) return ''; const y = new Date(d).getUTCFullYear(); return `FY${p2(y)}-${p2(y + 1)}`; };
      const fyEnd   = (d) => { if (!d) return ''; const y = new Date(d).getUTCFullYear() - 1; return `FY${p2(y)}-${p2(y + 1)}`; };
      const fyShort = (s) => { const m = /(\d{4})-(\d{4})/.exec(s || ''); return m ? `FY${m[1].slice(2)}-${m[2].slice(2)}` : ''; };

      const sor_rows = sorRes.recordset.map((r) => ({
        sor_from: fyStart(r.period_of_sor_from),
        sor_to: fyEnd(r.period_of_sor_to),
        year_of_applicability: fyShort(r.year_of_applicability),
        annual_base_lease_rental: r.annual_base_lease,
        escalation_rate: r.escalation_rate,
        frequency_of_escalation: r.frequency_escalation,
        lease_tenure: r.lease_tenure,
        npv: r.nvp_lease_rentals,
      }));

      return res.status(200).json({
        ...parcel,
        id: parcel.nmp_past_id,
        form_type: 'past-land',
        parcel_detail: parcel.parcel_details,
        area_acres: parcel.area,
        industry_name: parcel.name_of_industry,
        npv_lease_rentals: parcel.npv_lease_rental,
        estimated_private_investment: parcel.extimated_private_investment,
        total_monetisation_value: parcel.total_monetization_value,
        agency_lessee_name: parcel.agency_name,
        type_of_agency_lessee: parcel.type_of_agency,
        nit_original_target_date: parcel.target_nit_date,
        nit_actual_date: parcel.actual_nit_date,
        nit_revised: parcel.nit_reversed_date,
        nit_revised_2: parcel.nit_reversed_date_1,
        nit_revised_3: parcel.nit_reversed_date_2,
        agreement_original_target_date: parcel.target_agreement_date,
        agreement_revised: parcel.agreement_revised_date,
        agreement_revised_2: parcel.agreement_revised_date_1,
        agreement_revised_3: parcel.agreement_revised_date_2,
        original_completion_date: parcel.target_completion_date,
        construction_revised: parcel.completion_revised_date,
        construction_revised_2: parcel.completion_revised_date_1,
        construction_revised_3: parcel.completion_revised_date_2,

        lease_status_id: parcel.lease_status,
        purpose_id: parcel.purpose,
        sector_id: parcel.sector,
        status_id: parcel.status,
        mode_of_allotment_id: parcel.mode_of_allotment,
        type_of_lessee_id: parcel.type_of_agency,
        agreement_signed_id: parcel.agreement_signed,
        sor_rows,
      });
    }

    // ── Land abstract ────────────────────────────────────────────────────────
    if (formType === 'land-abstract') {
      const result = await conn.request()
        .input("id", sql.Int, id)
        .query(`SELECT * FROM tbl_land_abstract WHERE land_abstract_id = @id`);

      if (!result.recordset.length) {
        return res.status(404).json({ message: "NMP entry not found." });
      }
      const a = result.recordset[0];

      return res.status(200).json({
        ...a,
        id: a.land_abstract_id,
        form_type: 'land-abstract',
        total_land_held: a.total_land_by_pa,
        cat_A_acres: a.port_operation,
        cat_B_acres: a.connectivity,
        cat_C_acres: a.warehousing_storage,
        cat_D_acres: a.oil_gas_energy,
        cat_E_acres: a.manufacturing,
        cat_F_acres: a.commercial,
        cat_G_acres: a.residential,
        cat_H_acres: a.logistics_parks_trade_zones,
        cat_I_acres: a.salt_land_acquired,
        cat_J_acres: a.other_uses,
        cat_K_acres: a.vacant_land_encumbrance_free,
        cat_L_acres: a.vacant_land_litigated_encumbered,
        cat_M_acres: a.land_not_developable,
        unlock_rationalisation_acres: a.land_likely_freed_by_rationalisation,
        unlock_reclamation_acres: a.land_reclaimable_from_sea_backwater_identified,
        unlock_salt_land_acres: a.salt_land_identified_for_acquisition,
        unlock_state_govt_acres: a.additional_land_identified,
        unlock_marshy_acres: a.marshy_land_development_plan,
      });
    }

    // ── Future land (tbl_nmp) ────────────────────────────────────────────────
    const result = await conn.request()
      .input("id", sql.Int, id)
      .query(`SELECT * FROM tbl_nmp WHERE nmp_id = @id`);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "NMP entry not found." });
    }
    const n = result.recordset[0];

    return res.status(200).json({
      ...n,
      id: n.nmp_id,
      form_type: 'future-land',

      // basic details
      parcel_detail: n.parcel_details,
      area_acres: n.area,
      industry_name: n.name_of_industry,

      // financial
      annual_base_lease_rental: n.annual_rental,
      estimated_private_investment: n.extimated_private_investment,

      // lessee
      lessee_name: n.agency_name,

      // dropdown ids (form reads *_id keys)
      lease_status_id: n.lease_status,
      purpose_id: n.purpose,
      sector_id: n.sector,
      status_id: n.status,
      mode_of_allotment_id: n.mode_of_allotment,
      type_of_lessee_id: n.type_of_agency,
      agreement_signed_id: n.agreement_signed,

      // NIT milestone
      nit_original: n.nit_target_date,
      nit_actual: n.actual_nit_date,
      nit_revised: n.revised_nit_date,
      nit_revised_2: n.revised_nit_date_1,
      nit_revised_3: n.revised_nit_date_2,

      // Agreement milestone
      agreement_original: n.target_agreement_date,
      agreement_actual: n.actual_agreement_date,
      agreement_revised: n.revised_agreement_date,
      agreement_revised_2: n.revised_agreement_date_1,
      agreement_revised_3: n.revised_agreement_date_2,

      // Construction milestone
      construction_original: n.target_completion_date,
      construction_actual: n.actual_completion_date,
      construction_revised: n.revised_completion_date,
      construction_revised_2: n.revised_completion_date_1,
      construction_revised_3: n.revised_completion_date_2,
    });
  } catch (err) {
    console.error("NMP getById error:", err);
    res.status(500).json({ message: "Failed to fetch NMP entry.", error: err.message });
  }
}

// ── Create ───────────────────────────────────────────────────────────────────

async function createNmpEntry(req, res) {
  try {
    const userId = actingUserId(req);
    const orgId = actingOrgId(req);
    const b = req.body;
    const formType = b.form_type;
    console.log('CREATE form_type =', formType); 
    const conn = await pool;
    const request = conn.request();
    console.log(request,"land")
    const intOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = Math.round(Number(v));
  return Number.isNaN(n) ? null : n;
};

    if (formType === 'land-abstract') {
      request.input("organisation_id", orgId);
      request.input("total_land_by_pa", numOrZero(b.total_land_held));
      request.input("port_operation", numOrZero(b.cat_A_acres));
      request.input("connectivity", numOrZero(b.cat_B_acres));
      request.input("warehousing_storage", numOrZero(b.cat_C_acres));
      request.input("oil_gas_energy", numOrZero(b.cat_D_acres));
      request.input("manufacturing", numOrZero(b.cat_E_acres));
      request.input("commercial", numOrZero(b.cat_F_acres));
      request.input("residential", numOrZero(b.cat_G_acres));
      request.input("logistics_parks_trade_zones", numOrZero(b.cat_H_acres));
      request.input("other_uses", numOrZero(b.cat_J_acres));
      request.input("salt_land_acquired", numOrZero(b.cat_I_acres));
      request.input("vacant_land_encumbrance_free", numOrZero(b.cat_K_acres));
      request.input("vacant_land_litigated_encumbered", numOrZero(b.cat_L_acres));
      request.input("land_not_developable", numOrZero(b.cat_M_acres));
      request.input("land_likely_freed_by_rationalisation", numOrZero(b.unlock_rationalisation_acres));
      request.input("land_reclaimable_from_sea_backwater_identified", numOrZero(b.unlock_reclamation_acres));
      request.input("salt_land_identified_for_acquisition", numOrZero(b.unlock_salt_land_acres));
      request.input("additional_land_identified", numOrZero(b.unlock_state_govt_acres));
      request.input("marshy_land_development_plan", numOrZero(b.unlock_marshy_acres));
      request.input("created_by", userId);

      const result = await request.query(`
        INSERT INTO tbl_land_abstract (
          organisation_id, total_land_by_pa, port_operation, connectivity,
          warehousing_storage, oil_gas_energy, manufacturing, commercial,
          residential, logistics_parks_trade_zones, other_uses, salt_land_acquired,
          vacant_land_encumbrance_free, vacant_land_litigated_encumbered, land_not_developable,
          land_likely_freed_by_rationalisation, land_reclaimable_from_sea_backwater_identified,
          salt_land_identified_for_acquisition, additional_land_identified, marshy_land_development_plan,
          created_date, created_by
        ) VALUES (
          @organisation_id, @total_land_by_pa, @port_operation, @connectivity,
          @warehousing_storage, @oil_gas_energy, @manufacturing, @commercial,
          @residential, @logistics_parks_trade_zones, @other_uses, @salt_land_acquired,
          @vacant_land_encumbrance_free, @vacant_land_litigated_encumbered, @land_not_developable,
          @land_likely_freed_by_rationalisation, @land_reclaimable_from_sea_backwater_identified,
          @salt_land_identified_for_acquisition, @additional_land_identified, @marshy_land_development_plan,
          GETDATE(), @created_by
        );
        SELECT SCOPE_IDENTITY() AS id;
      `);
      return res.status(201).json({ message: "Land abstract entry created.", id: result.recordset[0]?.id });

   } else if (formType === 'past-land') {

  request.input("organisation_id", sql.Int, orgId);
  request.input("unique_nmp_id", sql.NVarChar(100), nullIfEmpty(b.unique_nmp_id));
  request.input("parcel_details", sql.NVarChar(256), nullIfEmpty(b.parcel_detail));
  request.input("area", sql.Decimal(18, 2), numOrZero(b.area_acres));
  request.input("name_of_industry", sql.NVarChar(256), nullIfEmpty(b.industry_name));
  request.input("lease_status", sql.Int, intOrNull(b.lease_status));
  request.input("purpose", sql.Int, intOrNull(b.purpose));
  request.input("sector", sql.Int, intOrNull(b.sector));
  request.input("mode_of_allotment", sql.Int, intOrNull(b.mode_of_allotment));
  request.input("status", sql.Int, intOrNull(b.status));
  request.input("type_of_agency", sql.Int, intOrNull(b.type_of_lessee));
  request.input("agreement_signed", sql.Int, intOrNull(b.agreement_signed));
  request.input("target_year", sql.NVarChar(100), nullIfEmpty(b.year_of_allotment));
  request.input("upfront_premium", sql.Decimal(18, 2), numOrZero(b.upfront_premium));
  request.input("npv_lease_rental", sql.Decimal(18, 2), numOrZero(b.npv_lease_rental));
  request.input("extimated_private_investment", sql.Decimal(18, 2), numOrZero(b.estimated_private_investment));
  request.input("total_monetization_value", sql.Decimal(18, 2), numOrZero(b.total_monetization_value));
  request.input("lease_rental_received", sql.Decimal(18, 2), numOrZero(b.lease_rental_received));
  request.input("agency_name", sql.NVarChar(100), nullIfEmpty(b.lessee_name));
  request.input("other_agency", sql.NVarChar(256), nullIfEmpty(b.other_agency));

  request.input("target_nit_date", sql.Date, dateOrNull(b.nit_original));
  request.input("actual_nit_date", sql.Date, dateOrNull(b.nit_actual));
  request.input("nit_reversed_date", sql.Date, dateOrNull(b.nit_revised));
  request.input("nit_reversed_date_1", sql.Date, dateOrNull(b.nit_revised_2));
  request.input("nit_reversed_date_2", sql.Date, dateOrNull(b.nit_revised_3));

  request.input("target_agreement_date", sql.Date, dateOrNull(b.agreement_original));
  request.input("actual_agreement_date", sql.Date, dateOrNull(b.agreement_actual));
  request.input("agreement_revised_date", sql.Date, dateOrNull(b.agreement_revised));
  request.input("agreement_revised_date_1", sql.Date, dateOrNull(b.agreement_revised_2));
  request.input("agreement_revised_date_2", sql.Date, dateOrNull(b.agreement_revised_3));

  request.input("target_completion_date", sql.Date, dateOrNull(b.construction_original));
  request.input("actual_completion_date", sql.Date, dateOrNull(b.construction_actual));
  request.input("completion_revised_date", sql.Date, dateOrNull(b.construction_revised));
  request.input("completion_revised_date_1", sql.Date, dateOrNull(b.construction_revised_2));
  request.input("completion_revised_date_2", sql.Date, dateOrNull(b.construction_revised_3));

  request.input("lease_expiration_date", sql.Date, dateOrNull(b.lease_expiration_date));
  request.input("remarks", sql.NVarChar(256), nullIfEmpty(b.remarks));
  request.input("other_purpose", sql.NVarChar(256), nullIfEmpty(b.other_purpose));
  request.input("other_sector",  sql.NVarChar(256), nullIfEmpty(b.other_sector));

  request.input("created_by", sql.Int, userId);

  const result = await request.query(`
    INSERT INTO tbl_nmp_past (
      unique_nmp_id, organisation_id, parcel_details, area, lease_status, purpose, sector,
      name_of_industry, mode_of_allotment, status, target_year,
      upfront_premium, npv_lease_rental, extimated_private_investment,
      total_monetization_value, lease_rental_received,
      agency_name, type_of_agency, agreement_signed,
      target_nit_date, actual_nit_date, nit_reversed_date, nit_reversed_date_1, nit_reversed_date_2,
      target_agreement_date, actual_agreement_date, agreement_revised_date, agreement_revised_date_1, agreement_revised_date_2,
      target_completion_date, actual_completion_date, completion_revised_date, completion_revised_date_1, completion_revised_date_2,
      lease_expiration_date, remarks, other_purpose, other_sector, other_agency, created_date, created_by
    ) VALUES (
      @unique_nmp_id, @organisation_id, @parcel_details, @area, @lease_status, @purpose, @sector,
      @name_of_industry, @mode_of_allotment, @status, @target_year,
      @upfront_premium, @npv_lease_rental, @extimated_private_investment,
      @total_monetization_value, @lease_rental_received,
      @agency_name, @type_of_agency, @agreement_signed,
      @target_nit_date, @actual_nit_date, @nit_reversed_date, @nit_reversed_date_1, @nit_reversed_date_2,
      @target_agreement_date, @actual_agreement_date, @agreement_revised_date, @agreement_revised_date_1, @agreement_revised_date_2,
      @target_completion_date, @actual_completion_date, @completion_revised_date, @completion_revised_date_1, @completion_revised_date_2,
      @lease_expiration_date, @remarks, @other_purpose, @other_sector, @other_agency, GETDATE(), @created_by
    );
    SELECT SCOPE_IDENTITY() AS id;
  `);
   await replaceSorRows(conn, {
    uniqueId: b.unique_nmp_id,
    orgId: Number(b.organisation_id) || actingOrgId(req),
    userId,
    rows: b.sor_rows,
  });

return res.status(201).json({
    message: "Past land entry created.",
    id: result.recordset[0]?.id,
  });

} else {
      // future-land → tbl_nmp (most columns are NOT NULL)
      request.input("organisation_id", sql.Int, orgId);
      request.input("parcel_details", sql.NVarChar(256), nullIfEmpty(b.parcel_detail) || '');
      request.input("area", sql.NVarChar(100), String(nullIfEmpty(b.area_acres) || '0'));
      request.input("lease_status", sql.Int, intOrNull(b.lease_status));
      request.input("purpose", sql.Int, intOrNull(b.purpose));
      request.input("other_purpose", sql.NVarChar(256), nullIfEmpty(b.other_purpose));
      request.input("other_sector",  sql.NVarChar(256), nullIfEmpty(b.other_sector));
      request.input("other_agency",  sql.NVarChar(256), nullIfEmpty(b.other_agency));
      request.input("sector", sql.Int, intOrNull(b.sector));
      request.input("name_of_industry", sql.NVarChar(256), nullIfEmpty(b.industry_name) || '');
      request.input("mode_of_allotment", sql.Int, intOrNull(b.mode_of_allotment));
      request.input("status", sql.Int, intOrNull(b.status));
      request.input("target_year", sql.NVarChar(100), nullIfEmpty(b.target_yr_monetisation) || '');
      request.input("upfront_premium", sql.Float, numOrZero(b.upfront_premium));
      request.input("annual_rental", sql.Float, numOrZero(b.annual_base_lease_rental));
      request.input("lease_tenure", sql.Float, numOrZero(b.lease_tenure));
      request.input("escalation_rate", sql.Float, numOrZero(b.escalation_rate));
      request.input("frequency_of_escalation", sql.Float, numOrZero(b.frequency_of_escalation));
      request.input("npv_lease_rental", sql.Float, numOrZero(b.npv_lease_rental));
      request.input("extimated_private_investment", sql.Float, numOrZero(b.estimated_private_investment));
      request.input("total_monetization_value", sql.Float, numOrZero(b.total_monetization_value));
      request.input("lease_rental_received", sql.Float, numOrZero(b.lease_rental_received));
      request.input("agency_name", sql.NVarChar(100), nullIfEmpty(b.lessee_name) || '');
      request.input("type_of_agency", sql.Int, intOrNull(b.type_of_lessee));
      request.input("agreement_signed", sql.Int, intOrNull(b.agreement_signed));
      request.input("target_nit_date", sql.Date, dateOrNull(b.nit_original));
      request.input("actual_nit_date", sql.Date, dateOrNull(b.nit_actual));
      request.input("nit_reversed_date", sql.Date, dateOrNull(b.nit_revised));
      request.input("nit_reversed_date_1", sql.Date, dateOrNull(b.nit_revised_2));
      request.input("nit_reversed_date_2", sql.Date, dateOrNull(b.nit_revised_3));
      request.input("target_agreement_date", sql.Date, dateOrNull(b.agreement_original));
      request.input("actual_agreement_date", sql.Date, dateOrNull(b.agreement_actual));
      request.input("target_completion_date", sql.Date, dateOrNull(b.construction_target));
      request.input("agreement_revised_date", sql.Date, dateOrNull(b.agreement_revised));
      request.input("agreement_revised_date_1", sql.Date, dateOrNull(b.agreement_revised_2));
      request.input("agreement_revised_date_2", sql.Date, dateOrNull(b.agreement_revised_3));
      request.input("actual_completion_date", sql.Date, dateOrNull(b.construction_actual));
      request.input("completion_revised_date", sql.Date, dateOrNull(b.construction_revised));
      request.input("completion_revised_date_1", sql.Date, dateOrNull(b.construction_revised_2));
       request.input("completion_revised_date_2", sql.Date, dateOrNull(b.construction_revised_3));
      request.input("remarks", sql.NVarChar(256), nullIfEmpty(b.remarks) || '');
      request.input("created_by", sql.Int, userId);

    const result = await request.query(`
      INSERT INTO tbl_nmp (
        organisation_id, parcel_details, area, lease_status,
        purpose, other_purpose, sector, other_sector,
        name_of_industry, mode_of_allotment, status, target_year,
        upfront_premium, annual_rental, lease_tenure, escalation_rate, frequency_of_escalation,
        npv_lease_rental, extimated_private_investment, total_monetization_value, lease_rental_received,
        agency_name, type_of_agency, other_agency, agreement_signed,nit_target_date,actual_nit_date,revised_nit_date,revised_nit_date_1,revised_nit_date_2,
        target_completion_date, actual_completion_date,revised_completion_date,revised_completion_date_1,revised_completion_date_2,
        target_agreement_date, actual_agreement_date,revised_agreement_date,revised_agreement_date_1,revised_agreement_date_2,
        remarks, created_date, created_by
      ) VALUES (
        @organisation_id, @parcel_details, @area, @lease_status,
        @purpose, @other_purpose, @sector, @other_sector,
        @name_of_industry, @mode_of_allotment, @status, @target_year,
        @upfront_premium, @annual_rental, @lease_tenure, @escalation_rate, @frequency_of_escalation,
        @npv_lease_rental, @extimated_private_investment, @total_monetization_value, @lease_rental_received,
        @agency_name, @type_of_agency, @other_agency, @agreement_signed, @target_nit_date,@actual_nit_date,@nit_reversed_date,@nit_reversed_date_1,
        @nit_reversed_date_2,@target_completion_date, @actual_completion_date,@completion_revised_date,@completion_revised_date_1,@completion_revised_date_2,
        @target_agreement_date, @actual_agreement_date,@agreement_revised_date,@agreement_revised_date_1,
        @agreement_revised_date_2, @remarks, GETDATE(), @created_by
      );
      SELECT SCOPE_IDENTITY() AS id;
    `);
       
      return res.status(201).json({ message: "Future land entry created.", id: result.recordset[0]?.id });
    }
  } catch (err) {
    console.error("NMP create error:", err.message, err);
    res.status(500).json({ message: "Failed to create NMP entry.", error: err.message });
  }
}
const intOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = Math.round(Number(v));
  return Number.isNaN(n) ? null : n;
};

const FY_RE = /^FY\s*(\d{2})-(\d{2})$/;
const sorFromDate = (fy) => { const m = FY_RE.exec(fy || ''); return m ? new Date(Date.UTC(2000 + +m[1], 3, 1)) : null; };
const sorToDate   = (fy) => { const m = FY_RE.exec(fy || ''); return m ? new Date(Date.UTC(2000 + +m[2], 2, 31)) : null; };
const fyLong      = (fy) => { const m = FY_RE.exec(fy || ''); return m ? `FY ${2000 + +m[1]}-${2000 + +m[2]}` : null; };

async function replaceSorRows(conn, { uniqueId, orgId, userId, rows }) {
  if (!uniqueId) return;
  const tx = new sql.Transaction(conn);
  await tx.begin();
  try {
    await new sql.Request(tx)
      .input("uid", sql.NVarChar(100), uniqueId)
      .query(`DELETE FROM tbl_lease_rental_details_past WHERE sub_unique_nmp_id = @uid`);

    for (const r of rows || []) {
      await new sql.Request(tx)
        .input("sub_unique_nmp_id", sql.NVarChar(100), uniqueId)
        .input("organisation_id", sql.Int, orgId)
        .input("period_of_sor_from", sql.Date, sorFromDate(r.sor_from))
        .input("period_of_sor_to", sql.Date, sorToDate(r.sor_to))
        .input("year_of_applicability", sql.NVarChar(50), fyLong(r.year_of_applicability))
        .input("annual_base_lease", sql.Decimal(18, 2), numOrZero(r.annual_base_lease_rental))
        .input("escalation_rate", sql.Decimal(18, 2), numOrZero(r.escalation_rate))
        .input("frequency_escalation", sql.Decimal(18, 2), numOrZero(r.frequency_of_escalation))
        .input("lease_tenure", sql.Int, Math.round(numOrZero(r.lease_tenure)))
        .input("nvp_lease_rentals", sql.Decimal(18, 2), numOrZero(r.npv))
        .input("created_by", sql.Int, userId)
        .query(`
          INSERT INTO tbl_lease_rental_details_past (
            sub_unique_nmp_id, organisation_id, period_of_sor_from, period_of_sor_to,
            year_of_applicability, annual_base_lease, escalation_rate, frequency_escalation,
            lease_tenure, nvp_lease_rentals, created_BY, created_date
          ) VALUES (
            @sub_unique_nmp_id, @organisation_id, @period_of_sor_from, @period_of_sor_to,
            @year_of_applicability, @annual_base_lease, @escalation_rate, @frequency_escalation,
            @lease_tenure, @nvp_lease_rentals, @created_by, GETDATE()
          )`);
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
// ── Update ───────────────────────────────────────────────────────────────────

async function updateNmpEntry(req, res) {
  try {
    const userId = actingUserId(req);
    const b = req.body;
    const formType = b.form_type;
    if (!b.id) return res.status(400).json({ message: "Missing entry id." });

    const conn = await pool;
    const request = conn.request();

    if (formType === 'land-abstract') {
      request.input("land_abstract_id", b.id);
      request.input("total_land_by_pa", numOrZero(b.total_land_held));
      request.input("port_operation", numOrZero(b.cat_A_acres));
      request.input("connectivity", numOrZero(b.cat_B_acres));
      request.input("warehousing_storage", numOrZero(b.cat_C_acres));
      request.input("oil_gas_energy", numOrZero(b.cat_D_acres));
      request.input("manufacturing", numOrZero(b.cat_E_acres));
      request.input("commercial", numOrZero(b.cat_F_acres));
      request.input("residential", numOrZero(b.cat_G_acres));
      request.input("logistics_parks_trade_zones", numOrZero(b.cat_H_acres));
      request.input("other_uses", numOrZero(b.cat_J_acres));
      request.input("salt_land_acquired", numOrZero(b.cat_I_acres));
      request.input("vacant_land_encumbrance_free", numOrZero(b.cat_K_acres));
      request.input("vacant_land_litigated_encumbered", numOrZero(b.cat_L_acres));
      request.input("land_not_developable", numOrZero(b.cat_M_acres));
      request.input("land_likely_freed_by_rationalisation", numOrZero(b.unlock_rationalisation_acres));
      request.input("land_reclaimable_from_sea_backwater_identified", numOrZero(b.unlock_reclamation_acres));
      request.input("salt_land_identified_for_acquisition", numOrZero(b.unlock_salt_land_acres));
      request.input("additional_land_identified", numOrZero(b.unlock_state_govt_acres));
      request.input("marshy_land_development_plan", numOrZero(b.unlock_marshy_acres));
      request.input("updated_by", userId);

      await request.query(`
        UPDATE tbl_land_abstract SET
          total_land_by_pa = @total_land_by_pa, port_operation = @port_operation,
          connectivity = @connectivity, warehousing_storage = @warehousing_storage,
          oil_gas_energy = @oil_gas_energy, manufacturing = @manufacturing,
          commercial = @commercial, residential = @residential,
          logistics_parks_trade_zones = @logistics_parks_trade_zones, other_uses = @other_uses,
          salt_land_acquired = @salt_land_acquired,
          vacant_land_encumbrance_free = @vacant_land_encumbrance_free,
          vacant_land_litigated_encumbered = @vacant_land_litigated_encumbered,
          land_not_developable = @land_not_developable,
          land_likely_freed_by_rationalisation = @land_likely_freed_by_rationalisation,
          land_reclaimable_from_sea_backwater_identified = @land_reclaimable_from_sea_backwater_identified,
          salt_land_identified_for_acquisition = @salt_land_identified_for_acquisition,
          additional_land_identified = @additional_land_identified,
          marshy_land_development_plan = @marshy_land_development_plan,
          updated_date = GETDATE(), updated_by = @updated_by
        WHERE land_abstract_id = @land_abstract_id
      `);

    } else if (formType === 'past-land') {
  request.input("nmp_past_id", sql.Int, b.id);
  request.input("parcel_details", sql.NVarChar(256), nullIfEmpty(b.parcel_detail));
  request.input("area", sql.Decimal(18, 2), numOrZero(b.area_acres));
  request.input("name_of_industry", sql.NVarChar(256), nullIfEmpty(b.industry_name));
  request.input("lease_status", sql.Int, intOrNull(b.lease_status));
  request.input("purpose", sql.Int, intOrNull(b.purpose));
  request.input("sector", sql.Int, intOrNull(b.sector));
  request.input("mode_of_allotment", sql.Int, intOrNull(b.mode_of_allotment));
  request.input("status", sql.Int, intOrNull(b.status));
  request.input("type_of_agency", sql.Int, intOrNull(b.type_of_lessee));
  request.input("agreement_signed", sql.Int, intOrNull(b.agreement_signed));
  request.input("target_year", sql.NVarChar(100), nullIfEmpty(b.year_of_allotment));
  request.input("upfront_premium", sql.Decimal(18, 2), numOrZero(b.upfront_premium));
  request.input("npv_lease_rental", sql.Decimal(18, 2), numOrZero(b.npv_lease_rental));
  request.input("extimated_private_investment", sql.Decimal(18, 2), numOrZero(b.estimated_private_investment));
  request.input("total_monetization_value", sql.Decimal(18, 2), numOrZero(b.total_monetization_value));
  request.input("lease_rental_received", sql.Decimal(18, 2), numOrZero(b.lease_rental_received));
  request.input("agency_name", sql.NVarChar(100), nullIfEmpty(b.lessee_name));
  request.input("target_nit_date", sql.Date, dateOrNull(b.nit_original));
  request.input("actual_nit_date", sql.Date, dateOrNull(b.nit_actual));
  request.input("nit_reversed_date", sql.Date, dateOrNull(b.nit_revised));
  request.input("nit_reversed_date_1", sql.Date, dateOrNull(b.nit_revised_2));
  request.input("nit_reversed_date_2", sql.Date, dateOrNull(b.nit_revised_3));
  request.input("target_agreement_date", sql.Date, dateOrNull(b.agreement_original));
  request.input("actual_agreement_date", sql.Date, dateOrNull(b.agreement_actual));
  request.input("agreement_revised_date", sql.Date, dateOrNull(b.agreement_revised));
  request.input("agreement_revised_date_1", sql.Date, dateOrNull(b.agreement_revised_2));
  request.input("agreement_revised_date_2", sql.Date, dateOrNull(b.agreement_revised_3));
  request.input("target_completion_date", sql.Date, dateOrNull(b.construction_original));
  request.input("actual_completion_date", sql.Date, dateOrNull(b.construction_actual));
  request.input("completion_revised_date", sql.Date, dateOrNull(b.construction_revised));
  request.input("completion_revised_date_1", sql.Date, dateOrNull(b.construction_revised_2));
  request.input("completion_revised_date_2", sql.Date, dateOrNull(b.construction_revised_3));
  request.input("lease_expiration_date", sql.Date, dateOrNull(b.lease_expiration_date));
  request.input("remarks", sql.NVarChar(256), nullIfEmpty(b.remarks));
  request.input("other_purpose", sql.NVarChar(256), nullIfEmpty(b.other_purpose));
  request.input("other_sector",  sql.NVarChar(256), nullIfEmpty(b.other_sector));
  request.input("other_agency",  sql.NVarChar(256), nullIfEmpty(b.other_agency));
  request.input("updated_by", sql.Int, userId);

  await request.query(`
    UPDATE tbl_nmp_past SET
      parcel_details = @parcel_details, area = @area, lease_status = @lease_status,
      purpose = @purpose, sector = @sector, name_of_industry = @name_of_industry,
      mode_of_allotment = @mode_of_allotment, status = @status, target_year = @target_year,
      upfront_premium = @upfront_premium, npv_lease_rental = @npv_lease_rental,
      extimated_private_investment = @extimated_private_investment,
      total_monetization_value = @total_monetization_value,
      lease_rental_received = @lease_rental_received,
      agency_name = @agency_name, type_of_agency = @type_of_agency,
      agreement_signed = @agreement_signed,
      target_nit_date = @target_nit_date, actual_nit_date = @actual_nit_date,
      nit_reversed_date = @nit_reversed_date, nit_reversed_date_1 = @nit_reversed_date_1, nit_reversed_date_2 = @nit_reversed_date_2,
      target_agreement_date = @target_agreement_date, actual_agreement_date = @actual_agreement_date,
      agreement_revised_date = @agreement_revised_date, agreement_revised_date_1 = @agreement_revised_date_1, agreement_revised_date_2 = @agreement_revised_date_2,
      target_completion_date = @target_completion_date, actual_completion_date = @actual_completion_date,
      completion_revised_date = @completion_revised_date, completion_revised_date_1 = @completion_revised_date_1, completion_revised_date_2 = @completion_revised_date_2,
      lease_expiration_date = @lease_expiration_date,
      remarks = @remarks, other_purpose = @other_purpose, other_sector = @other_sector, other_agency = @other_agency, updated_date = GETDATE(), updated_by = @updated_by
    WHERE nmp_past_id = @nmp_past_id
  `);

  await replaceSorRows(conn, {
    uniqueId: b.unique_nmp_id,
    orgId: Number(b.organisation_id) || actingOrgId(req),
    userId,
    rows: b.sor_rows,
  });

} else {
  // future-land → tbl_nmp
  request.input("nmp_id", sql.Int, b.id);
  request.input("parcel_details", sql.NVarChar(256), nullIfEmpty(b.parcel_detail) || '');
  request.input("area", sql.NVarChar(100), String(nullIfEmpty(b.area_acres) || '0'));
  request.input("lease_status", sql.Int, intOrNull(b.lease_status));
  request.input("purpose", sql.Int, intOrNull(b.purpose));
  request.input("other_purpose", sql.NVarChar(256), nullIfEmpty(b.other_purpose));
  request.input("sector", sql.Int, intOrNull(b.sector));
  request.input("other_sector", sql.NVarChar(256), nullIfEmpty(b.other_sector));
  request.input("name_of_industry", sql.NVarChar(256), nullIfEmpty(b.industry_name) || '');
  request.input("mode_of_allotment", sql.Int, intOrNull(b.mode_of_allotment));
  request.input("status", sql.Int, intOrNull(b.status));
  request.input("target_year", sql.NVarChar(100), nullIfEmpty(b.target_yr_monetisation) || '');
  request.input("upfront_premium", sql.Float, numOrZero(b.upfront_premium));
  request.input("annual_rental", sql.Float, numOrZero(b.annual_base_lease_rental));
  request.input("lease_tenure", sql.Float, numOrZero(b.lease_tenure));
  request.input("escalation_rate", sql.Float, numOrZero(b.escalation_rate));
  request.input("frequency_of_escalation", sql.Float, numOrZero(b.frequency_of_escalation));
  request.input("npv_lease_rental", sql.Float, numOrZero(b.npv_lease_rental));
  request.input("extimated_private_investment", sql.Float, numOrZero(b.estimated_private_investment));
  request.input("total_monetization_value", sql.Float, numOrZero(b.total_monetization_value));
  request.input("lease_rental_received", sql.Float, numOrZero(b.lease_rental_received));
  request.input("agency_name", sql.NVarChar(100), nullIfEmpty(b.lessee_name) || '');
  request.input("type_of_agency", sql.Int, intOrNull(b.type_of_lessee));
  request.input("other_agency", sql.NVarChar(256), nullIfEmpty(b.other_agency));
  request.input("agreement_signed", sql.Int, intOrNull(b.agreement_signed));

  // NIT
  request.input("nit_target_date", sql.Date, dateOrNull(b.nit_original));
  request.input("actual_nit_date", sql.Date, dateOrNull(b.nit_actual));
  request.input("revised_nit_date", sql.Date, dateOrNull(b.nit_revised));
  request.input("revised_nit_date_1", sql.Date, dateOrNull(b.nit_revised_2));
  request.input("revised_nit_date_2", sql.Date, dateOrNull(b.nit_revised_3));

  // Agreement
  request.input("target_agreement_date", sql.Date, dateOrNull(b.agreement_original));
  request.input("actual_agreement_date", sql.Date, dateOrNull(b.agreement_actual));
  request.input("revised_agreement_date", sql.Date, dateOrNull(b.agreement_revised));
  request.input("revised_agreement_date_1", sql.Date, dateOrNull(b.agreement_revised_2));
  request.input("revised_agreement_date_2", sql.Date, dateOrNull(b.agreement_revised_3));

  // Construction / completion
  request.input("target_completion_date", sql.Date, dateOrNull(b.construction_original));
  request.input("actual_completion_date", sql.Date, dateOrNull(b.construction_actual));
  request.input("revised_completion_date", sql.Date, dateOrNull(b.construction_revised));
  request.input("revised_completion_date_1", sql.Date, dateOrNull(b.construction_revised_2));
  request.input("revised_completion_date_2", sql.Date, dateOrNull(b.construction_revised_3));

  request.input("remarks", sql.NVarChar(256), nullIfEmpty(b.remarks) || '');
  request.input("updated_by", sql.Int, userId);

  await request.query(`
    UPDATE tbl_nmp SET
      parcel_details = @parcel_details, area = @area, lease_status = @lease_status,
      purpose = @purpose, other_purpose = @other_purpose,
      sector = @sector, other_sector = @other_sector,
      name_of_industry = @name_of_industry, mode_of_allotment = @mode_of_allotment,
      status = @status, target_year = @target_year,
      upfront_premium = @upfront_premium, annual_rental = @annual_rental,
      lease_tenure = @lease_tenure, escalation_rate = @escalation_rate,
      frequency_of_escalation = @frequency_of_escalation,
      npv_lease_rental = @npv_lease_rental,
      extimated_private_investment = @extimated_private_investment,
      total_monetization_value = @total_monetization_value,
      lease_rental_received = @lease_rental_received,
      agency_name = @agency_name, type_of_agency = @type_of_agency,
      other_agency = @other_agency, agreement_signed = @agreement_signed,
      nit_target_date = @nit_target_date, actual_nit_date = @actual_nit_date,
      revised_nit_date = @revised_nit_date, revised_nit_date_1 = @revised_nit_date_1, revised_nit_date_2 = @revised_nit_date_2,
      target_agreement_date = @target_agreement_date, actual_agreement_date = @actual_agreement_date,
      revised_agreement_date = @revised_agreement_date, revised_agreement_date_1 = @revised_agreement_date_1, revised_agreement_date_2 = @revised_agreement_date_2,
      target_completion_date = @target_completion_date, actual_completion_date = @actual_completion_date,
      revised_completion_date = @revised_completion_date, revised_completion_date_1 = @revised_completion_date_1, revised_completion_date_2 = @revised_completion_date_2,
      remarks = @remarks, updated_by = @updated_by
    WHERE nmp_id = @nmp_id
  `);
}

    res.status(200).json({ message: "NMP entry updated successfully." });
  } catch (err) {
    console.error("NMP update error:", err);
    res.status(500).json({ message: "Failed to update NMP entry." });
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────

async function deleteNmpEntry(req, res) {
  try {
    const nmpId = parseInt(req.params.id, 10);
    const formType = req.query.form_type || 'future-land';
    if (!nmpId) return res.status(400).json({ message: "Missing entry id." });

    const conn = await pool;
    const request = conn.request();
    request.input("id", nmpId);

    if (formType === 'land-abstract') {
      await request.query(`DELETE FROM tbl_land_abstract WHERE land_abstract_id = @id`);
    } else if (formType === 'past-land') {
      await request.query(`DELETE FROM tbl_nmp_past WHERE nmp_past_id = @id`);
    } else {
      await request.query(`DELETE FROM tbl_nmp WHERE nmp_id = @id`);
    }

    res.status(200).json({ message: "NMP entry deleted successfully." });
  } catch (err) {
    console.error("NMP delete error:", err);
    res.status(500).json({ message: "Failed to delete NMP entry." });
  }
}
    async function getnmpCaseNumber(req,res){
                const organisationID = req.params.organisationID;

                const conn = await pool;
                const request = conn.request();
                request.input("organisationID", organisationID);
                try {
                    const result = await request.query(`SELECT TOP 1 unique_nmp_id FROM tbl_nmp_past WHERE organisation_id = @organisationID ORDER BY nmp_past_id DESC`);
                    //console.log("result",result.recordset)
                    res.json(result.recordset);
                    
                }
                catch (err) {
                    console.log("error",err)
                    return res.status(500).json({message: 'Internal Server Error'})
                }
            }

export default {
  getNmpDashboard,
  getLandAbstractList,
  getPastLandList,
  getFutureLandList,
  getNmpById,
  createNmpEntry,
  updateNmpEntry,
  deleteNmpEntry,
  getnmpCaseNumber
};
