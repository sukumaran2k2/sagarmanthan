import { ChevronDown, Filter } from 'lucide-react';
import FilterSelect from '../../../components/FilterSelect';
import { FILTER_MONTH_OPTIONS, FILTER_TYPE_OPTIONS } from '../data/examListFilters';

// K-2.3 Data List filter controls in the portal's standard look (as in VIP Reference / Attendance):
// a Filter button with a count, Reset while a filter is on, and a collapsible FilterSelect panel.
// Rules (which filters, matching rows) live in data/examListFilters.js.

const BRAND = '#0f417a';

export function ExamFilterButton({ activeCount, open, onToggle, onReset }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`module-filter-btn ${open || activeCount > 0 ? 'active' : ''}`}
      >
        <Filter className="h-4 w-4" style={{ color: BRAND }} />
        <span>Filter</span>
        {activeCount > 0 && (
          <span className="text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none" style={{ backgroundColor: BRAND }}>
            {activeCount}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {activeCount > 0 && (
        <button type="button" onClick={onReset} className="module-reset-btn">
          Reset
        </button>
      )}
    </>
  );
}

export function ExamFilterPanel({ fields, filters, yearOptions, onChange }) {
  return (
    <div className="px-4 pt-3">
      <div className={`module-filter-panel grid grid-cols-1 sm:grid-cols-2 ${fields.length > 2 ? 'md:grid-cols-3' : ''} gap-4 animate-fade-in`}>
        {fields.includes('year') && (
          <FilterSelect label="Year" value={filters.year} onChange={(v) => onChange('year', v)}
            options={yearOptions} allLabel="All Years" allValue="" />
        )}
        {fields.includes('month') && (
          <FilterSelect label="Month" value={filters.month} onChange={(v) => onChange('month', v)}
            options={FILTER_MONTH_OPTIONS} allLabel="All Months" allValue="" />
        )}
        {fields.includes('type') && (
          <FilterSelect label="Type" value={filters.type} onChange={(v) => onChange('type', v)}
            options={FILTER_TYPE_OPTIONS} allLabel="All Types" allValue="" />
        )}
      </div>
    </div>
  );
}
