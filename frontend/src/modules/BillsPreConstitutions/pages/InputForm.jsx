import { useState, useMemo } from 'react';
import { createBill, updateBill } from '../api';
import { Save } from 'lucide-react';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { BILLS_TOASTS } from '../toastMessages';

const STAGES_LIST = [
  { id: 1, label: 'Draft Bill Prepared', param: 'draftBillPrepared', field: 'draft_bill_prepared' },
  { id: 2, label: 'Pre-DCN & Draft Bill Approved by Minister', param: 'dcnDraftBillApprovedMinister', field: 'dcn_draft_bill_approved_minister' },
  { id: 3, label: 'Circulated for IMC', param: 'circulatedImc', field: 'circulated_imc' },
  { id: 4, label: 'IMC Comments Received', param: 'imcCommentsRec', field: 'imc_comments_rec' },
  { id: 5, label: 'DCN & Draft Bill Prepared', param: 'dcnDraftBillPrepared', field: 'dcn_draft_bill_prepared' },
  { id: 6, label: 'DCN & Draft Bill Approved by Minister', param: 'dcnDraftBillApproved', field: 'dcn_draft_bill_approved' },
  { id: 7, label: 'Submitted for Legal Vetting', param: 'submittedLegalVetting', field: 'submitted_legal_vetting' },
  { id: 8, label: 'Legal Vetting to be Completed', param: 'legalVettingCompleted', field: 'legal_vetting_completed' },
  { id: 9, label: 'Final DCN & Draft Bill Approved by Minister', param: 'finalDcnDraftApproved', field: 'final_dcn_draft_approved' },
  { id: 10, label: 'Advance Copy to be Sent to PMO & Cab Sectt.', param: 'advanceCopy', field: 'advance_copy' },
  { id: 11, label: 'Approved by Cabinet', param: 'approvedByCabinet', field: 'approved_by_cabinet' },
  { id: 12, label: 'Bill Introduced in Parliament', param: 'billIntroducedInParliament', field: 'bill_introduced_in_parliament' },
  { id: 13, label: 'Bill Passed', param: 'billPassed', field: 'bill_passed' },
  { id: 14, label: 'Bill Notified', param: 'billNotified', field: 'bill_notified' },
  { id: 15, label: 'Completed', param: 'completed', field: 'completed' }
];

const toDate = (v) => (v ? String(v).split('T')[0] : '');
const SUBJECT_MAX = 256; // tbl_bill.subject
const STAGE_REMARK_MAX = 250; // each stage's remark column
const emptyStage = { date: '', remark: '' };

// Today as YYYY-MM-DD in the user's time zone (toISOString would give the UTC date)
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Field values for a bill (or an empty form); the shell keys the form per bill, so this runs once per open.
// A stage is reached when it has a date
function initialValuesFor(editData) {
  const stages = {};
  STAGES_LIST.forEach((stage) => {
    stages[stage.id] = editData
      ? {
        date: toDate(editData[`${stage.field}_date`]),
        remark: editData[`${stage.field}_remarks`] || '',
      }
      : emptyStage;
  });
  if (!editData) return { subject: '', wing: '', division: '', remarks: '', stages };
  return {
    subject: editData.subject || '',
    wing: editData.wing !== undefined && editData.wing !== null ? String(editData.wing) : '',
    division: editData.division !== undefined && editData.division !== null ? String(editData.division) : '',
    remarks: editData.remarks || '',
    stages,
  };
}

// The first problem with the stages, or '' when they are fine: the dates must be in stage order
function stageProblem(stages) {
  let last = null;
  for (const stage of STAGES_LIST) {
    const st = stages[stage.id];
    if (st.date) {
      if (last && st.date < last.date) return `"${stage.label}" is dated before "${last.label}". Dates must be in stage order.`;
      last = { date: st.date, label: stage.label };
    }
  }
  return '';
}

