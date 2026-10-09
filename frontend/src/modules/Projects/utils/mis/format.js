export function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function parseDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value).trim();
  if (!text || text === '0') return null;

  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function getFinancialYear(date = new Date()) {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return financialYearBounds(startYear);
}

export function financialYearFromLabel(label) {
  const match = String(label || '').match(/^(\d{4})-(\d{4})$/);
  if (!match) return getFinancialYear();
  return financialYearBounds(Number(match[1]));
}

function financialYearBounds(startYear) {
  return {
    label: `${startYear}-${startYear + 1}`,
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31),
    nextStart: new Date(startYear + 1, 3, 1),
    nextEnd: new Date(startYear + 2, 2, 31),
  };
}

export function formatCrore(value, { fixed = false } = {}) {
  const amount = num(value);
  if (amount == null) return '—';
  return amount.toLocaleString('en-IN', fixed
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 2 });
}

export function formatPercent(value) {
  const amount = num(value);
  if (amount == null) return '—';
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
}

export function formatDays(value) {
  const amount = num(value);
  if (amount == null) return '—';
  return round2(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatNumber(value) {
  const amount = num(value);
  if (amount == null) return '—';
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatTableDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

export function formatDisplayDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatKpiValue(format, value) {
  if (value == null) return '—';
  if (format === 'crore') return `₹ ${formatCrore(value, { fixed: true })} Cr`;
  if (format === 'percent') return formatPercent(value);
  if (format === 'days') return `${formatDays(value)} days`;
  if (format === 'number' || format === 'count') return formatNumber(value);
  return String(value);
}
