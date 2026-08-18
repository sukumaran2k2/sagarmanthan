import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Upload, File, FileText, CheckCircle, ChevronUp, ChevronDown, X } from 'lucide-react';
import {
  createConsultantAppointment,
  updateConsultantAppointment,
  fetchCandidateDetail,
  fetchCandidateDocument,
  fetchCandidatesByConsultantAppointmentId,
  addCandidateDetail,
  updateCandidateDetail,
  uploadCandidateDocument,
  addConsultantID
} from '../api';
import { getCurrentUserId } from '../../../utils/authSession';

/**
 * Milestone Workflow Configuration
 * Maps stage keys to labels, date state keys, and date field labels
 */
const STAGES = [
  { key: 'adminApproval', label: 'Admin Approval for engaging Consultant', dateKey: 'adminApprovalDate', dateLabel: 'Date of Approval*' },
  { key: 'tenderPublished', label: 'Tender Published', dateKey: 'tenderPublishedDate', dateLabel: 'Date Published*' },
  { key: 'preBidQueries', label: 'Pre-bid Queries Responded', dateKey: 'preBidQueriesDate', dateLabel: 'Date of Response*' },
  { key: 'bidReceived', label: 'Bid Received', dateKey: 'bidReceivedDate', dateLabel: 'Date Received*' },
  { key: 'techBidFinalized', label: 'Technical Bid Finalized', dateKey: 'techBidFinalizedDate', dateLabel: 'Date of Finalization*' },
  { key: 'finBidFinalized', label: 'Financial Bid Finalized', dateKey: 'finBidFinalizedDate', dateLabel: 'Date of Finalization*' },
  { key: 'workOrderIssued', label: 'Work Order Issued', dateKey: 'workOrderIssuedDate', dateLabel: 'Date of Issue*' },
  { key: 'contractSigned', label: 'Contract Signed', dateKey: 'contractSignedDate', dateLabel: 'Date Signed*' },
];

