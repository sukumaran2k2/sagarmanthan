import { MONTH_NUM_TO_NAME } from './trafficConstants';

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '-';
}

/** Up to 3 decimals, no padding (61.1, 28,076): how the earlier portal showed quantities. */
export function formatQuantity(value) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '-';
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : '-';
}

export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function monthLabel(month) {
  return MONTH_NUM_TO_NAME[Number(month)] || '-';
}

/** { fiscalYear, monthLabel } used by toast wording. */
export function describePeriod(fiscalYear, month) {
  return { fiscalYear, monthLabel: monthLabel(month) };
}

/** Raw number for exports (blank when missing). */
export function exportNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
}
