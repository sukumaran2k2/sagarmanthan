// Year / month options shared by the K-2.3 forms and their data lists.

export const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const thisYear = new Date().getFullYear();
export const YEARS = Array.from({ length: 11 }, (_, i) => thisYear - 5 + i);

// Keeps a saved year selectable when it falls outside the default range (edit mode)
export function yearOptions(selectedYear) {
  const y = Number(selectedYear);
  if (!y || YEARS.includes(y)) return YEARS;
  return [...YEARS, y].sort((a, b) => a - b);
}

export function monthName(value) {
  return MONTHS.find((m) => m.value === Number(value))?.label || value || '';
}

// Exam types are fixed in mmt_kpi_type_2_3 (the old portal hard-codes them the same way)
export const EXAM_TYPES = [
  { value: 1, label: 'Nautical' },
  { value: 2, label: 'Engineering' },
];

export function examTypeName(value) {
  return EXAM_TYPES.find((t) => t.value === Number(value))?.label || '';
}
