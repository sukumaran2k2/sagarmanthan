import { ChevronDown } from 'lucide-react';
import { CLASS_OPTIONS } from '../utils/hrAdministration';

// Filter panel shared by the HR list pages (the Vacancy Management design)

const COLUMNS = {
  2: 'sm:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'sm:grid-cols-2 md:grid-cols-4',
  5: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
};

/** The grey panel; children are FilterSelects (or other fields in a FilterField). */
export function HrFilterPanel({ show, columns = 3, children }) {
  if (!show) return null;
  return (
    <div className={`p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 ${COLUMNS[columns] || COLUMNS[3]} gap-4 animate-fade-in`}>
      {children}
    </div>
  );
}

/** A labelled field in the panel (for inputs other than a select, e.g. a multi-select). */
export function FilterField({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

/**
 * A select in the panel. options: [{ value, label }] or plain strings.
 * disabledText replaces the "all" option while the select is disabled (e.g. "Select Dept First").
 */
export function FilterSelect({ label, value, onChange, options = [], allLabel = '-- All --', disabled = false, disabledText }) {
  return (
    <FilterField label={label}>
      <div className="relative">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60' : ''}`}
        >
          <option value="">{disabled && disabledText ? disabledText : allLabel}</option>
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      </div>
    </FilterField>
  );
}

/**
 * Organisation (optional) -> Department -> Post Name -> Class, as on Vacancy Management.
 * Post Name needs a department (and, for ministry users, an organisation: post ids belong to one).
 */
export function DeptPostClassFilters({
  organisations, organisationId, onOrganisationChange,
  departments, departmentId, onDepartmentChange,
  posts, postId, onPostChange, needsOrganisation = false,
  className, onClassChange,
}) {
  const postBlocked = needsOrganisation ? 'Select Organisation First' : !departmentId ? 'Select Dept First' : null;
  return (
    <>
      {organisations && (
        <FilterSelect
          label="Organisation"
          value={organisationId}
          onChange={onOrganisationChange}
          allLabel="-- All Organisations --"
          options={organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name }))}
        />
      )}
      <FilterSelect
        label="Department"
        value={departmentId}
        onChange={onDepartmentChange}
        allLabel="-- All Departments --"
        options={departments.map((d) => ({ value: String(d.department_id), label: d.department_name }))}
      />
      <FilterSelect
        label="Post Name"
        value={postId}
        onChange={onPostChange}
        allLabel="-- All Posts --"
        disabled={Boolean(postBlocked)}
        disabledText={postBlocked}
        options={posts.map((p) => ({ value: String(p.post_id), label: p.post_name }))}
      />
      <FilterSelect label="Class" value={className} onChange={onClassChange} allLabel="-- All Classes --" options={CLASS_OPTIONS} />
    </>
  );
}
