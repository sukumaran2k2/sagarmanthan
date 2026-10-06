import sql from 'mssql';
import { pool } from '../../db.js';
import {
  buildTableName,
  buildColumnName,
  sqlTypeForInputType,
  STORABLE_INPUT_TYPES,
  isSafeIdentifier,
} from './formBuilderUtils.js';

// ---------- shared helpers ----------

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
    CREATE INDEX idx_submission_status ON [${tableName}] (submission_status);
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

  const rawId = req.body.formId;
  const hasFormId = rawId !== undefined && rawId !== null && rawId !== '';
  if (hasFormId) {
    return updateForm(req, res, { formName, meta, storableFields });
  }
  return createForm(req, res, { formName, meta, storableFields });
}

async function createForm(req, res, { formName, meta, storableFields }) {
  let transaction;
  try {
    const conn = await pool;
    transaction = new sql.Transaction(conn);
    await transaction.begin();

    const insertReq = bindMetadata(transaction.request(), formName, meta);
    // Creator comes from the verified token, never from the request body.
    insertReq.input('created_by', sql.Int, Number(req.user?.userId) || null);
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
        SELECT table_name, form_fields
        FROM mmt_form_definitions WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @id;
      `);
    if (lookup.recordset.length === 0) {
      await rollbackQuietly(transaction);
      return res.status(404).json({ message: 'Form not found' });
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
    const result = await conn.request().query(`
      SELECT id, form_name, form_description, due_date, organisation, wing, active_status, submission_count, form_fields
      FROM mmt_form_definitions
      ORDER BY created_date DESC;
    `);

    const forms = result.recordset.map((row) => {
      let fields = [];
      try {
        const parsed = JSON.parse(row.form_fields || '[]');
        fields = parsed.map((f) => ({
          id: f.columnName || f.inputLabel,
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
        status: row.active_status === '1' ? 'Active' : 'Inactive',
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
  return parsed.map((f) => ({
    id: f.columnName || f.inputLabel,
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

const formatDateTime = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : null);

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
    const lookup = await conn.request()
      .input('id', sql.Int, formId)
      .query(`
        SELECT id, form_name, table_name, form_fields, organisation
        FROM mmt_form_definitions
        WHERE id = @id;
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

    const rows = await conn.request().query(`
      SELECT s.id, s.submission_uid, s.submitted_by, s.submitted_date,
             ${columnList ? columnList + ',' : ''}
             u.name AS submitter_name, u.designation AS submitter_designation,
             o.organisation_name, o.organisation_code
      FROM [${form.table_name}] s
      LEFT JOIN tbl_user u ON u.user_id = s.submitted_by
      LEFT JOIN mmt_organisation o ON o.organisation_id = u.organisation_id
      WHERE s.submission_status = 'Submitted'
      ORDER BY s.submitted_date DESC, s.id DESC;
    `);

    const submissions = rows.recordset.map((r) => {
      const data = {};
      for (const f of dataFields) data[f.id] = fromColumnValue(f.inputType, r[f.columnName]);
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
    const respondedOrganisations = new Set(submissions.map((s) => s.organisationCode).filter(Boolean));
    const distinctSubmitters = new Set(rows.recordset.map((r) => r.submitted_by).filter((v) => v != null));

    res.json({
      form: { id: form.id, formName: form.form_name, fields },
      submissions,
      stats: {
        totalSubmissions: submissions.length,
        distinctSubmitters: distinctSubmitters.size,
        assignedOrganisations: assignedOrganisations.length,
        respondedOrganisations: assignedOrganisations.filter((c) => respondedOrganisations.has(c)).length,
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

// True when form row `d` is assigned to the caller. Assignment lists are stored as CSV and
// wing names can contain commas ("DGLL, Parliament & TRW"), so this matches the whole
// delimited name rather than splitting (which also keeps SMPA from matching SMPA-KDS).
const ASSIGNED_TO_CALLER_SQL = `(
  (@orgCode IS NOT NULL AND CHARINDEX(',' + @orgCode + ',', ',' + ISNULL(d.organisation, '') + ',') > 0)
  OR (@wingName IS NOT NULL AND CHARINDEX(',' + @wingName + ',', ',' + ISNULL(d.wing, '') + ',') > 0)
)`;

const bindCallerAssignment = (request, user) => request
  .input('orgId', sql.Int, Number(user?.organisationId) || null)
  .input('wingId', sql.Int, Number(user?.wingId) || null);

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
        WHERE d.active_status = '1'
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
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
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
      // Round-trip check: Date quietly rolls 2027-02-30 over to 2027-03-02.
      const parsed = DATE_RE.test(d) ? new Date(`${d}T00:00:00Z`) : null;
      if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== d) {
        return { error: `${label} must be a valid date` };
      }
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
async function submitFormData(req, res) {
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
  const values = req.body?.values;
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
               CASE WHEN ${ASSIGNED_TO_CALLER_SQL} THEN 1 ELSE 0 END AS is_assigned
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
    if (form.active_status !== '1') {
      await rollbackQuietly(transaction);
      return res.status(409).json({ message: 'This form is not accepting responses' });
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
        SELECT TOP 1 id, submission_status
        FROM [${form.table_name}] WITH (UPDLOCK, HOLDLOCK)
        WHERE submitted_by = @userId
        ORDER BY CASE WHEN submission_status = 'Submitted' THEN 0 ELSE 1 END, updated_date DESC;
      `);
    const prior = existing.recordset[0];

    if (prior && prior.submission_status === 'Submitted' && action === 'draft') {
      await rollbackQuietly(transaction);
      return res.status(409).json({ message: 'This response has already been submitted. Submit again to update it.' });
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

    await transaction.commit();
    res.status(prior ? 200 : 201).json({
      id: rowId,
      submissionUid: uid.recordset[0].submission_uid,
      status: newStatus === 'Draft' ? 'Draft Saved' : 'Submitted',
      message: newStatus === 'Draft' ? 'Draft saved' : (prior && prior.submission_status === 'Submitted' ? 'Response updated' : 'Form submitted'),
    });
  } catch (err) {
    await rollbackQuietly(transaction);
    console.error('submitFormData error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

const formBuilderController = { modifyFormBuilderInputForm, getCreatedFormData, getFormSubmissions, getInboxForms, submitFormData };
export default formBuilderController;
