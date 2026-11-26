import { pool } from "../../db.js";
import fs from 'fs';
import sql from 'mssql';
import { applyDataScope } from "../../middleware/dataScope.js";

function emptyToNull(value) {
  return value === "" || value === undefined ? null : value;
}

// Positive integer id from the URL or body, or null (QC PI-BE-07)
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// created_by / updated_by and the delete log always name the signed-in user, never a value
// from the request (QC PI-BE-04). null means no usable login: answer 401.
function signedInUserId(req) {
  const id = Number(req.user?.userId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function serverError(res, action, err) {
  console.error(`[ParliamentaryIssue] ${action}:`, err);
  return res.status(500).json({ error: `Could not ${action}. Please try again.` });
}

// ---------- request validation (QC PI-BE-06) ----------

// Text fields and their column sizes in tbl_parliamentary_issue
const TEXT_LIMITS = [
  ["parliamentarySubject", "Subject", 256],
  ["fileNumber", "File number", 50],
  ["parliamentHouse", "Parliament house", 50],
  ["nameOfMP", "Name of the MP(s)", 256],
];

// Every date the form sends; each is '' (not entered) or YYYY-MM-DD
const DATE_FIELDS = [
  ["extensionSought", "Extension sought up to"],
  ["receivedDate", "Received at Ministry"],
  ["commentSoughtDate", "Comments sought"],
  ["commentsReceivedDate", "Comments received"],
  ["shippingDate", "Shipping"],
  ["vigilanceDate", "Vigilance"],
  ["portsDate", "Ports"],
  ["iwtDate", "IWT"],
  ["administrationDate", "Administration"],
  ["coordIDate", "Coord-I"],
  ["coordIIDate", "Coord-II"],
  ["dgllDate", "DGLL, Parliament & TRW"],
  ["developmentDate", "Development"],
  ["financeDate", "Finance"],
  ["sagarmalaDate", "Sagarmala"],
  ["extensionTimeSoughtDate", "Extension of time sought"],
  ["replySendDate", "Reply sent"],
  ["debatedInParliamentDate", "Debated in Parliament"],
  ["impReportFurnishedDate", "Implementation report furnished"],
  ["matterDisposedDate", "Matter disposed"],
];

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

function isValidDate(value) {
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Checks what the form sends against the column sizes and the masters. It accepts everything
// the form allows today: the subject is optional (as in the form), and the division is only
// checked to exist, not to belong to the wing, so older issues can still be saved.
// Sends the 400 itself and returns false when invalid.
async function validateIssueBody(conn, body, res) {
  const errors = [];

  const wing = parseId(body.wing);
  const division = parseId(body.division);
  if (!wing) errors.push("Please select a valid wing.");
  if (!division) errors.push("Please select a valid division.");

  const issueType = isBlank(body.issueType) ? "" : String(body.issueType).trim();
  if (!issueType) errors.push("Please select the issue type.");
  else if (issueType.length > 256) errors.push("The issue type is not valid.");

  for (const [field, label, max] of TEXT_LIMITS) {
    if (!isBlank(body[field]) && String(body[field]).length > max) {
      errors.push(`${label} cannot exceed ${max} characters.`);
    }
  }
  if (normalizeWings(body.wings).length > 256) errors.push("Too many wings selected.");

  // assurance_number is an int column; the form field is free text
  if (!isBlank(body.assuranceNumber)) {
    const text = String(body.assuranceNumber).trim();
    if (!/^\d+$/.test(text) || Number(text) > 2147483647) {
      errors.push("Assurance number must be a whole number.");
    }
  }

  for (const [field, label] of DATE_FIELDS) {
    if (!isBlank(body[field]) && !isValidDate(body[field])) {
      errors.push(`${label} date is not a valid date.`);
    }
  }

  const stageGiven = !isBlank(body.parlia_stage_id);
  const stage = Number(body.parlia_stage_id);
  if (stageGiven && (!Number.isInteger(stage) || stage < 0)) errors.push("The stage is not valid.");

  // Wing, division, issue type and stage must be real rows in their masters
  if (!errors.length) {
    const check = await conn
      .request()
      .input("wing", sql.Int, wing)
      .input("division", sql.Int, division)
      .input("issueType", nvarcharType(256), issueType)
      .input("stage", sql.Int, stageGiven ? stage : null)
      .query(`
        SELECT
          (SELECT COUNT(1) FROM mmt_wings WHERE wing_id = @wing) AS wing_ok,
          (SELECT COUNT(1) FROM mmt_division WHERE division_id = @division) AS division_ok,
          (SELECT COUNT(1) FROM mmt_parliamentary_stage
             WHERE LOWER(LTRIM(RTRIM(parlia_issue_type))) = LOWER(LTRIM(RTRIM(@issueType)))) AS type_ok,
          (SELECT COUNT(1) FROM mmt_parliamentary_stage WHERE parlia_stage_id = @stage) AS stage_ok
      `);
    const row = check.recordset[0] || {};
    if (!row.wing_ok) errors.push("Please select a valid wing.");
    if (!row.division_ok) errors.push("Please select a valid division.");
    if (!row.type_ok) errors.push("The issue type is not valid.");
    if (stageGiven && !row.stage_ok) errors.push("The stage is not valid.");
  }

  if (errors.length) {
    res.status(400).json({ error: errors[0], errors });
    return false;
  }
  return true;
}

function normalizeWings(wings) {
  if (Array.isArray(wings)) return wings.filter(Boolean).join(",");
  if (wings == null) return "";
  return String(wings);
}

// LEFT JOINs, as in the old portal: an issue with no stage or no division (older data) must
// still be listed, otherwise it cannot be opened and corrected. Such issues land in Active.
const LIST_FROM_SQL = `
  FROM tbl_parliamentary_issue AS tpi
  LEFT JOIN mmt_parliamentary_stage AS mps
    ON tpi.stage_id = mps.parlia_stage_id
  LEFT JOIN mmt_division ON tpi.division = mmt_division.division_id
  LEFT JOIN mmt_wings ON tpi.wing = mmt_wings.wing_id
`;

// ISNULL: an issue with no stage has a NULL stage name, and NOT (NULL LIKE ...) is not true,
// so without it that issue would match neither tab
const STAGE_NAME_SQL = `LOWER(ISNULL(mps.parlia_stage_name, N''))`;

// A stage name that means the issue is finished: Matter Disposed, Reply sent, Completed.
// nameSql is a lower-cased, non-NULL stage name expression.
export const completedStageNameSql = (nameSql) => `(
  ${nameSql} LIKE N'%matter disposed%'
  OR (
    (${nameSql} LIKE N'%reply%' OR ${nameSql} LIKE N'%replay%')
    AND (${nameSql} LIKE N'%sent%' OR ${nameSql} LIKE N'%send%')
  )
  OR LTRIM(RTRIM(${nameSql})) = N'completed'
)`;

// Completed issues (the Completed tab); every other issue is Active, including one with no
// stage. Shared with the dashboard so both count the same issues. Aliases: tpi, mps.
export const COMPLETED_SQL = `(
  ${completedStageNameSql(STAGE_NAME_SQL)}
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

function bindListFilters(request, query, { includeStatus = false, includeIssueType = true } = {}) {
  let filterSql = "";

  if (!isAllParam(query.wingId)) {
    const wingId = Number.parseInt(query.wingId, 10);
    if (Number.isFinite(wingId)) {
      request.input("wingId", sql.Int, wingId);
      filterSql += " AND tpi.wing = @wingId";
    }
  }

  if (!isAllParam(query.divisionId)) {
    const divisionId = Number.parseInt(query.divisionId, 10);
    if (Number.isFinite(divisionId)) {
      request.input("divisionId", sql.Int, divisionId);
      filterSql += " AND tpi.division = @divisionId";
    }
  }

  if (includeIssueType && !isAllParam(query.issueType)) {
    request.input("issueType", nvarcharType(200), String(query.issueType).trim());
    filterSql += " AND tpi.parliamentary_issue_type = @issueType";
  }

  const search = String(query.search || "").trim();
  if (search) {
    request.input("search", nvarcharType(300), `%${escapeLike(search)}%`);
    filterSql += ` AND (
      tpi.subject LIKE @search
      OR tpi.remarks LIKE @search
      OR mmt_wings.wing_name LIKE @search
      OR mmt_division.division_name LIKE @search
      OR tpi.parliamentary_issue_type LIKE @search
      OR mps.parlia_stage_name LIKE @search
    )`;
  }

  if (includeStatus && !isAllParam(query.status)) {
    request.input("status", nvarcharType(200), String(query.status).trim());
    filterSql += " AND mps.parlia_stage_name = @status";
  }

  return filterSql;
}

function bindIssueFields(request, body) {
  request.input("wing", body.wing);
  request.input("division", body.division);
  request.input("parliamentarySubject", body.parliamentarySubject);
  request.input("fileNumber", body.fileNumber);
  request.input("issueType", body.issueType);
  request.input("remarks", emptyToNull(body.remarks));
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

    // Tab counts: each tab's number is what that tab shows when clicked. Switching tab clears
    // the status filter (and the issue type, going to Completed), so the other tab leaves those out.
    const sharedFilter = bindListFilters(countRequest, req.query, { includeIssueType: false });
    bindListFilters(pageRequest, req.query, { includeStatus: category === "active" });

    let issueTypeFilter = "";
    if (!isAllParam(req.query.issueType)) {
      countRequest.input("issueType", nvarcharType(200), String(req.query.issueType).trim());
      issueTypeFilter = " AND tpi.parliamentary_issue_type = @issueType";
    }
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
    const activeMatchSql = `NOT ${COMPLETED_SQL}${issueTypeFilter}${statusFilter}`;
    const completedMatchSql = `${COMPLETED_SQL}${category === "completed" ? issueTypeFilter : ""}`;
    const pageMatchSql = category === "completed" ? completedMatchSql : activeMatchSql;

    pageRequest.input("offset", sql.Int, offset);
    pageRequest.input("limit", sql.Int, limit);

    const [countResult, pageResult] = await Promise.all([
      countRequest.query(`
        SELECT
          SUM(CASE WHEN ${completedMatchSql} THEN 1 ELSE 0 END) AS completed_count,
          SUM(CASE WHEN ${activeMatchSql} THEN 1 ELSE 0 END) AS active_count,
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
    return serverError(res, "load parliamentary issues", err);
  }
}

async function createParliamentaryIssue(req, res) {
  const userID = signedInUserId(req);
  if (!userID) return res.status(401).json({ error: "Unauthorized." });

  try {
    const conn = await pool;
    // created_by is the signed-in user, never the userID the form sends
    const body = { ...req.body, userID };
    if (!(await validateIssueBody(conn, body, res))) return;

    const request = conn.request();
    bindIssueFields(request, body);

    const result = await request.query(`
      INSERT INTO tbl_parliamentary_issue (
        wing, division, subject, file_number, parliamentary_issue_type, remarks, assurance_number,
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
        @wing, @division, @parliamentarySubject, @fileNumber, @issueType, @remarks, @assuranceNumber,
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
    return serverError(res, "save the parliamentary issue", err);
  }
}

async function editParliamentaryIssue(req, res) {
  // updated_by is the signed-in user, never a value from the request
  const userID = signedInUserId(req);
  if (!userID) return res.status(401).json({ error: "Unauthorized." });

  const parliamentaryIssueID = parseId(req.body.parliamentaryIssueID);
  if (!parliamentaryIssueID) return res.status(400).json({ error: "Invalid parliamentary issue." });

  try {
    const conn = await pool;
    const body = { ...req.body, userID };
    if (!(await validateIssueBody(conn, body, res))) return;

    const request = conn.request();
    request.input("parliamentaryIssueID", sql.Int, parliamentaryIssueID);
    bindIssueFields(request, body);

    // Only an issue inside the caller's data scope can be updated (QC PI-BE-01, fixed with
    // MOPSW-BE-01). An id outside it matches no row and is answered as "not found" below.
    const { joinSql, whereSql } = applyDataScope(request, req.user, { strategy: "viaCreatedBy", alias: "tpi" });
    const result = await request.query(`
      UPDATE tpi SET
        wing = @wing,
        division = @division,
        subject = @parliamentarySubject,
        file_number = @fileNumber,
        parliamentary_issue_type = @issueType,
        remarks = @remarks,
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
      FROM tbl_parliamentary_issue AS tpi
      ${joinSql}
      WHERE tpi.parliamentary_issue_id = @parliamentaryIssueID
      ${whereSql}
    `);

    if (!result.recordset?.length) {
      return res.status(404).json({ error: "Parliamentary issue not found." });
    }

    res.status(201).json({
      parliamentary_issue_id: result.recordset[0].parliamentary_issue_id,
    });
  } catch (err) {
    return serverError(res, "update the parliamentary issue", err);
  }
}

async function getUpdateParliamentaryIssueData(req, res) {
  const parliamentaryIssueID = parseId(req.params.parliamentaryIssueID);
  if (!parliamentaryIssueID) return res.status(400).json({ error: "Invalid parliamentary issue." });

  const conn = await pool;
  const request = conn.request();
  request.input("parliamentaryIssueID", sql.Int, parliamentaryIssueID);

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
    return serverError(res, "load the parliamentary issue", err);
  }
}

async function deleteParliamentaryIssue(req, res) {
  const parliamentaryIssueID = parseId(req.params.parliamentaryIssueID);
  if (!parliamentaryIssueID) return res.status(400).json({ error: "Invalid parliamentary issue." });

  // The log names the signed-in user, never the :userID in the address (QC PI-BE-04/05).
  // Both values are numbers by now, so no request text can reach the log line.
  const userID = signedInUserId(req);
  if (!userID) return res.status(401).json({ error: "Unauthorized." });

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
  request.input("parliamentaryIssueID", sql.Int, parliamentaryIssueID);

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
    // The DELETE carries the scope itself, not only the SELECT above it (QC PI-BE-08)
    const result = await request.query(`
      DELETE tpi
      FROM tbl_parliamentary_issue tpi
      ${joinSql}
      WHERE tpi.parliamentary_issue_id = @parliamentaryIssueID
      ${whereSql}
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
    return serverError(res, "delete the parliamentary issue", err);
  }
}

export default {
  getParliamentaryIssue,
  createParliamentaryIssue,
  editParliamentaryIssue,
  getUpdateParliamentaryIssueData,
  deleteParliamentaryIssue,
};
