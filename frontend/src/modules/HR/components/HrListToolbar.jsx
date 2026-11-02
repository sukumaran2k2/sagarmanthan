import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Filter, RotateCcw, Search, X } from 'lucide-react';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

// Pieces of the toolbar above every HR data list. Each page lays them out in its own order;
// the pieces themselves look and behave the same on every page.

/** "Filters" toggle with the active-filter count, plus a reset button while filters are set. */
export function HrFilterToggle({ open, activeCount = 0, onToggle, onReset }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`module-filter-btn ${open || activeCount > 0 ? 'active' : ''}`}
      >
        <Filter className="h-3.5 w-3.5" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center bg-blue-600 text-white text-[10px] h-4 w-4 rounded-full font-black">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {activeCount > 0 && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer dark:hover:bg-rose-900/30"
          title="Reset Filters"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );
}

/** Search box with a clear button. */
export function HrSearchBox({ value, onChange, placeholder = 'Search...', className = 'relative min-w-[200px] flex-1 sm:flex-initial' }) {
  return (
    <div className={className}>
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full module-search-input"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Rows-per-page picker. */
export function HrRowsSelect({ value, onChange, options = [10, 25, 50, 100] }) {
  return (
    <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
      <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
      >
        {options.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

/** "Total: n" badge. */
export function HrTotalBadge({ count }) {
  return (
    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
      Total: {count}
    </div>
  );
}

/**
 * Column visibility dropdown; closes on an outside click.
 * columns: [{ key, label, visible }]   onToggle(key)
 * capitalize: for pages whose labels are raw column keys
 */
export function HrColumnPicker({ columns, onToggle, label = 'Visibility', capitalize = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm"
      >
        <span>{label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800 max-h-72 overflow-y-auto">
          {columns.map((col) => (
            <label
              key={col.key}
              className={`flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 ${capitalize ? 'capitalize ' : ''}cursor-pointer select-none`}
            >
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() => onToggle(col.key)}
                className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Copy (TSV) and Excel / PDF export buttons. */
export function HrCopyExport({ onCopy, onExcel, onPdf }) {
  return (
    <>
      <CopyButton onCopy={onCopy} color="#0f417a" hoverBg="#f1f5f9" />
      <ExportDropdown onExportExcel={onExcel} onExportPdf={onPdf} color="#0f417a" hoverColor="#1d5594" chevron />
    </>
  );
}
