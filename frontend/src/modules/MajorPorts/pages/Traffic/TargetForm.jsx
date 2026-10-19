import { useEffect, useState } from 'react';
import { ArrowLeft, Info, Loader2, Save, Target } from 'lucide-react';
import { createTrafficTarget, fetchTrafficTargets, updateTrafficTarget } from '../../api';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { TRAFFIC_TOASTS } from '../../toastMessages';
import { buildFinancialYearOptions, currentFinancialYear } from './trafficConstants';

const FY_OPTIONS = buildFinancialYearOptions({ ahead: 1 });

// Same fields and labels as the earlier portal's Financial Year Target form
const TARGET_FIELDS = [
  { key: 'fiscalYearTarget', column: 'fiscal_year_target', label: 'Total Traffic Target (In MMT)' },
  { key: 'roRoTarget', column: 'ro_ro_target', label: 'Ro-Ro Target (In MMT)' },
  { key: 'roPaxTarget', column: 'ro_pax_target', label: 'Ro-Pax Target (In MMT/Number)' },
  { key: 'containerTargetMteu', column: 'container_target_mteu', label: 'Container Target (In MTEUs)' },
];

const toText = (value) => (value === null || value === undefined ? '' : String(value));

function validate(form, isUpdate) {
  const errors = {};
  if (!isUpdate && !form.organisationId) errors.organisationId = 'Select the organisation';
  if (!isUpdate && !form.financialYear) errors.financialYear = 'Select the financial year';
  TARGET_FIELDS.forEach(({ key }) => {
    const raw = String(form[key]).trim();
    if (raw === '') errors[key] = 'Required';
    else if (!Number.isFinite(Number(raw)) || Number(raw) < 0) errors[key] = 'Enter a number of zero or more';
  });
  return errors;
}

/**
 * Ministry Input Form: add a financial-year traffic target, or update the one in `record`.
 * Choosing an organisation and year that already has a target offers to open it instead.
 */
export default function TrafficTargetForm({
  record = null,
  organisations = [],
  onOpenExisting,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isUpdate = Boolean(record);
  const notify = useNotifier(triggerNotification);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  // { key, row }: the lookup result for one organisation + year
  const [lookup, setLookup] = useState(null);
  const [form, setForm] = useState(() => ({
    organisationId: record ? String(record.organisation_id) : '',
    financialYear: record?.financial_year || currentFinancialYear(),
    ...Object.fromEntries(TARGET_FIELDS.map(({ key, column }) => [key, toText(record?.[column])])),
  }));

  // Look for an existing target as soon as both keys are chosen
  const lookupKey = !isUpdate && form.organisationId && form.financialYear
    ? `${form.organisationId}|${form.financialYear}`
    : null;
  const existing = lookupKey && lookup?.key === lookupKey ? lookup.row : null;

  useEffect(() => {
    if (!lookupKey) return undefined;
    let cancelled = false;
    fetchTrafficTargets({ organisationId: form.organisationId, fiscalYear: form.financialYear, limit: 1 })
      .then(({ data }) => {
        if (!cancelled) setLookup({ key: lookupKey, row: data?.data?.[0] || null });
      })
      .catch(() => {
        if (!cancelled) setLookup({ key: lookupKey, row: null });
      });
    return () => { cancelled = true; };
  }, [lookupKey, form.organisationId, form.financialYear]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const organisationName = isUpdate
    ? record.organisation_name
    : organisations.find((o) => String(o.organisation_id) === form.organisationId)?.organisation_name;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form, isUpdate);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    if (existing) {
      notify(TRAFFIC_TOASTS.targetExists(existing.organisation_name, existing.financial_year));
      return;
    }

    const payload = Object.fromEntries(TARGET_FIELDS.map(({ key }) => [key, Number(form[key])]));
    setSubmitting(true);
    try {
      if (isUpdate) {
        await updateTrafficTarget(record.id, payload);
        notify(TRAFFIC_TOASTS.targetUpdated(organisationName, form.financialYear));
      } else {
        await createTrafficTarget({
          ...payload,
          financialYear: form.financialYear,
          organisationId: Number(form.organisationId),
        });
        notify(TRAFFIC_TOASTS.targetAdded(organisationName, form.financialYear));
      }
      onSuccess?.();
    } catch (err) {
      notify(TRAFFIC_TOASTS.targetSaveFailed(isUpdate, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (key, base = 'module-form-input') => `${base} ${errors[key] ? '!border-rose-400' : ''}`;
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
              {isUpdate ? 'Update Financial Year Target' : 'Add Financial Year Target'}
            </h3>
            <p className="module-form-banner-subtext">KPI · Major Ports · Traffic targets are set by the Ministry</p>
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
            <label htmlFor="target-org" className="module-form-label">Organisation Name {required}</label>
            {isUpdate ? (
              <input id="target-org" className="module-form-input" value={record.organisation_name} disabled />
            ) : (
              <select
                id="target-org"
                className={`${fieldClass('organisationId', 'module-form-select')} cursor-pointer`}
                value={form.organisationId}
                onChange={(e) => update('organisationId', e.target.value)}
                aria-invalid={Boolean(errors.organisationId)}
              >
                <option value="">--Select Organisation Name--</option>
                {organisations.map((o) => (
                  <option key={o.organisation_id} value={String(o.organisation_id)}>{o.organisation_name}</option>
                ))}
              </select>
            )}
            {errorText('organisationId')}
          </div>

          <div>
            <label htmlFor="target-fy" className="module-form-label">Financial Year {required}</label>
            {isUpdate ? (
              <input id="target-fy" className="module-form-input" value={record.financial_year} disabled />
            ) : (
              <select
                id="target-fy"
                className={`${fieldClass('financialYear', 'module-form-select')} cursor-pointer`}
                value={form.financialYear}
                onChange={(e) => update('financialYear', e.target.value)}
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
              A {existing.financial_year} target for {existing.organisation_name} already exists.
            </span>
            {onOpenExisting ? (
              <button
                type="button"
                onClick={() => onOpenExisting(existing)}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer"
              >
                Open for Update
              </button>
            ) : null}
          </div>
        ) : null}

        <div>
          <h4 className="module-form-section-title !mt-0">Targets</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TARGET_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={`target-${key}`} className="module-form-label">{label} {required}</label>
                <input
                  id={`target-${key}`}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  className={fieldClass(key)}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  aria-invalid={Boolean(errors[key])}
                />
                {errorText(key)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <small className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Fields marked with <span className="text-red-500">*</span> are mandatory
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
              disabled={submitting || Boolean(existing)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? 'Saving…' : isUpdate ? 'Update Target' : 'Submit Target'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
