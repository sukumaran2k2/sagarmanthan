import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { createAuditPara, updateAuditPara } from '../api';
import { getCurrentUserId } from '../../../utils/authSession';
import { CATEGORIES } from '../constants';

const stageLabels = {
  1: '1. Received but yet to be sent for Comments',
  2: '2. Comments sought from organisation',
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
  const [submitting, setSubmitting] = useState(false);

  const [formNumber, setFormNumber] = useState(editData?.paraNumber || '');
  const [formSubject, setFormSubject] = useState(editData?.subject || '');
  const [formWing, setFormWing] = useState(editData?.wing || wings[0]?.wing_name || '');
  const [formDivision, setFormDivision] = useState(editData?.division || divisions[0]?.division_name || '');
  const [formCategory, setFormCategory] = useState(editData?.category || 'Audit Para');
  const [formRemarks, setFormRemarks] = useState(editData?.remarks || '');

  const [focusedStage, setFocusedStage] = useState(null);

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
    if (!formNumber.trim() || !formSubject.trim()) {
      triggerNotification ? triggerNotification('Please fill in all required fields marked with *', 'error') : alert('Please fill in all required fields marked with *');
      return;
    }

    const combinedRemarks = [formRemarks, ...Object.values(stages).map((s) => s.remark).filter(Boolean)].join(' ');
    const wordCount = combinedRemarks.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 250) {
      triggerNotification ? triggerNotification('Remarks cannot exceed 250 words.', 'error') : alert('Remarks cannot exceed 250 words.');
      return;
    }

    const wingObj = wings.find((w) => w.wing_name === formWing) || {};
    const divisionObj = divisions.find((d) => d.division_name === formDivision) || {};

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
        triggerNotification && triggerNotification('Audit Para updated successfully', 'success');
      } else {
        await createAuditPara(payload);
        triggerNotification && triggerNotification('Audit Para registered successfully', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Audit Para:', err);
      triggerNotification ? triggerNotification('Failed to save Audit Para.', 'error') : alert('Failed to save Audit Para.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {isEdit ? 'Update Audit Para Entry' : 'Register New Audit Para'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
        {isEdit && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Para Number *</label>
              <input
                type="text" value={formNumber} onChange={(e) => setFormNumber(e.target.value)}
                placeholder="e.g. 5.1" required
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Subject *</label>
              <input
                type="text" value={formSubject} onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Audit subject description..." required
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Wing *</label>
              <select
                value={formWing} onChange={(e) => setFormWing(e.target.value)} required
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {wings.map((w) => <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Division *</label>
              <select
                value={formDivision} onChange={(e) => setFormDivision(e.target.value)} required
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {divisions.map((d) => <option key={d.division_id} value={d.division_name}>{d.division_name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Category *</label>
              <select
                value={formCategory} onChange={(e) => setFormCategory(e.target.value)} required
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">General Remarks (Max 250 words)</label>
              <textarea
                value={formRemarks} onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Enter remarks..." rows={4}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950 max-h-[560px]">
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
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
