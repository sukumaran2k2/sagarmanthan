// K-2.3 Exam Performance reports: dates, Total row and chart data, ported from the earlier
// portal (pages/KPI/DGSK-2.3.1-3.html and pages/KPI/js/asOnDate.js) with the same rules.

const pad = (n) => String(n).padStart(2, '0');

// As on date: last day of the month two months back, DD-MM-YYYY. On 25-11-2026 -> 30-09-2026.
export function examAsOnDate(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 0);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// "Report for the Month": the previous month. On 25-11-2026 -> "October 2026".
export function examReportMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// "Report for the Year": the current financial year (April to March). On 25-11-2026 -> "2026-2027".
export function currentFinancialYear(now = new Date()) {
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

// K-2.3.1 periods: [candidates appeared field, candidates passed field, pass percentage field]
export const EXAM_PERIODS = [
  ['candidatesAppearedPy', 'candidatesPassedPy', 'passPercentagePy'],
  ['candidatesAppearedCurrentYear', 'candidatesPassedCurrentYear', 'passPercentageCurrentYear'],
  ['candidatesAppearedMonth', 'candidatesPassedMonth', 'passPercentageMonth'],
  ['candidatesAppearedTotal', 'candidatesPassedTotal', 'passPercentageTotal'],
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Total row for the rows shown: counts are added up; each pass percentage is worked out from the
// summed counts (passed / appeared x 100, 2 decimals), 0 when nobody appeared.
export function examTotalsRow(rows) {
  if (!rows || !rows.length) return null;
  const total = { _isTotal: true };
  EXAM_PERIODS.forEach(([appeared, passed, percent]) => {
    total[appeared] = rows.reduce((s, r) => s + num(r[appeared]), 0);
    total[passed] = rows.reduce((s, r) => s + num(r[passed]), 0);
    total[percent] = total[appeared] > 0
      ? Math.round((total[passed] / total[appeared]) * 100 * 100) / 100
      : 0;
  });
  return total;
}

// Row labels the backend sends for K-2.3.2 / K-2.3.3
export const NAUTICAL = 'Total Exams Conducted- Nautical';
export const ENGINEERING = 'Total Exams Conducted- Engineering';

// Financial year order, as the chart shows it
export const FY_MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March',
];

// One chart point per category key; missing values count as 0
function trendPoints(rowData, keys, labelKey) {
  const nautical = (rowData || []).find((r) => r.Category === NAUTICAL) || {};
  const engineering = (rowData || []).find((r) => r.Category === ENGINEERING) || {};
  return keys.map((key) => ({
    [labelKey]: key,
    nautical: num(nautical[key]),
    engineering: num(engineering[key]),
  }));
}

// K-2.3.2: April to March of the current financial year
export function monthlyTrendChartData(rowData) {
  return trendPoints(rowData, FY_MONTHS, 'category');
}

// K-2.3.3: every "FYyyyy-yyyy" column the backend returns, in its order
export function yearlyTrendChartData(rowData) {
  if (!rowData || !rowData.length) return [];
  const years = Object.keys(rowData[0]).filter((k) => k.startsWith('FY'));
  return trendPoints(rowData, years, 'category');
}
