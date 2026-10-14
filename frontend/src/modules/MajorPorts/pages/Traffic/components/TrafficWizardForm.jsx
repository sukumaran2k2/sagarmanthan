import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, Save, Ship } from 'lucide-react';
import {
  fetchCommoditiesByGroup,
  fetchCommodityData,
  submitCommodityData,
} from '../../../api';
import {
  buildFinancialYearOptions,
  FY_MONTHS,
  TRAFFIC_COMMODITY_GROUPS,
  TRAFFIC_WIZARD_STEPS,
} from '../trafficConstants';
import {
  applyCommodityDataToMap,
  buildCommodityPayloadForGroup,
  emptyValuesMap,
  hasExistingTrafficData,
  toNumberOrNull,
  validateCommodityStep,
  validatePeriodFields,
  validateRoroStep,
} from '../trafficUtils';
import {
  clearTrafficWizardDraft,
  loadTrafficWizardDraft,
  saveTrafficWizardDraft,
} from '../trafficDraft';
import CommodityGroupGrid from './CommodityGroupGrid';
import { getCurrentUserId, getSessionOrganisationId } from '../../../../../utils/authSession';

const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed';
const selectClass = `${inputClass} cursor-pointer`;
const errorTextClass = 'text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1';

export default function TrafficWizardForm({
  mode = 'add',
  record = null,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isUpdate = mode === 'update';
  const fyOptions = useMemo(() => buildFinancialYearOptions(8), []);
  const organisationId = record?.organisation_id || getSessionOrganisationId();
  const userId = getCurrentUserId();

  const [stepIndex, setStepIndex] = useState(0);
  const [fiscalYear, setFiscalYear] = useState(record?.fiscal_year || fyOptions[0] || '');
  const [month, setMonth] = useState(
    record?.month != null ? String(record.month) : ''
  );
  const [roRoTraffic, setRoRoTraffic] = useState('');
  const [roPaxTraffic, setRoPaxTraffic] = useState('');
  const [valuesMap, setValuesMap] = useState({});
  const [commoditiesByGroup, setCommoditiesByGroup] = useState({});
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [periodReady, setPeriodReady] = useState(false);
  const [existsForPeriod, setExistsForPeriod] = useState(false);
  // Set after first successful server save in add mode so the period can be continued
  const [periodClaimed, setPeriodClaimed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedStepIds, setSavedStepIds] = useState(() => new Set());
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [draftMeta, setDraftMeta] = useState(null);
  const draftRestoredRef = useRef(false);

  const notify = useCallback(
    (message, type = 'success') => {
      if (typeof triggerNotification === 'function') {
        triggerNotification(message, type);
      }
    },
    [triggerNotification]
  );

  const currentStep = TRAFFIC_WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === TRAFFIC_WIZARD_STEPS.length - 1;
  const periodLocked = isUpdate || (stepIndex > 0 && periodReady) || periodClaimed;
  const blocksAddBecauseExists = !isUpdate && existsForPeriod && !periodClaimed;

  useEffect(() => {
    let cancelled = false;
    async function loadMasters() {
      setLoadingMasters(true);
      try {
        const results = await Promise.all(
          TRAFFIC_COMMODITY_GROUPS.map(async (group) => {
            try {
              const res = await fetchCommoditiesByGroup(group.id);
              return [group.id, Array.isArray(res.data) ? res.data : []];
            } catch {
              return [group.id, []];
            }
          })
        );
        if (cancelled) return;
        const map = Object.fromEntries(results);
        setCommoditiesByGroup(map);
        const allCommodities = results.flatMap(([, list]) => list);
        setValuesMap(emptyValuesMap(allCommodities));
      } finally {
        if (!cancelled) setLoadingMasters(false);
      }
    }
    loadMasters();
    return () => {
      cancelled = true;
    };
  }, []);

  const allCommodities = useMemo(
    () => Object.values(commoditiesByGroup).flat(),
    [commoditiesByGroup]
  );

  useEffect(() => {
    if (isUpdate || loadingMasters || !allCommodities.length || draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    const draft = loadTrafficWizardDraft(organisationId);
    if (!draft?.formData) return;
    const data = draft.formData;
    setFiscalYear(data.fiscalYear || '');
    setMonth(data.month != null && data.month !== '' ? String(data.month) : '');
    setRoRoTraffic(data.roRoTraffic ?? '');
    setRoPaxTraffic(data.roPaxTraffic ?? '');
    setValuesMap(applyCommodityDataToMap(emptyValuesMap(allCommodities), []));
    if (data.valuesMap && typeof data.valuesMap === 'object') {
      setValuesMap((prev) => ({ ...prev, ...data.valuesMap }));
    }
    if (typeof data.stepIndex === 'number') {
      setStepIndex(Math.min(Math.max(0, data.stepIndex), TRAFFIC_WIZARD_STEPS.length - 1));
    }
    if (Array.isArray(data.savedStepIds)) {
      setSavedStepIds(new Set(data.savedStepIds));
    }
    if (data.periodClaimed) setPeriodClaimed(true);
    setDraftMeta(draft);
    notify('Local draft restored. Continue editing or discard.', 'info');
  }, [isUpdate, loadingMasters, allCommodities, organisationId, notify]);

  const loadPeriodData = useCallback(
    async ({ fy, monthValue, forUpdate }) => {
      if (!fy || !monthValue || !organisationId) return;
      setLoadingExisting(true);
      try {
        const res = await fetchCommodityData({
          fiscalYear: fy,
          month: monthValue,
          organisationId,
        });
        const data = res.data || {};
        const exists = hasExistingTrafficData(data);

        if (!forUpdate && exists && !periodClaimed) {
          setExistsForPeriod(true);
          setPeriodReady(false);
          setValuesMap(emptyValuesMap(allCommodities));
          setRoRoTraffic('');
          setRoPaxTraffic('');
          notify(
            'Data already exists for this Financial Year and Month. Use Update from the Data List.',
            'error'
          );
          return;
        }

        if (forUpdate && !exists) {
          setExistsForPeriod(false);
          setPeriodReady(true);
          notify('No existing data found for this period. You can still save new values.', 'info');
        } else {
          setExistsForPeriod(exists);
          setPeriodReady(true);
        }

        setValuesMap(applyCommodityDataToMap(emptyValuesMap(allCommodities), data.commodityData || []));
        setRoRoTraffic(
          data.trafficData?.ro_ro_traffic != null ? String(data.trafficData.ro_ro_traffic) : ''
        );
        setRoPaxTraffic(
          data.trafficData?.ro_pax_traffic != null ? String(data.trafficData.ro_pax_traffic) : ''
        );
      } catch (err) {
        console.error(err);
        notify('Failed to load traffic data for the selected period.', 'error');
        setPeriodReady(false);
      } finally {
        setLoadingExisting(false);
      }
    },
    [allCommodities, organisationId, notify, periodClaimed]
  );

  useEffect(() => {
    if (!isUpdate || loadingMasters || !allCommodities.length) return;
    if (!record?.fiscal_year || record?.month == null || !organisationId) return;
    loadPeriodData({
      fy: record.fiscal_year,
      monthValue: record.month,
      forUpdate: true,
    });
  }, [
    isUpdate,
    loadingMasters,
    allCommodities.length,
    record?.fiscal_year,
    record?.month,
    organisationId,
    loadPeriodData,
  ]);

  useEffect(() => {
    if (isUpdate || loadingMasters || !allCommodities.length) return;
    if (!fiscalYear || !month || !organisationId) {
      setPeriodReady(false);
      setExistsForPeriod(false);
      return;
    }
    if (periodClaimed) {
      setPeriodReady(true);
      return;
    }
    loadPeriodData({ fy: fiscalYear, monthValue: month, forUpdate: false });
  }, [
    isUpdate,
    loadingMasters,
    allCommodities.length,
    fiscalYear,
    month,
    organisationId,
    loadPeriodData,
    periodClaimed,
  ]);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleValueChange = (key, value) => {
    setValuesMap((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const canProceedFromPeriod = Boolean(
    fiscalYear && month && organisationId && !blocksAddBecauseExists
  );

  const activeGroupId = currentStep?.groupId;
  const activeCommodities = activeGroupId ? commoditiesByGroup[activeGroupId] || [] : [];

  const validateCurrentStep = (modeHint = 'page') => {
    const periodErrors = validatePeriodFields({ fiscalYear, month, organisationId });
    if (Object.keys(periodErrors).length) {
      setErrors(periodErrors);
      setFieldErrors({});
      notify('Please select Financial Year and Month first.', 'error');
      return false;
    }
    if (!userId) {
      notify('User session is invalid. Please sign in again.', 'error');
      return false;
    }
    if (blocksAddBecauseExists) {
      notify('This period already has data. Open Update from the Data List instead.', 'error');
      return false;
    }

    setErrors({});

    if (currentStep?.id === 'roro') {
      const stepErrors = validateRoroStep({ roRoTraffic, roPaxTraffic }, modeHint);
      setFieldErrors({});
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length) {
        notify(Object.values(stepErrors)[0], 'error');
        return false;
      }
      return true;
    }

    const { fieldErrors: nextFieldErrors, message } = validateCommodityStep(
      valuesMap,
      activeCommodities,
      modeHint
    );
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length || message) {
      notify(message || 'Fix highlighted invalid values before saving.', 'error');
      return false;
    }
    return true;
  };

  const buildStepPayload = (saveMode) => {
    const base = {
      fiscalYear,
      month: Number(month),
      organisationId,
      userId,
      saveMode,
    };
    if (currentStep?.id === 'roro') {
      return {
        ...base,
        trafficData: {
          ro_ro_traffic: toNumberOrNull(roRoTraffic),
          ro_pax_traffic: toNumberOrNull(roPaxTraffic),
        },
      };
    }
    return {
      ...base,
      commodityData: buildCommodityPayloadForGroup(valuesMap, activeCommodities),
    };
  };

  const markStepSaved = (stepId) => {
    setSavedStepIds((prev) => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  };

  const persistLocalDraft = (extra = {}) => {
    if (isUpdate) return null;
    const saved = saveTrafficWizardDraft({
      organisationId,
      fiscalYear,
      month,
      roRoTraffic,
      roPaxTraffic,
      valuesMap,
      stepIndex,
      savedStepIds: Array.from(savedStepIds),
      periodClaimed,
      ...extra,
    });
    setDraftMeta(saved);
    return saved;
  };

  const saveCurrentPage = async ({ saveMode = 'submit', advance = false, complete = false } = {}) => {
    const validationMode = saveMode === 'draft' ? 'draft' : 'page';
    if (!validateCurrentStep(validationMode)) return false;

    setSubmitting(true);
    try {
      const payload = buildStepPayload(saveMode);
      const res = await submitCommodityData(payload);
      if (!res.data?.success) {
        notify(res.data?.message || 'Failed to save traffic data.', 'error');
        return false;
      }

      markStepSaved(currentStep.id);
      setPeriodClaimed(true);
      setPeriodReady(true);
      setExistsForPeriod(true);

      if (!isUpdate) {
        persistLocalDraft({
          periodClaimed: true,
          savedStepIds: Array.from(new Set([...savedStepIds, currentStep.id])),
          stepIndex: advance && !isLastStep ? stepIndex + 1 : stepIndex,
        });
      }

      if (complete) {
        if (!isUpdate) clearTrafficWizardDraft();
        setDraftMeta(null);
        notify(
          isUpdate ? 'Traffic data updated successfully.' : 'Traffic data saved successfully.',
          'success'
        );
        onSuccess?.();
        return true;
      }

      notify(
        saveMode === 'draft'
          ? `${currentStep.label} saved as draft.`
          : `${currentStep.label} saved successfully.`,
        'success'
      );

      if (advance && !isLastStep) {
        setStepIndex((i) => Math.min(i + 1, TRAFFIC_WIZARD_STEPS.length - 1));
      }
      return true;
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to save traffic data.', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = async () => {
    if (stepIndex === 0 && !canProceedFromPeriod && !isUpdate) {
      if (blocksAddBecauseExists) {
        notify('This period already has data. Open Update from the Data List instead.', 'error');
      } else {
        notify('Please select Financial Year and Month first.', 'error');
      }
      return;
    }
    if (stepIndex === 0 && isUpdate && !periodReady && loadingExisting) return;

    // Next allows empty pages; only block on invalid format
    if (currentStep?.id === 'roro') {
      const stepErrors = validateRoroStep({ roRoTraffic, roPaxTraffic }, 'draft');
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        notify(Object.values(stepErrors)[0], 'error');
        return;
      }
      setErrors({});
    } else {
      const { fieldErrors: nextFieldErrors, message } = validateCommodityStep(
        valuesMap,
        activeCommodities,
        'draft'
      );
      if (Object.keys(nextFieldErrors).length) {
        setFieldErrors(nextFieldErrors);
        notify(message || 'Fix highlighted invalid values before continuing.', 'error');
        return;
      }
      setFieldErrors({});
    }

    setStepIndex((i) => Math.min(i + 1, TRAFFIC_WIZARD_STEPS.length - 1));
  };

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSavePage = () => saveCurrentPage({ saveMode: 'submit', advance: false });

  const handleSaveAndNext = () => saveCurrentPage({ saveMode: 'submit', advance: true });

  const handleComplete = () => saveCurrentPage({ saveMode: 'submit', complete: true });

  const currentPageHasValues = () => {
    if (currentStep?.id === 'roro') {
      return (
        String(roRoTraffic ?? '').trim() !== '' || String(roPaxTraffic ?? '').trim() !== ''
      );
    }
    return activeCommodities.some((c) =>
      Object.keys(valuesMap).some((key) => {
        if (!key.startsWith(`${c.commodity_id}_`)) return false;
        return String(valuesMap[key] ?? '').trim() !== '';
      })
    );
  };

  const handleSaveDraft = async () => {
    const periodErrors = validatePeriodFields({ fiscalYear, month, organisationId });
    if (Object.keys(periodErrors).length) {
      setErrors(periodErrors);
      notify('Select Financial Year and Month before saving a draft.', 'error');
      return;
    }
    if (!validateCurrentStep('draft')) return;

    setSavingDraft(true);
    try {
      const hasValues = currentPageHasValues();

      // Skip server save if page is empty — keep draft local only
      if (hasValues) {
        const payload = buildStepPayload('draft');
        const res = await submitCommodityData(payload);
        if (!res.data?.success) {
          notify(res.data?.message || 'Unable to save draft.', 'error');
          return;
        }
        markStepSaved(currentStep.id);
        setPeriodClaimed(true);
        setPeriodReady(true);
      }

      if (!isUpdate) {
        const saved = persistLocalDraft({
          periodClaimed: periodClaimed || hasValues,
          savedStepIds: hasValues
            ? Array.from(new Set([...savedStepIds, currentStep.id]))
            : Array.from(savedStepIds),
        });
        setDraftMeta(saved);
      }

      notify(
        hasValues
          ? 'Draft saved. You can leave and resume later.'
          : 'Local draft saved (page still empty). Fill values then Save Page when ready.',
        'success'
      );
    } catch (err) {
      console.error(err);
      if (!isUpdate) {
        try {
          const saved = persistLocalDraft();
          setDraftMeta(saved);
          notify('Server draft failed; saved locally instead. Resume on this browser.', 'warning');
        } catch {
          notify('Unable to save draft. Please try again.', 'error');
        }
      } else {
        notify(err.response?.data?.message || 'Unable to save draft.', 'error');
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    clearTrafficWizardDraft();
    setDraftMeta(null);
    setPeriodClaimed(false);
    setSavedStepIds(new Set());
    setStepIndex(0);
    setRoRoTraffic('');
    setRoPaxTraffic('');
    setValuesMap(emptyValuesMap(allCommodities));
    setErrors({});
    setFieldErrors({});
    notify('Local draft discarded.', 'success');
  };

  const draftSavedLabel = draftMeta?.savedAt
    ? new Date(draftMeta.savedAt).toLocaleString()
    : null;

  const stepBadge = (stepId) => (savedStepIds.has(stepId) ? '✓' : null);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-white/10 p-2">
            <Ship className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wider font-display">
              {isUpdate ? 'Update Traffic Data' : 'Add Traffic Data'}
            </h3>
            <p className="text-[10px] text-blue-100 font-semibold tracking-wide mt-0.5">
              KPI · Major Ports · Save each page independently · Draft supported
            </p>
          </div>
        </div>
        {record?.organisation_name ? (
          <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1.5 rounded-lg">
            {record.organisation_name}
          </span>
        ) : null}
      </div>

      {!isUpdate && draftMeta ? (
        <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
            Local draft available{draftSavedLabel ? ` (saved ${draftSavedLabel})` : ''}. Continue
            editing, or discard to start fresh.
          </p>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-xs font-bold text-amber-900 dark:text-amber-100 underline cursor-pointer"
          >
            Discard draft
          </button>
        </div>
      ) : null}

      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 px-3 py-3 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TRAFFIC_WIZARD_STEPS.map((step, index) => {
            const active = index === stepIndex;
            const done = index < stepIndex || savedStepIds.has(step.id);
            const savedMark = stepBadge(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (index === 0 || periodReady || isUpdate || periodClaimed) setStepIndex(index);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition cursor-pointer ${
                  active
                    ? 'bg-[#0f417a] text-white shadow-md'
                    : done
                      ? 'bg-blue-50 text-[#0f417a] dark:bg-slate-800 dark:text-blue-300'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    active ? 'bg-white text-[#0f417a]' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  {savedMark || index + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4">
          <div className="space-y-1.5">
            <label className={labelClass}>
              Financial Year <span className="text-red-500">*</span>
            </label>
            <select
              className={`${selectClass} ${errors.fiscalYear ? 'border-rose-400' : ''}`}
              value={fiscalYear}
              disabled={periodLocked || loadingExisting}
              onChange={(e) => {
                setFiscalYear(e.target.value);
                setErrors((prev) => ({ ...prev, fiscalYear: undefined }));
                setPeriodClaimed(false);
                setSavedStepIds(new Set());
              }}
            >
              <option value="">Select Financial Year</option>
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
            {errors.fiscalYear ? <p className={errorTextClass}>{errors.fiscalYear}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>
              Month <span className="text-red-500">*</span>
            </label>
            <select
              className={`${selectClass} ${errors.month ? 'border-rose-400' : ''}`}
              value={month}
              disabled={periodLocked || loadingExisting}
              onChange={(e) => {
                setMonth(e.target.value);
                setErrors((prev) => ({ ...prev, month: undefined }));
                setPeriodClaimed(false);
                setSavedStepIds(new Set());
              }}
            >
              <option value="">Select Month</option>
              {FY_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            {errors.month ? <p className={errorTextClass}>{errors.month}</p> : null}
          </div>
          {blocksAddBecauseExists ? (
            <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
              Data already exists for this period. Switch to the Data List and use{' '}
              <strong>Update</strong> instead of Add.
            </div>
          ) : null}
          {loadingExisting ? (
            <div className="md:col-span-2 text-xs font-semibold text-slate-500">
              Checking existing data for the selected period…
            </div>
          ) : null}
          {periodClaimed || (isUpdate && periodReady) ? (
            <div className="md:col-span-2 text-[11px] font-semibold text-slate-500">
              Tip: use <strong>Save Page</strong> on each step. Unsaved steps stay editable until you
              save them.
            </div>
          ) : null}
        </div>

        {currentStep?.id === 'roro' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <h4 className="text-[13px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
                Ro-Ro Traffic
              </h4>
              <div className="space-y-1.5">
                <label className={labelClass}>Total Ro-Ro Traffic (000 Tonnes)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={`${inputClass} ${errors.roRoTraffic ? 'border-rose-400' : ''}`}
                  value={roRoTraffic}
                  disabled={loadingMasters || loadingExisting || (!isUpdate && !periodReady && !periodClaimed)}
                  onChange={(e) => {
                    setRoRoTraffic(e.target.value);
                    setErrors((prev) => ({ ...prev, roRoTraffic: undefined }));
                  }}
                  placeholder="e.g. 12.50"
                />
                {errors.roRoTraffic ? <p className={errorTextClass}>{errors.roRoTraffic}</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <h4 className="text-[13px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
                Ro-Pax Traffic
              </h4>
              <div className="space-y-1.5">
                <label className={labelClass}>Total Ro-Pax Traffic (000 Tonnes / Number)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={`${inputClass} ${errors.roPaxTraffic ? 'border-rose-400' : ''}`}
                  value={roPaxTraffic}
                  disabled={loadingMasters || loadingExisting || (!isUpdate && !periodReady && !periodClaimed)}
                  onChange={(e) => {
                    setRoPaxTraffic(e.target.value);
                    setErrors((prev) => ({ ...prev, roPaxTraffic: undefined }));
                  }}
                  placeholder="e.g. 3.25"
                />
                {errors.roPaxTraffic ? <p className={errorTextClass}>{errors.roPaxTraffic}</p> : null}
              </div>
            </div>
          </div>
        ) : (
          <CommodityGroupGrid
            title={currentStep.label}
            commodities={activeCommodities}
            valuesMap={valuesMap}
            onChange={handleValueChange}
            disabled={(!periodReady && !isUpdate && !periodClaimed) || loadingMasters || loadingExisting}
            loading={loadingMasters}
            fieldErrors={fieldErrors}
          />
        )}

        <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-[11px] text-slate-500 font-semibold">
            Step {stepIndex + 1} of {TRAFFIC_WIZARD_STEPS.length}
            {savedStepIds.has(currentStep?.id) ? ' · This page is saved' : ' · This page not saved yet'}
            {!isUpdate ? ' · Add creates / extends a period entry' : ' · Update saves changes to this period'}
          </p>
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Discard
                </button>
              ) : null}
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={
                  submitting ||
                  savingDraft ||
                  blocksAddBecauseExists ||
                  !organisationId ||
                  (!periodReady && !isUpdate && !fiscalYear)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#0f417a]/40 text-[#0f417a] rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                {savingDraft ? 'Saving Draft…' : 'Save as Draft'}
              </button>

              <button
                type="button"
                onClick={handleSavePage}
                disabled={
                  submitting ||
                  savingDraft ||
                  blocksAddBecauseExists ||
                  !organisationId ||
                  (!isUpdate && !canProceedFromPeriod && !periodClaimed)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[#0f417a] text-[#0f417a] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {submitting ? 'Saving…' : 'Save Page'}
              </button>

              {!isLastStep ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    disabled={
                      submitting ||
                      savingDraft ||
                      blocksAddBecauseExists ||
                      !organisationId ||
                      (!isUpdate && !canProceedFromPeriod && !periodClaimed)
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0f417a]/90 hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    Save &amp; Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={stepIndex === 0 && !isUpdate && !canProceedFromPeriod && !periodClaimed}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={
                    submitting ||
                    savingDraft ||
                    blocksAddBecauseExists ||
                    !organisationId ||
                    (!isUpdate && !canProceedFromPeriod && !periodClaimed)
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? 'Saving…' : 'Save & Finish'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
