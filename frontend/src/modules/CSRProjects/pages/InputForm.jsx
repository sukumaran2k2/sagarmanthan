import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, Calendar, FileText, Upload, Plus, Trash2, 
  Image as ImageIcon, Heart, Coins, ListTodo, AlertCircle, 
  CheckCircle2, X, ChevronDown, Save, ArrowLeft, Layers, 
  TrendingUp, IndianRupee, HelpCircle, Eye, ArrowRight, Check,
  Clock, Users, CheckCircle
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

const CSR_STAGES = [
  {
    id: 'general',
    number: '01',
    title: 'General Details',
    subtitle: 'Project & Scope',
    icon: Layers,
  },
  {
    id: 'outcomes',
    number: '02',
    title: 'Impact & Outcomes',
    subtitle: 'Beneficiaries & Remarks',
    icon: Heart,
  },
  {
    id: 'status',
    number: '03',
    title: 'Status & Progress',
    subtitle: 'Timelines & %',
    icon: Clock,
  },
  {
    id: 'expenditure',
    number: '04',
    title: 'Expenditure & Media',
    subtitle: 'Cost & Documents',
    icon: IndianRupee,
  },
];

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
  const [activeSection, setActiveSection] = useState('general');

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
  // STAGE VALIDITY & PROGRESS TRACKING
  // ==========================================
  const isGeneralValid = Boolean(
    projectName.trim() &&
    projectReceivedFrom.trim() &&
    projectValue !== '' &&
    !isNaN(Number(projectValue)) &&
    Number(projectValue) >= 0 &&
    financialYear &&
    csrFocus
  );

  const isOutcomesValid = Boolean(
    isGeneralValid &&
    impactOutcome.trim() &&
    targetBeneficiaries.trim()
  );

  const isStatusValid = Boolean(
    isGeneralValid &&
    isOutcomesValid &&
    projectStatus &&
    (!commencedOn || !completedOn || completedOn >= commencedOn)
  );

  const isExpenditureValid = Boolean(
    isGeneralValid &&
    isOutcomesValid &&
    isStatusValid &&
    (expenditures.some(e => e.cost !== '' && !isNaN(Number(e.cost))) || !!docFileName || galleryFiles.length > 0 || existingGallery.length > 0)
  );

  const stageProgress = {
    general: isGeneralValid,
    outcomes: isOutcomesValid,
    status: isStatusValid,
    expenditure: isExpenditureValid,
  };

  const clearFieldError = (field) => {
    if (projectErrors[field]) {
      setProjectErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Stage 1: General Details Validator
  const validateGeneralStage = () => {
    const errs = {};
    if (!projectName.trim()) {
      errs.projectName = 'Name of the Project is required.';
    }
    if (!projectReceivedFrom.trim()) {
      errs.projectReceivedFrom = 'Project received from is required.';
    }
    if (projectValue === '' || isNaN(Number(projectValue)) || Number(projectValue) < 0) {
      errs.projectValue = 'Valid Project Value (Rs. in Lakhs) is required.';
    }
    if (Object.keys(errs).length > 0) {
      setProjectErrors(prev => ({ ...prev, ...errs }));
      triggerNotification?.("Please fill all mandatory fields (*) in Stage 1 before proceeding.", "warning");
      return false;
    }
    return true;
  };

  // Stage 2: Outcomes Validator
  const validateOutcomesStage = () => {
    const errs = {};
    if (!impactOutcome.trim()) {
      errs.impactOutcome = 'Impact / Possible Outcome is required.';
    }
    if (!targetBeneficiaries.trim()) {
      errs.targetBeneficiaries = 'Target Beneficiaries is required.';
    }
    if (Object.keys(errs).length > 0) {
      setProjectErrors(prev => ({ ...prev, ...errs }));
      triggerNotification?.("Please fill all mandatory fields (*) in Stage 2 before proceeding.", "warning");
      return false;
    }
    return true;
  };

  // Stage 3: Status Validator
  const validateStatusStage = () => {
    const errs = {};
    if (commencedOn && completedOn && completedOn < commencedOn) {
      errs.completedOn = 'Completed date cannot be earlier than Commenced date.';
    }
    if (Object.keys(errs).length > 0) {
      setProjectErrors(prev => ({ ...prev, ...errs }));
      triggerNotification?.("Completed date cannot be earlier than Commenced date in Stage 3.", "warning");
      return false;
    }
    return true;
  };

  // Stage Navigation Controller with Strict Sequential Validation
  const handleNavigateToStage = (targetStageId) => {
    if (targetStageId === activeSection) return;

    const stageOrder = ['general', 'outcomes', 'status', 'expenditure'];
    const currentIndex = stageOrder.indexOf(activeSection);
    const targetIndex = stageOrder.indexOf(targetStageId);

    // If moving backwards to a previous stage, allow freely
    if (targetIndex <= currentIndex) {
      setActiveSection(targetStageId);
      return;
    }

    // Moving forward to Stage 2, 3, or 4 -> Stage 1 must be valid
    if (targetIndex >= 1) {
      if (!validateGeneralStage()) {
        setActiveSection('general');
        return;
      }
    }

    // Moving forward to Stage 3 or 4 -> Stage 2 must also be valid
    if (targetIndex >= 2) {
      if (!validateOutcomesStage()) {
        setActiveSection('outcomes');
        return;
      }
    }

    // Moving forward to Stage 4 -> Stage 3 must also be valid
    if (targetIndex >= 3) {
      if (!validateStatusStage()) {
        setActiveSection('status');
        return;
      }
    }

    setActiveSection(targetStageId);
  };

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
  const handleProjectSubmit = async (e) => {
    if (e) e.preventDefault();

    // Comprehensive sequential validation before submission
    if (!validateGeneralStage()) {
      setActiveSection('general');
      return;
    }
    if (!validateOutcomesStage()) {
      setActiveSection('outcomes');
      return;
    }
    if (!validateStatusStage()) {
      setActiveSection('status');
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
      
      {/* Sub-Tabs Row */}
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

        {/* <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-[#0f417a] dark:text-slate-400 dark:hover:text-blue-400 px-3 py-1.5 mb-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to List</span>
        </button> */}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ADD / UPDATE CSR PROJECT (STAGE-WISE MULTI-STEP) */}
      {/* ========================================================= */}
      {activeFormTab === 'project' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
          
          {/* Header Banner with Stage-Wise Stepper */}
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-5 text-white border-b border-[#0a2d55]/20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              
              {/* Left Title */}
              <div className="lg:col-span-3">
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  {isEditProject ? "Update CSR Project" : "Add CSR Project"}
                </h3>
                <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">
                  Ministry of Ports, Shipping and Waterways
                </p>
              </div>

              {/* Center Stepper Progress Bar */}
              <div className="lg:col-span-7">
                <div className="relative w-full max-w-xl mx-auto py-1">
                  
                  {/* Background Track Line */}
                  <div className="absolute top-[14px] md:top-[16px] left-[12%] right-[12%] h-1.5 bg-white/20 rounded-full -translate-y-1/2 z-0" />
                  
                  {/* Filled Progress Line */}
                  <div 
                    className="absolute top-[14px] md:top-[16px] left-[12%] h-1.5 bg-emerald-400 rounded-full -translate-y-1/2 z-0 transition-all duration-500 ease-out"
                    style={{
                      width: `${(CSR_STAGES.findIndex(s => s.id === activeSection) / (CSR_STAGES.length - 1)) * 76}%`
                    }}
                  />

                  {/* Step Nodes Grid */}
                  <div className="relative z-10 w-full grid grid-cols-4 items-start">
                    {CSR_STAGES.map((stage, idx) => {
                      const isActive = activeSection === stage.id;
                      const isCompleted = Boolean(stageProgress[stage.id]);

                      return (
                        <div
                          key={stage.id}
                          onClick={() => handleNavigateToStage(stage.id)}
                          className="flex flex-col items-center text-center cursor-pointer group px-1"
                        >
                          {/* Circular Number Node */}
                          <div
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-md ${
                              isCompleted && !isActive
                                ? 'bg-emerald-500 text-white shadow-emerald-900/30 hover:bg-emerald-400 hover:scale-105'
                                : isActive
                                ? 'bg-white text-[#0f417a] ring-4 ring-emerald-400/60 scale-110 shadow-lg'
                                : 'bg-white/15 text-white/60 border border-white/20 backdrop-blur-md hover:bg-white/25 hover:text-white'
                            }`}
                          >
                            {isCompleted && !isActive ? (
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            ) : (
                              idx + 1
                            )}
                          </div>

                          {/* Step Label */}
                          <div className="mt-1.5 flex flex-col items-center">
                            <span className={`text-[10px] md:text-[11px] font-bold tracking-tight leading-tight transition-colors truncate max-w-[85px] sm:max-w-none ${
                              isActive
                                ? 'text-white font-black drop-shadow-sm'
                                : isCompleted
                                ? 'text-emerald-200 font-semibold'
                                : 'text-blue-100/60 font-medium'
                            }`}>
                              {stage.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Stage Indicator Pill */}
              <div className="lg:col-span-2 hidden lg:flex justify-end items-center">
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white font-mono tracking-wider shadow-xs">
                  Stage {CSR_STAGES.findIndex(s => s.id === activeSection) + 1} of 4
                </span>
              </div>

            </div>
          </div>

          <form onSubmit={handleProjectSubmit} className="p-6 space-y-6">
            
            {/* ========================================================= */}
            {/* STAGE 1: GENERAL DETAILS */}
            {/* ========================================================= */}
            {activeSection === 'general' && (
              <div className="space-y-5 animate-fade-in">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                    <span>General Project Details</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Organisation (if applicable) */}
                    {organisations.length > 1 && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Organisation <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={organisationId}
                            onChange={(e) => setOrganisationId(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            {organisations.map(o => (
                              <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </div>
                    )}

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
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Name of the Project <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter project name"
                        value={projectName}
                        onChange={(e) => {
                          setProjectName(e.target.value);
                          clearFieldError('projectName');
                        }}
                        className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                          projectErrors.projectName ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500/30' : 'border-slate-250 dark:border-slate-800'
                        }`}
                      />
                      {projectErrors.projectName && (
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
                        onChange={(e) => {
                          setProjectReceivedFrom(e.target.value);
                          clearFieldError('projectReceivedFrom');
                        }}
                        className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                          projectErrors.projectReceivedFrom ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500/30' : 'border-slate-250 dark:border-slate-800'
                        }`}
                      />
                      {projectErrors.projectReceivedFrom && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.projectReceivedFrom}</p>
                      )}
                    </div>

                    {/* Project Value */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Project Value (Rs. In Lakhs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={projectValue}
                        onChange={(e) => {
                          setProjectValue(e.target.value);
                          clearFieldError('projectValue');
                        }}
                        className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                          projectErrors.projectValue ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500/30' : 'border-slate-250 dark:border-slate-800'
                        }`}
                      />
                      {projectErrors.projectValue && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.projectValue}</p>
                      )}
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

                  </div>
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-rose-500 font-bold italic">
                    * Asterisks marked with red are mandatory fields
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigateToStage('outcomes')}
                    className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <span>Proceed to Outcomes</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STAGE 2: IMPACT & OUTCOMES */}
            {/* ========================================================= */}
            {activeSection === 'outcomes' && (
              <div className="space-y-5 animate-fade-in">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                    <span>Impact, Beneficiaries & Remarks</span>
                  </h4>

                  <div className="space-y-4">
                    
                    {/* Impact / Outcome */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Impact/ Possible Outcome of the Project <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter impact / outcome of the project..."
                        value={impactOutcome}
                        onChange={(e) => {
                          setImpactOutcome(e.target.value);
                          clearFieldError('impactOutcome');
                        }}
                        className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                          projectErrors.impactOutcome ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500/30' : 'border-slate-250 dark:border-slate-800'
                        }`}
                      />
                      {projectErrors.impactOutcome && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.impactOutcome}</p>
                      )}
                    </div>

                    {/* Target Beneficiaries */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Target Beneficiaries <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Enter target beneficiaries..."
                        value={targetBeneficiaries}
                        onChange={(e) => {
                          setTargetBeneficiaries(e.target.value);
                          clearFieldError('targetBeneficiaries');
                        }}
                        className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                          projectErrors.targetBeneficiaries ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500/30' : 'border-slate-250 dark:border-slate-800'
                        }`}
                      />
                      {projectErrors.targetBeneficiaries && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">{projectErrors.targetBeneficiaries}</p>
                      )}
                    </div>

                    {/* Remarks of the Project */}
                    <div className="space-y-1.5">
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

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-rose-500 font-bold italic">
                    * Asterisks marked with red are mandatory fields
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setActiveSection('general')}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigateToStage('status')}
                      className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <span>Proceed to Status</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STAGE 3: STATUS & PROGRESS */}
            {/* ========================================================= */}
            {activeSection === 'status' && (
              <div className="space-y-5 animate-fade-in">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                    <span>Status & Progress Details</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Project Status */}
                    <div className="space-y-1.5 md:col-span-2">
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
                        onChange={(e) => {
                          setCompletedOn(e.target.value);
                          clearFieldError('completedOn');
                        }}
                        className={`w-full text-xs p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 ${
                          projectErrors.completedOn ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500/30' : 'border-slate-250 dark:border-slate-800'
                        }`}
                      />
                      {projectErrors.completedOn && (
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

                  </div>
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-rose-500 font-bold italic">
                    * Asterisks marked with red are mandatory fields
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setActiveSection('outcomes')}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigateToStage('expenditure')}
                      className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0f417a] hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <span>Proceed to Expenditure</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STAGE 4: EXPENDITURE & MEDIA UPLOADS */}
            {/* ========================================================= */}
            {activeSection === 'expenditure' && (
              <div className="space-y-5 animate-fade-in">
                
                {/* Section 1: Multi-Year Expenditure Breakdown */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                    <span>Yearly Expenditure Breakdown</span>
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

                {/* Section 2: Media & Documents Uploads */}
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

                {/* Footer Navigation & Final Submission */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-rose-500 font-bold italic">
                    * Asterisks marked with red are mandatory fields
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setActiveSection('status')}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submittingProject}
                      className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{submittingProject ? "Submitting..." : isEditProject ? "Update Project" : "Submit Project"}</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

          </form>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ADD CSR FUND DETAILS */}
      {/* ========================================================= */}
      {activeFormTab === 'fund' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in w-full">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                Add CSR Fund Details
              </h3>
              <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">
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
            </div>

            {/* Bottom Actions: Mandatory notice, Submit (Green) & Exit (Red) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-rose-500 font-bold italic">
                * Asterisks marked with red are mandatory fields
              </span>
              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={submittingFund}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{submittingFund ? "Saving..." : "Submit Fund"}</span>
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
