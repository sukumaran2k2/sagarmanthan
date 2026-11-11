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

async function getPastLandList(req, res) {
  try {
    const conn = await pool;
    const result = await conn.request().query(`
      SELECT
        p.nmp_past_id,
        p.unique_nmp_id,
        p.organisation_id,
        m.organisation_name,
        p.parcel_details AS parcel_detail,
        p.area AS area_acres,
        p.lease_status,
        p.purpose,
        p.sector,
        p.name_of_industry AS industry_name,
        p.mode_of_allotment,
        p.status,
        p.target_year,
        p.upfront_premium,
        p.annual_rental AS annual_base_lease_rental,
        p.escalation_rate,
        p.frequency_of_escalation,
        p.lease_tenure AS lease_tenure_years,
        p.npv_lease_rental AS npv_lease_rentals,
        p.extimated_private_investment AS estimated_private_investment,
        p.total_monetization_value AS total_monetisation_value,
        p.lease_rental_received,
        p.agency_name AS agency_lessee_name,
        p.type_of_agency AS type_of_agency_lessee,
        p.agreement_signed,
        p.original_nit_date AS nit_original_target_date,
        p.actual_nit_date AS nit_actual_date,
        p.nit_reversed_date AS nit_revised,
        p.original_agreement_date AS agreement_original_target_date,
        p.actual_agreement_date,
        p.agreement_revised_date AS agreement_revised,
        p.original_completion_date,
        p.actual_completion_date,
        p.completion_revised_date AS construction_revised,
        p.lease_expiration_date,
        p.remarks,
        p.created_date
      FROM tbl_nmp_past p
      LEFT JOIN mmt_organisation m ON m.organisation_id = p.organisation_id
      ORDER BY p.created_date DESC
    `);
    res.status(200).json(result.recordset);
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
        f.nmp_id,
        f.organisation_id,
        m.organisation_name,
        f.parcel_details AS parcel_detail,
        f.area AS area_acres,
        f.lease_status,
        f.purpose,
        f.sector,
        f.name_of_industry AS industry_name,
        f.mode_of_allotment,
        f.status,
        f.target_year,
        f.upfront_premium,
        f.annual_rental AS annual_base_lease_rental,
        f.lease_tenure AS lease_tenure_years,
        f.escalation_rate,
        f.frequency_of_escalation,
        f.npv_lease_rental AS npv_lease_rentals,
        f.extimated_private_investment AS estimated_private_investment,
        f.total_monetization_value AS total_monetisation_value,
        f.lease_rental_received,
        f.agency_name AS agency_lessee_name,
        f.type_of_agency AS type_of_agency_lessee,
        f.agreement_signed,
        f.original_nit_date AS nit_original_target_date,
        f.actual_nit_date AS nit_actual_date,
        f.original_agreement_date AS agreement_original_target_date,
        f.actual_agreement_date,
        f.original_completion_date,
        f.actual_completion_date,
        f.remarks,
        f.created_date
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

async function getNmpById(req, res) {
  try {
    const conn = await pool;
    const formType = req.query.form_type || 'future-land';
    const request = conn.request();
    request.input("id", parseInt(req.params.id, 10));

    let result;
    if (formType === 'land-abstract') {
      result = await request.query(`SELECT * FROM tbl_land_abstract WHERE land_abstract_id = @id`);
    } else if (formType === 'past-land') {
      result = await request.query(`SELECT * FROM tbl_nmp_past WHERE nmp_past_id = @id`);
    } else {
      result = await request.query(`SELECT * FROM tbl_nmp WHERE nmp_id = @id`);
    }

    if (!result.recordset.length) {
      return res.status(404).json({ message: "NMP entry not found." });
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    console.error("NMP getById error:", err);
    res.status(500).json({ message: "Failed to fetch NMP entry." });
  }
}

// ── Create ───────────────────────────────────────────────────────────────────

async function createNmpEntry(req, res) {
  try {
    const userId = actingUserId(req);
    const orgId = actingOrgId(req);
    const b = req.body;
    const formType = b.form_type;
    const conn = await pool;
    const request = conn.request();

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
      request.input("parcel_details", sql.NVarChar(256), nullIfEmpty(b.parcel_detail));
      request.input("area", sql.Decimal(18, 2), numOrZero(b.area_acres));
      request.input("lease_status", sql.Int, b.lease_status != null && b.lease_status !== '' ? Math.round(Number(b.lease_status)) || null : null);
      request.input("purpose", sql.NVarChar(100), nullIfEmpty(b.purpose));
      request.input("sector", sql.NVarChar(100), nullIfEmpty(b.sector));
      request.input("name_of_industry", sql.NVarChar(256), nullIfEmpty(b.industry_name));
      request.input("mode_of_allotment", sql.Int, b.mode_of_allotment != null && b.mode_of_allotment !== '' ? Math.round(Number(b.mode_of_allotment)) || null : null);
      request.input("status", sql.Int, b.status != null && b.status !== '' ? Math.round(Number(b.status)) || null : null);
      request.input("target_year", sql.NVarChar(100), nullIfEmpty(b.year_of_allotment));
      request.input("upfront_premium", sql.Decimal(18, 2), numOrZero(b.upfront_premium));
      request.input("npv_lease_rental", sql.Decimal(18, 2), numOrZero(b.npv_lease_rental));
      request.input("extimated_private_investment", sql.Decimal(18, 2), numOrZero(b.estimated_private_investment));
      request.input("total_monetization_value", sql.Decimal(18, 2), numOrZero(b.total_monetization_value));
      request.input("lease_rental_received", sql.Decimal(18, 2), numOrZero(b.lease_rental_received));
      request.input("agency_name", sql.NVarChar(100), nullIfEmpty(b.lessee_name));
      request.input("type_of_agency", sql.Int, b.type_of_lessee != null && b.type_of_lessee !== '' ? Math.round(Number(b.type_of_lessee)) || null : null);
      request.input("agreement_signed", sql.NVarChar(100), nullIfEmpty(b.agreement_signed));
      request.input("original_nit_date", sql.Date, dateOrNull(b.nit_original));
      request.input("actual_nit_date", sql.Date, dateOrNull(b.nit_actual));
      request.input("original_agreement_date", sql.Date, dateOrNull(b.agreement_original));
      request.input("actual_agreement_date", sql.Date, dateOrNull(b.agreement_actual));
      request.input("original_completion_date", sql.Date, dateOrNull(b.construction_original));
      request.input("actual_completion_date", sql.Date, dateOrNull(b.construction_actual));
      request.input("nit_reversed_date", sql.Date, dateOrNull(b.nit_revised));
      request.input("agreement_revised_date", sql.Date, dateOrNull(b.agreement_revised));
      request.input("completion_revised_date", sql.Date, dateOrNull(b.construction_revised));
      request.input("remarks", sql.NVarChar(256), nullIfEmpty(b.remarks));
      request.input("created_by", sql.Int, userId);

      const result = await request.query(`
        INSERT INTO tbl_nmp_past (
          organisation_id, parcel_details, area, lease_status, purpose, sector,
          name_of_industry, mode_of_allotment, status, target_year,
          upfront_premium, npv_lease_rental, extimated_private_investment,
          total_monetization_value, lease_rental_received,
          agency_name, type_of_agency, agreement_signed,
          original_nit_date, actual_nit_date, nit_reversed_date,
          original_agreement_date, actual_agreement_date, agreement_revised_date,
          original_completion_date, actual_completion_date, completion_revised_date,
          remarks, created_date, created_by
        ) VALUES (
          @organisation_id, @parcel_details, @area, @lease_status, @purpose, @sector,
          @name_of_industry, @mode_of_allotment, @status, @target_year,
          @upfront_premium, @npv_lease_rental, @extimated_private_investment,
          @total_monetization_value, @lease_rental_received,
          @agency_name, @type_of_agency, @agreement_signed,
          @original_nit_date, @actual_nit_date, @nit_reversed_date,
          @original_agreement_date, @actual_agreement_date, @agreement_revised_date,
          @original_completion_date, @actual_completion_date, @completion_revised_date,
          @remarks, GETDATE(), @created_by
        );
        SELECT SCOPE_IDENTITY() AS id;
      `);
      return res.status(201).json({ message: "Past land entry created.", id: result.recordset[0]?.id });

    } else {
      // future-land → tbl_nmp (most columns are NOT NULL)
      request.input("organisation_id", sql.Int, orgId);
      request.input("parcel_details", sql.NVarChar(256), nullIfEmpty(b.parcel_detail) || '');
      request.input("area", sql.NVarChar(100), String(nullIfEmpty(b.area_acres) || '0'));
      request.input("lease_status", sql.NVarChar(100), nullIfEmpty(b.lease_status) || '');
      request.input("purpose", sql.NVarChar(100), nullIfEmpty(b.purpose) || '');
      request.input("sector", sql.NVarChar(100), nullIfEmpty(b.sector) || '');
      request.input("name_of_industry", sql.NVarChar(256), nullIfEmpty(b.industry_name) || '');
      request.input("mode_of_allotment", sql.NVarChar(100), nullIfEmpty(b.mode_of_allotment) || '');
      request.input("status", sql.NVarChar(100), nullIfEmpty(b.status) || '');
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
      request.input("type_of_agency", sql.NVarChar(100), nullIfEmpty(b.type_of_lessee) || '');
      request.input("agreement_signed", sql.NVarChar(100), nullIfEmpty(b.agreement_signed) || '');
      request.input("original_nit_date", sql.Date, dateOrNull(b.nit_original) || new Date('1900-01-01'));
      request.input("actual_nit_date", sql.Date, dateOrNull(b.nit_actual));
      request.input("original_agreement_date", sql.Date, dateOrNull(b.agreement_original));
      request.input("actual_agreement_date", sql.Date, dateOrNull(b.agreement_actual));
      request.input("original_completion_date", sql.Date, dateOrNull(b.construction_original));
      request.input("actual_completion_date", sql.Date, dateOrNull(b.construction_actual));
      request.input("remarks", sql.NVarChar(256), nullIfEmpty(b.remarks) || '');
      request.input("created_by", sql.Int, userId);

      const result = await request.query(`
        INSERT INTO tbl_nmp (
          organisation_id, parcel_details, area, lease_status, purpose, sector,
          name_of_industry, mode_of_allotment, status, target_year,
          upfront_premium, annual_rental, lease_tenure, escalation_rate, frequency_of_escalation,
          npv_lease_rental, extimated_private_investment, total_monetization_value, lease_rental_received,
          agency_name, type_of_agency, agreement_signed,
          original_nit_date, actual_nit_date,
          original_agreement_date, actual_agreement_date,
          original_completion_date, actual_completion_date,
          remarks, created_date, created_by
        ) VALUES (
          @organisation_id, @parcel_details, @area, @lease_status, @purpose, @sector,
          @name_of_industry, @mode_of_allotment, @status, @target_year,
          @upfront_premium, @annual_rental, @lease_tenure, @escalation_rate, @frequency_of_escalation,
          @npv_lease_rental, @extimated_private_investment, @total_monetization_value, @lease_rental_received,
          @agency_name, @type_of_agency, @agreement_signed,
          @original_nit_date, @actual_nit_date,
          @original_agreement_date, @actual_agreement_date,
          @original_completion_date, @actual_completion_date,
          @remarks, GETDATE(), @created_by
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
      request.input("lease_status", sql.Int, b.lease_status != null && b.lease_status !== '' ? Math.round(Number(b.lease_status)) || null : null);
      request.input("purpose", sql.NVarChar(100), nullIfEmpty(b.purpose));
      request.input("sector", sql.NVarChar(100), nullIfEmpty(b.sector));
      request.input("name_of_industry", sql.NVarChar(256), nullIfEmpty(b.industry_name));
      request.input("mode_of_allotment", sql.Int, b.mode_of_allotment != null && b.mode_of_allotment !== '' ? Math.round(Number(b.mode_of_allotment)) || null : null);
      request.input("status", sql.Int, b.status != null && b.status !== '' ? Math.round(Number(b.status)) || null : null);
      request.input("target_year", sql.NVarChar(100), nullIfEmpty(b.year_of_allotment));
      request.input("upfront_premium", sql.Decimal(18, 2), numOrZero(b.upfront_premium));
      request.input("npv_lease_rental", sql.Decimal(18, 2), numOrZero(b.npv_lease_rental));
      request.input("extimated_private_investment", sql.Decimal(18, 2), numOrZero(b.estimated_private_investment));
      request.input("total_monetization_value", sql.Decimal(18, 2), numOrZero(b.total_monetization_value));
      request.input("lease_rental_received", sql.Decimal(18, 2), numOrZero(b.lease_rental_received));
      request.input("agency_name", sql.NVarChar(100), nullIfEmpty(b.lessee_name));
      request.input("type_of_agency", sql.Int, b.type_of_lessee != null && b.type_of_lessee !== '' ? Math.round(Number(b.type_of_lessee)) || null : null);
      request.input("agreement_signed", sql.NVarChar(100), nullIfEmpty(b.agreement_signed));
      request.input("original_nit_date", sql.Date, dateOrNull(b.nit_original));
      request.input("actual_nit_date", sql.Date, dateOrNull(b.nit_actual));
      request.input("nit_reversed_date", sql.Date, dateOrNull(b.nit_revised));
      request.input("original_agreement_date", sql.Date, dateOrNull(b.agreement_original));
      request.input("actual_agreement_date", sql.Date, dateOrNull(b.agreement_actual));
      request.input("agreement_revised_date", sql.Date, dateOrNull(b.agreement_revised));
      request.input("original_completion_date", sql.Date, dateOrNull(b.construction_original));
      request.input("actual_completion_date", sql.Date, dateOrNull(b.construction_actual));
      request.input("completion_revised_date", sql.Date, dateOrNull(b.construction_revised));
      request.input("remarks", sql.NVarChar(256), nullIfEmpty(b.remarks));
      request.input("updated_by", userId);

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
          original_nit_date = @original_nit_date, actual_nit_date = @actual_nit_date,
          nit_reversed_date = @nit_reversed_date,
          original_agreement_date = @original_agreement_date, actual_agreement_date = @actual_agreement_date,
          agreement_revised_date = @agreement_revised_date,
          original_completion_date = @original_completion_date, actual_completion_date = @actual_completion_date,
          completion_revised_date = @completion_revised_date,
          remarks = @remarks, updated_date = GETDATE(), updated_by = @updated_by
        WHERE nmp_past_id = @nmp_past_id
      `);

    } else {
      // future-land → tbl_nmp
      request.input("nmp_id", sql.Int, b.id);
      request.input("parcel_details", sql.NVarChar(256), nullIfEmpty(b.parcel_detail) || '');
      request.input("area", sql.NVarChar(100), String(nullIfEmpty(b.area_acres) || '0'));
      request.input("lease_status", sql.NVarChar(100), nullIfEmpty(b.lease_status) || '');
      request.input("purpose", sql.NVarChar(100), nullIfEmpty(b.purpose) || '');
      request.input("sector", sql.NVarChar(100), nullIfEmpty(b.sector) || '');
      request.input("name_of_industry", sql.NVarChar(256), nullIfEmpty(b.industry_name) || '');
      request.input("mode_of_allotment", sql.NVarChar(100), nullIfEmpty(b.mode_of_allotment) || '');
      request.input("status", sql.NVarChar(100), nullIfEmpty(b.status) || '');
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
      request.input("type_of_agency", sql.NVarChar(100), nullIfEmpty(b.type_of_lessee) || '');
      request.input("agreement_signed", sql.NVarChar(100), nullIfEmpty(b.agreement_signed) || '');
      request.input("original_nit_date", sql.Date, dateOrNull(b.nit_original) || new Date('1900-01-01'));
      request.input("actual_nit_date", sql.Date, dateOrNull(b.nit_actual));
      request.input("original_agreement_date", sql.Date, dateOrNull(b.agreement_original));
      request.input("actual_agreement_date", sql.Date, dateOrNull(b.agreement_actual));
      request.input("original_completion_date", sql.Date, dateOrNull(b.construction_original));
      request.input("actual_completion_date", sql.Date, dateOrNull(b.construction_actual));
      request.input("remarks", sql.NVarChar(256), nullIfEmpty(b.remarks) || '');
      request.input("updated_by", sql.Int, userId);

      await request.query(`
        UPDATE tbl_nmp SET
          parcel_details = @parcel_details, area = @area, lease_status = @lease_status,
          purpose = @purpose, sector = @sector, name_of_industry = @name_of_industry,
          mode_of_allotment = @mode_of_allotment, status = @status, target_year = @target_year,
          upfront_premium = @upfront_premium, annual_rental = @annual_rental,
          lease_tenure = @lease_tenure, escalation_rate = @escalation_rate,
          frequency_of_escalation = @frequency_of_escalation,
          npv_lease_rental = @npv_lease_rental, extimated_private_investment = @extimated_private_investment,
          total_monetization_value = @total_monetization_value, lease_rental_received = @lease_rental_received,
          agency_name = @agency_name, type_of_agency = @type_of_agency,
          agreement_signed = @agreement_signed,
          original_nit_date = @original_nit_date, actual_nit_date = @actual_nit_date,
          original_agreement_date = @original_agreement_date, actual_agreement_date = @actual_agreement_date,
          original_completion_date = @original_completion_date, actual_completion_date = @actual_completion_date,
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

export default {
  getNmpDashboard,
  getLandAbstractList,
  getPastLandList,
  getFutureLandList,
  getNmpById,
  createNmpEntry,
  updateNmpEntry,
  deleteNmpEntry,
};
