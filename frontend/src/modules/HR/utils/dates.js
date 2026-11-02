// Date display helpers shared by HR pages. HR shows every date as YYYY-MM-DD.

const pad = (n) => String(n).padStart(2, '0');

/** A Date as YYYY-MM-DD (local time). */
export const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * A date value as YYYY-MM-DD, or '' when missing or invalid.
 * Server values ('2024-03-05', '2024-03-05T00:00:00.000Z') keep their stored calendar date:
 * DATE / DATETIME values arrive tagged 'Z', so new Date() would move evening values a day in IST.
 * Older records written as DD-MM-YYYY or DD/MM/YYYY are read too.
 */
export function ymd(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : toYmd(value);
  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? '' : toYmd(d);
}

/** A date value as YYYY-MM-DD, or `empty` ('--') when missing or invalid. addYears shifts it first. */
export function formatDate(value, addYears = 0, empty = '--') {
  const day = ymd(value);
  if (!day) return empty;
  if (!addYears) return day;
  const [y, m, d] = day.split('-').map(Number);
  return toYmd(new Date(y + addYears, m - 1, d));
}
