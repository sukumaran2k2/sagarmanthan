import React from 'react';
import { Calendar, ChevronDown, Filter } from 'lucide-react';

export default function AttendanceToolbar({
  subTab,
  setSubTab,
  reportMonth,
  setReportMonth,
  reportYear,
  setReportYear,
  reportWeek,
  setReportWeek,
  handleFetchReport,
  handleDownloadSample,
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs mb-6 mx-4 md:mx-6">
      {/* Left Side: Parameters / Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {subTab === 'report' && (
          <>
            <div className="flex items-center space-x-2 text-slate-800 font-extrabold text-xs uppercase tracking-wide mr-1 select-none">
              <Filter size={14} className="text-[#0f417a]" />
              <span>Filters:</span>
            </div>

            {/* Month Filter */}
            <div className="relative">
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer"
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
                className="text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer"
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
                className="text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer"
              >
                <option value={1}>Week 1</option>
                <option value={2}>Week 2</option>
                <option value={3}>Week 3</option>
                <option value={4}>Week 4</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Fetch Button */}
            <button
              type="button"
              onClick={() => handleFetchReport(reportMonth, reportYear, reportWeek, true)}
              className="px-4 py-2 bg-[#0f417a] hover:bg-[#0c3361] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
            >
              <span>Fetch Report</span>
            </button>
          </>
        )}
      </div>

      {/* Right Side: Sub-Tab Controls & User Manual */}
      <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 select-none">
          <button
            type="button"
            onClick={() => setSubTab('upload')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'upload'
                ? 'bg-[#0f417a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload Attendance
          </button>

          <button
            type="button"
            onClick={() => setSubTab('data')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'data'
                ? 'bg-[#0f417a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            View Data List
          </button>

          <button
            type="button"
            onClick={() => setSubTab('report')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'report'
                ? 'bg-[#0f417a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Report View
          </button>

          <button
            type="button"
            onClick={() => setSubTab('files')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'files'
                ? 'bg-[#0f417a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            View Files
          </button>
        </div>

        {/* User Manual Download */}
        <button
          type="button"
          onClick={handleDownloadSample}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer flex-shrink-0 select-none"
          title="Download User Manual excel template"
        >
          <span>User Manual</span>
        </button>
      </div>
    </div>
  );
}
