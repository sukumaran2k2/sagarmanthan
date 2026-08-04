import React from "react";
import { Filter, ChevronDown, Search } from "lucide-react";
import Table from "../../../components/Table";
import CopyButton from "../../../components/CopyButton";
import ExportDropdown from "../../../components/ExportDropdown";

export default function EOfficeReportView({
  isFilterCollapsed,
  setIsFilterCollapsed,
  month,
  setMonth,
  year,
  setYear,
  week,
  setWeek,
  handleFetchReportClick,
  handleCopyData,
  handleExportExcel,
  handleExportPdf,
  pageSize,
  setPageSize,
  searchTerm,
  setSearchTerm,
  loading,
  filteredData,
  colDefs,
  pinnedBottomRowData,
}) {
  return (
    <div className="space-y-6">
      {/* Collapsable Filters Panel */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 transition-all shadow-xs">
        <div
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center space-x-2 text-slate-800 font-extrabold text-xs uppercase tracking-wide">
            <Filter size={14} className="text-[#5c2424]" />
            <span>Report Filters & Parameters</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400">
              {isFilterCollapsed ? "Show Filters" : "Hide Filters"}
            </span>
            <button
              type="button"
              className="p-1 text-slate-500 hover:text-slate-700 transition"
            >
              <ChevronDown
                className={`h-4 w-4 transform transition-transform duration-200 ${isFilterCollapsed ? "-rotate-90" : "rotate-0"}`}
              />
            </button>
          </div>
        </div>

        {!isFilterCollapsed && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-col md:flex-row md:items-end justify-between gap-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 flex-grow">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Month
                </label>
                <div className="relative">
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-amber-100 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Year
                </label>
                <div className="relative">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-amber-100 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Week
                </label>
                <div className="relative">
                  <select
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-amber-100 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="Week 1">Week 1</option>
                    <option value="Week 2">Week 2</option>
                    <option value="Week 3">Week 3</option>
                    <option value="Week 4">Week 4</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFetchReportClick}
              className="px-5 py-2.5 bg-[#5c2424] hover:bg-[#4a1d1d] text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>Fetch Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Controls & Grid Table */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <CopyButton
            onCopy={handleCopyData}
            color="#5c2424"
            hoverBg="#fdf8f6"
          />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            color="#5c2424"
            hoverColor="#4a1d1d"
          />
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold focus:outline-none text-slate-700 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Search report details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 transition font-medium"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      <div className="relative min-h-[350px] eoffice-brown-grid">
        <Table
          rowData={filteredData}
          columnDefs={colDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          pagination={true}
          paginationPageSize={pageSize}
          loading={loading}
          color="#5c2424"
        />
      </div>
    </div>
  );
}
