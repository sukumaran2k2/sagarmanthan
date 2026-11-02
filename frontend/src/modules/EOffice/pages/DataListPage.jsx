import { useEffect, useMemo, useState } from 'react';
import { Search, X, Filter, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { axiosInstance as api } from '../../../api';
import { COMMON_TOASTS } from '../../../utils/notify';
import { exportTableRows } from '../../../utils/exportTableRows';
import { useEOfficeStore, selectFilters, selectSearchTerm } from '../store/useEOfficeStore';
import { MONTHS, rowPeriod, rowWeek, rowWing, totalsRow } from '../utils/eOfficeUtils';

const options = (values) => [...new Set(values.filter((v) => v !== undefined && v !== null && v !== '').map(String))];
const samePeriod = (a, b) => a.Month === b.Month && String(a.Year) === String(b.Year) && rowWeek(a) === rowWeek(b);

// Every uploaded row of one category. With no filter set only the latest uploaded week is
// shown; any filter searches all uploads.
export default function DataListPage({ category, notify, reloadKey }) {
  const filters = useEOfficeStore(selectFilters(category.id));
  const searchTerm = useEOfficeStore(selectSearchTerm(category.id));
  const showFilterPanel = useEOfficeStore((state) => state.showFilterPanel);
  const pageSize = useEOfficeStore((state) => state.pageSize);
  const setFilters = useEOfficeStore((state) => state.setFilters);
  const resetFilters = useEOfficeStore((state) => state.resetFilters);
  const setSearchTerm = useEOfficeStore((state) => state.setSearchTerm);
  const setShowFilterPanel = useEOfficeStore((state) => state.setShowFilterPanel);
  const setPageSize = useEOfficeStore((state) => state.setPageSize);

  // Rows tagged with the request they answer; Retry bumps retryKey
  const [retryKey, setRetryKey] = useState(0);
  const requestKey = `${category.id}:${reloadKey}:${retryKey}`;
  const [result, setResult] = useState(null); // { key, rows, failed }
  useEffect(() => {
    let cancelled = false;
    api.get(`/${category.prefix}-all`)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.rowData || [];
        if (!cancelled) setResult({ key: requestKey, rows });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('E-Office rows could not be loaded:', err);
        setResult({ key: requestKey, rows: [], failed: true });
        notify(COMMON_TOASTS.loadFailed(`The ${category.label} records`));
      });
    return () => { cancelled = true; };
  }, [requestKey, category, notify]);
  const loading = result?.key !== requestKey;
  const rows = useMemo(() => (loading ? [] : result.rows), [loading, result]);

  // Filter choices from the data itself
  const choices = useMemo(() => ({
    wings: options(rows.map(rowWing)).sort(),
    months: MONTHS.filter((m) => rows.some((r) => r.Month === m)),
    years: options(rows.map((r) => r.Year)).sort().reverse(),
    weeks: options(rows.map(rowWeek)).sort((a, b) => Number(a) - Number(b)),
  }), [rows]);

  const activeFilters = Object.values(filters).filter((v) => v !== 'All').length;

  const columns = category.columns;
  const listColumns = useMemo(() => [...columns, { key: 'Period', label: 'Period', value: rowPeriod, minWidth: 170 }], [columns]);

  // The server returns the newest rows first, so rows[0] is from the latest upload
  const shownRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      if (!activeFilters && !samePeriod(r, rows[0])) return false;
      if (filters.wing !== 'All' && rowWing(r) !== filters.wing) return false;
      if (filters.month !== 'All' && r.Month !== filters.month) return false;
      if (filters.year !== 'All' && String(r.Year) !== filters.year) return false;
      if (filters.week !== 'All' && String(rowWeek(r)) !== filters.week) return false;
      if (term && !listColumns.some((c) => String(c.value(r)).toLowerCase().includes(term))) return false;
      return true;
    });
  }, [rows, filters, searchTerm, activeFilters, listColumns]);

  const total = useMemo(() => [totalsRow(columns, shownRows)], [columns, shownRows]);

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No', width: 70, pinned: 'left',
      valueGetter: (p) => (p.node && !p.node.rowPinned ? p.node.rowIndex + 1 : ''),
      cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
    },
    ...listColumns.map((c) => ({
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
  ], [listColumns]);

  const handleExport = (type) => exportTableRows(type, {
    columns: listColumns,
    rows: shownRows,
    fileName: `EOffice_${category.label.replace(/ /g, '_')}_Data`,
    title: `E-Office ${category.label}`,
    notify,
  });

  const clearFilters = () => {
    resetFilters(category.id);
    notify(COMMON_TOASTS.filtersReset());
  };

  const select = (label, key, list, format = (v) => v) => (
    <div>
      <label className="module-form-label">{label}</label>
      <select value={filters[key]} onChange={(e) => setFilters(category.id, { [key]: e.target.value })} className="module-form-select">
        <option value="All">All</option>
        {list.map((v) => <option key={v} value={v}>{format(v)}</option>)}
      </select>
    </div>
  );

  return (
    <div className="module-card space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowFilterPanel((open) => !open)}
            className={`module-filter-btn ${showFilterPanel || activeFilters > 0 ? 'active' : ''}`}
          >
            <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
            <span>Filter</span>
            {activeFilters > 0 && (
              <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">{activeFilters}</span>
            )}
            <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
          </button>
          {(activeFilters > 0 || searchTerm) && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
          <span className="text-[11px] font-semibold text-slate-500">
            {activeFilters ? 'Showing all uploads matching the filters' : `Showing the latest uploaded week${rows[0] ? ` (${rowPeriod(rows[0])})` : ''}`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 justify-end">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee, wing..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(category.id, e.target.value)}
              className="w-full module-search-input"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{loading ? '...' : shownRows.length}</span>
          </div>

          <CopyButton onCopy={() => handleExport('copy')} color="#0f417a" />
          <ExportDropdown onExportExcel={() => handleExport('excel')} onExportPdf={() => handleExport('pdf')} color="#0f417a" hoverColor="#0c3361" />
        </div>
      </div>

      {showFilterPanel && (
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {select('Wing', 'wing', choices.wings)}
            {select('Month', 'month', choices.months)}
            {select('Week', 'week', choices.weeks, (w) => `Week ${w}`)}
            {select('Year', 'year', choices.years)}
          </div>
        </div>
      )}

      {!loading && result.failed && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span className="text-xs font-semibold">The {category.label} records could not be loaded.</span>
          </div>
          <button type="button" onClick={() => setRetryKey((k) => k + 1)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5">
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      <div className="module-datalist-grid">
        <Table
          rowData={shownRows}
          columnDefs={columnDefs}
          pinnedBottomRowData={shownRows.length ? total : undefined}
          loading={loading}
          pagination={true}
          paginationPageSize={pageSize}
          color="#0f417a"
        />
      </div>
    </div>
  );
}
