import React, { useState, useRef, useEffect } from 'react';
import { Search, AlertCircle, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

export default function AttendanceDataListView({
  dataFilterWing,
  setDataFilterWing,
  dataFilterMonth,
  setDataFilterMonth,
  dataFilterYear,
  setDataFilterYear,
  dataFilterWeek,
  setDataFilterWeek,
  availableWings,
  availableMonths,
  availableYears,
  availableWeeks,
  handleCopyData,
  handleExportExcel,
  handleExportPdf,
  pageSize,
  setPageSize,
  searchTerm,
  setSearchTerm,
  fetchError,
  fetchFilesAndData,
  loading,
  filteredEmployeeRows,
  employeeColDefs,
  pinnedBottomRowData,
  visibleCols,
  setVisibleCols,
  columnLabels,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [dataFilterWing, dataFilterMonth, dataFilterYear, dataFilterWeek].filter(v => v && v !== 'All').length;

  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Filters + Search + Actions -- all in one row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setFiltersOpen(prev => !prev)}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60 transition"
          >
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filters</span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                {activeFilterCount} active
              </span>
            )}
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          <div className="relative w-64 shrink-0">
            <input
              type="text"
              placeholder="Search raw data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 transition font-medium"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {visibleCols && (
            <div className="relative" ref={colDropdownRef}>
              <button
                onClick={() => setColDropdownOpen((v) => !v)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5">
                  {Object.keys(visibleCols).map((col) => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{columnLabels?.[col] || col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <CopyButton onCopy={handleCopyData} color="#0f417a" hoverBg="#f1f5f9" />
          <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#0f417a" hoverColor="#0c3361" />
        </div>
      </div>

      {filtersOpen && (
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl transition-all shadow-xs">
          <div className="px-4 py-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Filter By Wing
                </label>
                <select
                  value={dataFilterWing}
                  onChange={(e) => setDataFilterWing(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-100 cursor-pointer shadow-2xs"
                >
                  <option value="All">All Wings ({availableWings.length - 1})</option>
                  {availableWings.filter(w => w !== 'All').map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Filter By Month
                </label>
                <select
                  value={dataFilterMonth}
                  onChange={(e) => setDataFilterMonth(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-100 cursor-pointer shadow-2xs"
                >
                  <option value="All">All Months</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Filter By Week
                </label>
                <select
                  value={dataFilterWeek}
                  onChange={(e) => setDataFilterWeek(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-100 cursor-pointer shadow-2xs"
                >
                  <option value="All">All Weeks</option>
                  {availableWeeks.filter(w => w !== 'All').map(w => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Filter By Year
                </label>
                <select
                  value={dataFilterYear}
                  onChange={(e) => setDataFilterYear(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-100 cursor-pointer shadow-2xs"
                >
                  <option value="All">All Years</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          </div>
        )}

      {fetchError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-800 animate-fade-in shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <div>
              <div className="font-extrabold text-xs uppercase tracking-wide">Data Fetch Failure</div>
              <div className="text-xs text-rose-600 font-medium">{fetchError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchFilesAndData(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5 flex-shrink-0 shadow-xs"
          >
            <RefreshCw size={14} />
            <span>Retry Fetch</span>
          </button>
        </div>
      )}

      <div className="relative min-h-[350px] ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-30 flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <div className="w-full absolute top-0 left-0 right-0 h-1.5 bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-[#0f417a] animate-indeterminate-progress"></div>
            </div>
            <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-100 text-[#0f417a] flex items-center space-x-3 shadow-sm">
              <div className="animate-spin rounded-full h-6 w-6 border-3 border-[#0f417a] border-t-transparent"></div>
              <span className="text-xs font-extrabold tracking-wide">Fetching employee attendance records from database...</span>
            </div>
          </div>
        )}
        <Table
          rowData={filteredEmployeeRows}
          columnDefs={employeeColDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          pagination={true}
          paginationPageSize={pageSize}
        />
      </div>
    </div>
  );
}
