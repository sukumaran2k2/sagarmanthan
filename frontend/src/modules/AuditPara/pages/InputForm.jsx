import { useState } from 'react';
import { Save } from 'lucide-react';
import { createAuditPara, updateAuditPara } from '../api';
import { getCurrentUserId } from '../../../utils/authSession';
import { CATEGORIES } from '../constants';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { AUDIT_PARA_TOASTS } from '../toastMessages';

const stageLabels = {
  1: '1. Received at Ministry',
  2: '2. Comments Sought from Organisation',
  3: '3. Comments Received from organisation',
  4: '4. Under Clarification',
  5: '5. Comments Furnished to CAG',
  6: '6. Accepted by CAG',
  7: '7. Dropped',
};

// Stage 4 has no date column in the schema -- it's a checkbox-only step in the sequence.
const DATED_STAGES = [1, 2, 3, 5, 6, 7];

export default function InputForm({
  editData = null,
  wings = [],
  divisions = [],
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isEdit = !!editData;
  const notify = useNotifier(triggerNotification);
  const [submitting, setSubmitting] = useState(false);

  const [formNumber, setFormNumber] = useState(editData?.paraNumber || '');
  const [formSubject, setFormSubject] = useState(editData?.subject || '');
  const [formWing, setFormWing] = useState(editData?.wing || '');
  const [formDivision, setFormDivision] = useState(editData?.division || '');
  // Until the user picks one, the first option is selected; wings / divisions can still be
  // loading when the form opens, so this is resolved on each render rather than once
  const wingValue = formWing || wings[0]?.wing_name || '';
  const divisionValue = formDivision || divisions[0]?.division_name || '';
  const [formCategory, setFormCategory] = useState(editData?.category || 'Audit Para');
  const [formRemarks, setFormRemarks] = useState(editData?.remarks || '');

  const [focusedStage, setFocusedStage] = useState(null);
  const [touched, setTouched] = useState({});

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isFieldInvalid = (field, val) => {
    return touched[field] && (!val || !String(val).trim());
  };

  const [stages, setStages] = useState(() => {
    const init = {};
    for (let i = 1; i <= 7; i++) {
      init[i] = {
        date: editData?.statusDates?.[i] || '',
        remark: '',
        checked: editData?.statusSteps?.[i] === 'Yes',
      };
    }
    return init;
  });

  const getDateLimits = (stageNum) => {
    let min, max;
    const prevDated = [...DATED_STAGES].reverse().find((s) => s < stageNum && stages[s]?.date);
    if (prevDated) min = stages[prevDated].date;
    const nextDated = DATED_STAGES.find((s) => s > stageNum && stages[s]?.date);
    if (nextDated) max = stages[nextDated].date;
    return { min, max };
  };

  const handleStageDateChange = (stageNum, val) => {
    setStages((prev) => ({
      ...prev,
      [stageNum]: { ...prev[stageNum], date: val, checked: !!val },
    }));
  };

  const handleStageRemarkChange = (stageNum, val) => {
    setStages((prev) => ({ ...prev, [stageNum]: { ...prev[stageNum], remark: val } }));
  };

  const handleStage4Toggle = (checked) => {
    setStages((prev) => ({ ...prev, 4: { ...prev[4], checked } }));
  };

  const isStageReached = (stageNum) => {
    const s = stages[stageNum];
    return DATED_STAGES.includes(stageNum) ? !!s.date : !!s.checked;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ formNumber: true, formSubject: true, formWing: true, formDivision: true });

    if (!formNumber.trim() || !formSubject.trim() || !wingValue || !divisionValue) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }

    const combinedRemarks = [formRemarks, ...Object.values(stages).map((s) => s.remark).filter(Boolean)].join(' ');
    const wordCount = combinedRemarks.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 250) {
      notify(AUDIT_PARA_TOASTS.remarksTooLong());
      return;
    }

    const wingObj = wings.find((w) => w.wing_name === wingValue) || {};
    const divisionObj = divisions.find((d) => d.division_name === divisionValue) || {};

    let selectedStage = 1;
    for (let i = 1; i <= 7; i++) {
      if (isStageReached(i)) selectedStage = i;
    }

    const payload = {
      auditParaNumber: formNumber,
      subject: formSubject,
      wing: wingObj.wing_id,
      division: divisionObj.division_id,
      category: formCategory,
      yetSentForComment: isStageReached(1) ? 'Yes' : 'No',
      yetSentForCommentDate: stages[1].date || '',
      commentSoughtOrg: isStageReached(2) ? 'Yes' : 'No',
      commentSoughtOrgDate: stages[2].date || '',
      commentReceived: isStageReached(3) ? 'Yes' : 'No',
      commentReceivedDate: stages[3].date || '',
      underClarification: isStageReached(4) ? 'Yes' : 'No',
      commentFurnished: isStageReached(5) ? 'Yes' : 'No',
      commentFurnishedDate: stages[5].date || '',
      cagAccepted: isStageReached(6) ? 'Yes' : 'No',
      cagAcceptedDate: stages[6].date || '',
      disposed: isStageReached(7) ? 'Yes' : 'No',
      disposedDate: stages[7].date || '',
      remarks: formRemarks,
      userID: getCurrentUserId(),
      selectedStage,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        payload.auditParaID = editData.id;
        await updateAuditPara(payload);
        notify(AUDIT_PARA_TOASTS.updated(formNumber.trim()));
      } else {
        await createAuditPara(payload);
        notify(AUDIT_PARA_TOASTS.created(formNumber.trim()));
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Audit Para:', err);
      notify(AUDIT_PARA_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="module-form-card overflow-hidden animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            {isEdit ? 'Update Audit Para Entry' : 'Register New Audit Para'}
          </h3>
          <p className="module-form-banner-subtext">Ministry of Ports, Shipping and Waterways</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-1.5">
              <label className="module-form-label">Para Number <span className="text-red-500">*</span></label>
              <input
                type="text" value={formNumber} onChange={(e) => setFormNumber(e.target.value)}
                onBlur={() => handleBlur('formNumber')}
                placeholder="e.g. 5.1" required
                className={`module-form-input${isFieldInvalid('formNumber', formNumber) ? ' !border-red-500' : ''}`}
              />
              {isFieldInvalid('formNumber', formNumber) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="module-form-label">Subject <span className="text-red-500">*</span></label>
              <input
                type="text" value={formSubject} onChange={(e) => setFormSubject(e.target.value)}
                onBlur={() => handleBlur('formSubject')}
                placeholder="Audit subject description..." required
                className={`module-form-input${isFieldInvalid('formSubject', formSubject) ? ' !border-red-500' : ''}`}
              />
              {isFieldInvalid('formSubject', formSubject) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="module-form-label">Wing <span className="text-red-500">*</span></label>
              <select
                value={wingValue} onChange={(e) => setFormWing(e.target.value)}
                onBlur={() => handleBlur('formWing')} required
                className={`module-form-select cursor-pointer${isFieldInvalid('formWing', wingValue) ? ' !border-red-500' : ''}`}
              >
                {wings.map((w) => <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>)}
              </select>
              {isFieldInvalid('formWing', wingValue) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="module-form-label">Division <span className="text-red-500">*</span></label>
              <select
                value={divisionValue} onChange={(e) => setFormDivision(e.target.value)}
                onBlur={() => handleBlur('formDivision')} required
                className={`module-form-select cursor-pointer${isFieldInvalid('formDivision', divisionValue) ? ' !border-red-500' : ''}`}
              >
                {divisions.map((d) => <option key={d.division_id} value={d.division_name}>{d.division_name}</option>)}
              </select>
              {isFieldInvalid('formDivision', divisionValue) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="module-form-label">Category <span className="text-red-500">*</span></label>
              <select
                value={formCategory} onChange={(e) => setFormCategory(e.target.value)} required
                className="module-form-select cursor-pointer"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="module-form-label">General Remarks (Max 250 words)</label>
              <textarea
                value={formRemarks} onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Enter remarks..." rows={4}
                className="module-form-input !font-medium"
              />
            </div>
          </div>

          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950 max-h-[560px]">
            <h4 className="module-form-section-title pb-2 border-b border-slate-200 dark:border-slate-800">
              Stages Checklist & Dates
            </h4>
            <div className="space-y-3.5">
              {Object.keys(stageLabels).map((key) => {
                const stageNum = Number(key);
                const currentStage = stages[stageNum];
                const hasDate = DATED_STAGES.includes(stageNum);

                const isStageDisabled = !isEdit && stageNum > 1 && !isStageReached(stageNum - 1);
                const isRemarkFieldVisible = stageNum === focusedStage || !!currentStage.remark || (hasDate && !!currentStage.date);

                return (
                  <div
                    key={stageNum}
                    className={`flex flex-col gap-3 p-3 border rounded-xl shadow-xs transition-all duration-200 ${
                      isStageDisabled
                        ? 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-850 opacity-55'
                        : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-250'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold block truncate ${isStageDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {stageLabels[stageNum]}
                        </span>
                      </div>

                      <div className="flex-shrink-0">
                        {hasDate ? (
                          <input
                            type="date"
                            value={currentStage.date}
                            min={getDateLimits(stageNum).min}
                            max={getDateLimits(stageNum).max}
                            onChange={(e) => handleStageDateChange(stageNum, e.target.value)}
                            onFocus={() => !isStageDisabled && setFocusedStage(stageNum)}
                            onBlur={() => setFocusedStage(null)}
                            disabled={isStageDisabled}
                            className={`text-xs px-2.5 py-1.5 border rounded-lg focus:outline-none font-semibold dark:[color-scheme:dark] ${
                              isStageDisabled
                                ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-700 cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 focus:border-[#0f417a]'
                            }`}
                          />
                        ) : (
                          <label className={`flex items-center space-x-2 text-xs font-bold ${isStageDisabled ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-800 dark:text-slate-200 cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={currentStage.checked}
                              disabled={isStageDisabled}
                              onChange={(e) => handleStage4Toggle(e.target.checked)}
                              className="rounded border-slate-350 text-blue-800 focus:ring-blue-500 h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span>Applicable</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {!isStageDisabled && (
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden origin-top ${
                          isRemarkFieldVisible ? 'max-h-[50px] opacity-100 mt-1 scale-y-100' : 'max-h-0 opacity-0 scale-y-95 pointer-events-none'
                        }`}
                      >
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                          <input
                            type="text"
                            placeholder="Add stage-specific remark (optional)"
                            value={currentStage.remark}
                            onChange={(e) => handleStageRemarkChange(stageNum, e.target.value)}
                            onFocus={() => setFocusedStage(stageNum)}
                            onBlur={() => setFocusedStage(null)}
                            className="w-full text-[11px] px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-medium text-slate-700 dark:text-slate-300 placeholder-slate-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
          {onBack && (
            <button
              type="button" onClick={onBack}
              className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-slate-100 transition cursor-pointer"
            >
              Discard
            </button>
          )}
          <button
            type="submit" disabled={submitting}
            className="flex items-center space-x-2 px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : 'Save Audit Para'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
