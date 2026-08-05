import { pool } from "../../db.js";
import fs from 'fs';
import sql from 'mssql';
import { applyDataScope } from "../../middleware/dataScope.js";

function emptyToNull(value) {
  return value === "" || value === undefined ? null : value;
}

// Accepts Yes/No, 1/0, true/false (legacy HTML used 1/0).
function toBit(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;
  const n = String(value).trim().toLowerCase();
  if (n === "yes" || n === "1" || n === "true") return 1;
  if (n === "no" || n === "0" || n === "false") return 0;
  return null;
}

function normalizeWings(wings) {
  if (Array.isArray(wings)) return wings.filter(Boolean).join(",");
  if (wings == null) return "";
  return String(wings);
}

function bindIssueFields(request, body) {
  request.input("wing", body.wing);
  request.input("division", body.division);
  request.input("parliamentarySubject", body.parliamentarySubject);
  request.input("fileNumber", body.fileNumber);
  request.input("issueType", body.issueType);
  request.input("assuranceNumber", body.assuranceNumber);
  request.input("parliamentHouse", body.parliamentHouse);
  request.input("nameOfMP", body.nameOfMP);
  request.input("extensionSought", emptyToNull(body.extensionSought));
  request.input("received", sql.Bit, toBit(body.received));
  request.input("receivedDate", emptyToNull(body.receivedDate));
  request.input("commentSought", sql.Bit, toBit(body.commentSought));
  request.input("commentSoughtDate", emptyToNull(body.commentSoughtDate));
  request.input("wings", normalizeWings(body.wings));
  request.input("commentsReceived", sql.Bit, toBit(body.commentsReceived));
  request.input("commentsReceivedDate", emptyToNull(body.commentsReceivedDate));
  request.input("shipping", sql.Bit, toBit(body.shipping));
  request.input("shippingDate", emptyToNull(body.shippingDate));
  request.input("vigilance", sql.Bit, toBit(body.vigilance));
  request.input("vigilanceDate", emptyToNull(body.vigilanceDate));
  request.input("ports", sql.Bit, toBit(body.ports));
  request.input("portsDate", emptyToNull(body.portsDate));
  request.input("iwt", sql.Bit, toBit(body.iwt));
  request.input("iwtDate", emptyToNull(body.iwtDate));
  request.input("administration", sql.Bit, toBit(body.administration));
  request.input("administrationDate", emptyToNull(body.administrationDate));
  request.input("coordI", sql.Bit, toBit(body.coordI));
  request.input("coordIDate", emptyToNull(body.coordIDate));
  request.input("coordII", sql.Bit, toBit(body.coordII));
  request.input("coordIIDate", emptyToNull(body.coordIIDate));
  request.input("dgll", sql.Bit, toBit(body.dgll));
  request.input("dgllDate", emptyToNull(body.dgllDate));
  request.input("development", sql.Bit, toBit(body.development));
  request.input("developmentDate", emptyToNull(body.developmentDate));
  request.input("finance", sql.Bit, toBit(body.finance));
  request.input("financeDate", emptyToNull(body.financeDate));
  request.input("sagarmala", sql.Bit, toBit(body.sagarmala));
  request.input("sagarmalaDate", emptyToNull(body.sagarmalaDate));
  request.input("extensionTimeSought", sql.Bit, toBit(body.extensionTimeSought));
  request.input("extensionTimeSoughtDate", emptyToNull(body.extensionTimeSoughtDate));
  request.input("replySend", sql.Bit, toBit(body.replySend));
  request.input("replySendDate", emptyToNull(body.replySendDate));
  request.input("debatedInParliament", sql.Bit, toBit(body.debatedInParliament));
  request.input("debatedInParliamentDate", emptyToNull(body.debatedInParliamentDate));
  request.input("impReportFurnished", sql.Bit, toBit(body.impReportFurnished));
  request.input("impReportFurnishedDate", emptyToNull(body.impReportFurnishedDate));
  request.input("matterDisposed", sql.Bit, toBit(body.matterDisposed));
  request.input("matterDisposedDate", emptyToNull(body.matterDisposedDate));
  request.input("remarks", body.remarks);
  request.input("parlia_stage_id", body.parlia_stage_id);
  request.input("userID", body.userID ?? null);
}

