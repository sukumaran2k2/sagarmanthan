// Pure helpers for the HR reports. The MIS endpoints return { columnDefs, rowData } built for
// the legacy AG Grid pages; these reshape them the same way the legacy pages did.

export const asList = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

// Columns the backend sends for its own use and the legacy pages hid.
const META_FIELDS = new Set(['organisationId', 'Organisation Category']);

export function leafColumns(colDefs = []) {
  return colDefs.flatMap((c) => (Array.isArray(c.children) && c.children.length ? leafColumns(c.children) : [c]));
}

export function dropMetaColumns(colDefs = []) {
  return colDefs
    .filter((c) => !META_FIELDS.has(c.field) && !META_FIELDS.has(c.headerName))
    .map((c) => (Array.isArray(c.children) ? { ...c, children: dropMetaColumns(c.children) } : c));
}

/** The legacy MIS pages show 0 as a blank cell. */
export function zeroToBlank(rows = []) {
  return rows.map((row) => {
    const next = {};
    Object.keys(row).forEach((k) => {
      next[k] = row[k] === 0 ? null : row[k];
    });
    return next;
  });
}

/** Sums every numeric field of `rows` into one row, putting `label` under `labelKey`. */
export function totalRow(rows = [], { labelKey, label = 'Total', exclude = [] } = {}) {
  if (!rows.length) return null;
  const skip = new Set([labelKey, ...exclude]);
  const total = { [labelKey]: label, __total: true };
  const keys = new Set(rows.flatMap((r) => Object.keys(r)));
  keys.forEach((key) => {
    if (skip.has(key)) return;
    let sum = 0;
    let numeric = false;
    rows.forEach((r) => {
      const n = parseFloat(r[key]);
      if (!Number.isNaN(n)) {
        sum += n;
        numeric = true;
      }
    });
    if (numeric) total[key] = sum;
  });
  return total;
}

