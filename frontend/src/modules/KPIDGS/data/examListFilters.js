import { MONTHS, EXAM_TYPES } from './periodOptions';

// Data List filter rules for K-2.3.1 (Year, Month), K-2.3.2 (Year, Month, Type), K-2.4 (Year,
// Month; the type is chosen with the tabs) and K-2.6 / K-2.7 (MMD-wise: Year, Month, MMD;
// Vessel-wise: Year, Month). The old portal's lists had these same filters. Logic only; the
// button and panel are in components/ExamListFilters.jsx.

// Filters each Data List offers
export const EXAM_FILTER_FIELDS = {
  'exam-monthly-performance': ['year', 'month'],
  'exam-overall-performance': ['year', 'month', 'type'],
  'flag-state-inspection-mmd-wise': ['year', 'month', 'mmd'],
  'flag-state-inspection-vessel-wise': ['year', 'month'],
  'port-state-inspection-mmd-wise': ['year', 'month', 'mmd'],
  'port-state-inspection-vessel-wise': ['year', 'month'],
  'entry-exit-of-candidates': ['year', 'month'], // K-2.4: the type is chosen with the tabs
};

// Old portal order: financial year, April first
export const FILTER_MONTH_OPTIONS = [...MONTHS.slice(3), ...MONTHS.slice(0, 3)]
  .map((m) => ({ value: String(m.value), label: m.label }));

export const FILTER_TYPE_OPTIONS = EXAM_TYPES.map((t) => ({ value: String(t.value), label: t.label }));

// Row field each filter matches. The K-2.6.1 list returns mmd_year / mmd_month / mmd_id instead
// of the usual year/month/mmd_id, so it gets its own override.
const DEFAULT_ROW_FIELD = { year: 'year', month: 'month', type: 'type_id', mmd: 'mmd_id' };

const ROW_FIELD_BY_SLUG = {
  'flag-state-inspection-mmd-wise': { year: 'mmd_year', month: 'mmd_month', mmd: 'mmd_id' },
  'port-state-inspection-mmd-wise': { year: 'mmd_year', month: 'mmd_month', mmd: 'mmd_id' },
};

function rowFieldFor(slug, field) {
  return ROW_FIELD_BY_SLUG[slug]?.[field] ?? DEFAULT_ROW_FIELD[field];
}

/** How many of the list's filters are set ('' means all). */
export function countActiveFilters(fields, filters) {
  return fields.filter((f) => filters[f] !== '' && filters[f] != null).length;
}

/** Rows matching every set filter. */
export function filterExamRows(rows, slug, fields, filters) {
  // Back-compat: older callers pass (rows, fields, filters) without a slug.
  if (Array.isArray(slug)) {
    filters = fields;
    fields = slug;
    slug = '';
  }
  if (!countActiveFilters(fields, filters)) return rows;
  return rows.filter((row) => fields.every((f) => {
    const v = filters[f];
    if (v === '' || v == null) return true;
    return String(row[rowFieldFor(slug, f)]) === v;
  }));
}

/** Years that have data, newest first, as dropdown options. */
export function yearOptionsFrom(rows, slug = '') {
  const field = rowFieldFor(slug, 'year');
  return [...new Set(rows.map((r) => r[field]).filter(Boolean))]
    .sort((a, b) => b - a)
    .map((y) => ({ value: String(y), label: String(y) }));
}

/** MMDs that have data, alphabetically, as dropdown options. */
export function mmdOptionsFrom(rows, slug = '') {
  const idField = rowFieldFor(slug, 'mmd');
  const seen = new Map();
  for (const r of rows) {
    const id = r[idField];
    if (id == null || id === '') continue;
    const key = String(id);
    if (!seen.has(key)) seen.set(key, r.mmd_name || key);
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
