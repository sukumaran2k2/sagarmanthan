import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Filter, Search, X } from 'lucide-react';
import CopyButton from '../../../../../components/CopyButton';
import ExportDropdown from '../../../../../components/ExportDropdown';

const PAGE_SIZES = [10, 25, 50, 100];

/** Column visibility checklist; columns = [{ key, label }]. */
function VisibilityMenu({ columns, visibleCols, onToggle, onShowAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span>Visibility</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
            <button
              type="button"
              onClick={onShowAll}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Show All
            </button>
          </div>
          {columns.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={visibleCols[key] !== false}
                onChange={() => onToggle(key)}
                className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="truncate">{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Toolbar shared by the Traffic lists, using the module-* classes:
 * Filter button + Reset on the left; search, rows, total, visibility, copy,
 * export and page actions on the right.
 */
export default function ListToolbar({
  showFilterPanel,
  onToggleFilters,
  activeFiltersCount = 0,
  onResetFilters,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  pageSize,
  onPageSizeChange,
  totalCount,
  loading = false,
  visibility,
  onCopy,
  onExportExcel,
  onExportPdf,
  actions,
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
      <div className="flex items-center gap-2.5 w-full lg:w-auto">
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={showFilterPanel}
          className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
        >
          <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
          <span>Filter</span>
          {activeFiltersCount > 0 && (
            <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
        </button>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      <div className="hidden lg:block flex-1" />

      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full module-search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
            className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
          Total: {loading ? '…' : totalCount}
        </div>

        {visibility && <VisibilityMenu {...visibility} />}

        <CopyButton onCopy={onCopy} color="#0f417a" hoverBg="#f1f5f9" />
        <ExportDropdown
          onExportExcel={onExportExcel}
          onExportPdf={onExportPdf}
          color="#0f417a"
          hoverColor="#1d5594"
        />

        {actions}
      </div>
    </div>
  );
}

/** Labelled select used inside the collapsible filter panels. */
export function FilterSelect({ label, value, onChange, options, allLabel = 'All', disabled = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          className={`appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer ${
            disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60' : ''
          }`}
        >
          <option value="">{allLabel}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      </div>
    </div>
  );
}

/** Thin animated bar along the top of a grid while a newer page loads over the current rows. */
export function RefreshBar({ active }) {
  if (!active) return null;
  return (
    <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-blue-100 dark:bg-slate-800" role="progressbar" aria-label="Loading">
      <div className="h-full w-1/3 bg-[#0f417a] dark:bg-blue-400 animate-[traffic-refresh_1s_ease-in-out_infinite]" />
      <style>{'@keyframes traffic-refresh{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
    </div>
  );
}
