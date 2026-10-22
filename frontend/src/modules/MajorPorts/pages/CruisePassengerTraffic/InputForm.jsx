import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Info, Loader2, Save, Ship } from 'lucide-react';
import ConfirmModal from '../../../../components/ConfirmModal';
import {
  createCruisePassengerActual,
  fetchCruisePassengerActual,
  fetchCruisePassengerActuals,
  updateCruisePassengerActual,
} from '../../api';
import { useNotifier, getErrorMessage } from '../../../../utils/notify';
import { CRUISE_PASSENGER_TOASTS } from '../../toastMessages';
import { FY_MONTHS, buildFinancialYearOptions, currentFinancialYear, isFuturePeriod } from '../Traffic/trafficConstants';
import { describePeriod } from '../Traffic/trafficFormat';
import { useLatestRef } from '../Traffic/usePagedList';
import FinancialFieldGroup from '../FinancialParameters/components/FinancialFieldGroup';
import {
  ACTUAL_GROUPS,
  INPUT_FIELDS,
  activeFields,
  buildPayload,
  computeDerived,
  fieldLabel,
  savedFerryAnswer,
  toFormValues,
  validateValues,
} from './cruisePassengerConfig';

const FY_OPTIONS = buildFinancialYearOptions();

const FERRY_CHOICES = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
];

/**
 * Monthly cruise and passenger traffic of the signed-in organisation, on one page as in the
 * earlier portal. Ferry calls and passengers are asked only when the port handles passenger
 * ferries. There is no entry window: any month that has started can be added or updated.
 *
 * editData: { id, fiscal_year, month } when opened from Actuals, else null.
 */
