import React from 'react';
import { PERMS } from '../constants';
import {
  isRowFullyGranted,
  setAllCrudPerms,
  setRowCrudPerms,
  toggleCrudPerm,
} from '../userModuleCrud';

const PERM_LABELS = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
};

export default function UserModuleCrudPanel({
  modules = [],
  draft = {},
  onDraftChange,
  loading = false,
  hasOrganisation = false,
}) {
  const handleCheck = (moduleId, perm, checked) => {
    onDraftChange(toggleCrudPerm(draft, moduleId, perm, checked));
  };

  const toggleRowAll = (moduleId) => {
    const fullyOn = isRowFullyGranted(draft[moduleId]);
    onDraftChange(setRowCrudPerms(draft, moduleId, !fullyOn));
  };

  const grantAll = () => onDraftChange(setAllCrudPerms(modules, draft, true));
  const revokeAll = () => onDraftChange(setAllCrudPerms(modules, draft, false));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-3 shrink-0 mb-3">
        <div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Module permissions
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
            Create / Update / Delete also enable Read. Use All on a row to tick every flag.
          </p>
        </div>
        {modules.length > 0 && !loading && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={grantAll}
              className="px-3 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer"
            >
              Grant all
            </button>
            <button
              type="button"
              onClick={revokeAll}
              className="px-3 py-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 cursor-pointer"
            >
              Revoke all
            </button>
          </div>
        )}
      </div>

      {!hasOrganisation ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
          Select an organisation to load its modules.
        </p>
      ) : loading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
          Loading modules…
        </p>
      ) : modules.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          No modules enabled for this organisation. Assign them under Modules → Update first.
        </p>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
                <tr className="text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[11px]">
                  <th className="text-left font-bold px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    Module
                  </th>
                  {PERMS.map((p) => (
                    <th
                      key={p}
                      className="font-bold px-2 py-3 text-center border-b border-slate-200 dark:border-slate-700 w-[88px]"
                    >
                      {PERM_LABELS[p]}
                    </th>
                  ))}
                  <th className="font-bold px-2 py-3 text-center border-b border-slate-200 dark:border-slate-700 w-[72px]">
                    All
                  </th>
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => {
                  const rowOn = isRowFullyGranted(draft[m.id]);
                  return (
                    <tr
                      key={m.id}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 text-left text-[13px]">
                        {m.name}
                      </td>
                      {PERMS.map((p) => (
                        <td key={p} className="text-center px-2 py-2.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-[#0f417a]"
                            checked={!!draft[m.id]?.[p]}
                            onChange={(e) => handleCheck(m.id, p, e.target.checked)}
                            aria-label={`${m.name} ${p}`}
                          />
                        </td>
                      ))}
                      <td className="text-center px-2 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleRowAll(m.id)}
                          className={`px-2 py-1 text-[10px] font-bold rounded border cursor-pointer ${
                            rowOn
                              ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900'
                              : 'text-[#0f417a] dark:text-blue-300 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900'
                          }`}
                          title={rowOn ? 'Clear all for this module' : 'Tick all for this module'}
                        >
                          {rowOn ? 'Clear' : 'All'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {modules.length} module{modules.length === 1 ? '' : 's'} for this organisation
          </div>
        </div>
      )}
    </div>
  );
}