export default function InputForm({
  editData = null,
  wings = [],
  divisions = [],
  onBack,
  onSuccess,
  notify,
  readOnly = false
}) {
  const isEdit = !!editData;

  const [initialValues] = useState(() => initialValuesFor(editData));
  const [subject, setSubject] = useState(initialValues.subject);
  const [wing, setWing] = useState(initialValues.wing);
  const [pickedDivision, setDivision] = useState(initialValues.division);
  // Only the chosen wing's divisions (as in the master: each division belongs to one wing)
  const wingDivisions = useMemo(
    () => divisions.filter((d) => wing !== '' && String(d.wing_id) === String(wing)),
    [divisions, wing],
  );
  const division = wingDivisions.some((d) => String(d.division_id) === pickedDivision) ? pickedDivision : '';
  const [remarks, setRemarks] = useState(initialValues.remarks);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Focused stage, for its remarks box
  const [focusedStage, setFocusedStage] = useState(null);

  // Stages dates and remarks
  const [stages, setStages] = useState(initialValues.stages);

  const [touched, setTouched] = useState({});

  const isDirty = useMemo(() => {
    if (subject !== initialValues.subject) return true;
    if (wing !== initialValues.wing) return true;
    if (division !== initialValues.division) return true;
    if (remarks !== initialValues.remarks) return true;

    for (let i = 1; i <= 15; i++) {
      if (stages[i]?.date !== initialValues.stages?.[i]?.date) return true;
      if (stages[i]?.remark !== initialValues.stages?.[i]?.remark) return true;
    }
    return false;
  }, [subject, wing, division, remarks, stages, initialValues]);

  const validateRemarks = (text) => {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    if (wordCount > 250) {
      setErrors(prev => ({ ...prev, remarks: 'Remarks cannot exceed 250 words.' }));
    } else {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated.remarks;
        return updated;
      });
    }
  };

  const todayStr = useMemo(() => localToday(), []);

  // Date limits for a stage: not before the latest earlier stage's date, not after today
  // (the full order is checked again on save)
  const getDateLimits = (idx) => {
    const earlier = STAGES_LIST.slice(0, idx).map((s) => stages[s.id]?.date).filter(Boolean);
    return { min: earlier.length ? earlier[earlier.length - 1] : undefined, max: todayStr };
  };

  // As in 2.0, only subject, wing and division are required: remarks are optional and a bill
  // can be registered before its first stage (it is then at stage 0, No Status)
  const isFormValid = useMemo(() => (
    subject.trim() !== '' &&
    String(wing).trim() !== '' &&
    String(division).trim() !== '' &&
    !errors.remarks
  ), [subject, wing, division, errors]);

  // Clearing one date never wipes the later stages
  const handleStageChange = (num, field, val) => {
    setStages(prev => ({ ...prev, [num]: { ...prev[num], [field]: val } }));
  };

  // A 2.0 bill can be at a stage that has no date; the server keeps that stage until a later
  // stage gets a date
  const savedStageId = Number(editData?.stage_id) || 0;
  const savedStage = STAGES_LIST.find((s) => s.id === savedStageId);
  const savedStageUndated = !!savedStage && !initialValues.stages[savedStageId].date;

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFieldInvalid = (field, val) => {
    return touched[field] && (!val || !String(val).trim());
  };

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      subject: true,
      wing: true,
      division: true,
    });

    if (!wing || !division || !subject.trim()) {
      notify?.(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    if (errors.remarks) {
      notify?.(BILLS_TOASTS.remarksTooLong());
      return;
    }
    const problem = stageProblem(stages);
    if (problem) {
      notify?.(BILLS_TOASTS.stagesInvalid(problem));
      return;
    }

    setSubmitting(true);

    // The server works out the current stage (the highest stage with a date)
    const payload = {
      subject: subject.trim(),
      wing: parseInt(wing, 10),
      division: parseInt(division, 10),
      remarks: remarks.trim(),

    };
    STAGES_LIST.forEach((stage) => {
      const st = stages[stage.id];
      payload[`${stage.param}Date`] = st.date || '';
      payload[`${stage.param}Remark`] = st.remark.trim();
    });

    try {
      if (isEdit) {
        payload.billID = editData.id || editData.bill_id;
        await updateBill(payload);
      } else {
        await createBill(payload);
      }

      notify?.(isEdit ? BILLS_TOASTS.updated() : BILLS_TOASTS.created());
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error saving bill:", err);
      notify?.(BILLS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="module-form-card overflow-hidden animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            {readOnly ? "View Legislative Bill / Pre-Constitutions Act (Read-only)" : isEdit ? "Update Legislative Bill / Pre-Constitutions Act" : "Add Legislative Bill / Pre-Constitutions Act"}
          </h3>
          <p className="module-form-banner-subtext">Ministry of Ports, Shipping and Waterways</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: lg:col-span-5 */}
          <div className="lg:col-span-5 space-y-4 pr-0 lg:pr-2">
            <h3 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">Basic Details</h3>
            
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="module-form-label">Subject <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onBlur={() => handleBlur('subject')}
                disabled={readOnly}
                maxLength={SUBJECT_MAX}
                placeholder="Enter subject name"
                className={`module-form-input${isFieldInvalid('subject', subject) ? ' !border-red-500' : ''}`}
              />
              {isFieldInvalid('subject', subject) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
              {subject.length > SUBJECT_MAX - 30 && (
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-right">{subject.length} / {SUBJECT_MAX} characters</p>
              )}
            </div>

            {/* Wing */}
            <div className="space-y-1.5">
              <label className="module-form-label">Wing <span className="text-red-500">*</span></label>
              <select
                value={wing}
                onChange={e => { setWing(e.target.value); setDivision(''); }}
                onBlur={() => handleBlur('wing')}
                disabled={readOnly}
                className={`module-form-input cursor-pointer${isFieldInvalid('wing', wing) ? ' !border-red-500' : ''}`}
              >
                <option value="">--Select Wing--</option>
                {wings.map(w => (
                  <option key={w.wing_id} value={String(w.wing_id)}>{w.wing_name}</option>
                ))}
              </select>
              {isFieldInvalid('wing', wing) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* Division */}
            <div className="space-y-1.5">
              <label className="module-form-label">Division <span className="text-red-500">*</span></label>
              <select
                value={division}
                onChange={e => setDivision(e.target.value)}
                onBlur={() => handleBlur('division')}
                disabled={readOnly}
                className={`module-form-input cursor-pointer${isFieldInvalid('division', division) ? ' !border-red-500' : ''}`}
              >
                <option value="">{wing ? '--Select Division--' : '--Select Wing first--'}</option>
                {wingDivisions.map(d => (
                  <option key={d.division_id} value={String(d.division_id)}>{d.division_name}</option>
                ))}
              </select>
              {isFieldInvalid('division', division) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="module-form-label">General Remarks (optional, max 250 words)</label>
                <span className={`text-[10px] font-bold ${getWordCount(remarks) > 250 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                  {getWordCount(remarks)} / 250 words
                </span>
              </div>
              <textarea
                value={remarks}
                onChange={e => {
                  setRemarks(e.target.value);
                  validateRemarks(e.target.value);
                }}
                disabled={readOnly}
                rows={4}
                className={`module-form-input${errors.remarks ? ' !border-red-500' : ''}`}
                placeholder="Enter remarks..."
              />
              {errors.remarks && (
                <p className="text-[10px] text-red-500 font-bold mt-1">{errors.remarks}</p>
              )}
            </div>
          </div>

          {/* Right panel: lg:col-span-7 */}
          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950" style={{ maxHeight: '425px' }}>
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
              Stages Checklist & Dates
            </h4>
            {savedStageUndated && (
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                Current stage (from 2.0, no date): <span className="font-bold">{savedStage.label}</span>. It stays the current stage until a later stage gets a date.
              </p>
            )}
            <div className="space-y-3.5">
              {STAGES_LIST.map((stage, idx) => {
                const stageNum = stage.id;
                const stageVal = stages[stageNum] || emptyStage;
                const isRemarkFieldVisible = stageNum === focusedStage || !!stageVal.date || !!stageVal.remark;

                return (
                  <div
                    key={stage.id}
                    className={`flex flex-col gap-3 p-4 border rounded-xl transition ${
                      stageVal.date
                        ? 'border-emerald-250 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-wide uppercase">
                          Milestone {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{stage.label}</h4>
                      </div>

                      <div className="w-full sm:w-auto flex items-center gap-2">
                        <input
                          type="date"
                          value={stageVal.date}
                          min={getDateLimits(idx).min}
                          max={getDateLimits(idx).max}
                          onChange={e => handleStageChange(stageNum, 'date', e.target.value)}
                          onFocus={() => !readOnly && setFocusedStage(stageNum)}
                          onBlur={() => setFocusedStage(null)}
                          disabled={readOnly}
                          aria-label={`${stage.label} date`}
                          className={`w-full sm:w-auto text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:[color-scheme:dark] cursor-pointer`}
                        />
                      </div>
                    </div>

                    {/* Dynamically reveal Stage Remark field with transition animation */}
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden origin-top ${isRemarkFieldVisible
                        ? 'max-h-[50px] opacity-100 mt-1 scale-y-100'
                        : 'max-h-0 opacity-0 scale-y-95 pointer-events-none'
                        }`}
                    >
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                        <input
                          type="text"
                          placeholder="Add stage-specific remark (optional)"
                          maxLength={STAGE_REMARK_MAX}
                          value={stageVal.remark}
                          onChange={e => handleStageChange(stageNum, 'remark', e.target.value)}
                          onFocus={() => !readOnly && setFocusedStage(stageNum)}
                          onBlur={() => setFocusedStage(null)}
                          disabled={readOnly}
                          className="w-full text-[11px] px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-medium text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        {!readOnly && (
          <div className="flex justify-between items-center gap-3 pt-6 mt-6 border-t border-slate-150 dark:border-slate-800">
            <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !isDirty || !isFormValid}
                className="flex items-center gap-2 px-5 py-2 bg-[#0f417a] hover:bg-[#16569e] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer"
              >
                <Save className="h-4.5 w-4.5" />
                <span>{submitting ? "Saving..." : "Save details"}</span>
              </button>
            </div>
          </div>
        )}
        {readOnly && onBack && (
          <div className="flex justify-end pt-6 mt-6 border-t border-slate-150 dark:border-slate-800">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              Back
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
