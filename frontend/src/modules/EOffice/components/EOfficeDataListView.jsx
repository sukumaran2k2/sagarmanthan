import React from "react";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import Table from "../../../components/Table";
import CopyButton from "../../../components/CopyButton";
import ExportDropdown from "../../../components/ExportDropdown";

export default function EOfficeDataListView({
  handleCopyData,
  handleExportExcel,
  handleExportPdf,
  pageSize,
  setPageSize,
  searchTerm,
  setSearchTerm,
  fetchError,
  fetchEOfficeData,
  loading,
  filteredData,
  colDefs,
  pinnedBottomRowData,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Search employee data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 transition font-medium"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <CopyButton
            onCopy={handleCopyData}
            color="#0f417a"
            hoverBg="#f1f5f9"
          />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            color="#0f417a"
            hoverColor="#0c3361"
          />
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
            onClick={() => fetchEOfficeData()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5 flex-shrink-0 shadow-xs"
          >
            <RefreshCw size={14} />
            <span>Retry Fetch</span>
          </button>
        </div>
      )}

      <div className="relative min-h-[350px] eoffice-blue-grid">
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
