/**
 * KPI Major Ports — Port Performance: Dwell Time uploaded from Excel by the Ministry.
 *
 * Mirrors backend/src/controllers/KPI/dwellTimeSheet.js (the server checks every rule again
 * on upload and on save). This file adds the wording users see before and after uploading.
 */

export const DWELL_MAX_HOURS = 10000;
export const DWELL_MAX_FILE_MB = 2;
export const DWELL_FILE_EXTENSIONS = ['.xlsx', '.xls'];

export const DWELL_VALUE_GROUPS = [
  {
    title: 'Monthly',
    columns: [
      { key: 'monthly_import', label: 'Import', fullLabel: 'Monthly Import' },
      { key: 'monthly_export', label: 'Export', fullLabel: 'Monthly Export' },
      { key: 'monthly_overall', label: 'Overall', fullLabel: 'Monthly Overall' },
    ],
  },
  {
    title: 'Year to Date (YTD)',
    columns: [
      { key: 'ytd_import', label: 'Import', fullLabel: 'YTD Import' },
      { key: 'ytd_export', label: 'Export', fullLabel: 'YTD Export' },
      { key: 'ytd_overall', label: 'Overall', fullLabel: 'YTD Overall' },
    ],
  },
];

export const DWELL_VALUE_COLUMNS = DWELL_VALUE_GROUPS.flatMap((g) => g.columns);

/** What the upload checks, shown to users before they upload (same order as the server). */
export const DWELL_UPLOAD_RULES = [
  `Excel file only (.xlsx or .xls), up to ${DWELL_MAX_FILE_MB} MB. Only the first sheet is read; download the template for the right layout.`,
  'Title row above the headings: "Dwell Time (in hrs.) - <Month> <Year>", and the month must be the one selected here.',
  'Column headings in this order: Sr. No., Port, Monthly Import, Monthly Export, Monthly Overall, YTD Import, YTD Export, YTD Overall.',
  'Every major port, the "SMPA Overall" row and the "All Major Ports (Overall)" row must be present exactly once. Keep the port names as in the template; extra spaces, capital letters and dash styles are ignored.',
  `Values are hours: numbers from 0 to ${DWELL_MAX_HOURS.toLocaleString('en-IN')}. More than 2 decimals are rounded.`,
  'Use "-" or leave the cell blank when a port has no data. It is saved as "no data", not as 0.',
  'Overall must lie between Import and Export, for both the month and the YTD.',
  'Months that have not started cannot be uploaded. Uploading a month again replaces it after you confirm.',
  'All rows are checked before anything is saved: if any check fails, nothing is saved.',
];

/** Error text for a chosen file (type and size), or null. */
export function checkDwellFile(file) {
  if (!file) return 'Choose the Excel file to upload.';
  const name = String(file.name || '').toLowerCase();
  if (!DWELL_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return `Only Excel files (${DWELL_FILE_EXTENSIONS.join(' or ')}) can be uploaded.`;
  }
  if (file.size > DWELL_MAX_FILE_MB * 1024 * 1024) return `The file is larger than ${DWELL_MAX_FILE_MB} MB.`;
  if (!file.size) return 'The file is empty.';
  return null;
}

// ---------------------------------------------------------------------------
// Edit form values
// ---------------------------------------------------------------------------

/** Error text for one value, or null. Blank means "no data" and is allowed. */
export function validateDwellValue(raw) {
  const text = String(raw ?? '').trim();
  if (text === '' || text === '-') return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return 'Enter a number';
  if (n < 0) return 'Cannot be negative';
  if (n > DWELL_MAX_HOURS) return `At most ${DWELL_MAX_HOURS.toLocaleString('en-IN')}`;
  return null;
}

const toNumber = (raw) => {
  const text = String(raw ?? '').trim();
  return text === '' || text === '-' ? null : Number(text);
};

/** { [columnKey]: message } for one row: number format first, then Overall between Import and Export. */
export function validateDwellRow(values) {
  const errors = {};
  DWELL_VALUE_COLUMNS.forEach((c) => {
    const err = validateDwellValue(values[c.key]);
    if (err) errors[c.key] = err;
  });
  if (Object.keys(errors).length) return errors;
  DWELL_VALUE_GROUPS.forEach((g) => {
    const [imp, exp, overall] = g.columns.map((c) => toNumber(values[c.key]));
    if (imp === null || exp === null || overall === null) return;
    // 0.01 leeway for rounding, as on the server
    if (overall < Math.min(imp, exp) - 0.01 || overall > Math.max(imp, exp) + 0.01) {
      errors[g.columns[2].key] = 'Must be between Import and Export';
    }
  });
  return errors;
}

/** Server values ({ key: number | null }) as form text. */
export const toDwellFormValues = (values = {}) =>
  Object.fromEntries(DWELL_VALUE_COLUMNS.map((c) => [c.key, values[c.key] === null || values[c.key] === undefined ? '' : String(values[c.key])]));

/** Request values of one row: { key: number | null } ("-" and blank become null). */
export const toDwellPayload = (values) =>
  Object.fromEntries(DWELL_VALUE_COLUMNS.map((c) => [c.key, toNumber(values[c.key])]));