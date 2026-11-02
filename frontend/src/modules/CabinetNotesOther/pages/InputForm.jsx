import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import { createCabinetMinistry, updateCabinetMinistry } from '../api';
import { useCabinetNotesOtherStore } from '../store/useCabinetNotesOtherStore';

// Wings that have their own date/remarks columns (backend: cabinetNotesMinistryFields.js).
// name: mmt_wings.wing_name; column: <column>_date/_remarks on the note; key: <key>Date/<key>Remarks in the request
const WING_FIELDS = [
  { name: 'Shipping', column: 'shipping', key: 'shipping' },
  { name: 'Vigilance', column: 'vigilance', key: 'vigilance' },
  { name: 'Ports', column: 'ports', key: 'ports' },
  { name: 'IWT', column: 'iwt', key: 'iwt' },
  { name: 'Administration', column: 'administration', key: 'administration' },
  { name: 'Coord-I', column: 'coord_I', key: 'coordI' },
  { name: 'Coord-II', column: 'coord_II', key: 'coordII' },
  { name: 'DGLL, Parliament & TRW', column: 'dgll_parliament_and_trw', key: 'dgll' },
  { name: 'Development', column: 'development', key: 'development' },
  { name: 'Finance', column: 'finance', key: 'finance' },
  { name: 'Sagarmala', column: 'sagarmala', key: 'sagarmala' },
  { name: 'Information Technology', column: 'information_technology', key: 'informationTechnology' },
  { name: 'Office of Economic Advisor', column: 'office_of_economic_advisor', key: 'economicAdvisor' },
  { name: 'Special Initiatives & Projects', column: 'special_initiatives_and_projects', key: 'specialInitiatives' },
  { name: 'ALHW & Media', column: 'alhw_and_media', key: 'alhwMedia' }
];

// Column sizes in tbl_cabinet_notes_ministry
const MAX_TEXT = 256;
const MAX_REMARK = 250;

