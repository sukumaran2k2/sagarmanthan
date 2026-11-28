/**
 * Data entry status rules for the home dashboard: how a cell from GET /home-dashboard is
 * written out and whether it counts as up to date.
 *
 * A cell is { value } or { status } (see backend controllers/Dashboard/homeDashboard.js).
 * The value's form depends on the row type:
 *   date        'YYYY-MM-DD'    up to date when in the current or previous month
 *   month       'YYYY-MM'       up to date when the current or previous month
 *   fy          'YYYY-MM-DD'    shown as its financial year; up to date when in the current or previous FY
 *   week        'YYYY-MM-W<n>'  Capex weeks: 1-7 = week 1, 8-14 = 2, 15-21 = 3, 22 onwards = 4;
 *                               up to date in the current or previous week
 *   eofficeWeek 'YYYY-MM-W<n>'  E-Office / Attendance calendar weeks of the month (1-6, the week
 *                               holding the 1st is week 1); up to date in the current or previous week
 *
 * These are the old portal's colour rules, kept as they were except that the two week rules
 * are now applied the same way everywhere (the old page had three different week formulas).
 *
 * Every function takes "today" as 'YYYY-MM-DD' (the server's IST date), so the result does not
 * depend on the browser's clock or time zone.
 */

export const TONE = Object.freeze({
  CURRENT: 'current', // green
  OVERDUE: 'overdue', // red
  NEUTRAL: 'neutral', // grey: not applicable / nothing to report
  UNAVAILABLE: 'unavailable',
});

export const STATUS = Object.freeze({
  NO_DATA: 'NO_DATA',
  NONE_ACTIVE: 'NONE_ACTIVE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  UNAVAILABLE: 'UNAVAILABLE',
});

const DEFAULT_STATUS_TEXT = {
  [STATUS.NO_DATA]: 'No data entered',
  [STATUS.NONE_ACTIVE]: 'Nothing pending',
  [STATUS.NOT_APPLICABLE]: 'Not applicable',
  [STATUS.UNAVAILABLE]: 'Could not load',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

/** { year, month (1-12), day } from 'YYYY-MM-DD' / 'YYYY-MM', or null. */
export function parseDateParts(text) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(text || ''));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = m[3] ? Number(m[3]) : 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** { year, month, week } from 'YYYY-MM-W<n>', or null. */
export function parseWeek(text) {
  const m = /^(\d{4})-(\d{2})-W(\d)$/.exec(String(text || ''));
  if (!m) return null;
  const parts = { year: Number(m[1]), month: Number(m[2]), week: Number(m[3]) };
  if (parts.month < 1 || parts.month > 12 || parts.week < 1) return null;
  return parts;
}

const monthIndex = ({ year, month }) => year * 12 + (month - 1);
const financialYearOf = ({ year, month }) => (month >= 4 ? year : year - 1);
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const weekdayOfFirst = (year, month) => new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

/** Capex week of a day: 1-7 -> 1, 8-14 -> 2, 15-21 -> 3, 22 onwards -> 4. */
export const capexWeekOfDay = (day) => Math.min(4, Math.ceil(day / 7));

/** Calendar week of the month (Sunday-start rows of a calendar page; the 1st is in week 1). */
export const calendarWeekOfDay = (year, month, day) => Math.ceil((day + weekdayOfFirst(year, month)) / 7);

function isCurrentOrPreviousMonth(parts, today) {
  const diff = monthIndex(today) - monthIndex(parts);
  return diff === 0 || diff === 1;
}

function isCurrentOrPreviousWeek(entry, today, { weekOfDay, lastWeekOfMonth }) {
  const currentWeek = weekOfDay(today);
  if (entry.year === today.year && entry.month === today.month) {
    return entry.week === currentWeek || entry.week === currentWeek - 1;
  }
  // In week 1, the previous week is the last week of last month
  if (currentWeek !== 1) return false;
  const prev = today.month === 1 ? { year: today.year - 1, month: 12 } : { year: today.year, month: today.month - 1 };
  return entry.year === prev.year && entry.month === prev.month && entry.week >= lastWeekOfMonth(prev);
}

