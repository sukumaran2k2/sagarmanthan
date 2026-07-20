import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { ArrowLeft, Save } from 'lucide-react';

const STATUS_STEPS = {
  1: 'Received at Ministry',
  2: 'Submitted for Approval',
  3: 'Comments Sought',
  4: 'Comments Received',
  5: 'Reply Furnished',
  6: 'Disposed'
};

export default function InputForm({
  editData = null,
  wings = [],
  divisions = [],
  onBack,
  onSuccess,
  triggerNotification
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const getUserIdFromToken = () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || 1;
      } catch (e) {
        console.error("Error parsing token", e);
      }
    }
    return 1;
  };

  // Form Fields (Left Panel)
  const [subject, setSubject] = useState('');
  const [eofficeFile, setEofficeFile] = useState('');
  const [wing, setWing] = useState('');
  const [division, setDivision] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [remarks, setRemarks] = useState('');
  const [deadline, setDeadline] = useState('');

  // Milestone Stages (Right Panel)
  const [stages, setStages] = useState({
    1: { date: '', remark: '' },
    2: { date: '', remark: '' },
    3: { date: '', remark: '' },
    4: { date: '', remark: '' },
    5: { date: '', remark: '' },
    6: { date: '', remark: '' }
  });

  // Validation States
  const [touched, setTouched] = useState({
    subject: false,
    eofficeFile: false,
    wing: false,
    division: false,
    refNumber: false,
    receivedFrom: false,
    remarks: false
  });

  const [errors, setErrors] = useState({});
  const [focusedStage, setFocusedStage] = useState(null);
  const [hoveredStage, setHoveredStage] = useState(null);

  // Track initial values for dirty checks
  const [initialValues, setInitialValues] = useState({
    subject: '',
    eofficeFile: '',
    wing: '',
    division: '',
    refNumber: '',
    receivedFrom: '',
    remarks: '',
    deadline: '',
    stages: {
      1: { date: '', remark: '' },
      2: { date: '', remark: '' },
      3: { date: '', remark: '' },
      4: { date: '', remark: '' },
      5: { date: '', remark: '' },
      6: { date: '', remark: '' }
    }
  });

  useEffect(() => {
    let initSubject = '';
    let initEofficeFile = '';
    let initWing = '';
    let initDivision = '';
    let initRefNumber = '';
    let initReceivedFrom = '';
    let initRemarks = '';
    let initDeadline = '';
    let initStages = {
      1: { date: '', remark: '' },
      2: { date: '', remark: '' },
      3: { date: '', remark: '' },
      4: { date: '', remark: '' },
      5: { date: '', remark: '' },
      6: { date: '', remark: '' }
    };

    if (editData) {
      initSubject = editData.subject || '';
      initEofficeFile = editData.eofficeFile || '';
      initWing = editData.wing || '';
      initDivision = editData.division || '';
      initRefNumber = editData.refNumber || '';
      initReceivedFrom = editData.receivedFrom || '';
      initRemarks = editData.remarks || '';
      initDeadline = editData.deadline || '';

      initStages = {
        1: { date: editData.statusDates[1] || '', remark: '' },
        2: { date: editData.statusDates[2] || '', remark: '' },
        3: { date: editData.statusDates[3] || '', remark: '' },
        4: { date: editData.statusDates[4] || '', remark: '' },
        5: { date: editData.statusDates[5] || '', remark: '' },
        6: { date: editData.statusDates[6] || '', remark: '' }
      };
    } else {
      const defaultWing = wings[0]?.wing_name || '';
      initWing = defaultWing;
      initStages = {
        1: { date: new Date().toISOString().split('T')[0], remark: '' },
        2: { date: '', remark: '' },
        3: { date: '', remark: '' },
        4: { date: '', remark: '' },
        5: { date: '', remark: '' },
        6: { date: '', remark: '' }
      };
    }

    setSubject(initSubject);
    setEofficeFile(initEofficeFile);
    setWing(initWing);
    setDivision(initDivision);
    setRefNumber(initRefNumber);
    setReceivedFrom(initReceivedFrom);
    setRemarks(initRemarks);
    setDeadline(initDeadline);
    setStages(initStages);

    setInitialValues({
      subject: initSubject,
      eofficeFile: initEofficeFile,
      wing: initWing,
      division: initDivision,
      refNumber: initRefNumber,
      receivedFrom: initReceivedFrom,
      remarks: initRemarks,
      deadline: initDeadline,
      stages: initStages
    });

    setTouched({
      subject: false,
      eofficeFile: false,
      wing: false,
      division: false,
      refNumber: false,
      receivedFrom: false,
      remarks: false
    });
    setErrors({});
  }, [editData, wings]);

  // Filter divisions dynamically
  const filteredDivisions = useMemo(() => {
    if (!wing) return [];
    const selectedWingObj = wings.find(w => w.wing_name === wing);
    if (!selectedWingObj) return [];
    return divisions.filter(d => d.wing_id === selectedWingObj.wing_id);
  }, [wing, wings, divisions]);

  useEffect(() => {
    if (filteredDivisions.length > 0) {
      const exists = filteredDivisions.some(d => d.division_name === division);
      if (!exists) {
        setDivision(filteredDivisions[0].division_name);
      }
    } else {
      setDivision('');
    }
  }, [filteredDivisions]);

  const isDirty = useMemo(() => {
    if (subject !== initialValues.subject) return true;
    if (eofficeFile !== initialValues.eofficeFile) return true;
    if (wing !== initialValues.wing) return true;
    if (division !== initialValues.division) return true;
    if (refNumber !== initialValues.refNumber) return true;
    if (receivedFrom !== initialValues.receivedFrom) return true;
    if (remarks !== initialValues.remarks) return true;
    if (deadline !== initialValues.deadline) return true;

    for (let i = 1; i <= 6; i++) {
      if (stages[i].date !== initialValues.stages[i].date) return true;
      if (stages[i].remark !== initialValues.stages[i].remark) return true;
    }
    return false;
  }, [subject, eofficeFile, wing, division, refNumber, receivedFrom, remarks, deadline, stages, initialValues]);

  const isFormValid = useMemo(() => {
    return (
      subject.trim() !== '' &&
      eofficeFile.trim() !== '' &&
      String(wing).trim() !== '' &&
      String(division).trim() !== '' &&
      refNumber.trim() !== '' &&
      receivedFrom.trim() !== '' &&
      remarks.trim() !== ''
    );
  }, [subject, eofficeFile, wing, division, refNumber, receivedFrom, remarks]);

  const handleStageChange = (num, field, val) => {
    setStages(prev => {
      const updated = { ...prev };
      updated[num] = {
        ...updated[num],
        [field]: val
      };

      // Cascade clear logic matching Cab Notes
      if (field === 'date' && !val) {
        for (let i = num + 1; i <= 6; i++) {
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
      eofficeFile: true,
      wing: true,
      division: true,
      refNumber: true,
      receivedFrom: true,
      remarks: true
    });

    if (
      !subject.trim() ||
      !eofficeFile.trim() ||
      !wing ||
      !division ||
      !refNumber.trim() ||
      !receivedFrom.trim() ||
      !remarks.trim()
    ) {
      alert("Please fill in all mandatory fields highlighted in red.");
      return;
    }

    if (errors.remarks) {
      alert(errors.remarks);
      return;
    }

    // Verify stage 1 has a date
    if (!stages[1].date) {
      alert("Please specify the Action Date for Stage 1: Received at Ministry.");
      return;
    }

    setSubmitting(true);

    const wingObj = wings.find(w => w.wing_name === wing) || { wing_id: 1 };
    const divisionObj = divisions.find(d => d.division_name === division) || { division_id: 1 };
    const wingId = wingObj.wing_id;
    const divisionId = divisionObj.division_id;

    let selectedStage = 1;
    for (let i = 1; i <= 6; i++) {
      if (stages[i].date) {
        selectedStage = i;
      }
    }

    const payload = {
      vipSubject: subject.trim(),
      eofficeFileNumber: eofficeFile.trim(),
      wing: wingId,
      division: divisionId,
      referenceLetterNumber: refNumber.trim(),
      receivedFrom: receivedFrom.trim(),
      vipReceivedMinistryDate: stages[1].date || '',
      vipSubmittedForApprovalDate: stages[2].date || '',
      vipCommentsSoughtDate: stages[3].date || '',
      vipCommentsReceivedDate: stages[4].date || '',
      vipReplyFurnishedDate: stages[5].date || '',
      vipDisposedDate: stages[6].date || '',
      vipRemarks: remarks.trim(),
      selectedStage: selectedStage,
      deadline: deadline || '',
      userID: getUserIdFromToken()
    };

    try {
      if (isEdit) {
        payload.vipReferenceID = editData.id;
        await axios.put("http://localhost:3000/vip-reference", payload);
      } else {
        await axios.post("http://localhost:3000/vip-reference", payload);
      }
      triggerNotification?.(isEdit ? "VIP Reference updated successfully." : "New VIP Reference registered successfully.");
      onSuccess();
    } catch (err) {
      console.error("Error saving VIP reference:", err);
      alert("Failed to save VIP reference.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            {isEdit ? 'UPDATE VIP REFERENCE LETTER' : 'REGISTER NEW VIP LETTER'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
        <button
          onClick={onBack}
          type="button"
          className="flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Stationary fields */}
          <div className="lg:col-span-5 space-y-4 pr-0 lg:pr-2">
            
            {/* Subject Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Subject of VIP Reference*</label>
              <textarea
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onBlur={() => handleBlur('subject')}
                placeholder="Details of the letter..."
                rows={3}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('subject', subject) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {isFieldInvalid('subject', subject) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* E-Office File Number */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">E-Office File Number*</label>
              <input
                type="text"
                value={eofficeFile}
                onChange={e => setEofficeFile(e.target.value)}
                onBlur={() => handleBlur('eofficeFile')}
                placeholder="e.g. E-100244"
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('eofficeFile', eofficeFile) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {isFieldInvalid('eofficeFile', eofficeFile) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* Wing & Division Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Wing Field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Wing*</label>
                <select
                  value={wing}
                  onChange={e => setWing(e.target.value)}
                  onBlur={() => handleBlur('wing')}
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('wing', wing) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer`}
                >
                  <option value="">--Select Wing--</option>
                  {wings.map(w => (
                    <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>
                  ))}
                </select>
                {isFieldInvalid('wing', wing) && (
                  <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
                )}
              </div>

              {/* Division Field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Division*</label>
                <select
                  value={division}
                  onChange={e => setDivision(e.target.value)}
                  onBlur={() => handleBlur('division')}
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('division', division) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer`}
                >
                  <option value="">--Select Division--</option>
                  {filteredDivisions.map(d => (
                    <option key={d.division_id} value={d.division_name}>{d.division_name}</option>
                  ))}
                </select>
                {isFieldInvalid('division', division) && (
                  <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
                )}
              </div>
            </div>

            {/* Reference Letter Number */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Reference Letter Number*</label>
              <input
                type="text"
                value={refNumber}
                onChange={e => setRefNumber(e.target.value)}
                onBlur={() => handleBlur('refNumber')}
                placeholder="e.g. 647/25"
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('refNumber', refNumber) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {isFieldInvalid('refNumber', refNumber) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* Received From */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Received From (Sender)*</label>
              <input
                type="text"
                value={receivedFrom}
                onChange={e => setReceivedFrom(e.target.value)}
                onBlur={() => handleBlur('receivedFrom')}
                placeholder="e.g. Shri Ajay Kumar Mandal, MP"
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('receivedFrom', receivedFrom) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {isFieldInvalid('receivedFrom', receivedFrom) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* Remarks Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">General Remarks* (Max 250 words)</label>
                <span className={`text-[10px] font-bold ${getWordCount(remarks) > 250 ? 'text-red-500' : 'text-slate-400'}`}>
                  {getWordCount(remarks)} / 250 words
                </span>
              </div>
              <textarea
                value={remarks}
                onChange={e => { setRemarks(e.target.value); validateRemarks(e.target.value); }}
                onBlur={() => handleBlur('remarks')}
                rows={3}
                placeholder="Enter remarks..."
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('remarks', remarks) || errors.remarks ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {isFieldInvalid('remarks', remarks) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
              {errors.remarks && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.remarks}</p>}
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              />
            </div>

          </div>

          {/* Right Panel: Stages list card style */}
          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950" style={{ maxHeight: '580px' }}>
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
              Stages Checklist & Dates
            </h4>
            <div className="space-y-3.5">
              {[1, 2, 3, 4, 5, 6].map((stageNum) => {
                const currentStage = stages[stageNum];
                const label = STATUS_STEPS[stageNum];

                // Enforce sequential filling on add
                const isStageDisabled = !isEdit && stageNum > 1 && !stages[stageNum - 1].date;
                const isRemarkFieldVisible = stageNum === focusedStage || !!currentStage.date;

                return (
                  <div
                    key={stageNum}
                    onMouseEnter={() => !isStageDisabled && setHoveredStage(stageNum)}
                    onMouseLeave={() => setHoveredStage(null)}
                    className={`flex flex-col gap-3 p-3 border rounded-xl shadow-xs transition-all duration-200 ${isStageDisabled
                      ? 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-850 opacity-55'
                      : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-250'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold block truncate ${isStageDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {stageNum}. {label}
                        </span>
                      </div>

                      <div className="flex-shrink-0">
                        <input
                          type="date"
                          value={currentStage.date}
                          onChange={e => handleStageChange(stageNum, 'date', e.target.value)}
                          onFocus={() => !isStageDisabled && setFocusedStage(stageNum)}
                          onBlur={() => setFocusedStage(null)}
                          disabled={isStageDisabled}
                          className={`text-xs px-2.5 py-1.5 border rounded-lg focus:outline-none font-semibold dark:[color-scheme:dark] ${isStageDisabled
                            ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600'
                            : 'bg-white border-slate-200 text-slate-700 cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 focus:border-[#0f417a]'
                            }`}
                        />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
          <button
            type="submit"
            disabled={submitting || !isFormValid || (isEdit && !isDirty)}
            className={`flex items-center space-x-2 text-xs transition px-5 py-2.5 rounded-xl font-bold tracking-wider uppercase ${(submitting || !isFormValid || (isEdit && !isDirty))
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                : 'bg-[#0f417a] text-white hover:bg-blue-800 cursor-pointer'
              }`}
          >
            <Save className="h-4 w-4" />
            <span>{isEdit ? "Update Reference" : "Save VIP Letter"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