/** Organisation names differ in punctuation between the dropdown and the report columns. */
export function normaliseOrgName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[.[\]_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const sameOrg = (a, b) => normaliseOrgName(a) === normaliseOrgName(b);

/**
 * Keeps only the selected organisation's columns.
 * - mode 'group':  organisations are column groups (headerName = organisation).
 * - mode 'column': organisations are plain columns (headerName = organisation).
 * Columns whose field or header is in `keep` always stay.
 */
export function columnsForOrg(colDefs = [], orgName, { mode, keep = [] } = {}) {
  if (!orgName) return colDefs;
  const always = new Set(keep);
  const kept = (c) => always.has(c.field) || always.has(c.headerName);
  return colDefs.filter((c) => {
    if (kept(c)) return true;
    const isGroup = Array.isArray(c.children) && c.children.length > 0;
    if (mode === 'group') return isGroup && sameOrg(c.headerName, orgName);
    return !isGroup && sameOrg(c.headerName, orgName);
  });
}

/** Trims the label column (the backend sends department names with trailing spaces/newlines). */
export function trimLabels(rows = [], key) {
  return rows.map((r) => (typeof r[key] === 'string' ? { ...r, [key]: r[key].trim() } : r));
}

/**
 * The organisations present in a report, in report order: row labels ('rows'), group headers
 * ('group') or column headers ('column', skipping the `keep` columns).
 */
export function orgNamesIn(colDefs = [], rows = [], { mode, labelKey, keep = [] } = {}) {
  let names;
  if (mode === 'rows') names = rows.map((r) => r[labelKey]);
  else if (mode === 'group') names = colDefs.filter((c) => c.children?.length).map((c) => c.headerName);
  else names = colDefs.filter((c) => !c.children?.length && !keep.includes(c.field) && !keep.includes(c.headerName)).map((c) => c.headerName);
  return [...new Set(names.map((n) => String(n ?? '').trim()).filter(Boolean))];
}

/** Rows with no value in any of `fields` (the legacy pages drop them after an organisation filter). */
export function dropEmptyRows(rows = [], fields = []) {
  if (!fields.length) return rows;
  return rows.filter((row) => fields.some((f) => row[f] != null && row[f] !== ''));
}

/** Sorts top-level columns by header, keeping `first` (in order) ahead of the rest. */
export function sortColumns(colDefs = [], first = []) {
  const head = first.map((h) => colDefs.find((c) => c.field === h || c.headerName === h)).filter(Boolean);
  const rest = colDefs
    .filter((c) => !head.includes(c))
    .sort((a, b) => String(a.headerName ?? '').localeCompare(String(b.headerName ?? '')));
  return [...head, ...rest];
}

/**
 * Header rows for a column tree (AG Grid style { headerName, field, children }).
 * Groups span their leaves; leaves span down to the last header row.
 */
export function headerRows(colDefs = []) {
  const depth = (cols) => Math.max(0, ...cols.map((c) => (c.children?.length ? 1 + depth(c.children) : 1)));
  const total = depth(colDefs);
  const rows = Array.from({ length: total }, () => []);
  const walk = (cols, level) => {
    cols.forEach((c) => {
      if (c.children?.length) {
        rows[level].push({ col: c, colSpan: leafColumns(c.children).length, rowSpan: 1 });
        walk(c.children, level + 1);
      } else {
        rows[level].push({ col: c, colSpan: 1, rowSpan: total - level });
      }
    });
  };
  walk(colDefs, 0);
  return rows;
}

/** A leaf column's value: its `value(row, index)` accessor, else row[field]. */
export function cellValue(col, row, index) {
  const v = col.value ? col.value(row, index) : row?.[col.field];
  return v == null ? '' : v;
}

/** Leaf labels including their group path, e.g. "Chennai Port Authority - Sanctioned". */
export function leafLabels(colDefs = [], prefix = '') {
  return colDefs.flatMap((c) => {
    const label = [prefix, c.headerName ?? c.field ?? ''].filter(Boolean).join(' - ');
    return c.children?.length ? leafLabels(c.children, label) : [label];
  });
}

/** Header row plus body (and total) rows as plain values, for copy and export. */
export function exportMatrix(colDefs = [], rows = [], totals = null) {
  const leaves = leafColumns(colDefs);
  const body = rows.map((r, i) => leaves.map((c) => cellValue(c, r, i)));
  if (totals) body.push(leaves.map((c) => (c.value ? '' : totals[c.field] ?? '')));
  return { headers: leafLabels(colDefs), body };
}

/** Rows containing `term` in any leaf column (case-insensitive). */
export function searchRows(colDefs = [], rows = [], term = '') {
  const q = String(term).trim().toLowerCase();
  if (!q) return rows;
  const leaves = leafColumns(colDefs).filter((c) => c.field);
  return rows.filter((r) => leaves.some((c) => String(r[c.field] ?? '').toLowerCase().includes(q)));
}

export function formatAsOnDate(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Distinct years and months from GET /get-year-and-month (rows of { log_year, log_month }). */
export function yearMonthOptions(rows = []) {
  const years = [...new Set(rows.map((r) => r.log_year).filter((y) => y != null))];
  const months = [...new Set(rows.map((r) => Number(r.log_month)).filter((m) => m >= 1 && m <= 12))];
  return {
    years: years.map((y) => ({ value: String(y), label: String(y) })),
    months: months.map((m) => ({ value: String(m), label: MONTH_NAMES[m - 1] })),
  };
}

// The legacy Contractual report filters on these fixed financial years.
export const CONTRACT_FINANCIAL_YEARS = [
  '2020-2021', '2021-2022', '2022-2023', '2023-2024',
  '2024-2025', '2025-2026', '2026-2027', '2027-2028',
];

export const CLASS_FILTER_OPTIONS = [
  { value: '1', label: 'I/A' },
  { value: '2', label: 'II/B' },
  { value: '3', label: 'III/C' },
  { value: '4', label: 'IV/D' },
];
