import sql from 'mssql';
import fs from 'fs';
import { pool } from '../../db.js';
import { storedFilePath, removeFiles, attachmentHeader, originalNameOf } from './formBuilderFiles.js';
import { getDataScope } from '../../middleware/dataScope.js';
import {
  buildTableName,
  buildColumnName,
  sqlTypeForInputType,
  STORABLE_INPUT_TYPES,
  isSafeIdentifier,
} from './formBuilderUtils.js';

// ---------- shared helpers ----------

// Today's date in India, so a form due on the 7th stays open until midnight IST
// (the DB server's own clock may be UTC).
const TODAY_IST_SQL = `CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30') AS DATE)`;

// Same rule as Sagarmanthan 2.0: a form past its due date stops taking responses.
// Unlike 2.0 this is worked out on read instead of rewriting active_status, so a form
// switched OFF by hand stays OFF. Needs the definition aliased as `d`.
const FORM_OPEN_SQL = `(d.active_status = '1' AND (d.due_date IS NULL OR d.due_date >= ${TODAY_IST_SQL}))`;

// A real calendar date in YYYY-MM-DD. Round-trip check: Date quietly rolls
// 2027-02-30 over to 2027-03-02.
function isRealDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return false;
  const parsed = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
}

const toIsoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// True when the date is before today in India (same clock as the due-date close rule).
async function isBeforeTodayIST(request, isoDate) {
  const r = await request.input('checkDate', sql.Date, isoDate)
    .query(`SELECT CASE WHEN @checkDate < ${TODAY_IST_SQL} THEN 1 ELSE 0 END AS past;`);
  return r.recordset[0].past === 1;
}

const PAST_DUE_MESSAGE = 'The due date cannot be in the past';

// Directory badge: Inactive (switched OFF), Overdue (ON but past due), else Active.
function formStatus(activeStatus, isPastDue) {
  if (activeStatus !== '1') return 'Inactive';
  return isPastDue ? 'Overdue' : 'Active';
}

// Data fields are keyed by their column (field_N). File fields have no column, so they
// get the same positional style (file_N) instead of falling back to the label text.
const clientFieldId = (f, index) => f.columnName || (f.inputType === 'file' ? `file_${index + 1}` : f.inputLabel);

const FILE_MAPPING = 'tbl_form_Builder_fileMapping';

const toCSV = (v) => (Array.isArray(v) ? v.filter(Boolean).join(',') : (v || ''));

async function rollbackQuietly(transaction) {
  if (transaction) {
    try { await transaction.rollback(); } catch {}
  }
}

// Validates and normalises incoming fields. Returns { error } or { storableFields }.
function normalizeFields(formFields) {
  if (!Array.isArray(formFields) || formFields.length === 0) {
    return { error: 'At least one field is required' };
  }
  const storableFields = [];
  for (let i = 0; i < formFields.length; i++) {
    const f = formFields[i];
    const inputType = String(f?.inputType || '');
    const isFile = inputType === 'file';
    if (!isFile && !STORABLE_INPUT_TYPES.includes(inputType)) {
      return { error: `Unsupported field type: ${inputType || '(blank)'}` };
    }
    storableFields.push({
      inputLabel: String(f?.inputLabel || `Field ${i + 1}`),
      inputType,
      isFile,
      placeholder: f?.placeholder || null,
      required: !!f?.required,
      options: Array.isArray(f?.options) ? f.options : [],
    });
  }
  return { storableFields };
}

// Builds the per-form submissions table DDL. Column names are positional
// (field_N) and the table name is server-generated: user text never reaches SQL.
function buildSubmissionsTable(tableName, storableFields) {
  const columnDefs = [];
  const fieldsForJson = storableFields.map((f, i) => {
    if (f.isFile) return { ...f, columnName: null };
    const columnName = buildColumnName(i + 1);
    columnDefs.push(`[${columnName}] ${sqlTypeForInputType(f.inputType)} NULL`);
    return { ...f, columnName };
  });
  const ddl = `
    CREATE TABLE [${tableName}] (
      id INT IDENTITY(1,1) PRIMARY KEY,
      submission_uid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
      ${columnDefs.length ? columnDefs.join(',\n      ') + ',' : ''}
      submitted_by INT NULL,
      submission_status NVARCHAR(20) NOT NULL DEFAULT 'Draft',
      submitted_date DATETIME NULL,
      updated_date DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX idx_submitted_by ON [${tableName}] (submitted_by);
    -- Submissions list: filter by status and page in submitted order without a sort.
    CREATE INDEX idx_status_submitted ON [${tableName}] (submission_status, submitted_date DESC, id DESC);
    -- Lookups by submission uid (file download permission check).
    CREATE UNIQUE INDEX idx_submission_uid ON [${tableName}] (submission_uid);
  `;
  return { ddl, fieldsForJson };
}

// Everything about a field that changes what a stored row means. Used for the field lock.
function fieldSignature(fields) {
  return JSON.stringify(
    (fields || []).map((f) => ({
      inputLabel: String(f.inputLabel || ''),
      inputType: String(f.inputType || ''),
      placeholder: f.placeholder || null,
      required: !!f.required,
      options: Array.isArray(f.options) ? f.options : [],
    }))
  );
}

function bindMetadata(request, formName, meta) {
  request.input('form_name', sql.NVarChar(255), formName);
  request.input('form_description', sql.NVarChar(sql.MAX), meta.formDescription || '');
  request.input('due_date', sql.Date, meta.formDueDate || null);
  request.input('organisation', sql.NVarChar(sql.MAX), toCSV(meta.organisation));
  request.input('wing', sql.NVarChar(sql.MAX), toCSV(meta.wing));
  request.input('division', sql.NVarChar(sql.MAX), toCSV(meta.division));
  request.input('active_status', sql.NVarChar(10), String(meta.activeStatus ?? '1'));
  return request;
}

// ---------- POST /modify-form-builder-input-form ----------
// No formId in the body -> create a new form. formId present -> update that form.
// Field lock: once the form's table has any row (Draft or Submitted), field changes
// are rejected with 409 and only metadata can be updated.
async function modifyFormBuilderInputForm(req, res) {
  const { formFields, mmtData } = req.body;
  const meta = Array.isArray(mmtData) ? mmtData[0] : mmtData;
  if (!meta) {
    return res.status(400).json({ message: 'mmtData is required' });
  }

  const formName = String(req.body.formName || req.body.formattedFormId || '').trim();
  if (!formName) {
    return res.status(400).json({ message: 'Form name is required' });
  }

  const { error, storableFields } = normalizeFields(formFields);
  if (error) {
    return res.status(400).json({ message: error });
  }

  // Due date is optional (no date = never closes by date); when given it must be real.
  const due = String(meta.formDueDate ?? '').trim();
  if (due && !isRealDate(due)) {
    return res.status(400).json({ message: 'The due date must be a valid date' });
  }
  meta.formDueDate = due || null;

  if (!canAuthor(scopeOf(req.user))) {
    return res.status(403).json({ message: AUTHOR_DENIED });
  }

  const rawId = req.body.formId;
  const hasFormId = rawId !== undefined && rawId !== null && rawId !== '';
  if (hasFormId) {
    return updateForm(req, res, { formName, meta, storableFields });
  }
  return createForm(req, res, { formName, meta, storableFields });
}

