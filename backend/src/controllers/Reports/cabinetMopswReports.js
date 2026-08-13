import { pool } from "../../db.js";

function toColumnDefs(rowData) {
  if (!rowData.length) return [];
  return Object.keys(rowData[0]).map((key) => ({
    headerName: key.charAt(0).toUpperCase() + key.slice(1),
    field: key,
  }));
}

async function getMopswReport(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
        mmt_wings.wing_id AS [Wing Id],
        mmt_wings.wing_name AS [Wing Name],
        COUNT(tbl_cabinet_notes_mopsw.cabinet_notes_mopsw_id) AS [No of Cabinet Notes],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 1 THEN 1 END) AS [Preliminary DCN Prepared],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 2 THEN 1 END) AS [Preliminary DCN Approved by Minister],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 3 THEN 1 END) AS [Circulated for IMC],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 4 THEN 1 END) AS [IMC Comments Received],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 5 THEN 1 END) AS [Final DCN to be Prepared],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 6 THEN 1 END) AS [Final DCN Approved by Minister],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 7 THEN 1 END) AS [Has DCM been approved?],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 8 THEN 1 END) AS [Advance Copy Sent to PMO & Cab],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 9 THEN 1 END) AS [Approved by Cabinet],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 10 THEN 1 END) AS [On Hold],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 11 THEN 1 END) AS [Completed]
      FROM mmt_wings
      LEFT JOIN tbl_cabinet_notes_mopsw
        ON tbl_cabinet_notes_mopsw.wing = mmt_wings.wing_id
      GROUP BY mmt_wings.wing_id, mmt_wings.wing_name
      ORDER BY mmt_wings.wing_name;
    `);

    const rowData = result.recordset;
    if (!rowData.length) {
      return res.json({ columnDefs: [], rowData: [] });
    }
    res.json({ columnDefs: toColumnDefs(rowData), rowData });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getCabinetMopswDivisionReport(req, res) {
  const wingID = req.params.wingID;
  const conn = await pool;
  const request = conn.request();
  request.input("wingID", wingID);

  try {
    const result = await request.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
        mmt_division.division_id AS [Division Id],
        mmt_division.division_name AS [Division Name],
        COUNT(tbl_cabinet_notes_mopsw.cabinet_notes_mopsw_id) AS [No of Cabinet Notes],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 1 THEN 1 END) AS [Preliminary DCN Prepared],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 2 THEN 1 END) AS [Preliminary DCN Approved by Minister],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 3 THEN 1 END) AS [Circulated for IMC],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 4 THEN 1 END) AS [IMC Comments Received],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 5 THEN 1 END) AS [Final DCN to be Prepared],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 6 THEN 1 END) AS [Final DCN Approved by Minister],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 7 THEN 1 END) AS [Has DCM been approved?],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 8 THEN 1 END) AS [Advance Copy Sent to PMO & Cab],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 9 THEN 1 END) AS [Approved by Cabinet],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 10 THEN 1 END) AS [On Hold],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 11 THEN 1 END) AS [Completed]
      FROM mmt_division
      LEFT JOIN tbl_cabinet_notes_mopsw
        ON mmt_division.division_id = tbl_cabinet_notes_mopsw.division
        AND tbl_cabinet_notes_mopsw.wing = @wingID
      WHERE mmt_division.wing_id = @wingID
      GROUP BY mmt_division.division_id, mmt_division.division_name
      ORDER BY mmt_division.division_name;
    `);

    const rowData = result.recordset;
    if (!rowData.length) {
      return res.json({ columnDefs: [], rowData: [] });
    }
    res.json({ columnDefs: toColumnDefs(rowData), rowData });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getDetailMopswWingWise(req, res) {
  const wingID = req.params.wingID;
  const mopswStage = req.params.mopswStage;

  const conn = await pool;
  const request = conn.request();
  request.input("wingID", wingID);
  request.input("mopswStage", mopswStage);

  try {
    const result = await request.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY subject) AS [S No],
        mmt_wings.wing_name AS [Wing],
        mmt_division.division_name AS [Division],
        subject AS [Subject],
        CASE WHEN pre_dcn_prepared_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Preliminary DCN Prepared],
        pre_dcn_prepared_date AS [Preliminary DCN Prepared Date],
        CASE WHEN pre_dcn_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Preliminary DCN Approved],
        pre_dcn_approved_date AS [Preliminary DCN Approved Date],
        CASE WHEN cirucalted_for_imc_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Circulated for IMC],
        cirucalted_for_imc_date AS [Circulated for IMC Date],
        CASE WHEN imc_comments_rec_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [IMC Comments Received],
        imc_comments_rec_date AS [IMC Comments Received Date],
        CASE WHEN final_dcn_prepared_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Final DCN Prepared],
        final_dcn_prepared_date AS [Final DCN Prepared Date],
        CASE WHEN final_dcn_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Final DCN Approved],
        final_dcn_approved_date AS [Final DCN Approved Date],
        CASE WHEN dcmbeen_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [DCM Approved],
        dcmbeen_approved_date AS [DCM Approved Date],
        CASE WHEN advance_copy_sent_to_pmo_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Advance Copy Sent to PMO],
        advance_copy_sent_to_pmo_date AS [Advance Copy Sent to PMO Date],
        CASE WHEN cabinet_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Approved by Cabinet],
        cabinet_approved_date AS [Approved by Cabinet Date],
        CASE WHEN on_hold_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [On Hold],
        on_hold_date AS [On Hold Date],
        CASE WHEN completed_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Completed],
        completed_date AS [Completed Date],
        remarks AS [Remarks],
        updated_date AS [Last Updated]
      FROM tbl_cabinet_notes_mopsw
      INNER JOIN mmt_wings ON mmt_wings.wing_id = tbl_cabinet_notes_mopsw.wing
      INNER JOIN mmt_division ON mmt_division.division_id = tbl_cabinet_notes_mopsw.division
      INNER JOIN mmt_cabinet_mopsw_stage
        ON mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw.stage_id
      WHERE wing = @wingID AND tbl_cabinet_notes_mopsw.stage_id = @mopswStage
      ORDER BY subject;
    `);

    const rowData = result.recordset;
    if (!rowData.length) {
      return res.json({ columnDefs: [], rowData: [] });
    }
    res.json({ columnDefs: toColumnDefs(rowData), rowData });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getDetailMopswDivisionWise(req, res) {
  const divisionID = req.params.divisionID;
  const mopswStage = req.params.mopswStage;

  const conn = await pool;
  const request = conn.request();
  request.input("divisionID", divisionID);
  request.input("mopswStage", mopswStage);

  try {
    const result = await request.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY subject) AS [S No],
        mmt_wings.wing_name AS [Wing],
        mmt_division.division_name AS [Division],
        subject AS [Subject],
        CASE WHEN pre_dcn_prepared_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Preliminary DCN Prepared],
        pre_dcn_prepared_date AS [Preliminary DCN Prepared Date],
        CASE WHEN pre_dcn_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Preliminary DCN Approved],
        pre_dcn_approved_date AS [Preliminary DCN Approved Date],
        CASE WHEN cirucalted_for_imc_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Circulated for IMC],
        cirucalted_for_imc_date AS [Circulated for IMC Date],
        CASE WHEN imc_comments_rec_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [IMC Comments Received],
        imc_comments_rec_date AS [IMC Comments Received Date],
        CASE WHEN final_dcn_prepared_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Final DCN Prepared],
        final_dcn_prepared_date AS [Final DCN Prepared Date],
        CASE WHEN final_dcn_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Final DCN Approved],
        final_dcn_approved_date AS [Final DCN Approved Date],
        CASE WHEN dcmbeen_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [DCM Approved],
        dcmbeen_approved_date AS [DCM Approved Date],
        CASE WHEN advance_copy_sent_to_pmo_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Advance Copy Sent to PMO],
        advance_copy_sent_to_pmo_date AS [Advance Copy Sent to PMO Date],
        CASE WHEN cabinet_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Approved by Cabinet],
        cabinet_approved_date AS [Approved by Cabinet Date],
        CASE WHEN on_hold_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [On Hold],
        on_hold_date AS [On Hold Date],
        CASE WHEN completed_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS [Completed],
        completed_date AS [Completed Date],
        remarks AS [Remarks],
        updated_date AS [Last Updated]
      FROM tbl_cabinet_notes_mopsw
      INNER JOIN mmt_wings ON mmt_wings.wing_id = tbl_cabinet_notes_mopsw.wing
      INNER JOIN mmt_division ON mmt_division.division_id = tbl_cabinet_notes_mopsw.division
      INNER JOIN mmt_cabinet_mopsw_stage
        ON mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw.stage_id
      WHERE division = @divisionID AND tbl_cabinet_notes_mopsw.stage_id = @mopswStage
      ORDER BY subject;
    `);

    const rowData = result.recordset;
    if (!rowData.length) {
      return res.json({ columnDefs: [], rowData: [] });
    }
    res.json({ columnDefs: toColumnDefs(rowData), rowData });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

export default {
  getMopswReport,
  getCabinetMopswDivisionReport,
  getDetailMopswWingWise,
  getDetailMopswDivisionWise,
};
