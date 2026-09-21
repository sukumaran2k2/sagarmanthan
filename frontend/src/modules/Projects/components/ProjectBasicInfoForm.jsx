import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, Download, Save, Trash2, Upload, Briefcase, 
  Building2, DollarSign, Calendar, MapPin, Landmark, 
  TrendingUp, Layers, CheckCircle2, AlertTriangle, FileText, 
  ChevronRight, ChevronLeft, ChevronDown, Plus, X, Eye, Sparkles, Check,
  Info, Pencil, History
} from 'lucide-react';
import {
  FUNDING_SOURCE_OPTIONS,
  IMPLEMENTATION_TYPE_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_DOCUMENT_TYPES,
  PROJECT_TYPE_OPTIONS,
  PROJECT_STAGE_OPTIONS,
  formatFileSize,
} from '../utils/constants';
import {
  addRevisedTargetCompletionDate,
  fetchMmtDropdown,
  fetchRevisedTargetCompletionHistory,
} from '../api';
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
  subProjectID: '',
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
  { id: 'basic', number: '01', title: 'General Details', subtitle: 'Core Project Fields', icon: Briefcase },
  { id: 'cost', number: '02', title: 'Source of Funding', subtitle: 'Funding Split & Target Expenditure', icon: DollarSign },
  { id: 'location', number: '03', title: 'Project Location', subtitle: 'Location & Land Detail', icon: MapPin },
  { id: 'docs', number: '04', title: 'Others', subtitle: 'Documents & Attachments', icon: FileText },
];

function normalizeDocumentTypeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function resolveDocumentFolderName(value) {
  const normalized = normalizeDocumentTypeKey(value);
  if (!normalized) return '';

  const direct = PROJECT_DOCUMENT_TYPES.find((item) => item.folderName === normalized);
  if (direct) return direct.folderName;

  if (['ppt', 'projectppt', 'project_ppts'].includes(normalized)) return 'project_ppt';
  if (['pert', 'pert_chart', 'projectpert', 'project_pert_chart'].includes(normalized)) {
    return 'project_pert';
  }
  if (
    ['project_image', 'project_images', 'images', 'image', 'latest_project_image'].includes(
      normalized
    )
  ) {
    return 'project_images';
  }

  return normalized;
}

function toRadioValue(value) {
  if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'yes') return 1;
  if (value === false || value === 0 || value === '0' || String(value).toLowerCase() === 'no') return 0;
  return null;
}

function firstNumericId(...values) {
  for (const value of values) {
    if (value == null || value === '' || value === '-') continue;
    if (Array.isArray(value)) {
      const ids = value
        .map((item) => String(item ?? '').trim())
        .filter((item) => /^-?\d+$/.test(item));
      if (ids.length) return ids.join(',');
      continue;
    }
    const text = String(value).trim();
    if (/^-?\d+$/.test(text)) return text;
    if (/^\d+(\s*,\s*\d+)+$/.test(text)) return text.replace(/\s+/g, '');
  }
  return '';
}

