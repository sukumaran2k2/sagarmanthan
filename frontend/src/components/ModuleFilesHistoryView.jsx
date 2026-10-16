import React from "react";
import Table from "./Table";

/**
 * Reusable Global History Files Table Component
 * Shared across E-Office, Attendance, and other governance modules.
 */
export default function ModuleFilesHistoryView({
  title = "Uploaded Spreadsheet Files",
  filesList = [],
  pageSize = 10,
  setPageSize,
  historyColDefs = [],
  loading = false,
  themeClass = "eoffice-blue-grid",
  color = "#0f417a",
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
          {title} ({filesList.length} Files)
        </h3>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none">
          <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className={`relative min-h-[350px] ${themeClass}`}>
        {loading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-30 flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <div className="w-full absolute top-0 left-0 right-0 h-1.5 bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0f417a] via-blue-500 to-[#5c2424] animate-indeterminate-progress"></div>
            </div>
            <div className="p-4 bg-blue-50/90 rounded-2xl border border-blue-100 text-[#0f417a] flex items-center space-x-3 shadow-sm">
              <div className="animate-spin rounded-full h-6 w-6 border-3 border-[#0f417a] border-t-transparent"></div>
              <span className="text-xs font-extrabold tracking-wide">
                Fetching uploaded files history from database...
              </span>
            </div>
          </div>
        )}
        <Table
          rowData={filesList}
          columnDefs={historyColDefs}
          pagination={true}
          paginationPageSize={pageSize}
          loading={loading}
          color={color}
        />
      </div>
    </div>
  );
}
