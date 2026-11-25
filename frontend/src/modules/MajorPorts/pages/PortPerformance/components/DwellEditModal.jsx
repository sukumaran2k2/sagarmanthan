import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Edit, Loader2, Save, X } from 'lucide-react';
import { fetchDwellTimePeriod, updateDwellTimePeriod } from '../../../api';
import { useNotifier, getErrorMessage } from '../../../../../utils/notify';
import { PORT_PERFORMANCE_TOASTS } from '../../../toastMessages';
import { describePeriod, formatDate, monthLabel } from '../../Traffic/trafficFormat';
import { DWELL_VALUE_COLUMNS, DWELL_VALUE_GROUPS, checkDwellRow } from '../dwellTimeConfig';

const toInput = (value) => (value === null || value === undefined ? '' : String(value));

/**
 * Ministry correction of an uploaded month without a new sheet: every port's six values,
 * checked with the upload's rules here and again on the server. Only changed rows are saved.
 * period: { fiscal_year, month } of the row clicked in the uploads table.
 */
export default function DwellEditModal({ period, onClose, onSaved, triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const fiscalYear = period.fiscal_year;
  const { month } = period;
  const [rows, setRows] = useState(null); // [{ rowKey, organisationId, label, values, inputs }]
  const [upload, setUpload] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [serverErrors, setServerErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load once per period, even if the parent passes a new triggerNotification
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    let active = true;
    fetchDwellTimePeriod({ fiscalYear, month })
      .then(({ data }) => {
        if (!active) return;
        setUpload(data.upload || null);
        setRows((data.rows || []).map((r) => ({
          ...r,
          inputs: Object.fromEntries(DWELL_VALUE_COLUMNS.map((c) => [c.key, toInput(r.values?.[c.key])])),
        })));
      })
      .catch((err) => {
        if (!active) return;
        const reason = getErrorMessage(err);
        setLoadError(reason || 'The saved dwell time could not be loaded.');
        notifyRef.current(PORT_PERFORMANCE_TOASTS.dwellLoadFailed(reason));
      });
    return () => { active = false; };
  }, [fiscalYear, month]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, onClose]);

  // values = saved; typed = what the inputs hold now, parsed with the upload's rules
  const checked = useMemo(
    () => (rows || []).map((r) => {
      const { values: typed, cellErrors } = checkDwellRow(r.inputs);
      return { ...r, typed, cellErrors };
    }),
    [rows]
  );
  const problems = checked.flatMap((r) => Object.values(r.cellErrors).map((message) => `${r.label}: ${message}`));
  const isChanged = (r, key) => (r.values?.[key] ?? null) !== r.typed[key];
  const changedCount = checked.filter((r) => DWELL_VALUE_COLUMNS.some((c) => isChanged(r, c.key))).length;

  const setInput = (rowKey, key, text) => {
    setServerErrors([]);
    setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, inputs: { ...r.inputs, [key]: text } } : r)));
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (problems.length) {
      notify(PORT_PERFORMANCE_TOASTS.dwellEditProblems(problems.length));
      return;
    }
    if (!changedCount) {
      notify(PORT_PERFORMANCE_TOASTS.dwellNothingChanged());
      return;
    }
    setSaving(true);
    try {
      const { data } = await updateDwellTimePeriod({
        fiscalYear,
        month,
        rows: checked.map((r) => ({ rowKey: r.rowKey, values: r.inputs })),
      });
      if (data?.changed) notify(PORT_PERFORMANCE_TOASTS.dwellUpdated(describePeriod(fiscalYear, month), data.changed));
      else notify(PORT_PERFORMANCE_TOASTS.dwellNothingChanged());
      onSaved?.();
      onClose();
    } catch (err) {
      const listed = err?.response?.data?.errors;
      if (Array.isArray(listed) && listed.length) {
        setServerErrors(listed.map((e) => e.message));
        notify(PORT_PERFORMANCE_TOASTS.dwellEditProblems(listed.length));
      } else {
        notify(PORT_PERFORMANCE_TOASTS.dwellUpdateFailed(getErrorMessage(err)));
      }
    } finally {
      setSaving(false);
    }
  };

  const shownProblems = [...(showErrors ? problems : []), ...serverErrors];
  const periodText = `${monthLabel(month)} ${fiscalYear}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dwell-edit-title"
        className="module-form-card w-full max-w-6xl shadow-2xl animate-scale-up my-auto"
      >
        <div className="module-form-banner">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 rounded-lg bg-white/10 p-2">
              <Edit className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 id="dwell-edit-title" className="module-form-banner-title">Update Dwell Time · {periodText}</h3>
              <p className="module-form-banner-subtext">
                Correct the uploaded values. Hours; leave blank or "-" for no data.
                {upload?.file_name ? ` Last file: ${upload.file_name}` : ''}
                {upload?.uploaded_date ? ` (${formatDate(upload.uploaded_date)})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loadError && (
            <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {loadError}
            </p>
          )}

          {!rows && !loadError && (
            <p role="status" className="flex items-center justify-center gap-2 py-10 text-xs font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the saved values…
            </p>
          )}

          {rows && (
            <>
              <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th rowSpan={2} className="px-3 py-2 text-center font-bold">S.No</th>
                      <th rowSpan={2} className="px-3 py-2 text-left font-bold">Port</th>
                      {DWELL_VALUE_GROUPS.map((g) => (
                        <th key={g.title} colSpan={g.columns.length} className="px-3 py-1.5 text-center font-bold border-l border-slate-200 dark:border-slate-800">{g.title}</th>
                      ))}
                    </tr>
                    <tr>
                      {DWELL_VALUE_COLUMNS.map((c, i) => (
                        <th key={c.key} className={`px-2 py-1.5 text-center font-bold ${i % 3 === 0 ? 'border-l border-slate-200 dark:border-slate-800' : ''}`}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {checked.map((r, index) => (
                      <tr key={r.rowKey} className={`border-t border-slate-100 dark:border-slate-800 ${r.organisationId ? '' : 'bg-slate-50/70 dark:bg-slate-900/60'}`}>
                        <td className="px-3 py-1.5 text-center text-slate-400">{index + 1}</td>
                        <td className={`px-3 py-1.5 text-slate-700 dark:text-slate-200 whitespace-nowrap ${r.organisationId ? 'font-semibold' : 'font-extrabold'}`}>{r.label}</td>
                        {DWELL_VALUE_COLUMNS.map((c, i) => {
                          const error = showErrors || r.inputs[c.key] !== toInput(r.values?.[c.key]) ? r.cellErrors[c.key] : null;
                          const changed = !error && isChanged(r, c.key);
                          return (
                            <td key={c.key} className={`px-1.5 py-1 ${i % 3 === 0 ? 'border-l border-slate-100 dark:border-slate-800' : ''}`}>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={r.inputs[c.key]}
                                disabled={saving}
                                placeholder="-"
                                title={error || `${r.label} · ${c.fullLabel}`}
                                aria-label={`${r.label} ${c.fullLabel}`}
                                aria-invalid={Boolean(error)}
                                onChange={(e) => setInput(r.rowKey, c.key, e.target.value)}
                                className={`w-24 px-2 py-1.5 rounded-lg border text-center tabular-nums text-[12px] font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                                  error
                                    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30'
                                    : changed ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700'
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {shownProblems.length > 0 && (
                <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs">
                  <p className="font-extrabold uppercase tracking-wide text-rose-800 dark:text-rose-200">
                    {shownProblems.length} problem{shownProblems.length === 1 ? '' : 's'} · nothing was saved
                  </p>
                  <ul className="mt-1.5 space-y-0.5 max-h-28 overflow-y-auto">
                    {shownProblems.map((message, i) => (
                      <li key={`${message}-${i}`} className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">&bull; {message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {rows ? `${changedCount} row${changedCount === 1 ? '' : 's'} changed · changed cells are highlighted. Overall must lie between Import and Export.` : ''}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !rows}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Updating…' : 'Update Dwell Time'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
