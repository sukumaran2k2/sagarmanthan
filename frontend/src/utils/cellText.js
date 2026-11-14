// Text for a table cell in Copy / PDF: date-time values (e.g. updated_date) become YYYY-MM-DD,
// as in 2.0 and the other data lists; null / undefined become ''.
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function cellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && ISO_DATE_TIME.test(value)) return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return value;
}

// Last Updated Date cell: '--' for a record never updated (as in 2.0)
export const lastUpdatedText = (value) => cellText(value) || '--';
