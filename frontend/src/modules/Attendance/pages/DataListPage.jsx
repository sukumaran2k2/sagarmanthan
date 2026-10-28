import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Search, X, Filter, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import AttendanceKpiHeader from '../components/AttendanceKpiHeader';
import { COMMON_TOASTS } from '../../../utils/notify';
import { exportTableRows } from '../../../utils/exportTableRows';
import { useAttendanceStore, DEFAULT_VISIBLE_COLS } from '../store/useAttendanceStore';
import { kpisFromRows } from '../utils/attendanceKpis';
import {
  MONTHS, formatTimeStr, calculateWorkingHoursDifference,
  rowEmpId, rowEmpName, rowWing, rowDivision, rowDesignation, rowDaysMarked, rowInTime, rowOutTime, rowWorkHours, rowWeek,
} from '../utils/attendanceUtils';

// The sheet's own Average Working Hours, or out minus in when the sheet left it blank
const workingHours = (r) => {
  const stored = formatTimeStr(rowWorkHours(r));
  return /^\d{2}:\d{2}:\d{2}$/.test(stored) ? stored : calculateWorkingHoursDifference(rowInTime(r), rowOutTime(r), rowWorkHours(r));
};

// Columns by visibility key; value() is shared by the grid and the exports
const COLUMNS = [
  { key: 'EmpId', label: 'Emp ID', value: (r) => rowEmpId(r) ?? '—', width: 110, cellClass: 'font-bold text-[#0f417a] dark:text-blue-400 text-center flex items-center justify-center' },
  { key: 'EmpName', label: 'Employee Name', value: (r) => rowEmpName(r) ?? '—', flex: 2, minWidth: 180, cellClass: 'font-semibold flex items-center' },
  { key: 'Wing', label: 'Wing', value: (r) => rowWing(r) ?? '—', flex: 1.5, minWidth: 140, cellClass: 'flex items-center' },
  { key: 'Division', label: 'Division', value: (r) => rowDivision(r) ?? '—', flex: 1.5, minWidth: 140, cellClass: 'flex items-center' },
  { key: 'Designation', label: 'Designation', value: (r) => rowDesignation(r) ?? '—', flex: 1.5, minWidth: 150, cellClass: 'flex items-center' },
  { key: 'AttendanceMarked', label: 'Days Marked', value: (r) => rowDaysMarked(r) ?? 0, width: 120, cellClass: 'text-center font-bold flex items-center justify-center' },
  { key: 'WorkingHours', label: 'Avg Work Hours', value: workingHours, width: 140, cellClass: 'text-center font-bold flex items-center justify-center' },
  { key: 'InTimeAvg', label: 'In Time Avg', value: (r) => formatTimeStr(rowInTime(r)), width: 130, cellClass: 'text-center text-emerald-700 dark:text-emerald-400 flex items-center justify-center' },
  { key: 'OutTimeAvg', label: 'Out Time Avg', value: (r) => formatTimeStr(rowOutTime(r)), width: 130, cellClass: 'text-center flex items-center justify-center' },
];

const options = (values) => [...new Set(values.filter((v) => v !== undefined && v !== null && v !== '').map(String))];

