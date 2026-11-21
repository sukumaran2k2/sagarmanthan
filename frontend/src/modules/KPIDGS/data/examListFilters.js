import { MONTHS, EXAM_TYPES } from './periodOptions';

// Data List filter rules for K-2.3.1 (Year, Month) and K-2.3.2 (Year, Month, Type), the filters
// the old portal's lists had. Logic only; the button and panel are in components/ExamListFilters.jsx.

// Filters each K-2.3 Data List offers
export const EXAM_FILTER_FIELDS = {
  'exam-monthly-performance': ['year', 'month'],
  'exam-overall-performance': ['year', 'month', 'type'],
};

// Old portal order: financial year, April first
export const FILTER_MONTH_OPTIONS = [...MONTHS.slice(3), ...MONTHS.slice(0, 3)]
  .map((m) => ({ value: String(m.value), label: m.label }));

export const FILTER_TYPE_OPTIONS = EXAM_TYPES.map((t) => ({ value: String(t.value), label: t.label }));

// Row field each filter matches (the K-2.3.2 list sends the type as type_id)
const ROW_FIELD = { year: 'year', month: 'month', type: 'type_id' };

/** How many of the list's filters are set ('' means all). */
export function countActiveFilters(fields, filters) {
  return fields.filter((f) => filters[f] !== '').length;
}

/** Rows matching every set filter. */
export function filterExamRows(rows, fields, filters) {
  if (!countActiveFilters(fields, filters)) return rows;
  return rows.filter((row) => fields.every((f) => filters[f] === '' || String(row[ROW_FIELD[f]]) === filters[f]));
}

/** Years that have data, newest first, as dropdown options. */
export function yearOptionsFrom(rows) {
  return [...new Set(rows.map((r) => r.year).filter(Boolean))]
    .sort((a, b) => b - a)
    .map((y) => ({ value: String(y), label: String(y) }));
}