export default function InputForm({
  editData = null,
  wings = [],
  divisions = [],
  onBack,
  onSuccess,
  triggerNotification
}) {
  const isEdit = !!editData;

  // Form states
  const [wing, setWing] = useState('');
  const [division, setDivision] = useState('');
  const [numResources, setNumResources] = useState(1);
  const [appointmentType, setAppointmentType] = useState('Full Time');
  const [consultingFirmName, setConsultingFirmName] = useState('');

  // Candidate Details state
  const [candidates, setCandidates] = useState([]);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(null);
  const [isCandidateFormOpen, setIsCandidateFormOpen] = useState(false);

  // In-place candidate form sub-states
  const [cName, setCName] = useState('');
  const [cQualification, setCQualification] = useState('');
  const [cWorkExperience, setCWorkExperience] = useState('');
  const [cSalary, setCSalary] = useState('');
  const [cCategory, setCCategory] = useState('Direct Contract');
  const [cAppointmentDate, setCAppointmentDate] = useState('');
  const [cSkillSet, setCSkillSet] = useState('');
  const [cFileName, setCFileName] = useState('');
  const [cFile, setCFile] = useState(null);
  const [cErrors, setCErrors] = useState({});
  const [cSaving, setCSaving] = useState(false);
  const candFileInputRef = useRef(null);

  // Remarks State
  const [remarks, setRemarks] = useState({
    adminApproval: '',
    tenderPublished: '',
    preBidQueries: '',
    bidReceived: '',
    techBidFinalized: '',
    finBidFinalized: '',
    workOrderIssued: '',
    contractSigned: ''
  });

  // Milestone Dates State
  const [dates, setDates] = useState({
    adminApprovalDate: '',
    tenderPublishedDate: '',
    preBidQueriesDate: '',
    bidReceivedDate: '',
    techBidFinalizedDate: '',
    finBidFinalizedDate: '',
    workOrderIssuedDate: '',
    contractSignedDate: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateField = (field, value) => {
    let err = '';
    if (field === 'numResources') {
      if (value !== '' && (isNaN(value) || Number(value) <= 0)) {
        err = 'Number of resources must be a positive number greater than 0.';
      }
    } else if (field.endsWith('Date')) {
      if (value) {
        const selected = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selected > today) {
          err = 'Date cannot be in the future.';
        }
      }
    }
    setErrors(prev => {
      const updated = { ...prev };
      if (err) {
        updated[field] = err;
      } else {
        delete updated[field];
      }
      return updated;
    });
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFieldInvalid = (field, val) => {
    if (errors[field]) return true;
    if (field.endsWith('Date')) {
      return false;
    }
    if (touched[field]) {
      return !val || (typeof val === 'string' && !val.trim());
    }
    return false;
  };

  useEffect(() => {
    if (editData) {
      setWing(editData.wing_id || '');
      setDivision(editData.division_id || '');
      setAppointmentType(editData.appointmentType || 'Full Time');
      setNumResources(editData.numResources || 1);
      setConsultingFirmName(editData.consultingFirmName || editData.raw?.name_of_consulting_firm || '');
      setRemarks({
        adminApproval: editData.remarks?.adminApproval || editData.raw?.admin_approval_for_nkg_consultant_remarks || '',
        tenderPublished: editData.remarks?.tenderPublished || editData.raw?.tender_published_remarks || '',
        preBidQueries: editData.remarks?.preBidQueries || editData.raw?.pre_bid_queries_responded_remarks || '',
        bidReceived: editData.remarks?.bidReceived || editData.raw?.bid_received_remarks || '',
        techBidFinalized: editData.remarks?.techBidFinalized || editData.raw?.technical_bid_finalized_remarks || '',
        finBidFinalized: editData.remarks?.finBidFinalized || editData.raw?.financial_bid_finalized_remarks || '',
        workOrderIssued: editData.remarks?.workOrderIssued || editData.raw?.work_order_issued_remarks || '',
        contractSigned: editData.remarks?.contractSigned || editData.raw?.contract_signed_remarks || ''
      });
      setDates({
        adminApprovalDate: editData.stages?.adminApprovalDate || '',
        tenderPublishedDate: editData.stages?.tenderPublishedDate || '',
        preBidQueriesDate: editData.stages?.preBidQueriesDate || '',
        bidReceivedDate: editData.stages?.bidReceivedDate || '',
        techBidFinalizedDate: editData.stages?.techBidFinalizedDate || '',
        finBidFinalizedDate: editData.stages?.finBidFinalizedDate || '',
        workOrderIssuedDate: editData.stages?.workOrderIssuedDate || '',
        contractSignedDate: editData.stages?.contractSignedDate || '',
      });

      // Load candidate details
      if (editData.id) {
        fetchCandidatesByConsultantAppointmentId(editData.id)
          .then((res) => {
            if (res.data && res.data.length > 0) {
              setCandidates(res.data);
            } else {
              const candIdsStr = editData.raw?.candidate_id || '';
              if (candIdsStr) {
                const idList = candIdsStr.split(',').map(s => s.trim()).filter(Boolean);
                Promise.all(
                  idList.map(async (cid) => {
                    try {
                      const cres = await fetchCandidateDetail(cid);
                      const docRes = await fetchCandidateDocument(cid).catch(() => ({ data: [] }));
                      const cdata = cres.data?.[0] || {};
                      const docName = docRes.data?.[0]?.appointment_order_document || '';
                      return { ...cdata, documentName: docName };
                    } catch {
                      return { candidate_id: cid };
                    }
                  })
                ).then(loadedCandidates => {
                  setCandidates(loadedCandidates);
                });
              }
            }
          })
          .catch(() => {
            const candIdsStr = editData.raw?.candidate_id || '';
            if (candIdsStr) {
              const idList = candIdsStr.split(',').map(s => s.trim()).filter(Boolean);
              Promise.all(
                idList.map(async (cid) => {
                  try {
                    const cres = await fetchCandidateDetail(cid);
                    const docRes = await fetchCandidateDocument(cid).catch(() => ({ data: [] }));
                    const cdata = cres.data?.[0] || {};
                    const docName = docRes.data?.[0]?.appointment_order_document || '';
                    return { ...cdata, documentName: docName };
                  } catch {
                    return { candidate_id: cid };
                  }
                })
              ).then(loadedCandidates => {
                setCandidates(loadedCandidates);
              });
            }
          });
      }
    }
  }, [editData]);

  const isStageAccessible = (index) => {
    if (index === 0) return true;
    const prevStage = STAGES[index - 1];
    return !!dates[prevStage.dateKey];
  };

  const handleDateChange = (dateKey, val) => {
    setDates(prev => {
      const newDates = { ...prev, [dateKey]: val };
      if (!val) {
        let clear = false;
        for (const stage of STAGES) {
          if (clear) {
            newDates[stage.dateKey] = '';
            if (stage.key === 'contractSigned') {
              setConsultingFirmName('');
            }
          }
          if (stage.dateKey === dateKey) clear = true;
        }
      }
      return newDates;
    });
    
    if (!val) {
      setErrors(prev => {
        const newErrors = { ...prev };
        let clear = false;
        for (const stage of STAGES) {
          if (clear) delete newErrors[stage.dateKey];
          if (stage.dateKey === dateKey) clear = true;
        }
        return newErrors;
      });
    }
    
    validateField(dateKey, val);
  };

  const handleRemarkChange = (key, val) => {
    setRemarks(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!wing) {
      if (triggerNotification) triggerNotification("Please select a Wing.", "warning");
      return;
    }
    if (!division) {
      if (triggerNotification) triggerNotification("Please select a Division.", "warning");
      return;
    }
    if (Object.keys(errors).length > 0) {
      if (triggerNotification) triggerNotification("Please correct validation errors before submitting.", "warning");
      return;
    }

    setSubmitting(true);

    const activeUserId = getCurrentUserId() || 1;

    let selectedStage = 1;
    for (let i = 0; i < STAGES.length; i++) {
      if (dates[STAGES[i].dateKey]) {
        selectedStage = i + 1;
      }
    }

    const candidateIDs = candidates.map(c => c.candidate_id).filter(Boolean);

    const payload = {
      wing: parseInt(wing),
      division: parseInt(division),
      resourceNumber: Number(numResources) || 1,
      numberOfResources: Number(numResources) || 1,
      appointmentType: appointmentType,
      adminApprovalDate: dates.adminApprovalDate || null,
      adminApprovalRemarks: remarks.adminApproval || null,
      tenderPublishedDate: dates.tenderPublishedDate || null,
      tenderPublishedRemarks: remarks.tenderPublished || null,
      preBidQueriesRespondedDate: dates.preBidQueriesDate || null,
      preBidQueriesRespondedRemarks: remarks.preBidQueries || null,
      bidReceivedDate: dates.bidReceivedDate || null,
      bidReceivedRemarks: remarks.bidReceived || null,
      technicalBidFinalizedDate: dates.techBidFinalizedDate || null,
      technicalBidFinalizedRemarks: remarks.techBidFinalized || null,
      financialBidFinalizedDate: dates.finBidFinalizedDate || null,
      financialBidFinalizedRemarks: remarks.finBidFinalized || null,
      workOrderIssuedDate: dates.workOrderIssuedDate || null,
      workOrderIssuedRemarks: remarks.workOrderIssued || null,
      contractSignedDate: dates.contractSignedDate || null,
      contractSignedRemarks: remarks.contractSigned || null,
      remarks: remarks,
      consultingFirmName: consultingFirmName || '',
      candidateIDs: candidateIDs,
      stageID: selectedStage,
      userID: activeUserId
    };

    try {
      if (isEdit) {
        await updateConsultantAppointment({
          consultantAppointmentID: editData.id,
          ...payload
        });
      } else {
        await createConsultantAppointment({
          ...payload
        });
      }

      if (triggerNotification) {
        triggerNotification(
          isEdit ? "Consultant Appointment updated successfully." : "New Consultant Appointment registered successfully.",
          "success"
        );
      }

      onSuccess();
    } catch (err) {
      console.error("Submit error details:", err.response?.data || err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      if (triggerNotification) {
        triggerNotification(`Failed to save Consultant Appointment: ${serverMsg}`, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCandidateForm = (index) => {
    if (activeCandidateIndex === index && isCandidateFormOpen) {
      setIsCandidateFormOpen(false);
      setActiveCandidateIndex(null);
      return;
    }

    const cand = candidates[index] || null;
    setActiveCandidateIndex(index);
    if (cand) {
      setCName(cand.name || '');
      setCQualification(cand.qualification || '');
      setCWorkExperience(cand.work_experience !== undefined && cand.work_experience !== null ? String(cand.work_experience) : '');
      setCSalary(cand.salary !== undefined && cand.salary !== null ? String(cand.salary) : '');
      setCCategory(cand.category || 'Direct Contract');
      setCAppointmentDate(cand.date_of_appointment ? new Date(cand.date_of_appointment).toISOString().split('T')[0] : '');
      setCSkillSet(cand.skill_set || '');
      setCFileName(cand.appointment_order_document || '');
      setCFile(null);
    } else {
      setCName('');
      setCQualification('');
      setCWorkExperience('');
      setCSalary('');
      setCCategory('Direct Contract');
      setCAppointmentDate('');
      setCSkillSet('');
      setCFileName('');
      setCFile(null);
    }
    setCErrors({});
    setIsCandidateFormOpen(true);
  };

  const handleSaveCandidateInline = async (e) => {
    if (e) e.preventDefault();

    const errors = {};
    if (!cName.trim()) errors.name = 'Name is required';
    if (!cQualification.trim()) errors.qualification = 'Educational Qualification is required';
    if (!String(cWorkExperience).trim()) errors.workExperience = 'Work experience is required';
    if (!String(cSalary).trim()) errors.salary = 'Salary is required';
    if (!cCategory) errors.category = 'Deployment category is required';
    if (!cAppointmentDate) errors.appointmentDate = 'Date of appointment is required';
    if (!cSkillSet.trim()) errors.skillSet = 'Skill set is required';
    if (!cFileName && !cFile) errors.file = 'Appointment order document is required';

    if (Object.keys(errors).length > 0) {
      setCErrors(errors);
      if (triggerNotification) triggerNotification('Please fill all mandatory candidate fields.', 'warning');
      return;
    }

    setCSaving(true);
    try {
      const existingCand = candidates[activeCandidateIndex] || null;
      let candidateId = existingCand?.candidate_id;

      const payload = {
        name: cName,
        qualification: cQualification,
        workExperience: Number(cWorkExperience) || 0,
        salary: Number(cSalary) || 0,
        category: cCategory,
        appointmentDate: cAppointmentDate,
        skillSet: cSkillSet
      };

      if (candidateId) {
        await updateCandidateDetail({
          candidate_id: candidateId,
          ...payload
        });
      } else {
        const res = await addCandidateDetail(payload);
        candidateId = res.data?.candidate_id;
      }

      let finalDocName = cFileName;
      if (cFile && candidateId) {
        const formData = new FormData();
        formData.append('candidateID', candidateId);
        formData.append('file', cFile);
        const uploadRes = await uploadCandidateDocument(formData);
        finalDocName = uploadRes.data?.fileName || cFile.name;
      }

      if (editData?.id && candidateId) {
        try {
          await addConsultantID({
            candidateID: candidateId,
            consultantAppointmentID: editData.id
          });
        } catch (linkErr) {
          console.warn('Link note:', linkErr);
        }
      }

      const updatedCandidateObj = {
        candidate_id: candidateId,
        name: cName,
        qualification: cQualification,
        work_experience: Number(cWorkExperience) || 0,
        salary: Number(cSalary) || 0,
        category: cCategory,
        date_of_appointment: cAppointmentDate,
        skill_set: cSkillSet,
        appointment_order_document: finalDocName
      };

      setCandidates(prev => {
        const next = [...prev];
        next[activeCandidateIndex] = updatedCandidateObj;
        return next;
      });

      if (triggerNotification) {
        triggerNotification(`Candidate ${activeCandidateIndex + 1} details saved!`, 'success');
      }

      setIsCandidateFormOpen(false);
    } catch (err) {
      console.error('Error saving candidate inline:', err);
      if (triggerNotification) {
        triggerNotification(err.response?.data?.message || 'Failed to save candidate details.', 'error');
      }
    } finally {
      setCSaving(false);
    }
  };

  const isFormDisabled =
    !wing ||
    !division ||
    numResources === '' ||
    Number(numResources) <= 0 ||
    Object.keys(errors).length > 0 ||
    submitting;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            {isEdit ? "Update Consultant Appointment" : "Add Consultant Appointment"}
          </h3>
          <p className="text-[10px] text-[#eadede] font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Fixed Metadata (4 cols on lg screens) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
                Appointment Information
              </h4>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Wing <span className="text-red-500">*</span></label>
                <select
                  value={wing}
                  onChange={(e) => {
                    setWing(e.target.value);
                    handleBlur('wing');
                  }}
                  onBlur={() => handleBlur('wing')}
                  className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border ${isFieldInvalid('wing', wing) ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200`}
                >
                  <option value="">Select Wing</option>
                  {wings.map((w) => (
                    <option key={w.wing_id} value={w.wing_id}>
                      {w.wing_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Division <span className="text-red-500">*</span></label>
                <select
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value);
                    handleBlur('division');
                  }}
                  onBlur={() => handleBlur('division')}
                  className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border ${isFieldInvalid('division', division) ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200`}
                >
                  <option value="">Select Division</option>
                  {divisions.map((d) => (
                    <option key={d.division_id} value={d.division_id}>
                      {d.division_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Number of Resources <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={numResources}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNumResources(val);
                    validateField('numResources', val);
                  }}
                  onBlur={() => handleBlur('numResources')}
                  className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border ${isFieldInvalid('numResources', numResources) ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200`}
                  placeholder="1"
                />
                {errors.numResources && (
                  <p className="text-[10px] font-bold text-red-500 mt-1">{errors.numResources}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Appointment Type <span className="text-red-500">*</span></label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contractual">Contractual</option>
                  <option value="Advisory">Advisory</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Panel: Stages Checklist & Inline Candidate Editor (8 cols on lg screens) */}
          <div className="lg:col-span-8 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 bg-slate-50 dark:bg-slate-950">
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
              Stages Checklist & Dates
            </h4>
            
            <div className="space-y-3.5">
            {STAGES.map((stage, idx) => {
              const isAccessible = isStageAccessible(idx);
              const isFilled = !!dates[stage.dateKey];

              return (
                <div
                  key={stage.key}
                  className={`flex flex-col py-3 px-4 rounded-xl border transition-all ${!isAccessible
                    ? 'bg-slate-100/60 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/40 opacity-50'
                    : isFilled
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${!isAccessible ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {idx + 1}. {stage.label}
                      </span>
                      {!isAccessible && (
                        <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 italic">
                          (Complete stage {idx} first)
                        </span>
                      )}
                    </div>
                    {isAccessible && (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase hidden sm:block">{stage.dateLabel}</span>
                        <div className="relative w-44">
                          <input
                            type="date"
                            value={dates[stage.dateKey]}
                            onChange={(e) => handleDateChange(stage.dateKey, e.target.value)}
                            onBlur={() => handleBlur(stage.dateKey)}
                            className={`w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border ${isFieldInvalid(stage.dateKey, dates[stage.dateKey]) ? 'border-red-500 focus:border-red-550' : 'border-slate-200 dark:border-slate-800'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200`}
                          />
                          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {isAccessible && errors[stage.dateKey] && (
                    <div className="flex justify-end mt-1">
                      <p className="text-[10px] font-bold text-red-500">{errors[stage.dateKey]}</p>
                    </div>
                  )}

                  {isFilled && (
                    <div className="animate-fade-in pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
                       <div>
                         <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Remarks</label>
                         <textarea
                           value={remarks[stage.key] || ''}
                           onChange={(e) => handleRemarkChange(stage.key, e.target.value)}
                           placeholder="Add remarks here..."
                           className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 resize-none"
                           rows="2"
                         />
                       </div>

                      {/* Stage 7: Work Order Issued -> Inline Candidate Details Editor (NO MODAL OVERLAY) */}
                      {stage.key === 'workOrderIssued' && (
                        <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                              Candidate Details ({candidates.filter(c => c && (c.name || c.candidate_id)).length} / {Math.max(1, Number(numResources) || 1)} Filled)
                            </label>
                          </div>

                          {/* Candidate Selector Buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            {Array.from({ length: Math.max(1, Number(numResources) || 1) }, (_, i) => {
                              const candidate = candidates[i];
                              const isFilledCandidate = !!(candidate && (candidate.name || candidate.candidate_id));
                              const isActive = isCandidateFormOpen && activeCandidateIndex === i;

                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleOpenCandidateForm(i)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer border ${
                                    isActive
                                      ? 'bg-[#0f417a] text-white border-[#0f417a] ring-2 ring-blue-300 dark:ring-blue-800'
                                      : isFilledCandidate
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                                  }`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>Candidate {i + 1}</span>
                                  {isFilledCandidate && <CheckCircle className="h-3.5 w-3.5 text-emerald-200" />}
                                  {isActive ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Inline Candidate Form (NO MODAL / NO OVERLAY) */}
                          {isCandidateFormOpen && activeCandidateIndex !== null && (
                            <div className="bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 rounded-xl p-4 shadow-sm space-y-4 animate-scale-up">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                <h5 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400">
                                  {candidates[activeCandidateIndex] ? `Update Candidate ${activeCandidateIndex + 1} Profile` : `Add Candidate ${activeCandidateIndex + 1} Profile`}
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => setIsCandidateFormOpen(false)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Name *</label>
                                  <input
                                    type="text"
                                    value={cName}
                                    onChange={(e) => setCName(e.target.value)}
                                    placeholder="Full name"
                                    className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border ${cErrors.name ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg font-semibold text-slate-800 dark:text-slate-100`}
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Qualification *</label>
                                  <input
                                    type="text"
                                    value={cQualification}
                                    onChange={(e) => setCQualification(e.target.value)}
                                    placeholder="e.g. B.Tech / MBA"
                                    className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border ${cErrors.qualification ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg font-semibold text-slate-800 dark:text-slate-100`}
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Experience (Yrs) *</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={cWorkExperience}
                                    onChange={(e) => setCWorkExperience(e.target.value)}
                                    placeholder="e.g. 5"
                                    className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border ${cErrors.workExperience ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg font-semibold text-slate-800 dark:text-slate-100`}
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Salary (LPA) *</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={cSalary}
                                    onChange={(e) => setCSalary(e.target.value)}
                                    placeholder="e.g. 12"
                                    className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border ${cErrors.salary ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg font-semibold text-slate-800 dark:text-slate-100`}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">Category *</label>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                                      <input
                                        type="radio"
                                        name="inlineCandCat"
                                        value="Direct Contract"
                                        checked={cCategory === 'Direct Contract'}
                                        onChange={(e) => setCCategory(e.target.value)}
                                      />
                                      Direct Contract
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                                      <input
                                        type="radio"
                                        name="inlineCandCat"
                                        value="Outsourced Via Service Provider"
                                        checked={cCategory === 'Outsourced Via Service Provider'}
                                        onChange={(e) => setCCategory(e.target.value)}
                                      />
                                      Outsourced Via Provider
                                    </label>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Date of Appointment *</label>
                                  <input
                                    type="date"
                                    value={cAppointmentDate}
                                    onChange={(e) => setCAppointmentDate(e.target.value)}
                                    className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border ${cErrors.appointmentDate ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg font-semibold text-slate-800 dark:text-slate-100`}
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Skill Set *</label>
                                  <input
                                    type="text"
                                    value={cSkillSet}
                                    onChange={(e) => setCSkillSet(e.target.value)}
                                    placeholder="e.g. Legal, IT, Port Operations"
                                    className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border ${cErrors.skillSet ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'} rounded-lg font-semibold text-slate-800 dark:text-slate-100`}
                                  />
                                </div>
                              </div>

                              {/* Document Upload */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Upload Appointment Order (PDF) *</label>
                                <input
                                  type="file"
                                  ref={candFileInputRef}
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                        if (triggerNotification) triggerNotification('Only PDF files allowed.', 'error');
                                        e.target.value = '';
                                        return;
                                      }
                                      setCFileName(file.name);
                                      setCFile(file);
                                    }
                                  }}
                                  className="hidden"
                                />
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => candFileInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-[#0f417a] hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                                  >
                                    <Upload className="h-3 w-3" />
                                    <span>{cFileName ? 'Change PDF' : 'Upload PDF'}</span>
                                  </button>
                                  {cFileName && (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-xs">
                                      {cFileName}
                                    </span>
                                  )}
                                </div>
                                {cErrors.file && <p className="text-[10px] text-red-500 font-bold mt-1">{cErrors.file}</p>}
                              </div>

                              {/* Inline Form Footer */}
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  disabled={cSaving}
                                  onClick={handleSaveCandidateInline}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
                                >
                                  {cSaving ? 'Saving...' : 'Save Candidate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsCandidateFormOpen(false)}
                                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stage 8: Contract Signed -> Name of the Consulting Firm */}
                      {stage.key === 'contractSigned' && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                            Name of the Consulting Firm
                          </label>
                          <input
                            type="text"
                            value={consultingFirmName}
                            onChange={(e) => setConsultingFirmName(e.target.value)}
                            placeholder="Enter name of consulting firm"
                            className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-medium"
                          />
                        </div>
                      )}
                    </div>
                  )}
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
            disabled={isFormDisabled}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all flex items-center gap-2 ${
              isFormDisabled
                ? "bg-slate-400 cursor-not-allowed opacity-50"
                : "bg-emerald-600 hover:bg-emerald-700 hover:shadow cursor-pointer active:scale-95"
            }`}
          >
            {submitting ? "Saving..." : isEdit ? "Update" : "Submit"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 hover:shadow transition-all cursor-pointer active:scale-95"
          >
            Exit
          </button>
        </div>
      </form>
    </div>
  );
}
