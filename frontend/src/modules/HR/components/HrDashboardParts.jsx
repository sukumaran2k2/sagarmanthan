import { Download } from 'lucide-react';
import ScrollTable from './ScrollTable';

// Building blocks shared by the Major Port and non-port HR dashboards, so both look the same.

export function Section({ title, icon: Icon, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-4">
        {Icon && <Icon className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />} {title}
      </h3>
      {children}
    </section>
  );
}

export function ChartCard({ title, asOn, children }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</span>
        <span className="text-[10px] text-slate-400">As on {asOn}</span>
      </div>
      {children}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[9rem] max-w-[16rem]"
      >
        <option value="">-- Show All --</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function DashboardTable({ title, subtitle, icon: Icon, rows, columns, totals, filters, onExport, maxHeight = '20rem' }) {
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {Icon && <Icon className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />} {title}
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">{rows.length}</span>
          </h3>
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={!rows.length}
          title="Export to Excel"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 rounded-lg cursor-pointer disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
      </div>
      {filters && <div className="flex flex-wrap items-end gap-3 mb-3">{filters}</div>}
      {/* Only the rows scroll; the header and the totals stay in place */}
      <ScrollTable
        maxHeight={maxHeight}
        minWidth={`${Math.max(36, columns.length * 8)}rem`}
        rows={rows}
        columns={[
          { key: 'sno', label: 'S.No', width: '3.5rem', render: (r, i) => <span className="text-slate-500">{i + 1}</span> },
          ...columns.map((c) => ({
            key: c.label, label: c.label, width: c.width, align: c.num ? 'right' : 'left',
            render: c.render || ((r) => c.value(r)),
          })),
        ]}
        footer={totals ? ['Total', ...totals] : null}
      />
    </section>
  );
}
