// Employee Details page: formatting of the employee record and the service history
// (dates arrive as 'yyyy-mm-ddT00:00:00.000Z' and are read as calendar dates, not converted to local time).

import { DISCIPLINES, PWBD_OPTIONS } from './employeeOptions';

const PLACEHOLDER_YEAR = 1900; // legacy rows use 01-01-1900 for "not known"

/** 'yyyy-mm-dd' (or ISO) -> Date at local midnight; null when empty or a placeholder. */
export function toDate(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() <= PLACEHOLDER_YEAR ? null : d;
}

export function formatDate(value) {
  const d = value instanceof Date ? value : toDate(value);
  if (!d) return '--';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

/** "2 yrs 5 mos", "3 mos", "12 days" between two dates (to defaults to today). */
export function formatDuration(from, to = new Date()) {
  const a = from instanceof Date ? from : toDate(from);
  const b = to instanceof Date ? to : toDate(to);
  if (!a || !b || b < a) return '--';
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0 && rest === 0) {
    const days = Math.round((b - a) / 86400000);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return [years && `${years} yr${years === 1 ? '' : 's'}`, rest && `${rest} mo${rest === 1 ? '' : 's'}`].filter(Boolean).join(' ');
}

/** "Retires in 3 yrs 7 mos" / "Retired" / null when there is no retirement date. */
export function retirementStatus(dor, today = new Date()) {
  const d = toDate(dor);
  if (!d) return null;
  return d <= today ? 'Retired' : `Retires in ${formatDuration(today, d)}`;
}

export const maskAadhaar = (value) => {
  const digits = String(value || '').replace(/\s+/g, '');
  return digits.length === 12 ? `XXXX XXXX ${digits.slice(8)}` : (digits || '--');
};

export const pwbdLabel = (code) =>
  PWBD_OPTIONS.find((o) => o.value === String(code || '').trim())?.label || (code ? String(code) : '--');

/** "3,5" -> ["Engineering", "Management"] */
export const disciplineNames = (csv) =>
  String(csv || '').split(',').map((v) => v.trim()).filter(Boolean)
    .map((v) => DISCIPLINES.find((d) => d.value === v)?.label || v);

const text = (v) => (v == null || String(v).trim() === '' ? '' : String(v).trim());

/**
 * One row per transaction, latest first (as the endpoint returns them).
 * orgName(id) names an organisation id (deputation / transfer destination).
 */
export function serviceHistoryRows(transactions = [], orgName = () => '', today = new Date()) {
  return transactions.map((t) => {
    const from = toDate(t.emp_post_join_date || t.employee_joining_date);
    const to = toDate(t.emp_post_end_date);
    const pending = !text(t.emp_post_code) && !to;
    const isCurrent = !pending && !to;
    const activity = text(t.activity_name);
    const details = [];
    if (activity === 'Deputation Out') {
      if (t.org_to_be_deputed) details.push(`to ${orgName(t.org_to_be_deputed) || `organisation ${t.org_to_be_deputed}`}`);
      if (t.deputation_start_date) details.push(`${formatDate(t.deputation_start_date)} – ${formatDate(t.deputation_end_date)}`);
    }
    if (activity === 'Transfer Out' && t.org_to_be_transferred) {
      details.push(`to ${orgName(t.org_to_be_transferred) || `organisation ${t.org_to_be_transferred}`}`);
    }
    if (activity === 'Separation' && text(t.separation_reason)) details.push(text(t.separation_reason));
    if (activity === 'Promotion' && t.promotion_date) details.push(`on ${formatDate(t.promotion_date)}`);
    if (text(t.method_of_discharge) && !details.length) details.push(text(t.method_of_discharge));
    return {
      id: t.transaction_id,
      from,
      to,
      isCurrent,
      pending,
      duration: from ? formatDuration(from, to || today) : '--',
      department: text(t.emp_department_name) || '--',
      post: text(t.emp_post_name) || '--',
      postCode: text(t.emp_post_code) || '--',
      method: text(t.method_of_appointment) || '--',
      activity,
      activityDetail: details.join(' · '),
      organisation: text(t.working_organisation_name),
    };
  });
}