const toDateInput = (value) => (value ? String(value).split('T')[0] : '');
const toLocalDateInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Shown until the stage master has loaded
const stageLabels = {
  1: '1. Received at Ministry',
  2: '2. Sent for Comments',
  3: '3. Comments Received',
  4: '4. File Submitted for Approval',
  5: '5. Reply Furnished to Other Ministry'
};

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

  // Trimmed so names match the wingDetails keys (the master has 'Sagarmala ' with a trailing space)
  const wings = useMemo(
    () => wingsList.map(w => ({ ...w, wing_name: String(w.wing_name || '').trim() })),
    [wingsList]
  );
  // Ministry master, loaded once by the module shell
  const ministries = useCabinetNotesOtherStore((state) => state.ministries);
  // Stage names from the stage master (mmt_cabinet_ministry_stage)
  const stageMaster = useCabinetNotesOtherStore((state) => state.stages);
  const stageName = (n) => {
    const row = stageMaster.find((r) => Number(r.cab_ministry_stage_id) === n);
    return row ? `${n}. ${row.cab_ministry_stage_name}` : stageLabels[n];
  };

  // Basic Left Panel States
  const [subject, setSubject] = useState('');
  const [ministryId, setMinistryId] = useState('');
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
  const [selectedWings, setSelectedWings] = useState([]);

  // Wing-wise dates & remarks state
  const [wingDetails, setWingDetails] = useState(
    () => Object.fromEntries(WING_FIELDS.map(w => [w.name, { date: '', remark: '' }]))
  );


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
    let initSubject = '';
    let initMinId = '';
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
      initFileNo = editData.eoffice_file_number || '';
      initDeadline = editData.deadline ? editData.deadline.split('T')[0] : '';
      initRemarks = editData.remarks || '';

      if (editData.sent_for_comments_wings) {
        const rawWings = editData.sent_for_comments_wings.split(',').map(s => s.trim()).filter(Boolean);
        initWings = rawWings.map(item => {
          if (!isNaN(item)) {
            const found = wings.find(w => String(w.wing_id) === String(item));
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
    }

    const initWingDetails = Object.fromEntries(WING_FIELDS.map(w => [w.name, {
      date: toDateInput(editData?.[`${w.column}_date`]),
      remark: editData?.[`${w.column}_remarks`] || ''
    }]));

    setWingDetails(initWingDetails);

    setSubject(initSubject);
    setMinistryId(initMinId);
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
      stages: initStages,
      wingDetails: initWingDetails
    });

    setTouched({});
    setErrors({});
  }, [editData, wings, ministries]);

  const handleAddWing = (wingName) => {
    if (wingName && !selectedWings.includes(wingName)) {
      setSelectedWings(prev => [...prev, wingName]);
    }
  };

  const handleRemoveWing = (wingToRemove) => {
    setSelectedWings(prev => prev.filter(w => w !== wingToRemove));
  };

  const isDirty = useMemo(() => {
    if (subject !== initialValues.subject) return true;
    if (ministryId !== initialValues.ministryId) return true;
    if (eofficeFileNumber !== initialValues.eofficeFileNumber) return true;
    if (remarks !== initialValues.remarks) return true;
    if (JSON.stringify(selectedWings) !== JSON.stringify(initialValues.selectedWings)) return true;

    for (let i = 1; i <= 5; i++) {
      if (stages[i]?.date !== initialValues.stages[i]?.date) return true;
      if (stages[i]?.remark !== initialValues.stages[i]?.remark) return true;
    }

    for (const w of Object.keys(wingDetails)) {
      if (wingDetails[w]?.date !== initialValues.wingDetails?.[w]?.date) return true;
      if (wingDetails[w]?.remark !== initialValues.wingDetails?.[w]?.remark) return true;
    }

    return false;
  }, [subject, ministryId, eofficeFileNumber, remarks, selectedWings, stages, wingDetails, initialValues]);

  // Today's local date as YYYY-MM-DD (toISOString is UTC, which is still yesterday before 05:30 IST)
  const todayStr = useMemo(() => toLocalDateInput(new Date()), []);

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
        // Deadline is 15 days after the note was received
        const [y, m, d] = val.split('-').map(Number);
        setDeadline(toLocalDateInput(new Date(y, m - 1, d + 15)));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ subject: true, ministryId: true, eofficeFileNumber: true });

    if (!isFormValid || errors.remarks) {
      triggerNotification?.("Please fill in all required mandatory fields correctly.", 'error');
      return;
    }

    setSubmitting(true);

    // The backend takes created_by/updated_by from the token, the ministry name from the
    // master and the current stage from the latest stage date
    const payload = {
      ministryCabinetID: isEdit ? editData.cabinet_notes_ministry_id : undefined,
      cabinetSubject: subject,
      cabinetMinistryName: ministryId,
      eofficeFileNumber: eofficeFileNumber,
      deadline: deadline,
      remarks: remarks,

      receivedMinistryDate: stages[1]?.date || '',
      receivedMinistryRemarks: stages[1]?.remark || '',
      sentForCommentDate: stages[2]?.date || '',
      sentForCommentsRemarks: stages[2]?.remark || '',
      commentsReceivedDate: stages[3]?.date || '',
      commentsRecRemarks: stages[3]?.remark || '',
      fileSubmittedDate: stages[4]?.date || '',
      fileSubmittedRemarks: stages[4]?.remark || '',
      replyFurnishedDate: stages[5]?.date || '',
      replyFurnishedRemarks: stages[5]?.remark || '',

      // Wing ids from the master
      wings: selectedWings
        .map(wName => wings.find(w => w.wing_name === wName)?.wing_id)
        .filter(id => id !== undefined)
    };
    for (const w of WING_FIELDS) {
      payload[`${w.key}Date`] = wingDetails[w.name]?.date || '';
      payload[`${w.key}Remarks`] = wingDetails[w.name]?.remark || '';
    }

    try {
      if (isEdit) {
        await updateCabinetMinistry(payload);
      } else {
        await createCabinetMinistry(payload);
      }
      if (triggerNotification) {
        triggerNotification(isEdit ? "Cabinet Note updated successfully." : "Cabinet Note created successfully.");
      }
      onSuccess();
    } catch (err) {
      console.error("Save error details:", err.response?.data || err.message || err);
      // Backend 400s (e.g. "Please select a valid ministry.") carry a user-facing message
      triggerNotification?.(err.response?.data?.error || "Failed to save Cabinet Note. Please try again.", 'error');
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
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Name of the Subject<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onBlur={() => handleBlur('subject')}
                maxLength={MAX_TEXT}
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
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Name of the Ministry<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={ministryId}
                onChange={e => {
                  const id = e.target.value;
                  setMinistryId(id);
                }}
                onBlur={() => handleBlur('ministryId')}
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('ministryId', ministryId) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer`}
              >
                <option value="">--Select Ministry--</option>
                {ministries.map(m => {
                  const cleanedName = String(m.ministry_name || '').split(',').map(s => s.trim()).filter(Boolean).filter((item, pos, self) => self.indexOf(item) === pos).join(' / ') || m.ministry_name;
                  return (
                    <option key={m.ministry_id} value={m.ministry_id}>{cleanedName}</option>
                  );
                })}
              </select>
              {isFieldInvalid('ministryId', ministryId) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
            </div>

            {/* E-Office File Number Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                E-Office File Number<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={eofficeFileNumber}
                onChange={e => setEofficeFileNumber(e.target.value)}
                onBlur={() => handleBlur('eofficeFileNumber')}
                maxLength={MAX_TEXT}
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
                const isStageDisabled = stageNum > 1 && !stages[stageNum - 1]?.date;
                const isFilled = !!currentStage?.date;

                return (
                  <div
                    key={stageNum}
                    className={`flex flex-col py-3 px-4 rounded-xl border transition-all ${isStageDisabled
                      ? 'bg-slate-100/60 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/40 opacity-50'
                      : isFilled
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold block truncate ${isStageDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {stageName(stageNum)}
                        </span>
                        {isStageDisabled && (
                          <span className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-400/80 italic">
                            (Complete stage {stageNum - 1} first)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        {/* Date Input */}
                        <input
                          type="date"
                          value={currentStage.date}
                          min={getDateLimits(stageNum).min}
                          max={getDateLimits(stageNum).max}
                          onChange={e => handleStageChange(stageNum, 'date', e.target.value)}
                          disabled={isStageDisabled || readOnly}
                          className={`text-xs px-2.5 py-1.5 border rounded-lg focus:outline-none font-semibold dark:[color-scheme:dark] ${(isStageDisabled || readOnly)
                            ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-white border-slate-200 text-slate-700 cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 focus:border-[#0f417a]'
                            }`}
                        />
                      </div>
                    </div>

                    {/* Stage-specific optional remark field matching CabinetNotesMOPSW */}
                    {!isStageDisabled && !!currentStage.date && (
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                        <input
                          type="text"
                          placeholder="Add stage-specific remark (optional)"
                          maxLength={MAX_REMARK}
                          value={currentStage.remark || ''}
                          onChange={e => handleStageChange(stageNum, 'remark', e.target.value)}
                          disabled={readOnly}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:bg-white font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                    )}

                    {/* Stage 2: Concerned wings multi-select dropdown & tag pool */}
                    {stageNum === 2 && !isStageDisabled && (
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                          SELECT CONCERNED WINGS<span className="text-red-500 font-bold ml-0.5">*</span>
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
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 focus:border-[#0f417a] rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <option value="">--Select Wing--</option>
                            {/* Only wings that have their own date/remarks columns in tbl_cabinet_notes_ministry */}
                            {wings.map(w => w.wing_name)
                              .filter(w => w in wingDetails && !selectedWings.includes(w))
                              .map(w => (
                                <option key={w} value={w}>{w}</option>
                              ))}
                          </select>
                        )}

                        {/* Selected Wing Tag Pills */}
                        {selectedWings.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl mt-1">
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
                        )}
                      </div>
                    )}

                    {/* Stage 3: Wing-wise Received Dates & Remarks */}
                    {stageNum === 3 && !isStageDisabled && selectedWings.length > 0 && (
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider block">
                          CONCERNED WINGS RECEIVED DATES & REMARKS
                        </span>
                        <div className="space-y-2">
                          {selectedWings.filter(wName => wName in wingDetails).map(wName => {
                            const wingDate = wingDetails[wName]?.date || '';
                            const wingRemark = wingDetails[wName]?.remark || '';

                            return (
                              <div
                                key={wName}
                                className="flex flex-col gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-[#0f417a] dark:text-blue-400 min-w-[110px]">
                                    {wName}
                                  </span>

                                  <div className="flex items-center space-x-3">
                                    {/* Date Input */}
                                    <input
                                      type="date"
                                      disabled={readOnly}
                                      value={wingDate}
                                      min={getDateLimits(3).min}
                                      max={getDateLimits(3).max}
                                      onChange={e => setWingDetails(prev => ({
                                        ...prev,
                                        [wName]: { ...(prev[wName] || {}), date: e.target.value }
                                      }))}
                                      className="text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-semibold text-slate-700 dark:text-slate-200 dark:[color-scheme:dark] cursor-pointer"
                                    />
                                  </div>
                                </div>

                                {/* Wing-specific optional remark field */}
                                {!!wingDate && (
                                  <div className="border-t border-slate-200 dark:border-slate-700/60 pt-1.5">
                                    <input
                                      type="text"
                                      placeholder={`Add remark for ${wName} (optional)`}
                                      maxLength={MAX_REMARK}
                                      disabled={readOnly}
                                      value={wingRemark}
                                      onChange={e => setWingDetails(prev => ({
                                        ...prev,
                                        [wName]: { ...(prev[wName] || {}), remark: e.target.value }
                                      }))}
                                      className="w-full text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-700 dark:text-slate-200"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>
          {!readOnly && (
            <div className="flex items-center space-x-3">
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
            </div>
          )}
        </div>
      </form>

    </div>
  );
}
