import { pool } from "../../db.js";

function toColumnDefs(rowData) {
  if (!rowData.length) return [];
  return Object.keys(rowData[0]).map((key) => ({
    headerName: key,
    field: key,
  }));
}

function sendGrid(res, recordset) {
  const rowData = recordset || [];
  if (!rowData.length) {
    return res.json({ columnDefs: [], rowData: [] });
  }
  return res.json({ columnDefs: toColumnDefs(rowData), rowData });
}

function reportStageWhere() {
  return "tbl_cabinet_notes_mopsw.stage_id = @mopswStage";
}

const STAGE_COUNT_SQL = `
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 1 THEN 1 END) AS [Preliminary DCN Prepared],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 2 THEN 1 END) AS [Preliminary DCN Approved by Minister],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 3 THEN 1 END) AS [Circulated for IMC],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 4 THEN 1 END) AS [IMC Comments Received],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 5 THEN 1 END) AS [Final DCN to be Prepared],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 6 THEN 1 END) AS [Final DCN Approved by Minister],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 7 THEN 1 END) AS [Advance copy sent to PMO],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 8 THEN 1 END) AS [Cabinet Approved],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 9 THEN 1 END) AS [On hold],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 10 THEN 1 END) AS [Completed],
        COUNT(CASE WHEN tbl_cabinet_notes_mopsw.stage_id = 11 THEN 1 END) AS [DCM Been Approved]`;

const DETAIL_DATE_SQL = `
        CONVERT(varchar(10), pre_dcn_prepared_date, 23) AS [Preliminary DCN Prepared],
        CONVERT(varchar(10), pre_dcn_approved_date, 23) AS [Preliminary DCN Approved by Minister],
        CONVERT(varchar(10), cirucalted_for_imc_date, 23) AS [Circulated for IMC],
        CONVERT(varchar(10), imc_comments_rec_date, 23) AS [IMC Comments Received],
        CONVERT(varchar(10), final_dcn_prepared_date, 23) AS [Final DCN to be Prepared],
        CONVERT(varchar(10), final_dcn_approved_date, 23) AS [Final DCN Approved by Minister],
        CONVERT(varchar(10), dcmbeen_approved_date, 23) AS [DCM Been Approved],
        CONVERT(varchar(10), advance_copy_sent_to_pmo_date, 23) AS [Advance copy sent to PMO],
        CONVERT(varchar(10), cabinet_approved_date, 23) AS [Cabinet Approved],
        CONVERT(varchar(10), on_hold_date, 23) AS [On hold],
        CONVERT(varchar(10), completed_date, 23) AS [Completed],
        CONVERT(varchar(10), updated_date, 23) AS [Last Updated]`;

async function getMopswReport(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
        mmt_wings.wing_id AS [Wing Id],
        mmt_wings.wing_name AS [Wing Name],
        COUNT(tbl_cabinet_notes_mopsw.cabinet_notes_mopsw_id) AS [No of Cabinet Notes],
        ${STAGE_COUNT_SQL}
      FROM mmt_wings
      LEFT JOIN tbl_cabinet_notes_mopsw
        ON tbl_cabinet_notes_mopsw.wing = mmt_wings.wing_id
      GROUP BY mmt_wings.wing_id, mmt_wings.wing_name
      ORDER BY mmt_wings.wing_name;
    `);

    const rowData = result.recordset;
    return sendGrid(res, rowData);
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
        ${STAGE_COUNT_SQL}
      FROM mmt_division
      LEFT JOIN tbl_cabinet_notes_mopsw
        ON mmt_division.division_id = tbl_cabinet_notes_mopsw.division
        AND tbl_cabinet_notes_mopsw.wing = @wingID
      WHERE mmt_division.wing_id = @wingID
      GROUP BY mmt_division.division_id, mmt_division.division_name
      ORDER BY mmt_division.division_name;
    `);

    const rowData = result.recordset;
    return sendGrid(res, rowData);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getCabinetMopswWingDivisionReport(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id, mmt_division.division_id) AS [S No],
        mmt_wings.wing_id AS [Wing Id],
        mmt_wings.wing_name AS [Wing Name],
        mmt_division.division_id AS [Division Id],
        mmt_division.division_name AS [Division Name],
        COUNT(tbl_cabinet_notes_mopsw.cabinet_notes_mopsw_id) AS [No of Cabinet Notes],
        ${STAGE_COUNT_SQL}
      FROM mmt_wings
      INNER JOIN mmt_division ON mmt_division.wing_id = mmt_wings.wing_id
      LEFT JOIN tbl_cabinet_notes_mopsw
        ON mmt_division.division_id = tbl_cabinet_notes_mopsw.division
        AND tbl_cabinet_notes_mopsw.wing = mmt_wings.wing_id
      GROUP BY
        mmt_wings.wing_id,
        mmt_wings.wing_name,
        mmt_division.division_id,
        mmt_division.division_name
      ORDER BY mmt_wings.wing_name, mmt_division.division_name;
    `);

    const rowData = result.recordset;
    return sendGrid(res, rowData);
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
        ${DETAIL_DATE_SQL}
      FROM tbl_cabinet_notes_mopsw
      LEFT JOIN mmt_wings ON mmt_wings.wing_id = tbl_cabinet_notes_mopsw.wing
      LEFT JOIN mmt_division ON mmt_division.division_id = tbl_cabinet_notes_mopsw.division
      LEFT JOIN mmt_cabinet_mopsw_stage
        ON mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw.stage_id
      WHERE wing = @wingID AND ${reportStageWhere(mopswStage)}
      ORDER BY subject;
    `);

    const rowData = result.recordset;
    return sendGrid(res, rowData);
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
        ${DETAIL_DATE_SQL}
      FROM tbl_cabinet_notes_mopsw
      LEFT JOIN mmt_wings ON mmt_wings.wing_id = tbl_cabinet_notes_mopsw.wing
      LEFT JOIN mmt_division ON mmt_division.division_id = tbl_cabinet_notes_mopsw.division
      LEFT JOIN mmt_cabinet_mopsw_stage
        ON mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw.stage_id
      WHERE division = @divisionID AND ${reportStageWhere(mopswStage)}
      ORDER BY subject;
    `);

    const rowData = result.recordset;
    return sendGrid(res, rowData);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

export default {
  getMopswReport,
  getCabinetMopswDivisionReport,
  getCabinetMopswWingDivisionReport,
  getDetailMopswWingWise,
  getDetailMopswDivisionWise,
};
