import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ArrowLeft, Save } from 'lucide-react';

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const STAGES_LIST = [
  { id: 1, label: 'Pre-Draft Bill Prepared', dateKey: 'draftBillPreparedDate', remarkKey: 'draftBillPreparedRemark' },
  { id: 2, label: 'Pre-Draft Bill Approved', dateKey: 'dcnDraftBillApprovedMinisterDate', remarkKey: 'dcnDraftBillApprovedMinisterRemark' },
  { id: 3, label: 'Circulated for IMC', dateKey: 'circulatedImcDate', remarkKey: 'circulatedImcRemark' },
  { id: 4, label: 'IMC Comments Received', dateKey: 'imcCommentsRecDate', remarkKey: 'imcCommentsRecRemark' },
  { id: 5, label: 'DCN Draft Prepared', dateKey: 'dcnDraftBillPreparedDate', remarkKey: 'dcnDraftBillPreparedRemark' },
  { id: 6, label: 'DCN Draft Approved', dateKey: 'dcnDraftBillApprovedDate', remarkKey: 'dcnDraftBillApprovedRemark' },
  { id: 7, label: 'Submitted for Legal Vetting', dateKey: 'submittedLegalVettingDate', remarkKey: 'submittedLegalVettingRemark' },
  { id: 8, label: 'Legal Vetting Completed', dateKey: 'legalVettingCompletedDate', remarkKey: 'legalVettingCompletedRemark' },
  { id: 9, label: 'Final DCN Approved', dateKey: 'finalDcnDraftApprovedDate', remarkKey: 'finalDcnDraftApprovedRemark' },
  { id: 10, label: 'Advance Copy Sent', dateKey: 'advanceCopyDate', remarkKey: 'advanceCopyRemark' },
  { id: 11, label: 'Approved by Cabinet', dateKey: 'approvedByCabinetDate', remarkKey: 'approvedByCabinetRemark' },
  { id: 12, label: 'Introduced in Parliament', dateKey: 'billIntroducedInParliamentDate', remarkKey: 'billIntroducedInParliamentRemark' },
  { id: 13, label: 'Bill Passed', dateKey: 'billPassedDate', remarkKey: 'billPassedRemark' },
  { id: 14, label: 'Bill Notified', dateKey: 'billNotifiedDate', remarkKey: 'billNotifiedRemark' },
  { id: 15, label: 'Completed', dateKey: 'completedDate', remarkKey: 'completedRemark' }
];

