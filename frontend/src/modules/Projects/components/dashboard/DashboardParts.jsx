import { RefreshCw } from 'lucide-react';
import TableExportMenu from '../../../../components/TableExportMenu';
import { CARD_THEME, cellText, tableExport } from './dashboardTheme';

// Building blocks of the Projects dashboard, in the shared indigo dashboard theme
// (Capex / Consultant Appointment dashboards).

// Headline figure with optional progress bar and key-value details. When onOpen is
// given the card opens the projects behind it.
export function KpiCard({ label, value, caption, theme = 'indigo', icon: Icon, progress, details = [], onOpen }) {
  const t = CARD_THEME[theme];
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block">{label}</span>
          <span className={`text-2xl font-black block mt-1 ${t.value}`}>{value}</span>
          {caption ? <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{caption}</span> : null}
        </div>
        {Icon ? (
          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${t.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {progress !== undefined && progress !== null ? (
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-3 overflow-hidden">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      ) : null}
      {details.length ? (
        <dl className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
          {details.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400 truncate">{k}</dt>
              <dd className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
  const frame = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col text-left';
  if (!onOpen) return <div className={frame}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      title="View these projects"
      className={`${frame} transition hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer`}
    >
      {body}
    </button>
  );
}

export function FilterSelect({ label, value, onChange, options, disabled = false, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// Card with the gradient header; actions sit on the right of the header.
export function Section({ title, actions, note, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col ${className}`}>
      <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">{title}</h3>
        {actions ? <div className="flex items-center gap-1 flex-shrink-0">{actions}</div> : null}
      </div>
      <div className="p-4 flex-1 min-h-0 flex flex-col">{children}</div>
      {note ? <p className="text-[9px] text-slate-600 dark:text-slate-400 px-5 pb-2">{note}</p> : null}
    </div>
  );
}

// Divider with a caption between groups of sections.
export function SectionDivider({ title }) {
  return (
    <div className="flex items-center gap-3 pt-2" role="separator" aria-label={title}>
      <span className="flex-1 h-px bg-slate-300 dark:bg-slate-700" />
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</span>
      <span className="flex-1 h-px bg-slate-300 dark:bg-slate-700" />
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.line ? (
            <span className="relative w-5 h-3 flex items-center">
              <span className="absolute inset-x-0 h-0.5" style={{ backgroundColor: item.color }} />
              <span className="relative mx-auto w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            </span>
          ) : (
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
          )}
          <span className="text-[11px] text-slate-600 dark:text-slate-300">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function NoData({ text = 'No projects for this selection', className = 'h-60' }) {
  return <div className={`${className} flex items-center justify-center text-sm text-slate-600 dark:text-slate-300`}>{text}</div>;
}

export function Loading({ text = 'Loading dashboard...', className = 'py-20' }) {
  return (
    <div className={`flex items-center justify-center ${className} text-slate-400 text-sm`}>
      <RefreshCw size={16} className="animate-spin mr-2" /> {text}
    </div>
  );
}

// Underline tabs that switch the content of a section (GMIS dashboard style).
export function SectionTabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800 mb-3" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 text-[11px] font-bold border-b-2 -mb-px rounded-t-lg transition cursor-pointer ${
            value === t.id
              ? 'border-[#4f46e5] text-[#4f46e5] bg-indigo-100/70 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// A figure (or project ID) that opens what is behind it; plain text when there is nothing
// to open (a zero count or an empty value).
export function DrillValue({ value, text, onOpen }) {
  const empty = value === null || value === undefined || value === '' || (typeof value === 'number' && value === 0);
  if (!onOpen || empty) return <span>{text ?? value}</span>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="font-bold text-[#4f46e5] dark:text-indigo-300 hover:underline underline-offset-2 cursor-pointer tabular-nums"
    >
      {text ?? value}
    </button>
  );
}

// Plain dashboard table: sticky indigo header, zebra rows, optional totals row.
// A column with drill(row) makes its numbers open the projects behind them.
export function DataTable({ columns, rows, totals, rowKey = 'key', maxHeight = 420, empty = 'No projects for this selection' }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-[11px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#4f46e5] text-white">
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-semibold whitespace-nowrap ${c.align === 'left' ? 'text-left' : 'text-right'}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r[rowKey] ?? i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-1.5 ${c.align === 'left' ? 'text-left text-slate-800 dark:text-slate-100 font-semibold' : 'text-right tabular-nums text-slate-700 dark:text-slate-200'} ${c.wrap ? 'min-w-[180px]' : 'whitespace-nowrap'}`}
                >
                  {c.drill ? <DrillValue value={r[c.key]} text={cellText(c, r)} onOpen={c.drill(r)} /> : cellText(c, r)}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length ? (
            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">{empty}</td></tr>
          ) : null}
        </tbody>
        {totals && rows.length ? (
          <tfoot className="font-bold text-slate-800 dark:text-slate-100">
            <tr className="bg-indigo-50 dark:bg-indigo-950/30">
              {columns.map((c, i) => (
                <td key={c.key} className={`px-3 py-2 border-t border-slate-200 dark:border-slate-700 ${i === 0 ? 'text-left' : 'text-right tabular-nums'}`}>
                  {i === 0
                    ? 'Total'
                    : totals[c.key] === undefined
                      ? ''
                      : c.drill && c.totalDrill
                        ? <DrillValue value={totals[c.key]} text={cellText(c, totals)} onOpen={c.totalDrill()} />
                        : cellText(c, totals)}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

// Table section with its export menu in the header.
export function TableSection({ title, columns, rows, totals, fileName, note, maxHeight, rowKey, actions }) {
  return (
    <Section
      title={title}
      note={note}
      actions={(
        <>
          {actions}
          {rows.length ? <TableExportMenu {...tableExport(columns, rows, totals)} fileName={fileName} title={title} /> : null}
        </>
      )}
    >
      <DataTable columns={columns} rows={rows} totals={totals} maxHeight={maxHeight} rowKey={rowKey} />
    </Section>
  );
}
