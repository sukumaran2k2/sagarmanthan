import { DollarSign, FileSpreadsheet, FileText, Eye, Sliders } from 'lucide-react';
import { ongoingProjects } from '../mock/dashboard';

export default function OngoingProjectsTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Row: Estimated Cost and circular Ongoing projects side-by-side inside a professional panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Estimated Cost Card */}
        <div className="bg-gradient-to-br from-blue-50/50 via-white to-sky-50 border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center lg:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-100/30 rounded-full blur-2xl pointer-events-none"></div>
          <div className="p-3 bg-blue-100/80 rounded-2xl text-blue-800 mb-3.5 shadow-sm">
            <DollarSign className="h-6 w-6" />
          </div>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Estimated Cost (In INR Crore)</p>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#0f417a] tracking-tight mt-1.5 font-display">
            17,111,073.58
          </h2>
          <div className="mt-3 flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Active Capital Allocation</span>
          </div>
        </div>

        {/* Modern Circular Badge Widget */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center relative">
          <div className="relative flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="54" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
              <circle cx="64" cy="64" r="54" stroke="#1b4380" strokeWidth="8" fill="transparent" strokeDasharray="339" strokeDashoffset="80" strokeLinecap="round" />
            </svg>
            
            {/* Text Inner Info */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-[#1b4380] tracking-tight font-display">422</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Ongoing</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Projects</span>
            </div>
          </div>
        </div>

      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm gap-4">
        <div className="text-xs text-slate-500 font-semibold">
          Selected: <strong className="text-slate-800">Ongoing Projects - Major Ports</strong> | Category Group A - F
        </div>
        
        {/* Export Buttons */}
        <div className="flex space-x-3 w-full sm:w-auto justify-end">
          <button className="flex items-center space-x-1.5 px-4.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] font-bold tracking-wider rounded-lg transition-all cursor-pointer shadow-md hover:shadow-lg">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export to Excel</span>
          </button>
          <button className="flex items-center space-x-1.5 px-4.5 py-2 bg-[#be123c] hover:bg-[#9f1239] text-white text-[10px] font-bold tracking-wider rounded-lg transition-all cursor-pointer shadow-md hover:shadow-lg">
            <FileText className="h-3.5 w-3.5" />
            <span>Export to PDF</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex border border-slate-200 rounded-2xl overflow-hidden shadow-md bg-white">
        
        {/* Table Area */}
        <div className="flex-grow overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-[#0f417a] text-white font-semibold uppercase tracking-wider text-[10px] border-b border-blue-900">
                <th className="py-4 px-4 border-r border-white/10 w-16 text-center">S.No</th>
                <th className="py-4 px-5 border-r border-white/10 text-left">Broad Category Name</th>
                <th className="py-4 px-4 border-r border-white/10 w-32 text-center">EPC (B)</th>
                <th className="py-4 px-4 border-r border-white/10 w-32 text-center">PPP (C)</th>
                <th className="py-4 px-4 border-r border-white/10 w-40 text-center font-bold">Total (D = B+C)</th>
                <th className="py-4 px-4 border-r border-white/10 w-28 text-center">Percentage (E)</th>
                <th className="py-4 px-5 w-40 text-right">Estimated Cost (F)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-center font-medium text-slate-700">
              {ongoingProjects.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                  <td className="py-3.5 px-4 border-r border-slate-100 text-slate-400 font-semibold">{row.sno}</td>
                  <td className="py-3.5 px-5 border-r border-slate-100 text-left text-slate-800 font-bold tracking-tight">{row.category}</td>
                  <td className="py-3.5 px-4 border-r border-slate-100 text-blue-600 font-extrabold text-xs">{row.epc}</td>
                  <td className="py-3.5 px-4 border-r border-slate-100 text-blue-600 font-extrabold text-xs">{row.ppp}</td>
                  <td className="py-3.5 px-4 border-r border-slate-100 font-extrabold text-slate-900 text-xs">{row.total}</td>
                  <td className="py-3.5 px-4 border-r border-slate-100 text-slate-500 font-semibold">{row.pct}</td>
                  <td className="py-3.5 px-5 text-right font-extrabold text-slate-800 text-xs">₹ {row.cost} Cr</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table Footer Navigation */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-bold">
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1b4380]"></span>
              <span>Total Categories: 10</span>
            </div>
            <div className="flex space-x-2">
              <button className="px-4.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-lg text-[10px] cursor-pointer transition shadow-sm">
                Previous
              </button>
              <button className="px-4.5 py-1.5 bg-[#0f417a] hover:bg-[#0b2e56] text-white font-bold rounded-lg text-[10px] cursor-pointer transition shadow-sm">
                Next Page
              </button>
            </div>
          </div>
        </div>

        {/* Vertical Columns / Filters Side Panel tabs */}
        <div className="w-10 flex flex-col border-l border-slate-200 bg-slate-50/80 flex-shrink-0 select-none">
          <div className="flex-1 py-8 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors flex flex-col items-center justify-center gap-2">
            <Eye className="h-4 w-4 text-slate-400" />
            <span className="[writing-mode:vertical-lr] rotate-180">Columns</span>
          </div>
          <div className="flex-1 py-8 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors flex flex-col items-center justify-center gap-2">
            <Sliders className="h-4 w-4 text-slate-400" />
            <span className="[writing-mode:vertical-lr] rotate-180">Filters</span>
          </div>
        </div>

      </div>

    </div>
  );
}
