// Data shaping for the non-port HR dashboard. The other-org endpoints answer from the monthly
// Excel upload (tbl_hr_other_org_vacancy_details) with their own column names; these turn them
// into the shapes the Major Port dashboard's charts and cards already take.

import { exServiceSlices, pwbdSlices } from './hrDashboard';

const num = (v) => Number(v) || 0;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/** The month the dashboard shows: the server reads the previous month's upload. */
export function nonPortDataMonth(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
}

/** Month number (1-12 or '01') -> name; anything else is returned as it is. */
export function monthName(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? MONTHS[n - 1] : String(value ?? '');
}

/**
 * The stored calendar date of an ISO value, as dd/mm/yyyy. The server sends DATE / DATETIME
 * values with a 'Z', so going through new Date() could move them a day in some timezones.
 */
export function storedDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '-';
}

/** /get-hr-dashboard-content-other-org -> { sanctioned, filled, live, abolished } */
export function nonPortTotals(data = {}) {
  return {
    sanctioned: num(data.totalSanctionedAndFilledPost?.total_sanctioned_strength),
    filled: num(data.totalSanctionedAndFilledPost?.filled_post),
    live: num(data.totalLiveVacantPost?.totalLivePost),
    abolished: num(data.totalAbolishedVacantPost?.totalAbolishedPost),
  };
}

/** whether_ex_serviceman (1 / 0) rows -> the Ex-Service donut */
export function nonPortExServiceSlices(rows = []) {
  return exServiceSlices(rows.map((r) => ({ ...r, experience_status: r.whether_ex_serviceman })));
}

/** whether_pwbd ('Yes' / 'No' / ...) rows -> the PwBD donut */
export function nonPortPwbdSlices(rows = []) {
  return pwbdSlices(rows.map((r) => ({ ...r, pwbd_status: r.whether_pwbd })));
}

/**
 * One row of counts per community (sc_count, st_count, ..., total_count) -> donut slices.
 * 'OB' and 'OBC' are both OBC in the uploads; whatever is left of the total is 'Other'.
 */
export function nonPortCommunitySlices(rows = []) {
  const r = rows[0] || {};
  const slices = [
    { category: 'SC', value: num(r.sc_count) },
    { category: 'ST', value: num(r.st_count) },
    { category: 'OBC', value: num(r.obc_count) + num(r.ob_count) },
    { category: 'EWS', value: num(r.ews_count) },
    { category: 'UR', value: num(r.ur_count) },
  ];
  const other = num(r.total_count) - slices.reduce((sum, s) => sum + s.value, 0);
  if (other > 0) slices.push({ category: 'Other', value: other });
  return slices.filter((s) => s.value > 0);
}
