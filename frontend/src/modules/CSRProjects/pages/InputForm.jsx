import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Save, AlertCircle, CheckCircle2, 
  Building2, Calendar, FileText, Upload, Plus, Trash2, 
  Image as ImageIcon, Heart, Coins, Percent, Clock 
} from 'lucide-react';
import { 
  createCsrProject, 
  updateCsrProject, 
  uploadCsrDocument, 
  fetchOrganisations,
  fetchCsrExpenditureCost,
  fetchCsrGalleryFiles,
  getUserIdFromToken
} from '../api';
import { CSR_FOCUS_AREAS, CSR_STATUSES, FINANCIAL_YEARS } from '../utils/constants';

export default function InputForm({
  editData = null,
  onBack,
  onSuccess,
  triggerNotification
}) {
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);
  const [organisations, setOrganisations] = useState([]);

  // Form Fields matching tbl_csr_projects
  const [organisationId, setOrganisationId] = useState('');
  const [csrFocus, setCsrFocus] = useState(CSR_FOCUS_AREAS[0]?.id || 1);
  const [financialYear, setFinancialYear] = useState(FINANCIAL_YEARS[0]);
  const [projectName, setProjectName] = useState('');
  const [projectReceivedFrom, setProjectReceivedFrom] = useState('');
  const [impactOutcome, setImpactOutcome] = useState('');
  const [targetBeneficiaries, setTargetBeneficiaries] = useState('');
  const [projectValue, setProjectValue] = useState('');
  const [projectStatus, setProjectStatus] = useState(CSR_STATUSES[0]);
  const [commencedOn, setCommencedOn] = useState('');
  const [completedOn, setCompletedOn] = useState('');
  const [financialProgress, setFinancialProgress] = useState(0);
  const [physicalProgress, setPhysicalProgress] = useState(0);
  const [remarks, setRemarks] = useState('');

  // Multi-year Expenditure Breakdown
  const [expenditures, setExpenditures] = useState([
    { year: FINANCIAL_YEARS[0], cost: '' }
  ]);

  // Document & Gallery Uploads
  const [docFile, setDocFile] = useState(null);
  const [docFileName, setDocFileName] = useState('');
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [existingGallery, setExistingGallery] = useState([]);

  // Validation States
  const [touched, setTouched] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const orgs = await fetchOrganisations();
        setOrganisations(Array.isArray(orgs) ? orgs : []);
        if (!editData && orgs && orgs.length > 0) {
          setOrganisationId(orgs[0].organisation_id);
        }
      } catch (err) {
        console.error("Error loading organisations", err);
      }
    };
    loadMasters();
  }, [editData]);

  useEffect(() => {
    if (editData) {
      setOrganisationId(editData.organisation_id || '');
      setCsrFocus(editData.csr_focus || 1);
      setFinancialYear(editData.financial_year || FINANCIAL_YEARS[0]);
      setProjectName(editData.project_name || '');
      setProjectReceivedFrom(editData.project_received_from || '');
      setImpactOutcome(editData.impact_possible_outcome || '');
      setTargetBeneficiaries(editData.target_beneficiaries || '');
      setProjectValue(editData.project_value != null ? String(editData.project_value) : '');
      setProjectStatus(editData.project_status || CSR_STATUSES[0]);
      setCommencedOn(editData.commenced_on ? String(editData.commenced_on).split('T')[0] : '');
      setCompletedOn(editData.completed_on ? String(editData.completed_on).split('T')[0] : '');
      setFinancialProgress(editData.financial_progress != null ? Number(editData.financial_progress) : 0);
      setPhysicalProgress(editData.physical_progress != null ? Number(editData.physical_progress) : 0);
      setRemarks(editData.remarks || '');
      setDocFileName(editData.project_completion_doc || '');

      // Load existing expenditures
      const loadDetails = async () => {
        try {
          const [expRes, galRes] = await Promise.all([
            fetchCsrExpenditureCost(editData.csr_project_id),
            fetchCsrGalleryFiles(editData.csr_project_id)
          ]);
          if (Array.isArray(expRes) && expRes.length > 0) {
            setExpenditures(expRes.map(e => ({ year: e.year, cost: String(e.csr_expenditure_cost) })));
          }
          if (Array.isArray(galRes)) {
            setExistingGallery(galRes);
          }
        } catch (e) {
          console.error("Error loading edit details", e);
        }
      };
      loadDetails();
    }
  }, [editData]);

  // Expenditure rows helpers
  const handleAddExpenditureRow = () => {
    setExpenditures(prev => [...prev, { year: FINANCIAL_YEARS[0], cost: '' }]);
  };

  const handleRemoveExpenditureRow = (index) => {
    setExpenditures(prev => prev.filter((_, i) => i !== index));
  };

  const handleExpenditureChange = (index, field, value) => {
    setExpenditures(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  // Validation Rules
  const validationErrors = useMemo(() => {
    const errs = {};

    if (!organisationId) errs.organisationId = 'Organisation must be selected.';
    if (!projectName.trim()) {
      errs.projectName = 'Project name is required.';
    } else if (projectName.trim().length < 3) {
      errs.projectName = 'Project name must be at least 3 characters.';
    } else if (projectName.trim().length > 255) {
      errs.projectName = 'Project name cannot exceed 255 characters.';
    }

    if (!projectReceivedFrom.trim()) {
      errs.projectReceivedFrom = 'Project received from is required.';
    } else if (projectReceivedFrom.trim().length > 255) {
      errs.projectReceivedFrom = 'Received from cannot exceed 255 characters.';
    }

    if (!impactOutcome.trim()) {
      errs.impactOutcome = 'Impact / Possible outcome is required.';
    } else if (impactOutcome.trim().length > 256) {
      errs.impactOutcome = 'Impact cannot exceed 256 characters.';
    }

    if (!targetBeneficiaries.trim()) {
      errs.targetBeneficiaries = 'Target beneficiaries is required.';
    } else if (targetBeneficiaries.trim().length > 256) {
      errs.targetBeneficiaries = 'Target beneficiaries cannot exceed 256 characters.';
    }

    if (projectValue === '' || isNaN(Number(projectValue)) || Number(projectValue) < 0) {
      errs.projectValue = 'Valid positive project value (in ₹ Cr) is required.';
    }

    if (getWordCount(remarks) > 250) {
      errs.remarks = 'Remarks cannot exceed 250 words.';
    }

    if (commencedOn && completedOn && completedOn < commencedOn) {
      errs.completedOn = 'Completed date cannot be earlier than commenced date.';
    }

    return errs;
  }, [
    organisationId, projectName, projectReceivedFrom, 
    impactOutcome, targetBeneficiaries, projectValue, 
    remarks, commencedOn, completedOn
  ]);

  const isFormValid = Object.keys(validationErrors).length === 0;

  const shouldShowError = (field) => {
    return (touched[field] || formSubmitted) && !!validationErrors[field];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);

    setTouched({
      organisationId: true,
      projectName: true,
      projectReceivedFrom: true,
      impactOutcome: true,
      targetBeneficiaries: true,
      projectValue: true,
      remarks: true,
      completedOn: true
    });

    if (!isFormValid) {
      triggerNotification?.("Please fix the highlighted validation errors before saving.", "warning");
      return;
    }

    setSubmitting(true);

    let finalDocFileName = docFileName;

    // Upload completion document if newly selected
    if (docFile) {
      try {
        const formData = new FormData();
        formData.append('file', docFile);
        const uploadRes = await uploadCsrDocument(formData);
        finalDocFileName = uploadRes.uniqueFileName || docFile.name;
      } catch (err) {
        console.error("Document upload failed", err);
      }
    }

    // Prepare expenditures payload
    const formattedExpenditures = expenditures
      .filter(exp => exp.cost !== '' && !isNaN(Number(exp.cost)))
      .map(exp => ({
        expenditureFinancialYear: exp.year,
        expenditureCost: Number(exp.cost)
      }));

    const payload = {
      organisationID: Number(organisationId),
      csrfocus: Number(csrFocus),
      focusID: Number(csrFocus),
      nameofproject: projectName.trim(),
      projectReceived: projectReceivedFrom.trim(),
      impactproject: impactOutcome.trim(),
      targetbeneficiaries: targetBeneficiaries.trim(),
      projectvalue: Number(projectValue),
      projectstatus: projectStatus,
      financialYear: financialYear,
      commencedon: commencedOn || null,
      completedon: completedOn || null,
      finiancialprogresssofar: Number(financialProgress),
      physicalprogresssofar: Number(physicalProgress),
      remarksoftheproject: remarks.trim(),
      csrDocumentFileName: finalDocFileName || null,
      csrExpenditureTab: formattedExpenditures,
      csrGalleryFileNames: galleryFiles.map(f => f.name),
      userID: getUserIdFromToken()
    };

    try {
      if (isEdit) {
        payload.csrProjectId = editData.csr_project_id;
        await updateCsrProject(payload);
        triggerNotification?.("CSR Project updated successfully.", "success");
      } else {
        await createCsrProject(payload);
        triggerNotification?.("New CSR Project registered successfully.", "success");
      }
      onSuccess?.();
      onBack?.();
    } catch (err) {
      console.error("Error saving CSR Project:", err);
      triggerNotification?.(err.response?.data?.message || "Failed to save CSR Project.", "error");
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
            <Heart className="h-4 w-4" />
            <span>{isEdit ? 'UPDATE CSR PROJECT' : 'REGISTER NEW CSR PROJECT'}</span>
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Corporate Social Responsibility • Ports & Shipping</p>
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

      <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>

        {/* Global Validation Banner */}
        {formSubmitted && !isFormValid && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 animate-fade-in">
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

        {/* Section 1: Basic Stationary Information */}
        <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Building2 className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <span>1. Project Core Details</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Organisation */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Organisation <span className="text-rose-500">*</span>
              </label>
              <select
                value={organisationId}
                onChange={e => setOrganisationId(Number(e.target.value))}
                onBlur={() => handleBlur('organisationId')}
                className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer ${
                  shouldShowError('organisationId') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-250 focus:border-[#0f417a]'
                }`}
              >
                {organisations.map(o => (
                  <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                ))}
              </select>
              {shouldShowError('organisationId') && (
                <p className="text-[10px] font-bold text-rose-500">{validationErrors.organisationId}</p>
              )}
            </div>

            {/* CSR Focus Area */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                CSR Focus Area <span className="text-rose-500">*</span>
              </label>
              <select
                value={csrFocus}
                onChange={e => setCsrFocus(Number(e.target.value))}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 focus:border-[#0f417a] rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {CSR_FOCUS_AREAS.map(fa => (
                  <option key={fa.id} value={fa.id}>{fa.name}</option>
                ))}
              </select>
            </div>

            {/* Financial Year */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Financial Year <span className="text-rose-500">*</span>
              </label>
              <select
                value={financialYear}
                onChange={e => setFinancialYear(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 focus:border-[#0f417a] rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {FINANCIAL_YEARS.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Project Name */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Name of the Project <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={255}
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                onBlur={() => handleBlur('projectName')}
                placeholder="e.g. Solar powered drinking water facility in coastal village"
                className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none ${
                  shouldShowError('projectName') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-250 focus:border-[#0f417a]'
                }`}
              />
              {shouldShowError('projectName') && (
                <p className="text-[10px] font-bold text-rose-500">{validationErrors.projectName}</p>
              )}
            </div>

            {/* Received From */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Project Received From <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={255}
                value={projectReceivedFrom}
                onChange={e => setProjectReceivedFrom(e.target.value)}
                onBlur={() => handleBlur('projectReceivedFrom')}
                placeholder="e.g. District Collectorate / Local Panchayat / Public Body"
                className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none ${
                  shouldShowError('projectReceivedFrom') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-250 focus:border-[#0f417a]'
                }`}
              />
              {shouldShowError('projectReceivedFrom') && (
                <p className="text-[10px] font-bold text-rose-500">{validationErrors.projectReceivedFrom}</p>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Possible Impact / Outcome */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Impact / Possible Outcome <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                maxLength={256}
                value={impactOutcome}
                onChange={e => setImpactOutcome(e.target.value)}
                onBlur={() => handleBlur('impactOutcome')}
                placeholder="Key direct benefits and expected community impact..."
                className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none ${
                  shouldShowError('impactOutcome') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-250 focus:border-[#0f417a]'
                }`}
              />
              {shouldShowError('impactOutcome') && (
                <p className="text-[10px] font-bold text-rose-500">{validationErrors.impactOutcome}</p>
              )}
            </div>

            {/* Target Beneficiaries */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Target Beneficiaries <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                maxLength={256}
                value={targetBeneficiaries}
                onChange={e => setTargetBeneficiaries(e.target.value)}
                onBlur={() => handleBlur('targetBeneficiaries')}
                placeholder="e.g. 1500 fishermen families, school children, etc."
                className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none ${
                  shouldShowError('targetBeneficiaries') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-250 focus:border-[#0f417a]'
                }`}
              />
              {shouldShowError('targetBeneficiaries') && (
                <p className="text-[10px] font-bold text-rose-500">{validationErrors.targetBeneficiaries}</p>
              )}
            </div>

          </div>

        </div>

        {/* Section 2: Financial, Status & Milestones */}
        <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Coins className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <span>2. Financials, Status & Progress</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Project Value */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Project Value (₹ Cr) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={projectValue}
                onChange={e => setProjectValue(e.target.value)}
                onBlur={() => handleBlur('projectValue')}
                placeholder="0.00"
                className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none ${
                  shouldShowError('projectValue') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-250 focus:border-[#0f417a]'
                }`}
              />
              {shouldShowError('projectValue') && (
                <p className="text-[10px] font-bold text-rose-500">{validationErrors.projectValue}</p>
              )}
            </div>

            {/* Project Status */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Project Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={projectStatus}
                onChange={e => setProjectStatus(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 focus:border-[#0f417a] rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {CSR_STATUSES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Commenced On */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Commenced On
              </label>
              <input
                type="date"
                value={commencedOn}
                onChange={e => setCommencedOn(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 focus:border-[#0f417a] rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Completed On */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Completed On
              </label>
              <input
                type="date"
                value={completedOn}
                onChange={e => setCompletedOn(e.target.value)}
                className={`w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none ${
                  shouldShowError('completedOn') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-250 focus:border-[#0f417a]'
                }`}
              />
              {shouldShowError('completedOn') && (
                <p className="text-[10px] font-bold text-rose-500">{validationErrors.completedOn}</p>
              )}
            </div>

            {/* Physical Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Physical Progress (%)
                </label>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{physicalProgress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={physicalProgress}
                onChange={e => setPhysicalProgress(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0f417a]"
              />
            </div>

            {/* Financial Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Financial Progress (%)
                </label>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{financialProgress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={financialProgress}
                onChange={e => setFinancialProgress(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0f417a]"
              />
            </div>

          </div>

          {/* Multi-Year Expenditure Table */}
          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Yearly Expenditure Breakdown (₹ Cr)
              </label>
              <button
                type="button"
                onClick={handleAddExpenditureRow}
                className="flex items-center space-x-1 text-xs font-bold text-[#0f417a] dark:text-blue-400 hover:underline cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Year</span>
              </button>
            </div>

            <div className="space-y-2">
              {expenditures.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={row.year}
                    onChange={e => handleExpenditureChange(idx, 'year', e.target.value)}
                    className="text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 focus:border-[#0f417a] rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    {FINANCIAL_YEARS.map(fy => (
                      <option key={fy} value={fy}>{fy}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    value={row.cost}
                    onChange={e => handleExpenditureChange(idx, 'cost', e.target.value)}
                    placeholder="Expenditure amount (₹ Cr)"
                    className="text-xs px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-250 focus:border-[#0f417a] rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none flex-1"
                  />

                  {expenditures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenditureRow(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Section 3: Uploads & Remarks */}
        <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <FileText className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <span>3. Documents, Media & Remarks</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Completion Document */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Project Completion Document (.pdf / .docx)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={e => setDocFile(e.target.files[0])}
                className="w-full text-xs px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-250 rounded-xl font-semibold text-slate-600 dark:text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#0f417a] cursor-pointer"
              />
              {docFileName && !docFile && (
                <p className="text-[10px] text-slate-400 font-semibold truncate">Current file: {docFileName}</p>
              )}
            </div>

            {/* Media Gallery Upload */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Project Photos / Media Gallery
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={e => setGalleryFiles(Array.from(e.target.files))}
                className="w-full text-xs px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-250 rounded-xl font-semibold text-slate-600 dark:text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 cursor-pointer"
              />
              {existingGallery.length > 0 && (
                <p className="text-[10px] text-slate-400 font-semibold">{existingGallery.length} existing photo(s) in gallery</p>
              )}
            </div>

          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                General Remarks (Max 250 words)
              </label>
              <span className={`text-[10px] font-bold ${getWordCount(remarks) > 250 ? 'text-rose-500' : 'text-slate-400'}`}>
                {getWordCount(remarks)} / 250 words
              </span>
            </div>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Any additional information, milestones, or notes..."
              className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-250 focus:border-[#0f417a] rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            />
            {shouldShowError('remarks') && (
              <p className="text-[10px] font-bold text-rose-500">{validationErrors.remarks}</p>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500">
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
              disabled={submitting}
              className="flex items-center space-x-2 text-xs transition px-6 py-2.5 rounded-xl font-bold tracking-wider uppercase bg-[#0f417a] text-white hover:bg-blue-800 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Saving...' : isEdit ? 'Update Project' : 'Save CSR Project'}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
