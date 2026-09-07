import React, { useEffect, useMemo, useState } from 'react';
import { 
  ArrowLeft, Download, Save, Trash2, Upload, Briefcase, 
  Building2, DollarSign, Calendar, MapPin, Landmark, 
  TrendingUp, Layers, CheckCircle2, AlertTriangle, FileText, 
  ChevronRight, ChevronLeft, Plus, X, Eye, Sparkles, Check,
  Info
} from 'lucide-react';
import {
  FUNDING_SOURCE_OPTIONS,
  IMPLEMENTATION_TYPE_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_STAGE_OPTIONS,
} from '../utils/constants';
import { fetchMmtDropdown } from '../api';
import PlanningSanctioningStage from './PlanningSanctioningStage';
import UnderTenderingStage from './UnderTenderingStage';
import UnderImplementationStage from './UnderImplementationStage';
import ProjectCompletionStage from './ProjectCompletionStage';

const EMPTY_FORM = {
  projectID: '',
  subProjectID: '-1',
  projectName: '',
  projectBrief: '',
  estimatedProjectCost: '',
  projectType: '',
  implementationMode: 'Direct',
  implementationType: '',
  primaryImplementingAgency: '',
  secondaryImplementingAgency: '',
  projectCategory: '',
  scheme: '',
  initiative: '',
  projectInitiatedDate: '',
  targetCompletionDate: '',
  revisedTargetCompletionDate: '',
  projectOutput: '',
  newProjectOutputUnits: '',
  projectOutcome: '',
  newProjectOutcomeUnits: '',
  capacityAddition: '',
  sourceOfFunding: '',
  sagarmalaFunding: '',
  gbsComponents: '',
  iebrComponents: '',
  pppComponents: '',
  loansComponents: '',
  multiFundComponents: '',
  stateGovFundComponents: '',
  pmmsyComponents: '',
  sagarmalaComponents: '',
  otherSourceFundingComp: '',
  primaryFundingAgency: '',
  secondaryFundingAgency: '',
  state: '',
  district: '',
  taluka: '',
  village: '',
  mpConstituency: '',
  onLandAcquistion: null,
  landAreaReq: '',
  onAcquisitionCompleted: null,
  percentLandAcquired: '',
  selectedStage: 'Project Initiated',
  onSubProjectAvailable: 0,
  subProjectNum: 0,
  subProjectsTab: [],
};

const FORM_SECTIONS = [
  { id: 'basic', number: '01', title: 'Basic Information', subtitle: 'Name, Agency & Category', icon: Briefcase },
  { id: 'cost', number: '02', title: 'Cost & Funding', subtitle: 'Outlay & Sources', icon: DollarSign },
  { id: 'location', number: '03', title: 'Location & Land', subtitle: 'State, District & Land', icon: MapPin },
  { id: 'timeline', number: '04', title: 'Timelines & Deliverables', subtitle: 'Dates, Output & Capacity', icon: Calendar },
  { id: 'docs', number: '05', title: 'Project Documents', subtitle: 'Attachments & PPTs', icon: FileText },
];

function toRadioValue(value) {
  if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'yes') return 1;
  if (value === false || value === 0 || value === '0' || String(value).toLowerCase() === 'no') return 0;
  return null;
}

