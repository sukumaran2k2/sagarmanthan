import React from "react";
import { FileText, Inbox, CheckSquare } from "lucide-react";

export default function EOfficeCategoryHeader({ activeKpi, setSelectedKpi }) {
  return (
    <div className="bg-amber-950/5 p-1.5 rounded-2xl border border-amber-900/10 shadow-inner flex items-center gap-2 overflow-x-auto select-none">
      {/* Category 1: File Pendency */}
      <button
        type="button"
        onClick={() => setSelectedKpi("file-pendency")}
        className={`group relative flex items-center space-x-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0 font-bold select-none ${
          activeKpi === "file-pendency"
            ? "bg-gradient-to-r from-[#451a03] via-[#78350f] to-[#92400e] text-white shadow-md shadow-amber-950/30 scale-[1.02]"
            : "bg-white/90 hover:bg-white text-slate-700 hover:text-[#451a03] border border-transparent hover:border-amber-200 shadow-xs hover:shadow-sm"
        }`}
      >
        <div
          className={`p-1.5 rounded-lg transition-colors ${
            activeKpi === "file-pendency"
              ? "bg-white/20 text-white backdrop-blur-xs"
              : "bg-amber-50 text-[#78350f] group-hover:bg-amber-100/80"
          }`}
        >
          <FileText size={15} />
        </div>
        <div className="text-left leading-none">
          <span className="text-[11px] font-extrabold uppercase tracking-wider block">
            File Pendency
          </span>
        </div>
        {activeKpi === "file-pendency" && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse ml-1"></span>
        )}
      </button>

      {/* Category 2: Receipt Pendency */}
      <button
        type="button"
        onClick={() => setSelectedKpi("receipt-pendency")}
        className={`group relative flex items-center space-x-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0 font-bold select-none ${
          activeKpi === "receipt-pendency"
            ? "bg-gradient-to-r from-[#451a03] via-[#78350f] to-[#92400e] text-white shadow-md shadow-amber-950/30 scale-[1.02]"
            : "bg-white/90 hover:bg-white text-slate-700 hover:text-[#451a03] border border-transparent hover:border-amber-200 shadow-xs hover:shadow-sm"
        }`}
      >
        <div
          className={`p-1.5 rounded-lg transition-colors ${
            activeKpi === "receipt-pendency"
              ? "bg-white/20 text-white backdrop-blur-xs"
              : "bg-amber-50 text-[#78350f] group-hover:bg-amber-100/80"
          }`}
        >
          <Inbox size={15} />
        </div>
        <div className="text-left leading-none">
          <span className="text-[11px] font-extrabold uppercase tracking-wider block">
            Receipt Pendency
          </span>
        </div>
        {activeKpi === "receipt-pendency" && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse ml-1"></span>
        )}
      </button>

      {/* Category 3: File Disposal */}
      <button
        type="button"
        onClick={() => setSelectedKpi("file-disposal")}
        className={`group relative flex items-center space-x-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0 font-bold select-none ${
          activeKpi === "file-disposal"
            ? "bg-gradient-to-r from-[#451a03] via-[#78350f] to-[#92400e] text-white shadow-md shadow-amber-950/30 scale-[1.02]"
            : "bg-white/90 hover:bg-white text-slate-700 hover:text-[#451a03] border border-transparent hover:border-amber-200 shadow-xs hover:shadow-sm"
        }`}
      >
        <div
          className={`p-1.5 rounded-lg transition-colors ${
            activeKpi === "file-disposal"
              ? "bg-white/20 text-white backdrop-blur-xs"
              : "bg-amber-50 text-[#78350f] group-hover:bg-amber-100/80"
          }`}
        >
          <CheckSquare size={15} />
        </div>
        <div className="text-left leading-none">
          <span className="text-[11px] font-extrabold uppercase tracking-wider block">
            File Disposal
          </span>
        </div>
        {activeKpi === "file-disposal" && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse ml-1"></span>
        )}
      </button>
    </div>
  );
}
