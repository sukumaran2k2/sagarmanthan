import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, Info, Filter, ChevronDown, Eye } from "lucide-react";
import Table from "../../../components/Table";
import CopyButton from "../../../components/CopyButton";
import ExportDropdown from "../../../components/ExportDropdown";

export default function GEMDataListView({
  categoryTitle = "Goods",
  searchTerm,
  setSearchTerm,
  pageSize,
  setPageSize,
  filteredData = [],
  colDefs = [],
  pinnedBottomRowData = [],
  loading = false,
  onOpenAddModal,
  handleCopyData,
  handleExportExcel,
  handleExportPdf,
  organisations = [],
  filterYear,
  setFilterYear,
  filterOrg,
  setFilterOrg,
  visibleCols,
  setVisibleCols,
  viewMode = "ministry",
}) {
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);
  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) {
        setColDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Bar: Add Data Button (Visible for Ministry View except Total tab) */}
      {viewMode !== "org" && !categoryTitle.toLowerCase().includes("total") && (
        <div className="flex justify-end">
          <button
            onClick={onOpenAddModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add {categoryTitle} Data</span>
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
              Filter Options ({categoryTitle})
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

              {/* Organisation Filter */}
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
                      <option
                        key={org.organisation_id || org.id}
                        value={org.organisation_name || org.name}
                      >
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

      {/* Action Toolbar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <CopyButton onCopy={handleCopyData} color="#0f417a" />
          <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#0f417a" hoverColor="#0b3260" />

          {/* Column Visibility Dropdown */}
          {visibleCols && setVisibleCols && (
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen(!colDropdownOpen)}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                title="Toggle Column Visibility"
              >
                <Eye size={14} className="text-[#0f417a]" />
                <span>Visibility</span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 z-50 animate-fade-in flex flex-col space-y-1">
                  <span className="text-[10px] font-black text-[#0f417a] uppercase tracking-wider px-2 py-1 border-b border-slate-100 mb-1">
                    Toggle Column Visibility
                  </span>
                  {Object.keys(visibleCols).map((col) => (
                    <label
                      key={col}
                      className="flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() =>
                          setVisibleCols((prev) => ({
                            ...prev,
                            [col]: !prev[col],
                          }))
                        }
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
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
      <div className="relative min-h-[380px] gem-grid">
        <Table
          rowData={filteredData}
          columnDefs={colDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          pagination={true}
          paginationPageSize={pageSize}
          loading={loading}
          color="#0f417a"
        />
      </div>
    </div>
  );
}