export default function InputForm({
  editData = null,
  wings = [],
  divisions = [],
  onBack,
  onSuccess,
  triggerNotification,
  readOnly = false
}) {
  const isEdit = !!editData;

  const [subject, setSubject] = useState('');
  const [wing, setWing] = useState('');
  const [division, setDivision] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Focused/Hovered stages for remarks
  const [focusedStage, setFocusedStage] = useState(null);
  const [hoveredStage, setHoveredStage] = useState(null);

  // Stages dates and remarks
  const [stages, setStages] = useState(() => {
    const s = {};
    STAGES_LIST.forEach(stage => {
      s[stage.id] = { date: '', remark: '' };
    });
    return s;
  });

  const [initialValues, setInitialValues] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    let initSubject = '';
    let initWing = '';
    let initDivision = '';
    let initRemarks = '';
    let initStages = {};
    STAGES_LIST.forEach(stage => {
      initStages[stage.id] = { date: '', remark: '' };
    });

    if (editData) {
      initSubject = editData.subject || '';
      initWing = editData.wing !== undefined && editData.wing !== null ? String(editData.wing) : '';
      initDivision = editData.division !== undefined && editData.division !== null ? String(editData.division) : '';
      initRemarks = editData.remarks || '';

      initStages = {
        1: { date: editData.draft_bill_prepared_date ? editData.draft_bill_prepared_date.split('T')[0] : '', remark: editData.draft_bill_prepared_remarks || '' },
        2: { date: editData.dcn_draft_bill_approved_minister_date ? editData.dcn_draft_bill_approved_minister_date.split('T')[0] : '', remark: editData.dcn_draft_bill_approved_minister_remarks || '' },
        3: { date: editData.circulated_imc_date ? editData.circulated_imc_date.split('T')[0] : '', remark: editData.circulated_imc_remarks || '' },
        4: { date: editData.imc_comments_rec_date ? editData.imc_comments_rec_date.split('T')[0] : '', remark: editData.imc_comments_rec_remarks || '' },
        5: { date: editData.dcn_draft_bill_prepared_date ? editData.dcn_draft_bill_prepared_date.split('T')[0] : '', remark: editData.dcn_draft_bill_prepared_remarks || '' },
        6: { date: editData.dcn_draft_bill_approved_date ? editData.dcn_draft_bill_approved_date.split('T')[0] : '', remark: editData.dcn_draft_bill_approved_remarks || '' },
        7: { date: editData.submitted_legal_vetting_date ? editData.submitted_legal_vetting_date.split('T')[0] : '', remark: editData.submitted_legal_vetting_remarks || '' },
        8: { date: editData.legal_vetting_completed_date ? editData.legal_vetting_completed_date.split('T')[0] : '', remark: editData.legal_vetting_completed_remarks || '' },
        9: { date: editData.final_dcn_draft_approved_date ? editData.final_dcn_draft_approved_date.split('T')[0] : '', remark: editData.final_dcn_draft_approved_remarks || '' },
        10: { date: editData.advance_copy_date ? editData.advance_copy_date.split('T')[0] : '', remark: editData.advance_copy_remarks || '' },
        11: { date: editData.approved_by_cabinet_date ? editData.approved_by_cabinet_date.split('T')[0] : '', remark: editData.approved_by_cabinet_remarks || '' },
        12: { date: editData.bill_introduced_in_parliament_date ? editData.bill_introduced_in_parliament_date.split('T')[0] : '', remark: editData.bill_introduced_in_parliament_remarks || '' },
        13: { date: editData.bill_passed_date ? editData.bill_passed_date.split('T')[0] : '', remark: editData.bill_passed_remarks || '' },
        14: { date: editData.bill_notified_date ? editData.bill_notified_date.split('T')[0] : '', remark: editData.bill_notified_remarks || '' },
        15: { date: editData.completed_date ? editData.completed_date.split('T')[0] : '', remark: editData.completed_remarks || '' }
      };
    }

    setSubject(initSubject);
    setWing(initWing);
    setDivision(initDivision);
    setRemarks(initRemarks);
    setStages(initStages);

    setInitialValues({
      subject: initSubject,
      wing: initWing,
      division: initDivision,
      remarks: initRemarks,
      stages: initStages
    });

    setTouched({
      subject: false,
      wing: false,
      division: false,
      remarks: false
    });
  }, [editData]);

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

  // Helper to get today's date YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute min/max limits for stage dates
  const getDateLimits = (idx) => {
    let min = undefined;
    let max = todayStr;

    if (idx > 0 && stages[STAGES_LIST[idx - 1].id]?.date) {
      min = stages[STAGES_LIST[idx - 1].id].date;
    }

    return { min, max };
  };

  const isFormValid = useMemo(() => {
    const hasAtLeastOneDate = Object.values(stages).some(st => !!st.date);
    return (
      subject.trim() !== '' &&
      String(wing).trim() !== '' &&
      String(division).trim() !== '' &&
      remarks.trim() !== '' &&
      !errors.remarks &&
      hasAtLeastOneDate
    );
  }, [subject, wing, division, remarks, errors, stages]);

  const handleStageChange = (num, field, val) => {
    setStages(prev => {
      const updated = { ...prev };
      updated[num] = {
        ...updated[num],
        [field]: val
      };

      // Clear subsequent dates and remarks if this date is deleted
      if (field === 'date' && !val) {
        for (let i = num + 1; i <= 15; i++) {
          updated[i] = { date: '', remark: '' };
        }
        updated[num].remark = '';
      }
      return updated;
    });
  };

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
      remarks: true
    });

    if (!wing || !division || !subject.trim() || !remarks.trim()) {
      alert("Please fill in all mandatory fields highlighted in red.");
      return;
    }
    if (errors.remarks) {
      alert(errors.remarks);
      return;
    }

    setSubmitting(true);

    const token = localStorage.getItem('token');
    let activeUserId = 1;
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.userID) {
        activeUserId = decoded.userID;
      }
    }

    // Highest stage filled
    let selectedBillStage = 1;
    for (let i = 1; i <= 15; i++) {
      if (stages[i].date) {
        selectedBillStage = i;
      }
    }

    const payload = {
      subject,
      wing: parseInt(wing, 10),
      division: parseInt(division, 10),
      remarks: remarks.trim(),
      selectedBillStage,
      userID: activeUserId,

      draftBillPreparedDate: stages[1].date || '',
      draftBillPreparedRemark: stages[1].remark || '',
      dcnDraftBillApprovedMinisterDate: stages[2].date || '',
      dcnDraftBillApprovedMinisterRemark: stages[2].remark || '',
      circulatedImcDate: stages[3].date || '',
      circulatedImcRemark: stages[3].remark || '',
      imcCommentsRecDate: stages[4].date || '',
      imcCommentsRecRemark: stages[4].remark || '',
      dcnDraftBillPreparedDate: stages[5].date || '',
      dcnDraftBillPreparedRemark: stages[5].remark || '',
      dcnDraftBillApprovedDate: stages[6].date || '',
      dcnDraftBillApprovedRemark: stages[6].remark || '',
      submittedLegalVettingDate: stages[7].date || '',
      submittedLegalVettingRemark: stages[7].remark || '',
      legalVettingCompletedDate: stages[8].date || '',
      legalVettingCompletedRemark: stages[8].remark || '',
      finalDcnDraftApprovedDate: stages[9].date || '',
      finalDcnDraftApprovedRemark: stages[9].remark || '',
      advanceCopyDate: stages[10].date || '',
      advanceCopyRemark: stages[10].remark || '',
      approvedByCabinetDate: stages[11].date || '',
      approvedByCabinetRemark: stages[11].remark || '',
      billIntroducedInParliamentDate: stages[12].date || '',
      billIntroducedInParliamentRemark: stages[12].remark || '',
      billPassedDate: stages[13].date || '',
      billPassedRemark: stages[13].remark || '',
      billNotifiedDate: stages[14].date || '',
      billNotifiedRemark: stages[14].remark || '',
      completedDate: stages[15].date || '',
      completedRemark: stages[15].remark || ''
    };

    try {
      if (isEdit) {
        payload.billID = editData.id || editData.bill_id;
        await axios.put("http://localhost:3000/bill", payload);
      } else {
        await axios.post("http://localhost:3000/bill", payload);
      }

      if (triggerNotification) {
        triggerNotification(isEdit ? "Bill updated successfully." : "Bill created successfully.");
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error saving bill:", err);
      alert("Error saving Bill Pre-Constitutions Act details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {readOnly ? "View Legislative Bill / Pre-Constitutions Act (Read-only)" : isEdit ? "Update Legislative Bill / Pre-Constitutions Act" : "Add Legislative Bill / Pre-Constitutions Act"}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
        {(isEdit || readOnly) && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: lg:col-span-5 */}
          <div className="lg:col-span-5 space-y-4 pr-0 lg:pr-2">
            <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2">Basic Details</h3>
            
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Subject*</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onBlur={() => handleBlur('subject')}
                disabled={readOnly}
                placeholder="Enter subject name"
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('subject', subject) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700`}
              />
              {isFieldInvalid('subject', subject) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* Wing */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Wing*</label>
              <select
                value={wing}
                onChange={e => setWing(e.target.value)}
                onBlur={() => handleBlur('wing')}
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('wing', wing) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer`}
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
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Division*</label>
              <select
                value={division}
                onChange={e => setDivision(e.target.value)}
                onBlur={() => handleBlur('division')}
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('division', division) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer`}
              >
                <option value="">--Select Division--</option>
                {divisions.map(d => (
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
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">General Remarks* (Max 250 words)</label>
                <span className={`text-[10px] font-bold ${getWordCount(remarks) > 250 ? 'text-red-500' : 'text-slate-400'}`}>
                  {getWordCount(remarks)} / 250 words
                </span>
              </div>
              <textarea
                value={remarks}
                onChange={e => {
                  setRemarks(e.target.value);
                  validateRemarks(e.target.value);
                }}
                onBlur={() => handleBlur('remarks')}
                disabled={readOnly}
                rows={4}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('remarks', remarks) || errors.remarks ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700`}
                placeholder="Enter remarks..."
              />
              {isFieldInvalid('remarks', remarks) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
              {errors.remarks && (
                <p className="text-[10px] text-red-500 font-bold mt-1">{errors.remarks}</p>
              )}
            </div>
          </div>

          {/* Right panel: lg:col-span-7 */}
          <div className="lg:col-span-7 border border-slate-200 rounded-2xl p-4 overflow-y-auto space-y-4 bg-slate-50" style={{ maxHeight: '425px' }}>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider pb-2 border-b border-slate-200">
              Stages Checklist & Dates
            </h4>
            <div className="space-y-3.5">
              {STAGES_LIST.map((stage, idx) => {
                const stageNum = stage.id;
                const stageVal = stages[stageNum] || { date: '', remark: '' };
                const isStageDisabled = !isEdit && idx > 0 && !stages[STAGES_LIST[idx - 1].id]?.date;
                const isRemarkFieldVisible = stageNum === focusedStage || !!stageVal.date;

                return (
                  <div
                    key={stage.id}
                    onMouseEnter={() => !isStageDisabled && setHoveredStage(stageNum)}
                    onMouseLeave={() => setHoveredStage(null)}
                    className={`flex flex-col gap-3 p-4 border rounded-xl transition ${
                      stageVal.date
                        ? 'border-emerald-250 bg-emerald-50/20'
                        : 'border-slate-150 bg-white'
                    } ${isStageDisabled ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 tracking-wide uppercase">
                          Milestone {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 mt-0.5">{stage.label}</h4>
                      </div>

                      <div className="w-full sm:w-auto">
                        <input
                          type="date"
                          value={stageVal.date}
                          min={getDateLimits(idx).min}
                          max={getDateLimits(idx).max}
                          onChange={e => handleStageChange(stageNum, 'date', e.target.value)}
                          onFocus={() => !isStageDisabled && !readOnly && setFocusedStage(stageNum)}
                          onBlur={() => setFocusedStage(null)}
                          disabled={readOnly || isStageDisabled}
                          className={`w-full sm:w-auto text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:[color-scheme:dark] ${isStageDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        />
                      </div>
                    </div>

                    {/* Dynamically reveal Stage Remark field with transition animation */}
                    {!isStageDisabled && (
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden origin-top ${isRemarkFieldVisible
                          ? 'max-h-[50px] opacity-100 mt-1 scale-y-100'
                          : 'max-h-0 opacity-0 scale-y-95 pointer-events-none'
                          }`}
                      >
                        <div className="border-t border-slate-100 pt-2">
                          <input
                            type="text"
                            placeholder="Add stage-specific remark (optional)"
                            value={stageVal.remark}
                            onChange={e => handleStageChange(stageNum, 'remark', e.target.value)}
                            onFocus={() => !readOnly && setFocusedStage(stageNum)}
                            onBlur={() => setFocusedStage(null)}
                            disabled={readOnly}
                            className="w-full text-[11px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white font-medium text-slate-700 placeholder-slate-400"
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

        {/* Footer actions */}
        {!readOnly && (
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-150">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isDirty || !isFormValid}
              className="flex items-center gap-2 px-5 py-2 bg-[#0f417a] hover:bg-[#16569e] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Save className="h-4.5 w-4.5" />
              <span>{submitting ? "Saving..." : "Save details"}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
