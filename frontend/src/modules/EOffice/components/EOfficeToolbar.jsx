import React from "react";

export default function EOfficeToolbar({
  getReportTitle,
  activeKpi,
  week,
  month,
  year,
  subTab,
  setSubTab,
  showToast,
  onDownloadSample,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
      {/* Left Side: Report Title Text */}
      <div className="text-left">
        <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span>{getReportTitle(activeKpi)}</span>
        </h2>
        <span className="text-[11px] font-bold text-slate-500 block">
          Week {week === "Week 3" ? "3" : week.replace("Week ", "")} - {month} {year}
        </span>
      </div>

      {/* Right Side: Navigation Tabs + User Manual */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 select-none">
          <button
            type="button"
            onClick={() => setSubTab("upload")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              subTab === "upload"
                ? "bg-[#0f417a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setSubTab("files")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              subTab === "files"
                ? "bg-[#0f417a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            View Files
          </button>
          <button
            type="button"
            onClick={() => setSubTab("data")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              subTab === "data"
                ? "bg-[#0f417a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            DataList
          </button>
          <button
            type="button"
            onClick={() => setSubTab("report")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              subTab === "report"
                ? "bg-[#0f417a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Abstract Report
          </button>
        </div>

        {/* User Manual Button */}
        <button
          type="button"
          onClick={onDownloadSample}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer flex-shrink-0 select-none"
        >
          <span>User Manual</span>
        </button>
      </div>
    </div>
  );
}
