import { ChevronLeft, ChevronDown, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

export default function Reports({
  reportViewMode,
  setReportViewMode,
  selectedWing,
  reportMonth,
  setReportMonth,
  reportYear,
  setReportYear,
  reportWeek,
  setReportWeek,
  handleFetchReport,
  pageSize,
  setPageSize,
  handleCopyData,
  handleExportExcel,
  handleExportPdf,
  fetchError,
  gridRef,
  activeReportData,
  reportColDefs,
  reportLoading,
  detailLoading,
  pinnedBottomRowData,
  handleCellClick,
  detailData,
  detailColDefs,
}) {
  return (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
    {/* Top Header Line in Detailed Mode: Back Button + Centered Form Title Heading */}
    {reportViewMode === 'detail' && (
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200/80 pb-3.5 -mt-1 select-none min-h-[50px]">
        <button
          type="button"
          onClick={() => setReportViewMode('summary')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer flex items-center space-x-1.5 font-bold text-xs shadow-2xs self-start md:self-auto flex-shrink-0 z-10"
        >
          <ChevronLeft size={16} />
          <span>Back to Abstract Summary</span>
        </button>

        <div className="text-center w-full md:absolute md:inset-x-0 md:top-0 space-y-0.5 pointer-events-none">
          <h2 className="text-lg font-black text-slate-900 tracking-wide font-display">
            Form No.: 1.3B - Detailed - Attendance Sheet
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-extrabold">
            <span className="text-[#0f417a]">For {selectedWing || 'Administration'} (Wing)</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-semibold">(Report For the Week({reportWeek}) - {reportMonth} - {reportYear})</span>
          </div>
        </div>
      </div>
    )}

    {/* Report Filters Panel inside Table Section */}
    <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 transition-all shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-slate-800 font-extrabold text-xs uppercase tracking-wide mr-1 select-none">
            <Filter size={14} className="text-[#0f417a]" />
            <span>Report Filters:</span>
          </div>

          {/* Month Filter */}
          <div className="relative">
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer shadow-2xs"
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
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Year Filter */}
          <div className="relative">
            <select
              value={reportYear}
              onChange={(e) => setReportYear(e.target.value)}
              className="text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer shadow-2xs"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Week Filter */}
          <div className="relative">
            <select
              value={reportWeek}
              onChange={(e) => setReportWeek(Number(e.target.value))}
              className="text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer shadow-2xs"
            >
              <option value={1}>Week 1</option>
              <option value={2}>Week 2</option>
              <option value={3}>Week 3</option>
              <option value={4}>Week 4</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Fetch Button */}
        <button
          type="button"
          onClick={() => handleFetchReport(reportMonth, reportYear, reportWeek, true)}
          className="px-4 py-2 bg-[#4b2424] hover:bg-[#381b1b] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
        >
          <span>Fetch Report</span>
        </button>
      </div>
    </div>

    {reportViewMode === 'detail' ? (
      <div className="space-y-6 animate-fade-in">
        {/* Copy Button, Export Dropdown, Page Size Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 ml-auto">
            <CopyButton onCopy={handleCopyData} color="#4b2424" hoverBg="#fdf8f6" />
            <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#4b2424" hoverColor="#381b1b" />
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
              </select>
              <span>entries</span>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            Abstract Summary Report (Week {
            reportWeek}, {reportMonth} {reportYear})
          </h3>
        </div>

        <div className="flex items-center space-x-3">
          <CopyButton onCopy={handleCopyData} color="#4b2424" hoverBg="#fdf8f6" />
          <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#4b2424" hoverColor="#381b1b" />
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
            </select>
            <span>entries</span>
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
          onClick={() => handleFetchReport(reportMonth, reportYear, reportWeek, true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5 flex-shrink-0 shadow-xs"
        >
          <RefreshCw size={14} />
          <span>Retry Fetch</span>
        </button>
      </div>
    )}

    <div className="relative min-h-[350px] yp-pro-grid ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-hidden">
      {reportViewMode === 'summary' ? (
        <Table 
          ref={gridRef}
          rowData={activeReportData}
          columnDefs={reportColDefs}
          loading={reportLoading || detailLoading}
          pagination={true}
          paginationPageSize={pageSize}
          domLayout="autoHeight"
          pinnedBottomRowData={pinnedBottomRowData}
          onCellClicked={handleCellClick}
          color="#4b2424"
        />
      ) : (
        <Table 
          ref={gridRef}
          rowData={detailData}
          columnDefs={detailColDefs}
          loading={reportLoading || detailLoading}
          pagination={true}
          paginationPageSize={pageSize}
          domLayout="autoHeight"
          color="#4b2424"
        />
      )}
    </div>
  </div>
  );
}
