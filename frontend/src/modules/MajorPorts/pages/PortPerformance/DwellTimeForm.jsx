import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Info, Loader2 } from 'lucide-react';
import ConfirmModal from '../../../../components/ConfirmModal';
import { fetchDwellTimePeriod, saveDwellTimePeriod } from '../../api';
import { useNotifier, getErrorMessage } from '../../../../utils/notify';
import { PORT_PERFORMANCE_TOASTS } from '../../toastMessages';
import { describePeriod, formatDate } from '../Traffic/trafficFormat';
import { useLatestRef } from '../Traffic/usePagedList';
import {
  DWELL_VALUE_COLUMNS,
  DWELL_VALUE_GROUPS,
  toDwellFormValues,
  toDwellPayload,
  validateDwellRow,
} from './dwellTimeConfig';

const COLUMN_KEY_BY_LABEL = Object.fromEntries(DWELL_VALUE_COLUMNS.map((c) => [c.fullLabel, c.key]));

/**
 * Update the uploaded dwell time of one month (every major port, SMPA Overall and All Major Ports).
 * record: { fiscal_year, month } from the Dwell Time list. Blank or "-" means no data.
 */
export default function DwellTimeForm({ record, onBack, onSuccess, triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const notifyRef = useLatestRef(notify);
  const fiscalYear = record.fiscal_year;
  const month = record.month;
  const period = describePeriod(fiscalYear, month);

  const [rows, setRows] = useState([]); // [{ rowKey, organisationId, label }]
  const [values, setValues] = useState({}); // rowKey -> form values
  const [latestUpload, setLatestUpload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({}); // rowKey -> { key: message }
  const [serverProblems, setServerProblems] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDwellTimePeriod({ fiscalYear, month })
      .then(({ data }) => {
        if (cancelled) return;
        const loaded = data.rows || [];
        setRows(loaded.map(({ rowKey, organisationId, label }) => ({ rowKey, organisationId, label })));
        setValues(Object.fromEntries(loaded.map((r) => [r.rowKey, toDwellFormValues(r.values)])));
        setLatestUpload(data.latestUpload);
        setLoadFailed(!data.exists);
        if (!data.exists) notifyRef.current(PORT_PERFORMANCE_TOASTS.dwellLoadFailed('This month has no uploaded dwell time.'));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadFailed(true);
        notifyRef.current(PORT_PERFORMANCE_TOASTS.dwellLoadFailed(getErrorMessage(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fiscalYear, month, notifyRef]);

  const errorCount = useMemo(
    () => Object.values(fieldErrors).reduce((n, e) => n + Object.keys(e).length, 0),
    [fieldErrors]
  );

  const handleChange = (rowKey, key, value) => {
    setValues((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], [key]: value } }));
    // A row with errors is checked again as it is corrected
    setFieldErrors((prev) => {
      if (!prev[rowKey]) return prev;
      const next = { ...prev };
      const rowErrors = validateDwellRow({ ...values[rowKey], [key]: value });
      if (Object.keys(rowErrors).length) next[rowKey] = rowErrors;
      else delete next[rowKey];
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    const errors = Object.fromEntries(
      rows.map((r) => [r.rowKey, validateDwellRow(values[r.rowKey])]).filter(([, e]) => Object.keys(e).length)
    );
    setFieldErrors(errors);
    setServerProblems([]);
    if (Object.keys(errors).length) return notify(PORT_PERFORMANCE_TOASTS.dwellInvalid());

    setSaving(true);
    try {
      await saveDwellTimePeriod({
        fiscalYear,
        month,
        rows: rows.map((r) => ({ rowKey: r.rowKey, values: toDwellPayload(values[r.rowKey]) })),
      });
      notify(PORT_PERFORMANCE_TOASTS.dwellSaved(period));
      onSuccess?.();
    } catch (err) {
      const listed = err?.response?.data?.errors;
      if (Array.isArray(listed) && listed.length) {
        setServerProblems(listed);
        setFieldErrors(listed.reduce((acc, p) => {
          const key = COLUMN_KEY_BY_LABEL[p.column] || 'monthly_overall';
          return { ...acc, [p.rowKey]: { ...acc[p.rowKey], [key]: p.message } };
        }, {}));
        notify(PORT_PERFORMANCE_TOASTS.dwellInvalid());
      } else {
        notify(PORT_PERFORMANCE_TOASTS.dwellSaveFailed(getErrorMessage(err)));
      }
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  const handleCancel = () => (dirty ? setConfirmLeave(true) : onBack?.());
  const disabled = loading || loadFailed || saving;

  return (
    <div className="module-form-card animate-fade-in">
      <div className="module-form-banner">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-white/10 p-2">
            <Clock3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="module-form-banner-title">Update Dwell Time · {period.monthLabel} {fiscalYear}</h3>
            <p className="module-form-banner-subtext">KPI · Major Ports · Values uploaded from Excel, in hours</p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <Info className="h-3.5 w-3.5 mt-px text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span>
            Correct single values here, or upload the corrected sheet again from the Dwell Time tab. Leave a cell blank (or "-")
            when a port has no data. Overall must lie between Import and Export.
            {latestUpload ? ` Last uploaded ${formatDate(latestUpload.uploaded_date)}${latestUpload.uploaded_by_name ? ` by ${latestUpload.uploaded_by_name}` : ''} (${latestUpload.file_name}).` : ''}
          </span>
        </p>

        {serverProblems.length > 0 && (
          <div role="alert" className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <ul className="space-y-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              {serverProblems.map((p, i) => <li key={`${p.rowKey}-${i}`}>{p.message}</li>)}
            </ul>
          </div>
        )}

        {loading ? (
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the uploaded dwell time…
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                <tr>
                  <th rowSpan={2} className="px-3 py-2 text-left font-bold">Port</th>
                  {DWELL_VALUE_GROUPS.map((g) => (
                    <th key={g.title} colSpan={g.columns.length} className="px-3 py-1.5 text-center font-bold border-l border-slate-200 dark:border-slate-800">{g.title}</th>
                  ))}
                </tr>
                <tr>
                  {DWELL_VALUE_COLUMNS.map((c, i) => (
                    <th key={c.key} className={`px-3 py-1.5 text-center font-bold ${i % 3 === 0 ? 'border-l border-slate-200 dark:border-slate-800' : ''}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowKey} className={`border-t border-slate-100 dark:border-slate-800 ${r.organisationId ? '' : 'bg-slate-50/70 dark:bg-slate-900/60'}`}>
                    <td className={`px-3 py-1.5 text-slate-700 dark:text-slate-200 whitespace-nowrap ${r.organisationId ? 'font-semibold' : 'font-extrabold'}`}>{r.label}</td>
                    {DWELL_VALUE_COLUMNS.map((c, i) => {
                      const error = fieldErrors[r.rowKey]?.[c.key];
                      return (
                        <td key={c.key} className={`px-2 py-1.5 align-top ${i % 3 === 0 ? 'border-l border-slate-100 dark:border-slate-800' : ''}`}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={values[r.rowKey]?.[c.key] ?? ''}
                            onChange={(e) => handleChange(r.rowKey, c.key, e.target.value)}
                            disabled={disabled}
                            aria-label={`${r.label} ${c.fullLabel}`}
                            aria-invalid={Boolean(error)}
                            title={error || undefined}
                            placeholder="-"
                            className={`module-form-input w-24 text-center tabular-nums ${error ? '!border-rose-400 !bg-rose-50 dark:!bg-rose-950/30' : ''}`}
                          />
                          {error && <p className="mt-0.5 max-w-[6rem] text-[10px] font-bold leading-tight text-rose-600">{error}</p>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {errorCount ? `${errorCount} value${errorCount === 1 ? '' : 's'} to correct` : dirty ? 'Unsaved changes' : 'No changes yet'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || !dirty}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          onBack?.();
        }}
        title="Discard Unsaved Changes"
        confirmText="Discard"
        message="The dwell time has unsaved changes. Leave without saving them?"
      />
    </div>
  );
}
