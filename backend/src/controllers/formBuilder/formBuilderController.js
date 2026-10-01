import sql from 'mssql';
import { pool } from '../../db.js';
import { buildTableName, buildColumnName, sqlTypeForInputType, STORABLE_INPUT_TYPES } from './formBuilderUtils.js';

// POST /modify-form-builder-input-form
// NOTE: the current frontend (FormBuilderStudio.jsx) never sends an
// existing form's id in this payload -- not even when editing (formToEdit
// is used only to pre-fill the Studio's local state). There is currently
// no reliable way to distinguish "editing form X" from "creating a new
// form" from this payload alone, and the frontend's Edit button is itself
// a no-op right now. So this always creates a new form. Once the frontend
// sends a real formId for edits, add an update branch keyed on that id.
async function modifyFormBuilderInputForm(req, res) {
  let transaction;
  try {
    const { formFields, mmtData } = req.body;
    const meta = Array.isArray(mmtData) ? mmtData[0] : mmtData;

    if (!meta) {
      return res.status(400).json({ message: 'mmtData is required' });
    }
    if (!Array.isArray(formFields) || formFields.length === 0) {
      return res.status(400).json({ message: 'At least one field is required' });
    }

    // formName comes from the frontend as part of the top-level payload in
    // some callers and is also implied by formattedFormId; mmtData does not
    // carry it, so accept it directly off the body.
    const formName = String(req.body.formName || req.body.formattedFormId || '').trim();
    if (!formName) {
      return res.status(400).json({ message: 'Form name is required' });
    }

    // Validate every field's type up front, before touching the DB at all.
    const storableFields = [];
    for (let i = 0; i < formFields.length; i++) {
      const f = formFields[i];
      const inputType = String(f?.inputType || '');
      const isFile = inputType === 'file';
      if (!isFile && !STORABLE_INPUT_TYPES.includes(inputType)) {
        return res.status(400).json({ message: `Unsupported field type: ${inputType || '(blank)'}` });
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

    const conn = await pool;
    transaction = new sql.Transaction(conn);
    await transaction.begin();

    const toCSV = (v) => (Array.isArray(v) ? v.filter(Boolean).join(',') : (v || ''));

    // 1. Insert the metadata row first so we get a real, server-generated id
    //    to build a safe table name from. form_fields/table_name are filled
    //    in by the UPDATE once we know the id.
    const insertReq = transaction.request();
    insertReq.input('form_name', sql.NVarChar, formName);
    insertReq.input('form_description', sql.NVarChar(sql.MAX), meta.formDescription || '');
    insertReq.input('due_date', sql.Date, meta.formDueDate || null);
    insertReq.input('organisation', sql.NVarChar(sql.MAX), toCSV(meta.organisation));
    insertReq.input('wing', sql.NVarChar(sql.MAX), toCSV(meta.wing));
    insertReq.input('division', sql.NVarChar(sql.MAX), toCSV(meta.division));
    insertReq.input('active_status', sql.NVarChar(10), String(meta.activeStatus ?? '1'));
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

    // 2. Assign each storable field a positional, never-user-derived column
    //    name, and build the DDL for the dynamic submissions table.
    const columnDefs = [];
    const fieldsForJson = storableFields.map((f, i) => {
      if (f.isFile) {
        return { ...f, columnName: null };
      }
      const columnName = buildColumnName(i + 1);
      const sqlType = sqlTypeForInputType(f.inputType);
      columnDefs.push(`[${columnName}] ${sqlType} NULL`);
      return { ...f, columnName };
    });

    const ddlRequest = transaction.request();
    await ddlRequest.query(`
      CREATE TABLE [${tableName}] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        submission_uid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        ${columnDefs.length ? columnDefs.join(',\n        ') + ',' : ''}
        submitted_by INT NULL,
        submission_status NVARCHAR(20) NOT NULL DEFAULT 'Draft',
        submitted_date DATETIME NULL,
        updated_date DATETIME NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX idx_submitted_by ON [${tableName}] (submitted_by);
      CREATE INDEX idx_submission_status ON [${tableName}] (submission_status);
    `);

    // 3. Now that the table exists, record its name and the full field
    //    metadata (labels + safe column names) on the definition row.
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
    if (transaction) {
      try { await transaction.rollback(); } catch {}
    }
    console.error('modifyFormBuilderInputForm error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

const formBuilderController = { modifyFormBuilderInputForm };
export default formBuilderController;
