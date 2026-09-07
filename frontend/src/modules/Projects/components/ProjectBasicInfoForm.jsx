import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  ArrowLeft, Download, Save, Trash2, Upload, Briefcase, 
  Building2, DollarSign, Calendar, MapPin, Landmark, 
  TrendingUp, Layers, CheckCircle2, AlertTriangle, FileText, 
  ChevronRight, ChevronLeft, ChevronDown, Plus, X, Eye, Sparkles, Check,
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
import {
  deriveImplementationMode,
  deriveSagarmalaFunding,
} from '../utils/mapProject';
import {
  clearProjectBasicInfoDraft,
  loadProjectBasicInfoDraft,
  saveProjectBasicInfoDraft,
} from '../utils/projectDraft';
import ProjectExpenditureOutlay from './ProjectExpenditureOutlay';

const EMPTY_FORM = {
  projectID: '',
  subProjectID: '-1',
  projectName: '',
  projectBrief: '',
  estimatedProjectCost: '',
  projectType: '',
  implementationMode: 'EPC',
  implementationType: '',
  primaryImplementingAgency: '',
  secondaryImplementingAgency: '',
  newImplementingAgency: '',
  newImplementingAgencyCode: '',
  projectCategory: '',
  scheme: '',
  initiative: '',
  projectInitiatedDate: '',
  targetCompletionDate: '',
  revisedTargetCompletionDate: '',
  projectOutput: '',
  newProjectOutput: '',
  newProjectOutputUnits: '',
  projectOutcome: '',
  newProjectOutcome: '',
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
  newFundingAgency: '',
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

  const sourceOfFunding =
    initialData.sourceOfFunding || raw.source_of_funding_id || raw.source_of_funding_names || '';

  return {
    ...EMPTY_FORM,
    projectID: String(projectID || ''),
    subProjectID: String(subProjectID || '-1'),
    projectName: initialData.projectName || raw.project_name || '',
    projectBrief: initialData.projectBrief || raw.project_brief || '',
    estimatedProjectCost:
      initialData.estimatedProjectCost || initialData.cost || raw.estimated_cost || raw.sanctioned_cost || '',
    projectType: initialData.projectType || raw.project_type || '',
    implementationMode:
      initialData.implementationMode ||
      raw.mode_of_implememtation ||
      deriveImplementationMode(sourceOfFunding),
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
    sourceOfFunding,
    sagarmalaFunding: deriveSagarmalaFunding(sourceOfFunding) || (raw.is_sagarmala_funded ? '1' : ''),
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
  return (
    <p className="text-[11px] text-rose-500 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1 animate-fade-in">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
      <span>{error}</span>
    </p>
  );
}

function MultiCheckboxSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select...',
  disabled = false,
  hasError = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = Array.isArray(value) ? value.map(String) : [];

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectedLabels = options
    .filter((opt) => selected.includes(String(opt.value)))
    .map((opt) => opt.label);

  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`;

  const toggleValue = (optValue) => {
    const key = String(optValue);
    const next = selected.includes(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key];
    onChange?.(next);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full rounded-xl border ${
          hasError
            ? 'border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800'
        } px-3.5 py-2.5 text-xs font-semibold text-left flex items-center justify-between gap-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-white dark:hover:bg-slate-800'
        } ${selectedLabels.length ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
          {options.length === 0 ? (
            <span className="px-2.5 py-2 text-xs text-slate-400 font-semibold">No options available</span>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(String(opt.value));
              return (
                <label
                  key={String(opt.value)}
                  className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(opt.value)}
                    className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isPositiveCost(value) {
  const n = Number(value);
  return value !== '' && value != null && Number.isFinite(n) && n > 0;
}

function resolveSectionForErrors(nextErrors) {
  if (
    nextErrors.projectName ||
    nextErrors.projectBrief ||
    nextErrors.primaryImplementingAgency ||
    nextErrors.newImplementingAgency ||
    nextErrors.newImplementingAgencyCode ||
    nextErrors.projectCategory ||
    nextErrors.scheme ||
    nextErrors.projectType ||
    nextErrors.implementationType ||
    nextErrors.onSubProjectAvailable ||
    nextErrors.subProjectNum ||
    nextErrors.subProjectsTab
  ) {
    return 'basic';
  }
  if (
    nextErrors.estimatedProjectCost ||
    nextErrors.sourceOfFunding ||
    nextErrors.primaryFundingAgency ||
    nextErrors.newFundingAgency ||
    nextErrors.gbsComponents ||
    nextErrors.iebrComponents ||
    nextErrors.pppComponents ||
    nextErrors.loansComponents ||
    nextErrors.multiFundComponents ||
    nextErrors.stateGovFundComponents ||
    nextErrors.otherSourceFundingComp ||
    nextErrors.sagarmalaComponents ||
    nextErrors.pmmsyComponents
  ) {
    return 'cost';
  }
  if (
    nextErrors.state ||
    nextErrors.district ||
    nextErrors.mpConstituency ||
    nextErrors.landAreaReq ||
    nextErrors.percentLandAcquired
  ) {
    return 'location';
  }
  if (
    nextErrors.projectInitiatedDate ||
    nextErrors.targetCompletionDate ||
    nextErrors.newProjectOutput ||
    nextErrors.newProjectOutcome ||
    nextErrors.newProjectOutputUnits ||
    nextErrors.newProjectOutcomeUnits
  ) {
    return 'timeline';
  }
  return 'basic';
}

export default function ProjectBasicInfoForm({
  initialData = null,
  canSubmit = false,
  readOnly = false,
  loading = false,
  onBack,
  onSubmit,
  notify,
  documentRows = [],
  documentsLoading = false,
  uploadingDocuments = false,
  onUploadDocuments,
  onDeleteDocument,
  onDownloadDocument,
  outlayProps = null,
}) {
  const [formData, setFormData] = useState(() => getInitialForm(initialData));
  const [errors, setErrors] = useState({});
  const [activeSection, setActiveSection] = useState('basic');
  const [draftMeta, setDraftMeta] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
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

  const isEditMode = Boolean(
    initialData?.id || initialData?.projectId || initialData?.projectID || initialData?.raw?.project_id
  );
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

  const showSecondaryIaOthers = String(formData.secondaryImplementingAgency) === 'Others';
  const showSecondaryFaOthers = String(formData.secondaryFundingAgency) === 'Others';
  const showOutputOthers = String(formData.projectOutput) === 'Others';
  const showOutcomeOthers = String(formData.projectOutcome) === 'Others';

  useEffect(() => {
    if (isEditMode) return;
    const draft = loadProjectBasicInfoDraft();
    if (!draft?.formData) return;
    setFormData({ ...EMPTY_FORM, ...draft.formData });
    setDraftMeta(draft);
  }, [isEditMode]);

  useEffect(() => {
    if (!initialData) return;
    setFormData(getInitialForm(initialData));
  }, [initialData]);

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

  const validateSection = (sectionId) => {
    const nextErrors = {};

    if (sectionId === 'basic') {
      if (!String(formData.projectName || '').trim()) {
        nextErrors.projectName = 'Project name is required';
      } else if (countWords(formData.projectName) > 15) {
        nextErrors.projectName = 'Project name should not exceed 15 words';
      }

      if (!String(formData.projectBrief || '').trim()) {
        nextErrors.projectBrief = 'Project brief is required';
      } else if (countWords(formData.projectBrief) > 20) {
        nextErrors.projectBrief = 'Project brief should not exceed 20 words';
      }

      if (!formData.projectType) {
        nextErrors.projectType = 'Project type is required';
      }
      if (!formData.implementationType) {
        nextErrors.implementationType = 'Implementation type is required';
      }

      const categories = getMultiValue(formData.projectCategory);
      if (!categories.length) {
        nextErrors.projectCategory = 'Project category is required';
      }

      if (!String(formData.primaryImplementingAgency || '').trim()) {
        nextErrors.primaryImplementingAgency = 'Primary implementing agency is required';
      }

      if (showSecondaryIaOthers) {
        if (!String(formData.newImplementingAgency || '').trim()) {
          nextErrors.newImplementingAgency = 'Enter the new implementing agency';
        }
        if (!String(formData.newImplementingAgencyCode || '').trim()) {
          nextErrors.newImplementingAgencyCode = 'Enter the new implementing agency code';
        }
      }

      if (!formData.scheme) {
        nextErrors.scheme = 'Scheme is required';
      }

      if (!isEditMode && formData.onSubProjectAvailable !== 0 && formData.onSubProjectAvailable !== 1) {
        nextErrors.onSubProjectAvailable = 'Please select whether this project has sub-projects';
      }

      if (!isEditMode && Number(formData.onSubProjectAvailable) === 1) {
        if (!formData.subProjectNum || Number(formData.subProjectNum) < 2) {
          nextErrors.subProjectNum = 'Enter at least two sub-projects';
        }
        const missingSubProject = (formData.subProjectsTab || []).some(
          (item) => !String(item?.subProjectName || '').trim()
        );
        if (missingSubProject) {
          nextErrors.subProjectsTab = 'All sub-project names are required';
        }
      }
    }

    if (sectionId === 'cost') {
      const cost = Number(formData.estimatedProjectCost);
      if (
        formData.estimatedProjectCost === '' ||
        formData.estimatedProjectCost == null ||
        Number.isNaN(cost) ||
        cost < 0
      ) {
        nextErrors.estimatedProjectCost = 'Invalid estimated project cost';
      }

      if (!selectedFundingSourceIds.length) {
        nextErrors.sourceOfFunding = 'Source of funding is required';
      }

      if (fundingVisibility.gbs && !isPositiveCost(formData.gbsComponents)) {
        nextErrors.gbsComponents = 'Enter a valid GBS component cost';
      }
      if (fundingVisibility.iebr && !isPositiveCost(formData.iebrComponents)) {
        nextErrors.iebrComponents = 'Enter a valid IEBR component cost';
      }
      if (fundingVisibility.ppp && !isPositiveCost(formData.pppComponents)) {
        nextErrors.pppComponents = 'Enter a valid PPP component cost';
      }
      if (fundingVisibility.loans && !isPositiveCost(formData.loansComponents)) {
        nextErrors.loansComponents = 'Enter a valid loan component cost';
      }
      if (fundingVisibility.multilateral && !isPositiveCost(formData.multiFundComponents)) {
        nextErrors.multiFundComponents = 'Enter a valid multilateral funding cost';
      }
      if (fundingVisibility.stateGovFund && !isPositiveCost(formData.stateGovFundComponents)) {
        nextErrors.stateGovFundComponents = 'Enter a valid state govt fund cost';
      }
      if (fundingVisibility.otherSources && !isPositiveCost(formData.otherSourceFundingComp)) {
        nextErrors.otherSourceFundingComp = 'Enter a valid other sources cost';
      }
      if (fundingVisibility.sagarmala && !isPositiveCost(formData.sagarmalaComponents)) {
        nextErrors.sagarmalaComponents = 'Enter a valid Sagarmala component cost';
      }
      if (fundingVisibility.pmmsy && !isPositiveCost(formData.pmmsyComponents)) {
        nextErrors.pmmsyComponents = 'Enter a valid PMMSY component cost';
      }

      if (!formData.primaryFundingAgency) {
        nextErrors.primaryFundingAgency = 'Primary funding agency is required';
      }

      if (showSecondaryFaOthers && !String(formData.newFundingAgency || '').trim()) {
        nextErrors.newFundingAgency = 'Enter the new funding agency';
      }
    }

    if (sectionId === 'location') {
      if (!getMultiValue(formData.state).length) {
        nextErrors.state = 'State is required';
      }
      if (!getMultiValue(formData.district).length) {
        nextErrors.district = 'District is required';
      }
      if (!getMultiValue(formData.mpConstituency).length) {
        nextErrors.mpConstituency = 'MP constituency is required';
      }

      if (formData.onLandAcquistion === 1) {
        const area = Number(formData.landAreaReq);
        if (!String(formData.landAreaReq || '').trim() || Number.isNaN(area) || area <= 0) {
          nextErrors.landAreaReq = 'Enter a valid land area required';
        }
      }

      if (formData.onLandAcquistion === 1 && formData.onAcquisitionCompleted === 0) {
        const pct = Number(formData.percentLandAcquired);
        if (
          formData.percentLandAcquired === '' ||
          formData.percentLandAcquired == null ||
          Number.isNaN(pct) ||
          pct < 0 ||
          pct > 100
        ) {
          nextErrors.percentLandAcquired = 'Enter land acquired percentage between 0 and 100';
        }
      }
    }

    if (sectionId === 'timeline') {
      if (!formData.projectInitiatedDate) {
        nextErrors.projectInitiatedDate = 'Project initiated date is required';
      }
      if (!isTargetDateLocked && !formData.targetCompletionDate) {
        nextErrors.targetCompletionDate = 'Target completion date is required';
      } else if (
        formData.projectInitiatedDate &&
        formData.targetCompletionDate &&
        formData.targetCompletionDate < formData.projectInitiatedDate
      ) {
        nextErrors.targetCompletionDate =
          'Target completion date should be greater than or equal to project initiated date';
      }

      if (showOutputOthers) {
        if (!String(formData.newProjectOutput || '').trim()) {
          nextErrors.newProjectOutput = 'Enter the new project output';
        }
        if (!String(formData.newProjectOutputUnits || '').trim()) {
          nextErrors.newProjectOutputUnits = 'Enter the new project output units';
        }
      }

      if (showOutcomeOthers) {
        if (!String(formData.newProjectOutcome || '').trim()) {
          nextErrors.newProjectOutcome = 'Enter the new project outcome';
        }
        if (!String(formData.newProjectOutcomeUnits || '').trim()) {
          nextErrors.newProjectOutcomeUnits = 'Enter the new project outcome units';
        }
      }
    }

    return nextErrors;
  };

  const validate = () => {
    const nextErrors = {
      ...validateSection('basic'),
      ...validateSection('cost'),
      ...validateSection('location'),
      ...validateSection('timeline'),
    };

    setErrors(nextErrors);
    return nextErrors;
  };

  const goToSection = (targetSectionId) => {
    const sectionOrder = ['basic', 'cost', 'location', 'timeline', 'docs'];
    const currentIdx = sectionOrder.indexOf(activeSection);
    const targetIdx = sectionOrder.indexOf(targetSectionId);

    if (targetIdx <= currentIdx) {
      setActiveSection(targetSectionId);
      return;
    }

    for (let i = 0; i < targetIdx; i++) {
      const secKey = sectionOrder[i];
      const secErrors = validateSection(secKey);
      if (Object.keys(secErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...secErrors }));
        setActiveSection(secKey);
        const sectionLabel = FORM_SECTIONS.find((s) => s.id === secKey)?.label || 'current stage';
        notify?.(`Please complete all required fields in "${sectionLabel}" before moving to the next stage.`, 'error');
        return;
      }
    }

    setActiveSection(targetSectionId);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    if (!canInteract) return;
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setActiveSection(resolveSectionForErrors(nextErrors));
      notify?.('Please fix the highlighted validation errors before submitting.', 'error');
      return;
    }

    const saved = await onSubmit?.(formData);
    if (!isEditMode && saved === true) {
      clearProjectBasicInfoDraft();
      setDraftMeta(null);
    }
  };

  const handleSaveDraft = () => {
    if (!canInteract || isEditMode) return;
    if (!String(formData.projectName || '').trim()) {
      setErrors({ projectName: 'Project name is required to save a draft' });
      notify?.('Enter a project name before saving as draft.', 'error');
      return;
    }
    setSavingDraft(true);
    try {
      const saved = saveProjectBasicInfoDraft(formData);
      setDraftMeta(saved);
      setErrors({});
      notify?.('Draft saved locally. You can resume this form later.', 'success');
    } catch (error) {
      console.error(error);
      notify?.('Unable to save draft. Please try again.', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    clearProjectBasicInfoDraft();
    setDraftMeta(null);
    setFormData({ ...EMPTY_FORM });
    setErrors({});
    notify?.('Local draft discarded.', 'success');
  };

  const handleFundingSourceChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      sourceOfFunding: value,
      sagarmalaFunding: deriveSagarmalaFunding(value),
      implementationMode: deriveImplementationMode(value),
    }));
    if (errors.sourceOfFunding) {
      setErrors((prev) => ({ ...prev, sourceOfFunding: undefined }));
    }
  };

  const handleStateChange = (nextStateIds) => {
    const allowedDistrictIds = new Set(
      districtOptions
        .filter((item) => nextStateIds.includes(String(item.state_id)))
        .map((item) => String(item.district_id))
    );
    const allowedMpIds = new Set(
      mpOptions
        .filter((item) => nextStateIds.includes(String(item.state_id)))
        .map((item) => String(item.mpc_id))
    );

    setFormData((prev) => ({
      ...prev,
      state: nextStateIds,
      district: getMultiValue(prev.district).filter((id) => allowedDistrictIds.has(String(id))),
      mpConstituency: getMultiValue(prev.mpConstituency).filter((id) => allowedMpIds.has(String(id))),
    }));
  };

  const setSubProjectCount = (nextCount) => {
    const count = Math.max(0, Number(nextCount) || 0);
    setFormData((prev) => {
      const list = Array.from({ length: count }, (_, idx) => {
        const existing = prev.subProjectsTab?.[idx];
        return existing || { subProjectName: '' };
      });
      return {
        ...prev,
        subProjectNum: count,
        subProjectsTab: list,
      };
    });
  };

  const updateSubProjectName = (index, value) => {
    setFormData((prev) => {
      const list = [...(prev.subProjectsTab || [])];
      list[index] = { ...(list[index] || { subProjectName: '' }), subProjectName: value };
      return { ...prev, subProjectsTab: list };
    });
  };

  const draftSavedLabel = draftMeta?.savedAt
    ? new Date(draftMeta.savedAt).toLocaleString()
    : null;

  const handleDocumentUploadSubmit = (e) => {
    e.preventDefault();
    if (!documentFiles.length) return;
    onUploadDocuments?.({
      folderName: documentType,
      files: documentFiles,
    });
    setDocumentFiles([]);
  };

  const completedSections = useMemo(() => {
    return {
      basic: Object.keys(validateSection('basic')).length === 0,
      cost: Object.keys(validateSection('cost')).length === 0,
      location: Object.keys(validateSection('location')).length === 0,
      timeline: Object.keys(validateSection('timeline')).length === 0,
      docs: isEditMode || documentRows.length > 0,
    };
  }, [
    formData,
    isEditMode,
    documentRows.length,
    showSecondaryIaOthers,
    showSecondaryFaOthers,
    showOutputOthers,
    showOutcomeOthers,
    selectedFundingSourceIds,
    fundingVisibility,
    isTargetDateLocked,
  ]);

  const sectionErrorsCount = useMemo(() => {
    const counts = { basic: 0, cost: 0, location: 0, timeline: 0, docs: 0 };
    Object.keys(errors).forEach((key) => {
      if (!errors[key]) return;
      if ([
        'projectName', 'projectBrief', 'primaryImplementingAgency', 'newImplementingAgency',
        'newImplementingAgencyCode', 'projectCategory', 'scheme', 'projectType',
        'implementationType', 'onSubProjectAvailable', 'subProjectNum', 'subProjectsTab'
      ].includes(key)) counts.basic++;
      else if ([
        'estimatedProjectCost', 'sourceOfFunding', 'primaryFundingAgency', 'newFundingAgency',
        'gbsComponents', 'iebrComponents', 'pppComponents', 'loansComponents',
        'multiFundComponents', 'stateGovFundComponents', 'otherSourceFundingComp',
        'sagarmalaComponents', 'pmmsyComponents'
      ].includes(key)) counts.cost++;
      else if ([
        'state', 'district', 'mpConstituency', 'landAreaReq', 'percentLandAcquired'
      ].includes(key)) counts.location++;
      else if ([
        'projectInitiatedDate', 'targetCompletionDate', 'newProjectOutput',
        'newProjectOutcome', 'newProjectOutputUnits', 'newProjectOutcomeUnits'
      ].includes(key)) counts.timeline++;
    });
    return counts;
  }, [errors]);

  const getInputClass = (fieldName, extra = '') => {
    const hasErr = Boolean(errors[fieldName]);
    return `w-full rounded-xl border ${
      hasErr
        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20'
        : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 dark:bg-slate-800'
    } px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white focus:outline-none transition ${extra}`;
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 select-none overflow-x-auto scrollbar-none">
        <div className="flex space-x-1">
          {FORM_SECTIONS.map((sec) => {
            const isSelected = activeSection === sec.id;
            const SecIcon = sec.icon;
            const errCount = sectionErrorsCount[sec.id] || 0;
            const isCompleted = Boolean(completedSections[sec.id]) && errCount === 0;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => goToSection(sec.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  errCount > 0
                    ? isSelected
                      ? 'border-rose-500 text-rose-600 bg-rose-50/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-400 rounded-t-lg'
                      : 'border-transparent text-rose-500 hover:text-rose-600 dark:hover:text-rose-400'
                    : isCompleted
                    ? isSelected
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500 rounded-t-lg shadow-2xs'
                      : 'border-transparent text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                    : isSelected
                    ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  errCount > 0
                    ? 'bg-rose-500 text-white'
                    : isCompleted
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isSelected
                    ? 'bg-[#0f417a] text-white dark:bg-blue-500'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : sec.number}
                </span>
                <SecIcon className={`h-3.5 w-3.5 ${
                  errCount > 0
                    ? 'text-rose-500'
                    : isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isSelected
                    ? 'text-[#0f417a] dark:text-blue-400'
                    : 'text-slate-400'
                }`} />
                <span>{sec.title}</span>
                {errCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                    {errCount}
                  </span>
                ) : isCompleted ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 flex items-center gap-0.5">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                    <span>Done</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {!isEditMode && draftMeta ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <span>
            Local draft restored{draftSavedLabel ? ` (saved ${draftSavedLabel})` : ''}. Submit when ready, or discard.
          </span>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 font-bold"
          >
            Discard Draft
          </button>
        </div>
      ) : null}

      <form id="project-basic-info-form" onSubmit={handleFormSubmit} className="space-y-6">
        
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
              
              <div className="md:col-span-2">
                <Label required>Project Name</Label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Enter full comprehensive project name..."
                  className={getInputClass('projectName')}
                />
                <FieldError error={errors.projectName} />
              </div>

              <div className="md:col-span-2">
                <Label required>Project Brief & Objectives</Label>
                <textarea
                  rows={3}
                  value={formData.projectBrief}
                  onChange={(e) => handleInputChange('projectBrief', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Provide executive summary, core deliverables, and strategic scope..."
                  className={getInputClass('projectBrief')}
                />
                <FieldError error={errors.projectBrief} />
              </div>

              <div>
                <Label required>Primary Implementing Agency (IA)</Label>
                <select
                  value={formData.primaryImplementingAgency}
                  onChange={(e) => handleInputChange('primaryImplementingAgency', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('primaryImplementingAgency')}
                >
                  <option value="">Select Implementing Agency</option>
                  {iaOptions.map((ia, idx) => {
                    const val = ia.ia_id ?? ia.id ?? ia.organisation_id ?? idx;
                    const label = ia.ia_name || ia.name || ia.organisation_name || String(val);
                    return (
                      <option key={`ia-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.primaryImplementingAgency} />
              </div>

              <div>
                <Label>Secondary Implementing Agency</Label>
                <select
                  value={formData.secondaryImplementingAgency}
                  onChange={(e) => handleInputChange('secondaryImplementingAgency', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('secondaryImplementingAgency')}
                >
                  <option value="">Select Secondary Implementing Agency</option>
                  {iaOptions.map((ia, idx) => {
                    const val = ia.ia_id ?? ia.id ?? ia.organisation_id ?? idx;
                    const label = ia.ia_name || ia.name || ia.organisation_name || String(val);
                    return (
                      <option key={`sia-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                  <option value="Others">Others</option>
                </select>
              </div>

              {showSecondaryIaOthers ? (
                <>
                  <div>
                    <Label required>New Implementing Agency</Label>
                    <input
                      type="text"
                      value={formData.newImplementingAgency}
                      onChange={(e) => handleInputChange('newImplementingAgency', e.target.value)}
                      disabled={!canInteract}
                      className={getInputClass('newImplementingAgency')}
                    />
                    <FieldError error={errors.newImplementingAgency} />
                  </div>
                  <div>
                    <Label required>New Implementing Agency Code</Label>
                    <input
                      type="text"
                      value={formData.newImplementingAgencyCode}
                      onChange={(e) => handleInputChange('newImplementingAgencyCode', e.target.value)}
                      disabled={!canInteract}
                      className={getInputClass('newImplementingAgencyCode')}
                    />
                    <FieldError error={errors.newImplementingAgencyCode} />
                  </div>
                </>
              ) : null}

              <div>
                <Label required>Project Category</Label>
                <MultiCheckboxSelect
                  value={getMultiValue(formData.projectCategory)}
                  onChange={(next) => handleInputChange('projectCategory', next)}
                  disabled={!canInteract}
                  hasError={Boolean(errors.projectCategory)}
                  placeholder="Select Project Category"
                  options={projectCategoryOptions.map((cat, idx) => {
                    const val = cat.id ?? cat.project_category_id ?? cat.category_id ?? cat.name ?? cat.project_category_names ?? idx;
                    const label =
                      cat.project_category_name ||
                      cat.name ||
                      cat.project_category_names ||
                      cat.category_name ||
                      String(val);
                    return { value: String(val), label };
                  })}
                />
                <FieldError error={errors.projectCategory} />
              </div>

              <div>
                <Label required>Scheme</Label>
                <select
                  value={formData.scheme}
                  onChange={(e) => handleInputChange('scheme', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('scheme')}
                >
                  <option value="">Select Scheme</option>
                  {schemeOptions.map((sch, idx) => {
                    const val = sch.scheme_id ?? sch.id ?? idx;
                    const label = sch.scheme_name || sch.name || String(val);
                    return (
                      <option key={`sch-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.scheme} />
              </div>

              <div>
                <Label>Initiative</Label>
                <MultiCheckboxSelect
                  value={getMultiValue(formData.initiative)}
                  onChange={(next) => handleInputChange('initiative', next)}
                  disabled={!canInteract}
                  placeholder="Select Initiative"
                  options={initiativeOptions.map((init, idx) => {
                    const val = init.id ?? init.initiative_id ?? init.name ?? init.initiative_names ?? idx;
                    const label =
                      init.initiative_name ||
                      init.name ||
                      init.initiative_names ||
                      String(val);
                    return { value: String(val), label };
                  })}
                />
              </div>

              <div>
                <Label required>Project Type</Label>
                <select
                  value={formData.projectType}
                  onChange={(e) => handleInputChange('projectType', e.target.value)}
                  disabled={!canInteract || isProjectTypeLocked}
                  className={getInputClass('projectType')}
                >
                  <option value="">Select Project Type</option>
                  {PROJECT_TYPE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <FieldError error={errors.projectType} />
              </div>

              <div>
                <Label required>Implementation Type</Label>
                <select
                  value={formData.implementationType}
                  onChange={(e) => handleInputChange('implementationType', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('implementationType')}
                >
                  <option value="">Select Implementation Type</option>
                  {IMPLEMENTATION_TYPE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <FieldError error={errors.implementationType} />
              </div>

              <div>
                <Label>Implementation Mode</Label>
                <input
                  type="text"
                  value={formData.implementationMode || 'EPC'}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">Derived from Source of Funding (PPP if SoF includes PPP / id 3).</p>
              </div>

              {!isEditMode ? (
                <div className={`md:col-span-2 space-y-3 rounded-xl border ${errors.onSubProjectAvailable || errors.subProjectNum || errors.subProjectsTab ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50/60'} p-4`}>
                  <Label required>Does this project have sub-projects?</Label>
                  <div className="flex gap-6 text-xs font-semibold">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="onSubProjectAvailable"
                        checked={Number(formData.onSubProjectAvailable) === 1}
                        disabled={!canInteract}
                        onChange={() => {
                          handleInputChange('onSubProjectAvailable', 1);
                          if (Number(formData.subProjectNum) < 2) setSubProjectCount(2);
                        }}
                      />
                      Yes
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="onSubProjectAvailable"
                        checked={Number(formData.onSubProjectAvailable) === 0}
                        disabled={!canInteract}
                        onChange={() => {
                          handleInputChange('onSubProjectAvailable', 0);
                          setSubProjectCount(0);
                        }}
                      />
                      No
                    </label>
                  </div>
                  <FieldError error={errors.onSubProjectAvailable} />
                  {Number(formData.onSubProjectAvailable) === 1 ? (
                    <div className="space-y-2">
                      <Label required>Number of Sub-projects</Label>
                      <input
                        type="number"
                        min="2"
                        value={formData.subProjectNum || ''}
                        disabled={!canInteract}
                        onChange={(e) => setSubProjectCount(e.target.value)}
                        className={getInputClass('subProjectNum', 'w-40')}
                      />
                      <FieldError error={errors.subProjectNum} />
                      {(formData.subProjectsTab || []).map((item, idx) => (
                        <div key={`sp-${idx}`}>
                          <Label required>{`Sub-project ${idx + 1} Name`}</Label>
                          <input
                            type="text"
                            value={item?.subProjectName || ''}
                            disabled={!canInteract}
                            onChange={(e) => updateSubProjectName(idx, e.target.value)}
                            className={getInputClass('subProjectsTab')}
                          />
                        </div>
                      ))}
                      <FieldError error={errors.subProjectsTab} />
                    </div>
                  ) : null}
                </div>
              ) : null}

            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => goToSection('cost')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Cost & Funding</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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
                    className={getInputClass('estimatedProjectCost', 'pl-8 pr-12 text-emerald-600 dark:text-emerald-400 font-black')}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">Cr.</span>
                </div>
                <FieldError error={errors.estimatedProjectCost} />
              </div>

              <div>
                <Label required>Source of Funding</Label>
                <MultiCheckboxSelect
                  value={getMultiValue(formData.sourceOfFunding)}
                  onChange={(next) => handleFundingSourceChange(next)}
                  disabled={!canInteract}
                  hasError={Boolean(errors.sourceOfFunding)}
                  placeholder="Select Source of Funding"
                  options={(sourceOfFundingOptions.length
                    ? sourceOfFundingOptions.map((sof) => ({
                        value: String(sof.source_of_funding_id ?? sof.id ?? sof.sof_id ?? sof.source_id ?? ''),
                        label:
                          sof.source_of_funding_name ||
                          sof.name ||
                          sof.sof_names ||
                          sof.source_name ||
                          String(sof.source_of_funding_id ?? sof.id ?? ''),
                      }))
                    : FUNDING_SOURCE_OPTIONS.map((item) => ({ value: item, label: item }))
                  ).filter((item) => item.value)}
                />
                <FieldError error={errors.sourceOfFunding} />
              </div>

              <div>
                <Label required>Primary Funding Agency</Label>
                <select
                  value={formData.primaryFundingAgency}
                  onChange={(e) => handleInputChange('primaryFundingAgency', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('primaryFundingAgency')}
                >
                  <option value="">Select Funding Agency</option>
                  {faOptions.map((fa, idx) => {
                    const val = fa.fa_id ?? fa.id ?? fa.funding_agency_id ?? idx;
                    const label = fa.fa_name || fa.name || fa.funding_agency_name || String(val);
                    return (
                      <option key={`fa-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <FieldError error={errors.primaryFundingAgency} />
              </div>

              <div>
                <Label>Secondary Funding Agency</Label>
                <select
                  value={formData.secondaryFundingAgency}
                  onChange={(e) => handleInputChange('secondaryFundingAgency', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('secondaryFundingAgency')}
                >
                  <option value="">Select Secondary Funding Agency</option>
                  {faOptions.map((fa, idx) => {
                    const val = fa.fa_id ?? fa.id ?? fa.funding_agency_id ?? idx;
                    const label = fa.fa_name || fa.name || fa.funding_agency_name || String(val);
                    return (
                      <option key={`sfa-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                  <option value="Others">Others</option>
                </select>
              </div>

              {showSecondaryFaOthers ? (
                <div>
                  <Label required>New Funding Agency</Label>
                  <input
                    type="text"
                    value={formData.newFundingAgency}
                    onChange={(e) => handleInputChange('newFundingAgency', e.target.value)}
                    disabled={!canInteract}
                    className={getInputClass('newFundingAgency')}
                  />
                  <FieldError error={errors.newFundingAgency} />
                </div>
              ) : null}

            </div>

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
                      className={getInputClass('gbsComponents')}
                    />
                    <FieldError error={errors.gbsComponents} />
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
                      className={getInputClass('iebrComponents')}
                    />
                    <FieldError error={errors.iebrComponents} />
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
                      className={getInputClass('pppComponents')}
                    />
                    <FieldError error={errors.pppComponents} />
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
                      className={getInputClass('loansComponents')}
                    />
                    <FieldError error={errors.loansComponents} />
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
                      className={getInputClass('sagarmalaComponents')}
                    />
                    <FieldError error={errors.sagarmalaComponents} />
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
                      className={getInputClass('stateGovFundComponents')}
                    />
                    <FieldError error={errors.stateGovFundComponents} />
                  </div>
                )}
                {fundingVisibility.multilateral && (
                  <div>
                    <Label>Multilateral Funding Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.multiFundComponents}
                      onChange={(e) => handleInputChange('multiFundComponents', e.target.value)}
                      placeholder="0.00"
                      className={getInputClass('multiFundComponents')}
                    />
                    <FieldError error={errors.multiFundComponents} />
                  </div>
                )}
                {fundingVisibility.pmmsy && (
                  <div>
                    <Label>PMMSY Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pmmsyComponents}
                      onChange={(e) => handleInputChange('pmmsyComponents', e.target.value)}
                      placeholder="0.00"
                      className={getInputClass('pmmsyComponents')}
                    />
                    <FieldError error={errors.pmmsyComponents} />
                  </div>
                )}
                {fundingVisibility.otherSources && (
                  <div>
                    <Label>Other Sources Component</Label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.otherSourceFundingComp}
                      onChange={(e) => handleInputChange('otherSourceFundingComp', e.target.value)}
                      placeholder="0.00"
                      className={getInputClass('otherSourceFundingComp')}
                    />
                    <FieldError error={errors.otherSourceFundingComp} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => goToSection('basic')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => goToSection('location')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Location & Land</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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
              
              <div>
                <Label required>State / Region</Label>
                <MultiCheckboxSelect
                  value={getMultiValue(formData.state)}
                  onChange={(next) => handleStateChange(next)}
                  disabled={!canInteract}
                  hasError={Boolean(errors.state)}
                  placeholder="Select State / Region"
                  options={stateOptions.map((st, idx) => {
                    const val = st.id ?? st.state_id ?? st.name ?? st.state_names ?? idx;
                    const label = st.state_name || st.name || st.state_names || String(val);
                    return { value: String(val), label };
                  })}
                />
                <FieldError error={errors.state} />
              </div>

              <div>
                <Label required>District</Label>
                <MultiCheckboxSelect
                  value={getMultiValue(formData.district)}
                  onChange={(next) => handleInputChange('district', next)}
                  disabled={!canInteract}
                  hasError={Boolean(errors.district)}
                  placeholder="Select District"
                  options={filteredDistrictOptions.map((dist, idx) => {
                    const val = dist.id ?? dist.district_id ?? dist.name ?? dist.district_names ?? idx;
                    const label = dist.district_name || dist.name || dist.district_names || String(val);
                    return { value: String(val), label };
                  })}
                />
                <FieldError error={errors.district} />
              </div>

              <div>
                <Label>Taluka / Tehsil</Label>
                <input
                  type="text"
                  value={formData.taluka}
                  onChange={(e) => handleInputChange('taluka', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Enter taluka name..."
                  className={getInputClass('taluka')}
                />
              </div>

              <div>
                <Label>Village</Label>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Enter village name..."
                  className={getInputClass('village')}
                />
              </div>

              <div>
                <Label required>MP Constituency</Label>
                <MultiCheckboxSelect
                  value={getMultiValue(formData.mpConstituency)}
                  onChange={(next) => handleInputChange('mpConstituency', next)}
                  disabled={!canInteract}
                  hasError={Boolean(errors.mpConstituency)}
                  placeholder="Select MP Constituency"
                  options={filteredMpOptions.map((mp, idx) => {
                    const val = mp.mpc_id ?? mp.id ?? mp.mp_constituency_id ?? idx;
                    const label = mp.mpc_name || mp.mp_constituency_name || mp.name || String(val);
                    return { value: String(val), label };
                  })}
                />
                <FieldError error={errors.mpConstituency} />
              </div>

            </div>

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
                      <Label required>Land Area Required (Acres)</Label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.landAreaReq}
                        onChange={(e) => handleInputChange('landAreaReq', e.target.value)}
                        placeholder="Area in Acres"
                        className={getInputClass('landAreaReq')}
                      />
                      <FieldError error={errors.landAreaReq} />
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
                      <Label required>% Land Acquired</Label>
                      <input
                        type="number"
                        step="0.1"
                        max="100"
                        value={formData.percentLandAcquired}
                        onChange={(e) => handleInputChange('percentLandAcquired', e.target.value)}
                        placeholder="e.g. 75"
                        className={getInputClass('percentLandAcquired')}
                      />
                      <FieldError error={errors.percentLandAcquired} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => goToSection('cost')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => goToSection('timeline')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Timelines & Deliverables</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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
              
              <div>
                <Label required>Project Initiated Date</Label>
                <input
                  type="date"
                  value={formData.projectInitiatedDate}
                  onChange={(e) => handleInputChange('projectInitiatedDate', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('projectInitiatedDate')}
                />
                <FieldError error={errors.projectInitiatedDate} />
              </div>

              <div>
                <Label required>Target Completion Date</Label>
                <input
                  type="date"
                  value={formData.targetCompletionDate}
                  onChange={(e) => handleInputChange('targetCompletionDate', e.target.value)}
                  disabled={!canInteract || isTargetDateLocked}
                  className={getInputClass('targetCompletionDate', isTargetDateLocked ? 'opacity-75' : '')}
                />
                <FieldError error={errors.targetCompletionDate} />
              </div>

              <div>
                <Label>Revised Target Completion Date</Label>
                <input
                  type="date"
                  value={formData.revisedTargetCompletionDate}
                  onChange={(e) => handleInputChange('revisedTargetCompletionDate', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('revisedTargetCompletionDate')}
                />
                <FieldError error={errors.revisedTargetCompletionDate} />
              </div>

              <div>
                <Label>Capacity Addition (MTPA / Units)</Label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capacityAddition}
                  onChange={(e) => handleInputChange('capacityAddition', e.target.value)}
                  disabled={!canInteract}
                  placeholder="e.g. 5.5 MTPA"
                  className={getInputClass('capacityAddition')}
                />
                <FieldError error={errors.capacityAddition} />
              </div>

              <div>
                <Label>Project Output</Label>
                <select
                  value={formData.projectOutput}
                  onChange={(e) => handleInputChange('projectOutput', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('projectOutput')}
                >
                  <option value="">Select Project Output</option>
                  {outputOptions.map((out, idx) => {
                    const val = out.project_output_id ?? out.id ?? out.output_id ?? idx;
                    const label = out.project_output_name || out.output_name || out.name || String(val);
                    return (
                      <option key={`out-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                  <option value="Others">Others</option>
                </select>
                <FieldError error={errors.projectOutput} />
              </div>

              {showOutputOthers ? (
                <>
                  <div>
                    <Label required>New Project Output</Label>
                    <input
                      type="text"
                      value={formData.newProjectOutput}
                      onChange={(e) => handleInputChange('newProjectOutput', e.target.value)}
                      disabled={!canInteract}
                      className={getInputClass('newProjectOutput')}
                    />
                    <FieldError error={errors.newProjectOutput} />
                  </div>
                  <div>
                    <Label required>New Output Units</Label>
                    <input
                      type="text"
                      value={formData.newProjectOutputUnits}
                      onChange={(e) => handleInputChange('newProjectOutputUnits', e.target.value)}
                      disabled={!canInteract}
                      className={getInputClass('newProjectOutputUnits')}
                    />
                    <FieldError error={errors.newProjectOutputUnits} />
                  </div>
                </>
              ) : null}

              <div>
                <Label>Project Outcome</Label>
                <select
                  value={formData.projectOutcome}
                  onChange={(e) => handleInputChange('projectOutcome', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('projectOutcome')}
                >
                  <option value="">Select Project Outcome</option>
                  {outcomeOptions.map((outc, idx) => {
                    const val = outc.project_outcome_id ?? outc.id ?? outc.outcome_id ?? idx;
                    const label =
                      outc.project_outcome_name || outc.outcome_name || outc.name || String(val);
                    return (
                      <option key={`outc-${val}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                  <option value="Others">Others</option>
                </select>
                <FieldError error={errors.projectOutcome} />
              </div>

              {showOutcomeOthers ? (
                <>
                  <div>
                    <Label required>New Project Outcome</Label>
                    <input
                      type="text"
                      value={formData.newProjectOutcome}
                      onChange={(e) => handleInputChange('newProjectOutcome', e.target.value)}
                      disabled={!canInteract}
                      className={getInputClass('newProjectOutcome')}
                    />
                    <FieldError error={errors.newProjectOutcome} />
                  </div>
                  <div>
                    <Label required>New Outcome Units</Label>
                    <input
                      type="text"
                      value={formData.newProjectOutcomeUnits}
                      onChange={(e) => handleInputChange('newProjectOutcomeUnits', e.target.value)}
                      disabled={!canInteract}
                      className={getInputClass('newProjectOutcomeUnits')}
                    />
                    <FieldError error={errors.newProjectOutcomeUnits} />
                  </div>
                </>
              ) : null}

            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => goToSection('location')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => goToSection('docs')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Project Documents</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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

            {isEditMode && outlayProps ? (
              <ProjectExpenditureOutlay {...outlayProps} />
            ) : null}

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
                                onClick={() => onDownloadDocument(doc.document_name || doc)}
                                className="p-1 hover:bg-blue-50 text-blue-600 rounded"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                            {canInteract && onDeleteDocument && (
                              <button
                                type="button"
                                onClick={() => onDeleteDocument(doc.document_name || doc)}
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
                <div className="flex items-center gap-2">
                  {!isEditMode ? (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={loading || savingDraft}
                      className="flex items-center space-x-1.5 px-4 py-2.5 bg-white border border-[#0f417a]/40 text-[#0f417a] rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{savingDraft ? 'Saving Draft...' : 'Save as Draft'}</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={loading}
                    className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isEditMode ? 'Save & Update Project' : 'Complete & Save Project'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </form>

    </div>
  );
}
