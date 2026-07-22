import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, X, FileText } from 'lucide-react';

const stageLabels = {
  1: '1. Received at Ministry',
  2: '2. Sent for Comments',
  3: '3. Comments Received',
  4: '4. File Submitted for Approval',
  5: '5. Reply Furnished to Other Ministry'
};

const COMMON_WINGS = [
  'Shipping',
  'Vigilance',
  'Ports',
  'IWT',
  'Administration',
  'Coord-I',
  'Coord-II',
  'DGLL, Parliament & TRW',
  'Development',
  'Finance',
  'Sagarmala'
];

export default function InputForm({
  editData = null,
  wingsList = [],
  onBack,
  onSuccess,
  triggerNotification,
  readOnly = false
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);
  const [ministries, setMinistries] = useState([]);

  // Basic Left Panel States
  const [subject, setSubject] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [ministryName, setMinistryName] = useState('');
  const [eofficeFileNumber, setEofficeFileNumber] = useState('');
  const [deadline, setDeadline] = useState('');
  const [remarks, setRemarks] = useState('');

  // Touched & validation errors
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  // Right Panel: Stages Checklist & Dates (1 to 5)
  const [stages, setStages] = useState({
    1: { date: '', remark: '' },
    2: { date: '', remark: '' },
    3: { date: '', remark: '' },
    4: { date: '', remark: '' },
    5: { date: '', remark: '' }
  });

  // Stage 2: Concerned wings tag pool states (YoungProfessionals skills style)
  const [wingInput, setWingInput] = useState('');
  const [selectedWings, setSelectedWings] = useState([]);
  const [showWingSuggestions, setShowWingSuggestions] = useState(false);
  const wingSuggestionsRef = useRef(null);

  // Wing-wise dates & remarks state
  const [wingDetails, setWingDetails] = useState({
    Shipping: { date: '', remark: '' },
    Vigilance: { date: '', remark: '' },
    Ports: { date: '', remark: '' },
    IWT: { date: '', remark: '' },
    Administration: { date: '', remark: '' },
    'Coord-I': { date: '', remark: '' },
    'Coord-II': { date: '', remark: '' },
    'DGLL, Parliament & TRW': { date: '', remark: '' },
    Development: { date: '', remark: '' },
    Finance: { date: '', remark: '' },
    Sagarmala: { date: '', remark: '' }
  });

  // Focus tracking for animation
  const [focusedStage, setFocusedStage] = useState(null);

  // Initial values for dirty check
  const [initialValues, setInitialValues] = useState({
    subject: '',
    ministryId: '',
    eofficeFileNumber: '',
    remarks: '',
    selectedWings: [],
    stages: {
      1: { date: '', remark: '' },
      2: { date: '', remark: '' },
      3: { date: '', remark: '' },
      4: { date: '', remark: '' },
      5: { date: '', remark: '' }
    }
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (wingSuggestionsRef.current && !wingSuggestionsRef.current.contains(event.target)) {
        setShowWingSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_ministry")
      .then(res => setMinistries(res.data || []))
      .catch(err => console.error("Error fetching ministries:", err));
  }, []);

  useEffect(() => {
    let initSubject = '';
    let initMinId = '';
    let initMinName = '';
    let initFileNo = '';
    let initDeadline = '';
    let initRemarks = '';
    let initWings = [];
    let initStages = {
      1: { date: '', remark: '' },
      2: { date: '', remark: '' },
      3: { date: '', remark: '' },
      4: { date: '', remark: '' },
      5: { date: '', remark: '' }
    };

    if (editData) {
      initSubject = editData.subject || '';
      initMinId = editData.ministry_id !== undefined && editData.ministry_id !== null ? String(editData.ministry_id) : '';
      initMinName = editData.ministry_name || '';
      initFileNo = editData.eoffice_file_number || '';
      initDeadline = editData.deadline ? editData.deadline.split('T')[0] : '';
      initRemarks = editData.remarks || '';

      if (editData.sent_for_comments_wings) {
        const rawWings = editData.sent_for_comments_wings.split(',').map(s => s.trim()).filter(Boolean);
        initWings = rawWings.map(item => {
          if (!isNaN(item)) {
            const found = wingsList.find(w => String(w.wing_id) === String(item));
            return found ? found.wing_name : item;
          }
          return item;
        });
      }

      initStages = {
        1: { 
          date: editData.received_ministry_date ? editData.received_ministry_date.split('T')[0] : '', 
          remark: editData.received_ministry_remarks || '' 
        },
        2: { 
          date: editData.sent_for_comments_date ? editData.sent_for_comments_date.split('T')[0] : '', 
          remark: editData.sent_for_comments_remarks || '' 
        },
        3: { 
          date: editData.comments_rec_date ? editData.comments_rec_date.split('T')[0] : '',
          remark: editData.comments_rec_remarks || ''
        },
        4: { 
          date: editData.file_submitted_date ? editData.file_submitted_date.split('T')[0] : '', 
          remark: editData.file_submitted_remarks || '' 
        },
        5: { 
          date: editData.reply_furnished_date ? editData.reply_furnished_date.split('T')[0] : '', 
          remark: editData.reply_furnished_remarks || '' 
        }
      };

      setWingDetails({
        Shipping: { date: editData.shipping_date ? editData.shipping_date.split('T')[0] : '', remark: editData.shipping_remarks || '' },
        Vigilance: { date: editData.vigilance_date ? editData.vigilance_date.split('T')[0] : '', remark: editData.vigilance_remarks || '' },
        Ports: { date: editData.ports_date ? editData.ports_date.split('T')[0] : '', remark: editData.ports_remarks || '' },
        IWT: { date: editData.iwt_date ? editData.iwt_date.split('T')[0] : '', remark: editData.iwt_remarks || '' },
        Administration: { date: editData.administration_date ? editData.administration_date.split('T')[0] : '', remark: editData.administration_remarks || '' },
        'Coord-I': { date: editData.coord_I_date ? editData.coord_I_date.split('T')[0] : '', remark: editData.coord_I_remarks || '' },
        'Coord-II': { date: editData.coord_II_date ? editData.coord_II_date.split('T')[0] : '', remark: editData.coord_II_remarks || '' },
        'DGLL, Parliament & TRW': { date: editData.dgll_parliament_and_trw_date ? editData.dgll_parliament_and_trw_date.split('T')[0] : '', remark: editData.dgll_parliament_and_trw_remarks || '' },
        Development: { date: editData.development_date ? editData.development_date.split('T')[0] : '', remark: editData.development_remarks || '' },
        Finance: { date: editData.finance_date ? editData.finance_date.split('T')[0] : '', remark: editData.finance_remarks || '' },
        Sagarmala: { date: editData.sagarmala_date ? editData.sagarmala_date.split('T')[0] : '', remark: editData.sagarmala_remarks || '' }
      });
    } else if (ministries.length > 0) {
      initMinId = String(ministries[0].ministry_id);
      initMinName = ministries[0].ministry_name;
    }

    setSubject(initSubject);
    setMinistryId(initMinId);
    setMinistryName(initMinName);
    setEofficeFileNumber(initFileNo);
    setDeadline(initDeadline);
    setRemarks(initRemarks);
    setSelectedWings(initWings);
    setStages(initStages);

    setInitialValues({
      subject: initSubject,
      ministryId: initMinId,
      eofficeFileNumber: initFileNo,
      remarks: initRemarks,
      selectedWings: initWings,
      stages: initStages
    });

    setTouched({});
    setErrors({});
  }, [editData, wingsList, ministries]);

  // Wing suggestions dropdown filtering
  const wingSuggestions = useMemo(() => {
    const query = wingInput.trim().toLowerCase();
    const matched = COMMON_WINGS.filter(
      w => w.toLowerCase().includes(query) && !selectedWings.includes(w)
    );
    if (query && !matched.some(s => s.toLowerCase() === query) && !selectedWings.some(s => s.toLowerCase() === query)) {
      matched.push(wingInput.trim());
    }
    return matched;
  }, [wingInput, selectedWings]);

  const handleAddWing = (wingName) => {
    if (wingName && !selectedWings.includes(wingName)) {
      setSelectedWings(prev => [...prev, wingName]);
    }
    setWingInput('');
    setShowWingSuggestions(false);
  };

  const handleRemoveWing = (wingToRemove) => {
    setSelectedWings(prev => prev.filter(w => w !== wingToRemove));
  };

  const handleWingKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (wingInput.trim()) {
        handleAddWing(wingInput.trim());
      }
    }
  };

  const isDirty = useMemo(() => {
    if (subject !== initialValues.subject) return true;
    if (ministryId !== initialValues.ministryId) return true;
    if (eofficeFileNumber !== initialValues.eofficeFileNumber) return true;
    if (remarks !== initialValues.remarks) return true;
    if (JSON.stringify(selectedWings) !== JSON.stringify(initialValues.selectedWings)) return true;

    for (let i = 1; i <= 5; i++) {
      if (stages[i].date !== initialValues.stages[i].date) return true;
      if (i !== 3 && stages[i].remark !== initialValues.stages[i].remark) return true;
    }

    return false;
  }, [subject, ministryId, eofficeFileNumber, remarks, selectedWings, stages, initialValues]);

  // Helper to get today's date YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute min/max limits for stage dates & wing dates
  const getDateLimits = (stageNum) => {
    let min = undefined;
    let max = todayStr;

    if (stageNum > 1 && stages[stageNum - 1]?.date) {
      min = stages[stageNum - 1].date;
    }

    return { min, max };
  };

  const isFormValid = useMemo(() => {
    const hasAtLeastOneDate = Object.values(stages).some(st => !!st.date);
    return (
      subject.trim() !== '' &&
      String(ministryId).trim() !== '' &&
      eofficeFileNumber.trim() !== '' &&
      hasAtLeastOneDate
    );
  }, [subject, ministryId, eofficeFileNumber, stages]);

  const handleStageChange = (num, field, val) => {
    setStages(prev => {
      const updated = { ...prev };
      updated[num] = { ...updated[num], [field]: val };

      if (num === 1 && field === 'date' && val) {
        const d = new Date(val);
        d.setDate(d.getDate() + 15);
        setDeadline(d.toISOString().split('T')[0]);
      }

      if (field === 'date' && !val) {
        for (let i = num + 1; i <= 5; i++) {
          updated[i] = i === 3 ? { date: '' } : { date: '', remark: '' };
        }
        if (num !== 3) updated[num].remark = '';
      }

      return updated;
    });
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const validateRemarks = (text) => {
    const wordCount = getWordCount(text);
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
    if (errors[field]) return true;
    if (touched[field]) {
      return !val || (typeof val === 'string' && !val.trim());
    }
    return false;
  };

  const getUserId = () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.user_id || payload.id || 1;
      }
    } catch (e) {
      console.error("Error decoding token:", e);
    }
    return 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ subject: true, ministryId: true, eofficeFileNumber: true });

    if (!isFormValid || errors.remarks) {
      if (triggerNotification) triggerNotification("Please fill in all required mandatory fields correctly.");
      return;
    }

    setSubmitting(true);

    const resolvedMinName = ministryName || (ministries.find(m => String(m.ministry_id) === String(ministryId))?.ministry_name || editData?.ministry_name || 'Department of Atomic Energy');

      let selectedMinistryNotesStage = 1;
      for (let i = 1; i <= 5; i++) {
        if (stages[i]?.date) {
          selectedMinistryNotesStage = i;
        }
      }

      const payload = {
        cabinet_notes_ministry_id: isEdit ? editData.cabinet_notes_ministry_id : undefined,
        ministryCabinetID: isEdit ? editData.cabinet_notes_ministry_id : undefined,
        cabinetSubject: subject,
        subject: subject,
        cabinetMinistryName: ministryId,
        ministry_id: ministryId,
        cabinetMinistryNameText: resolvedMinName,
        eofficeFileNumber: eofficeFileNumber,
        deadline: deadline,
        remarks: remarks,

        receivedMinistryDate: stages[1].date || '',
        receivedMinistryRemarks: stages[1].remark || '',

        sentForCommentDate: stages[2].date || '',
        sentForCommentsRemarks: stages[2].remark || '',
        wings: selectedWings.map(wName => {
          const found = wingsList.find(w => w.wing_name === wName);
          return found ? found.wing_id : wName;
        }).filter(Boolean),

        commentsReceivedDate: stages[3].date || '',
        commentsRecRemarks: stages[3].remark || '',

        fileSubmittedDate: stages[4].date || '',
        fileSubmittedRemarks: stages[4].remark || '',

        replyFurnishedDate: stages[5].date || '',
        replyFurnishedRemarks: stages[5].remark || '',

        shippingDate: wingDetails.Shipping?.date || '',
        shippingRemarks: wingDetails.Shipping?.remark || '',
        vigilanceDate: wingDetails.Vigilance?.date || '',
        vigilanceRemarks: wingDetails.Vigilance?.remark || '',
        portsDate: wingDetails.Ports?.date || '',
        portsRemarks: wingDetails.Ports?.remark || '',
        iwtDate: wingDetails.IWT?.date || '',
        iwtRemarks: wingDetails.IWT?.remark || '',
        administrationDate: wingDetails.Administration?.date || '',
        administrationRemarks: wingDetails.Administration?.remark || '',
        coordIDate: wingDetails['Coord-I']?.date || '',
        coordIRemarks: wingDetails['Coord-I']?.remark || '',
        coordIIDate: wingDetails['Coord-II']?.date || '',
        coordIIRemarks: wingDetails['Coord-II']?.remark || '',
        dgllDate: wingDetails['DGLL, Parliament & TRW']?.date || '',
        dgllRemarks: wingDetails['DGLL, Parliament & TRW']?.remark || '',
        developmentDate: wingDetails.Development?.date || '',
        developmentRemarks: wingDetails.Development?.remark || '',
        financeDate: wingDetails.Finance?.date || '',
        financeRemarks: wingDetails.Finance?.remark || '',
        sagarmalaDate: wingDetails.Sagarmala?.date || '',
        sagarmalaRemarks: wingDetails.Sagarmala?.remark || '',

        selectedMinistryNotesStage,
        userID: getUserId()
      };

    try {
      if (isEdit) {
        await axios.put("http://localhost:3000/cabinet-ministry", payload);
      } else {
        await axios.post("http://localhost:3000/cabinet-ministry", payload);
      }
      if (triggerNotification) {
        triggerNotification(isEdit ? "Cabinet Note updated successfully." : "Cabinet Note created successfully.");
      }
      onSuccess();
    } catch (err) {
      console.error("Save error details:", err.response?.data || err.message || err);
      alert(err.response?.data?.error || "Failed to save Cabinet Note. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      
      {/* Header Banner matching CabinetNotesMOPSW */}
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {readOnly ? "View Cabinet Notes-Other Ministry (Read-only)" : isEdit ? "Update Cabinet Notes-Other Ministry" : "Add Cabinet Notes-Other Ministry"}
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

          {/* Left Panel: Stationary inputs stacked vertically */}
          <div className="lg:col-span-5 space-y-4 pr-0 lg:pr-2">

            {/* Subject Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Name of the Subject*</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onBlur={() => handleBlur('subject')}
                placeholder="Enter subject name"
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('subject', subject) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {isFieldInvalid('subject', subject) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* Ministry Name Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Name of the Ministry*</label>
              <select
                value={ministryId}
                onChange={e => {
                  const id = e.target.value;
                  setMinistryId(id);
                  const min = ministries.find(m => String(m.ministry_id) === String(id));
                  setMinistryName(min ? min.ministry_name : '');
                }}
                onBlur={() => handleBlur('ministryId')}
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('ministryId', ministryId) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer`}
              >
                <option value="">--Select Ministry--</option>
                {ministries.map(m => (
                  <option key={m.ministry_id} value={m.ministry_id}>{m.ministry_name}</option>
                ))}
              </select>
              {isFieldInvalid('ministryId', ministryId) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* E-Office File Number Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">E-Office File Number*</label>
              <input
                type="text"
                value={eofficeFileNumber}
                onChange={e => setEofficeFileNumber(e.target.value)}
                onBlur={() => handleBlur('eofficeFileNumber')}
                placeholder="Enter file number"
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('eofficeFileNumber', eofficeFileNumber) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {isFieldInvalid('eofficeFileNumber', eofficeFileNumber) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* Deadline Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Deadline</label>
              <input
                type="date"
                value={deadline}
                readOnly
                onChange={e => setDeadline(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* General Remarks Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">General Remarks (Max 250 words)</label>
                <span className={`text-[10px] font-bold ${getWordCount(remarks) > 250 ? 'text-red-500' : 'text-slate-400'}`}>
                  {getWordCount(remarks)} / 250 words
                </span>
              </div>
              <textarea
                value={remarks}
                onChange={e => { setRemarks(e.target.value); validateRemarks(e.target.value); }}
                onBlur={() => handleBlur('remarks')}
                rows={4}
                placeholder="Enter remarks..."
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.remarks ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {errors.remarks && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.remarks}</p>}
            </div>

          </div>

          {/* Right Panel: Scrollable Stages list matching CabinetNotesMOPSW */}
          <div
            className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950"
            style={{ maxHeight: '520px' }}
          >
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
              Stages Checklist & Dates
            </h4>

            <div className="space-y-3.5">
              {[1, 2, 3, 4, 5].map((stageNum) => {
                const currentStage = stages[stageNum];
                const isStageDisabled = !isEdit && stageNum > 1 && !stages[stageNum - 1].date;
                const isRemarkFieldVisible = stageNum === focusedStage || !!currentStage.date;

                return (
                  <div
                    key={stageNum}
                    className={`flex flex-col gap-3 p-3 border rounded-xl shadow-xs transition-all duration-200 ${isStageDisabled
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
                        <input
                          type="date"
                          value={currentStage.date}
                          min={getDateLimits(stageNum).min}
                          max={getDateLimits(stageNum).max}
                          onChange={e => handleStageChange(stageNum, 'date', e.target.value)}
                          onFocus={() => !isStageDisabled && !readOnly && setFocusedStage(stageNum)}
                          onBlur={() => setFocusedStage(null)}
                          disabled={isStageDisabled || readOnly}
                          className={`text-xs px-2.5 py-1.5 border rounded-lg focus:outline-none font-semibold dark:[color-scheme:dark] ${(isStageDisabled || readOnly)
                            ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-white border-slate-200 text-slate-700 cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 focus:border-[#0f417a]'
                            }`}
                        />
                      </div>
                    </div>

                    {/* Stage 2: Concerned wings multi-select dropdown & tag pool */}
                    {stageNum === 2 && !isStageDisabled && (
                      <div
                        className={`transition-all duration-300 ease-in-out origin-top ${isRemarkFieldVisible
                          ? 'opacity-100 mt-1 scale-y-100'
                          : 'max-h-0 opacity-0 scale-y-95 pointer-events-none'
                          }`}
                      >
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                            SELECT CONCERNED WINGS*
                          </label>

                          {/* Multi-select Dropdown */}
                          {!readOnly && (
                            <select
                              value=""
                              onChange={e => {
                                if (e.target.value) {
                                  handleAddWing(e.target.value);
                                }
                              }}
                              onFocus={() => setFocusedStage(2)}
                              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-[#0f417a] rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                              <option value="">--Select Wing--</option>
                              {(wingsList.length > 0 ? wingsList.map(w => w.wing_name) : COMMON_WINGS)
                                .filter(w => !selectedWings.includes(w))
                                .map(w => (
                                  <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                          )}

                          {/* Selected Wing Tag Pills matching YoungProfessionals style */}
                          {selectedWings.length > 0 && (
                            <div className="space-y-2.5 mt-2">
                              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl">
                                {selectedWings.map(w => (
                                  <span
                                    key={w}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#fdfcfc] dark:bg-blue-950/40 text-[#0f417a] dark:text-blue-300 border border-[#eadede] dark:border-blue-900/30 rounded-lg text-[11px] font-black uppercase shadow-2xs"
                                  >
                                    <span>{w}</span>
                                    {!readOnly && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveWing(w)}
                                        className="hover:text-red-500 font-black cursor-pointer ml-1"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>

                              {/* Animated Wing-specific Date & Remark Input Fields with Scrollability */}
                              <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 block mb-1">
                                  CONCERNED WINGS DATES & REMARKS
                                </span>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                  {selectedWings.map(wName => (
                                    <div
                                      key={wName}
                                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-2xs animate-fade-in transition-all duration-300"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-[#0f417a] dark:text-blue-400">{wName} Wing</span>
                                        {!readOnly && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveWing(wName)}
                                            className="text-slate-400 hover:text-red-500 text-[10px] font-bold"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Comments Date</label>
                                          <input
                                            type="date"
                                            disabled={readOnly}
                                            value={wingDetails[wName]?.date || ''}
                                            min={getDateLimits(2).min}
                                            max={getDateLimits(2).max}
                                            onChange={e => setWingDetails(prev => ({
                                              ...prev,
                                              [wName]: { ...(prev[wName] || { remark: '' }), date: e.target.value }
                                            }))}
                                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-semibold dark:text-slate-200 dark:[color-scheme:dark] cursor-pointer"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Remarks</label>
                                          <input
                                            type="text"
                                            disabled={readOnly}
                                            value={wingDetails[wName]?.remark || ''}
                                            onChange={e => setWingDetails(prev => ({
                                              ...prev,
                                              [wName]: { ...(prev[wName] || { date: '' }), remark: e.target.value }
                                            }))}
                                            placeholder={`Add remarks for ${wName}...`}
                                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stages 1, 3, 4, 5: Stage-specific remarks */}
                    {stageNum !== 2 && !isStageDisabled && (
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
                            value={currentStage.remark || ''}
                            onChange={e => handleStageChange(stageNum, 'remark', e.target.value)}
                            onFocus={() => !readOnly && setFocusedStage(stageNum)}
                            onBlur={() => setFocusedStage(null)}
                            disabled={readOnly}
                            className="w-full text-[11px] px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-medium text-slate-700 dark:text-slate-300 placeholder-slate-400"
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

        {/* Submit Bar matching CabinetNotesMOPSW */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
          {!readOnly && (
            <button
              type="submit"
              disabled={submitting || !isFormValid || (isEdit && !isDirty)}
              className={`flex items-center space-x-2 text-xs transition px-5 py-2.5 rounded-xl font-bold tracking-wider uppercase ${(submitting || !isFormValid || (isEdit && !isDirty))
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-[#0f417a] text-white hover:bg-blue-800 cursor-pointer'
                }`}
            >
              <Save className="h-4 w-4" />
              <span>{isEdit ? "Update Note" : "Save Cabinet Note"}</span>
            </button>
          )}
        </div>
      </form>

    </div>
  );
}
