import { pool } from "../../db.js";
import fs from "fs";
import sql from "mssql";
import { applyDataScope } from "../../middleware/dataScope.js";

function emptyToNull(value) {
  return value === "" || value === undefined ? null : value;
}

function parseDate(val) {
  if (!val || val === "") return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  const parts = String(val).split("-");
  if (parts.length !== 3) return null;
  const year = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10) - 1;
  const day = Number.parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  const d = new Date();
  d.setFullYear(year, month, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bindNoteFields(request, body) {
  request.input("subject", body.subject);
  request.input("wing", body.wing);
  request.input("division", body.division);
  request.input("preliDcnPreparedDate", sql.Date, parseDate(body.preliDcnPreparedDate));
  request.input("preliDcnApprovedDate", sql.Date, parseDate(body.preliDcnApprovedDate));
  request.input("circulatedForImcDate", sql.Date, parseDate(body.circulatedForImcDate));
  request.input("imcCommentsRecDate", sql.Date, parseDate(body.imcCommentsRecDate));
  request.input("finalDcnPreparedDate", sql.Date, parseDate(body.finalDcnPreparedDate));
  request.input("finalDcnApprovedDate", sql.Date, parseDate(body.finalDcnApprovedDate));
  request.input(
    "dcmbeenApprovedDate",
    sql.Date,
    parseDate(body.dcmbeenApprovedDate || body.dcmbeemApprovedDate)
  );
  request.input("advanceCopySentToPmoDate", sql.Date, parseDate(body.advanceCopySentToPmoDate));
  request.input("cabinetApprovedDate", sql.Date, parseDate(body.cabinetApprovedDate));
  request.input("onHoldDate", sql.Date, parseDate(body.onHoldDate));
  request.input("completedDate", sql.Date, parseDate(body.completedDate));
  request.input("remarks", emptyToNull(body.remarks));
  request.input("selectedCabinetNotesStage", body.selectedCabinetNotesStage ?? body.stage_id ?? 0);
  request.input("userID", body.userID ?? null);

  request.input("preliDcnPreparedRemark", emptyToNull(body.preliDcnPreparedRemark));
  request.input("preliDcnApprovedRemark", emptyToNull(body.preliDcnApprovedRemark));
  request.input("circulatedForImcRemark", emptyToNull(body.circulatedForImcRemark));
  request.input("imcCommentsRecRemark", emptyToNull(body.imcCommentsRecRemark));
  request.input("finalDcnPreparedRemark", emptyToNull(body.finalDcnPreparedRemark));
  request.input("finalDcnApprovedRemark", emptyToNull(body.finalDcnApprovedRemark));
  request.input("dcmbeenApprovedRemark", emptyToNull(body.dcmbeenApprovedRemark));
  request.input("advanceCopySentToPmoRemark", emptyToNull(body.advanceCopySentToPmoRemark));
  request.input("cabinetApprovedRemark", emptyToNull(body.cabinetApprovedRemark));
  request.input("onHoldRemark", emptyToNull(body.onHoldRemark));
  request.input("completedRemark", emptyToNull(body.completedRemark));
}

async function getCabinetMopsw(req, res) {
  const conn = await pool;

  try {
    const request = conn.request();
    const { joinSql, whereSql } = applyDataScope(request, req.user, {
      strategy: "viaCreatedBy",
      alias: "notes",
    });

    const result = await request.query(`
      SELECT
        notes.*,
        division.division_name,
        wings.wing_name,
        stage.mopsw_stage_name,
        (
          SELECT COUNT(*)
          FROM tbl_cabinet_notes_mopsw_document
          WHERE mopsw_cabinet_id = notes.cabinet_notes_mopsw_id
        ) AS doc_count
      FROM tbl_cabinet_notes_mopsw AS notes
      INNER JOIN mmt_division AS division ON notes.division = division.division_id
      INNER JOIN mmt_wings AS wings ON notes.wing = wings.wing_id
      INNER JOIN mmt_cabinet_mopsw_stage AS stage ON notes.stage_id = stage.mopsw_stage_id
      ${joinSql}
      WHERE 1 = 1
      ${whereSql}
      ORDER BY notes.stage_id;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getAllCabinetMopsw(req, res) {
  const conn = await pool;

  try {
    const request = conn.request();
    const { joinSql, whereSql } = applyDataScope(request, req.user, {
      strategy: "viaCreatedBy",
      alias: "notes",
    });

    const result = await request.query(`
      SELECT
        notes.*,
        division.division_name,
        wings.wing_name,
        stage.mopsw_stage_name,
        (
          SELECT COUNT(*)
          FROM tbl_cabinet_notes_mopsw_document
          WHERE mopsw_cabinet_id = notes.cabinet_notes_mopsw_id
        ) AS doc_count,
        CASE WHEN notes.pre_dcn_prepared_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS pre_dcn_prepared_op,
        CASE WHEN notes.pre_dcn_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS pre_dcn__approved_op,
        CASE WHEN notes.cirucalted_for_imc_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS cirucalted_for_imc_op,
        CASE WHEN notes.imc_comments_rec_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS imc_comments_rec_op,
        CASE WHEN notes.final_dcn_prepared_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS final_dcn_prepared_op,
        CASE WHEN notes.final_dcn_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS final_dcn_approved_op,
        CASE WHEN notes.dcmbeen_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS dcmbeen_approved_op,
        CASE WHEN notes.advance_copy_sent_to_pmo_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS advance_copy_sent_to_pmo_op,
        CASE WHEN notes.cabinet_approved_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS cabinet_approved_op,
        CASE WHEN notes.on_hold_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS on_hold_op,
        CASE WHEN notes.completed_date IS NOT NULL THEN 'Yes' ELSE 'No' END AS completed_op
      FROM tbl_cabinet_notes_mopsw AS notes
      INNER JOIN mmt_division AS division ON notes.division = division.division_id
      INNER JOIN mmt_wings AS wings ON notes.wing = wings.wing_id
      INNER JOIN mmt_cabinet_mopsw_stage AS stage ON notes.stage_id = stage.mopsw_stage_id
      ${joinSql}
      WHERE 1 = 1
      ${whereSql}
      ORDER BY notes.stage_id;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function createMopswCabinet(req, res) {
  const conn = await pool;
  const request = conn.request();
  const body = {
    ...req.body,
    userID: req.user?.userId ?? req.body.userID,
  };
  bindNoteFields(request, body);

  try {
    const result = await request.query(`
      INSERT INTO tbl_cabinet_notes_mopsw (
        stage_id, wing, division, subject,
        pre_dcn_prepared_date, pre_dcn_prepared_remarks,
        pre_dcn_approved_date, pre_dcn_approved_remarks,
        cirucalted_for_imc_date, cirucalted_for_imc_remarks,
        imc_comments_rec_date, imc_comments_rec_remarks,
        final_dcn_prepared_date, final_dcn_prepared_remarks,
        final_dcn_approved_date, final_dcn_approved_remarks,
        dcmbeen_approved_date, dcmbeen_approved_remarks,
        advance_copy_sent_to_pmo_date, advance_copy_sent_to_pmo_remarks,
        cabinet_approved_date, cabinet_approved_remarks,
        on_hold_date, on_hold_remarks,
        completed_date, completed_remarks,
        remarks, created_by, created_date, updated_date
      )
      OUTPUT INSERTED.cabinet_notes_mopsw_id
      VALUES (
        @selectedCabinetNotesStage, @wing, @division, @subject,
        @preliDcnPreparedDate, @preliDcnPreparedRemark,
        @preliDcnApprovedDate, @preliDcnApprovedRemark,
        @circulatedForImcDate, @circulatedForImcRemark,
        @imcCommentsRecDate, @imcCommentsRecRemark,
        @finalDcnPreparedDate, @finalDcnPreparedRemark,
        @finalDcnApprovedDate, @finalDcnApprovedRemark,
        @dcmbeenApprovedDate, @dcmbeenApprovedRemark,
        @advanceCopySentToPmoDate, @advanceCopySentToPmoRemark,
        @cabinetApprovedDate, @cabinetApprovedRemark,
        @onHoldDate, @onHoldRemark,
        @completedDate, @completedRemark,
        @remarks, @userID, GETDATE(), NULL
      )
    `);

    const cabinet_notes_mopsw_id = result.recordset[0].cabinet_notes_mopsw_id;
    res.status(201).json({ cabinet_notes_mopsw_id });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function editMopswCabinet(req, res) {
  const conn = await pool;
  const request = conn.request();
  const body = {
    ...req.body,
    userID: req.user?.userId ?? req.body.userID,
  };
  request.input("mopswCabinetID", body.mopswCabinetID);
  bindNoteFields(request, body);

  try {
    const result = await request.query(`
      UPDATE tbl_cabinet_notes_mopsw SET
        pre_dcn_prepared_date = @preliDcnPreparedDate,
        pre_dcn_prepared_remarks = @preliDcnPreparedRemark,
        pre_dcn_approved_date = @preliDcnApprovedDate,
        pre_dcn_approved_remarks = @preliDcnApprovedRemark,
        cirucalted_for_imc_date = @circulatedForImcDate,
        cirucalted_for_imc_remarks = @circulatedForImcRemark,
        imc_comments_rec_date = @imcCommentsRecDate,
        imc_comments_rec_remarks = @imcCommentsRecRemark,
        final_dcn_prepared_date = @finalDcnPreparedDate,
        final_dcn_prepared_remarks = @finalDcnPreparedRemark,
        final_dcn_approved_date = @finalDcnApprovedDate,
        final_dcn_approved_remarks = @finalDcnApprovedRemark,
        dcmbeen_approved_date = @dcmbeenApprovedDate,
        dcmbeen_approved_remarks = @dcmbeenApprovedRemark,
        advance_copy_sent_to_pmo_date = @advanceCopySentToPmoDate,
        advance_copy_sent_to_pmo_remarks = @advanceCopySentToPmoRemark,
        cabinet_approved_date = @cabinetApprovedDate,
        cabinet_approved_remarks = @cabinetApprovedRemark,
        on_hold_date = @onHoldDate,
        on_hold_remarks = @onHoldRemark,
        completed_date = @completedDate,
        completed_remarks = @completedRemark,
        remarks = @remarks,
        subject = @subject,
        wing = @wing,
        division = @division,
        updated_by = @userID,
        stage_id = @selectedCabinetNotesStage,
        updated_date = GETDATE()
      OUTPUT INSERTED.cabinet_notes_mopsw_id
      WHERE cabinet_notes_mopsw_id = @mopswCabinetID
    `);

    if (!result.recordset?.length) {
      return res.status(404).json({ message: "Cabinet note not found" });
    }

    res.status(201).json({
      cabinet_notes_mopsw_id: result.recordset[0].cabinet_notes_mopsw_id,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getUpdateMopswData(req, res) {
  const mopswCabinetID = req.params.mopswCabinetID;
  const conn = await pool;
  const request = conn.request();
  request.input("mopswCabinetID", mopswCabinetID);

  try {
    const { joinSql, whereSql } = applyDataScope(request, req.user, {
      strategy: "viaCreatedBy",
      alias: "notes",
    });
    const result = await request.query(`
      SELECT notes.*
      FROM tbl_cabinet_notes_mopsw AS notes
      ${joinSql}
      WHERE notes.cabinet_notes_mopsw_id = @mopswCabinetID
      ${whereSql}
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function createCabinetNotesMopswStage(req, res) {
  const cabinetNotesMopswID = req.body.cabinetNotesMopswID;
  const stage = req.body.selectedStage;

  const conn = await pool;
  const request = conn.request();
  request.input("cabinetNotesMopswID", cabinetNotesMopswID);
  request.input("stage", stage);

  try {
    const checkResult = await request.query(`
      SELECT COUNT(*) AS recordCount
      FROM tbl_cabinet_notes_mopsw_stage
      WHERE cabinet_notes_mopsw_id = @cabinetNotesMopswID
    `);

    if (checkResult.recordset[0].recordCount > 0) {
      await request.query(`
        UPDATE tbl_cabinet_notes_mopsw_stage
        SET stage_name = @stage
        WHERE cabinet_notes_mopsw_id = @cabinetNotesMopswID
      `);
    } else {
      await request.query(`
        INSERT INTO tbl_cabinet_notes_mopsw_stage (cabinet_notes_mopsw_id, stage_name)
        VALUES (@cabinetNotesMopswID, @stage);
      `);
    }
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getMopswDocument(req, res) {
  const mopswCabinetID = req.params.mopswCabinetID;
  const conn = await pool;
  const request = conn.request();
  request.input("mopswCabinetID", mopswCabinetID);

  try {
    const result = await request.query(`
      SELECT * FROM tbl_cabinet_notes_mopsw_document
      WHERE mopsw_cabinet_id = @mopswCabinetID;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function deleteCabinetNotesMopsw(req, res) {
  const mopswCabinetID = req.params.cabinet_notes_mopsw_id;
  const userID = req.user?.userId ?? req.params.userID;

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hourPart = String(now.getHours()).padStart(2, "0");
  const minutePart = String(now.getMinutes()).padStart(2, "0");
  const secondPart = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
  const logFolder = `./delete_log/cabinet_notes_mopsw`;
  const logFileName = `${logFolder}/deleted_cabinet_notes_mopsw_log_${timestamp}.txt`;

  const conn = await pool;
  const request = conn.request();
  request.input("mopswCabinetID", mopswCabinetID);

  try {
    const { joinSql, whereSql } = applyDataScope(request, req.user, {
      strategy: "viaCreatedBy",
      alias: "notes",
    });

    const result = await request.query(`
      SELECT notes.*
      FROM tbl_cabinet_notes_mopsw AS notes
      ${joinSql}
      WHERE notes.cabinet_notes_mopsw_id = @mopswCabinetID
      ${whereSql}
    `);

    if (!result.recordset?.length) {
      return res.status(404).send("Data not found");
    }

    const DocFileResult = await request.query(`
      SELECT cabinet_notes_mopsw_document
      FROM tbl_cabinet_notes_mopsw_document
      WHERE mopsw_cabinet_id = @mopswCabinetID
    `);
    const DocfileNamearray = DocFileResult.recordset.map(
      (record) => record.cabinet_notes_mopsw_document
    );

    fs.mkdirSync(logFolder, { recursive: true });

    let dbDocDeletions = 0;
    let fileSystemDeletions = 0;

    for (let i = 0; i < DocfileNamearray.length; i++) {
      const fileName = DocfileNamearray[i];
      const fileParam = `fileName${i}`;
      request.input(fileParam, fileName);

      const logMessage = `Deleting document '${fileName}' from tbl_cabinet_notes_mopsw_document...\n Deleted by userID -'${userID}'\n`;
      fs.appendFileSync(logFileName, logMessage);

      await request.query(`
        DELETE FROM tbl_cabinet_notes_mopsw_document
        WHERE cabinet_notes_mopsw_document = @${fileParam}
      `);
      dbDocDeletions++;

      const filePath = `./fileuploads/cabinet_notes_mopsw/${fileName}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        fileSystemDeletions++;
      }
    }

    const resultData = result.recordset[0];
    fs.appendFileSync(
      logFileName,
      `Deleting note '${JSON.stringify(resultData)}' from tbl_cabinet_notes_mopsw...\n Deleted by userID -'${userID}'\n`
    );

    const deleteResult = await request.query(`
      DELETE FROM tbl_cabinet_notes_mopsw
      WHERE cabinet_notes_mopsw_id = @mopswCabinetID
    `);

    if (deleteResult.rowsAffected[0] > 0) {
      return res
        .status(201)
        .send(
          `1 records deleted from the database and ${dbDocDeletions} Document deleted from the database` +
            (fileSystemDeletions ? ` (${fileSystemDeletions} files removed).` : ".")
        );
    }

    return res.status(404).send("No data found for deletion. Please Contact Administration");
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
}

export default {
  createMopswCabinet,
  getCabinetMopsw,
  getUpdateMopswData,
  editMopswCabinet,
  createCabinetNotesMopswStage,
  getMopswDocument,
  getAllCabinetMopsw,
  deleteCabinetNotesMopsw,
};
