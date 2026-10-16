// Shared helpers for the Form Builder controller.
//
// Security note: table and column names in the dynamically-created
// per-form submission tables are NEVER derived from user-typed text
// (field labels, form names), not even sanitized -- they are purely
// positional/generated identifiers. This sidesteps the SQL-injection
// risk present in the legacy 2.0 formBuilderV1.js implementation
// (which built column names via `field.inputLabel.replace(/\s+/g, '_')`
// and interpolated them directly into CREATE TABLE DDL), by never
// giving user input a path to a SQL identifier at all. Labels are
// stored purely as display metadata in form_fields JSON.

const SAFE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

export function isSafeIdentifier(name) {
  return typeof name === 'string' && SAFE_IDENTIFIER_RE.test(name);
}

// Generates a submissions table name for a new form: tbl_fb_<id>. Using the
// form's own (already-known, numeric, server-generated) primary key as the
// suffix guarantees uniqueness and safety without touching user input at all.
export function buildTableName(formId) {
  const n = Number(formId);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error('buildTableName requires a positive integer form id');
  }
  const name = `tbl_fb_${n}`;
  if (!isSafeIdentifier(name)) {
    // Should be unreachable given the numeric-only construction above,
    // but checked explicitly since this value ends up in DDL.
    throw new Error('Generated table name failed safety check');
  }
  return name;
}

// Generates a positional column name for the Nth field (1-indexed) of a
// form. The field's real label lives only in form_fields JSON metadata.
export function buildColumnName(index) {
  const n = Number(index);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error('buildColumnName requires a positive integer index');
  }
  return `field_${n}`;
}

// Maps a Sagarmanthan form-builder input type to a SQL Server column type.
// 'file' is intentionally excluded -- file fields are never stored as a
// column; they are tracked separately via tbl_form_Builder_fileMapping.
const INPUT_TYPE_TO_SQL_TYPE = {
  text: 'NVARCHAR(MAX)',
  email: 'NVARCHAR(320)',
  number: 'INT',
  float: 'DECIMAL(18,2)',
  phone: 'NVARCHAR(20)',
  password: 'NVARCHAR(255)',
  date: 'DATE',
  textarea: 'NVARCHAR(MAX)',
  checkbox: 'BIT',
  radio: 'NVARCHAR(255)',
  state: 'NVARCHAR(100)',
  district: 'NVARCHAR(100)',
  'MP-Constituency': 'NVARCHAR(255)',
  dropdown: 'NVARCHAR(255)',
  'multiple-select': 'NVARCHAR(MAX)', // JSON-encoded array of selected options
};

export function sqlTypeForInputType(inputType) {
  return INPUT_TYPE_TO_SQL_TYPE[inputType] || null;
}

export const STORABLE_INPUT_TYPES = Object.keys(INPUT_TYPE_TO_SQL_TYPE);
