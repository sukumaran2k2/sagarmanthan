import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, Calendar, FileText, Upload, Plus, Trash2, 
  Image as ImageIcon, Heart, Coins, ListTodo, AlertCircle, 
  CheckCircle2, X, ChevronDown, Save, ArrowLeft, Layers, 
  TrendingUp, IndianRupee, HelpCircle, Eye
} from 'lucide-react';
import { 
  createCsrProject, 
  updateCsrProject, 
  uploadCsrDocument, 
  fetchOrganisations,
  fetchCsrExpenditureCost,
  fetchCsrGalleryFiles,
  uploadCsrGalleryFiles,
  createCsrFund,
  getUserIdFromToken
} from '../api';
import { CSR_FOCUS_AREAS, CSR_STATUSES, FINANCIAL_YEARS } from '../utils/constants';

export default function InputForm({
  editData = null,
  initialFormType = 'project',
  onFormTypeChange,
  onBack,
  onSuccess,
  triggerNotification
}) {
  // Sub-tab state: 'project' | 'fund'
  const [activeFormTab, setActiveFormTab] = useState(initialFormType || 'project');

  useEffect(() => {
    if (initialFormType) {
      setActiveFormTab(initialFormType);
    }
  }, [initialFormType]);

  const handleTabSwitch = (tab) => {
    setActiveFormTab(tab);
    onFormTypeChange?.(tab);
  };

  // Master Organisations
  const [organisations, setOrganisations] = useState([]);

  // ==========================================
  // FORM 1: ADD / UPDATE CSR PROJECT STATE
  // ==========================================
  const isEditProject = !!editData;
  const [submittingProject, setSubmittingProject] = useState(false);

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
  const [financialProgress, setFinancialProgress] = useState('');
  const [physicalProgress, setPhysicalProgress] = useState('');
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

  const [projectErrors, setProjectErrors] = useState({});
  const [projectTouched, setProjectTouched] = useState({});
  const [projectFormSubmitted, setProjectFormSubmitted] = useState(false);

  // File Inputs Ref
  const docInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // ==========================================
  // FORM 2: ADD CSR FUND DETAILS STATE
  // ==========================================
  const [fundOrgId, setFundOrgId] = useState('');
  const [fundFY, setFundFY] = useState(FINANCIAL_YEARS[0]);
  const [fundNetProfit, setFundNetProfit] = useState('');
  const [fundOpeningBalance, setFundOpeningBalance] = useState('');
  const [fundAllotted, setFundAllotted] = useState('');
  const [fundErrors, setFundErrors] = useState({});
  const [fundTouched, setFundTouched] = useState({});
  const [fundFormSubmitted, setFundFormSubmitted] = useState(false);
  const [submittingFund, setSubmittingFund] = useState(false);

  // ==========================================
  // LOAD MASTER DATA & EDIT DATA
  // ==========================================
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const orgs = await fetchOrganisations();
        const orgList = Array.isArray(orgs) ? orgs : [];
        setOrganisations(orgList);
        if (orgList.length > 0) {
          if (!editData) setOrganisationId(orgList[0].organisation_id);
          setFundOrgId(orgList[0].organisation_id);
        }
      } catch (err) {
        console.error("Error loading organisations", err);
      }
    };
    loadMasters();
  }, []);

  // Sync Project Edit Data
  useEffect(() => {
    if (editData) {
      setActiveFormTab('project');
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
      setFinancialProgress(editData.financial_progress != null ? String(editData.financial_progress) : '');
      setPhysicalProgress(editData.physical_progress != null ? String(editData.physical_progress) : '');
      setRemarks(editData.remarks || '');
      setDocFileName(editData.project_completion_doc || '');

      const loadProjectDetails = async () => {
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
          console.error("Error loading project details", e);
        }
      };
      loadProjectDetails();
    }
  }, [editData]);

  // ==========================================
  // FORM 1: EXPENDITURE ROW HANDLERS
  // ==========================================
  const handleAddExpenditureRow = () => {
    setExpenditures(prev => [...prev, { year: FINANCIAL_YEARS[0], cost: '' }]);
  };

  const handleRemoveExpenditureRow = (index) => {
    if (expenditures.length > 1) {
      setExpenditures(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleExpenditureChange = (index, field, value) => {
    setExpenditures(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // ==========================================
  // FORM 1: PROJECT SUBMISSION
  // ==========================================
  const validateProjectForm = () => {
    const errs = {};
    if (!projectName.trim()) errs.projectName = 'Name of the Project is required.';
    if (!projectReceivedFrom.trim()) errs.projectReceivedFrom = 'Project received from is required.';
    if (!impactOutcome.trim()) errs.impactOutcome = 'Impact / Possible Outcome is required.';
    if (!targetBeneficiaries.trim()) errs.targetBeneficiaries = 'Target Beneficiaries is required.';
    if (projectValue === '' || isNaN(Number(projectValue)) || Number(projectValue) < 0) {
      errs.projectValue = 'Valid Project Value (Rs. in Lakhs) is required.';
    }
    if (commencedOn && completedOn && completedOn < commencedOn) {
      errs.completedOn = 'Completed date cannot be earlier than Commenced date.';
    }
    setProjectErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setProjectFormSubmitted(true);

    if (!validateProjectForm()) {
      triggerNotification?.("Please fill in all mandatory fields correctly.", "warning");
      return;
    }

    setSubmittingProject(true);
    let finalDocFileName = docFileName;

    // Upload completion document if provided
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

    const formattedExpenditures = expenditures
      .filter(exp => exp.cost !== '' && !isNaN(Number(exp.cost)))
      .map(exp => ({
        expenditureFinancialYear: exp.year,
        expenditureCost: Number(exp.cost)
      }));

    const payload = {
      organisationID: Number(organisationId) || (organisations[0]?.organisation_id || 1),
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
      physicalprogress: physicalProgress !== '' ? Number(physicalProgress) : 0,
      financialprogress: financialProgress !== '' ? Number(financialProgress) : 0,
      remarksproject: remarks.trim(),
      projectcompletiondoc: finalDocFileName,
      expenditures: formattedExpenditures,
      userID: getUserIdFromToken()
    };

    try {
      let projectId = editData?.csr_project_id;
      if (isEditProject) {
        payload.csrProjectId = editData.csr_project_id;
        await updateCsrProject(payload);
        triggerNotification?.("CSR Project updated successfully.", "success");
      } else {
        const createRes = await createCsrProject(payload);
        projectId = createRes.csr_project_id || createRes.id;
        triggerNotification?.("New CSR Project created successfully.", "success");
      }

      // Upload gallery files if any
      if (projectId && galleryFiles.length > 0) {
        try {
          const galleryFormData = new FormData();
          galleryFiles.forEach(file => galleryFormData.append('files', file));
          await uploadCsrGalleryFiles(projectId, galleryFormData);
        } catch (gErr) {
          console.error("Error uploading gallery files", gErr);
        }
      }

      onSuccess?.();
    } catch (err) {
      console.error("Error saving CSR project:", err);
      triggerNotification?.(err.response?.data?.message || "Failed to save CSR Project.", "error");
    } finally {
      setSubmittingProject(false);
    }
  };

  // ==========================================
  // FORM 2: FUND DETAILS SUBMISSION
  // ==========================================
  const validateFundForm = () => {
    const errs = {};
    if (!fundFY) errs.fy = 'Financial Year is required.';
    if (fundNetProfit === '' || isNaN(Number(fundNetProfit))) {
      errs.netProfit = 'Net Profit (Rs. in Lakhs) is required.';
    }
    if (fundOpeningBalance === '' || isNaN(Number(fundOpeningBalance))) {
      errs.openingBalance = 'Opening Balance (Rs. in Lakhs) is required.';
    }
    if (fundAllotted === '' || isNaN(Number(fundAllotted)) || Number(fundAllotted) < 0) {
      errs.fundAllotted = 'Valid CSR Fund Allotted (Rs. in Lakhs) is required.';
    }
    setFundErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFundSubmit = async (e) => {
    e.preventDefault();
    setFundFormSubmitted(true);

    if (!validateFundForm()) {
      triggerNotification?.("Please fill in all mandatory fields.", "warning");
      return;
    }

    setSubmittingFund(true);
    const payload = {
      organisationID: Number(fundOrgId) || (organisations[0]?.organisation_id || 1),
      financialYear: fundFY,
      netProfit: Number(fundNetProfit),
      openingBalance: Number(fundOpeningBalance),
      fundAlloted: Number(fundAllotted),
      userID: getUserIdFromToken()
    };

    try {
      await createCsrFund(payload);
      triggerNotification?.("New CSR Fund registered successfully.", "success");
      setFundNetProfit('');
      setFundOpeningBalance('');
      setFundAllotted('');
      setFundErrors({});
      setFundFormSubmitted(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error saving CSR Fund:", err);
      triggerNotification?.(err.response?.data?.message || "Failed to save CSR Fund.", "error");
    } finally {
      setSubmittingFund(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Sub-Tabs Row matching MIV module tabs style */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 select-none">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => handleTabSwitch('project')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeFormTab === 'project'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            <span>{isEditProject ? 'UPDATE CSR PROJECT' : 'ADD CSR PROJECT'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('fund')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeFormTab === 'fund'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>ADD CSR FUND DETAIL</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-[#0f417a] dark:text-slate-400 dark:hover:text-blue-400 px-3 py-1.5 mb-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to List</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ADD / UPDATE CSR PROJECT (CONSULTANT APPOINTMENT STYLE) */}
      {/* ========================================================= */}
      {activeFormTab === 'project' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                {isEditProject ? "Update CSR Project" : "Add CSR Project"}
              </h3>
              <p className="text-[10px] text-[#eadede] font-semibold tracking-wide mt-0.5">
                Ministry of Ports, Shipping and Waterways
              </p>
            </div>
          </div>

          <form onSubmit={handleProjectSubmit} className="p-6 space-y-6">
            
            {/* Section 1: Project Information */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span>Project Information</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* CSR Focus Area */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    CSR Focus/Project Area <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={csrFocus}
                      onChange={(e) => setCsrFocus(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      {CSR_FOCUS_AREAS.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Name of the Project */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Name of the Project <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter project name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      projectFormSubmitted && projectErrors.projectName ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {projectFormSubmitted && projectErrors.projectName && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.projectName}</p>
                  )}
                </div>

                {/* Project Received From */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Project received from <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter project received from"
                    value={projectReceivedFrom}
                    onChange={(e) => setProjectReceivedFrom(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      projectFormSubmitted && projectErrors.projectReceivedFrom ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {projectFormSubmitted && projectErrors.projectReceivedFrom && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.projectReceivedFrom}</p>
                  )}
                </div>

                {/* Project Value */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Project Value(Rs. In Lakhs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={projectValue}
                    onChange={(e) => setProjectValue(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      projectFormSubmitted && projectErrors.projectValue ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {projectFormSubmitted && projectErrors.projectValue && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.projectValue}</p>
                  )}
                </div>

                {/* Impact / Outcome */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Impact/ Possible Outcome of the Project <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter impact / outcome"
                    value={impactOutcome}
                    onChange={(e) => setImpactOutcome(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      projectFormSubmitted && projectErrors.impactOutcome ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {projectFormSubmitted && projectErrors.impactOutcome && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.impactOutcome}</p>
                  )}
                </div>

                {/* Target Beneficiaries */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Target Beneficiaries <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter target beneficiaries"
                    value={targetBeneficiaries}
                    onChange={(e) => setTargetBeneficiaries(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      projectFormSubmitted && projectErrors.targetBeneficiaries ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {projectFormSubmitted && projectErrors.targetBeneficiaries && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.targetBeneficiaries}</p>
                  )}
                </div>

                {/* Project Status */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Project Status <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      {CSR_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Financial Year */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Financial Year <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={financialYear}
                      onChange={(e) => setFinancialYear(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      {FINANCIAL_YEARS.map(fy => (
                        <option key={fy} value={fy}>{fy}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Commenced On */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Commenced On
                  </label>
                  <input
                    type="date"
                    value={commencedOn}
                    onChange={(e) => setCommencedOn(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200"
                  />
                </div>

                {/* Completed On */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Completed On
                  </label>
                  <input
                    type="date"
                    value={completedOn}
                    onChange={(e) => setCompletedOn(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      projectFormSubmitted && projectErrors.completedOn ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {projectFormSubmitted && projectErrors.completedOn && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.completedOn}</p>
                  )}
                </div>

                {/* Physical Progress */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Physical Progress (in %)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    value={physicalProgress}
                    onChange={(e) => setPhysicalProgress(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200"
                  />
                </div>

                {/* Financial Progress */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Financial Progress (in %)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    value={financialProgress}
                    onChange={(e) => setFinancialProgress(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200"
                  />
                </div>

                {/* Remarks of the Project */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Remarks of the Project
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 resize-none"
                  />
                </div>

              </div>
            </div>

            {/* Section 2: Expenditure Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span>Expenditure</span>
              </h4>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0f417a] text-white select-none">
                    <tr>
                      <th className="py-2.5 px-4 font-bold w-16 text-center">S No</th>
                      <th className="py-2.5 px-4 font-bold">Financial Year</th>
                      <th className="py-2.5 px-4 font-bold">Expenditure (in lakhs)</th>
                      <th className="py-2.5 px-4 font-bold w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expenditures.map((exp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="py-2.5 px-4 text-center font-bold text-slate-500 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-4">
                          <div className="relative max-w-xs">
                            <select
                              value={exp.year}
                              onChange={(e) => handleExpenditureChange(idx, 'year', e.target.value)}
                              className="appearance-none w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              {FINANCIAL_YEARS.map(fy => (
                                <option key={fy} value={fy}>{fy}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={exp.cost}
                            onChange={(e) => handleExpenditureChange(idx, 'cost', e.target.value)}
                            className="w-full max-w-sm text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="py-2 px-4 text-center">
                          {idx === 0 ? (
                            <button
                              type="button"
                              onClick={handleAddExpenditureRow}
                              title="Add more expenditure row"
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg transition cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveExpenditureRow(idx)}
                              title="Remove row"
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Media Uploads */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span>Media & Documents</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Project Completion Documentation */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Project Completion Documentation
                  </label>
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                    NOTE: Only PDF files can be uploaded. File Size: Max. 20 MB.
                  </p>

                  <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl shadow-xs">
                    <input
                      type="file"
                      ref={docInputRef}
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setDocFile(e.target.files[0]);
                          setDocFileName(e.target.files[0].name);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                    >
                      Upload
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs font-medium">
                      {docFileName || docFile?.name || "Drag & Drop Files"}
                    </span>
                  </div>
                </div>

                {/* 2. Gallery (Photos and Videos) */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Gallery (Photos and Videos)
                  </label>
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                    NOTE: Multiple images can be uploaded.
                  </p>

                  <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl shadow-xs">
                    <input
                      type="file"
                      ref={galleryInputRef}
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setGalleryFiles(Array.from(e.target.files));
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                    >
                      Upload
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs font-medium">
                      {galleryFiles.length > 0
                        ? `${galleryFiles.length} file(s) selected`
                        : existingGallery.length > 0
                        ? `${existingGallery.length} file(s) available`
                        : "Drag & Drop Files"}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Actions: Submit (Green) & Exit (Red) */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={submittingProject}
                className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{submittingProject ? "Submitting..." : "Submit"}</span>
              </button>

              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                Exit
              </button>
            </div>

          </form>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ADD CSR FUND DETAILS (CONSULTANT APPOINTMENT STYLE) */}
      {/* ========================================================= */}
      {activeFormTab === 'fund' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in w-full">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                Add CSR Fund Details
              </h3>
              <p className="text-[10px] text-[#eadede] font-semibold tracking-wide mt-0.5">
                Ministry of Ports, Shipping and Waterways
              </p>
            </div>
          </div>

          <form onSubmit={handleFundSubmit} className="p-6 space-y-6">
            
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Coins className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span>Fund Allocation Details</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* 1. Financial Year */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Financial Year <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={fundFY}
                      onChange={(e) => setFundFY(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      {FINANCIAL_YEARS.map(fy => (
                        <option key={fy} value={fy}>{fy}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* 2. Net Profit */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Net Profit (Rs.In lakhs)<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={fundNetProfit}
                    onChange={(e) => setFundNetProfit(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      fundFormSubmitted && fundErrors.netProfit ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {fundFormSubmitted && fundErrors.netProfit && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{fundErrors.netProfit}</p>
                  )}
                </div>

                {/* 3. Opening Balance */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Opening Balance under CSR fund (Rs.In lakhs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={fundOpeningBalance}
                    onChange={(e) => setFundOpeningBalance(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      fundFormSubmitted && fundErrors.openingBalance ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {fundFormSubmitted && fundErrors.openingBalance && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{fundErrors.openingBalance}</p>
                  )}
                </div>

                {/* 4. CSR Fund Allotted */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    CSR fund allotted for the year (Rs.In lakhs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={fundAllotted}
                    onChange={(e) => setFundAllotted(e.target.value)}
                    className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                      fundFormSubmitted && fundErrors.fundAllotted ? 'border-red-500 bg-red-50/20' : 'border-slate-250 dark:border-slate-800'
                    }`}
                  />
                  {fundFormSubmitted && fundErrors.fundAllotted && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{fundErrors.fundAllotted}</p>
                  )}
                </div>

              </div>

              <p className="text-[10px] text-slate-400 italic pt-1">
                Fields marked with * are mandatory
              </p>
            </div>

            {/* Bottom Actions: Submit (Green) & Exit (Red) */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={submittingFund}
                className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{submittingFund ? "Saving..." : "Submit"}</span>
              </button>

              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                Exit
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
