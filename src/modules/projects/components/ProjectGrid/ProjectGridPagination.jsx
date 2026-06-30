import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProjectGridPagination({ 
  currentPage, 
  totalPages, 
  totalEntries, 
  entriesLimit, 
  onPageChange 
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
      <span className="text-slate-500 font-medium text-center sm:text-left">
        Showing <span className="font-bold text-slate-800">{totalEntries > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
        <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, totalEntries)}</span> of{' '}
        <span className="font-bold text-slate-800">{totalEntries}</span> entries
      </span>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
          if (totalPages > 6 && Math.abs(currentPage - p) > 1 && p !== 1 && p !== totalPages) {
            if (p === 2 || p === totalPages - 1) {
              return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
            }
            return null;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                currentPage === p
                  ? 'bg-[#0f417a] text-white shadow-sm'
                  : 'border border-slate-200 text-slate-650 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          );
        })}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
