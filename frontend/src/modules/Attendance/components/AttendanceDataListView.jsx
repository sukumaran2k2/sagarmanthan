import React from 'react';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import Table from '../../../components/table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

export default function AttendanceDataListView({
  dataFilterWing,
  setDataFilterWing,
  dataFilterMonth,
  setDataFilterMonth,
  dataFilterYear,
  setDataFilterYear,
  availableWings,
  availableMonths,
  availableYears,
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
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Top Filter Bar for View Data List */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 transition-all shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <CopyButton onCopy={handleCopyData} color="#0f417a" hoverBg="#f1f5f9" />
          <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#0f417a" hoverColor="#0c3361" />
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold focus:outline-none text-slate-700 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        <div className="relative max-w-xs w-full">
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
