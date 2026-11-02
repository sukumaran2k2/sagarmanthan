import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowLeft, ChevronDown, ChevronUp, Filter, RefreshCw, RotateCcw, Search, TrendingUp, X } from 'lucide-react';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { exportReportToPdf } from '../../../utils/exportReportPdf';
import GroupedTable from './GroupedTable';
import ReportSelect from './ReportSelect';
import { exportMatrix, formatAsOnDate, searchRows } from './reportUtils';
import { REPORT_THEME as T } from './theme';
import { COMMON_TOASTS } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';

export function FilterField({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[11.5px] font-extrabold" style={{ color: T.brand }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** Dropdown styled like the Capex report filters; '' is the "show all" choice. */
export function FilterSelect({ label, value, onChange, options, placeholder = 'Show All', disabled }) {
  return (
    <FilterField label={label}>
      <ReportSelect value={value} onChange={onChange} options={options} placeholder={placeholder} disabled={disabled} />
    </FilterField>
  );
}

/** Two-state switch, e.g. "With Cluster" / "Without Cluster". */
export function ToggleField({ label, checked, onChange, onLabel, offLabel }) {
  return (
    <FilterField label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="inline-flex w-full items-center gap-2 rounded-[10px] px-3 py-[7px] text-xs font-bold cursor-pointer"
        style={{ background: T.surface, border: `1px solid ${T.inputBorder}`, color: T.brand }}
      >
        <span className="relative inline-block h-5 w-9 shrink-0 rounded-full transition" style={{ background: checked ? T.brandSolid : T.inputBorder }}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
        {checked ? onLabel : offLabel}
      </button>
    </FilterField>
  );
}

const fileStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}`;
};

/**
 * One HR report in the Capex report layout: title card with search and actions, a collapsible
 * "Filter Report Parameters" panel, an optional note, optional summary cards, then the table.
 * `getTotals(rows)` receives the rows left after the search and returns the total row (or null).
 */
export default function ReportLayout({
  report,
  meta,
  onBack,
  rows,
  columns,
  getTotals,
  loading,
  onRefresh,
  filters,
  filtersActive = false,
  onResetFilters,
  note,
  summary,
  notify,
  emptyMessage,
}) {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);

  const shownRows = useMemo(() => searchRows(columns, rows, search), [columns, rows, search]);
  const totals = useMemo(() => (getTotals ? getTotals(shownRows) : null), [getTotals, shownRows]);
  const title = report.heading || report.title;
  const fileName = `${report.coding} ${report.title} ${fileStamp()}`;

  const matrix = () => exportMatrix(columns, shownRows, totals);

  const handleCopy = async () => {
    const { headers, body } = matrix();
    try {
      await navigator.clipboard.writeText([headers, ...body].map((r) => r.join('\t')).join('\n'));
      notify?.(HR_TOASTS.reportCopied());
    } catch {
      notify?.(COMMON_TOASTS.copyFailed());
    }
  };

  const handleExcel = () => {
    const { headers, body } = matrix();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[title], [`As on date: ${formatAsOnDate()}`], [], headers, ...body]), 'Report');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    notify?.(COMMON_TOASTS.excelExported(`${fileName}.xlsx`));
  };

  const handlePdf = async () => {
    const { headers, body } = matrix();
    await exportReportToPdf({
      title,
      columnDefs: headers.map((h, i) => ({ headerName: h, field: `c${i}` })),
      rowData: body.map((r) => Object.fromEntries(r.map((v, i) => [`c${i}`, v]))),
      fileName,
    });
    notify?.(HR_TOASTS.reportExported('PDF'));
  };

  const iconBtn =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-white text-slate-500 transition hover:text-[#4b2424] hover:border-[#4b2424] dark:bg-slate-900 cursor-pointer';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Title card */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-[26px] py-5 shadow-sm bg-gradient-to-r from-[#fdfcfc] to-[#f7f3f3] dark:from-slate-900 dark:to-slate-900"
        style={{ border: `1px solid ${T.line}` }}
      >
        <div className="flex min-w-[280px] flex-1 items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className={iconBtn} style={{ border: `1px solid ${T.line}` }} title="Back to HR Reports">
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp size={14} strokeWidth={2.5} style={{ color: T.brandSoft }} />
              <span className="text-[10.5px] font-extrabold uppercase tracking-[0.12em]" style={{ color: T.brandSoft }}>
                HR Module · {report.coding}
              </span>
            </div>
            <h3 className="m-0 text-xl font-bold tracking-wide" style={{ color: T.brand }}>
              {title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold" style={{ color: T.brandSoft }}>
              <span>
                As on date: <strong style={{ color: T.brand }}>{formatAsOnDate()}</strong>
              </span>
              {meta && (
                <>
                  <span style={{ color: T.line }}>•</span>
                  <span>{meta}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.brandSoft }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search report..."
              className="w-full rounded-[9px] bg-white py-2 pl-9 pr-8 text-[13.5px] font-medium outline-none transition focus:ring-[3px] focus:ring-[#4b2424]/10 dark:bg-slate-900"
              style={{ border: `1px solid ${T.line}`, color: T.brand }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: T.brandSoft }}>
                <X size={13} />
              </button>
            )}
          </div>
          <CopyButton onCopy={handleCopy} color={T.brand} hoverBg={T.tint} className="!rounded-[9px] !py-[9px] !px-[16px]" />
          <ExportDropdown onExportExcel={handleExcel} onExportPdf={handlePdf} color={T.brand} hoverColor={T.brandHover} />
          <button type="button" onClick={onRefresh} className={iconBtn} style={{ border: `1px solid ${T.line}` }} title="Refresh Data">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {filters && (
        // No overflow-hidden here: it would clip the filter dropdown lists.
        <div className="rounded-2xl" style={{ border: `1px solid ${T.border}`, background: T.surface }}>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`flex w-full items-center justify-between px-[18px] py-3 text-xs font-extrabold transition cursor-pointer ${filtersOpen ? 'rounded-t-2xl' : 'rounded-2xl'}`}
            style={{ background: T.accent, color: T.brand }}
          >
            <span className="flex items-center gap-2">
              <Filter size={15} />
              Filter Report Parameters
              {filtersActive && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: T.brandSolid }}>
                  Active
                </span>
              )}
            </span>
            {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {filtersOpen && (
            <div className="space-y-3 rounded-b-2xl bg-white p-4 text-left dark:bg-slate-900" style={{ borderTop: `1px solid ${T.border}` }}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{filters}</div>
              {onResetFilters && (
                <div className="flex justify-end pt-2" style={{ borderTop: `1px solid ${T.line}` }}>
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11.5px] font-extrabold cursor-pointer"
                    style={{ background: T.pill, border: `1px solid ${T.inputBorder}`, color: T.brand }}
                  >
                    <RotateCcw size={12} />
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {note && (
        <div className="rounded-xl p-3.5 text-left text-xs font-bold" style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.brand }}>
          Note : {note}
        </div>
      )}

      {summary}

      <GroupedTable columns={columns} rows={shownRows} totals={totals} loading={loading} emptyMessage={emptyMessage} />
    </div>
  );
}
