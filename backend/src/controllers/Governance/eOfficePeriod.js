// The period an E-Office sheet is filed under, checked on the server (QC EO-03): a missing year or
// week used to become 2026 / 1 silently, and the month was not checked.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

// { Year, month, week } from the form body, or { error }
export function readPeriod(body = {}) {
    const year = Number(body.Year ?? body.financialYear);
    const month = String(body.month ?? '').trim();
    const week = Number(body.week);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: 'Select a valid year.' };
    if (!MONTHS.includes(month)) return { error: 'Select a valid month.' };
    if (!Number.isInteger(week) || week < 1 || week > 5) return { error: 'Select a week from 1 to 5.' };
    return { Year: year, month, week };
}
