import React, { useState, useMemo } from "react";
import { Search, Plus, Info, Filter, ChevronDown } from "lucide-react";
import Table from "../../../components/Table";
import CopyButton from "../../../components/CopyButton";
import ExportDropdown from "../../../components/ExportDropdown";

export default function CapexDataListView({
  searchTerm,
  setSearchTerm,
  pageSize,
  setPageSize,
  filteredData,
  colDefs,
  pinnedBottomRowData,
  loading,
  onOpenAddModal,
  handleCopyData,
  handleExportExcel,
  handleExportPdf,
  organisations = [],
  filterYear,
  setFilterYear,
  filterOrg,
  setFilterOrg,
  viewMode = "ministry",
}) {
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Bar: Add Data Button (Only visible for Ministry View) */}
      {viewMode !== "org" && (
        <div className="flex justify-end">
          <button
            onClick={onOpenAddModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Data</span>
          </button>
        </div>
      )}

      {/* Collapsible Filter Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
          className="p-3.5 bg-slate-100/90 hover:bg-slate-200/80 transition flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-[#0f417a]" />
            <span className="text-xs font-black text-[#0f417a] uppercase tracking-wide">
              Filter Options
            </span>
            {(filterYear || filterOrg) && (
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-extrabold">
                Active Filter
              </span>
            )}
          </div>

          <ChevronDown
            size={18}
            className={`text-slate-600 transition-transform duration-300 ${
              isFilterCollapsed ? "-rotate-90" : "rotate-0"
            }`}
          />
        </div>

        {!isFilterCollapsed && (
          <div className="p-4 border-t border-slate-200 space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Financial Year Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Financial Year
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="">Show All</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2022-2023">2022-2023</option>
                </select>
              </div>

              {/* Organisation Filter (Visible for Ministry View or pre-selected) */}
              {viewMode !== "org" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organisation
                  </label>
                  <select
                    value={filterOrg}
                    onChange={(e) => setFilterOrg(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">Show All</option>
                    {organisations.map((org) => (
                      <option key={org.organisation_id || org.id} value={org.organisation_name || org.name}>
                        {org.organisation_name || org.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organisation View Mode
                  </label>
                  <div className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700">
                    {filterOrg || "Port / Organisation Scoped View"}
                  </div>
                </div>
              )}
            </div>

            {/* Note underneath filters */}
            <div className="text-xs text-slate-600 font-semibold italic flex items-center space-x-1.5 pt-1">
              <Info size={14} className="text-blue-600 flex-shrink-0" />
              <span>Note : The planned/Target values are entered by the MoPSW Admin team.</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Toolbar Header with CopyButton and ExportDropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <CopyButton onCopy={handleCopyData} color="#0f417a" />
          <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#0f417a" hoverColor="#0b3260" />
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 shadow-xs">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent font-extrabold text-[#0f417a] focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-800 shadow-xs"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main AG Grid Data Table */}
      <div className="relative min-h-[380px] capex-grid">
        <Table
          rowData={filteredData}
          columnDefs={colDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          pagination={true}
          paginationPageSize={pageSize}
          loading={loading}
          color="#28408f"
        />
      </div>
    </div>
  );
}
