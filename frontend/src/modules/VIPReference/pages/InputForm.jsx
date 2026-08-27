import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Calendar, FileText } from 'lucide-react';
import { createVIPReference, updateVIPReference } from '../api';
import { STAGE_STEPS as STATUS_STEPS } from '../utils/constants';

// Schema Constraints Definitions
const SCHEMA_LIMITS = {
  subject: { min: 3, max: 2000 },
  eofficeFile: { max: 50 },
  refNumber: { max: 256 },
  receivedFrom: { max: 256 },
  remarks: { maxWords: 250, maxChars: 2000 }
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
        return Number(payload.userId) || 1;
      } catch (e) {
        console.error("Error parsing token", e);
      }
    }
    return 1;
  };

  // Form Fields matching tbl_vip_reference_change schema types
  const [subject, setSubject] = useState(''); // nvarchar(MAX)
  const [eofficeFile, setEofficeFile] = useState(''); // nvarchar(50)
  const [wing, setWing] = useState(''); // int (FK)
  const [division, setDivision] = useState(''); // int (FK)
  const [refNumber, setRefNumber] = useState(''); // nvarchar(256)
  const [receivedFrom, setReceivedFrom] = useState(''); // nvarchar(256)
  const [remarks, setRemarks] = useState(''); // nvarchar(MAX)
  const [deadline, setDeadline] = useState(''); // date

  // Milestone Stages (date YYYY-MM-DD + optional stage remark)
  const [stages, setStages] = useState({
    1: { date: '', remark: '' }, // received_at_ministry_date
    2: { date: '', remark: '' }, // submitted_for_approval_date
    3: { date: '', remark: '' }, // comments_sought_date
    4: { date: '', remark: '' }, // comments_received_date
    5: { date: '', remark: '' }, // reply_furnished_date
    6: { date: '', remark: '' }  // disposed_date
  });

  // Validation States
  const [touched, setTouched] = useState({
    subject: false,
    eofficeFile: false,
    wing: false,
    division: false,
    refNumber: false,
    receivedFrom: false,
    remarks: false,
    stage1: false
  });

  const [formSubmitted, setFormSubmitted] = useState(false);

  // Track initial values for dirty checks in Edit mode
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

      const matchedWing = wings.find(w => w.wing_name?.trim() === editData.wing?.trim());
      initWing = matchedWing ? matchedWing.wing_id : '';

      const matchedDivision = divisions.find(d => d.division_name?.trim() === editData.division?.trim());
      initDivision = matchedDivision ? matchedDivision.division_id : '';

      initRefNumber = editData.refNumber || '';
      initReceivedFrom = editData.receivedFrom || '';
      initRemarks = editData.remarks || '';
      initDeadline = editData.deadline || '';

      initStages = {
        1: { date: editData.statusDates?.[1] || '', remark: '' },
        2: { date: editData.statusDates?.[2] || '', remark: '' },
        3: { date: editData.statusDates?.[3] || '', remark: '' },
        4: { date: editData.statusDates?.[4] || '', remark: '' },
        5: { date: editData.statusDates?.[5] || '', remark: '' },
        6: { date: editData.statusDates?.[6] || '', remark: '' }
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
      // Set default deadline 15 days from today
      const d = new Date();
      d.setDate(d.getDate() + 15);
      initDeadline = d.toISOString().split('T')[0];
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
      remarks: false,
      stage1: false
    });
    setFormSubmitted(false);
  }, [editData, wings]);

  // Filter divisions dynamically based on selected Wing
  const filteredDivisions = useMemo(() => {
    if (!wing) return [];
    const selectedWingObj = wings.find(w => w.wing_name === wing || String(w.wing_id) === String(wing));
    if (!selectedWingObj) return [];
    return divisions.filter(d => String(d.wing_id) === String(selectedWingObj.wing_id));
  }, [wing, wings, divisions]);

  useEffect(() => {
    if (filteredDivisions.length > 0) {
      const exists = filteredDivisions.some(d => d.division_name === division || String(d.division_id) === String(division));
      if (!exists && !editData) {
        setDivision(filteredDivisions[0].division_name);
      }
    } else {
      setDivision('');
    }
  }, [filteredDivisions, editData]);

  // Track if any field was changed (for edit mode enabling)
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

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute min/max limits for chronological stage dates (schema: date format)
  const getDateLimits = (stageNum) => {
    let min = undefined;
    let max = todayStr;

    if (stageNum > 1 && stages[stageNum - 1]?.date) {
      min = stages[stageNum - 1].date;
    }

    return { min, max };
  };

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  // Schema-Aligned Data Validation
  const validationErrors = useMemo(() => {
    const errs = {};

    // 1. subject: nvarchar(MAX), required, min 3 chars, max 2000 chars
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      errs.subject = 'Subject of VIP Reference is required.';
    } else if (trimmedSubject.length < SCHEMA_LIMITS.subject.min) {
      errs.subject = `Subject must be at least ${SCHEMA_LIMITS.subject.min} characters long.`;
    } else if (trimmedSubject.length > SCHEMA_LIMITS.subject.max) {
      errs.subject = `Subject cannot exceed ${SCHEMA_LIMITS.subject.max} characters.`;
    }

    // 2. eoffice_file_number: nvarchar(50), required
    const trimmedEoffice = eofficeFile.trim();
    if (!trimmedEoffice) {
      errs.eofficeFile = 'E-Office File Number is required.';
    } else if (trimmedEoffice.length > SCHEMA_LIMITS.eofficeFile.max) {
      errs.eofficeFile = `E-Office File Number cannot exceed ${SCHEMA_LIMITS.eofficeFile.max} characters.`;
    }

    // 3. wing: int, required FK
    if (!wing) {
      errs.wing = 'Concerned Wing must be selected.';
    }

    // 4. division: int, required FK
    if (!division) {
      errs.division = 'Concerned Division must be selected.';
    }

    // 5. ref_letter_num: nvarchar(256), required
    const trimmedRefNum = refNumber.trim();
    if (!trimmedRefNum) {
      errs.refNumber = 'Reference Letter Number is required.';
    } else if (trimmedRefNum.length > SCHEMA_LIMITS.refNumber.max) {
      errs.refNumber = `Reference Letter Number cannot exceed ${SCHEMA_LIMITS.refNumber.max} characters.`;
    }

    // 6. received_from: nvarchar(256), required
    const trimmedReceivedFrom = receivedFrom.trim();
    if (!trimmedReceivedFrom) {
      errs.receivedFrom = 'Received From (Sender) is required.';
    } else if (trimmedReceivedFrom.length > SCHEMA_LIMITS.receivedFrom.max) {
      errs.receivedFrom = `Received From cannot exceed ${SCHEMA_LIMITS.receivedFrom.max} characters.`;
    }

    // 7. remarks: nvarchar(MAX), required, max 250 words / max 2000 chars
    const trimmedRemarks = remarks.trim();
    if (!trimmedRemarks) {
      errs.remarks = 'General Remarks is required.';
    } else if (getWordCount(trimmedRemarks) > SCHEMA_LIMITS.remarks.maxWords) {
      errs.remarks = `Remarks cannot exceed ${SCHEMA_LIMITS.remarks.maxWords} words (${getWordCount(trimmedRemarks)} words entered).`;
    } else if (trimmedRemarks.length > SCHEMA_LIMITS.remarks.maxChars) {
      errs.remarks = `Remarks cannot exceed ${SCHEMA_LIMITS.remarks.maxChars} characters.`;
    }

    // 8. received_at_ministry_date: date, required, <= today
    if (!stages[1]?.date) {
      errs.stage1 = 'Stage 1 (Received at Ministry) date is required.';
    } else if (stages[1].date > todayStr) {
      errs.stage1 = 'Received at Ministry date cannot be in the future.';
    }

    // 9. Chronological validation for stage 2 to 6 dates
    for (let i = 2; i <= 6; i++) {
      if (stages[i]?.date) {
        if (stages[i].date > todayStr) {
          errs[`stage${i}`] = `Stage ${i} date cannot be in the future.`;
        }
        if (stages[i - 1]?.date && stages[i].date < stages[i - 1].date) {
          errs[`stage${i}`] = `Stage ${i} date cannot be earlier than Stage ${i - 1} date.`;
        }
      }
    }

    return errs;
  }, [subject, eofficeFile, wing, division, refNumber, receivedFrom, remarks, stages, todayStr]);

  const isFormValid = Object.keys(validationErrors).length === 0;

  const handleStageChange = (num, field, val) => {
    setStages(prev => {
      const updated = { ...prev };
      updated[num] = {
        ...updated[num],
        [field]: val
      };

      if (num === 1 && field === 'date' && val) {
        setDeadline(addDays(val, 15));
      }

      // Cascade clear later stages if an earlier stage is cleared
      if (field === 'date' && !val) {
        for (let i = num + 1; i <= 6; i++) {
          updated[i] = { date: '', remark: '' };
        }
      }
      return updated;
    });
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const shouldShowError = (field) => {
    return (touched[field] || formSubmitted) && !!validationErrors[field];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);

    setTouched({
      subject: true,
      eofficeFile: true,
      wing: true,
      division: true,
      refNumber: true,
      receivedFrom: true,
      remarks: true,
      stage1: true
    });

    if (!isFormValid) {
      const errorCount = Object.keys(validationErrors).length;
      triggerNotification?.(
        `Please correct the ${errorCount} schema validation error(s) before saving.`,
        "warning"
      );
      return;
    }

    setSubmitting(true);

    // Resolve integer foreign keys matching schema: wing (int), division (int)
    const wingObj = wings.find(w => w.wing_name === wing || String(w.wing_id) === String(wing)) || { wing_id: 1 };
    const divisionObj = divisions.find(d => d.division_name === division || String(d.division_id) === String(division)) || { division_id: 1 };
    const wingId = Number(wingObj.wing_id) || 1;
    const divisionId = Number(divisionObj.division_id) || 1;

    let selectedStage = 1;
    for (let i = 1; i <= 6; i++) {
      if (stages[i].date) {
        selectedStage = i;
      }
    }

    // Payload structured to exactly match backend request & SQL schema datatypes
    const payload = {
      vipSubject: subject.trim(),
      eofficeFileNumber: eofficeFile.trim(),
      wing: wingId, // int
      division: divisionId, // int
      referenceLetterNumber: refNumber.trim(),
      receivedFrom: receivedFrom.trim(),
      vipReceivedMinistryDate: stages[1].date || null, // date
      vipSubmittedForApprovalDate: stages[2].date || null, // date
      vipCommentsSoughtDate: stages[3].date || null, // date
      vipCommentsReceivedDate: stages[4].date || null, // date
      vipReplyFurnishedDate: stages[5].date || null, // date
      vipDisposedDate: stages[6].date || null, // date
      vipRemarks: remarks.trim(),
      selectedStage: Number(selectedStage), // int
      deadline: deadline || null, // date
      userID: getUserIdFromToken() // int
    };

    try {
      if (isEdit) {
        payload.vipReferenceID = Number(editData.id);
        await updateVIPReference(payload);
      } else {
        await createVIPReference(payload);
      }
      triggerNotification?.(
        isEdit ? "VIP Reference updated successfully." : "New VIP Reference registered successfully.",
        "success"
      );
      onSuccess?.();
      onBack?.();
    } catch (err) {
      console.error("Error saving VIP reference:", err);
      triggerNotification?.(err.response?.data?.message || "Failed to save VIP reference.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{isEdit ? 'UPDATE VIP REFERENCE LETTER' : 'REGISTER NEW VIP LETTER'}</span>
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

      <form onSubmit={handleSubmit} className="p-6" noValidate>

        {/* Global Validation Error Banner */}
        {formSubmitted && !isFormValid && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">Please correct the following errors before submitting:</h4>
              <ul className="mt-1 list-disc list-inside text-xs text-rose-700 dark:text-rose-400 space-y-0.5">
                {Object.values(validationErrors).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Primary Stationary Fields matching SQL Types */}
          <div className="lg:col-span-5 space-y-4 pr-0 lg:pr-2">
            
            {/* Subject Field (nvarchar(MAX)) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Subject of VIP Reference <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {subject.length} / {SCHEMA_LIMITS.subject.max}
                </span>
              </div>
              <textarea
                value={subject}
                maxLength={SCHEMA_LIMITS.subject.max}
                onChange={e => setSubject(e.target.value)}
                onBlur={() => handleBlur('subject')}
                placeholder="Details of the VIP communication..."
                rows={3}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200 transition-all ${
                  shouldShowError('subject')
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:border-rose-500'
                    : 'border-slate-200 focus:border-[#0f417a] dark:border-slate-800'
                }`}
              />
              {shouldShowError('subject') && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                  <span>{validationErrors.subject}</span>
                </p>
              )}
            </div>

            {/* E-Office File Number (nvarchar(50)) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  E-Office File Number <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {eofficeFile.length} / {SCHEMA_LIMITS.eofficeFile.max}
                </span>
              </div>
              <input
                type="text"
                value={eofficeFile}
                maxLength={SCHEMA_LIMITS.eofficeFile.max}
                onChange={e => setEofficeFile(e.target.value)}
                onBlur={() => handleBlur('eofficeFile')}
                placeholder="e.g. E-100244"
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200 transition-all ${
                  shouldShowError('eofficeFile')
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:border-rose-500'
                    : 'border-slate-200 focus:border-[#0f417a] dark:border-slate-800'
                }`}
              />
              {shouldShowError('eofficeFile') && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                  <span>{validationErrors.eofficeFile}</span>
                </p>
              )}
            </div>

            {/* Wing & Division Row (int foreign keys) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Wing Field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Wing <span className="text-rose-500">*</span>
                </label>
                <select
                  value={wing}
                  onChange={e => setWing(e.target.value)}
                  onBlur={() => handleBlur('wing')}
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200 cursor-pointer transition-all ${
                    shouldShowError('wing')
                      ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:border-rose-500'
                      : 'border-slate-200 focus:border-[#0f417a] dark:border-slate-800'
                  }`}
                >
                  <option value="">--Select Wing--</option>
                  {wings.map(w => (
                    <option key={w.wing_id || w.wing_name} value={w.wing_name}>{w.wing_name}</option>
                  ))}
                </select>
                {shouldShowError('wing') && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                    <span>{validationErrors.wing}</span>
                  </p>
                )}
              </div>

              {/* Division Field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Division <span className="text-rose-500">*</span>
                </label>
                <select
                  value={division}
                  onChange={e => setDivision(e.target.value)}
                  onBlur={() => handleBlur('division')}
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200 cursor-pointer transition-all ${
                    shouldShowError('division')
                      ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:border-rose-500'
                      : 'border-slate-200 focus:border-[#0f417a] dark:border-slate-800'
                  }`}
                >
                  <option value="">--Select Division--</option>
                  {filteredDivisions.map(d => (
                    <option key={d.division_id || d.division_name} value={d.division_name}>{d.division_name}</option>
                  ))}
                </select>
                {shouldShowError('division') && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                    <span>{validationErrors.division}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Reference Letter Number (nvarchar(256)) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Reference Letter Number <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {refNumber.length} / {SCHEMA_LIMITS.refNumber.max}
                </span>
              </div>
              <input
                type="text"
                value={refNumber}
                maxLength={SCHEMA_LIMITS.refNumber.max}
                onChange={e => setRefNumber(e.target.value)}
                onBlur={() => handleBlur('refNumber')}
                placeholder="e.g. Ref/VIP/647/25"
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200 transition-all ${
                  shouldShowError('refNumber')
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:border-rose-500'
                    : 'border-slate-200 focus:border-[#0f417a] dark:border-slate-800'
                }`}
              />
              {shouldShowError('refNumber') && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                  <span>{validationErrors.refNumber}</span>
                </p>
              )}
            </div>

            {/* Received From (nvarchar(256)) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Received From (Sender) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {receivedFrom.length} / {SCHEMA_LIMITS.receivedFrom.max}
                </span>
              </div>
              <input
                type="text"
                value={receivedFrom}
                maxLength={SCHEMA_LIMITS.receivedFrom.max}
                onChange={e => setReceivedFrom(e.target.value)}
                onBlur={() => handleBlur('receivedFrom')}
                placeholder="e.g. Shri Ajay Kumar Mandal, MP / VIP Dignitary"
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200 transition-all ${
                  shouldShowError('receivedFrom')
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:border-rose-500'
                    : 'border-slate-200 focus:border-[#0f417a] dark:border-slate-800'
                }`}
              />
              {shouldShowError('receivedFrom') && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                  <span>{validationErrors.receivedFrom}</span>
                </p>
              )}
            </div>

            {/* Remarks Field (nvarchar(MAX)) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  General Remarks <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[10px] font-bold ${getWordCount(remarks) > SCHEMA_LIMITS.remarks.maxWords ? 'text-rose-500' : 'text-slate-400'}`}>
                  {getWordCount(remarks)} / {SCHEMA_LIMITS.remarks.maxWords} words
                </span>
              </div>
              <textarea
                value={remarks}
                maxLength={SCHEMA_LIMITS.remarks.maxChars}
                onChange={e => setRemarks(e.target.value)}
                onBlur={() => handleBlur('remarks')}
                rows={3}
                placeholder="Enter remarks or details..."
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200 transition-all ${
                  shouldShowError('remarks')
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:border-rose-500'
                    : 'border-slate-200 focus:border-[#0f417a] dark:border-slate-800'
                }`}
              />
              {shouldShowError('remarks') && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                  <span>{validationErrors.remarks}</span>
                </p>
              )}
            </div>

            {/* Deadline (date) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Deadline (Auto-calculated: +15 days)
              </label>
              <input
                type="date"
                value={deadline}
                readOnly
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

          </div>

          {/* Right Panel: Stages Checklist & Chronological Dates (date data types) */}
          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 overflow-y-auto space-y-4 bg-slate-50/70 dark:bg-slate-950" style={{ maxHeight: '600px' }}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span>Stages Checklist & Action Dates</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Stage 1 Date is Mandatory
              </span>
            </div>

            <div className="space-y-3.5">
              {[1, 2, 3, 4, 5, 6].map((stageNum) => {
                const currentStage = stages[stageNum];
                const label = STATUS_STEPS[stageNum];

                // Disable future stages if previous stage has not been completed
                const isStageDisabled = !isEdit && stageNum > 1 && !stages[stageNum - 1]?.date;
                const isStageCompleted = !!currentStage.date;
                const hasStageError = shouldShowError(`stage${stageNum}`);

                return (
                  <div
                    key={stageNum}
                    className={`flex flex-col gap-2 p-3.5 border rounded-xl shadow-xs transition-all duration-200 ${
                      isStageDisabled
                        ? 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-850 opacity-60'
                        : isStageCompleted
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    } ${hasStageError ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {isStageCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        ) : (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono flex-shrink-0 ${
                            isStageDisabled ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-[#0f417a] dark:bg-blue-900/50 dark:text-blue-300'
                          }`}>
                            {stageNum}
                          </span>
                        )}
                        <span className={`text-xs font-bold block truncate ${
                          isStageDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {label} {stageNum === 1 && <span className="text-rose-500">*</span>}
                        </span>
                      </div>

                      <div className="flex-shrink-0">
                        <input
                          type="date"
                          value={currentStage.date}
                          min={getDateLimits(stageNum).min}
                          max={getDateLimits(stageNum).max}
                          onChange={e => handleStageChange(stageNum, 'date', e.target.value)}
                          onBlur={() => handleBlur(`stage${stageNum}`)}
                          disabled={isStageDisabled}
                          className={`text-xs px-3 py-1.5 border rounded-lg focus:outline-none font-semibold dark:[color-scheme:dark] ${
                            isStageDisabled
                              ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600 cursor-not-allowed'
                              : 'bg-white border-slate-200 text-slate-700 cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 focus:border-[#0f417a]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expandable Remarks field when date is filled */}
                    {Boolean(currentStage.date) && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Stage {stageNum} Remarks
                          </label>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {getWordCount(currentStage.remark || '')} words
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={currentStage.remark || ''}
                          onChange={e => handleStageChange(stageNum, 'remark', e.target.value)}
                          placeholder={`Enter remarks for Stage ${stageNum}: ${label}...`}
                          className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#0f417a] font-medium text-slate-700 dark:text-slate-200"
                        />
                      </div>
                    )}

                    {hasStageError && (
                      <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                        <span>{validationErrors[`stage${stageNum}`]}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Submit Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Fields marked with <span className="text-rose-500 font-bold">*</span> are mandatory.
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || (isEdit && !isDirty)}
              className={`flex items-center space-x-2 text-xs transition px-6 py-2.5 rounded-xl font-bold tracking-wider uppercase shadow-sm ${
                submitting || (isEdit && !isDirty)
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-[#0f417a] text-white hover:bg-blue-800 cursor-pointer active:scale-98'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? "Saving..." : isEdit ? "Update Reference" : "Save VIP Letter"}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
