import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import CopyButton from './CopyButton';
import ExportDropdown from './ExportDropdown';

// Reusable toolbar matching Young Professionals' DataList controls exactly:
// optional Wing/Division filters + search, Rows-per-page selector, Total
// Rows counter, Copy, Export, and a column-visibility checklist. Modules
// whose data has no wing/division dimension (KPI DGLL, CSL) simply omit
// those props and the toolbar renders without them.
export default function DataListToolbar({
  // Wing/Division filters -- omit both to hide this cluster entirely
  wings, // [{ value, label }] or undefined
  divisions, // [{ value, label }] or undefined
  selectedWing,
  onWingChange,
  selectedDivision,
  onDivisionChange,

  // Search -- omit to hide
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',

  // Arbitrary custom content for the left cluster (e.g. a Financial Year
  // filter for modules with no wing/division dimension) -- rendered before
  // the wing/division/search controls, if any.
  leftContent,

  // Rows / total / copy / export
  pageSize,
  onPageSizeChange,
  totalRows,
  onCopy,
  onExportExcel,
  onExportPdf,

  // Column visibility -- { columnKey: boolean } and its setter
  visibleCols,
  onVisibleColsChange,
  columnLabels = {}, // optional { columnKey: 'Display Label' } override
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasWingDivision = wings && divisions;
  const hasClearableFilters = hasWingDivision && (selectedWing || selectedDivision);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800/60 pb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {leftContent}

        {hasWingDivision && (
          <>
            <div className="relative">
              <select
                value={selectedWing}
                onChange={(e) => onWingChange(e.target.value)}
                className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[120px]"
              >
                <option value="">All Wings</option>
                {wings.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={selectedDivision}
                onChange={(e) => onDivisionChange(e.target.value)}
                className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[130px]"
              >
                <option value="">All Divisions</option>
                {divisions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </>
        )}

        {onSearchChange && (
          <div className="relative w-40">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {hasClearableFilters && (
          <button
            onClick={() => { onWingChange(''); onDivisionChange(''); }}
            className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition cursor-pointer"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="500">500</option>
            </select>
          </div>
        )}

        {totalRows !== undefined && (
          <div className="text-xs font-bold text-slate-555 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            Total Rows: {totalRows}
          </div>
        )}

        {onCopy && <CopyButton onCopy={onCopy} color="#0f417a" hoverBg="#f1f5f9" />}
        {(onExportExcel || onExportPdf) && (
          <ExportDropdown onExportExcel={onExportExcel} onExportPdf={onExportPdf} color="#0f417a" hoverColor="#1d5594" />
        )}

        {visibleCols && (
          <div className="relative" ref={colDropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Visibility</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                {Object.keys(visibleCols).map((col) => (
                  <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={visibleCols[col]}
                      onChange={() => onVisibleColsChange((prev) => ({ ...prev, [col]: !prev[col] }))}
                      className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{columnLabels[col] || col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
