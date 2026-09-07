import { useEffect, useMemo, useState } from 'react';
import { fetchProjectCompletion } from '../api';
import { getProjectIdentity } from '../utils/mapProject';
import { sliceDate } from '../utils/stageMappers';

export default function ProjectCompletionStage({
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
  const [actualCompletionDate, setActualCompletionDate] = useState('');
  const [closureCost, setClosureCost] = useState('');
  const [loading, setLoading] = useState(false);

  const disabled = !canSubmit || readOnly;

  useEffect(() => {
    if (!projectID) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchProjectCompletion(projectID, subProjectID);
        const row = Array.isArray(res?.data) ? res.data[0] : null;
        if (!mounted || !row) return;
        setActualCompletionDate(sliceDate(row.actual_date_of_completion));
        setClosureCost(row.closure_cost ?? '');
      } catch (error) {
        console.error(error);
        notify?.('Failed to load completion details.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [projectID, subProjectID, refreshKey, notify]);

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="text-xs font-semibold text-slate-500">Loading completion details...</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl bg-white p-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Actual Date of Completion <span className="text-rose-600">*</span>
          </label>
          <input
            type="date"
            value={actualCompletionDate}
            onChange={(e) => setActualCompletionDate(e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
          />
        </div>

        <div className="border border-slate-200 rounded-xl bg-white p-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Closure Cost (In Crore) <span className="text-rose-600">*</span>
          </label>
          <input
            type="number"
            value={closureCost}
            onChange={(e) => setClosureCost(e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmitStage?.('completion', { actualCompletionDate, closureCost })}
          className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
        >
          Submit Completion
        </button>
      </div>
    </div>
  );
}
