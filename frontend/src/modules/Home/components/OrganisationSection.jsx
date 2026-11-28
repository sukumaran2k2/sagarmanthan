import { useMemo, useState } from 'react';
import { ORGANISATION_GROUPS, ORGANISATION_ROW_CONFIG } from '../config/dashboardModules';
import ModuleName from './ModuleName';
import StatusMatrix from './StatusMatrix';
import { StatusPill } from './StatusCell';

/** Ministry view: one table per organisation group, switched with tabs. */
function OrganisationMatrix({ section, asOn, onNavigate }) {
  const groups = useMemo(
    () =>
      ORGANISATION_GROUPS.map((g) => ({ ...g, columns: section.columns.filter((c) => c.group === g.key) })).filter(
        (g) => g.columns.length > 0
      ),
    [section.columns]
  );
  const [active, setActive] = useState(groups[0]?.key);
  const group = groups.find((g) => g.key === active) || groups[0];
  if (!group) return null;

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Organisation group" className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={g.key === group.key}
            onClick={() => setActive(g.key)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
              g.key === group.key
                ? 'bg-white text-[#0f417a] shadow-sm dark:bg-slate-900 dark:text-sky-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {g.label}
            <span className="ml-1.5 rounded-full bg-slate-200/80 px-1.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {g.columns.length}
            </span>
          </button>
        ))}
      </div>
      <StatusMatrix
        columns={group.columns}
        rows={section.rows}
        rowConfig={ORGANISATION_ROW_CONFIG}
        asOn={asOn}
        onNavigate={onNavigate}
        columnLabel={(c) => c.shortName}
        columnTitle={(c) => c.name}
      />
    </div>
  );
}

/** Organisation view: the user's own organisation, one tile per module. */
function OwnOrganisationList({ section, asOn, onNavigate }) {
  const org = section.columns[0];
  if (!org) return null;
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {section.rows.map((row) => {
        const config = ORGANISATION_ROW_CONFIG[row.key] || {};
        return (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800/40"
          >
            <ModuleName
              label={row.label}
              moduleCode={row.moduleCode}
              config={config}
              onNavigate={onNavigate}
              className="text-[13px] font-semibold text-slate-700 dark:text-slate-200"
            />
            <StatusPill cell={row.cells[org.id]} rowType={row.type} asOn={asOn} statusText={config.statusText} className="flex-shrink-0" />
          </li>
        );
      })}
    </ul>
  );
}

export default function OrganisationSection({ section, asOn, ministryView, onNavigate }) {
  if (!section.rows.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No organisation modules are enabled for your organisation.</p>;
  }
  return ministryView ? (
    <OrganisationMatrix section={section} asOn={asOn} onNavigate={onNavigate} />
  ) : (
    <OwnOrganisationList section={section} asOn={asOn} onNavigate={onNavigate} />
  );
}
