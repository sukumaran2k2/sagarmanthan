/**
 * Date formatting for the Consultant Appointment module.
 *
 * The module previously formatted dates three different ways, two of which ran the value
 * through `new Date(...).toISOString()`. That converts to UTC, so a value the driver hands
 * back at local midnight renders as the previous day east of Greenwich. These helpers read
 * the date parts out of the string the API returns and only fall back to Date parsing when
 * the value is not in the shape the API uses.
 */

const ISO_LIKE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2}))?/;

function parts(value) {
  if (!value) return null;
  const str = typeof value === 'string' ? value : (value instanceof Date ? null : String(value));
  if (str) {
    const m = str.match(ISO_LIKE);
    if (m) return { y: m[1], m: m[2], d: m[3], hh: m[4], mm: m[5], ss: m[6] };
  }
  const dt = value instanceof Date ? value : new Date(value);
  if (isNaN(dt.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return {
    y: String(dt.getFullYear()), m: pad(dt.getMonth() + 1), d: pad(dt.getDate()),
    hh: pad(dt.getHours()), mm: pad(dt.getMinutes()), ss: pad(dt.getSeconds()),
  };
}

/** YYYY-MM-DD, the value an <input type="date"> expects. */
export function toInputDate(value) {
  const p = parts(value);
  return p ? `${p.y}-${p.m}-${p.d}` : '';
}

/** DD/MM/YYYY for display. */
export function formatDate(value, fallback = '') {
  const p = parts(value);
  return p ? `${p.d}/${p.m}/${p.y}` : fallback;
}

/** DD/MM/YYYY, with the time appended when the value carries one. */
export function formatDateTime(value, fallback = '') {
  const p = parts(value);
  if (!p) return fallback;
  if (!p.hh || (p.hh === '00' && p.mm === '00' && p.ss === '00')) {
    return `${p.d}/${p.m}/${p.y}`;
  }
  let h = parseInt(p.hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${p.d}/${p.m}/${p.y}, ${String(h).padStart(2, '0')}:${p.mm} ${ampm}`;
}

/**
 * Neutralises spreadsheet formula injection. Excel and Sheets execute a cell that starts
 * with =, +, - or @, so a candidate named "=HYPERLINK(...)" would run when the export is
 * opened. Prefixing with an apostrophe makes the spreadsheet treat it as text.
 */
export function guardFormula(value) {
  const text = String(value ?? '');
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** A quoted, formula-safe CSV field. */
export function csvCell(value) {
  return `"${guardFormula(value).replace(/"/g, '""')}"`;
}

/** Same guard for tab-separated clipboard output, where tabs and newlines also break rows. */
export function tsvCell(value) {
  return guardFormula(String(value ?? '').replace(/[\t\r\n]+/g, ' '));
}