// ---------- assignments (mmt_form_assignments) ----------
// One row per assigned organisation code ('O') or wing name ('W'), so assignment checks
// are indexed lookups. The organisation / wing CSV columns on the definition stay for
// display and Edit. Rows are written from the lists Studio sends, never by splitting the
// CSV (wing names can contain commas).
function assignmentValues(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((v) => typeof v === 'string' && v.trim() && v.length <= 255))];
}

async function replaceAssignments(transaction, formId, meta) {
  await transaction.request().input('formId', sql.Int, formId)
    .query(`DELETE FROM mmt_form_assignments WHERE form_id = @formId;`);
  const rows = [
    ...assignmentValues(meta.organisation).map((v) => ['O', v]),
    ...assignmentValues(meta.wing).map((v) => ['W', v]),
  ];
  for (const [kind, value] of rows) {
    await transaction.request()
      .input('formId', sql.Int, formId)
      .input('kind', sql.Char(1), kind)
      .input('value', sql.NVarChar(255), value)
      .query(`INSERT INTO mmt_form_assignments (form_id, kind, value) VALUES (@formId, @kind, @value);`);
  }
}

// Inserts a definition row and creates its tbl_fb_<id> table inside the caller's
// transaction. Shared by create and clone so both build forms the same way.
async function insertFormWithTable(transaction, { formName, meta, storableFields, createdBy, copyAssignmentsFrom }) {
  const insertReq = bindMetadata(transaction.request(), formName, meta);
  insertReq.input('created_by', sql.Int, createdBy);
  const insertResult = await insertReq.query(`
      INSERT INTO mmt_form_definitions
        (form_name, form_description, table_name, form_fields, due_date, organisation, wing, division, active_status, created_by)
      OUTPUT INSERTED.id
      VALUES
        (@form_name, @form_description, '', '[]', @due_date, @organisation, @wing, @division, @active_status, @created_by);
    `);
  const formId = insertResult.recordset[0].id;
  const tableName = buildTableName(formId);

  const { ddl, fieldsForJson } = buildSubmissionsTable(tableName, storableFields);
  await transaction.request().query(ddl);

  const updateReq = transaction.request();
  updateReq.input('id', sql.Int, formId);
  updateReq.input('table_name', sql.NVarChar(128), tableName);
  updateReq.input('form_fields', sql.NVarChar(sql.MAX), JSON.stringify(fieldsForJson));
  await updateReq.query(`
      UPDATE mmt_form_definitions
      SET table_name = @table_name, form_fields = @form_fields, updated_date = GETDATE()
      WHERE id = @id;
    `);

  if (copyAssignmentsFrom) {
    await transaction.request()
      .input('formId', sql.Int, formId)
      .input('sourceId', sql.Int, copyAssignmentsFrom)
      .query(`
        INSERT INTO mmt_form_assignments (form_id, kind, value)
        SELECT @formId, kind, value FROM mmt_form_assignments WHERE form_id = @sourceId;
      `);
  } else {
    await replaceAssignments(transaction, formId, meta);
  }
  return { formId, tableName };
}

