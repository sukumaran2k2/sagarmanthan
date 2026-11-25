/**
 * KPI Major Ports — Port Performance: Dwell Time uploaded from Excel by the Ministry.
 *
 * Mirrors backend/src/controllers/KPI/dwellTimeSheet.js (the server checks every rule again
 * on preview and on save). This file adds the wording users see before and after uploading,
 * and the columns shown in the upload preview and in the organisation's view-only step.
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

const NO_DATA_TOKENS = new Set(['', '-', 'na', 'n/a', 'nil', 'none']);
// Rounding of the overall figure may put it a hair outside import..export (same as the server)
const OVERALL_TOLERANCE = 0.01;

/** One typed value (hours): { value } (null = no data) or { error }. Same rules as the upload. */
export function parseDwellHours(raw) {
  const text = String(raw ?? '').trim().toLowerCase();
  if (NO_DATA_TOKENS.has(text)) return { value: null };
  const plain = text.replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(plain)) return { error: plain.startsWith('-') ? 'cannot be negative' : 'is not a number' };
  const n = Number(plain);
  if (n > DWELL_MAX_HOURS) return { error: `is more than ${DWELL_MAX_HOURS.toLocaleString('en-IN')} hours` };
  return { value: Math.round(n * 100) / 100 };
}

/**
 * Checks one row of typed values ({ monthly_import: '12.5', ... }).
 * Returns { values, cellErrors: { key: message } }; an Overall outside Import..Export is
 * reported on the Overall cell.
 */
export function checkDwellRow(rawValues) {
  const values = {};
  const cellErrors = {};
  DWELL_VALUE_COLUMNS.forEach((c) => {
    const result = parseDwellHours(rawValues[c.key]);
    if (result.error) cellErrors[c.key] = `${c.fullLabel} ${result.error}`;
    values[c.key] = result.value ?? null;
  });
  if (!Object.keys(cellErrors).length) {
    DWELL_VALUE_GROUPS.forEach((g) => {
      const [imp, exp, overall] = g.columns.map((c) => values[c.key]);
      if (imp === null || exp === null || overall === null) return;
      const low = Math.min(imp, exp) - OVERALL_TOLERANCE;
      const high = Math.max(imp, exp) + OVERALL_TOLERANCE;
      if (overall < low || overall > high) {
        const name = g.columns[0].fullLabel.split(' ')[0];
        cellErrors[g.columns[2].key] = `${name} Overall (${overall}) must be between ${name} Import (${imp}) and ${name} Export (${exp})`;
      }
    });
  }
  return { values, cellErrors };
}

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
