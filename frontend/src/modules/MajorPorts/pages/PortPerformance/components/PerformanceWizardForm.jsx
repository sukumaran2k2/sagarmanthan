import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Gauge, Info, Loader2, Lock, Save } from 'lucide-react';
import ConfirmModal from '../../../../../components/ConfirmModal';
import {
  fetchPortPerformanceEntryStatus,
  fetchPortPerformancePeriod,
  savePortPerformancePeriod,
} from '../../../api';
import { useNotifier, getErrorMessage } from '../../../../../utils/notify';
import { PORT_PERFORMANCE_TOASTS } from '../../../toastMessages';
import { ENTRY_WINDOW_LAST_DAY, currentFinancialYear } from '../../Traffic/trafficConstants';
import { describePeriod } from '../../Traffic/trafficFormat';
import { useLatestRef } from '../../Traffic/usePagedList';
import { useEntryOptions } from '../../Traffic/useEntryOptions';
import {
  PORT_PERFORMANCE_SECTIONS,
  buildSectionPayload,
  toFormValues,
  validateSection,
} from '../portPerformanceConfig';
import StepFieldGroup from './StepFieldGroup';

const STEPS = PORT_PERFORMANCE_SECTIONS;
const EMPTY_VALUES = toFormValues();

/**
 * Monthly port performance entry for the signed-in organisation: the earlier portal's
 * 14 tabs as steps. Each step is saved on its own and needs every value (enter 0 where
 * nothing applies); the server decides create vs update and checks the entry window.
 *
 * editData: { fiscal_year, month } when opened from Actuals, else null.
 */
