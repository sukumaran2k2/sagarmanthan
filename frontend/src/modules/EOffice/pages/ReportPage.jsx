import { useEffect, useMemo, useState } from 'react';
import { Filter, AlertCircle, RefreshCw } from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { axiosInstance as api } from '../../../api';
import { COMMON_TOASTS } from '../../../utils/notify';
import { exportTableRows } from '../../../utils/exportTableRows';
import { useEOfficeStore, selectReportPeriod } from '../store/useEOfficeStore';
import { MONTHS, totalsRow } from '../utils/eOfficeUtils';

const WEEKS = [1, 2, 3, 4, 5];
const FIRST_YEAR = 2024; // the earliest E-Office uploads
const asRows = (data) => (Array.isArray(data) ? data : data?.rowData || []);

// One week's sheet for a category, employee by employee, with a Total row
export default function ReportPage({ category, notify }) {
  const period = useEOfficeStore(selectReportPeriod(category.id));
  const setReportPeriod = useEOfficeStore((state) => state.setReportPeriod);
  const pageSize = useEOfficeStore((state) => state.pageSize);
  const setPageSize = useEOfficeStore((state) => state.setPageSize);

  // First visit: open on the latest uploaded week
  useEffect(() => {
    if (period) return undefined;
    let cancelled = false;
    const now = new Date();
    const fallback = { month: MONTHS[now.getMonth()], year: String(now.getFullYear()), week: 1 };
    api.get(`/${category.prefix}-check`)
      .then((res) => {
        const latest = asRows(res.data)[0];
        if (!cancelled) setReportPeriod(category.id, latest ? { month: latest.Month, year: String(latest.Year), week: Number(latest.Week) || 1 } : fallback);
      })
      .catch((err) => {
        console.error('Latest E-Office week could not be loaded:', err);
        if (!cancelled) setReportPeriod(category.id, fallback);
      });
    return () => { cancelled = true; };
  }, [period, category, setReportPeriod]);

  // The week's rows, tagged with the request they answer
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = period ? JSON.stringify([category.id, period.month, period.year, period.week, reloadKey]) : null;
  const [result, setResult] = useState(null); // { key, rows, failed }
  useEffect(() => {
    if (!requestKey) return undefined;
    let cancelled = false;
    api.get(`/${category.prefix}-report/${period.year}/${period.month}/${period.week}`)
      .then((res) => { if (!cancelled) setResult({ key: requestKey, rows: asRows(res.data) }); })
      .catch((err) => {
        if (cancelled) return;
        console.error('E-Office report could not be loaded:', err);
        notify(COMMON_TOASTS.loadFailed(`The ${category.label} report`));
        setResult({ key: requestKey, rows: [], failed: true });
      });
    return () => { cancelled = true; };
  }, [requestKey, category, period, notify]);
  const loading = !requestKey || result?.key !== requestKey;
  const rows = useMemo(() => (loading ? [] : result.rows), [loading, result]);

  const columns = category.columns;
  const total = useMemo(() => [totalsRow(columns, rows)], [columns, rows]);
  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No', width: 70, pinned: 'left',
      valueGetter: (p) => (p.node && !p.node.rowPinned ? p.node.rowIndex + 1 : ''),
      cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
    },
    ...columns.map((c) => ({
      colId: c.key,
      headerName: c.label,
      width: c.width,
      flex: c.flex ?? (c.width ? undefined : 1),
      minWidth: c.minWidth ?? 110,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellClass: c.total ? 'text-center font-bold flex items-center justify-center' : 'flex items-center',
      valueGetter: (p) => {
        if (!p.data) return '';
        if (p.node.rowPinned) return p.data[c.key] ?? '';
        return c.value(p.data);
      },
    })),
  ], [columns]);

  const periodLabel = period ? `Week ${period.week}, ${period.month} ${period.year}` : '';
  const handleExport = (type) => exportTableRows(type, {
    columns,
    rows,
    fileName: `EOffice_${category.label.replace(/ /g, '_')}_${period?.month}_${period?.year}_Week${period?.week}`,
    title: `${category.label} Report - ${periodLabel}`,
    notify,
  });

  const thisYear = new Date().getFullYear();
  const yearOptions = [...new Set([
    ...Array.from({ length: thisYear + 2 - FIRST_YEAR }, (_, i) => String(FIRST_YEAR + i)),
    period?.year,
  ].filter(Boolean))].sort().reverse();
  const selectClass = 'module-form-select !w-auto !py-2';
  const changePeriod = (changes) => setReportPeriod(category.id, changes);

  return (
    <div className="module-card space-y-5">
      {/* Period */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200">
            <Filter size={14} className="text-[#0f417a] dark:text-blue-400" /> Report Period
          </span>
          <select value={period?.month || ''} onChange={(e) => changePeriod({ month: e.target.value })} className={selectClass} disabled={!period}>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={period?.year || ''} onChange={(e) => changePeriod({ year: e.target.value })} className={selectClass} disabled={!period}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={period?.week || ''} onChange={(e) => changePeriod({ week: Number(e.target.value) })} className={selectClass} disabled={!period}>
            {WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="px-3.5 py-2 bg-[#0f417a] hover:bg-[#0c3361] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
          {category.label} Report {period ? `(${periodLabel})` : ''}
        </h3>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <CopyButton onCopy={() => handleExport('copy')} color="#4b2424" hoverBg="#fdf8f6" />
          <ExportDropdown onExportExcel={() => handleExport('excel')} onExportPdf={() => handleExport('pdf')} color="#4b2424" hoverColor="#381b1b" />
        </div>
      </div>

      {!loading && result.failed && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
          <span className="flex items-center gap-2 text-xs font-semibold"><AlertCircle className="h-5 w-5 text-rose-600" /> The report could not be loaded.</span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer">Retry</button>
        </div>
      )}
      {!loading && !result.failed && rows.length === 0 && (
        <p className="text-xs font-semibold text-slate-500">No {category.label} sheet has been uploaded for {periodLabel}.</p>
      )}

      <div className="yp-pro-grid ag-theme-quartz">
        <Table
          rowData={rows}
          columnDefs={columnDefs}
          pinnedBottomRowData={rows.length ? total : undefined}
          loading={loading}
          pagination={true}
          paginationPageSize={pageSize}
          domLayout="autoHeight"
          color="#4b2424"
        />
      </div>
    </div>
  );
}
