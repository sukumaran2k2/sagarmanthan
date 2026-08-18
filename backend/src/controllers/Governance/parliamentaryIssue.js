import { pool } from "../../db.js";
import fs from 'fs';
import sql from 'mssql';
import { applyDataScope } from "../../middleware/dataScope.js";

function emptyToNull(value) {
  return value === "" || value === undefined ? null : value;
}

function normalizeWings(wings) {
  if (Array.isArray(wings)) return wings.filter(Boolean).join(",");
  if (wings == null) return "";
  return String(wings);
}

const LIST_FROM_SQL = `
  FROM tbl_parliamentary_issue AS tpi
  INNER JOIN mmt_parliamentary_stage AS mps
    ON tpi.stage_id = mps.parlia_stage_id
  INNER JOIN mmt_division ON tpi.division = mmt_division.division_id
  INNER JOIN mmt_wings ON tpi.wing = mmt_wings.wing_id
`;

const COMPLETED_SQL = `(
  LOWER(mps.parlia_stage_name) LIKE N'%matter disposed%'
  OR (
    (LOWER(mps.parlia_stage_name) LIKE N'%reply%' OR LOWER(mps.parlia_stage_name) LIKE N'%replay%')
    AND (LOWER(mps.parlia_stage_name) LIKE N'%sent%' OR LOWER(mps.parlia_stage_name) LIKE N'%send%')
  )
  OR LOWER(LTRIM(RTRIM(mps.parlia_stage_name))) = N'completed'
  OR tpi.matter_disposed_date IS NOT NULL
  OR tpi.reply_send_date IS NOT NULL
)`;

function parsePositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function isAllParam(value) {
  return value == null || value === "" || String(value).toLowerCase() === "all";
}

function escapeLike(value) {
  return String(value).replace(/[%_[\]]/g, (ch) => `[${ch}]`);
}

// `mssql` type helpers differ slightly between versions/builds.
// In your runtime, `sql.NVarChar` exists but is not callable.
function nvarcharType(length) {
  const t = sql?.NVarChar;
  if (!t) return undefined;
  return typeof t === 'function' ? t(length) : t;
}

function bindListFilters(request, query, { includeStatus = false } = {}) {
  let sql = "";

  if (!isAllParam(query.wingId)) {
    const wingId = Number.parseInt(query.wingId, 10);
    if (Number.isFinite(wingId)) {
      request.input("wingId", sql.Int, wingId);
      sql += " AND tpi.wing = @wingId";
    }
  }

  if (!isAllParam(query.divisionId)) {
    const divisionId = Number.parseInt(query.divisionId, 10);
    if (Number.isFinite(divisionId)) {
      request.input("divisionId", sql.Int, divisionId);
      sql += " AND tpi.division = @divisionId";
    }
  }

  if (!isAllParam(query.issueType)) {
    request.input("issueType", nvarcharType(200), String(query.issueType).trim());
    sql += " AND tpi.parliamentary_issue_type = @issueType";
  }

  const search = String(query.search || "").trim();
  if (search) {
    request.input("search", nvarcharType(300), `%${escapeLike(search)}%`);
    sql += ` AND (
      tpi.subject LIKE @search
      OR tpi.remarks LIKE @search
      OR tpi.received_at_ministry_remarks LIKE @search
      OR tpi.comment_soughted_remarks LIKE @search
      OR tpi.comment_received_remarks LIKE @search
      OR tpi.matter_disposed_remarks LIKE @search
      OR tpi.reply_send_remarks LIKE @search
      OR mmt_wings.wing_name LIKE @search
      OR mmt_division.division_name LIKE @search
      OR tpi.parliamentary_issue_type LIKE @search
      OR mps.parlia_stage_name LIKE @search
    )`;
  }

  if (includeStatus && !isAllParam(query.status)) {
    request.input("status", nvarcharType(200), String(query.status).trim());
    sql += " AND mps.parlia_stage_name = @status";
  }

  return sql;
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
  request.input("receivedDate", emptyToNull(body.receivedDate));
  request.input("receivedRemark", emptyToNull(body.receivedRemark));
  request.input("commentSoughtDate", emptyToNull(body.commentSoughtDate));
  request.input("commentSoughtRemark", emptyToNull(body.commentSoughtRemark));
  request.input("wings", normalizeWings(body.wings));
  request.input("commentsReceivedDate", emptyToNull(body.commentsReceivedDate));
  request.input("commentsReceivedRemark", emptyToNull(body.commentsReceivedRemark));
  request.input("shippingDate", emptyToNull(body.shippingDate));
  request.input("shippingRemark", emptyToNull(body.shippingRemark));
  request.input("vigilanceDate", emptyToNull(body.vigilanceDate));
  request.input("vigilanceRemark", emptyToNull(body.vigilanceRemark));
  request.input("portsDate", emptyToNull(body.portsDate));
  request.input("portsRemark", emptyToNull(body.portsRemark));
  request.input("iwtDate", emptyToNull(body.iwtDate));
  request.input("iwtRemark", emptyToNull(body.iwtRemark));
  request.input("administrationDate", emptyToNull(body.administrationDate));
  request.input("administrationRemark", emptyToNull(body.administrationRemark));
  request.input("coordIDate", emptyToNull(body.coordIDate));
  request.input("coordIRemark", emptyToNull(body.coordIRemark));
  request.input("coordIIDate", emptyToNull(body.coordIIDate));
  request.input("coordIIRemark", emptyToNull(body.coordIIRemark));
  request.input("dgllDate", emptyToNull(body.dgllDate));
  request.input("dgllRemark", emptyToNull(body.dgllRemark));
  request.input("developmentDate", emptyToNull(body.developmentDate));
  request.input("developmentRemark", emptyToNull(body.developmentRemark));
  request.input("financeDate", emptyToNull(body.financeDate));
  request.input("financeRemark", emptyToNull(body.financeRemark));
  request.input("sagarmalaDate", emptyToNull(body.sagarmalaDate));
  request.input("sagarmalaRemark", emptyToNull(body.sagarmalaRemark));
  request.input("extensionTimeSoughtDate", emptyToNull(body.extensionTimeSoughtDate));
  request.input("extensionTimeSoughtRemark", emptyToNull(body.extensionTimeSoughtRemark));
  request.input("replySendDate", emptyToNull(body.replySendDate));
  request.input("replySendRemark", emptyToNull(body.replySendRemark));
  request.input("debatedInParliamentDate", emptyToNull(body.debatedInParliamentDate));
  request.input("debatedInParliamentRemark", emptyToNull(body.debatedInParliamentRemark));
  request.input("impReportFurnishedDate", emptyToNull(body.impReportFurnishedDate));
  request.input("impReportFurnishedRemark", emptyToNull(body.impReportFurnishedRemark));
  request.input("matterDisposedDate", emptyToNull(body.matterDisposedDate));
  request.input("matterDisposedRemark", emptyToNull(body.matterDisposedRemark));
  request.input("parlia_stage_id", body.parlia_stage_id);
  request.input("userID", body.userID ?? null);
}