function getInitialForm(initialData) {
  if (!initialData) return { ...EMPTY_FORM };
  const raw = initialData.raw || {};

  const projectID = initialData.projectId || initialData.projectID || raw.project_id || '';
  const subProjectID =
    initialData.subProjectId ||
    initialData.subProjectID ||
    raw.sub_project_id ||
    (String(raw.sub_project_id || '').trim() ? raw.sub_project_id : '-1');

  return {
    ...EMPTY_FORM,
    projectID: String(projectID || ''),
    subProjectID: String(subProjectID || '-1'),
    projectName: initialData.projectName || raw.project_name || '',
    projectBrief: initialData.projectBrief || raw.project_brief || '',
    estimatedProjectCost:
      initialData.estimatedProjectCost || initialData.cost || raw.estimated_cost || raw.sanctioned_cost || '',
    projectType: initialData.projectType || raw.project_type || '',
    implementationMode: initialData.implementationMode || raw.mode_of_implememtation || 'Direct',
    implementationType: initialData.implementationType || raw.implememtation_type || '',
    primaryImplementingAgency:
      initialData.primaryImplementingAgency || initialData.organisationName || raw.primary_ia_id || '',
    secondaryImplementingAgency:
      initialData.secondaryImplementingAgency || raw.secondary_ia_id || raw.sec_imp_agency || '',
    projectCategory:
      initialData.projectCategory || raw.project_category_id || raw.project_category_names || initialData.category || '',
    scheme: initialData.scheme || raw.scheme_id || raw.scheme_name || '',
    initiative: initialData.initiative || raw.initiative_id || raw.initiative_names || '',
    projectInitiatedDate:
      initialData.projectInitiatedDate || (raw.project_intiated_date ? String(raw.project_intiated_date).slice(0, 10) : ''),
    targetCompletionDate:
      initialData.targetCompletionDate || (raw.target_completion_date ? String(raw.target_completion_date).slice(0, 10) : ''),
    revisedTargetCompletionDate: raw.latest_revised_target_completion_date
      ? String(raw.latest_revised_target_completion_date).slice(0, 10)
      : '',
    projectOutput: initialData.projectOutput || raw.project_output_id || raw.project_output_name || '',
    newProjectOutputUnits: initialData.newProjectOutputUnits || raw.project_output_units || '',
    projectOutcome: initialData.projectOutcome || raw.project_outcome_id || raw.project_outcome_name || '',
    newProjectOutcomeUnits: initialData.newProjectOutcomeUnits || raw.project_outcome_units || '',
    capacityAddition: initialData.capacityAddition || raw.capacity_addition || '',
    sourceOfFunding: initialData.sourceOfFunding || raw.source_of_funding_id || raw.source_of_funding_names || '',
    sagarmalaFunding: raw.is_sagarmala_funded ? '1' : '',
    gbsComponents: raw.gbs_components || '',
    iebrComponents: raw.iebr_components || '',
    pppComponents: raw.ppp_components || '',
    loansComponents: raw.loans_components || '',
    multiFundComponents: raw.multilateral_components || '',
    stateGovFundComponents: raw.state_gov_fund_components || '',
    pmmsyComponents: raw.pmmsy_components || '',
    sagarmalaComponents: raw.sagarmala_components || '',
    otherSourceFundingComp: raw.other_source_funding_comp || '',
    primaryFundingAgency: initialData.primaryFundingAgency || raw.primary_funding_agency_id || '',
    secondaryFundingAgency: initialData.secondaryFundingAgency || raw.secondary_funding_agency_id || '',
    state: initialData.state || raw.state_id || raw.sub_state_id || raw.state_names || raw.sub_state_names || '',
    district:
      initialData.district || raw.district_id || raw.sub_district_id || raw.district_names || raw.sub_district_names || '',
    taluka: initialData.taluka || raw.taluka_id || '',
    village: initialData.village || raw.village_id || '',
    mpConstituency:
      initialData.mpConstituency || raw.mp_constituency_id || raw.sub_mp_constituency_id || raw.mp_constituency_names || raw.sub_mp_constituency_names || '',
    onLandAcquistion: toRadioValue(raw.on_land_acquisition),
    landAreaReq: raw.land_area_req || '',
    onAcquisitionCompleted: toRadioValue(raw.on_acquisition_completed),
    percentLandAcquired: raw.percent_land_acq || '',
    selectedStage: initialData.selectedStage || initialData.stage || raw.stage_name || 'Project Initiated',
    onSubProjectAvailable: Number(initialData.onSubProjectAvailable || raw.on_sub_project_available || 0),
    subProjectNum: Number(initialData.subProjectNum || raw.sub_projec_num || 0),
    subProjectsTab: [],
  };
}

