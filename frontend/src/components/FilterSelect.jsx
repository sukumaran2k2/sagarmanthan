import { ChevronDown } from 'lucide-react';

/**
 * A labelled filter dropdown for module DataList filter panels.
 *
 * Styling lives in `src/styles/module-datalist.css` (`.module-filter-label`,
 * `.module-filter-select`), so the filter panels look the same across modules and
 * follow the light/dark tokens rather than per-module Tailwind.
 *
 * Several modules still carry their own local `FilterSelect`; this is the shared one
 * they can move onto.
 *
 * @param {string}   label      Text shown above the dropdown.
 * @param {string}   value      Selected value (controlled).
 * @param {Function} onChange   Called with the new value, not the event.
 * @param {Array}    options    `string[]`, or `{ value, label }[]` when the two differ.
 * @param {string}   allLabel   Text for the "no filter" option. Pass null to leave it out.
 * @param {string}   allValue   Value the "no filter" option carries.
 * @param {boolean}  disabled   Greys the dropdown out.
 */
export default function FilterSelect({
  label,
  value,
  onChange,
  options = [],
  allLabel = 'All',
  allValue = 'All',
  disabled = false,
  className = '',
}) {
  const items = options.map((opt) =>
    (typeof opt === 'object' && opt !== null)
      ? { value: opt.value, label: opt.label ?? opt.value }
      : { value: opt, label: opt }
  );

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="module-filter-label">{label}</label>}
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="module-filter-select"
          aria-label={label}
        >
          {allLabel !== null && <option value={allValue}>{allLabel}</option>}
          {items.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
        />
      </div>
    </div>
  );
}
