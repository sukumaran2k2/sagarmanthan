export const FY_MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March',
];

export const MONTH_NAME_TO_NUMBER = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

export function createEmptyMonthsData() {
  const initial = {};
  FY_MONTHS.forEach((m) => {
    initial[m] = {
      gbsWeek1: 0, iebrWeek1: 0, pppWeek1: 0,
      gbsWeek2: 0, iebrWeek2: 0, pppWeek2: 0,
      gbsWeek3: 0, iebrWeek3: 0, pppWeek3: 0,
      gbsWeek4: 0, iebrWeek4: 0, pppWeek4: 0,
    };
  });
  return initial;
}

export function rowsToMonthsData(rows = []) {
  const loaded = createEmptyMonthsData();
  const numberToName = Object.fromEntries(
    Object.entries(MONTH_NAME_TO_NUMBER).map(([name, num]) => [num, name])
  );

  rows.forEach((row) => {
    const monthName = numberToName[Number(row.month_number)];
    if (!monthName || !loaded[monthName]) return;
    const week = Number(row.week_number);
    const type = String(row.funding_type || '').toUpperCase();
    const amount = Number(row.amount) || 0;
    if (![1, 2, 3, 4].includes(week)) return;
    if (type === 'GBS') loaded[monthName][`gbsWeek${week}`] = amount;
    if (type === 'IEBR') loaded[monthName][`iebrWeek${week}`] = amount;
    if (type === 'PPP') loaded[monthName][`pppWeek${week}`] = amount;
  });

  return loaded;
}

export function monthsDataToEntries(allMonthsData = {}) {
  const entries = [];
  FY_MONTHS.forEach((monthName) => {
    const data = allMonthsData[monthName] || {};
    const monthNumber = MONTH_NAME_TO_NUMBER[monthName];
    for (let w = 1; w <= 4; w++) {
      [
        ['GBS', data[`gbsWeek${w}`]],
        ['IEBR', data[`iebrWeek${w}`]],
        ['PPP', data[`pppWeek${w}`]],
      ].forEach(([funding_type, amount]) => {
        entries.push({
          month_number: monthNumber,
          week_number: w,
          funding_type,
          amount: Number(amount) || 0,
        });
      });
    }
  });
  return entries;
}

export function calculateCapexTotal(gbs = 0, iebr = 0, ppp = 0) {
  const g = parseFloat(gbs) || 0;
  const i = parseFloat(iebr) || 0;
  const p = parseFloat(ppp) || 0;
  return Number((g + i + p).toFixed(2));
}

export function calculateCapexExpenditurePercentage(expenditure = 0, totalTarget = 0) {
  const exp = parseFloat(expenditure) || 0;
  const target = parseFloat(totalTarget) || 0;
  if (target <= 0) return '0.00';
  return ((exp / target) * 100).toFixed(2);
}

export function formatCurrencyINR(amount) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

export function getCapexStatusMeta(pct) {
  const value = Number(pct) || 0;
  if (value > 100) {
    return { label: 'Above BE', tone: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' };
  }
  if (value >= 75) {
    return { label: 'Good Utilisation', tone: 'green', bg: 'bg-emerald-100', text: 'text-emerald-800' };
  }
  if (value >= 50) {
    return { label: 'Moderate Utilisation', tone: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800' };
  }
  return { label: 'Low Utilisation', tone: 'red', bg: 'bg-red-100', text: 'text-red-800' };
}

export function getCurrentFinancialYear(asOf = new Date()) {
  const date = asOf instanceof Date ? asOf : new Date(asOf);
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function parseFinancialYear(financialYear) {
  const [startRaw, endRaw] = String(financialYear || '').split('-');
  const startYear = Number(startRaw);
  const endYear = Number(endRaw);

  if (Number.isFinite(startYear) && Number.isFinite(endYear)) {
    return { startYear, endYear };
  }
  if (Number.isFinite(startYear)) {
    return { startYear, endYear: startYear + 1 };
  }

  const currentYear = new Date().getFullYear();
  return { startYear: currentYear, endYear: currentYear + 1 };
}

function formatDateDDMMYYYY(dateInput, separator = '-') {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${separator}${month}${separator}${year}`;
}

export function getCapexReportAsOnMeta(financialYear) {
  const currentFinancialYear = getCurrentFinancialYear();
  const resolvedFinancialYear = financialYear || currentFinancialYear;
  const isCurrentFinancialYear = resolvedFinancialYear === currentFinancialYear;

  if (isCurrentFinancialYear) {
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfPrevMonth = new Date(firstDayOfCurrentMonth - 1);
    const monthName = lastDayOfPrevMonth.toLocaleString('en-IN', { month: 'long' });
    const { startYear } = parseFinancialYear(resolvedFinancialYear);

    return {
      isCurrentFinancialYear,
      financialYearLabel: resolvedFinancialYear,
      asOnDate: formatDateDDMMYYYY(lastDayOfPrevMonth, '/'),
      asOnDateStr: formatDateDDMMYYYY(lastDayOfPrevMonth, '-'),
      reportPeriodLabel: 'Report for the month',
      reportPeriodValue: `${monthName} ${startYear}`,
    };
  }

  const { endYear } = parseFinancialYear(resolvedFinancialYear);
  const financialYearEndDate = new Date(endYear, 2, 31);

  return {
    isCurrentFinancialYear,
    financialYearLabel: resolvedFinancialYear,
    asOnDate: formatDateDDMMYYYY(financialYearEndDate, '/'),
    asOnDateStr: formatDateDDMMYYYY(financialYearEndDate, '-'),
    reportPeriodLabel: 'Report for the Financial Year',
    reportPeriodValue: resolvedFinancialYear,
  };
}

export function mapCapexSummaryReportRows(payload = {}) {
  const list = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return list.map((item) => {
    const be = Number(item.be) || 0;
    const exp = Number(item.exp) || 0;
    const pct =
      item.pct != null && item.pct !== ''
        ? Number(item.pct) || 0
        : be > 0
          ? (exp * 100) / be
          : 0;
    return {
      organisation_id: item.organisation_id,
      organisation_name: item.organisation_name || '—',
      organisation_category_id: item.organisation_category_id,
      be,
      exp,
      pct,
      pctLabel: pct.toFixed(2),
      status: getCapexStatusMeta(pct),
    };
  });
}
