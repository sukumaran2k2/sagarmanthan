import React from 'react';
import { Copy, FileSpreadsheet, FileText, Search } from 'lucide-react';

export default function ProjectGridToolbar({ 
  onExportTrigger, 
  entriesLimit, 
  setEntriesLimit, 
  searchQuery, 
  setSearchQuery 
}) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Copy, Excel, PDF export options */}
      <div className="flex items-center space-x-1.5 border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
        <button 
          onClick={() => onExportTrigger('Clipboard Copied')}
          className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
        <button 
          onClick={() => onExportTrigger('Excel report')}
          className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
        </button>
        <button 
          onClick={() => onExportTrigger('PDF download')}
          className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5" /> PDF
        </button>
      </div>

      {/* Entries select & Search Input */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Show</span>
          <select 
            value={entriesLimit}
            onChange={(e) => setEntriesLimit(parseInt(e.target.value))}
            className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">entries</span>
        </div>

        <div className="relative w-full sm:w-60">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </span>
          <input 
            type="text" 
            placeholder="Search project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold"
          />
        </div>
      </div>
    </div>
  );
}