async function getParliamentaryIssue(req, res) {
  const conn = await pool;

  try {
    const request = conn.request();
    const { joinSql, whereSql } = applyDataScope(request, req.user, { strategy: "viaCreatedBy", alias: "tpi" });

    const result = await request.query(`
      SELECT
        tpi.*,
        mps.parlia_stage_name,
        mps.parlia_issue_type,
        mmt_division.division_name,
        mmt_wings.wing_name
      FROM tbl_parliamentary_issue AS tpi
      INNER JOIN mmt_parliamentary_stage AS mps
        ON tpi.stage_id = mps.parlia_stage_id
      INNER JOIN mmt_division ON tpi.division = mmt_division.division_id
      INNER JOIN mmt_wings ON tpi.wing = mmt_wings.wing_id
      ${joinSql}
      WHERE 1 = 1
      ${whereSql}
      ORDER BY tpi.stage_id;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function createParliamentaryIssue(req, res) {
  const conn = await pool;
  const request = conn.request();
  const body = {
    ...req.body,
    userID: req.user?.userId ?? req.body.userID,
  };
  bindIssueFields(request, body);

  try {
    const result = await request.query(`
      INSERT INTO tbl_parliamentary_issue (
        wing, division, subject, file_number, parliamentary_issue_type, assurance_number,
        parliament_house, name_of_mp, extension_sought_date, received_at_ministry,
        received_at_ministry_date, comment_soughted, comment_soughted_date, comment_soughted_wings,
        comment_received, comment_received_date, shipping, shipping_date, vigilance, vigilance_date,
        ports, ports_date, iwt, iwt_date, administration, administration_date, coord_I, coord_I_date,
        coord_II, coord_II_date, dgll_parliament_and_trw, dgll_parliament_and_trw_date, development,
        development_date, finance, finance_date, sagarmala, sagarmala_date, extension_time_soughted,
        extension_time_soughted_date, reply_send, reply_send_date, debated_in_parliament,
        debated_in_parliament_date, implementation_report_furnished,
        implementation_report_furnished_date, matter_disposed, matter_disposed_date, remarks,
        stage_id, created_by
      )
      OUTPUT INSERTED.parliamentary_issue_id
      VALUES (
        @wing, @division, @parliamentarySubject, @fileNumber, @issueType, @assuranceNumber,
        @parliamentHouse, @nameOfMP, @extensionSought, @received, @receivedDate, @commentSought,
        @commentSoughtDate, @wings, @commentsReceived, @commentsReceivedDate, @shipping, @shippingDate,
        @vigilance, @vigilanceDate, @ports, @portsDate, @iwt, @iwtDate, @administration,
        @administrationDate, @coordI, @coordIDate, @coordII, @coordIIDate, @dgll, @dgllDate,
        @development, @developmentDate, @finance, @financeDate, @sagarmala, @sagarmalaDate,
        @extensionTimeSought, @extensionTimeSoughtDate, @replySend, @replySendDate,
        @debatedInParliament, @debatedInParliamentDate, @impReportFurnished, @impReportFurnishedDate,
        @matterDisposed, @matterDisposedDate, @remarks, @parlia_stage_id, @userID
      )
    `);
    const parliamentary_issue_id = result.recordset[0].parliamentary_issue_id;
    res.status(201).json({ parliamentary_issue_id });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function editParliamentaryIssue(req, res) {
  const conn = await pool;
  const request = conn.request();
  const body = {
    ...req.body,
    userID: req.user?.userId ?? req.body.userID,
  };
  request.input("parliamentaryIssueID", body.parliamentaryIssueID);
  bindIssueFields(request, body);

  try {
    const result = await request.query(`
      UPDATE tbl_parliamentary_issue SET
        wing = @wing,
        division = @division,
        subject = @parliamentarySubject,
        file_number = @fileNumber,
        parliamentary_issue_type = @issueType,
        assurance_number = @assuranceNumber,
        parliament_house = @parliamentHouse,
        name_of_mp = @nameOfMP,
        extension_sought_date = @extensionSought,
        received_at_ministry = @received,
        received_at_ministry_date = @receivedDate,
        comment_soughted = @commentSought,
        comment_soughted_date = @commentSoughtDate,
        comment_soughted_wings = @wings,
        comment_received = @commentsReceived,
        comment_received_date = @commentsReceivedDate,
        shipping = @shipping,
        shipping_date = @shippingDate,
        vigilance = @vigilance,
        vigilance_date = @vigilanceDate,
        ports = @ports,
        ports_date = @portsDate,
        iwt = @iwt,
        iwt_date = @iwtDate,
        administration = @administration,
        administration_date = @administrationDate,
        coord_I = @coordI,
        coord_I_date = @coordIDate,
        coord_II = @coordII,
        coord_II_date = @coordIIDate,
        dgll_parliament_and_trw = @dgll,
        dgll_parliament_and_trw_date = @dgllDate,
        development = @development,
        development_date = @developmentDate,
        finance = @finance,
        finance_date = @financeDate,
        sagarmala = @sagarmala,
        sagarmala_date = @sagarmalaDate,
        extension_time_soughted = @extensionTimeSought,
        extension_time_soughted_date = @extensionTimeSoughtDate,
        reply_send = @replySend,
        reply_send_date = @replySendDate,
        debated_in_parliament = @debatedInParliament,
        debated_in_parliament_date = @debatedInParliamentDate,
        implementation_report_furnished = @impReportFurnished,
        implementation_report_furnished_date = @impReportFurnishedDate,
        matter_disposed = @matterDisposed,
        matter_disposed_date = @matterDisposedDate,
        remarks = @remarks,
        stage_id = @parlia_stage_id,
        updated_by = @userID,
        updated_date = getDate()
      OUTPUT INSERTED.parliamentary_issue_id
      WHERE parliamentary_issue_id = @parliamentaryIssueID
    `);

    if (!result.recordset?.length) {
      return res.status(404).json({ message: "Parliamentary issue not found" });
    }

    res.status(201).json({
      parliamentary_issue_id: result.recordset[0].parliamentary_issue_id,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getUpdateParliamentaryIssueData(req, res) {
  const parliamentaryIssueID = req.params.parliamentaryIssueID;
  const conn = await pool;
  const request = conn.request();
  request.input("parliamentaryIssueID", parliamentaryIssueID);

  try {
    const { joinSql, whereSql } = applyDataScope(request, req.user, { strategy: "viaCreatedBy", alias: "tpi" });
    const result = await request.query(`
      SELECT tpi.*
      FROM tbl_parliamentary_issue tpi
      ${joinSql}
      WHERE tpi.parliamentary_issue_id = @parliamentaryIssueID
      ${whereSql}
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function deleteParliamentaryIssue(req, res) {
  const parliamentaryIssueID = req.params.parliamentaryIssueID;
  const userID = req.user?.userId ?? req.params.userID;

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hourPart = String(now.getHours()).padStart(2, "0");
  const minutePart = String(now.getMinutes()).padStart(2, "0");
  const secondPart = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
  const logFolder = `./delete_log/Parlimentry_Issue`;
  const logFileName = `${logFolder}/deleted_Parlimentry_Issue_log_${timestamp}.txt`;

  const conn = await pool;
  const request = conn.request();
  request.input("parliamentaryIssueID", parliamentaryIssueID);

  try {
    const { joinSql, whereSql } = applyDataScope(request, req.user, { strategy: "viaCreatedBy", alias: "tpi" });
    const dataToDelete = await request.query(`
      SELECT tpi.*
      FROM tbl_parliamentary_issue tpi
      ${joinSql}
      WHERE tpi.parliamentary_issue_id = @parliamentaryIssueID
      ${whereSql}
    `);

    if (!dataToDelete.recordset?.length) {
      return res.status(404).send("Data not found");
    }

    const dataJSON = JSON.stringify(dataToDelete.recordset[0]);
    const result = await request.query(`
      DELETE FROM tbl_parliamentary_issue
      WHERE parliamentary_issue_id = @parliamentaryIssueID
    `);

    if (result.rowsAffected[0] > 0) {
      const logMessage = `User '${userID}' deleted Parliamentary Issue data with Data ID '${parliamentaryIssueID}'. Deleted Data: ${dataJSON}\n`;
      fs.mkdirSync(logFolder, { recursive: true });
      fs.appendFile(logFileName, logMessage, (err) => {
        if (err) console.error("Error writing to delete log:", err);
      });
      return res.sendStatus(201);
    }

    return res.status(404).send("Data not found");
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

export default {
  getParliamentaryIssue,
  createParliamentaryIssue,
  editParliamentaryIssue,
  getUpdateParliamentaryIssueData,
  deleteParliamentaryIssue,
};
