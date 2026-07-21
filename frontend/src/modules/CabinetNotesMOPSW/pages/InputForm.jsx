import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, Upload, FileText } from 'lucide-react';

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

const stageLabels = {
  1: '1. Preliminary DCN Prepared',
  2: '2. Preliminary DCN Approved by Minister',
  3: '3. Circulated for IMC',
  4: '4. IMC Comments Received',
  5: '5. Final DCN to be Prepared',
  6: '6. Final DCN Approved by Minister',
  7: '7. Has Dcm been approved?',
  8: '8. Advance Copy Sent to PMO & Cab',
  9: '9. Approved by Cabinet',
  10: '10. On Hold',
  11: '11. Completed'
};

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
  const [submitting, setSubmitting] = useState(false);

  // Document states
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [noteDocs, setNoteDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Left-side fields
  const [wing, setWing] = useState('');
  const [division, setDivision] = useState('');
  const [subject, setSubject] = useState('');
  const [remarks, setRemarks] = useState('');

  // Touched states for validations
  const [touched, setTouched] = useState({
    subject: false,
    wing: false,
    division: false,
    remarks: false
  });

  // Track initial values for dirty checks
  const [initialValues, setInitialValues] = useState({
    subject: '',
    wing: '',
    division: '',
    remarks: '',
    stages: {
      1: { date: '', remark: '' },
      2: { date: '', remark: '' },
      3: { date: '', remark: '' },
      4: { date: '', remark: '' },
      5: { date: '', remark: '' },
      6: { date: '', remark: '' },
      7: { date: '', remark: '' },
      8: { date: '', remark: '' },
      9: { date: '', remark: '' },
      10: { date: '', remark: '' },
      11: { date: '', remark: '' }
    },
    selectedFile: null
  });

  // Track currently focused stage
  const [focusedStage, setFocusedStage] = useState(null);
  const [hoveredStage, setHoveredStage] = useState(null);

  // Right-side stages fields (1 to 11)
  const [stages, setStages] = useState({
    1: { date: '', remark: '' },
    2: { date: '', remark: '' },
    3: { date: '', remark: '' },
    4: { date: '', remark: '' },
    5: { date: '', remark: '' },
    6: { date: '', remark: '' },
    7: { date: '', remark: '' },
    8: { date: '', remark: '' },
    9: { date: '', remark: '' },
    10: { date: '', remark: '' },
    11: { date: '', remark: '' }
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDocumentName('');
    setSelectedFile(null);
    setUploadProgress(0);
    setNoteDocs([]);

    let initSubject = '';
    let initWing = '';
    let initDivision = '';
    let initRemarks = '';
    let initStages = {
      1: { date: '', remark: '' },
      2: { date: '', remark: '' },
      3: { date: '', remark: '' },
      4: { date: '', remark: '' },
      5: { date: '', remark: '' },
      6: { date: '', remark: '' },
      7: { date: '', remark: '' },
      8: { date: '', remark: '' },
      9: { date: '', remark: '' },
      10: { date: '', remark: '' },
      11: { date: '', remark: '' }
    };

    if (editData) {
      initSubject = editData.subject || '';
      initWing = editData.wing || '';
      initDivision = editData.division || '';
      initRemarks = editData.remarks || '';

      const fetchDocs = async () => {
        setLoadingDocs(true);
        try {
          const res = await axios.get(`http://localhost:3000/mopsw-document/${editData.cabinet_notes_mopsw_id}`);
          setNoteDocs(res.data || []);
        } catch (err) {
          console.error("Error loading note documents:", err);
        } finally {
          setLoadingDocs(false);
        }
      };
      fetchDocs();

      initStages = {
        1: { date: editData.pre_dcn_prepared_date ? editData.pre_dcn_prepared_date.split('T')[0] : '', remark: editData.pre_dcn_prepared_remarks || '' },
        2: { date: (editData.pre_dcn_approved_date || editData.pre_dcn__approved_date) ? (editData.pre_dcn_approved_date || editData.pre_dcn__approved_date).split('T')[0] : '', remark: editData.pre_dcn_approved_remarks || editData.pre_dcn__approved_remarks || '' },
        3: { date: (editData.circulated_for_imc_date || editData.cirucalted_for_imc_date) ? (editData.circulated_for_imc_date || editData.cirucalted_for_imc_date).split('T')[0] : '', remark: editData.circulated_for_imc_remarks || editData.cirucalted_for_imc_remarks || '' },
        4: { date: editData.imc_comments_rec_date ? editData.imc_comments_rec_date.split('T')[0] : '', remark: editData.imc_comments_rec_remarks || '' },
        5: { date: editData.final_dcn_prepared_date ? editData.final_dcn_prepared_date.split('T')[0] : '', remark: editData.final_dcn_prepared_remarks || '' },
        6: { date: editData.final_dcn_approved_date ? editData.final_dcn_approved_date.split('T')[0] : '', remark: editData.final_dcn_approved_remarks || '' },
        7: { date: (editData.dcm_been_approved_date || editData.dcmbeen_approved_date) ? (editData.dcm_been_approved_date || editData.dcmbeen_approved_date).split('T')[0] : '', remark: editData.dcm_been_approved_remarks || editData.dcmbeen_approved_remarks || '' },
        8: { date: editData.advance_copy_sent_to_pmo_date ? editData.advance_copy_sent_to_pmo_date.split('T')[0] : '', remark: editData.advance_copy_sent_to_pmo_remarks || '' },
        9: { date: editData.cabinet_approved_date ? editData.cabinet_approved_date.split('T')[0] : '', remark: editData.cabinet_approved_remarks || '' },
        10: { date: editData.on_hold_date ? editData.on_hold_date.split('T')[0] : '', remark: editData.on_hold_remarks || '' },
        11: { date: editData.completed_date ? editData.completed_date.split('T')[0] : '', remark: editData.completed_remarks || '' }
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
      stages: initStages,
      selectedFile: null
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
    if (selectedFile !== initialValues.selectedFile) return true;

    for (let i = 1; i <= 11; i++) {
      if (stages[i].date !== initialValues.stages[i].date) return true;
      if (stages[i].remark !== initialValues.stages[i].remark) return true;
    }

    return false;
  }, [subject, wing, division, remarks, selectedFile, stages, initialValues]);

  // Helper to get today's date YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute min/max limits for stage dates
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
      String(wing).trim() !== '' &&
      String(division).trim() !== '' &&
      remarks.trim() !== '' &&
      hasAtLeastOneDate
    );
  }, [subject, wing, division, remarks, stages]);

  const handleStageChange = (num, field, val) => {
    setStages(prev => {
      const updated = { ...prev };
      updated[num] = {
        ...updated[num],
        [field]: val
      };

      // If we clear a date, we also clear all subsequent dates and remarks
      if (field === 'date' && !val) {
        for (let i = num + 1; i <= 11; i++) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      subject: true,
      wing: true,
      division: true
    });

    if (!wing || !division || !subject.trim()) {
      alert("Please fill in all mandatory fields highlighted in red.");
      return;
    }
    if (errors.remarks) {
      alert(errors.remarks);
      return;
    }

    setSubmitting(true);

    const token = localStorage.getItem('accessToken');
    let activeUserId = 1;
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.userId) {
        activeUserId = decoded.userId;
      }
    }

    // Determine selectedCabinetNotesStage: highest stage number that has a date filled
    let selectedCabinetNotesStage = 1;
    for (let i = 1; i <= 11; i++) {
      if (stages[i].date) {
        selectedCabinetNotesStage = i;
      }
    }

    const payload = {
      subject,
      wing,
      division,
      remarks: remarks.trim(),
      selectedCabinetNotesStage,
      userID: activeUserId,

      preliDcnPreparedDate: stages[1].date || '',
      preliDcnPreparedRemark: stages[1].remark || '',

      preliDcnApprovedDate: stages[2].date || '',
      preliDcnApprovedRemark: stages[2].remark || '',

      circulatedForImcDate: stages[3].date || '',
      circulatedForImcRemark: stages[3].remark || '',

      imcCommentsRecDate: stages[4].date || '',
      imcCommentsRecRemark: stages[4].remark || '',

      finalDcnPreparedDate: stages[5].date || '',
      finalDcnPreparedRemark: stages[5].remark || '',

      finalDcnApprovedDate: stages[6].date || '',
      finalDcnApprovedRemark: stages[6].remark || '',

      dcmbeenApprovedDate: stages[7].date || '',
      dcmbeenApprovedRemark: stages[7].remark || '',

      advanceCopySentToPmoDate: stages[8].date || '',
      advanceCopySentToPmoRemark: stages[8].remark || '',

      cabinetApprovedDate: stages[9].date || '',
      cabinetApprovedRemark: stages[9].remark || '',

      onHoldDate: stages[10].date || '',
      onHoldRemark: stages[10].remark || '',

      completedDate: stages[11].date || '',
      completedRemark: stages[11].remark || ''
    };

    try {
      let notesId = null;
      if (isEdit) {
        payload.mopswCabinetID = editData.cabinet_notes_mopsw_id;
        await axios.put("http://localhost:3000/cabinet-mopsw", payload);
        notesId = editData.cabinet_notes_mopsw_id;
      } else {
        const res = await axios.post("http://localhost:3000/cabinet-mopsw", payload);
        notesId = res.data.cabinet_notes_mopsw_id;
      }

      if (selectedFile) {
        const formData = new FormData();
        formData.append("files[]", selectedFile);
        formData.append("cabinetNotesMopswID", notesId);

        await axios.post("http://localhost:3000/mopsw-document-uploader", formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
      }

      if (triggerNotification) {
        triggerNotification(isEdit ? "Cabinet Note updated successfully." : "Cabinet Note created successfully.");
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to save Cabinet Note. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {readOnly ? "View Cabinet Notes-MoPSW (Read-only)" : isEdit ? "Update Cabinet Notes-MoPSW" : "Add Cabinet Notes-MoPSW"}
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

            {/* Wing Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Wing*</label>
              <select
                value={wing}
                onChange={e => setWing(e.target.value)}
                onBlur={() => handleBlur('wing')}
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('wing', wing) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer`}
              >
                <option value="">--Select Wing--</option>
                {wings.map(w => (
                  <option key={w.wing_id} value={w.wing_id}>{w.wing_name}</option>
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
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('division', division) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 cursor-pointer`}
              >
                <option value="">--Select Division--</option>
                {divisions.map(d => (
                  <option key={d.division_id} value={d.division_id}>{d.division_name}</option>
                ))}
              </select>
              {isFieldInvalid('division', division) && (
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
                rows={4}
                placeholder="Enter remarks..."
                disabled={readOnly}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${isFieldInvalid('remarks', remarks) || errors.remarks ? 'border-red-500 focus:border-red-500' : 'border-slate-250 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200`}
              />
              {isFieldInvalid('remarks', remarks) && (
                <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
              )}
              {errors.remarks && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.remarks}</p>}
            </div>

            {/* Document Upload Area */}
            {!readOnly && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Upload Cabinet Note Document</label>
                <div className="flex items-center justify-center border-2 border-dashed border-slate-250 dark:border-slate-800 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition cursor-pointer relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                          alert("Invalid file type. Only PDF files are allowed.");
                          e.target.value = '';
                          setDocumentName('');
                          setSelectedFile(null);
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          alert("File size exceeds 10 MB. Please choose a smaller file.");
                          e.target.value = '';
                          setDocumentName('');
                          setSelectedFile(null);
                          return;
                        }
                        setDocumentName(file.name);
                        setSelectedFile(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-center space-y-1">
                    <Upload className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Upload PDF file</p>
                    <p className="text-[9px] text-slate-400 font-semibold">(Only PDF under 10 MB is allowed)</p>
                    {documentName && (
                      <p className="text-[11px] font-black text-emerald-600">Selected: {documentName}</p>
                    )}
                  </div>
                </div>

                {uploadProgress > 0 && (
                  <div className="w-full mt-2 space-y-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#0f417a] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-500">
                      Uploading: {uploadProgress}%
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List of existing documents */}
            {isEdit && noteDocs.length > 0 && (
              <div className="space-y-1.5 mt-3">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Uploaded Documents</p>
                <div className="space-y-1">
                  {noteDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <a
                        href={`http://localhost:3000/cabinet_notes_mopsw/download/${editData.cabinet_notes_mopsw_id}?file=${encodeURIComponent(doc.cabinet_notes_mopsw_document)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 font-bold text-[#0f417a] dark:text-blue-400 hover:underline"
                      >
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[200px]" title={doc.cabinet_notes_mopsw_document}>
                          {doc.cabinet_notes_mopsw_document}
                        </span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Scrollable Stages list */}
          <div
            className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950"
            style={{ maxHeight: `${Math.max(480, 480 + noteDocs.length * 32)}px` }}
          >
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
              Stages Checklist & Dates
            </h4>
            <div className="space-y-3.5">
              {Object.keys(stageLabels).map((key) => {
                const stageNum = Number(key);
                const currentStage = stages[stageNum];

                // Enforce sequential filling only when adding a new note (not editing)
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

                    {/* Dynamically reveal Stage Remark field with transition animation */}
                    {!isStageDisabled && (
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
                            value={currentStage.remark}
                            onChange={e => handleStageChange(stageNum, 'remark', e.target.value)}
                            onFocus={() => !readOnly && setFocusedStage(stageNum)}
                            onBlur={() => setFocusedStage(null)}
                            disabled={readOnly}
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