const WEEK_RULES = {
  week: {
    weekOfDay: (d) => capexWeekOfDay(d.day),
    lastWeekOfMonth: () => 4,
    normalise: (w) => Math.min(4, w),
  },
  eofficeWeek: {
    weekOfDay: (d) => calendarWeekOfDay(d.year, d.month, d.day),
    lastWeekOfMonth: ({ year, month }) => calendarWeekOfDay(year, month, daysInMonth(year, month)),
    normalise: (w) => w,
  },
};

/** The type a cell is judged and shown by: its own (KPI years) or its row's. */
export const cellType = (cell, rowType) => cell?.type || rowType || 'date';

/** Green / red / grey for one cell. */
export function cellTone(cell, rowType, todayText) {
  if (!cell) return TONE.OVERDUE;
  if (cell.status === STATUS.UNAVAILABLE) return TONE.UNAVAILABLE;
  if (cell.status === STATUS.NOT_APPLICABLE || cell.status === STATUS.NONE_ACTIVE) return TONE.NEUTRAL;
  if (cell.status) return TONE.OVERDUE;

  const today = parseDateParts(todayText);
  if (!today) return TONE.OVERDUE;
  const type = cellType(cell, rowType);

  if (type === 'week' || type === 'eofficeWeek') {
    const entry = parseWeek(cell.value);
    if (!entry) return TONE.OVERDUE;
    const rule = WEEK_RULES[type];
    const ok = isCurrentOrPreviousWeek({ ...entry, week: rule.normalise(entry.week) }, today, rule);
    return ok ? TONE.CURRENT : TONE.OVERDUE;
  }

  const parts = parseDateParts(cell.value);
  if (!parts) return TONE.OVERDUE;
  if (type === 'fy') {
    return financialYearOf(parts) >= financialYearOf(today) - 1 ? TONE.CURRENT : TONE.OVERDUE;
  }
  return isCurrentOrPreviousMonth(parts, today) ? TONE.CURRENT : TONE.OVERDUE;
}

/** '12 Nov 2026' */
export function formatDay(text) {
  const p = parseDateParts(text);
  return p ? `${String(p.day).padStart(2, '0')} ${MONTHS_SHORT[p.month - 1]} ${p.year}` : '';
}

/** 'November 2026' */
export function formatMonth(text) {
  const p = parseDateParts(text);
  return p ? `${MONTHS[p.month - 1]} ${p.year}` : '';
}

/** 'FY 2026-27' */
export function formatFinancialYear(text) {
  const p = parseDateParts(text);
  if (!p) return '';
  const fy = financialYearOf(p);
  return `FY ${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;
}

/** 'Week 2, November 2026' */
export function formatWeek(text) {
  const p = parseWeek(text);
  return p ? `Week ${p.week}, ${MONTHS[p.month - 1]} ${p.year}` : '';
}

const FORMATTERS = {
  date: formatDay,
  month: formatMonth,
  fy: formatFinancialYear,
  week: formatWeek,
  eofficeWeek: formatWeek,
};

/**
 * Text for one cell. statusText overrides the wording of a status for this row, e.g.
 * { NONE_ACTIVE: 'No pending references' }.
 */
export function cellText(cell, rowType, statusText = {}) {
  if (!cell) return statusText[STATUS.NO_DATA] || DEFAULT_STATUS_TEXT[STATUS.NO_DATA];
  if (cell.status) return statusText[cell.status] || DEFAULT_STATUS_TEXT[cell.status] || cell.status;
  const format = FORMATTERS[cellType(cell, rowType)] || formatDay;
  return format(cell.value) || cell.value;
}

/** Counts of each tone over cells, for the summary strip. */
export function countTones(cells, rowType, todayText) {
  const counts = { [TONE.CURRENT]: 0, [TONE.OVERDUE]: 0, [TONE.NEUTRAL]: 0, [TONE.UNAVAILABLE]: 0 };
  for (const cell of cells) counts[cellTone(cell, rowType, todayText)] += 1;
  return counts;
}
