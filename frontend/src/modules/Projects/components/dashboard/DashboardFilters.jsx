import { useMemo, useState } from 'react';
import { SlidersHorizontal, RotateCcw, X, ListTree, RefreshCw } from 'lucide-react';
import { FilterSelect } from './DashboardParts';
import { ALL, formatDate } from './dashboardTheme';
import { DATE_FILTERS, PANEL_KEYS, RANGE_FILTERS, SELECT_FILTERS } from './dashboardConfig';

// Filters of the Projects dashboard, as on the workbook's Dashboard sheet.
// The main row applies at once; "More filters" opens the remaining selection,
// value-range and date-range filters, which apply together with "Apply filters".

// Indents single stages under their stage group in the stage list.
const INDENT = String.fromCharCode(160).repeat(4);

const isSet = (v) => v !== undefined && v !== null && v !== '' && v !== ALL;

// Human-readable chips for the panel filters that are set.
function activeChips(filters) {
  const chips = [];
  SELECT_FILTERS.forEach((f) => {
    if (isSet(filters[f.key])) chips.push({ keys: [f.key], text: `${f.label}: ${filters[f.key]}` });
  });
  RANGE_FILTERS.forEach((f) => {
    const min = filters[`${f.key}Min`];
    const max = filters[`${f.key}Max`];
    if (isSet(min) || isSet(max)) {
      chips.push({ keys: [`${f.key}Min`, `${f.key}Max`], text: `${f.label}: ${isSet(min) ? min : 'any'} – ${isSet(max) ? max : 'any'}` });
    }
  });
  DATE_FILTERS.forEach((f) => {
    const from = filters[`${f.key}From`];
    const to = filters[`${f.key}To`];
    if (isSet(from) || isSet(to)) {
      chips.push({ keys: [`${f.key}From`, `${f.key}To`], text: `${f.label}: ${isSet(from) ? formatDate(from) : 'any'} – ${isSet(to) ? formatDate(to) : 'any'}` });
    }
  });
  return chips;
}

const inputClass = 'w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900';
const panelHeading = 'text-[11px] font-extrabold uppercase tracking-widest text-[#4f46e5] dark:text-indigo-300 mb-3';
const buttonClass = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer';

