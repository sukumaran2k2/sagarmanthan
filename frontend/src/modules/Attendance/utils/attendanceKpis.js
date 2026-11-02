import {
  rowEmpId, rowWing, rowInTime, rowOutTime, rowWorkHours, toSeconds, secondsToTime, NINE_THIRTY, FIVE_THIRTY,
} from './attendanceUtils';

const percent = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');
const wingsLabel = (n) => (n ? `Across ${n} wing${n === 1 ? '' : 's'}` : 'No data for this selection');

// The four cards for employee rows on show. Times of 00:00:00 mean no attendance was
// recorded, so they are left out of the averages and rates (they used to count as
// on-time arrivals). With nothing to measure, a card shows '—' rather than a made-up value.
export function kpisFromRows(rows) {
  const ids = new Set(rows.map(rowEmpId).filter(Boolean));
  const wings = new Set(rows.map(rowWing).filter(Boolean));
  const work = rows.map((r) => toSeconds(rowWorkHours(r))).filter((v) => v !== null);
  const ins = rows.map((r) => toSeconds(rowInTime(r))).filter((v) => v !== null);
  const outs = rows.map((r) => toSeconds(rowOutTime(r))).filter((v) => v !== null);
  return {
    employees: { empCount: ids.size || rows.length, wingCount: wingsLabel(wings.size) },
    avgWorkingHours: work.length ? secondsToTime(work.reduce((a, b) => a + b, 0) / work.length) : '—',
    punctualRate: percent(ins.filter((s) => s < NINE_THIRTY).length, ins.length),
    earlyCheckoutRate: percent(outs.filter((s) => s < FIVE_THIRTY).length, outs.length),
  };
}

// The same cards from the wing-wise report rows (the server's per-wing counts)
export function kpisFromReport(rows) {
  const find = (row, re) => Object.keys(row).find((k) => re.test(k));
  const num = (row, re) => Number(row[find(row, re)]) || 0;
  const total = rows.reduce((acc, r) => acc + num(r, /^Number Of Employees$/i), 0);
  if (!total) {
    return { employees: { empCount: 0, wingCount: wingsLabel(0) }, avgWorkingHours: '—', punctualRate: '—', earlyCheckoutRate: '—' };
  }
  // Wing averages weighted by each wing's employees; the report gives hours as a decimal
  const hours = rows.reduce((acc, r) => acc + num(r, /^Average Working Hours$/i) * num(r, /^Number Of Employees$/i), 0) / total;
  return {
    employees: { empCount: total, wingCount: wingsLabel(rows.length) },
    avgWorkingHours: secondsToTime(hours * 3600),
    punctualRate: percent(rows.reduce((acc, r) => acc + num(r, /InTime Before 9:30/i), 0), total),
    earlyCheckoutRate: percent(rows.reduce((acc, r) => acc + num(r, /OutTime before 5:30/i), 0), total),
  };
}
