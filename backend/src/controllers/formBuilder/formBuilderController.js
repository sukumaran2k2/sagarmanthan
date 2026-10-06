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
    insertReq.input('created_by', sql.Int, Number(meta.userID) || null);
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

const formBuilderController = { modifyFormBuilderInputForm, getCreatedFormData, getFormSubmissions };
export default formBuilderController;