export default function DataListPage({ notify, rows, loading, loadError, onRetry }) {
  const { filters, searchTerm, showFilterPanel, pageSize, visibleCols } = useAttendanceStore(useShallow((state) => ({
    filters: state.filters,
    searchTerm: state.searchTerm,
    showFilterPanel: state.showFilterPanel,
    pageSize: state.pageSize,
    visibleCols: state.visibleCols,
  })));
  const actions = useAttendanceStore(useShallow((state) => ({
    setFilters: state.setFilters,
    resetFilters: state.resetFilters,
    setSearchTerm: state.setSearchTerm,
    setShowFilterPanel: state.setShowFilterPanel,
    setPageSize: state.setPageSize,
    setVisibleCols: state.setVisibleCols,
  })));

  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) setColDropdownOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Filter choices from the data itself
  const choices = useMemo(() => ({
    wings: options(rows.map(rowWing)).sort(),
    months: MONTHS.filter((m) => rows.some((r) => r.Month === m)),
    years: options(rows.map((r) => r.Year)).sort().reverse(),
    weeks: options(rows.map(rowWeek)).sort((a, b) => Number(a) - Number(b)),
  }), [rows]);

  const activeFilters = Object.values(filters).filter((v) => v !== 'All').length;

  // With no filter set, only the latest uploaded sheet is shown; any filter searches all uploads
  const latestFileId = useMemo(() => rows.reduce((max, r) => Math.max(max, Number(r.File_Id) || 0), 0) || null, [rows]);
  const shownRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      if (!activeFilters && latestFileId !== null && Number(r.File_Id) !== latestFileId) return false;
      if (filters.wing !== 'All' && rowWing(r) !== filters.wing) return false;
      if (filters.month !== 'All' && r.Month !== filters.month) return false;
      if (filters.year !== 'All' && String(r.Year) !== filters.year) return false;
      if (filters.week !== 'All' && String(rowWeek(r)) !== filters.week) return false;
      if (term && !COLUMNS.some((c) => String(c.value(r)).toLowerCase().includes(term))) return false;
      return true;
    });
  }, [rows, filters, searchTerm, activeFilters, latestFileId]);

  const kpis = useMemo(() => kpisFromRows(shownRows), [shownRows]);

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No', width: 70, pinned: 'left',
      valueGetter: (p) => (p.node && !p.node.rowPinned ? p.node.rowIndex + 1 : ''),
      cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
    },
    ...COLUMNS.map((c) => ({
      colId: c.key,
      headerName: c.label,
      width: c.width,
      flex: c.flex,
      minWidth: c.minWidth,
      hide: !visibleCols[c.key],
      cellClass: c.cellClass,
      valueGetter: (p) => (p.data ? c.value(p.data) : ''),
    })),
  ], [visibleCols]);

  const handleExport = (type) => exportTableRows(type, {
    columns: COLUMNS.filter((c) => visibleCols[c.key]),
    rows: shownRows,
    fileName: 'Attendance_Data',
    title: 'Employee Attendance',
    notify,
  });

  const clearFilters = () => {
    actions.resetFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  const select = (label, key, list, format = (v) => v) => (
    <div>
      <label className="module-form-label">{label}</label>
      <select value={filters[key]} onChange={(e) => actions.setFilters({ [key]: e.target.value })} className="module-form-select">
        <option value="All">All</option>
        {list.map((v) => <option key={v} value={v}>{format(v)}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <AttendanceKpiHeader
        totalEmployeesStat={kpis.employees}
        avgWorkingHoursFormatted={kpis.avgWorkingHours}
        punctualArrivalRate={kpis.punctualRate}
        earlyCheckoutRate={kpis.earlyCheckoutRate}
      />

      <div className="module-card space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel((open) => !open)}
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
              {activeFilters ? 'Showing all uploads matching the filters' : 'Showing the latest uploaded sheet'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee, wing..."
                value={searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select value={pageSize} onChange={(e) => actions.setPageSize(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{loading ? '...' : shownRows.length}</span>
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen((open) => !open)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
                    <button type="button" onClick={() => actions.setVisibleCols(DEFAULT_VISIBLE_COLS)} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Show All</button>
                  </div>
                  {COLUMNS.map((c) => (
                    <label key={c.key} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[c.key]}
                        onChange={() => actions.setVisibleCols((cols) => ({ ...cols, [c.key]: !cols[c.key] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
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

        {loadError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <span className="text-xs font-semibold">The attendance records could not be loaded.</span>
            </div>
            <button type="button" onClick={onRetry} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5">
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="module-datalist-grid">
          <Table
            rowData={shownRows}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={pageSize}
            color="#0f417a"
          />
        </div>
      </div>
    </div>
  );
}