async function createForm(req, res, { formName, meta, storableFields }) {
  let transaction;
  try {
    const conn = await pool;
    transaction = new sql.Transaction(conn);
    await transaction.begin();

    if (meta.formDueDate && await isBeforeTodayIST(transaction.request(), meta.formDueDate)) {
      await rollbackQuietly(transaction);
      return res.status(400).json({ message: PAST_DUE_MESSAGE });
    }

    const { formId, tableName } = await insertFormWithTable(transaction, {
      formName,
      meta,
      storableFields,
      // Creator comes from the verified token, never from the request body.
      createdBy: Number(req.user?.userId) || null,
    });

    await transaction.commit();
    res.status(201).json({ id: formId, tableName, message: 'Form created successfully' });
  } catch (err) {
    await rollbackQuietly(transaction);
    console.error('modifyFormBuilderInputForm (create) error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function updateForm(req, res, { formName, meta, storableFields }) {
  const formId = Number(req.body.formId);
  if (!Number.isInteger(formId) || formId <= 0) {
    return res.status(400).json({ message: 'Invalid form id' });
  }

  let transaction;
  try {
    const conn = await pool;
    transaction = new sql.Transaction(conn);
    await transaction.begin();

    const lookup = await transaction.request()
      .input('id', sql.Int, formId)
      .query(`
        SELECT table_name, form_fields, created_by, due_date
        FROM mmt_form_definitions WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @id;
      `);
    if (lookup.recordset.length === 0) {
      await rollbackQuietly(transaction);
      return res.status(404).json({ message: 'Form not found' });
    }
    if (!canAuthor(scopeOf(req.user))) {
      await rollbackQuietly(transaction);
      return res.status(403).json({ message: AUTHOR_DENIED });
    }
    // Moving the date into the past is refused; an overdue form keeping its date while
    // other details are edited is fine, and extending it is how it reopens.
    const dueChanged = meta.formDueDate !== toIsoDate(lookup.recordset[0].due_date);
    if (dueChanged && meta.formDueDate && await isBeforeTodayIST(transaction.request(), meta.formDueDate)) {
      await rollbackQuietly(transaction);
      return res.status(400).json({ message: PAST_DUE_MESSAGE });
    }

    const { table_name: tableName, form_fields: storedFieldsJson } = lookup.recordset[0];
    if (!isSafeIdentifier(tableName)) {
      await rollbackQuietly(transaction);
      return res.status(500).json({ message: 'Stored table name failed safety check' });
    }

    let storedFields = [];
    try { storedFields = JSON.parse(storedFieldsJson || '[]'); } catch { storedFields = []; }

    // Exclusive table lock: no submission can land between this count and a possible DROP.
    const countResult = await transaction.request()
      .query(`SELECT COUNT(*) AS n FROM [${tableName}] WITH (TABLOCKX, HOLDLOCK);`);
    const rowCount = countResult.recordset[0].n;

    const fieldsChanged = fieldSignature(storedFields) !== fieldSignature(storableFields);

    if (fieldsChanged && rowCount > 0) {
      await rollbackQuietly(transaction);
      return res.status(409).json({
        message: 'This form already has submissions, so its fields are locked. Only the form details (name, description, due date, assignment, status) can be changed.',
        fieldsLocked: true,
      });
    }

    let formFieldsJson = storedFieldsJson;
    if (fieldsChanged) {
      // Table is empty (checked under lock above), so rebuilding it loses nothing.
      const { ddl, fieldsForJson } = buildSubmissionsTable(tableName, storableFields);
      await transaction.request().query(`DROP TABLE [${tableName}];`);
      await transaction.request().query(ddl);
      formFieldsJson = JSON.stringify(fieldsForJson);
    }

    const updateReq = bindMetadata(transaction.request(), formName, meta);
    updateReq.input('id', sql.Int, formId);
    updateReq.input('form_fields', sql.NVarChar(sql.MAX), formFieldsJson);
    await updateReq.query(`
      UPDATE mmt_form_definitions
      SET form_name = @form_name,
          form_description = @form_description,
          due_date = @due_date,
          organisation = @organisation,
          wing = @wing,
          division = @division,
          active_status = @active_status,
          form_fields = @form_fields,
          updated_date = GETDATE()
      WHERE id = @id;
    `);
    await replaceAssignments(transaction, formId, meta);

    await transaction.commit();
    res.json({
      id: formId,
      tableName,
      fieldsChanged,
      fieldsLocked: rowCount > 0,
      message: 'Form updated successfully',
    });
  } catch (err) {
    await rollbackQuietly(transaction);
    console.error('modifyFormBuilderInputForm (update) error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// ---------- GET /get-created-form-data ----------
async function getCreatedFormData(req, res) {
  try {
    const conn = await pool;
    const scope = scopeOf(req.user);
    const result = await bindVisibility(conn.request(), req.user).query(`
      ${DECLARE_CALLER_ASSIGNMENT_SQL}
      SELECT d.id, d.form_name, d.form_description, d.due_date, d.organisation, d.wing, d.active_status,
             d.submission_count, d.form_fields,
             CASE WHEN d.due_date < ${TODAY_IST_SQL} THEN 1 ELSE 0 END AS is_past_due,
             CASE WHEN ${manageableFormsSql(scope)} THEN 1 ELSE 0 END AS can_manage
      FROM mmt_form_definitions d
      WHERE ${visibleFormsSql(scope)}
      ORDER BY d.created_date DESC;
    `);

    const forms = result.recordset.map((row) => {
      let fields = [];
      try {
        const parsed = JSON.parse(row.form_fields || '[]');
        fields = parsed.map((f, i) => ({
          id: clientFieldId(f, i),
          inputLabel: f.inputLabel,
          inputType: f.inputType,
          options: f.options || [],
          required: !!f.required,
          placeholder: f.placeholder || '',
        }));
      } catch {
        fields = [];
      }

      return {
        id: row.id,
        formName: row.form_name,
        formDescription: row.form_description,
        organisation: row.organisation,
        wing: row.wing,
        dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null,
        status: formStatus(row.active_status, row.is_past_due === 1),
        isActive: row.active_status === '1',
        canManage: row.can_manage === 1,
        submissionsCount: row.submission_count,
        fields,
      };
    });

    res.json(forms);
  } catch (err) {
    console.error('getCreatedFormData error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Stored field JSON -> the field shape the frontend renders (same as getCreatedFormData).
function toClientFields(formFieldsJson) {
  let parsed = [];
  try { parsed = JSON.parse(formFieldsJson || '[]'); } catch { parsed = []; }
  return parsed.map((f, i) => ({
    id: clientFieldId(f, i),
    columnName: f.columnName || null,
    inputLabel: f.inputLabel,
    inputType: f.inputType,
    options: f.options || [],
    required: !!f.required,
    placeholder: f.placeholder || '',
  }));
}

// Converts a stored column value back to what the form field holds.
function fromColumnValue(inputType, value) {
  if (value === null || value === undefined) return null;
  if (inputType === 'multiple-select') {
    try { return JSON.parse(value); } catch { return value; }
  }
  if (inputType === 'checkbox') return !!value;
  if (inputType === 'date' && value instanceof Date) return value.toISOString().split('T')[0];
  return value;
}

// DATETIME columns hold the DB server's clock, which is UTC (Azure SQL always is); shown in IST.
const IST_OFFSET_MS = 330 * 60 * 1000;
const formatDateTime = (d) => (d ? new Date(new Date(d).getTime() + IST_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 16) : null);

// ---------- GET /get-form-submissions/:formId ----------
// Submitted rows only; drafts stay private to the person filling the form.
// Row values are keyed by field id (field_N), with labels in `fields`, so the
// frontend can build its columns from the form instead of hard-coding them.
async function getFormSubmissions(req, res) {
  const formId = Number(req.params.formId);
  if (!Number.isInteger(formId) || formId <= 0) {
    return res.status(400).json({ message: 'Invalid form id' });
  }

  try {
    const conn = await pool;
    const scope = scopeOf(req.user);
    const lookup = await bindVisibility(conn.request(), req.user)
      .input('id', sql.Int, formId)
      .query(`
        ${DECLARE_CALLER_ASSIGNMENT_SQL}
        SELECT d.id, d.form_name, d.table_name, d.form_fields, d.organisation, d.created_by
        FROM mmt_form_definitions d
        WHERE d.id = @id AND ${visibleFormsSql(scope)};
      `);
    if (lookup.recordset.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const form = lookup.recordset[0];
    if (!isSafeIdentifier(form.table_name)) {
      return res.status(500).json({ message: 'Stored table name failed safety check' });
    }

    const fields = toClientFields(form.form_fields);
    const dataFields = fields.filter((f) => f.columnName && isSafeIdentifier(f.columnName));
    const columnList = dataFields.map((f) => `s.[${f.columnName}]`).join(', ');

    // Organisation users see only their own organisation's responses.
    const ownOrgOnly = !canAuthor(scope);

    // Paging and search happen in SQL. ?all=true returns every matching row (for Export).
    const all = String(req.query.all) === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || '').trim().slice(0, 100);
    // LIKE wildcards in the search text are matched literally.
    const searchPattern = `%${search.replace(/[\\%_[]/g, (ch) => `\\${ch}`)}%`;

    const baseFrom = `
      FROM [${form.table_name}] s
      LEFT JOIN tbl_user u ON u.user_id = s.submitted_by
      LEFT JOIN mmt_organisation o ON o.organisation_id = u.organisation_id
      WHERE s.submission_status = 'Submitted'
        ${ownOrgOnly ? 'AND u.organisation_id = @scopeOrgId' : ''}`;
    const searchSql = search
      ? `AND (o.organisation_name LIKE @search ESCAPE '\\' OR u.name LIKE @search ESCAPE '\\' OR u.designation LIKE @search ESCAPE '\\')`
      : '';
    const bindFilters = (request) => request
      .input('scopeOrgId', sql.Int, ownOrgOnly ? scope.organisationId : null)
      .input('search', sql.NVarChar(110), searchPattern);

    const rows = await bindFilters(conn.request())
      .input('offset', sql.Int, (page - 1) * limit)
      .input('limit', sql.Int, limit)
      .query(`
      SELECT s.id, s.submission_uid, s.submitted_by, s.submitted_date,
             ${columnList ? columnList + ',' : ''}
             u.name AS submitter_name, u.designation AS submitter_designation,
             o.organisation_name, o.organisation_code,
             COUNT(*) OVER () AS total_count
      ${baseFrom}
        ${searchSql}
      ORDER BY s.submitted_date DESC, s.id DESC
      ${all ? '' : 'OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY'};
    `);
    let total = rows.recordset[0]?.total_count || 0;
    if (!all && rows.recordset.length === 0 && page > 1) {
      // Past the last page: report the real total so the pager can recover.
      const counted = await bindFilters(conn.request()).query(`SELECT COUNT(*) AS n ${baseFrom} ${searchSql};`);
      total = counted.recordset[0].n;
    }

    // Header stats cover every visible response, not just this page or search. The
    // responding organisations come back as a DISTINCT list (one row per organisation),
    // not one code per response.
    const statsResult = await bindFilters(conn.request()).query(`
      SELECT COUNT(*) AS total_submissions,
             COUNT(DISTINCT s.submitted_by) AS distinct_submitters
      ${baseFrom};
      SELECT DISTINCT o.organisation_code AS code
      ${baseFrom}
        AND o.organisation_code IS NOT NULL;
    `);
    const statsRow = statsResult.recordsets[0][0];
    const respondedOrganisations = new Set(statsResult.recordsets[1].map((r) => r.code));

    // Uploaded files for the rows on this page, keyed by submission uid then field id.
    const filesByUid = new Map();
    const pageUids = rows.recordset.map((r) => String(r.submission_uid).toUpperCase());
    if (fields.some((f) => f.inputType === 'file') && pageUids.length) {
      const fileReq = conn.request();
      pageUids.forEach((u, i) => fileReq.input(`u${i}`, sql.NVarChar(100), u));
      const fileRows = await fileReq.query(`
        SELECT uid, field_name, file_name FROM ${FILE_MAPPING}
        WHERE uid IN (${pageUids.map((_, i) => `@u${i}`).join(', ')});
      `);
      for (const fr of fileRows.recordset) {
        if (!filesByUid.has(fr.uid)) filesByUid.set(fr.uid, {});
        filesByUid.get(fr.uid)[fr.field_name] = { fileName: fr.file_name };
      }
    }

    const submissions = rows.recordset.map((r) => {
      const data = {};
      for (const f of dataFields) data[f.id] = fromColumnValue(f.inputType, r[f.columnName]);
      Object.assign(data, filesByUid.get(String(r.submission_uid).toUpperCase()) || {});
      return {
        id: r.id,
        submissionUid: r.submission_uid,
        portName: r.organisation_name || null,
        organisationCode: r.organisation_code || null,
        submittedBy: r.submitter_name
          ? (r.submitter_designation ? `${r.submitter_name} (${r.submitter_designation})` : r.submitter_name)
          : null,
        submittedOn: formatDateTime(r.submitted_date),
        data,
      };
    });

    const assignedOrganisations = String(form.organisation || '').split(',').filter(Boolean);
    const pageSize = all ? Math.max(total, 1) : limit;

    res.json({
      form: { id: form.id, formName: form.form_name, fields },
      submissions,
      stats: {
        totalSubmissions: statsRow.total_submissions,
        distinctSubmitters: statsRow.distinct_submitters,
        assignedOrganisations: assignedOrganisations.length,
        respondedOrganisations: assignedOrganisations.filter((c) => respondedOrganisations.has(c)).length,
      },
      pagination: {
        total,
        page: all ? 1 : page,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    console.error('getFormSubmissions error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Resolves the caller's organisation code and wing name. Needs @orgId and @wingId inputs.
const DECLARE_CALLER_ASSIGNMENT_SQL = `
  DECLARE @orgCode NVARCHAR(100) = (SELECT organisation_code FROM mmt_organisation WHERE organisation_id = @orgId);
  DECLARE @wingName NVARCHAR(255) = (SELECT wing_name FROM mmt_wings WHERE wing_id = @wingId);`;

// True when form row `d` is assigned to the caller's organisation code or wing name:
// an indexed lookup in mmt_form_assignments (exact values, so SMPA never matches SMPA-KDS).
const ASSIGNED_TO_CALLER_SQL = `EXISTS (
  SELECT 1 FROM mmt_form_assignments a
  WHERE a.form_id = d.id
    AND ((a.kind = 'O' AND a.value = @orgCode) OR (a.kind = 'W' AND a.value = @wingName))
)`;

const bindCallerAssignment = (request, user) => request
  .input('orgId', sql.Int, Number(user?.organisationId) || null)
  .input('wingId', sql.Int, Number(user?.wingId) || null);

// ---------- visibility (the app's dataScope) ----------
// Only MASTER / MINISTRY users author forms (create, edit, delete, ON/OFF, clone,
// Studio drafts) and they see every form and response. ORGANISATION users only fill
// forms in: they see forms assigned to their organisation or wing (plus any they created
// before authoring was Ministry-only, now read-only) and only their own organisation's
// responses. Any other scope sees nothing, as in applyDataScope.
function scopeOf(user) {
  const { isWide, isOrganisation, organisationId } = getDataScope(user);
  return {
    isWide,
    isOrganisation: isOrganisation && Number.isFinite(organisationId) && organisationId > 0,
    organisationId,
    userId: Number(user?.userId) || null,
  };
}

// Forms the caller can see; needs alias `d`, DECLARE_CALLER_ASSIGNMENT_SQL and bindVisibility.
function visibleFormsSql(scope) {
  if (scope.isWide) return '1 = 1';
  if (!scope.isOrganisation) return '1 = 0';
  return `(d.created_by = @callerId OR ${ASSIGNED_TO_CALLER_SQL})`;
}

function manageableFormsSql(scope) {
  return scope.isWide ? '1 = 1' : '1 = 0';
}

const bindVisibility = (request, user) => bindCallerAssignment(request, user)
  .input('callerId', sql.Int, Number(user?.userId) || null);

const canAuthor = (scope) => scope.isWide;
const AUTHOR_DENIED = 'Only Ministry users can create or change forms';

// ---------- GET /get-inbox-forms ----------
// Active forms assigned to the caller's organisation (by code) or wing (by name),
// with the caller's own progress on each.
async function getInboxForms(req, res) {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }

  try {
    const conn = await pool;
    const formsResult = await bindCallerAssignment(conn.request(), req.user)
      .query(`
        ${DECLARE_CALLER_ASSIGNMENT_SQL}

        SELECT d.id, d.form_name, d.form_description, d.due_date, d.table_name, d.form_fields,
               u.name AS creator_name, o.organisation_name AS creator_organisation
        FROM mmt_form_definitions d
        LEFT JOIN tbl_user u ON u.user_id = d.created_by
        LEFT JOIN mmt_organisation o ON o.organisation_id = u.organisation_id
        WHERE ${FORM_OPEN_SQL}
          AND ${ASSIGNED_TO_CALLER_SQL}
        ORDER BY d.due_date, d.id;
      `);

    const forms = formsResult.recordset.filter((f) => isSafeIdentifier(f.table_name));

    // The caller's own rows across all matched per-form tables, in one query.
    const progress = new Map();
    if (forms.length) {
      const unions = forms.map((f) => `
        SELECT ${Number(f.id)} AS form_id, submission_uid, submission_status, updated_date
        FROM [${f.table_name}] WHERE submitted_by = @userId`).join('\n        UNION ALL');
      const progressResult = await conn.request()
        .input('userId', sql.Int, userId)
        .query(`${unions}\n        ORDER BY updated_date DESC;`);
      for (const row of progressResult.recordset) {
        const current = progress.get(row.form_id);
        // A submitted row wins over any draft; otherwise the latest row.
        if (!current || (row.submission_status === 'Submitted' && current.submission_status !== 'Submitted')) {
          progress.set(row.form_id, row);
        }
      }
    }

    const STATUS_LABELS = { Submitted: 'Submitted', Draft: 'Draft Saved' };
    res.json(forms.map((f) => {
      const mine = progress.get(f.id);
      return {
        id: f.id,
        formName: f.form_name,
        formDescription: f.form_description,
        assignedBy: f.creator_organisation || f.creator_name || null,
        dueDate: f.due_date ? new Date(f.due_date).toISOString().split('T')[0] : null,
        status: mine ? (STATUS_LABELS[mine.submission_status] || mine.submission_status) : 'Pending',
        submissionUid: mine ? mine.submission_uid : null,
        fields: toClientFields(f.form_fields),
      };
    }));
  } catch (err) {
    console.error('getInboxForms error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Validates one submitted value against its field and returns { value, sqlType }
// ready to bind, or { error }. Empty values become NULL.
const isEmptyValue = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INT_MIN = -2147483648, INT_MAX = 2147483647;

function coerceFieldValue(field, raw) {
  const label = field.inputLabel;
  if (isEmptyValue(raw)) return { value: null, sqlType: null };
  const options = Array.isArray(field.options) ? field.options : [];
  switch (field.inputType) {
    case 'number': {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < INT_MIN || n > INT_MAX) return { error: `${label} must be a whole number` };
      return { value: n, sqlType: sql.Int };
    }
    case 'float': {
      const n = Number(raw);
      if (!Number.isFinite(n) || Math.abs(n) >= 1e16) return { error: `${label} must be a number` };
      return { value: n, sqlType: sql.Decimal(18, 2) };
    }
    case 'date': {
      const d = String(raw);
      if (!isRealDate(d)) return { error: `${label} must be a valid date` };
      return { value: d, sqlType: sql.Date };
    }
    case 'checkbox': {
      if (raw === true || raw === 'true' || raw === 1 || raw === '1') return { value: true, sqlType: sql.Bit };
      if (raw === false || raw === 'false' || raw === 0 || raw === '0') return { value: false, sqlType: sql.Bit };
      return { error: `${label} must be yes or no` };
    }
    case 'multiple-select': {
      if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string')) return { error: `${label} must be a list of options` };
      if (options.length && raw.some((v) => !options.includes(v))) return { error: `${label} has an option that is not allowed` };
      return { value: JSON.stringify(raw), sqlType: sql.NVarChar(sql.MAX) };
    }
    default: {
      if (typeof raw !== 'string' && typeof raw !== 'number') return { error: `${label} must be text` };
      const text = String(raw);
      if ((field.inputType === 'dropdown' || field.inputType === 'radio') && options.length && !options.includes(text)) {
        return { error: `${label} has an option that is not allowed` };
      }
      if (field.inputType === 'email' && !EMAIL_RE.test(text)) return { error: `${label} must be a valid email address` };
      const maxLen = { email: 320, phone: 20, password: 255, radio: 255, dropdown: 255, state: 100, district: 100, 'MP-Constituency': 255 }[field.inputType];
      if (maxLen && text.length > maxLen) return { error: `${label} is too long (max ${maxLen} characters)` };
      return { value: text, sqlType: sql.NVarChar(sql.MAX) };
    }
  }
}

// ---------- POST /submit-form-data ----------
// Body: { formId, values: { field_N: value }, action: 'draft' | 'submit' }.
// One response per user per form: saving again updates it. A submitted response can be
// edited and re-submitted but not turned back into a draft. Required fields are only
// enforced on submit (drafts may be partial). File fields are skipped until uploads exist.
// Files arrive (multipart) before the handler runs, so the wrapper removes them again
// unless the handler committed and marked them as kept.
async function submitFormData(req, res) {
  try {
    await handleSubmitFormData(req, res);
  } finally {
    if (!res.locals.fbKeepUploads) {
      await removeFiles((req.files || []).map((f) => f.path));
    }
  }
}

async function handleSubmitFormData(req, res) {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }
  const formId = Number(req.body?.formId);
  if (!Number.isInteger(formId) || formId <= 0) {
    return res.status(400).json({ message: 'Invalid form id' });
  }
  const action = req.body?.action;
  if (action !== 'draft' && action !== 'submit') {
    return res.status(400).json({ message: "action must be 'draft' or 'submit'" });
  }
  // Multipart requests (with files) send values as a JSON string.
  let values = req.body?.values;
  if (typeof values === 'string') {
    try { values = JSON.parse(values); } catch { values = null; }
  }
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return res.status(400).json({ message: 'values must be an object' });
  }

  let transaction;
  try {
    const conn = await pool;
    transaction = new sql.Transaction(conn);
    await transaction.begin();

    // Update lock on the definition: the field list can't be rebuilt mid-submit, and two
    // first-time submitters can't deadlock converting shared locks for the count update.
    const lookup = await bindCallerAssignment(transaction.request(), req.user)
      .input('id', sql.Int, formId)
      .query(`
        ${DECLARE_CALLER_ASSIGNMENT_SQL}
        SELECT d.table_name, d.form_fields, d.active_status,
               CASE WHEN ${ASSIGNED_TO_CALLER_SQL} THEN 1 ELSE 0 END AS is_assigned,
               CASE WHEN ${FORM_OPEN_SQL} THEN 1 ELSE 0 END AS is_open
        FROM mmt_form_definitions d WITH (UPDLOCK, HOLDLOCK)
        WHERE d.id = @id;
      `);
    if (lookup.recordset.length === 0) {
      await rollbackQuietly(transaction);
      return res.status(404).json({ message: 'Form not found' });
    }
    const form = lookup.recordset[0];
    if (!form.is_assigned) {
      await rollbackQuietly(transaction);
      return res.status(403).json({ message: 'This form is not assigned to you' });
    }
    if (!form.is_open) {
      await rollbackQuietly(transaction);
      return res.status(409).json({
        message: form.active_status === '1'
          ? 'The due date for this form has passed, so it is no longer accepting responses'
          : 'This form is not accepting responses',
      });
    }
    if (!isSafeIdentifier(form.table_name)) {
      await rollbackQuietly(transaction);
      return res.status(500).json({ message: 'Stored table name failed safety check' });
    }

    const fields = toClientFields(form.form_fields);
    const dataFields = fields.filter((f) => f.columnName && isSafeIdentifier(f.columnName));
    const knownIds = new Set(fields.map((f) => f.id));
    const unknown = Object.keys(values).filter((k) => !knownIds.has(k));
    if (unknown.length) {
      await rollbackQuietly(transaction);
      return res.status(400).json({ message: 'This form has changed since you opened it. Please reload it.', unknownFields: unknown });
    }

    // Each upload must be for one of this form's file fields, at most one per field.
    const fileFields = fields.filter((f) => f.inputType === 'file');
    const fileFieldIds = new Set(fileFields.map((f) => f.id));
    const uploads = req.files || [];
    const uploadsByField = new Map();
    for (const u of uploads) {
      if (!fileFieldIds.has(u.fieldname)) {
        await rollbackQuietly(transaction);
        return res.status(400).json({ message: 'A file was sent for a field that is not a file field on this form' });
      }
      if (uploadsByField.has(u.fieldname)) {
        await rollbackQuietly(transaction);
        return res.status(400).json({ message: 'Only one file can be uploaded per field' });
      }
      uploadsByField.set(u.fieldname, u);
    }

    const errors = [];
    const columns = [];
    for (const f of dataFields) {
      const { value, sqlType, error } = coerceFieldValue(f, values[f.id]);
      if (error) { errors.push(error); continue; }
      if (action === 'submit' && f.required && value === null) errors.push(`${f.inputLabel} is required`);
      columns.push({ name: f.columnName, value, sqlType: sqlType || sql.NVarChar(sql.MAX) });
    }
    if (errors.length) {
      await rollbackQuietly(transaction);
      return res.status(400).json({ message: errors[0], errors });
    }

    const existing = await transaction.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT TOP 1 id, submission_status, submission_uid
        FROM [${form.table_name}] WITH (UPDLOCK, HOLDLOCK)
        WHERE submitted_by = @userId
        ORDER BY CASE WHEN submission_status = 'Submitted' THEN 0 ELSE 1 END, updated_date DESC;
      `);
    const prior = existing.recordset[0];

    if (prior && prior.submission_status === 'Submitted' && action === 'draft') {
      await rollbackQuietly(transaction);
      return res.status(409).json({ message: 'This response has already been submitted. Submit again to update it.' });
    }

    // Required file fields are satisfied by a new upload or a file saved earlier.
    let savedFileFields = new Set();
    if (prior && fileFields.length) {
      const saved = await transaction.request()
        .input('uid', sql.NVarChar(100), String(prior.submission_uid).toUpperCase())
        .query(`SELECT field_name FROM ${FILE_MAPPING} WHERE uid = @uid;`);
      savedFileFields = new Set(saved.recordset.map((r) => r.field_name));
    }
    if (action === 'submit') {
      const missing = fileFields.filter((f) => f.required && !uploadsByField.has(f.id) && !savedFileFields.has(f.id));
      if (missing.length) {
        await rollbackQuietly(transaction);
        const fileErrors = missing.map((f) => `${f.inputLabel} is required`);
        return res.status(400).json({ message: fileErrors[0], errors: fileErrors });
      }
    }

    const newStatus = action === 'submit' ? 'Submitted' : 'Draft';
    const write = transaction.request()
      .input('userId', sql.Int, userId)
      .input('status', sql.NVarChar(20), newStatus);
    columns.forEach((c, i) => write.input(`v${i}`, c.sqlType, c.value));

    let rowId;
    if (prior) {
      const sets = columns.map((c, i) => `[${c.name}] = @v${i}`);
      write.input('rowId', sql.Int, prior.id);
      await write.query(`
        UPDATE [${form.table_name}]
        SET ${sets.length ? sets.join(', ') + ',' : ''}
            submission_status = @status,
            submitted_date = CASE WHEN @status = 'Submitted' THEN GETDATE() ELSE submitted_date END,
            updated_date = GETDATE()
        WHERE id = @rowId;
      `);
      rowId = prior.id;
    } else {
      const names = columns.map((c) => `[${c.name}]`);
      const params = columns.map((_, i) => `@v${i}`);
      const inserted = await write.query(`
        INSERT INTO [${form.table_name}]
          (${names.length ? names.join(', ') + ',' : ''} submitted_by, submission_status, submitted_date)
        OUTPUT INSERTED.id
        VALUES
          (${params.length ? params.join(', ') + ',' : ''} @userId, @status, CASE WHEN @status = 'Submitted' THEN GETDATE() ELSE NULL END);
      `);
      rowId = inserted.recordset[0].id;
    }

    // Count a response once, when it first becomes Submitted.
    const firstSubmit = newStatus === 'Submitted' && (!prior || prior.submission_status !== 'Submitted');
    if (firstSubmit) {
      await transaction.request()
        .input('id', sql.Int, formId)
        .query(`UPDATE mmt_form_definitions SET submission_count = ISNULL(submission_count, 0) + 1 WHERE id = @id;`);
    }

    const uid = await transaction.request()
      .input('rowId', sql.Int, rowId)
      .query(`SELECT submission_uid FROM [${form.table_name}] WHERE id = @rowId;`);
    const submissionUid = String(uid.recordset[0].submission_uid).toUpperCase();

    // Map each upload to (uid, field); a replaced file is removed after commit.
    const replacedFiles = [];
    for (const [fieldId, u] of uploadsByField) {
      const mapReq = transaction.request()
        .input('uid', sql.NVarChar(100), submissionUid)
        .input('field', sql.NVarChar(sql.MAX), fieldId)
        .input('fileName', sql.NVarChar(sql.MAX), originalNameOf(u))
        .input('uniqueName', sql.VarChar(sql.MAX), u.filename);
      const old = await mapReq.query(`
        SELECT unique_file_name FROM ${FILE_MAPPING} WITH (UPDLOCK, HOLDLOCK)
        WHERE uid = @uid AND field_name = @field;
      `);
      if (old.recordset.length) {
        replacedFiles.push(...old.recordset.map((r) => storedFilePath(r.unique_file_name)));
        await mapReq.query(`
          UPDATE ${FILE_MAPPING} SET file_name = @fileName, unique_file_name = @uniqueName
          WHERE uid = @uid AND field_name = @field;
        `);
      } else {
        await mapReq.query(`
          INSERT INTO ${FILE_MAPPING} (id, uid, field_name, file_name, unique_file_name)
          VALUES (NEWID(), @uid, @field, @fileName, @uniqueName);
        `);
      }
    }

    await transaction.commit();
    res.locals.fbKeepUploads = true;
    await removeFiles(replacedFiles);
    res.status(prior ? 200 : 201).json({
      id: rowId,
      submissionUid,
      status: newStatus === 'Draft' ? 'Draft Saved' : 'Submitted',
      message: newStatus === 'Draft' ? 'Draft saved' : (prior && prior.submission_status === 'Submitted' ? 'Response updated' : 'Form submitted'),
    });
  } catch (err) {
    await rollbackQuietly(transaction);
    console.error('submitFormData error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// ---------- GET /get-my-form-response/:formId ----------
// The caller's own saved response (draft or submitted), so the fill form can be
// reopened with its earlier answers. Only ever returns the caller's row.
async function getMyFormResponse(req, res) {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }
  const formId = Number(req.params.formId);
  if (!Number.isInteger(formId) || formId <= 0) {
    return res.status(400).json({ message: 'Invalid form id' });
  }

  try {
    const conn = await pool;
    const lookup = await conn.request()
      .input('id', sql.Int, formId)
      .query(`SELECT table_name, form_fields FROM mmt_form_definitions WHERE id = @id;`);
    if (lookup.recordset.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    const form = lookup.recordset[0];
    if (!isSafeIdentifier(form.table_name)) {
      return res.status(500).json({ message: 'Stored table name failed safety check' });
    }

    const dataFields = toClientFields(form.form_fields).filter((f) => f.columnName && isSafeIdentifier(f.columnName));
    const columnList = dataFields.map((f) => `[${f.columnName}]`).join(', ');
    const result = await conn.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT TOP 1 ${columnList ? columnList + ',' : ''} submission_uid, submission_status
        FROM [${form.table_name}]
        WHERE submitted_by = @userId
        ORDER BY CASE WHEN submission_status = 'Submitted' THEN 0 ELSE 1 END, updated_date DESC;
      `);

    const row = result.recordset[0];
    if (!row) {
      return res.json({ status: 'Pending', submissionUid: null, values: {} });
    }
    const values = {};
    for (const f of dataFields) {
      const v = fromColumnValue(f.inputType, row[f.columnName]);
      if (v !== null) values[f.id] = v;
    }
    const files = await conn.request()
      .input('uid', sql.NVarChar(100), String(row.submission_uid).toUpperCase())
      .query(`SELECT field_name, file_name FROM ${FILE_MAPPING} WHERE uid = @uid;`);
    for (const fr of files.recordset) values[fr.field_name] = { fileName: fr.file_name };
    res.json({
      status: row.submission_status === 'Submitted' ? 'Submitted' : 'Draft Saved',
      submissionUid: row.submission_uid,
      values,
    });
  } catch (err) {
    console.error('getMyFormResponse error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// ---------- DELETE /delete-form-builder-data/:data ----------
// Same rule as Sagarmanthan 2.0: deleting a form always goes through and removes its
// submissions with it (the confirm dialog warns about this). Unlike 2.0, the definition
// row and its tbl_fb_<id> table go together in one transaction, and the table name is the
// stored server-generated one, never derived from request text.
async function deleteForm(req, res) {
  const formId = Number(req.params.data);
  if (!Number.isInteger(formId) || formId <= 0) {
    return res.status(400).json({ message: 'Invalid form id' });
  }

  let transaction;
  try {
    const conn = await pool;
    transaction = new sql.Transaction(conn);
    await transaction.begin();

    const lookup = await transaction.request()
      .input('id', sql.Int, formId)
      .query(`SELECT form_name, table_name, created_by FROM mmt_form_definitions WITH (UPDLOCK, HOLDLOCK) WHERE id = @id;`);
    if (lookup.recordset.length === 0) {
      await rollbackQuietly(transaction);
      return res.status(404).json({ message: 'Form not found' });
    }
    if (!canAuthor(scopeOf(req.user))) {
      await rollbackQuietly(transaction);
      return res.status(403).json({ message: AUTHOR_DENIED });
    }
    const { form_name: formName, table_name: tableName } = lookup.recordset[0];
    if (!isSafeIdentifier(tableName)) {
      await rollbackQuietly(transaction);
      return res.status(500).json({ message: 'Stored table name failed safety check' });
    }

    let deletedResponses = 0;
    let deletedFiles = [];
    const exists = await transaction.request()
      .input('t', sql.NVarChar(128), tableName)
      .query(`SELECT OBJECT_ID(@t, 'U') AS oid;`);
    if (exists.recordset[0].oid !== null) {
      // Exclusive lock so no submission lands between the count and the drop.
      const counted = await transaction.request()
        .query(`SELECT COUNT(*) AS n FROM [${tableName}] WITH (TABLOCKX, HOLDLOCK);`);
      deletedResponses = counted.recordset[0].n;
      // The form's uploaded files go with it: mapping rows now, files after commit.
      const fileRows = await transaction.request().query(`
        DELETE m
        OUTPUT DELETED.unique_file_name
        FROM ${FILE_MAPPING} m
        INNER JOIN [${tableName}] s ON m.uid = CONVERT(NVARCHAR(100), s.submission_uid);
      `);
      deletedFiles = fileRows.recordset.map((r) => storedFilePath(r.unique_file_name));
      await transaction.request().query(`DROP TABLE [${tableName}];`);
    }

    await transaction.request()
      .input('id', sql.Int, formId)
      .query(`DELETE FROM mmt_form_definitions WHERE id = @id;`);

    await transaction.commit();
    await removeFiles(deletedFiles);
    res.json({ id: formId, formName, deletedResponses, deletedFiles: deletedFiles.length, message: 'Form deleted successfully' });
  } catch (err) {
    await rollbackQuietly(transaction);
    console.error('deleteForm error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// ---------- POST /toggle-form-status/:formId ----------
// The Directory ON/OFF switch. Body: { active: true | false }. Returns the resulting
// badge status, which is Overdue (not Active) when switched ON past the due date.
async function toggleFormStatus(req, res) {
  const formId = Number(req.params.formId);
  if (!Number.isInteger(formId) || formId <= 0) {
    return res.status(400).json({ message: 'Invalid form id' });
  }
  const active = req.body?.active;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ message: 'active must be true or false' });
  }

  try {
    const conn = await pool;
    const owner = await conn.request()
      .input('id', sql.Int, formId)
      .query(`SELECT created_by FROM mmt_form_definitions WHERE id = @id;`);
    if (owner.recordset.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    if (!canAuthor(scopeOf(req.user))) {
      return res.status(403).json({ message: AUTHOR_DENIED });
    }
    const result = await conn.request()
      .input('id', sql.Int, formId)
      .input('active_status', sql.NVarChar(10), active ? '1' : '0')
      .query(`
        UPDATE d
        SET active_status = @active_status, updated_date = GETDATE()
        OUTPUT INSERTED.active_status,
               CASE WHEN INSERTED.due_date < ${TODAY_IST_SQL} THEN 1 ELSE 0 END AS is_past_due
        FROM mmt_form_definitions d
        WHERE d.id = @id;
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    const row = result.recordset[0];
    const status = formStatus(row.active_status, row.is_past_due === 1);
    res.json({
      id: formId,
      isActive: row.active_status === '1',
      status,
      message: status === 'Overdue'
        ? 'Form switched ON, but its due date has passed, so it stays closed until the due date is extended'
        : `Form switched ${active ? 'ON' : 'OFF'}`,
    });
  } catch (err) {
    console.error('toggleFormStatus error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// ---------- POST /clone-form/:formId ----------
// Copies a form's fields and settings (description, due date, organisations, wings,
// ON/OFF) into a new form with its own empty table. Unlike 2.0, submissions are not
// copied and the person cloning becomes the creator. Named "<name> (Copy)", then
// "(Copy 2)", "(Copy 3)"... if that name is taken.
async function cloneForm(req, res) {
  if (!canAuthor(scopeOf(req.user))) {
    return res.status(403).json({ message: AUTHOR_DENIED });
  }
  const sourceId = Number(req.params.formId);
  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    return res.status(400).json({ message: 'Invalid form id' });
  }

  let transaction;
  try {
    const conn = await pool;
    transaction = new sql.Transaction(conn);
    await transaction.begin();

    // Ministry users may clone any form; the copy becomes theirs.
    const lookup = await bindVisibility(transaction.request(), req.user)
      .input('id', sql.Int, sourceId)
      .query(`
        ${DECLARE_CALLER_ASSIGNMENT_SQL}
        SELECT d.form_name, d.form_description, d.due_date, d.organisation, d.wing, d.division, d.active_status, d.form_fields
        FROM mmt_form_definitions d
        WHERE d.id = @id AND ${visibleFormsSql(scopeOf(req.user))};
      `);
    if (lookup.recordset.length === 0) {
      await rollbackQuietly(transaction);
      return res.status(404).json({ message: 'Form not found' });
    }
    const source = lookup.recordset[0];

    let storedFields = [];
    try { storedFields = JSON.parse(source.form_fields || '[]'); } catch { storedFields = []; }
    const { error, storableFields } = normalizeFields(storedFields);
    if (error) {
      await rollbackQuietly(transaction);
      return res.status(409).json({ message: `This form can't be cloned: ${error}` });
    }

    // Pick the first free "(Copy)" / "(Copy N)" name. Compared in JS, so the form
    // name never goes into a LIKE pattern.
    const base = `${source.form_name} (Copy`;
    const taken = await transaction.request()
      .input('base', sql.NVarChar(255), base)
      .query(`SELECT form_name FROM mmt_form_definitions WHERE LEFT(form_name, LEN(@base)) = @base;`);
    const takenNames = new Set(taken.recordset.map((r) => r.form_name));
    let formName = `${base})`;
    for (let n = 2; takenNames.has(formName); n++) formName = `${base} ${n})`;

    const { formId, tableName } = await insertFormWithTable(transaction, {
      formName,
      meta: {
        formDescription: source.form_description,
        formDueDate: source.due_date,
        organisation: source.organisation,
        wing: source.wing,
        division: source.division,
        activeStatus: source.active_status,
      },
      storableFields,
      createdBy: Number(req.user?.userId) || null,
      copyAssignmentsFrom: sourceId,
    });

    await transaction.commit();
    res.status(201).json({ id: formId, tableName, formName, message: `Cloned as "${formName}"` });
  } catch (err) {
    await rollbackQuietly(transaction);
    console.error('cloneForm error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// ---------- GET /download-form-file/:submissionUid/:fieldId ----------
// Streams an uploaded file as a download (never rendered inline), under its original name.
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ministry users may download any file. Organisation users may download a file if it is
// on their own response, or on a submitted response from their own organisation to a
// form they can see.
async function canDownload(conn, user, submissionUid) {
  const scope = scopeOf(user);
  if (scope.isWide) return true;
  if (!scope.isOrganisation) return false;

  const visible = await bindVisibility(conn.request(), user).query(`
    ${DECLARE_CALLER_ASSIGNMENT_SQL}
    SELECT d.id, d.table_name, d.created_by FROM mmt_form_definitions d WHERE ${visibleFormsSql(scope)};
  `);
  const forms = visible.recordset.filter((f) => isSafeIdentifier(f.table_name));
  if (!forms.length) return false;

  const unions = forms.map((f) => `
    SELECT ${Number(f.id)} AS form_id, s.submitted_by, s.submission_status, u.organisation_id
    FROM [${f.table_name}] s LEFT JOIN tbl_user u ON u.user_id = s.submitted_by
    WHERE s.submission_uid = @uid`).join('\n    UNION ALL');
  const found = await conn.request()
    .input('uid', sql.UniqueIdentifier, submissionUid)
    .query(unions);
  const row = found.recordset[0];
  if (!row) return false;
  const form = forms.find((f) => f.id === row.form_id);
  return row.submitted_by === scope.userId
    || (row.submission_status === 'Submitted' && row.organisation_id === scope.organisationId);
}

async function downloadFormFile(req, res) {
  const { submissionUid, fieldId } = req.params;
  if (!GUID_RE.test(String(submissionUid)) || !/^file_\d+$/.test(String(fieldId))) {
    return res.status(400).json({ message: 'Invalid file reference' });
  }

  try {
    const conn = await pool;
    const result = await conn.request()
      .input('uid', sql.NVarChar(100), String(submissionUid).toUpperCase())
      .input('field', sql.NVarChar(sql.MAX), fieldId)
      .query(`SELECT TOP 1 file_name, unique_file_name FROM ${FILE_MAPPING} WHERE uid = @uid AND field_name = @field;`);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (!(await canDownload(conn, req.user, submissionUid))) {
      return res.status(404).json({ message: 'File not found' });
    }
    const { file_name: fileName, unique_file_name: uniqueName } = result.recordset[0];
    const filePath = storedFilePath(uniqueName);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', attachmentHeader(fileName));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('downloadFormFile error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Internal Server Error' });
  }
}

// ---------- Studio drafts: GET /get-form-drafts, POST /save-form-draft, DELETE /delete-form-draft/:id ----------
// Unpublished form designs, private to the person who saved them. Stored as the Studio's
// own JSON (name, description, due date, assignment, fields): nothing queries inside a
// draft, and it only becomes a real table when published.
const MAX_DRAFT_BYTES = 1024 * 1024;

function draftFromRow(row) {
  let draft = {};
  try { draft = JSON.parse(row.draft_json || '{}'); } catch { draft = {}; }
  return { ...draft, id: row.id, updatedDate: formatDateTime(row.updated_date) };
}

async function getFormDrafts(req, res) {
  if (!canAuthor(scopeOf(req.user))) {
    return res.status(403).json({ message: AUTHOR_DENIED });
  }
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }
  try {
    const conn = await pool;
    const result = await conn.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id, draft_json, updated_date FROM mmt_form_drafts
        WHERE created_by = @userId
        ORDER BY updated_date DESC, id DESC;
      `);
    res.json(result.recordset.map(draftFromRow));
  } catch (err) {
    console.error('getFormDrafts error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Body: { draftId?, draft }. With draftId, updates that draft (only if it's the caller's).
async function saveFormDraft(req, res) {
  if (!canAuthor(scopeOf(req.user))) {
    return res.status(403).json({ message: AUTHOR_DENIED });
  }
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }
  const draft = req.body?.draft;
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return res.status(400).json({ message: 'draft must be an object' });
  }
  const draftName = String(draft.formName || '').trim();
  if (!draftName) {
    return res.status(400).json({ message: 'Please enter a Form Name to save as draft' });
  }
  if (draftName.length > 255) {
    return res.status(400).json({ message: 'Form Name is too long (max 255 characters)' });
  }
  if (draft.fields !== undefined && !Array.isArray(draft.fields)) {
    return res.status(400).json({ message: 'fields must be a list' });
  }
  // Only the Studio's own keys are kept, so a draft can't smuggle in an id or owner.
  const { formName, formDescription, dueDate, assignType, selectedWings, selectedOrgIds, activeStatus, fields } = draft;
  const json = JSON.stringify({ formName: draftName, formDescription, dueDate, assignType, selectedWings, selectedOrgIds, activeStatus, fields: fields || [] });
  if (Buffer.byteLength(json, 'utf8') > MAX_DRAFT_BYTES) {
    return res.status(413).json({ message: 'This draft is too large to save' });
  }

  const rawId = req.body?.draftId;
  const hasId = rawId !== undefined && rawId !== null && rawId !== '';
  const draftId = Number(rawId);
  if (hasId && (!Number.isInteger(draftId) || draftId <= 0)) {
    return res.status(400).json({ message: 'Invalid draft id' });
  }

  try {
    const conn = await pool;
    const request = conn.request()
      .input('userId', sql.Int, userId)
      .input('name', sql.NVarChar(255), draftName)
      .input('json', sql.NVarChar(sql.MAX), json);
    let result;
    if (hasId) {
      result = await request.input('id', sql.Int, draftId).query(`
        UPDATE mmt_form_drafts
        SET draft_name = @name, draft_json = @json, updated_date = GETDATE()
        OUTPUT INSERTED.id, INSERTED.draft_json, INSERTED.updated_date
        WHERE id = @id AND created_by = @userId;
      `);
      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Draft not found' });
      }
    } else {
      result = await request.query(`
        INSERT INTO mmt_form_drafts (draft_name, draft_json, created_by)
        OUTPUT INSERTED.id, INSERTED.draft_json, INSERTED.updated_date
        VALUES (@name, @json, @userId);
      `);
    }
    res.status(hasId ? 200 : 201).json({ draft: draftFromRow(result.recordset[0]), message: `Draft "${draftName}" saved` });
  } catch (err) {
    console.error('saveFormDraft error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function deleteFormDraft(req, res) {
  if (!canAuthor(scopeOf(req.user))) {
    return res.status(403).json({ message: AUTHOR_DENIED });
  }
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }
  const draftId = Number(req.params.draftId);
  if (!Number.isInteger(draftId) || draftId <= 0) {
    return res.status(400).json({ message: 'Invalid draft id' });
  }
  try {
    const conn = await pool;
    const result = await conn.request()
      .input('id', sql.Int, draftId)
      .input('userId', sql.Int, userId)
      .query(`DELETE FROM mmt_form_drafts OUTPUT DELETED.id WHERE id = @id AND created_by = @userId;`);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Draft not found' });
    }
    res.json({ id: draftId, message: 'Draft deleted' });
  } catch (err) {
    console.error('deleteFormDraft error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

const formBuilderController = {
  modifyFormBuilderInputForm, getCreatedFormData, getFormSubmissions, getInboxForms, submitFormData,
  getMyFormResponse, deleteForm, toggleFormStatus, cloneForm, downloadFormFile,
  getFormDrafts, saveFormDraft, deleteFormDraft,
};
export default formBuilderController;
