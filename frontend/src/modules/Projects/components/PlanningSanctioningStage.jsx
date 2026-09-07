import { useEffect, useMemo, useState } from 'react';
import { fetchPlanningSanctioning } from '../api';
import { getProjectIdentity } from '../utils/mapProject';
import { mapPlanningRowsFromApi } from '../utils/stageMappers';

const DEFAULT_ROWS = mapPlanningRowsFromApi({});

export default function PlanningSanctioningStage({
  projectID: projectIDProp,
  subProjectID: subProjectIDProp,
  initialData,
  canSubmit,
  readOnly,
  onSubmitStage,
  notify,
  refreshKey = 0,
}) {
  const identity = useMemo(() => {
    if (projectIDProp) {
      return {
        projectID: projectIDProp,
        subProjectID: subProjectIDProp || '-1',
      };
    }
    return getProjectIdentity(initialData || {});
  }, [projectIDProp, subProjectIDProp, initialData]);

  const { projectID, subProjectID } = identity;
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [loading, setLoading] = useState(false);

  const disabled = !canSubmit || readOnly;

  useEffect(() => {
    if (!projectID) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchPlanningSanctioning(projectID, subProjectID);
        const row = Array.isArray(res?.data) ? res.data[0] : null;
        if (mounted && row) setRows(mapPlanningRowsFromApi(row));
      } catch (error) {
        console.error(error);
        notify?.('Failed to load planning & sanctioning details.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [projectID, subProjectID, refreshKey, notify]);

  const updateRow = (key, patch) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const submit = async () => {
    const ok = await onSubmitStage?.('planning', { rows });
    return ok;
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs font-semibold text-amber-900">
        Project stage details are structured as in legacy planning/sanctioning flow.
      </div>

      {loading ? (
        <div className="text-xs font-semibold text-slate-500">Loading planning details...</div>
      ) : null}

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-[#0f417a] text-white">
            <tr>
              <th className="text-left px-3 py-2.5">Stages</th>
              <th className="text-left px-3 py-2.5">Actual Date</th>
              <th className="text-left px-3 py-2.5">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-200 align-top">
                <td className="px-3 py-3">
                  <p className="font-bold text-slate-800">{row.label}</p>
                  <label className="inline-flex items-center gap-2 mt-2 text-[11px] text-slate-600 font-semibold">
                    <input
                      type="checkbox"
                      checked={row.notApplicable}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.key, { notApplicable: e.target.checked })}
                    />
                    (Not Applicable)
                  </label>
                  {'sanctionedCost' in row && (
                    <div className="mt-2 max-w-[240px]">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Sanctioned Cost (In Cr)</label>
                      <input
                        type="number"
                        value={row.sanctionedCost || ''}
                        onChange={(e) => updateRow(row.key, { sanctionedCost: e.target.value })}
                        disabled={disabled}
                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                      />
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 min-w-[170px]">
                  <input
                    type="date"
                    value={row.actualDate}
                    onChange={(e) => updateRow(row.key, { actualDate: e.target.value })}
                    disabled={disabled || row.notApplicable}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </td>
                <td className="px-3 py-3 min-w-[220px]">
                  <input
                    type="text"
                    placeholder="Remarks"
                    value={row.remarks}
                    onChange={(e) => updateRow(row.key, { remarks: e.target.value })}
                    disabled={disabled}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
        >
          Submit Planning & Sanctioning
        </button>
      </div>
    </div>
  );
}