async function getParliamentaryIssue(req, res) {
  const conn = await pool;

  try {
    const page = parsePositiveInt(req.query.page, 1, 1);
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);
    const offset = (page - 1) * limit;
    const category =
      String(req.query.category || "active").toLowerCase() === "completed"
        ? "completed"
        : "active";

    const countRequest = conn.request();
    const pageRequest = conn.request();
    const { joinSql, whereSql } = applyDataScope(countRequest, req.user, {
      strategy: "viaCreatedBy",
      alias: "tpi",
    });
    applyDataScope(pageRequest, req.user, { strategy: "viaCreatedBy", alias: "tpi" });

    const sharedFilter = bindListFilters(countRequest, req.query);
    bindListFilters(pageRequest, req.query, { includeStatus: category === "active" });

    if (category === "active" && !isAllParam(req.query.status)) {
      countRequest.input("status", nvarcharType(200), String(req.query.status).trim());
    }

    const categoryFilter =
      category === "completed"
        ? ` AND ${COMPLETED_SQL}`
        : ` AND NOT ${COMPLETED_SQL}`;
    const statusFilter =
      category === "active" && !isAllParam(req.query.status)
        ? " AND mps.parlia_stage_name = @status"
        : "";
    const pageMatchSql = `${category === "completed" ? COMPLETED_SQL : `NOT ${COMPLETED_SQL}`}${statusFilter}`;

    pageRequest.input("offset", sql.Int, offset);
    pageRequest.input("limit", sql.Int, limit);

    const [countResult, pageResult] = await Promise.all([
      countRequest.query(`
        SELECT
          SUM(CASE WHEN ${COMPLETED_SQL} THEN 1 ELSE 0 END) AS completed_count,
          SUM(CASE WHEN NOT ${COMPLETED_SQL} THEN 1 ELSE 0 END) AS active_count,
          SUM(CASE WHEN ${pageMatchSql} THEN 1 ELSE 0 END) AS page_total
        ${LIST_FROM_SQL}
        ${joinSql}
        WHERE 1 = 1
        ${whereSql}
        ${sharedFilter}
      `),
      pageRequest.query(`
        SELECT
          tpi.parliamentary_issue_id,
          tpi.subject,
          tpi.wing,
          tpi.division,
          tpi.parliamentary_issue_type,
          tpi.remarks,
          tpi.received_at_ministry_remarks,
          tpi.debated_in_parliament_remarks,
          tpi.comment_soughted_remarks,
          tpi.comment_received_remarks,
          tpi.shipping_remarks,
          tpi.vigilance_remarks,
          tpi.ports_remarks,
          tpi.iwt_remarks,
          tpi.administration_remarks,
          tpi.coord_I_remarks,
          tpi.coord_II_remarks,
          tpi.dgll_parliament_and_trw_remarks,
          tpi.development_remarks,
          tpi.finance_remarks,
          tpi.sagarmala_remarks,
          tpi.extension_time_soughted_remarks,
          tpi.implementation_report_furnished_remarks,
          tpi.matter_disposed_remarks,
          tpi.reply_send_remarks,
          tpi.created_by,
          tpi.created_date,
          tpi.updated_date,
          tpi.matter_disposed_date,
          tpi.reply_send_date,
          mps.parlia_stage_name,
          mmt_division.division_name,
          mmt_wings.wing_name
        ${LIST_FROM_SQL}
        ${joinSql}
        WHERE 1 = 1
        ${whereSql}
        ${sharedFilter}
        ${categoryFilter}
        ${statusFilter}
        ORDER BY tpi.stage_id, tpi.parliamentary_issue_id
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY;
      `),
    ]);

    const countRow = countResult.recordset?.[0] || {};
    const activeCount = Number(countRow.active_count) || 0;
    const completedCount = Number(countRow.completed_count) || 0;
    const total = Number(countRow.page_total) || 0;
    const rows = pageResult.recordset || [];

    res.json({
      data: rows,
      counts: { active: activeCount, completed: completedCount },
      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
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
        parliament_house, name_of_mp, extension_sought_date, received_at_ministry_date,
        received_at_ministry_remarks, debated_in_parliament_date, debated_in_parliament_remarks,
        comment_soughted_date, comment_soughted_remarks, comment_soughted_wings,
        comment_received_date, comment_received_remarks, shipping_date, shipping_remarks,
        vigilance_date, vigilance_remarks, ports_date, ports_remarks, iwt_date, iwt_remarks,
        administration_date, administration_remarks, coord_I_date, coord_I_remarks,
        coord_II_date, coord_II_remarks, dgll_parliament_and_trw_date, dgll_parliament_and_trw_remarks,
        development_date, development_remarks, finance_date, finance_remarks,
        sagarmala_date, sagarmala_remarks, extension_time_soughted_date, extension_time_soughted_remarks,
        reply_send_date, reply_send_remarks, implementation_report_furnished_date,
        implementation_report_furnished_remarks, matter_disposed_date, matter_disposed_remarks,
        stage_id, created_by
      )
      OUTPUT INSERTED.parliamentary_issue_id
      VALUES (
        @wing, @division, @parliamentarySubject, @fileNumber, @issueType, @assuranceNumber,
        @parliamentHouse, @nameOfMP, @extensionSought, @receivedDate, @receivedRemark,
        @debatedInParliamentDate, @debatedInParliamentRemark, @commentSoughtDate, @commentSoughtRemark,
        @wings, @commentsReceivedDate, @commentsReceivedRemark, @shippingDate, @shippingRemark,
        @vigilanceDate, @vigilanceRemark, @portsDate, @portsRemark, @iwtDate, @iwtRemark,
        @administrationDate, @administrationRemark, @coordIDate, @coordIRemark, @coordIIDate, @coordIIRemark,
        @dgllDate, @dgllRemark, @developmentDate, @developmentRemark, @financeDate, @financeRemark,
        @sagarmalaDate, @sagarmalaRemark, @extensionTimeSoughtDate, @extensionTimeSoughtRemark,
        @replySendDate, @replySendRemark, @impReportFurnishedDate, @impReportFurnishedRemark,
        @matterDisposedDate, @matterDisposedRemark, @parlia_stage_id, @userID
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
        received_at_ministry_date = @receivedDate,
        received_at_ministry_remarks = @receivedRemark,
        debated_in_parliament_date = @debatedInParliamentDate,
        debated_in_parliament_remarks = @debatedInParliamentRemark,
        comment_soughted_date = @commentSoughtDate,
        comment_soughted_remarks = @commentSoughtRemark,
        comment_soughted_wings = @wings,
        comment_received_date = @commentsReceivedDate,
        comment_received_remarks = @commentsReceivedRemark,
        shipping_date = @shippingDate,
        shipping_remarks = @shippingRemark,
        vigilance_date = @vigilanceDate,
        vigilance_remarks = @vigilanceRemark,
        ports_date = @portsDate,
        ports_remarks = @portsRemark,
        iwt_date = @iwtDate,
        iwt_remarks = @iwtRemark,
        administration_date = @administrationDate,
        administration_remarks = @administrationRemark,
        coord_I_date = @coordIDate,
        coord_I_remarks = @coordIRemark,
        coord_II_date = @coordIIDate,
        coord_II_remarks = @coordIIRemark,
        dgll_parliament_and_trw_date = @dgllDate,
        dgll_parliament_and_trw_remarks = @dgllRemark,
        development_date = @developmentDate,
        development_remarks = @developmentRemark,
        finance_date = @financeDate,
        finance_remarks = @financeRemark,
        sagarmala_date = @sagarmalaDate,
        sagarmala_remarks = @sagarmalaRemark,
        extension_time_soughted_date = @extensionTimeSoughtDate,
        extension_time_soughted_remarks = @extensionTimeSoughtRemark,
        reply_send_date = @replySendDate,
        reply_send_remarks = @replySendRemark,
        implementation_report_furnished_date = @impReportFurnishedDate,
        implementation_report_furnished_remarks = @impReportFurnishedRemark,
        matter_disposed_date = @matterDisposedDate,
        matter_disposed_remarks = @matterDisposedRemark,
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