function hasLockedProjectTypeValue(value) {
  const text = String(value || '').trim();
  return [
    'SFC',
    'EFC',
    'PIB',
    'DIB',
    'PPPAC',
    'CSS',
    'Port Level Approval',
    'Secretary Level Approval',
  ].includes(text);
}

function Label({ children, required = false }) {
  return (
    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
      {children} {required ? <span className="text-rose-500">*</span> : null}
    </label>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  return <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {error}</p>;
}

export default function ProjectBasicInfoForm({
  initialData = null,
  canSubmit = false,
  readOnly = false,
  loading = false,
  onBack,
  onSubmit,
  onSubmitStage,
  documentRows = [],
  documentsLoading = false,
  uploadingDocuments = false,
  onUploadDocuments,
  onDeleteDocument,
  onDownloadDocument,
}) {
  const [formData, setFormData] = useState(() => getInitialForm(initialData));
  const [errors, setErrors] = useState({});
  const [activeSection, setActiveSection] = useState('basic');
  const [activeSubStage, setActiveSubStage] = useState(() => {
    const rawStage = String(initialData?.stage || initialData?.selectedStage || '').toLowerCase();
    if (rawStage.includes('tender')) return 'tendering';
    if (rawStage.includes('implement')) return 'implementation';
    if (rawStage.includes('complete')) return 'completion';
    return 'planning';
  });
  const [documentType, setDocumentType] = useState('project_ppt');
  const [documentFiles, setDocumentFiles] = useState([]);

  const [stateOptions, setStateOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [mpOptions, setMpOptions] = useState([]);
  const [schemeOptions, setSchemeOptions] = useState([]);
  const [initiativeOptions, setInitiativeOptions] = useState([]);
  const [projectCategoryOptions, setProjectCategoryOptions] = useState([]);
  const [iaOptions, setIaOptions] = useState([]);
  const [faOptions, setFaOptions] = useState([]);
  const [sourceOfFundingOptions, setSourceOfFundingOptions] = useState([]);
  const [outputOptions, setOutputOptions] = useState([]);
  const [outcomeOptions, setOutcomeOptions] = useState([]);

  const isEditMode = Boolean(initialData?.id);
  const canInteract = canSubmit && !readOnly && !loading;
  const isProjectTypeLocked = isEditMode && hasLockedProjectTypeValue(formData.projectType);
  const isTargetDateLocked = isEditMode && Boolean(formData.targetCompletionDate);

  const selectedStageOptions = useMemo(
    () => PROJECT_STAGE_OPTIONS.filter((item) => item !== 'All'),
    []
  );

  const selectedCategoryOptions = useMemo(
    () => PROJECT_CATEGORY_OPTIONS.filter((item) => item !== 'All'),
    []
  );

  function getMultiValue(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value == null || value === '') return [];
    return String(value)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  const selectedStateIds = useMemo(() => {
    return getMultiValue(formData.state);
  }, [formData.state]);

  const filteredDistrictOptions = useMemo(() => {
    if (!selectedStateIds.length) return districtOptions;
    return districtOptions.filter((item) => selectedStateIds.includes(String(item.state_id)));
  }, [districtOptions, selectedStateIds]);

  const filteredMpOptions = useMemo(() => {
    if (!selectedStateIds.length) return mpOptions;
    return mpOptions.filter((item) => selectedStateIds.includes(String(item.state_id)));
  }, [mpOptions, selectedStateIds]);

  const selectedFundingSourceIds = useMemo(
    () => getMultiValue(formData.sourceOfFunding),
    [formData.sourceOfFunding]
  );

  const fundingVisibility = useMemo(
    () => ({
      gbs: selectedFundingSourceIds.includes('1'),
      iebr: selectedFundingSourceIds.includes('2'),
      ppp: selectedFundingSourceIds.includes('3'),
      loans: selectedFundingSourceIds.includes('4'),
      multilateral: selectedFundingSourceIds.includes('5'),
      stateGovFund: selectedFundingSourceIds.includes('6'),
      otherSources: selectedFundingSourceIds.includes('7'),
      sagarmala: selectedFundingSourceIds.includes('8'),
      pmmsy: selectedFundingSourceIds.includes('9'),
    }),
    [selectedFundingSourceIds]
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const refs = [
        { key: 'state', tid: 'mmt_state' },
        { key: 'district', tid: 'mmt_district' },
        { key: 'mp', tid: 'mmt_mp_constituency' },
        { key: 'scheme', tid: 'mmt_scheme' },
        { key: 'initiative', tid: 'mmt_initiative' },
        { key: 'category', tid: 'mmt_project_category' },
        { key: 'ia', tid: 'mmt_implementing_agency' },
        { key: 'fa', tid: 'mmt_funding_agency' },
        { key: 'sof', tid: 'mmt_source_of_funding' },
        { key: 'output', tid: 'mmt_output' },
        { key: 'outcome', tid: 'mmt_outcome' },
      ];

      const settled = await Promise.allSettled(refs.map((item) => fetchMmtDropdown(item.tid)));
      if (!mounted) return;

      const byKey = Object.fromEntries(
        refs.map((item, idx) => {
          const result = settled[idx];
          if (result.status === 'fulfilled') {
            return [item.key, Array.isArray(result.value?.data) ? result.value.data : []];
          }
          return [item.key, []];
        })
      );

      setStateOptions(byKey.state);
      setDistrictOptions(byKey.district);
      setMpOptions(byKey.mp);
      setSchemeOptions(byKey.scheme);
      setInitiativeOptions(byKey.initiative);
      setProjectCategoryOptions(byKey.category);
      setIaOptions(byKey.ia);
      setFaOptions(byKey.fa);
      setSourceOfFundingOptions(byKey.sof);
      setOutputOptions(byKey.output);
      setOutcomeOptions(byKey.outcome);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const validate = () => {
    const nextErrors = {};

    if (!String(formData.projectName || '').trim()) {
      nextErrors.projectName = 'Project name is required.';
    }

    if (!String(formData.primaryImplementingAgency || '').trim()) {
      nextErrors.primaryImplementingAgency = 'Primary implementing agency is required.';
    }

    if (!String(formData.projectCategory || '').trim()) {
      nextErrors.projectCategory = 'Project category is required.';
    }

    if (!String(formData.scheme || '').trim()) {
      nextErrors.scheme = 'Scheme is required.';
    }

    if (!String(formData.initiative || '').trim()) {
      nextErrors.initiative = 'Initiative is required.';
    }

    if (!String(formData.estimatedProjectCost || '').trim()) {
      nextErrors.estimatedProjectCost = 'Estimated project cost is required.';
    } else if (Number(formData.estimatedProjectCost) <= 0) {
      nextErrors.estimatedProjectCost = 'Estimated cost must be greater than 0.';
    }

    if (!String(formData.sourceOfFunding || '').trim()) {
      nextErrors.sourceOfFunding = 'Source of funding is required.';
    }

    if (!String(formData.state || '').trim()) {
      nextErrors.state = 'State is required.';
    }

    if (!String(formData.projectInitiatedDate || '').trim()) {
      nextErrors.projectInitiatedDate = 'Project initiated date is required.';
    }

    if (!isTargetDateLocked && !String(formData.targetCompletionDate || '').trim()) {
      nextErrors.targetCompletionDate = 'Target completion date is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFormSubmit = (e) => {
    e?.preventDefault();
    if (!validate()) {
      // Find first section with error and switch to it
      if (errors.projectName || errors.primaryImplementingAgency || errors.projectCategory || errors.scheme || errors.initiative) {
        setActiveSection('basic');
      } else if (errors.estimatedProjectCost || errors.sourceOfFunding) {
        setActiveSection('cost');
      } else if (errors.state) {
        setActiveSection('location');
      } else if (errors.projectInitiatedDate || errors.targetCompletionDate) {
        setActiveSection('timeline');
      }
      return;
    }

    onSubmit?.(formData);
  };

  const handleDocumentUploadSubmit = (e) => {
    e.preventDefault();
    if (!documentFiles.length) return;
    onUploadDocuments?.({
      folderName: documentType,
      files: documentFiles,
    });
    setDocumentFiles([]);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Sub Tabs matching MIV DataList Stage Design */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 select-none overflow-x-auto scrollbar-none">
        <div className="flex space-x-1">
          {FORM_SECTIONS.map((sec) => {
            const isSelected = activeSection === sec.id;
            const SecIcon = sec.icon;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                  isSelected ? 'bg-[#0f417a] text-white dark:bg-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {sec.number}
                </span>
                <SecIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{sec.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Body Content */}
      <form id="project-basic-info-form" onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* ================= SECTION 1: BASIC INFORMATION ================= */}
        {activeSection === 'basic' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wide">
                  Basic Project Details
                </h3>
                <p className="text-xs text-slate-500">Specify project name, implementing agencies, scheme and category classification</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Project Name */}
              <div className="md:col-span-2">
                <Label required>Project Name</Label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Enter full comprehensive project name..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                <FieldError error={errors.projectName} />
              </div>

              {/* Project Brief */}
              <div className="md:col-span-2">
                <Label>Project Brief & Objectives</Label>
                <textarea
                  rows={3}
                  value={formData.projectBrief}
                  onChange={(e) => handleInputChange('projectBrief', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Provide executive summary, core deliverables, and strategic scope..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Primary Implementing Agency */}
              <div>
                <Label required>Primary Implementing Agency (IA)</Label>
                <select
                  value={formData.primaryImplementingAgency}
                  onChange={(e) => handleInputChange('primaryImplementingAgency', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Implementing Agency</option>
                  {iaOptions.map((ia, idx) => {
                    const val = ia.id ?? ia.ia_id ?? ia.organisation_id ?? ia.name ?? ia.ia_names ?? idx;
                    const label = ia.name || ia.ia_names || ia.organisation_name || String(val);
                    return (
                      <option key={`ia-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.primaryImplementingAgency} />
              </div>

              {/* Secondary Implementing Agency */}
              <div>
                <Label>Secondary Implementing Agency</Label>
                <input
                  type="text"
                  value={formData.secondaryImplementingAgency}
                  onChange={(e) => handleInputChange('secondaryImplementingAgency', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Optional co-implementing agency name..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Project Category */}
              <div>
                <Label required>Project Category</Label>
                <select
                  value={formData.projectCategory}
                  onChange={(e) => handleInputChange('projectCategory', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Project Category</option>
                  {projectCategoryOptions.map((cat, idx) => {
                    const val = cat.id ?? cat.project_category_id ?? cat.category_id ?? cat.name ?? cat.project_category_names ?? idx;
                    const label = cat.name || cat.project_category_names || cat.category_name || String(val);
                    return (
                      <option key={`cat-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.projectCategory} />
              </div>

              {/* Scheme */}
              <div>
                <Label required>Scheme</Label>
                <select
                  value={formData.scheme}
                  onChange={(e) => handleInputChange('scheme', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Scheme</option>
                  {schemeOptions.map((sch, idx) => {
                    const val = sch.id ?? sch.scheme_id ?? sch.name ?? sch.scheme_name ?? idx;
                    const label = sch.name || sch.scheme_name || String(val);
                    return (
                      <option key={`sch-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.scheme} />
              </div>

              {/* Initiative */}
              <div>
                <Label required>Initiative</Label>
                <select
                  value={formData.initiative}
                  onChange={(e) => handleInputChange('initiative', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Initiative</option>
                  {initiativeOptions.map((init, idx) => {
                    const val = init.id ?? init.initiative_id ?? init.name ?? init.initiative_names ?? idx;
                    const label = init.name || init.initiative_names || String(val);
                    return (
                      <option key={`init-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.initiative} />
              </div>

              {/* Implementation Mode & Type */}
              <div>
                <Label>Implementation Mode</Label>
                <select
                  value={formData.implementationMode}
                  onChange={(e) => handleInputChange('implementationMode', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="Direct">Direct</option>
                  <option value="Deposit">Deposit</option>
                  <option value="PPP">PPP</option>
                  <option value="Joint Venture">Joint Venture</option>
                </select>
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('cost')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Cost & Funding</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: COST & FUNDING ================= */}
        {activeSection === 'cost' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wide">
                  Financial Outlay & Funding Sources
                </h3>
                <p className="text-xs text-slate-500">Specify estimated cost in ₹ Cr, funding splits and agencies</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Estimated Project Cost */}
              <div>
                <Label required>Estimated Project Cost (₹ in Cr)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estimatedProjectCost}
                    onChange={(e) => handleInputChange('estimatedProjectCost', e.target.value)}
                    disabled={!canInteract}
                    placeholder="0.00"
                    className="w-full pl-8 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs font-black text-emerald-600 dark:text-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">Cr.</span>
                </div>
                <FieldError error={errors.estimatedProjectCost} />
              </div>

              {/* Source of Funding */}
              <div>
                <Label required>Source of Funding</Label>
                <select
                  value={formData.sourceOfFunding}
                  onChange={(e) => handleInputChange('sourceOfFunding', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Funding Source</option>
                  {sourceOfFundingOptions.map((sof, idx) => {
                    const val = sof.id ?? sof.sof_id ?? sof.source_id ?? sof.name ?? sof.sof_names ?? idx;
                    const label = sof.name || sof.sof_names || sof.source_name || String(val);
                    return (
                      <option key={`sof-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.sourceOfFunding} />
              </div>

              {/* Primary Funding Agency */}
              <div>
                <Label>Primary Funding Agency</Label>
                <select
                  value={formData.primaryFundingAgency}
                  onChange={(e) => handleInputChange('primaryFundingAgency', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Funding Agency</option>
                  {faOptions.map((fa, idx) => {
                    const val = fa.id ?? fa.fa_id ?? fa.funding_agency_id ?? fa.name ?? fa.fa_names ?? idx;
                    const label = fa.name || fa.fa_names || fa.funding_agency_name || String(val);
                    return (
                      <option key={`fa-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Secondary Funding Agency */}
              <div>
                <Label>Secondary Funding Agency</Label>
                <input
                  type="text"
                  value={formData.secondaryFundingAgency}
                  onChange={(e) => handleInputChange('secondaryFundingAgency', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Optional secondary funding agency..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

            </div>

            {/* Dynamic Funding Component Inputs */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Funding Components Breakdown (₹ in Cr)
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {fundingVisibility.gbs && (
                  <div>
                    <Label>GBS Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.gbsComponents}
                      onChange={(e) => handleInputChange('gbsComponents', e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                )}
                {fundingVisibility.iebr && (
                  <div>
                    <Label>IEBR Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.iebrComponents}
                      onChange={(e) => handleInputChange('iebrComponents', e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                )}
                {fundingVisibility.ppp && (
                  <div>
                    <Label>PPP Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pppComponents}
                      onChange={(e) => handleInputChange('pppComponents', e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                )}
                {fundingVisibility.loans && (
                  <div>
                    <Label>Loans Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.loansComponents}
                      onChange={(e) => handleInputChange('loansComponents', e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                )}
                {fundingVisibility.sagarmala && (
                  <div>
                    <Label>Sagarmala Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sagarmalaComponents}
                      onChange={(e) => handleInputChange('sagarmalaComponents', e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                )}
                {fundingVisibility.stateGovFund && (
                  <div>
                    <Label>State Govt Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.stateGovFundComponents}
                      onChange={(e) => handleInputChange('stateGovFundComponents', e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('basic')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('location')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Location & Land</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= SECTION 3: LOCATION & LAND ================= */}
        {activeSection === 'location' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wide">
                  Location & Land Acquisition Details
                </h3>
                <p className="text-xs text-slate-500">Select administrative geography and record land acquisition status</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* State */}
              <div>
                <Label required>State / Region</Label>
                <select
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select State</option>
                  {stateOptions.map((st, idx) => {
                    const val = st.id ?? st.state_id ?? st.name ?? st.state_names ?? idx;
                    const label = st.name || st.state_names || st.state_name || String(val);
                    return (
                      <option key={`st-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.state} />
              </div>

              {/* District */}
              <div>
                <Label>District</Label>
                <select
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select District</option>
                  {filteredDistrictOptions.map((dist, idx) => {
                    const val = dist.id ?? dist.district_id ?? dist.name ?? dist.district_names ?? idx;
                    const label = dist.name || dist.district_names || dist.district_name || String(val);
                    return (
                      <option key={`dist-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Taluka */}
              <div>
                <Label>Taluka / Tehsil</Label>
                <input
                  type="text"
                  value={formData.taluka}
                  onChange={(e) => handleInputChange('taluka', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Enter taluka name..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Village */}
              <div>
                <Label>Village</Label>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Enter village name..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* MP Constituency */}
              <div>
                <Label>MP Constituency</Label>
                <select
                  value={formData.mpConstituency}
                  onChange={(e) => handleInputChange('mpConstituency', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Constituency</option>
                  {filteredMpOptions.map((mp, idx) => {
                    const val = mp.id ?? mp.mp_constituency_id ?? mp.name ?? mp.mp_constituency_names ?? idx;
                    const label = mp.name || mp.mp_constituency_names || mp.mp_constituency_name || String(val);
                    return (
                      <option key={`mp-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

            </div>

            {/* Land Acquisition Sub-Card */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wider">
                Land Acquisition Information
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <Label>Land Acquisition Needed?</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="onLandAcquisition"
                        checked={formData.onLandAcquistion === 1}
                        onChange={() => handleInputChange('onLandAcquistion', 1)}
                        className="text-blue-600"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="onLandAcquisition"
                        checked={formData.onLandAcquistion === 0}
                        onChange={() => handleInputChange('onLandAcquistion', 0)}
                        className="text-blue-600"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {formData.onLandAcquistion === 1 && (
                  <>
                    <div>
                      <Label>Land Area Required (Acres)</Label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.landAreaReq}
                        onChange={(e) => handleInputChange('landAreaReq', e.target.value)}
                        placeholder="Area in Acres"
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <Label>Acquisition Completed?</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="onAcquisitionCompleted"
                            checked={formData.onAcquisitionCompleted === 1}
                            onChange={() => handleInputChange('onAcquisitionCompleted', 1)}
                            className="text-blue-600"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="onAcquisitionCompleted"
                            checked={formData.onAcquisitionCompleted === 0}
                            onChange={() => handleInputChange('onAcquisitionCompleted', 0)}
                            className="text-blue-600"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label>% Land Acquired</Label>
                      <input
                        type="number"
                        step="0.1"
                        max="100"
                        value={formData.percentLandAcquired}
                        onChange={(e) => handleInputChange('percentLandAcquired', e.target.value)}
                        placeholder="e.g. 75"
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('cost')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('timeline')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Timelines & Deliverables</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= SECTION 4: TIMELINES & DELIVERABLES ================= */}
        {activeSection === 'timeline' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600 dark:text-purple-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wide">
                  Project Timelines, Outputs & Outcomes
                </h3>
                <p className="text-xs text-slate-500">Key milestone dates and measurable physical capacities</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Project Initiated Date */}
              <div>
                <Label required>Project Initiated Date</Label>
                <input
                  type="date"
                  value={formData.projectInitiatedDate}
                  onChange={(e) => handleInputChange('projectInitiatedDate', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                <FieldError error={errors.projectInitiatedDate} />
              </div>

              {/* Target Completion Date */}
              <div>
                <Label required>Target Completion Date</Label>
                <input
                  type="date"
                  value={formData.targetCompletionDate}
                  onChange={(e) => handleInputChange('targetCompletionDate', e.target.value)}
                  disabled={!canInteract || isTargetDateLocked}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-75"
                />
                <FieldError error={errors.targetCompletionDate} />
              </div>

              {/* Revised Target Completion Date */}
              <div>
                <Label>Revised Target Completion Date</Label>
                <input
                  type="date"
                  value={formData.revisedTargetCompletionDate}
                  onChange={(e) => handleInputChange('revisedTargetCompletionDate', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Capacity Addition */}
              <div>
                <Label>Capacity Addition (MTPA / Units)</Label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capacityAddition}
                  onChange={(e) => handleInputChange('capacityAddition', e.target.value)}
                  disabled={!canInteract}
                  placeholder="e.g. 5.5 MTPA"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Output */}
              <div>
                <Label>Project Output</Label>
                <select
                  value={formData.projectOutput}
                  onChange={(e) => handleInputChange('projectOutput', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Project Output</option>
                  {outputOptions.map((out, idx) => {
                    const val = out.id ?? out.output_id ?? out.name ?? out.output_names ?? idx;
                    const label = out.name || out.output_names || out.output_name || String(val);
                    return (
                      <option key={`out-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Outcome */}
              <div>
                <Label>Project Outcome</Label>
                <select
                  value={formData.projectOutcome}
                  onChange={(e) => handleInputChange('projectOutcome', e.target.value)}
                  disabled={!canInteract}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Select Project Outcome</option>
                  {outcomeOptions.map((outc, idx) => {
                    const val = outc.id ?? outc.outcome_id ?? outc.name ?? outc.outcome_names ?? idx;
                    const label = outc.name || outc.outcome_names || outc.outcome_name || String(val);
                    return (
                      <option key={`outc-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('location')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('docs')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Project Documents</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= SECTION 5: DOCUMENTS & ATTACHMENTS ================= */}
        {activeSection === 'docs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-cyan-50 dark:bg-cyan-950/50 rounded-lg text-cyan-600 dark:text-cyan-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wide">
                  Project Documents & Attachments
                </h3>
                <p className="text-xs text-slate-500">Upload and manage project presentations, sanction orders and reports</p>
              </div>
            </div>

            {/* Document Uploader Form */}
            {canInteract && isEditMode && (
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Upload New Project Document
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label>Document Category</Label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    >
                      <option value="project_ppt">Project PPT / Presentation</option>
                      <option value="detailed_project_report">Detailed Project Report (DPR)</option>
                      <option value="sanction_order">Sanction Order</option>
                      <option value="tender_document">Tender Document</option>
                      <option value="progress_report">Progress Report</option>
                      <option value="other_document">Other Supporting Document</option>
                    </select>
                  </div>

                  <div>
                    <Label>Select File(s)</Label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setDocumentFiles(Array.from(e.target.files || []))}
                      className="w-full p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!documentFiles.length) return;
                        onUploadDocuments?.({ folderName: documentType, files: documentFiles });
                        setDocumentFiles([]);
                      }}
                      disabled={uploadingDocuments || !documentFiles.length}
                      className="w-full flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingDocuments ? 'Uploading...' : 'Upload Files'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Uploaded Project Attachments ({documentRows.length})
              </h4>
              
              {documentsLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading project documents...</div>
              ) : documentRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  No documents uploaded for this project yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">File Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Uploaded Date</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                      {documentRows.map((doc, idx) => (
                        <tr key={doc.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 text-slate-800 dark:text-slate-100">{doc.document_name || doc.name || doc.file_name}</td>
                          <td className="p-3 text-slate-500">{doc.document_type || doc.folder_name || 'Document'}</td>
                          <td className="p-3 text-slate-500">{doc.created_date ? String(doc.created_date).slice(0, 10) : '-'}</td>
                          <td className="p-3 text-right space-x-1.5">
                            {onDownloadDocument && (
                              <button
                                type="button"
                                onClick={() => onDownloadDocument(doc)}
                                className="p-1 hover:bg-blue-50 text-blue-600 rounded"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                            {canInteract && onDeleteDocument && (
                              <button
                                type="button"
                                onClick={() => onDeleteDocument(doc)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                                title="Delete"
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
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('timeline')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous: Timelines & Deliverables</span>
              </button>
              {canInteract && (
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={loading}
                  className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{isEditMode ? 'Save & Update Project' : 'Complete & Save Project'}</span>
                </button>
              )}
            </div>
          </div>
        )}

      </form>

    </div>
  );
}
