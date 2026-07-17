import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Upload, File } from 'lucide-react';
import axios from 'axios';

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
  const [consultingFirmName, setConsultingFirmName] = useState('');

  // Milestone Stages State
  const [formStages, setFormStages] = useState({
    adminApproval: false,
    tenderPublished: false,
    preBidQueries: false,
    bidReceived: false,
    techBidFinalized: false,
    finBidFinalized: false,
    workOrderIssued: false,
    contractSigned: false
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
      setConsultingFirmName(editData.consultingFirmName || '');
      setFormStages({ ...editData.stages });
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

  const handleStageChange = (key, val, dateKey) => {
    setFormStages(prev => ({
      ...prev,
      [key]: val
    }));

    if (!val) {
      // Clear date and validation error if No is selected
      setDates(prev => ({ ...prev, [dateKey]: '' }));
      if (key === 'workOrderIssued') {
        setWorkOrderFileName('');
        setWorkOrderFile(null);
      }
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[dateKey];
        return updated;
      });
    }
  };

  const handleDateChange = (dateKey, val) => {
    setDates(prev => ({ ...prev, [dateKey]: val }));
    validateField(dateKey, val);
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
    if (!consultingFirmName.trim()) {
      alert("Consulting Firm Name is required.");
      return;
    }
    if (Object.keys(errors).length > 0) {
      alert("Please correct validation errors.");
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

    // Determine current stage ID
    let selectedStage = 1;
    for (let i = 0; i < STAGES.length; i++) {
      if (formStages[STAGES[i].key]) {
        selectedStage = i + 1;
      }
    }

    const payload = {
      wing: parseInt(wing),
      division: parseInt(division),
      resourceNumber: Number(numResources) || 1,
      appointmentType: appointmentType,
      adminApproval: formStages.adminApproval ? "Yes" : "No",
      adminApprovalDate: dates.adminApprovalDate || "",
      tenderPublished: formStages.tenderPublished ? "Yes" : "No",
      tenderPublishedDate: dates.tenderPublishedDate || "",
      preBidQueriesResponded: formStages.preBidQueries ? "Yes" : "No",
      preBidQueriesRespondedDate: dates.preBidQueriesDate || "",
      bidReceived: formStages.bidReceived ? "Yes" : "No",
      bidReceivedDate: dates.bidReceivedDate || "",
      technicalBidFinalized: formStages.techBidFinalized ? "Yes" : "No",
      technicalBidFinalizedDate: dates.techBidFinalizedDate || "",
      financialBidFinalized: formStages.finBidFinalized ? "Yes" : "No",
      financialBidFinalizedDate: dates.finBidFinalizedDate || "",
      workOrderIssued: formStages.workOrderIssued ? "Yes" : "No",
      workOrderIssuedDate: dates.workOrderIssuedDate || "",
      contractSigned: formStages.contractSigned ? "Yes" : "No",
      contractSignedDate: dates.contractSignedDate || "",
      consultingFirmName: consultingFirmName.trim(),
      stageID: selectedStage,
      userID: activeUserId
    };

    try {
      if (isEdit) {
        await axios.put("http://localhost:3000/consultant-appointment", {
          consultantAppointmentID: editData.id,
          ...payload
        });
      } else {
        await axios.post("http://localhost:3000/consultant-appointment", {
          candidateIDs: [],
          ...payload
        });
      }

      if (triggerNotification) {
        triggerNotification(isEdit ? "Consultant Appointment updated successfully." : "New Consultant Appointment registered successfully.");
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to save Consultant Appointment details.");
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if form submit should be disabled
  const isFormDisabled =
    !wing ||
    !division ||
    !consultingFirmName.trim() ||
    numResources === '' ||
    Number(numResources) <= 0 ||
    STAGES.some(stage => formStages[stage.key] && !dates[stage.dateKey]) ||
    (formStages.workOrderIssued && !workOrderFileName) ||
    Object.keys(errors).length > 0 ||
    submitting;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            {isEdit ? "Update Consultant Appointment" : "Add Consultant Appointment"}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
              <option value="Retainer">Retainer</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
            Workflow Milestone Checklist
          </label>

          <div className="space-y-4">
            {STAGES.map((stage, idx) => {
              const isYes = formStages[stage.key] === true;
              return (
                <div key={stage.key} className="flex flex-col py-3 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {idx + 1}. {stage.label}
                    </span>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleStageChange(stage.key, true, stage.dateKey)}
                        className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${isYes
                          ? 'bg-emerald-600 text-white shadow-sm font-black'
                          : 'bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStageChange(stage.key, false, stage.dateKey)}
                        className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${!isYes
                          ? 'bg-rose-600 text-white shadow-sm font-black'
                          : 'bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {isYes && (
                    <div className="space-y-3 border-t border-slate-200/60 dark:border-slate-800 pt-3 animate-fade-in">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{stage.dateLabel}</span>
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
                      {errors[stage.dateKey] && <p className="text-[10px] font-bold text-red-500 text-right">{errors[stage.dateKey]}</p>}

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

        <div className="space-y-1.5 mt-6">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Name of the Consulting Firm*</label>
          <input
            type="text"
            value={consultingFirmName}
            onChange={(e) => setConsultingFirmName(e.target.value)}
            required
            placeholder="Enter Consulting Firm Name"
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100 dark:border-slate-800">
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
            className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isEdit ? (submitting ? 'Updating...' : 'Update Appointment') : (submitting ? 'Saving...' : 'Save Post')}
          </button>
        </div>
      </form>
    </div>
  );
}