export default function PerformanceWizardForm({
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

  const [entryStatus, setEntryStatus] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(editData?.fiscal_year || '');
  const [month, setMonth] = useState(editData?.month != null ? String(editData.month) : '');
  // Result of the last period lookup; it only counts while it matches the selected period
  const [loadedPeriod, setLoadedPeriod] = useState({ key: null, failed: false, exists: false, entryOpen: false });
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [savedSteps, setSavedSteps] = useState(() => new Set());
  const [dirtySteps, setDirtySteps] = useState(() => new Set());
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const periodInfo = describePeriod(fiscalYear, month);
  const periodKey = fiscalYear && month ? `${fiscalYear}|${month}` : null;
  const periodMatches = Boolean(periodKey) && loadedPeriod.key === periodKey;
  const period = {
    loading: Boolean(periodKey) && !periodMatches,
    loaded: periodMatches && !loadedPeriod.failed,
    exists: periodMatches && loadedPeriod.exists,
    entryOpen: periodMatches && loadedPeriod.entryOpen,
  };
  const hasSavedThisSession = savedSteps.size > 0 && !isUpdate;
  // An existing period is only edited through Update, so Add never overwrites it by accident
  const blockedAsExisting = !isUpdate && period.exists && !hasSavedThisSession;
  // canBrowse: steps can be viewed (also read-only when locked); ready: values can be changed and saved
  const canBrowse = period.loaded && !blockedAsExisting;
  const ready = canBrowse && period.entryOpen;

  // Entry window + ministry unlocks decide which periods Add may offer
  useEffect(() => {
    if (isUpdate) return undefined;
    let cancelled = false;
    fetchPortPerformanceEntryStatus()
      .then((res) => {
        if (cancelled) return;
        setEntryStatus(res.data);
        if (res.data?.windowOpen) setFiscalYear((fy) => fy || currentFinancialYear());
      })
      .catch((err) => {
        if (!cancelled) notifyRef.current(PORT_PERFORMANCE_TOASTS.periodLoadFailed(getErrorMessage(err)));
      });
    return () => {
      cancelled = true;
    };
  }, [isUpdate, notifyRef]);

  const { fyOptions, monthOptions } = useEntryOptions(entryStatus, fiscalYear);

  // Load what is already saved for the chosen period. Runs once per period: the
  // period is fixed after the first save, so saving never reloads over unsaved steps.
  useEffect(() => {
    if (!periodKey) return undefined;
    let cancelled = false;
    const [fy, monthValue] = periodKey.split('|');
    fetchPortPerformancePeriod({ fiscalYear: fy, month: monthValue })
      .then(({ data }) => {
        if (cancelled) return;
        setValues(toFormValues(data.values));
        setSavedSteps(isUpdate ? new Set(data.savedSections || []) : new Set());
        setDirtySteps(new Set());
        setFieldErrors({});
        setLoadedPeriod({
          key: periodKey,
          failed: false,
          exists: Boolean(data.exists),
          entryOpen: Boolean(data.entryAccess?.open),
        });
        // Add never overwrites a period entered earlier; say so straight away
        if (!isUpdate && data.exists) {
          notifyRef.current(PORT_PERFORMANCE_TOASTS.periodExists(describePeriod(fy, monthValue)));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadedPeriod({ key: periodKey, failed: true, exists: false, entryOpen: false });
        notifyRef.current(PORT_PERFORMANCE_TOASTS.periodLoadFailed(getErrorMessage(err)));
      });
    return () => {
      cancelled = true;
    };
  }, [periodKey, isUpdate, notifyRef]);

  const handleValueChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDirtySteps((prev) => (prev.has(currentStep.id) ? prev : new Set(prev).add(currentStep.id)));
  };

  /** Validates one step and shows its errors; returns { ok, formatErrors, missing }. */
  const validateStep = (step, { requireAll }) => {
    const result = validateSection(step, values, { requireAll });
    setFieldErrors(result.fieldErrors);
    const formatErrors = Object.values(result.fieldErrors).some((e) => e !== 'Required');
    return { ok: !Object.keys(result.fieldErrors).length, formatErrors, missing: result.missing };
  };

  /** Toast for a failed check: format problems first, then empty cells. */
  const notifyInvalid = (step, check) => notify(check.formatErrors
    ? PORT_PERFORMANCE_TOASTS.invalidValues()
    : PORT_PERFORMANCE_TOASTS.stepIncomplete(step.label, check.missing));

  /** Saves one step; returns the server action ('create' | 'update') or null on failure. */
  const saveStep = async (step) => {
    try {
      const res = await savePortPerformancePeriod({
        fiscalYear,
        month: Number(month),
        section: step.id,
        values: buildSectionPayload(step, values),
      });
      setSavedSteps((prev) => new Set(prev).add(step.id));
      setDirtySteps((prev) => {
        const next = new Set(prev);
        next.delete(step.id);
        return next;
      });
      return res.data?.action || 'create';
    } catch (err) {
      notify(PORT_PERFORMANCE_TOASTS.saveFailed(step.label, getErrorMessage(err)));
      return null;
    }
  };

  const handleSaveStep = async () => {
    const check = validateStep(currentStep, { requireAll: true });
    if (!check.ok) return notifyInvalid(currentStep, check);

    setSubmitting(true);
    const action = await saveStep(currentStep);
    setSubmitting(false);
    if (action) notify(PORT_PERFORMANCE_TOASTS.stepSaved(currentStep.label, periodInfo, action === 'update'));
    return undefined;
  };

  // Saves this step when it has changes, then opens the next one (unchanged steps just move on)
  const handleSaveAndNext = async () => {
    if (dirtySteps.has(currentStep.id)) {
      const check = validateStep(currentStep, { requireAll: true });
      if (!check.ok) return notifyInvalid(currentStep, check);
      setSubmitting(true);
      const action = await saveStep(currentStep);
      setSubmitting(false);
      if (!action) return undefined;
      notify(PORT_PERFORMANCE_TOASTS.stepSaved(currentStep.label, periodInfo, action === 'update'));
    }
    setFieldErrors({});
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
    return undefined;
  };

  // Last step: saves every step with unsaved changes, then returns to the list
  const handleFinish = async () => {
    const pending = STEPS.filter((s) => dirtySteps.has(s.id));
    for (const step of pending) {
      const check = validateStep(step, { requireAll: true });
      if (!check.ok) {
        setStepIndex(STEPS.indexOf(step));
        return notifyInvalid(step, check);
      }
    }
    if (!pending.length) {
      // Nothing changed: a new period needs at least one saved step, a reviewed one just closes
      if (!savedSteps.size) return notify(PORT_PERFORMANCE_TOASTS.nothingSaved());
      onSuccess?.();
      return undefined;
    }

    setSubmitting(true);
    let anyUpdate = isUpdate;
    for (const step of pending) {
      const action = await saveStep(step);
      if (!action) {
        setStepIndex(STEPS.indexOf(step));
        setSubmitting(false);
        return undefined;
      }
      anyUpdate = anyUpdate || action === 'update';
    }
    setSubmitting(false);
    notify(PORT_PERFORMANCE_TOASTS.periodCompleted(periodInfo, anyUpdate));
    onSuccess?.();
    return undefined;
  };

  // Moving between steps keeps unsaved values; only the number format is checked
  const goToStep = (index) => {
    const check = validateStep(currentStep, { requireAll: false });
    if (!check.ok) return notify(PORT_PERFORMANCE_TOASTS.invalidValues());
    setFieldErrors({});
    setStepIndex(index);
    return undefined;
  };

  const handleCancel = () => {
    if (dirtySteps.size) setConfirmLeave(true);
    else onBack?.();
  };

  const periodLocked = isUpdate || hasSavedThisSession;
  const inputsDisabled = !ready || submitting || period.loading;
  const entryClosed = entryStatus && !entryStatus.windowOpen && !fyOptions.length;

  return (
    <div className="module-form-card animate-fade-in">
      <div className="module-form-banner">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-white/10 p-2">
            <Gauge className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="module-form-banner-title">{isUpdate ? 'Update Port Performance' : 'Add Port Performance'}</h3>
            <p className="module-form-banner-subtext">KPI · Major Ports · Each step is saved on its own</p>
          </div>
        </div>
        {organisationName ? (
          <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1.5 rounded-lg">
            {organisationName}
          </span>
        ) : null}
      </div>

      <nav aria-label="Port performance entry steps" className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 px-3 py-3 overflow-x-auto">
        <ol className="flex items-center gap-1 min-w-max">
          {STEPS.map((step, index) => {
            const active = index === stepIndex;
            const dirty = dirtySteps.has(step.id);
            const saved = savedSteps.has(step.id) && !dirty;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={!canBrowse || submitting}
                  aria-current={active ? 'step' : undefined}
                  title={step.label}
                  onClick={() => goToStep(index)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? 'bg-[#0f417a] text-white shadow-md dark:bg-blue-600'
                      : saved
                        ? 'bg-blue-50 text-[#0f417a] dark:bg-slate-800 dark:text-blue-300'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    active ? 'bg-white text-[#0f417a]' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {saved ? <CheckCircle2 className="h-3.5 w-3.5" aria-label="saved" /> : index + 1}
                  </span>
                  {step.short}
                  {dirty ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="unsaved changes" /> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="p-5 md:p-6 space-y-5">
        {!isUpdate && entryStatus && (
          <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            entryStatus.windowOpen
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
          }`}>
            {entryStatus.windowOpen
              ? `Data entry is open until the ${ENTRY_WINDOW_LAST_DAY}th of this month.`
              : entryClosed
                ? `Data entry closed on the ${ENTRY_WINDOW_LAST_DAY}th of this month. Ask the Ministry to unlock the period you need to enter.`
                : 'The monthly entry window has closed. Only the periods unlocked by the Ministry are listed below.'}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4">
          <div>
            <label htmlFor="pp-fy" className="module-form-label">
              Financial Year <span className="text-red-500">*</span>
            </label>
            {periodLocked ? (
              <input id="pp-fy" className="module-form-input" value={fiscalYear} disabled />
            ) : (
              <select
                id="pp-fy"
                className="module-form-select cursor-pointer"
                value={fiscalYear}
                disabled={!entryStatus || entryClosed || submitting}
                onChange={(e) => {
                  setFiscalYear(e.target.value);
                  setMonth('');
                }}
              >
                <option value="">Select Financial Year</option>
                {fyOptions.map((fy) => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="pp-month" className="module-form-label">
              Month <span className="text-red-500">*</span>
            </label>
            {periodLocked ? (
              <input id="pp-month" className="module-form-input" value={periodInfo.monthLabel} disabled />
            ) : (
              <select
                id="pp-month"
                className="module-form-select cursor-pointer"
                value={month}
                disabled={!fiscalYear || submitting}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">Select Month</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            )}
          </div>

          {period.loading && (
            <p className="md:col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking saved port performance for this period…
            </p>
          )}
          {blockedAsExisting && !period.loading && (
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                Port performance for {periodInfo.monthLabel} {fiscalYear} has already been entered.
                {onOpenExisting
                  ? ' Open it to review or change the values.'
                  : ' You can view it under Actuals; you do not have permission to update it.'}
              </p>
              {onOpenExisting ? (
                <button
                  type="button"
                  onClick={() => onOpenExisting({ fiscal_year: fiscalYear, month: Number(month) })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer whitespace-nowrap"
                >
                  Open for Update
                </button>
              ) : null}
            </div>
          )}
          {period.loaded && !period.entryOpen && !blockedAsExisting && (
            <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <Lock className="h-4 w-4 flex-shrink-0" />
              Changes for {periodInfo.monthLabel} {fiscalYear} are closed. The values are shown read-only; ask the Ministry to unlock this period to edit them.
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
              {currentStep.label}
            </h3>
            <p className="flex items-start gap-1.5 mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Info className="h-3.5 w-3.5 mt-px text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
              <span>{currentStep.definition}</span>
            </p>
          </div>
          {currentStep.groups.map((g) => (
            <StepFieldGroup
              key={g.title}
              group={g}
              values={values}
              fieldErrors={fieldErrors}
              onChange={handleValueChange}
              disabled={inputsDisabled}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            Step {stepIndex + 1} of {STEPS.length}
            {dirtySteps.has(currentStep.id)
              ? ' · This step has unsaved changes'
              : savedSteps.has(currentStep.id) ? ' · This step is saved' : ' · This step is not saved yet'}
            {` · ${savedSteps.size} of ${STEPS.length} steps saved`}
            {dirtySteps.size ? ` · ${dirtySteps.size} step${dirtySteps.size === 1 ? '' : 's'} to save` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(stepIndex - 1)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={handleSaveStep}
                disabled={!ready || submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[#0f417a] text-[#0f417a] dark:border-blue-400 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                Save Step
              </button>
              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={!ready || submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'Saving…' : 'Save & Submit'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  disabled={!ready || submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? 'Saving…' : 'Save & Next'}
                  {submitting ? null : <ArrowRight className="h-4 w-4" />}
                </button>
              )}
            </div>
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
        message={`${dirtySteps.size} step${dirtySteps.size === 1 ? ' has' : 's have'} unsaved changes. Leave without saving them?`}
      />
    </div>
  );
}
