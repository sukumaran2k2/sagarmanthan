import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared YP-Report Styled Custom Table Pagination Component
 * Displays "Showing X to Y of Z entries" and numbered page buttons with active highlighting.
 */
export default function TablePagination({
  currentPage = 0,
  totalPages = 0,
  totalRows = 0,
  pageSize = 10,
  onPageChange,
  onPrevPage,
  onNextPage,
  color = '#0f417a',
}) {
  if (!totalPages || totalPages <= 0) return null;

  // Compute page numbers with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(0);

      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);

      if (currentPage <= 2) {
        end = maxVisiblePages - 1;
      } else if (currentPage >= totalPages - 3) {
        start = totalPages - maxVisiblePages;
      }

      if (start > 1) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages - 1);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startRow = totalRows === 0 ? 0 : currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 select-none bg-slate-50/70 font-sans shadow-2xs">
      {/* Counter label */}
      <div className="text-xs font-semibold text-slate-600">
        Showing <span className="font-bold text-slate-800">{startRow}</span> to{' '}
        <span className="font-bold text-slate-800">{endRow}</span> of{' '}
        <span className="font-bold text-slate-900">{totalRows}</span> entries
      </div>

      {/* Button controls */}
      <div className="flex items-center space-x-1">
        {/* Previous page */}
        <button
          type="button"
          onClick={onPrevPage || (() => onPageChange && onPageChange(currentPage - 1))}
          disabled={currentPage === 0}
          className={`flex items-center justify-center px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer select-none ${
            currentPage === 0
              ? 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
          }`}
          style={currentPage !== 0 ? { color: color } : {}}
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
          <span>Previous</span>
        </button>

        {/* Page number pills */}
        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs font-bold select-none">
                ...
              </span>
            );
          }

          const isActive = currentPage === p;
          return (
            <button
              type="button"
              key={`page-${p}`}
              onClick={() => onPageChange && onPageChange(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer select-none ${
                isActive
                  ? 'text-white border shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-2xs'
              }`}
              style={isActive ? { backgroundColor: color, borderColor: color } : {}}
            >
              {p + 1}
            </button>
          );
        })}

        {/* Next page */}
        <button
          type="button"
          onClick={onNextPage || (() => onPageChange && onPageChange(currentPage + 1))}
          disabled={currentPage === totalPages - 1}
          className={`flex items-center justify-center px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer select-none ${
            currentPage === totalPages - 1
              ? 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
          }`}
          style={currentPage !== totalPages - 1 ? { color: color } : {}}
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </button>
      </div>
    </div>
  );
}
