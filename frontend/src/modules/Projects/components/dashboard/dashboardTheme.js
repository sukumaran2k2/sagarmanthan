// Shared constants and formatters of the Projects dashboard (shared indigo dashboard theme).

export const ALL = 'all';

// Stage colours, in stage order (checked for colour-blind separation in light and dark).
export const STAGE_COLORS = {
  planning: '#a855f7',
  tendering: '#d97706',
  implementation: '#6366f1',
  completed: '#059669',
};

// Delay status colours (on time / delayed / badly delayed checked for colour-blind
// separation; always shown with their label). Not available is a neutral grey.
export const DELAY_COLORS = {
  'On time': '#059669',
  Delayed: '#e8a33d',
  'Badly delayed': '#b91c1c',
  'Not available': '#94a3b8',
};
export const DELAY_THEME = {
  'On time': 'emerald',
  Delayed: 'amber',
  'Badly delayed': 'rose',
  'Not available': 'slate',
};

export const PRIMARY_COLOR = '#6366f1';
export const SECONDARY_COLOR = '#059669';

// Financial-year events of the Date Analysis sheet, coloured like the stage they mark.
export const FY_PROGRESS_SERIES = [
  { field: 'initiated', name: 'Projects initiated', color: STAGE_COLORS.planning, type: 'line' },
  { field: 'sanctioned', name: 'Sanctioned (board / admin approval)', color: STAGE_COLORS.tendering, type: 'line' },
  { field: 'awarded', name: 'Contracts awarded (LOA issued)', color: STAGE_COLORS.implementation, type: 'line' },
  { field: 'completed', name: 'Actual completions', color: STAGE_COLORS.completed, type: 'line' },
];
export const FY_MILESTONE_SERIES = [
  { field: 'foundation', name: 'Foundations laid or expected', color: PRIMARY_COLOR },
  { field: 'inauguration', name: 'Inaugurations held or expected', color: SECONDARY_COLOR },
];

// Tailwind classes per card colour (spelled out so Tailwind keeps them).
export const CARD_THEME = {
  indigo: { value: 'text-[#6366f1] dark:text-indigo-400', icon: 'bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900', bar: 'bg-[#6366f1]' },
  emerald: { value: 'text-emerald-700 dark:text-emerald-400', icon: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900', bar: 'bg-emerald-600' },
  amber: { value: 'text-amber-700 dark:text-amber-400', icon: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900', bar: 'bg-amber-500' },
  purple: { value: 'text-purple-700 dark:text-purple-400', icon: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900', bar: 'bg-purple-500' },
  teal: { value: 'text-teal-700 dark:text-teal-400', icon: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900', bar: 'bg-teal-600' },
  rose: { value: 'text-red-700 dark:text-red-400', icon: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900', bar: 'bg-red-700' },
  slate: { value: 'text-slate-600 dark:text-slate-300', icon: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700', bar: 'bg-slate-400' },
};

// Card colour per stage group.
export const STAGE_THEME = {
  planning: 'purple',
  tendering: 'amber',
  implementation: 'indigo',
  completed: 'emerald',
};

// Amounts are in ₹ crore.
export function formatCrore(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 100000) return `₹ ${(n / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Lakh Cr`;
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

// Table amounts: 2 decimals, no unit (the column header carries ₹ Cr).
export const formatAmount = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const formatCount = (v) => (Number(v) || 0).toLocaleString('en-IN');
export const formatPercent = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`);
export const formatDays = (v) => (v === null || v === undefined ? '—' : `${formatCount(v)} days`);
export const formatNumber = (v, digits = 2) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: digits }));

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Chart height that grows with the number of rows of a horizontal chart.
export const rowsHeight = (rows, perRow = 30, min = 260) => Math.max(min, rows * perRow + 60);

// Dashboard table cell as text: columns are { key, label, format?(value, row) }.
export const cellText = (col, row) => (col.format ? col.format(row[col.key], row) : row[col.key] ?? '—');

// A dashboard table's rows as export headers / rows (plain text values).
export function tableExport(columns, rows, totals) {
  return {
    headers: columns.map((c) => c.label),
    rows: [
      ...rows.map((r) => columns.map((c) => cellText(c, r))),
      ...(totals ? [columns.map((c, i) => (i === 0 ? 'Total' : (totals[c.key] !== undefined ? cellText(c, totals) : '')))] : []),
    ],
  };
}
