import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Upload, File } from 'lucide-react';
import { createConsultantAppointment, updateConsultantAppointment } from '../api';
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
  const fileInputRef = useRef(null);

  // Form states
  const [wing, setWing] = useState('');
  const [division, setDivision] = useState('');
  const [numResources, setNumResources] = useState(1);
  const [appointmentType, setAppointmentType] = useState('Full Time');

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

  // File Upload State for Work Order Issued
  const [workOrderFileName, setWorkOrderFileName] = useState('');
  const [workOrderFile, setWorkOrderFile] = useState(null);

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
      setRemarks({
        adminApproval: editData.remarks?.adminApproval || '',
        tenderPublished: editData.remarks?.tenderPublished || '',
        preBidQueries: editData.remarks?.preBidQueries || '',
        bidReceived: editData.remarks?.bidReceived || '',
        techBidFinalized: editData.remarks?.techBidFinalized || '',
        finBidFinalized: editData.remarks?.finBidFinalized || '',
        workOrderIssued: editData.remarks?.workOrderIssued || '',
        contractSigned: editData.remarks?.contractSigned || ''
      });
      setDates({
        adminApprovalDate: editData.stages.adminApprovalDate || '',
        tenderPublishedDate: editData.stages.tenderPublishedDate || '',
        preBidQueriesDate: editData.stages.preBidQueriesDate || '',
        bidReceivedDate: editData.stages.bidReceivedDate || '',
        techBidFinalizedDate: editData.stages.techBidFinalizedDate || '',
        finBidFinalizedDate: editData.stages.finBidFinalizedDate || '',
        workOrderIssuedDate: editData.stages.workOrderIssuedDate || '',
        contractSignedDate: editData.stages.contractSignedDate || '',
      });
      setWorkOrderFileName(editData.workOrderFileName || '');
    }
  }, [editData]);

  /**
   * Checks if a milestone stage is accessible based on completion of previous stages.
   * Stage 0 is always accessible.
   * Stage N (N > 0) is accessible only if Stage N-1 has a date filled.
   */
  const isStageAccessible = (index) => {
    if (index === 0) return true;
    const prevStage = STAGES[index - 1];
    return !!dates[prevStage.dateKey];
  };

  const handleDateChange = (dateKey, val) => {
    setDates(prev => {
      const newDates = { ...prev, [dateKey]: val };
      if (!val) {
        // If a date is cleared, clear subsequent dates
        let clear = false;
        for (const stage of STAGES) {
          if (clear) {
            newDates[stage.dateKey] = '';
            if (stage.key === 'workOrderIssued') {
              setWorkOrderFileName('');
              setWorkOrderFile(null);
            }
          }
          if (stage.dateKey === dateKey) clear = true;
        }
      }
      return newDates;
    });
    
    // Clear errors for subsequent dates if cleared
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
      alert("Please select a Wing.");
      return;
    }
    if (!division) {
      alert("Please select a Division.");
      return;
    }
    if (Object.keys(errors).length > 0) {
      alert("Please correct validation errors.");
      return;
    }

    setSubmitting(true);

    const activeUserId = getCurrentUserId() || 1;

    // Determine current stage ID
    let selectedStage = 1;
    for (let i = 0; i < STAGES.length; i++) {
      if (dates[STAGES[i].dateKey]) {
        selectedStage = i + 1;
      }
    }

    const payload = {
      wing: parseInt(wing),
      division: parseInt(division),
      resourceNumber: Number(numResources) || 1,
      appointmentType: appointmentType,
      adminApproval: dates.adminApprovalDate ? "Yes" : "No",
      adminApprovalDate: dates.adminApprovalDate || "",
      tenderPublished: dates.tenderPublishedDate ? "Yes" : "No",
      tenderPublishedDate: dates.tenderPublishedDate || "",
      preBidQueriesResponded: dates.preBidQueriesDate ? "Yes" : "No",
      preBidQueriesRespondedDate: dates.preBidQueriesDate || "",
      bidReceived: dates.bidReceivedDate ? "Yes" : "No",
      bidReceivedDate: dates.bidReceivedDate || "",
      technicalBidFinalized: dates.techBidFinalizedDate ? "Yes" : "No",
      technicalBidFinalizedDate: dates.techBidFinalizedDate || "",
      financialBidFinalized: dates.finBidFinalizedDate ? "Yes" : "No",
      financialBidFinalizedDate: dates.finBidFinalizedDate || "",
      workOrderIssued: dates.workOrderIssuedDate ? "Yes" : "No",
      workOrderIssuedDate: dates.workOrderIssuedDate || "",
      contractSigned: dates.contractSignedDate ? "Yes" : "No",
      contractSignedDate: dates.contractSignedDate || "",
      remarks: remarks, // Added remarks for the backend if supported
      consultingFirmName: "",
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
          candidateIDs: [],
          ...payload
        });
      }

      if (triggerNotification) {
        triggerNotification(isEdit ? "Consultant Appointment updated successfully." : "New Consultant Appointment registered successfully.");
      }

      onSuccess();
    } catch (err) {
      console.error("Submit error details:", err.response?.data || err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Failed to save Consultant Appointment details: ${serverMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if form submit should be disabled
  const isFormDisabled =
    !wing ||
    !division ||
    numResources === '' ||
    Number(numResources) <= 0 ||
    (dates.workOrderIssuedDate && !workOrderFileName) ||
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
          
          {/* Left Panel: Stationary fields */}
          <div className="lg:col-span-5 space-y-4 pr-0 lg:pr-2">
            
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Wing*</label>
              <select
                value={wing}
                onChange={(e) => { setWing(e.target.value); if (touched.wing) handleBlur('wing'); }}
                onBlur={() => handleBlur('wing')}
                required
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border ${isFieldInvalid('wing', wing) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-755 dark:text-slate-300 cursor-pointer`}
              >
                <option value="" className="dark:bg-slate-955 dark:text-slate-300">--Select Wing--</option>
                {wings.map(w => <option key={w.wing_id} value={w.wing_id} className="dark:bg-slate-955 dark:text-slate-300">{w.wing_name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Division*</label>
            <select
              value={division}
              onChange={(e) => { setDivision(e.target.value); if (touched.division) handleBlur('division'); }}
              onBlur={() => handleBlur('division')}
              required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border ${isFieldInvalid('division', division) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-755 dark:text-slate-300 cursor-pointer`}
            >
              <option value="" className="dark:bg-slate-955 dark:text-slate-300">--Select Division--</option>
              {divisions.map(d => <option key={d.division_id} value={d.division_id} className="dark:bg-slate-955 dark:text-slate-300">{d.division_name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Number of Resources*</label>
            <input
              type="number"
              min="1"
              value={numResources}
              onChange={e => { setNumResources(e.target.value); validateField('numResources', e.target.value); }}
              onBlur={() => handleBlur('numResources')}
              required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border ${isFieldInvalid('numResources', numResources) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200`}
            />
            {errors.numResources && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.numResources}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Appointment Type*</label>
            <select
              value={appointmentType}
              onChange={e => { setAppointmentType(e.target.value); if (touched.appointmentType) handleBlur('appointmentType'); }}
              onBlur={() => handleBlur('appointmentType')}
              required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border ${isFieldInvalid('appointmentType', appointmentType) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-755 dark:text-slate-300 cursor-pointer`}
            >
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
            </select>
          </div>
          </div>

          {/* Right Panel: Stages list card style */}
          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950" style={{ maxHeight: '580px' }}>
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
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${!isAccessible ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {idx + 1}. {stage.label}
                      </span>
                      {!isAccessible && (
                        <span className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-400/80 italic">
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
                            required
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

                      {stage.key === 'workOrderIssued' && (
                        <div className="space-y-1.5 max-w-sm pt-2">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Upload Work Order PDF*</label>
                          <div className={`flex items-center justify-center border-2 border-dashed ${!workOrderFileName ? 'border-amber-500 bg-amber-50/10' : 'border-slate-250 dark:border-slate-800'} rounded-xl p-4 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition cursor-pointer relative`}>
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept=".pdf"
                              required
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                    alert("Invalid file type. Only PDF files are allowed.");
                                    e.target.value = '';
                                    setWorkOrderFileName('');
                                    setWorkOrderFile(null);
                                    return;
                                  }
                                  if (file.size > 10 * 1024 * 1024) {
                                    alert("File size exceeds 10 MB. Please choose a smaller file.");
                                    e.target.value = '';
                                    setWorkOrderFileName('');
                                    setWorkOrderFile(null);
                                    return;
                                  }
                                  setWorkOrderFileName(file.name);
                                  setWorkOrderFile(file);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="text-center space-y-1">
                              <Upload className="mx-auto h-6 w-6 text-slate-400" />
                              <p className="text-[11px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wide">Upload PDF file</p>
                              <p className="text-[9px] text-slate-400 font-semibold">(Only PDF under 10 MB is allowed)</p>
                              {workOrderFileName && (
                                <p className="text-[11px] font-black text-emerald-600 inline-flex items-center gap-1 mt-1">
                                  <File className="h-3 w-3" /> Selected: {workOrderFileName}
                                </p>
                              )}
                            </div>
                          </div>
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
            type="button"
            onClick={onBack}
            className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-800 text-slate-655 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={isFormDisabled}
            className={`px-5.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isFormDisabled
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-550 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                : 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white shadow-md shadow-blue-900/10 hover:shadow-lg dark:bg-[#0f417a] dark:hover:bg-[#0a2d55]'
            }`}
          >
            {isEdit ? (submitting ? 'Updating...' : 'Update Appointment') : (submitting ? 'Saving...' : 'Save Post')}
          </button>
        </div>
      </form>
    </div>
  );
}