function toInputDate(...values) {
  for (const value of values) {
    if (value == null || value === '' || value === '-') continue;
    const text = String(value).trim();
    if (!text || text === '-' || text.toLowerCase() === 'null' || text.toLowerCase() === 'invalid date') {
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    if (text.includes('T')) {
      const sliced = text.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(sliced)) return sliced;
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return '';
}

function getInitialForm(initialData) {
  if (!initialData) return { ...EMPTY_FORM };
  const raw = initialData.raw || {};

  const projectID = initialData.projectId || initialData.projectID || raw.project_id || '';
  const rawSubId =
    initialData.subProjectId ||
    initialData.subProjectID ||
    raw.sub_project_id;
  const subProjectID =
    rawSubId && String(rawSubId).trim() !== '-1' ? String(rawSubId).trim() : '';

  const sourceOfFunding = firstNumericId(
    raw.source_of_funding_id,
    initialData.sourceOfFunding,
    raw.source_of_funding_names
  );

  return {
    ...EMPTY_FORM,
    projectID: String(projectID || '').replace(/-/g, ''),
    subProjectID: String(subProjectID || '').replace(/-/g, ''),
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
    primaryImplementingAgency: firstNumericId(
      raw.primary_ia_id,
      initialData.primaryImplementingAgency
    ),
    secondaryImplementingAgency: firstNumericId(
      raw.secondary_ia_id,
      initialData.secondaryImplementingAgency
    ),
    projectCategory: firstNumericId(
      raw.project_category_id,
      initialData.projectCategory,
      raw.project_category_names
    ),
    scheme: firstNumericId(raw.scheme_id, initialData.scheme),
    initiative: firstNumericId(raw.initiative_id, initialData.initiative, raw.initiative_names),
    projectInitiatedDate: toInputDate(
      raw.project_intiated_date,
      raw.project_initiated_date,
      initialData.projectInitiatedDate
    ),
    targetCompletionDate: toInputDate(
      raw.target_completion_date,
      initialData.targetCompletionDate
    ),
    revisedTargetCompletionDate: toInputDate(raw.latest_revised_target_completion_date),
    projectOutput: firstNumericId(raw.project_output_id, initialData.projectOutput),
    newProjectOutputUnits: initialData.newProjectOutputUnits || raw.project_output_units || '',
    projectOutcome: firstNumericId(raw.project_outcome_id, initialData.projectOutcome),
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
    primaryFundingAgency: firstNumericId(
      raw.primary_funding_agency_id,
      initialData.primaryFundingAgency
    ),
    secondaryFundingAgency: firstNumericId(
      raw.secondary_funding_agency_id,
      initialData.secondaryFundingAgency
    ),
    state: firstNumericId(
      raw.state_id,
      raw.sub_state_id,
      initialData.state,
      raw.state_names,
      raw.sub_state_names
    ),
    district: firstNumericId(
      raw.district_id,
      raw.sub_district_id,
      initialData.district,
      raw.district_names,
      raw.sub_district_names
    ),
    taluka: firstNumericId(raw.taluka_id, initialData.taluka),
    village: firstNumericId(raw.village_id, initialData.village),
    mpConstituency: firstNumericId(
      raw.mp_constituency_id,
      raw.sub_mp_constituency_id,
      initialData.mpConstituency,
      raw.mp_constituency_names,
      raw.sub_mp_constituency_names
    ),
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
  if (value === '' || value == null) return false;
  if (String(value).includes('-')) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function resolveSectionForErrors(nextErrors) {
  if (
    nextErrors.projectID ||
    nextErrors.projectName ||
    nextErrors.projectBrief ||
    nextErrors.estimatedProjectCost ||
    nextErrors.primaryImplementingAgency ||
    nextErrors.newImplementingAgency ||
    nextErrors.newImplementingAgencyCode ||
    nextErrors.projectCategory ||
    nextErrors.scheme ||
    nextErrors.projectType ||
    nextErrors.implementationType ||
    nextErrors.projectInitiatedDate ||
    nextErrors.targetCompletionDate ||
    nextErrors.newProjectOutput ||
    nextErrors.newProjectOutcome ||
    nextErrors.newProjectOutputUnits ||
    nextErrors.newProjectOutcomeUnits ||
    nextErrors.onSubProjectAvailable ||
    nextErrors.subProjectNum ||
    nextErrors.subProjectsTab
  ) {
    return 'basic';
  }
  if (
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
    nextErrors.onLandAcquistion ||
    nextErrors.landAreaReq ||
    nextErrors.onAcquisitionCompleted ||
    nextErrors.percentLandAcquired
  ) {
    return 'location';
  }
  return 'basic';
}

const FIELD_ERROR_LABELS = {
  projectName: 'Project name',
  projectBrief: 'Project brief',
  estimatedProjectCost: 'Estimated project cost',
  projectType: 'Project type',
  implementationType: 'Implementation type',
  projectCategory: 'Project category',
  primaryImplementingAgency: 'Primary implementing agency',
  newImplementingAgency: 'New implementing agency',
  newImplementingAgencyCode: 'New implementing agency code',
  scheme: 'Scheme',
  sourceOfFunding: 'Source of funding',
  primaryFundingAgency: 'Primary funding agency',
  newFundingAgency: 'New funding agency',
  state: 'State',
  district: 'District',
  mpConstituency: 'MP constituency',
  onLandAcquistion: 'Land acquisition needed',
  landAreaReq: 'Land area required',
  onAcquisitionCompleted: 'Acquisition completed',
  percentLandAcquired: '% Land acquired',
  projectInitiatedDate: 'Project initiated date',
  targetCompletionDate: 'Target completion date',
  newProjectOutput: 'New project output',
  newProjectOutputUnits: 'New project output units',
  newProjectOutcome: 'New project outcome',
  newProjectOutcomeUnits: 'New project outcome units',
  onSubProjectAvailable: 'Sub-projects selection',
  subProjectNum: 'Number of sub-projects',
  subProjectsTab: 'Sub-project names',
  gbsComponents: 'GBS component',
  iebrComponents: 'IEBR component',
  pppComponents: 'PPP component',
  loansComponents: 'Loan component',
  multiFundComponents: 'Multilateral funding',
  stateGovFundComponents: 'State govt fund',
  otherSourceFundingComp: 'Other sources',
  sagarmalaComponents: 'Sagarmala component',
  pmmsyComponents: 'PMMSY component',
};

function formatValidationToast(nextErrors) {
  const keys = Object.keys(nextErrors || {}).filter((k) => nextErrors[k]);
  if (!keys.length) return 'Please fix the highlighted validation errors before submitting.';
  const labels = keys.slice(0, 3).map((k) => FIELD_ERROR_LABELS[k] || k);
  const more = keys.length > 3 ? ` (+${keys.length - 3} more)` : '';
  return `Please fill required fields: ${labels.join(', ')}${more}. Missing fields are highlighted in red.`;
}

function renderInBody(node) {
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}

export default function ProjectBasicInfoForm({
  initialData = null,
  canSubmit = false,
  readOnly = false,
  loading = false,
  onBack,
  onSubmit,
  notify,
  onRevisedTargetSaved,
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
  const [pendingFilesByType, setPendingFilesByType] = useState(() =>
    Object.fromEntries(PROJECT_DOCUMENT_TYPES.map((item) => [item.folderName, []]))
  );
  const [documentInputKeyByType, setDocumentInputKeyByType] = useState(() =>
    Object.fromEntries(PROJECT_DOCUMENT_TYPES.map((item) => [item.folderName, 0]))
  );
  const [targetRevisionModal, setTargetRevisionModal] = useState({
    open: false,
    date: '',
    error: '',
  });
  const [targetHistoryModal, setTargetHistoryModal] = useState({
    open: false,
    rows: [],
    loading: false,
  });
  const [revisionSaving, setRevisionSaving] = useState(false);

  const documentsByType = useMemo(() => {
    const grouped = Object.fromEntries(PROJECT_DOCUMENT_TYPES.map((item) => [item.folderName, []]));
    const other = [];
    (documentRows || []).forEach((doc) => {
      const type = resolveDocumentFolderName(doc.document_type || doc.folder_name || doc.documentType);
      if (grouped[type]) grouped[type].push(doc);
      else other.push(doc);
    });
    return { grouped, other };
  }, [documentRows]);

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
  const canReviseTargetDate = isEditMode && isTargetDateLocked && canInteract;
  const canViewTargetDateHistory = isEditMode && isTargetDateLocked;

  const openTargetRevisionModal = () => {
    setTargetRevisionModal({
      open: true,
      date: formData.revisedTargetCompletionDate || '',
      error: '',
    });
  };

  const closeTargetRevisionModal = () => {
    if (revisionSaving) return;
    setTargetRevisionModal({ open: false, date: '', error: '' });
  };

  const submitTargetRevision = async () => {
    const revisedTargetCompletionDate = String(targetRevisionModal.date || '').trim();
    if (!revisedTargetCompletionDate) {
      setTargetRevisionModal((prev) => ({
        ...prev,
        error: 'Please enter the revised target completion date',
      }));
      return;
    }

    const projectID = formData.projectID;
    const subProjectID = formData.subProjectID || '-1';
    if (!projectID) {
      setTargetRevisionModal((prev) => ({
        ...prev,
        error: 'Project ID is missing. Please reload and try again.',
      }));
      return;
    }

    setRevisionSaving(true);
    try {
      await addRevisedTargetCompletionDate({
        projectID,
        subProjectID,
        revisedTargetCompletionDate,
      });

      setFormData((prev) => ({
        ...prev,
        revisedTargetCompletionDate,
      }));
      setTargetRevisionModal({ open: false, date: '', error: '' });
      notify?.('Project target completion date revised successfully', 'success');
      await onRevisedTargetSaved?.({
        projectID,
        subProjectID,
        revisedTargetCompletionDate,
      });
    } catch (error) {
      console.error(error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to revise target completion date';
      setTargetRevisionModal((prev) => ({ ...prev, error: message }));
      notify?.(message, 'error');
    } finally {
      setRevisionSaving(false);
    }
  };

  const openTargetHistoryModal = async () => {
    const projectID = formData.projectID;
    const subProjectID = formData.subProjectID || '-1';
    if (!projectID) {
      notify?.('Project ID is missing. Please reload and try again.', 'error');
      return;
    }

    setTargetHistoryModal({ open: true, rows: [], loading: true });
    try {
      const response = await fetchRevisedTargetCompletionHistory(projectID, subProjectID);
      const rows = Array.isArray(response?.data) ? response.data : [];
      setTargetHistoryModal({ open: true, rows, loading: false });
    } catch (error) {
      console.error(error);
      setTargetHistoryModal({ open: false, rows: [], loading: false });
      notify?.(
        error?.response?.data?.message || error?.message || 'Failed to load revision history',
        'error'
      );
    }
  };

  const closeTargetHistoryModal = () => {
    setTargetHistoryModal({ open: false, rows: [], loading: false });
  };

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
    if (!selectedStateIds.length) return [];
    return districtOptions.filter((item) => selectedStateIds.includes(String(item.state_id)));
  }, [districtOptions, selectedStateIds]);

  const filteredMpOptions = useMemo(() => {
    if (!selectedStateIds.length) return [];
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
      if (isEditMode) {
        const rawPid = String(formData.projectID || '').trim();
        if (!rawPid) {
          nextErrors.projectID = 'Project ID is missing. Please reload and try again.';
        }
      }

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

      const cost = Number(formData.estimatedProjectCost);
      if (
        formData.estimatedProjectCost === '' ||
        formData.estimatedProjectCost == null ||
        Number.isNaN(cost) ||
        cost < 0
      ) {
        nextErrors.estimatedProjectCost = 'Invalid estimated project cost';
      }

      if (!isEditMode && formData.onSubProjectAvailable !== 0 && formData.onSubProjectAvailable !== 1) {
        nextErrors.onSubProjectAvailable = 'Please select whether this project has sub-projects';
      }

      if (!isEditMode && Number(formData.onSubProjectAvailable) === 1) {
        const subCount = Number(formData.subProjectNum);
        if (
          !formData.subProjectNum ||
          String(formData.subProjectNum).includes('-') ||
          Number.isNaN(subCount) ||
          subCount < 1
        ) {
          nextErrors.subProjectNum = 'Enter at least 1 sub-project (no negative values)';
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
        String(formData.estimatedProjectCost).includes('-') ||
        Number.isNaN(cost) ||
        cost <= 0
      ) {
        nextErrors.estimatedProjectCost = 'Estimated project cost must be greater than 0 (no negative values)';
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

      if (formData.onLandAcquistion !== 0 && formData.onLandAcquistion !== 1) {
        nextErrors.onLandAcquistion = 'Please select whether land acquisition is needed';
      }

      if (formData.onLandAcquistion === 1) {
        const area = Number(formData.landAreaReq);
        if (
          !String(formData.landAreaReq || '').trim() ||
          String(formData.landAreaReq).includes('-') ||
          Number.isNaN(area) ||
          area <= 0
        ) {
          nextErrors.landAreaReq = 'Enter a valid land area required (greater than 0, no negative values)';
        }

        if (formData.onAcquisitionCompleted !== 0 && formData.onAcquisitionCompleted !== 1) {
          nextErrors.onAcquisitionCompleted = 'Please select whether acquisition is completed';
        }

        if (formData.onAcquisitionCompleted === 0) {
          const pct = Number(formData.percentLandAcquired);
          if (
            formData.percentLandAcquired === '' ||
            formData.percentLandAcquired == null ||
            String(formData.percentLandAcquired).includes('-') ||
            Number.isNaN(pct) ||
            pct < 0 ||
            pct > 100
          ) {
            nextErrors.percentLandAcquired = 'Enter land acquired percentage between 0 and 100 (no negative values)';
          }
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
    const sectionOrder = ['basic', 'cost', 'location', 'docs'];
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
      notify?.(formatValidationToast(nextErrors), 'error');
      setTimeout(() => {
        const firstInvalid = document.querySelector(
          '#project-basic-info-form .border-rose-400, #project-basic-info-form [class*="border-rose-"]'
        );
        firstInvalid?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }, 80);
      return;
    }

    const saved = await onSubmit?.({ ...formData, pendingFilesByType });
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

  const validatePickedDocument = (file, config) => {
    const name = String(file?.name || '').toLowerCase();
    const ext = name.includes('.') ? `.${name.split('.').pop()}` : '';
    const allowedByExt = config.acceptExtensions.includes(ext);
    const allowedByMime =
      config.folderName === 'project_images'
        ? String(file?.type || '').startsWith('image/')
        : config.folderName === 'project_ppt'
          ? [
              'application/pdf',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            ].includes(String(file?.type || '')) || allowedByExt
          : String(file?.type || '') === 'application/pdf' || allowedByExt;

    if (!allowedByExt && !allowedByMime) {
      notify?.(
        `${config.label}: invalid file "${file.name}". Allowed: ${config.acceptExtensions.join(', ')}`,
        'error'
      );
      return false;
    }

    if (file.size > config.maxBytes) {
      notify?.(
        `${config.label}: "${file.name}" (${formatFileSize(file.size)}) exceeds 20 MB limit.`,
        'error'
      );
      return false;
    }

    return true;
  };

  const handleDocumentFilesChange = (folderName, event) => {
    const config =
      PROJECT_DOCUMENT_TYPES.find((item) => item.folderName === folderName) || PROJECT_DOCUMENT_TYPES[0];
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;

    const existing = pendingFilesByType[folderName] || [];
    const next = [...existing];

    for (const file of picked) {
      if (!validatePickedDocument(file, config)) continue;
      const alreadyQueued = next.some(
        (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
      );
      if (alreadyQueued) continue;
      next.push(file);
    }

    if (next.length > config.maxFiles) {
      notify?.(`${config.label}: maximum ${config.maxFiles} file(s) allowed per upload.`, 'error');
    }

    setPendingFilesByType((prev) => ({
      ...prev,
      [folderName]: next.slice(0, config.maxFiles),
    }));
    event.target.value = '';
  };

  const removePendingDocument = (folderName, index) => {
    setPendingFilesByType((prev) => ({
      ...prev,
      [folderName]: (prev[folderName] || []).filter((_, i) => i !== index),
    }));
  };

  const clearPendingDocuments = (folderName) => {
    setPendingFilesByType((prev) => ({ ...prev, [folderName]: [] }));
    setDocumentInputKeyByType((prev) => ({
      ...prev,
      [folderName]: (prev[folderName] || 0) + 1,
    }));
  };

  const uploadPendingDocuments = (folderName) => {
    const files = pendingFilesByType[folderName] || [];
    if (!files.length) return;
    if (isEditMode) {
      onUploadDocuments?.({ folderName, files });
      clearPendingDocuments(folderName);
    } else {
      notify?.(
        `${files.length} file(s) staged. They will be uploaded automatically when you click Complete & Save Project.`,
        'info'
      );
    }
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
        'projectID', 'projectName', 'projectBrief', 'estimatedProjectCost', 'primaryImplementingAgency', 'newImplementingAgency',
        'newImplementingAgencyCode', 'projectCategory', 'scheme', 'projectType',
        'implementationType', 'projectInitiatedDate', 'targetCompletionDate',
        'newProjectOutput', 'newProjectOutcome', 'newProjectOutputUnits', 'newProjectOutcomeUnits',
        'onSubProjectAvailable', 'subProjectNum', 'subProjectsTab'
      ].includes(key)) counts.basic++;
      else if ([
        'sourceOfFunding', 'primaryFundingAgency', 'newFundingAgency',
        'gbsComponents', 'iebrComponents', 'pppComponents', 'loansComponents',
        'multiFundComponents', 'stateGovFundComponents', 'otherSourceFundingComp',
        'sagarmalaComponents', 'pmmsyComponents'
      ].includes(key)) counts.cost++;
      else if ([
        'state', 'district', 'mpConstituency', 'onLandAcquistion', 'landAreaReq',
        'onAcquisitionCompleted', 'percentLandAcquired'
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
                  General Details
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditMode ? (
                <>
                  <div>
                    <Label>Project ID</Label>
                    <input
                      type="text"
                      value={formData.projectID || ''}
                      disabled
                      className={getInputClass('projectID')}
                    />
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">Project ID is locked in edit mode.</p>
                    <FieldError error={errors.projectID} />
                  </div>

                  <div>
                    <Label>Sub Project ID</Label>
                    <input
                      type="text"
                      value={formData.subProjectID || ''}
                      disabled
                      className={getInputClass('subProjectID')}
                    />
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">Sub Project ID is locked in edit mode.</p>
                    <FieldError error={errors.subProjectID} />
                  </div>
                </>
              ) : null}

              <div className="md:col-span-2">
                <Label required>Project Name</Label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  disabled={!canInteract}
                  placeholder="Enter project name"
                  className={getInputClass('projectName')}
                />
                <FieldError error={errors.projectName} />
              </div>

              <div className="md:col-span-2">
                <Label required>Project Brief</Label>
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
                <Label required>Estimated Project Cost (In Cr.)</Label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimatedProjectCost}
                  onChange={(e) => {
                    const val = e.target.value.replace(/-/g, '');
                    handleInputChange('estimatedProjectCost', val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  disabled={!canInteract}
                  placeholder="0.00"
                  className={getInputClass('estimatedProjectCost')}
                />
                <FieldError error={errors.estimatedProjectCost} />
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
                <Label required>Project Intiated Date</Label>
                <input
                  type="date"
                  value={formData.projectInitiatedDate}
                  onChange={(e) => handleInputChange('projectInitiatedDate', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('projectInitiatedDate')}
                />
                <FieldError error={errors.projectInitiatedDate} />
              </div>

              {!isTargetDateLocked ? (
                <div>
                  <Label required>Targeted Completion Date</Label>
                  <input
                    type="date"
                    value={formData.targetCompletionDate}
                    onChange={(e) => handleInputChange('targetCompletionDate', e.target.value)}
                    disabled={!canInteract}
                    className={getInputClass('targetCompletionDate')}
                  />
                  <FieldError error={errors.targetCompletionDate} />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <Label required>Revised Targeted Completion Date</Label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      type="date"
                      value={
                        formData.revisedTargetCompletionDate || formData.targetCompletionDate || ''
                      }
                      disabled
                      className={getInputClass('revisedTargetCompletionDate', 'opacity-75 flex-1 max-w-md')}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={openTargetRevisionModal}
                        disabled={!canReviseTargetDate}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Revise
                      </button>
                      <button
                        type="button"
                        onClick={openTargetHistoryModal}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100"
                      >
                        <History className="h-3.5 w-3.5" />
                        History
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
              </div>

              {showOutputOthers ? (
                <>
                  <div>
                    <Label required>Add New Project Output Name</Label>
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
                    <Label required>Add Project Output Units</Label>
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
              </div>

              {showOutcomeOthers ? (
                <>
                  <div>
                    <Label required>Add New Project Outcome Name</Label>
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
                    <Label required>Add Project Outcome Units</Label>
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

              <div>
                <Label>Capacity Addition (In MTPA)</Label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capacityAddition}
                  onChange={(e) => handleInputChange('capacityAddition', e.target.value)}
                  disabled={!canInteract}
                  className={getInputClass('capacityAddition')}
                />
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
                          if (Number(formData.subProjectNum) < 1) setSubProjectCount(1);
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
                        min="1"
                        value={formData.subProjectNum || ''}
                        disabled={!canInteract}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/-/g, '');
                          setSubProjectCount(cleanVal);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                            e.preventDefault();
                          }
                        }}
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
                <span>Next: Source of Funding</span>
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
                  Source of Funding
                </h3>
                <p className="text-xs text-slate-500">Source components, funding agencies, and target expenditure</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
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
                      min="0"
                      value={formData.gbsComponents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('gbsComponents', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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
                      min="0"
                      value={formData.iebrComponents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('iebrComponents', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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
                      min="0"
                      value={formData.pppComponents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('pppComponents', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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
                      min="0"
                      value={formData.loansComponents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('loansComponents', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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
                      min="0"
                      value={formData.sagarmalaComponents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('sagarmalaComponents', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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
                      min="0"
                      value={formData.stateGovFundComponents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('stateGovFundComponents', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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
                      min="0"
                      value={formData.multiFundComponents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('multiFundComponents', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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
                      min="0"
                      value={formData.pmmsyComponents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('pmmsyComponents', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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
                      min="0"
                      value={formData.otherSourceFundingComp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        handleInputChange('otherSourceFundingComp', val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Subtract' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
                      placeholder="0.00"
                      className={getInputClass('otherSourceFundingComp')}
                    />
                    <FieldError error={errors.otherSourceFundingComp} />
                  </div>
                )}
              </div>
            </div>

            {isEditMode && outlayProps ? (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Target Expenditure
                </h4>
                <ProjectExpenditureOutlay {...outlayProps} />
              </div>
            ) : null}

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
                <span>Next: Project Location</span>
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
                  Project Location & Land Detail
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
                  <Label required>Land Acquisition Needed?</Label>
                  <div
                    className={`flex items-center space-x-4 mt-2 rounded-xl px-2 py-1.5 ${
                      errors.onLandAcquistion
                        ? 'border border-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                        : ''
                    }`}
                  >
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="onLandAcquisition"
                        checked={formData.onLandAcquistion === 1}
                        onChange={() => handleInputChange('onLandAcquistion', 1)}
                        disabled={!canInteract}
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
                        disabled={!canInteract}
                        className="text-blue-600"
                      />
                      <span>No</span>
                    </label>
                  </div>
                  <FieldError error={errors.onLandAcquistion} />
                </div>

                {formData.onLandAcquistion === 1 && (
                  <>
                    <div>
                      <Label required>Land Area Required (In Hectare)</Label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.landAreaReq}
                        onChange={(e) => handleInputChange('landAreaReq', e.target.value)}
                        placeholder="Area in Acres"
                        disabled={!canInteract}
                        className={getInputClass('landAreaReq')}
                      />
                      <FieldError error={errors.landAreaReq} />
                    </div>

                    <div>
                      <Label required>Acquisition Completed?</Label>
                      <div
                        className={`flex items-center space-x-4 mt-2 rounded-xl px-2 py-1.5 ${
                          errors.onAcquisitionCompleted
                            ? 'border border-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                            : ''
                        }`}
                      >
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="onAcquisitionCompleted"
                            checked={formData.onAcquisitionCompleted === 1}
                            onChange={() => handleInputChange('onAcquisitionCompleted', 1)}
                            disabled={!canInteract}
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
                            disabled={!canInteract}
                            className="text-blue-600"
                          />
                          <span>No</span>
                        </label>
                      </div>
                      <FieldError error={errors.onAcquisitionCompleted} />
                    </div>

                    {formData.onAcquisitionCompleted === 0 && (
                      <div>
                        <Label required>% Land Acquired</Label>
                        <input
                          type="number"
                          step="0.1"
                          max="100"
                          value={formData.percentLandAcquired}
                          onChange={(e) => handleInputChange('percentLandAcquired', e.target.value)}
                          placeholder="e.g. 75"
                          disabled={!canInteract}
                          className={getInputClass('percentLandAcquired')}
                        />
                        <FieldError error={errors.percentLandAcquired} />
                      </div>
                    )}
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
                onClick={() => goToSection('docs')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>Next: Others</span>
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

              {!isTargetDateLocked ? (
                <div>
                  <Label required>Target Completion Date</Label>
                  <input
                    type="date"
                    value={formData.targetCompletionDate}
                    onChange={(e) => handleInputChange('targetCompletionDate', e.target.value)}
                    disabled={!canInteract}
                    className={getInputClass('targetCompletionDate')}
                  />
                  <FieldError error={errors.targetCompletionDate} />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <Label required>Revised Target Completion Date</Label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      type="date"
                      value={
                        formData.revisedTargetCompletionDate || formData.targetCompletionDate || ''
                      }
                      disabled
                      className={getInputClass('revisedTargetCompletionDate', 'opacity-75 flex-1 max-w-md')}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={openTargetRevisionModal}
                        disabled={!canReviseTargetDate}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Revise
                      </button>
                      <button
                        type="button"
                        onClick={openTargetHistoryModal}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100"
                      >
                        <History className="h-3.5 w-3.5" />
                        History
                      </button>
                    </div>
                  </div>
                  <FieldError error={errors.revisedTargetCompletionDate} />
                </div>
              )}

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
                  Others
                </h3>
                <p className="text-xs text-slate-500">Project documents and file attachments</p>
              </div>
            </div>

            {canInteract && (
              <p className="text-[11px] font-semibold text-slate-500">
                Choose files under each type below. You can remove a wrong selection before uploading. Max 20 MB per file.
              </p>
            )}

            <div className="space-y-4">
              {PROJECT_DOCUMENT_TYPES.map((docType) => {
                const pending = pendingFilesByType[docType.folderName] || [];
                const uploaded = documentsByType.grouped[docType.folderName] || [];
                return (
                  <div
                    key={docType.folderName}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wide text-[#0f417a] dark:text-blue-300">
                            {docType.label}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-slate-500 font-medium">{docType.hint}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5">
                          {uploaded.length} saved
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {canInteract ? (
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                          <div className="flex-1 min-w-0">
                            <Label>Select file(s)</Label>
                            <input
                              key={`${docType.folderName}-${documentInputKeyByType[docType.folderName] || 0}`}
                              type="file"
                              multiple
                              accept={docType.accept}
                              onChange={(e) => handleDocumentFilesChange(docType.folderName, e)}
                              className="w-full p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => uploadPendingDocuments(docType.folderName)}
                            disabled={uploadingDocuments || pending.length === 0}
                            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-[#0f417a] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>
                              {uploadingDocuments
                                ? 'Uploading...'
                                : isEditMode
                                  ? pending.length
                                    ? `Upload (${pending.length})`
                                    : 'Upload'
                                  : pending.length
                                    ? `Staged (${pending.length})`
                                    : 'Stage File'}
                            </span>
                          </button>
                        </div>
                      ) : null}

                      {pending.length > 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              {isEditMode ? `Ready to upload (${pending.length})` : `Staged to save with project (${pending.length})`}
                            </p>
                            <button
                              type="button"
                              onClick={() => clearPendingDocuments(docType.folderName)}
                              className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline"
                            >
                              Clear all
                            </button>
                          </div>
                          <ul className="space-y-1">
                            {pending.map((file, index) => (
                              <li
                                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                                className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-700"
                              >
                                <span className="truncate" title={`${file.name} (${formatFileSize(file.size)})`}>
                                  {file.name} ({formatFileSize(file.size)})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removePendingDocument(docType.folderName, index)}
                                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-rose-600 hover:bg-rose-50"
                                  title="Remove from selection"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Remove</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {documentsLoading ? (
                        <p className="text-[11px] text-slate-400 font-semibold">Loading...</p>
                      ) : uploaded.length === 0 ? (
                        <p className="text-[11px] text-slate-400 font-semibold border border-dashed border-slate-200 rounded-lg px-3 py-3 text-center">
                          No {docType.label.toLowerCase()} uploaded yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                          {uploaded.map((doc, idx) => {
                            const name = doc.document_name || doc.name || doc.file_name;
                            return (
                              <li
                                key={doc.id || `${docType.folderName}-${name}-${idx}`}
                                className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold bg-white dark:bg-slate-900/30"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-slate-800 dark:text-slate-100" title={name}>
                                    {name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {doc.created_date ? String(doc.created_date).slice(0, 10) : '-'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {onDownloadDocument ? (
                                    <button
                                      type="button"
                                      onClick={() => onDownloadDocument(name || doc)}
                                      className="p-1 hover:bg-blue-50 text-blue-600 rounded"
                                      title="Download"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                  {canInteract && onDeleteDocument ? (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteDocument(name || doc)}
                                      className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}

              {documentsByType.other.length > 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Other attachments</h4>
                  <ul className="space-y-1">
                    {documentsByType.other.map((doc, idx) => {
                      const name = doc.document_name || doc.name || doc.file_name;
                      return (
                        <li key={doc.id || `other-${name}-${idx}`} className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                          <span className="truncate">{name}</span>
                          <div className="flex items-center gap-1">
                            {onDownloadDocument ? (
                              <button type="button" onClick={() => onDownloadDocument(name || doc)} className="p-1 text-blue-600">
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                            {canInteract && onDeleteDocument ? (
                              <button type="button" onClick={() => onDeleteDocument(name || doc)} className="p-1 text-rose-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSection('location')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous: Project Location</span>
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

      {targetRevisionModal.open
        ? renderInBody(
            <div className="fixed inset-0 z-[9999] bg-slate-900/45 flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Revise Target Completion Date</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter the revised targeted completion date for this project.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeTargetRevisionModal}
                    disabled={revisionSaving}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Revised Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={targetRevisionModal.date}
                      onChange={(e) =>
                        setTargetRevisionModal((prev) => ({
                          ...prev,
                          date: e.target.value,
                          error: '',
                        }))
                      }
                      disabled={revisionSaving}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  {targetRevisionModal.error ? (
                    <p className="text-xs font-semibold text-rose-600">{targetRevisionModal.error}</p>
                  ) : null}
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeTargetRevisionModal}
                    disabled={revisionSaving}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 disabled:opacity-60"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={submitTargetRevision}
                    disabled={revisionSaving}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-60"
                  >
                    {revisionSaving ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          )
        : null}

      {targetHistoryModal.open
        ? renderInBody(
            <div className="fixed inset-0 z-[9999] bg-slate-900/45 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Revision History</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Revised targeted completion date history
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeTargetHistoryModal}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-5">
                  {targetHistoryModal.loading ? (
                    <p className="text-xs font-semibold text-slate-500">Loading history...</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left">Sl. No.</th>
                            <th className="px-3 py-2 text-left">Revised Target Completion Date</th>
                            <th className="px-3 py-2 text-left">Revised On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {targetHistoryModal.rows.length ? (
                            targetHistoryModal.rows.map((item, idx) => (
                              <tr
                                key={`${idx}-${item.revised_on || item.revised_target_completion_date || ''}`}
                                className="border-t border-slate-100"
                              >
                                <td className="px-3 py-2">{idx + 1}</td>
                                <td className="px-3 py-2">
                                  {item.revised_target_completion_date
                                    ? String(item.revised_target_completion_date).slice(0, 10)
                                    : '-'}
                                </td>
                                <td className="px-3 py-2">
                                  {item.revised_on ? String(item.revised_on).slice(0, 10) : '-'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                                No revision history found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={closeTargetHistoryModal}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700"
                  >
                    Exit
                  </button>
                </div>
              </div>
            </div>
          )
        : null}

    </div>
  );
}
