import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Info, Loader2, Save, Target } from 'lucide-react';
import { fetchPortPerformanceTargetRecord, savePortPerformanceTargetRecord } from '../../api';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { PORT_PERFORMANCE_TOASTS } from '../../toastMessages';
import { buildFinancialYearOptions, currentFinancialYear } from '../Traffic/trafficConstants';
import { useLatestRef } from '../Traffic/usePagedList';
import {
  AGGREGATE_ROWS,
  MAX_VALUE,
  groupKpiTypes,
  isPercentKpi,
  kpiLabel,
  orgRowKey,
} from './portPerformanceConfig';

const FY_OPTIONS = buildFinancialYearOptions({ ahead: 1 });

const toText = (value) => (value === null || value === undefined ? '' : String(value));

function validateTarget(kpiType, raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return 'Enter a number of zero or more';
  if (n > MAX_VALUE) return 'Value is too large';
  if (isPercentKpi(kpiType) && n > 100) return 'Cannot exceed 100%';
  return null;
}

/**
 * Ministry Input Form: add the financial-year port performance targets of one organisation
 * (or of Total SMPA / Overall), or update the row passed in `record` (a Targets list row).
 * Each KPI is optional; at least one is needed. Clearing a value removes that target.
 */
export default function PortPerformanceTargetForm({
  record = null,
  organisations = [],
  kpiTypes = [],
  onOpenExisting,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isUpdate = Boolean(record);
  const notify = useNotifier(triggerNotification);
  // notify via ref: App recreates it on every toast, which would reload the record
  const notifyRef = useLatestRef(notify);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  // { key, exists }: the lookup result for one row + year
  const [lookup, setLookup] = useState(null);
  const [rowKey, setRowKey] = useState(record?.row_key || '');
  const [financialYear, setFinancialYear] = useState(record?.financial_year || currentFinancialYear());
  const [values, setValues] = useState({});
  // Update mode reads the saved targets first; inputs stay disabled until they arrive
  const [loadingRecord, setLoadingRecord] = useState(isUpdate);

  useEffect(() => {
    if (!isUpdate) return undefined;
    let cancelled = false;
    fetchPortPerformanceTargetRecord({ financialYear: record.financial_year, rowKey: record.row_key })
      .then(({ data }) => {
        if (cancelled) return;
        setValues(Object.fromEntries(Object.entries(data?.values || {}).map(([id, v]) => [id, toText(v)])));
        setLoadingRecord(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadingRecord(false);
        notifyRef.current(PORT_PERFORMANCE_TOASTS.targetsLoadFailed(getErrorMessage(err)));
      });
    return () => { cancelled = true; };
  }, [isUpdate, record?.financial_year, record?.row_key, notifyRef]);

  const groups = useMemo(() => groupKpiTypes(kpiTypes), [kpiTypes]);
  const rowOptions = useMemo(() => [
    ...organisations.map((o) => ({ value: orgRowKey(o.organisation_id), label: o.organisation_name })),
    ...AGGREGATE_ROWS.map((r) => ({ value: r.rowKey, label: r.label })),
  ], [organisations]);
  const rowName = isUpdate
    ? record.organisation_name
    : rowOptions.find((o) => o.value === rowKey)?.label;

  // Look for saved targets as soon as both keys are chosen
  const lookupKey = !isUpdate && rowKey && financialYear ? `${rowKey}|${financialYear}` : null;
  const existing = Boolean(lookupKey) && lookup?.key === lookupKey && lookup.exists;

  useEffect(() => {
    if (!lookupKey) return undefined;
    let cancelled = false;
    const [key, fy] = lookupKey.split('|');
    fetchPortPerformanceTargetRecord({ financialYear: fy, rowKey: key })
      .then(({ data }) => {
        if (!cancelled) setLookup({ key: lookupKey, exists: Boolean(data?.exists) });
      })
      .catch(() => {
        if (!cancelled) setLookup({ key: lookupKey, exists: false });
      });
    return () => { cancelled = true; };
  }, [lookupKey]);

  const updateValue = (id, value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: undefined, values: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!isUpdate && !rowKey) nextErrors.rowKey = 'Select the organisation';
    if (!isUpdate && !financialYear) nextErrors.financialYear = 'Select the financial year';
    kpiTypes.forEach((t) => {
      const err = validateTarget(t, values[t.kpi_type_id]);
      if (err) nextErrors[t.kpi_type_id] = err;
    });
    const filled = kpiTypes.filter((t) => String(values[t.kpi_type_id] ?? '').trim() !== '');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    if (!filled.length) {
      setErrors({ values: 'Enter at least one target' });
      notify(PORT_PERFORMANCE_TOASTS.targetsEmpty());
      return;
    }
    if (existing) {
      notify(PORT_PERFORMANCE_TOASTS.targetsExist(rowName, financialYear));
      return;
    }

    // Every KPI is sent, so a value cleared on update removes that target
    const payloadValues = Object.fromEntries(kpiTypes.map((t) => {
      const text = String(values[t.kpi_type_id] ?? '').trim();
      return [t.kpi_type_id, text === '' ? null : Number(text)];
    }));
    setSubmitting(true);
    try {
      const res = await savePortPerformanceTargetRecord({ financialYear, rowKey, values: payloadValues });
      notify(PORT_PERFORMANCE_TOASTS.targetsSaved(rowName, financialYear, res.data?.action === 'update' || isUpdate));
      onSuccess?.();
    } catch (err) {
      notify(PORT_PERFORMANCE_TOASTS.targetsSaveFailed(isUpdate, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const errorText = (key) => (errors[key]
    ? <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1">{errors[key]}</p>
    : null);
  const required = <span className="text-red-500">*</span>;

  return (
    <div className="module-form-card animate-fade-in">
      <div className="module-form-banner">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-white/10 p-2">
            <Target className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="module-form-banner-title">
              {isUpdate ? 'Update Port Performance Targets' : 'Add Port Performance Targets'}
            </h3>
            <p className="module-form-banner-subtext">KPI · Major Ports · Port performance targets are set by the Ministry</p>
          </div>
        </div>
        {isUpdate ? (
          <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1.5 rounded-lg">
            {record.organisation_name}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="pp-target-row" className="module-form-label">Organisation Name {required}</label>
            {isUpdate ? (
              <input id="pp-target-row" className="module-form-input" value={record.organisation_name} disabled />
            ) : (
              <select
                id="pp-target-row"
                className={`module-form-select cursor-pointer ${errors.rowKey ? '!border-rose-400' : ''}`}
                value={rowKey}
                onChange={(e) => {
                  setRowKey(e.target.value);
                  setErrors((prev) => ({ ...prev, rowKey: undefined }));
                }}
                aria-invalid={Boolean(errors.rowKey)}
              >
                <option value="">--Select Organisation Name--</option>
                {rowOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {errorText('rowKey')}
          </div>

          <div>
            <label htmlFor="pp-target-fy" className="module-form-label">Financial Year {required}</label>
            {isUpdate ? (
              <input id="pp-target-fy" className="module-form-input" value={record.financial_year} disabled />
            ) : (
              <select
                id="pp-target-fy"
                className={`module-form-select cursor-pointer ${errors.financialYear ? '!border-rose-400' : ''}`}
                value={financialYear}
                onChange={(e) => {
                  setFinancialYear(e.target.value);
                  setErrors((prev) => ({ ...prev, financialYear: undefined }));
                }}
                aria-invalid={Boolean(errors.financialYear)}
              >
                <option value="">--Select Financial Year--</option>
                {FY_OPTIONS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            )}
            {errorText('financialYear')}
          </div>
        </div>

        {existing ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {financialYear} targets for {rowName} already exist.
            </span>
            {onOpenExisting ? (
              <button
                type="button"
                onClick={() => onOpenExisting({ row_key: rowKey, financial_year: financialYear, organisation_name: rowName })}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer"
              >
                Open for Update
              </button>
            ) : null}
          </div>
        ) : null}

        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {loadingRecord
            ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" aria-hidden="true" />
            : <Info className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />}
          <span>
            {loadingRecord
              ? 'Loading the saved targets…'
              : 'Fill the KPIs that have a target this year; leave the others blank. Clearing a value removes that target.'}
          </span>
        </p>
        {errorText('values')}

        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="module-form-section-title !mt-0">{g.title}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {g.types.map((t) => (
                <div key={t.kpi_type_id}>
                  <label htmlFor={`pp-target-${t.kpi_type_id}`} className="module-form-label">{kpiLabel(t)}</label>
                  <input
                    id={`pp-target-${t.kpi_type_id}`}
                    type="number"
                    min="0"
                    max={isPercentKpi(t) ? '100' : undefined}
                    step="any"
                    inputMode="decimal"
                    className={`module-form-input ${errors[t.kpi_type_id] ? '!border-rose-400' : ''}`}
                    value={values[t.kpi_type_id] ?? ''}
                    onChange={(e) => updateValue(t.kpi_type_id, e.target.value)}
                    aria-invalid={Boolean(errors[t.kpi_type_id])}
                    disabled={submitting || existing || loadingRecord}
                  />
                  {errorText(t.kpi_type_id)}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <small className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Fields marked with <span className="text-red-500">*</span> are mandatory; enter at least one target
          </small>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Targets
            </button>
            <button
              type="submit"
              disabled={submitting || existing || loadingRecord || !kpiTypes.length}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? 'Saving…' : isUpdate ? 'Update Targets' : 'Submit Targets'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