function MoreFiltersPanel({ options, filters, onApply, onClose }) {
  // Draft of the panel fields; applied together so typing a range does not reload each time.
  const [draft, setDraft] = useState(() => Object.fromEntries(PANEL_KEYS.map((k) => [k, filters[k] ?? ''])));
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const clear = () => setDraft(Object.fromEntries(PANEL_KEYS.map((k) => [k, ''])));

  return (
    <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6 animate-fade-in">
      <div>
        <h4 className={panelHeading}>Selection filters</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SELECT_FILTERS.map((f) => (
            <FilterSelect
              key={f.key}
              label={f.label}
              value={draft[f.key] || ALL}
              onChange={(v) => set(f.key)(v === ALL ? '' : v)}
              options={[{ value: ALL, label: 'All' }, ...(options?.[f.key] || []).map((o) => ({ value: o, label: o }))]}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div>
          <h4 className={panelHeading}>Value range filters</h4>
          <div className="space-y-3">
            {RANGE_FILTERS.map((f) => (
              <div key={f.key}>
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5">{f.label}</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" placeholder="From" aria-label={`${f.label} from`} value={draft[`${f.key}Min`]} onChange={(e) => set(`${f.key}Min`)(e.target.value)} className={inputClass} />
                  <input type="number" min="0" placeholder="To" aria-label={`${f.label} to`} value={draft[`${f.key}Max`]} onChange={(e) => set(`${f.key}Max`)(e.target.value)} className={inputClass} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Leave a box blank to leave that end open.</p>
          </div>
        </div>

        <div className="xl:col-span-2">
          <h4 className={panelHeading}>Date range filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {DATE_FILTERS.map((f) => (
              <div key={f.key}>
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5">{f.label}</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" aria-label={`${f.label} from`} value={draft[`${f.key}From`]} onChange={(e) => set(`${f.key}From`)(e.target.value)} className={inputClass} />
                  <input type="date" aria-label={`${f.label} to`} value={draft[`${f.key}To`]} min={draft[`${f.key}From`] || undefined} onChange={(e) => set(`${f.key}To`)(e.target.value)} className={inputClass} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={clear} className={`${buttonClass} border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800`}>
          <RotateCcw className="h-3.5 w-3.5" /> Clear these filters
        </button>
        <button type="button" onClick={onClose} className={`${buttonClass} border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800`}>
          Cancel
        </button>
        <button type="button" onClick={() => onApply(draft)} className={`${buttonClass} border-[#4f46e5] bg-[#4f46e5] text-white hover:bg-[#4338ca]`}>
          Apply filters
        </button>
      </div>
    </div>
  );
}

// filters: the applied filter object; onChange(patch) applies changes; onReset clears all.
// orgScoped: an organisation user, whose data the API already limits to their organisation.
export default function DashboardFilters({ meta, filters, onChange, onReset, orgScoped, loading, lastUpdated, onBrowseProjects }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const chips = useMemo(() => activeChips(filters), [filters]);

  const organisationOptions = useMemo(() => (meta?.organisations || [])
    .filter((o) => filters.organisationTypeId === ALL || String(o.typeId) === String(filters.organisationTypeId)), [meta, filters.organisationTypeId]);

  // Stage: a stage group, or a single stage within it.
  const stageValue = filters.stageId !== ALL ? `stage:${filters.stageId}` : filters.stageGroup !== ALL ? `group:${filters.stageGroup}` : ALL;
  const stageOptions = [
    { value: ALL, label: 'All Stages' },
    ...(meta?.stageGroups || []).flatMap((g) => {
      const stages = (meta?.stages || []).filter((s) => s.group === g.id);
      const single = stages.length === 1 && stages[0].name.trim().toLowerCase() === g.name.toLowerCase();
      return [
        { value: `group:${g.id}`, label: g.name },
        ...(single ? [] : stages.map((s) => ({ value: `stage:${s.id}`, label: `${INDENT}${s.name}` }))),
      ];
    }),
  ];
  const changeStage = (value) => {
    if (value.startsWith('stage:')) onChange({ stageGroup: ALL, stageId: value.slice(6) });
    else if (value.startsWith('group:')) onChange({ stageGroup: value.slice(6), stageId: ALL });
    else onChange({ stageGroup: ALL, stageId: ALL });
  };

  const list = (key, allLabel) => [{ value: ALL, label: allLabel }, ...(meta?.options?.[key] || []).map((o) => ({ value: o, label: o }))];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        {!orgScoped ? (
          <>
            <FilterSelect
              className="w-full sm:w-48"
              label="Organisation Type"
              value={filters.organisationTypeId}
              onChange={(v) => onChange({ organisationTypeId: v, organisationId: ALL })}
              options={[{ value: ALL, label: 'All Organisation Types' }, ...(meta?.organisationTypes || []).map((t) => ({ value: String(t.id), label: t.name }))]}
            />
            <FilterSelect
              className="w-full sm:w-56"
              label="Port / Organisation"
              value={filters.organisationId}
              onChange={(v) => onChange({ organisationId: v })}
              options={[{ value: ALL, label: 'All Organisations' }, ...organisationOptions.map((o) => ({ value: String(o.id), label: o.name }))]}
            />
          </>
        ) : null}
        <FilterSelect className="w-full sm:w-56" label="Current Stage" value={stageValue} onChange={changeStage} options={stageOptions} />
        <FilterSelect className="w-full sm:w-40" label="Mode of Implementation" value={filters.mode} onChange={(v) => onChange({ mode: v })} options={list('mode', 'All Modes')} />
        <FilterSelect className="w-full sm:w-56" label="Broad Category" value={filters.broadCategory} onChange={(v) => onChange({ broadCategory: v })} options={list('broadCategory', 'All Broad Categories')} />

        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            className={`${buttonClass} ${panelOpen || chips.length ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-[#4f46e5] dark:text-indigo-300' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'} hover:bg-indigo-50 dark:hover:bg-indigo-950/40`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> More filters
            {chips.length ? <span className="ml-0.5 px-1.5 rounded-full bg-[#4f46e5] text-white text-[10px]">{chips.length}</span> : null}
          </button>
          <button type="button" onClick={onReset} className={`${buttonClass} border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800`}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button type="button" onClick={onBrowseProjects} className={`${buttonClass} border-[#4f46e5] bg-[#4f46e5] text-white hover:bg-[#4338ca]`}>
            <ListTree className="h-3.5 w-3.5" /> Project Drill-down
          </button>
        </div>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {chips.map((chip) => (
            <span key={chip.text} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-indigo-100/70 dark:bg-indigo-950/40 text-[11px] font-semibold text-[#4f46e5] dark:text-indigo-300">
              {chip.text}
              <button
                type="button"
                aria-label={`Remove ${chip.text}`}
                onClick={() => onChange(Object.fromEntries(chip.keys.map((k) => [k, ''])))}
                className="p-0.5 rounded-full hover:bg-indigo-200/70 dark:hover:bg-indigo-900 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {panelOpen ? (
        <MoreFiltersPanel
          options={meta?.options}
          filters={filters}
          onClose={() => setPanelOpen(false)}
          onApply={(draft) => { onChange(draft); setPanelOpen(false); }}
        />
      ) : null}

      <div className="flex items-center gap-2 mt-3">
        <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
          Last updated date: {lastUpdated ? formatDate(lastUpdated) : '—'}
        </p>
        {loading ? <RefreshCw size={12} className="animate-spin text-slate-400" /> : null}
      </div>
    </div>
  );
}
