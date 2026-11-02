import { useEffect, useState } from 'react';
import { ArrowLeft, Info, Loader2, Save, Target } from 'lucide-react';
import {
  createRenewableEnergyTarget,
  fetchRenewableEnergyTargets,
  updateRenewableEnergyTarget,
} from '../../api';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { RENEWABLE_ENERGY_TOASTS } from '../../toastMessages';
import { buildFinancialYearOptions, currentFinancialYear } from '../Traffic/trafficConstants';
import FinancialFieldGroup from '../FinancialParameters/components/FinancialFieldGroup';
import { TARGET_FIELDS, buildPayload, fieldLabel, toFormValues, validateValues } from './renewableEnergyConfig';

const FY_OPTIONS = buildFinancialYearOptions({ ahead: 1 });

/**
 * Ministry Input Form: add the financial-year renewable energy target of an organisation,
 * or update the one in `record` (a Targets row). Choosing an organisation and year that
 * already has a target offers to open it instead.
 */
export default function RenewableEnergyTargetForm({
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
  const [organisationId, setOrganisationId] = useState(record ? String(record.organisation_id) : '');
  const [financialYear, setFinancialYear] = useState(record?.financial_year || currentFinancialYear());
  const [values, setValues] = useState(() => toFormValues(TARGET_FIELDS, record || {}));

  const lookupKey = !isUpdate && organisationId && financialYear ? `${organisationId}|${financialYear}` : null;
  const existing = lookupKey && lookup?.key === lookupKey ? lookup.row : null;

  useEffect(() => {
    if (!lookupKey) return undefined;
    let cancelled = false;
    const [orgId, fy] = lookupKey.split('|');
    fetchRenewableEnergyTargets({ organisationId: orgId, fiscalYear: fy, page: 1, limit: 1 })
      .then(({ data }) => {
        if (!cancelled) setLookup({ key: lookupKey, row: data?.data?.[0] || null });
      })
      .catch(() => {
        if (!cancelled) setLookup({ key: lookupKey, row: null });
      });
    return () => { cancelled = true; };
  }, [lookupKey]);

  const organisationName = isUpdate
    ? record.organisation_name
    : organisations.find((o) => String(o.organisation_id) === organisationId)?.organisation_name;

  const handleValueChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateValues(TARGET_FIELDS, values);
    if (!isUpdate && !organisationId) nextErrors.organisationId = 'Select the organisation';
    if (!isUpdate && !financialYear) nextErrors.financialYear = 'Select the financial year';
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    if (existing) {
      notify(RENEWABLE_ENERGY_TOASTS.targetExists(existing.organisation_name, existing.financial_year));
      return;
    }

    const payload = { values: buildPayload(TARGET_FIELDS, values) };
    setSubmitting(true);
    try {
      if (isUpdate) {
        await updateRenewableEnergyTarget(record.id, payload);
      } else {
        await createRenewableEnergyTarget({ ...payload, financialYear, organisationId: Number(organisationId) });
      }
      notify(RENEWABLE_ENERGY_TOASTS.targetSaved(organisationName, financialYear, isUpdate));
      onSuccess?.();
    } catch (err) {
      notify(RENEWABLE_ENERGY_TOASTS.targetSaveFailed(isUpdate, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = (key) => `module-form-select cursor-pointer ${errors[key] ? '!border-rose-400' : ''}`;
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
              {isUpdate ? 'Update Renewable Energy Target' : 'Add Renewable Energy Target'}
            </h3>
            <p className="module-form-banner-subtext">KPI · Major Ports · Renewable energy targets are set by the Ministry</p>
          </div>
        </div>
        {isUpdate ? (
          <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1.5 rounded-lg">
            {record.organisation_name}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-5 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="re-target-org" className="module-form-label">Organisation Name {required}</label>
            {isUpdate ? (
              <input id="re-target-org" className="module-form-input" value={record.organisation_name} disabled />
            ) : (
              <select
                id="re-target-org"
                className={selectClass('organisationId')}
                value={organisationId}
                onChange={(e) => {
                  setOrganisationId(e.target.value);
                  setErrors((prev) => ({ ...prev, organisationId: undefined }));
                }}
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
            <label htmlFor="re-target-fy" className="module-form-label">Financial Year {required}</label>
            {isUpdate ? (
              <input id="re-target-fy" className="module-form-input" value={record.financial_year} disabled />
            ) : (
              <select
                id="re-target-fy"
                className={selectClass('financialYear')}
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
              A {existing.financial_year} renewable energy target for {existing.organisation_name} already exists.
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

        <FinancialFieldGroup
          title="Target"
          note="Renewable energy consumption for the whole financial year."
          fields={TARGET_FIELDS}
          values={values}
          errors={errors}
          onChange={handleValueChange}
          disabled={submitting}
          idPrefix="re-target"
          formatLabel={fieldLabel}
        />

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