export default function CruisePassengerInputForm({
  editData = null,
  organisationName,
  onOpenExisting,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isUpdate = Boolean(editData);
  const notify = useNotifier(triggerNotification);
  const notifyRef = useLatestRef(notify);

  const [fiscalYear, setFiscalYear] = useState(editData?.fiscal_year || currentFinancialYear());
  const [month, setMonth] = useState(editData?.month != null ? String(editData.month) : '');
  const [handlesFerry, setHandlesFerry] = useState(null);
  const [values, setValues] = useState(() => toFormValues(INPUT_FIELDS));
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Update: the saved record once loaded. Add: the record found for the chosen period, if any.
  const [record, setRecord] = useState({ status: isUpdate ? 'loading' : 'idle' });
  const [lookup, setLookup] = useState({ key: null, row: null });

  const periodInfo = describePeriod(fiscalYear, month);
  const monthOptions = useMemo(
    () => FY_MONTHS.filter((m) => !isFuturePeriod(fiscalYear, m.value)),
    [fiscalYear]
  );

  // Update: load the saved values fresh, so the form never shows an old copy
  useEffect(() => {
    if (!isUpdate) return undefined;
    let cancelled = false;
    fetchCruisePassengerActual(editData.id)
      .then(({ data }) => {
        if (cancelled) return;
        setValues(toFormValues(INPUT_FIELDS, data?.data));
        setHandlesFerry(savedFerryAnswer(data?.data));
        setRecord({ status: 'loaded' });
      })
      .catch((err) => {
        if (cancelled) return;
        setRecord({ status: 'failed' });
        notifyRef.current(CRUISE_PASSENGER_TOASTS.actualLoadFailed(getErrorMessage(err)));
      });
    return () => { cancelled = true; };
  }, [isUpdate, editData?.id, notifyRef]);

  // Add: look for a record of the chosen period, so Add never overwrites one entered earlier
  const lookupKey = !isUpdate && fiscalYear && month ? `${fiscalYear}|${month}` : null;
  const lookupDone = Boolean(lookupKey) && lookup.key === lookupKey;
  const existing = lookupDone ? lookup.row : null;

  useEffect(() => {
    if (!lookupKey) return undefined;
    let cancelled = false;
    const [fy, monthValue] = lookupKey.split('|');
    fetchCruisePassengerActuals({ fiscalYear: fy, month: monthValue, page: 1, limit: 1 })
      .then(({ data }) => {
        if (cancelled) return;
        const row = data?.data?.[0] || null;
        setLookup({ key: lookupKey, row });
        if (row) notifyRef.current(CRUISE_PASSENGER_TOASTS.periodExists(describePeriod(fy, monthValue)));
      })
      .catch(() => {
        // The server refuses a duplicate anyway; let the user carry on
        if (!cancelled) setLookup({ key: lookupKey, row: null });
      });
    return () => { cancelled = true; };
  }, [lookupKey, notifyRef]);

  const derived = computeDerived(values);
  const checking = Boolean(lookupKey) && !lookupDone;
  const ready = isUpdate ? record.status === 'loaded' : Boolean(lookupKey) && lookupDone && !existing;
  const inputsDisabled = submitting || (isUpdate ? record.status !== 'loaded' : Boolean(existing));

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setDirty(true);
  };

  const handleFerryChange = (answer) => {
    setHandlesFerry(answer);
    setDirty(true);
    // Ferry values no longer apply after "No"; clear their errors with them
    setErrors((prev) => ({
      ...prev,
      handlesFerry: undefined,
      ...(answer ? {} : { total_ferry_calls: undefined, total_ferry_passengers: undefined }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fields = activeFields(handlesFerry);
    const nextErrors = validateValues(fields, values);
    if (handlesFerry === null) nextErrors.handlesFerry = 'Answer Yes or No';
    if (!isUpdate && !fiscalYear) nextErrors.fiscalYear = 'Select the financial year';
    if (!isUpdate && !month) nextErrors.month = 'Select the month';
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify(CRUISE_PASSENGER_TOASTS.invalidValues());
      return;
    }

    const payload = { handlesPassengerFerry: handlesFerry, values: buildPayload(fields, values) };
    setSubmitting(true);
    try {
      if (isUpdate) await updateCruisePassengerActual(editData.id, payload);
      else await createCruisePassengerActual({ ...payload, fiscalYear, month: Number(month) });
      notify(CRUISE_PASSENGER_TOASTS.actualSaved(periodInfo, isUpdate));
      onSuccess?.();
    } catch (err) {
      notify(CRUISE_PASSENGER_TOASTS.actualSaveFailed(isUpdate, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (dirty) setConfirmLeave(true);
    else onBack?.();
  };

  const selectClass = (key) => `module-form-select cursor-pointer ${errors[key] ? '!border-rose-400' : ''}`;
  const errorText = (key) => (errors[key]
    ? <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1">{errors[key]}</p>
    : null);

  return (
    <div className="module-form-card animate-fade-in">
      <div className="module-form-banner">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-white/10 p-2">
            <Ship className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="module-form-banner-title">
              {isUpdate ? 'Update Cruise and Passenger Traffic' : 'Add Cruise and Passenger Traffic'}
            </h3>
            <p className="module-form-banner-subtext">KPI · Major Ports · Monthly cruise and passenger traffic</p>
          </div>
        </div>
        {organisationName ? (
          <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1.5 rounded-lg">
            {organisationName}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-5 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4">
          <div>
            <label htmlFor="cpt-fy" className="module-form-label">
              Financial Year <span className="text-red-500">*</span>
            </label>
            {isUpdate ? (
              <input id="cpt-fy" className="module-form-input" value={fiscalYear} disabled />
            ) : (
              <select
                id="cpt-fy"
                className={selectClass('fiscalYear')}
                value={fiscalYear}
                disabled={submitting}
                aria-invalid={Boolean(errors.fiscalYear)}
                onChange={(e) => {
                  setFiscalYear(e.target.value);
                  setMonth('');
                  setErrors((prev) => ({ ...prev, fiscalYear: undefined }));
                }}
              >
                <option value="">Select Financial Year</option>
                {FY_OPTIONS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            )}
            {errorText('fiscalYear')}
          </div>
          <div>
            <label htmlFor="cpt-month" className="module-form-label">
              Month <span className="text-red-500">*</span>
            </label>
            {isUpdate ? (
              <input id="cpt-month" className="module-form-input" value={periodInfo.monthLabel} disabled />
            ) : (
              <select
                id="cpt-month"
                className={selectClass('month')}
                value={month}
                disabled={!fiscalYear || submitting}
                aria-invalid={Boolean(errors.month)}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setErrors((prev) => ({ ...prev, month: undefined }));
                }}
              >
                <option value="">Select Month</option>
                {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
            {errorText('month')}
          </div>

          {checking && (
            <p className="md:col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking saved cruise and passenger traffic for this period…
            </p>
          )}
          {isUpdate && record.status === 'loading' && (
            <p className="md:col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the saved cruise and passenger traffic…
            </p>
          )}
          {existing && (
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                Cruise and passenger traffic for {periodInfo.monthLabel} {fiscalYear} has already been entered.
                {onOpenExisting
                  ? ' Open it to review or change the values.'
                  : ' You can view it under Actuals; you do not have permission to update it.'}
              </p>
              {onOpenExisting ? (
                <button
                  type="button"
                  onClick={() => onOpenExisting({ id: existing.id, fiscal_year: existing.fiscal_year, month: existing.month })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer whitespace-nowrap"
                >
                  Open for Update
                </button>
              ) : null}
            </div>
          )}
          {!isUpdate && !lookupKey && (
            <p className="md:col-span-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Info className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
              Select the financial year and month you are reporting for.
            </p>
          )}
        </div>

        <fieldset
          className="space-y-2"
          aria-invalid={Boolean(errors.handlesFerry)}
          aria-describedby={errors.handlesFerry ? 'cpt-ferry-error' : undefined}
        >
          <legend className="module-form-label">
            Do you handle passenger ferries? <span className="text-red-500">*</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {FERRY_CHOICES.map((choice) => (
              <label
                key={choice.label}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                  handlesFerry === choice.value
                    ? 'border-[#0f417a] bg-blue-50 text-[#0f417a] dark:bg-slate-800 dark:text-blue-200 dark:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                } ${errors.handlesFerry ? '!border-rose-400' : ''} ${inputsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="cpt-handles-ferry"
                  className="h-3.5 w-3.5 cursor-pointer"
                  checked={handlesFerry === choice.value}
                  disabled={inputsDisabled}
                  onChange={() => handleFerryChange(choice.value)}
                />
                {choice.label}
              </label>
            ))}
          </div>
          {errors.handlesFerry
            ? <p id="cpt-ferry-error" className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">{errors.handlesFerry}</p>
            : null}
        </fieldset>

        {ACTUAL_GROUPS.map((group) => {
          const ferryOff = group.ferry && handlesFerry !== true;
          return (
            <FinancialFieldGroup
              key={group.id}
              title={group.title}
              note={group.ferry
                ? (ferryOff ? 'Answer "Yes" to the ferry question above to enter ferry calls and passengers.' : null)
                : 'The total is calculated from the domestic and international values.'}
              fields={group.fields}
              values={ferryOff ? {} : values}
              derived={derived}
              errors={ferryOff ? {} : errors}
              onChange={handleChange}
              disabled={inputsDisabled || ferryOff}
              idPrefix="cpt"
              formatLabel={fieldLabel}
            />
          );
        })}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <small className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Fields marked with <span className="text-red-500">*</span> are mandatory
          </small>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Actuals
            </button>
            <button
              type="submit"
              disabled={!ready || submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? 'Saving…' : isUpdate ? 'Update Cruise Traffic' : 'Submit Cruise Traffic'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          onBack?.();
        }}
        title="Discard Unsaved Changes"
        confirmText="Discard"
        message="The values you entered have not been saved. Leave without saving them?"
      />
    </div>
  );
}
