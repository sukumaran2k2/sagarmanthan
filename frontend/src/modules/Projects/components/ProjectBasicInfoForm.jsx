import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Save, Trash2, Upload } from 'lucide-react';
import {
  FUNDING_SOURCE_OPTIONS,
  IMPLEMENTATION_TYPE_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_STAGE_OPTIONS,
} from '../utils/constants';
import { fetchMmtDropdown } from '../api';

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
    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
      {children} {required ? <span className="text-rose-600">*</span> : null}
    </label>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  return <p className="text-[10px] text-rose-600 font-semibold">{error}</p>;
}

export default function ProjectBasicInfoForm({
  initialData = null,
  canSubmit = false,
  readOnly = false,
  loading = false,
  onBack,
  onSubmit,
  documentRows = [],
  documentsLoading = false,
  uploadingDocuments = false,
  onUploadDocuments,
  onDeleteDocument,
  onDownloadDocument,
}) {
  const [formData, setFormData] = useState(() => getInitialForm(initialData));
  const [errors, setErrors] = useState({});
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

  const selectedStateIds = useMemo(() => {
    const value = formData.state;
    if (Array.isArray(value)) return value.map(String);
    if (value == null || value === '') return [];
    return String(value)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
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

  function getMultiValue(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value == null || value === '') return [];
    return String(value)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function getMultiSelectValue(event) {
    return Array.from(event.target.selectedOptions || [], (option) => option.value);
  }

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

    if (!formData.projectName.trim()) {
      nextErrors.projectName = 'Project name is required';
    }
    if (!formData.estimatedProjectCost || Number(formData.estimatedProjectCost) <= 0) {
      nextErrors.estimatedProjectCost = 'Estimated project cost should be greater than 0';
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
    if (!formData.primaryImplementingAgency.trim()) {
      nextErrors.primaryImplementingAgency = 'Primary implementing agency is required';
    }
    if (!formData.projectInitiatedDate) {
      nextErrors.projectInitiatedDate = 'Project initiated date is required';
    }
    if (!formData.targetCompletionDate) {
      nextErrors.targetCompletionDate = 'Target completion date is required';
    }

    if (Number(formData.onSubProjectAvailable) === 1) {
      if (!formData.subProjectNum || Number(formData.subProjectNum) <= 0) {
        nextErrors.subProjectNum = 'Enter number of sub-projects';
      }
      const missingSubProject = (formData.subProjectsTab || []).some(
        (item) => !String(item?.subProjectName || '').trim()
      );
      if (missingSubProject) {
        nextErrors.subProjectsTab = 'All sub-project names are required';
      }
    }

    if (formData.onLandAcquistion === 1 && !String(formData.landAreaReq || '').trim()) {
      nextErrors.landAreaReq = 'Land area required is mandatory when land acquisition is Yes';
    }

    if (
      formData.onLandAcquistion === 1 &&
      formData.onAcquisitionCompleted === 0 &&
      !String(formData.percentLandAcquired || '').trim()
    ) {
      nextErrors.percentLandAcquired = 'Enter land acquired percentage';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canInteract) return;
    if (!validate()) return;
    await onSubmit?.(formData);
  };

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleStateChange = (event) => {
    const nextStates = getMultiSelectValue(event);
    const allowedDistrictIds = new Set(
      districtOptions
        .filter((item) => nextStates.includes(String(item.state_id)))
        .map((item) => String(item.district_id))
    );
    const allowedMpIds = new Set(
      mpOptions
        .filter((item) => nextStates.includes(String(item.state_id)))
        .map((item) => String(item.mpc_id))
    );

    setFormData((prev) => ({
      ...prev,
      state: nextStates,
      district: getMultiValue(prev.district).filter((id) => allowedDistrictIds.has(String(id))),
      mpConstituency: getMultiValue(prev.mpConstituency).filter((id) => allowedMpIds.has(String(id))),
    }));
  };

  const handleFundingSourceChange = (event) => {
    const nextFundingSources = getMultiSelectValue(event);
    setFormData((prev) => ({
      ...prev,
      sourceOfFunding: nextFundingSources,
      sagarmalaFunding:
        nextFundingSources.includes('8') ? '1' : prev.sagarmalaFunding,
    }));
  };

  const handleDocumentUpload = async () => {
    if (!documentFiles.length || !documentType) return;
    await onUploadDocuments?.({ folderName: documentType, files: documentFiles });
    setDocumentFiles([]);
  };

  const setSubProjectCount = (nextCount) => {
    const count = Number(nextCount) || 0;
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

  const inputClass =
    'w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition disabled:opacity-70 disabled:cursor-not-allowed';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-[#0f417a] uppercase tracking-wide font-display">
            {isEditMode ? 'Edit Project - Basic Information' : 'Project - Basic Information'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Capture core project metadata. RBAC-controlled submission is enabled via JWT claims.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </button>
      </div>

      {!canSubmit && (
        <div className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
          You can view this form, but add/update is restricted by your module permissions.
        </div>
      )}

      <form className="space-y-7" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {isEditMode ? (
            <>
              <div className="space-y-1">
                <Label>Project ID</Label>
                <input type="text" value={formData.projectID} className={inputClass} disabled />
              </div>
              <div className="space-y-1">
                <Label>Sub Project ID</Label>
                <input type="text" value={formData.subProjectID} className={inputClass} disabled />
              </div>
            </>
          ) : null}

          <div className="space-y-1">
            <Label required>Project Name</Label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
              className={inputClass}
              placeholder="Enter complete project name"
              disabled={!canInteract}
            />
            <FieldError error={errors.projectName} />
          </div>

          <div className="space-y-1">
            <Label required>Estimated Cost (₹ Cr)</Label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.estimatedProjectCost}
              onChange={(e) => updateField('estimatedProjectCost', e.target.value)}
              className={inputClass}
              placeholder="0.00"
              disabled={!canInteract}
            />
            <FieldError error={errors.estimatedProjectCost} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Project Brief</Label>
            <textarea
              rows={2}
              value={formData.projectBrief}
              onChange={(e) => updateField('projectBrief', e.target.value)}
              className={inputClass}
              placeholder="Brief summary of the project"
              disabled={!canInteract}
            />
          </div>

          <div className="space-y-1">
            <Label required>Project Type</Label>
            <select
              value={formData.projectType}
              onChange={(e) => updateField('projectType', e.target.value)}
              className={inputClass}
              disabled={!canInteract || isProjectTypeLocked}
            >
              <option value="">Select project type</option>
              {PROJECT_TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <FieldError error={errors.projectType} />
          </div>

          <div className="space-y-1">
            <Label required>Implementation Type</Label>
            <select
              value={formData.implementationType}
              onChange={(e) => updateField('implementationType', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select implementation type</option>
              {IMPLEMENTATION_TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <FieldError error={errors.implementationType} />
          </div>

          <div className="space-y-1">
            <Label>Mode of Implementation</Label>
            <input
              type="text"
              value={formData.implementationMode}
              onChange={(e) => updateField('implementationMode', e.target.value)}
              className={inputClass}
              placeholder="Mode of implementation"
              disabled={!canInteract}
            />
          </div>

          <div className="space-y-1">
            <Label required>Project Category</Label>
            <select
              multiple
              size={1}
              value={getMultiValue(formData.projectCategory)}
              onChange={(e) => updateField('projectCategory', getMultiSelectValue(e))}
              className={`${inputClass} h-10`}
              disabled={!canInteract}
            >
              {(projectCategoryOptions.length
                ? projectCategoryOptions.map((item) => ({
                    value: String(item.project_category_id),
                    label: item.project_category_name,
                  }))
                : selectedCategoryOptions.map((item) => ({ value: item, label: item }))
              ).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 font-medium">Hold Ctrl/Cmd to select multiple</p>
            <FieldError error={errors.projectCategory} />
          </div>

          <div className="space-y-1">
            <Label required>Stage</Label>
            <select
              value={formData.selectedStage}
              onChange={(e) => updateField('selectedStage', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select stage</option>
              {selectedStageOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label required>Primary Implementing Agency</Label>
            <select
              value={formData.primaryImplementingAgency}
              onChange={(e) => updateField('primaryImplementingAgency', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select implementing agency</option>
              {iaOptions.map((item) => (
                <option key={item.ia_id} value={String(item.ia_id)}>
                  {item.ia_name}
                </option>
              ))}
            </select>
            <FieldError error={errors.primaryImplementingAgency} />
          </div>

          <div className="space-y-1">
            <Label>Secondary Implementing Agency</Label>
            <select
              value={formData.secondaryImplementingAgency}
              onChange={(e) => updateField('secondaryImplementingAgency', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select secondary implementing agency</option>
              {iaOptions.map((item) => (
                <option key={item.ia_id} value={String(item.ia_id)}>
                  {item.ia_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label required>Project Initiated Date</Label>
            <input
              type="date"
              value={formData.projectInitiatedDate}
              onChange={(e) => updateField('projectInitiatedDate', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            />
            <FieldError error={errors.projectInitiatedDate} />
          </div>

          <div className="space-y-1">
            <Label required>Target Completion Date</Label>
            <input
              type="date"
              value={formData.targetCompletionDate}
              onChange={(e) => updateField('targetCompletionDate', e.target.value)}
              className={inputClass}
              disabled={!canInteract || isTargetDateLocked}
            />
            <FieldError error={errors.targetCompletionDate} />
          </div>

          {isEditMode ? (
            <div className="space-y-1">
              <Label>Revised Target Completion Date</Label>
              <input
                type="date"
                value={formData.revisedTargetCompletionDate}
                className={inputClass}
                disabled
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <Label>Source of Funding</Label>
            <select
              multiple
              size={1}
              value={getMultiValue(formData.sourceOfFunding)}
              onChange={handleFundingSourceChange}
              className={`${inputClass} h-10`}
              disabled={!canInteract}
            >
              {(sourceOfFundingOptions.length
                ? sourceOfFundingOptions.map((item) => ({
                    value: String(item.source_of_funding_id),
                    label: item.source_of_funding_name,
                  }))
                : FUNDING_SOURCE_OPTIONS.map((item) => ({ value: item, label: item }))
              ).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 font-medium">Hold Ctrl/Cmd to select multiple</p>
          </div>

          <div className="space-y-1">
            <Label>Primary Funding Agency</Label>
            <select
              value={formData.primaryFundingAgency}
              onChange={(e) => updateField('primaryFundingAgency', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select primary funding agency</option>
              {faOptions.map((item) => (
                <option key={item.fa_id} value={String(item.fa_id)}>
                  {item.fa_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Secondary Funding Agency</Label>
            <select
              value={formData.secondaryFundingAgency}
              onChange={(e) => updateField('secondaryFundingAgency', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select secondary funding agency</option>
              {faOptions.map((item) => (
                <option key={item.fa_id} value={String(item.fa_id)}>
                  {item.fa_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Scheme</Label>
            <select
              value={formData.scheme}
              onChange={(e) => updateField('scheme', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select scheme</option>
              {schemeOptions.map((item) => (
                <option key={item.scheme_id} value={String(item.scheme_id)}>
                  {item.scheme_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Initiative</Label>
            <select
              multiple
              size={1}
              value={getMultiValue(formData.initiative)}
              onChange={(e) => updateField('initiative', getMultiSelectValue(e))}
              className={`${inputClass} h-10`}
              disabled={!canInteract}
            >
              {initiativeOptions.map((item) => (
                <option key={item.initiative_id} value={String(item.initiative_id)}>
                  {item.initiative_name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 font-medium">Hold Ctrl/Cmd to select multiple</p>
          </div>

          <div className="space-y-1">
            <Label>Project Output</Label>
            <select
              value={formData.projectOutput}
              onChange={(e) => {
                updateField('projectOutput', e.target.value);
                updateField('projectOutcome', '');
              }}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select output</option>
              {outputOptions.map((item) => (
                <option key={item.project_output_id} value={String(item.project_output_id)}>
                  {item.project_output_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Project Outcome</Label>
            <select
              value={formData.projectOutcome}
              onChange={(e) => updateField('projectOutcome', e.target.value)}
              className={inputClass}
              disabled={!canInteract}
            >
              <option value="">Select outcome</option>
              {outcomeOptions
                .filter((item) => {
                  if (!formData.projectOutput) return true;
                  return String(item.project_output_id) === String(formData.projectOutput);
                })
                .map((item) => (
                  <option key={item.project_outcome_id} value={String(item.project_outcome_id)}>
                    {item.project_outcome_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>State</Label>
            <select
              multiple
              size={1}
              value={getMultiValue(formData.state)}
              onChange={handleStateChange}
              className={`${inputClass} h-10`}
              disabled={!canInteract}
            >
              {stateOptions.map((item) => (
                <option key={item.state_id} value={String(item.state_id)}>
                  {item.state_name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 font-medium">Hold Ctrl/Cmd to select multiple</p>
          </div>

          <div className="space-y-1">
            <Label>District</Label>
            <select
              multiple
              size={1}
              value={getMultiValue(formData.district)}
              onChange={(e) => updateField('district', getMultiSelectValue(e))}
              className={`${inputClass} h-10`}
              disabled={!canInteract}
            >
              {filteredDistrictOptions.map((item) => (
                <option key={item.district_id} value={String(item.district_id)}>
                  {item.district_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Taluka</Label>
            <input
              type="text"
              value={formData.taluka}
              onChange={(e) => updateField('taluka', e.target.value)}
              className={inputClass}
              placeholder="Taluka"
              disabled={!canInteract}
            />
          </div>

          <div className="space-y-1">
            <Label>Village</Label>
            <input
              type="text"
              value={formData.village}
              onChange={(e) => updateField('village', e.target.value)}
              className={inputClass}
              placeholder="Village"
              disabled={!canInteract}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>MP Constituency</Label>
            <select
              multiple
              size={1}
              value={getMultiValue(formData.mpConstituency)}
              onChange={(e) => updateField('mpConstituency', getMultiSelectValue(e))}
              className={`${inputClass} h-10`}
              disabled={!canInteract}
            >
              {filteredMpOptions.map((item) => (
                <option key={item.mpc_id} value={String(item.mpc_id)}>
                  {item.mpc_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Project Output Units</Label>
            <input
              type="text"
              value={formData.newProjectOutputUnits}
              onChange={(e) => updateField('newProjectOutputUnits', e.target.value)}
              className={inputClass}
              placeholder="Output units"
              disabled={!canInteract}
            />
          </div>

          <div className="space-y-1">
            <Label>Project Outcome Units</Label>
            <input
              type="text"
              value={formData.newProjectOutcomeUnits}
              onChange={(e) => updateField('newProjectOutcomeUnits', e.target.value)}
              className={inputClass}
              placeholder="Outcome units"
              disabled={!canInteract}
            />
          </div>

          <div className="space-y-1">
            <Label>Capacity Addition</Label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.capacityAddition}
              onChange={(e) => updateField('capacityAddition', e.target.value)}
              className={inputClass}
              placeholder="0.00"
              disabled={!canInteract}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Sagarmala Funding</Label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(formData.sagarmalaFunding)}
                onChange={(e) => updateField('sagarmalaFunding', e.target.checked ? '1' : '')}
                disabled={!canInteract}
              />
              Mark as Sagarmala funded
            </label>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-black text-[#0f417a] uppercase tracking-wide">Funding Components (In Cr.)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fundingVisibility.gbs ? (
              <div className="space-y-1"><Label>GBS</Label><input type="number" min="0" step="0.01" value={formData.gbsComponents} onChange={(e) => updateField('gbsComponents', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
            {fundingVisibility.iebr ? (
              <div className="space-y-1"><Label>IEBR</Label><input type="number" min="0" step="0.01" value={formData.iebrComponents} onChange={(e) => updateField('iebrComponents', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
            {fundingVisibility.ppp ? (
              <div className="space-y-1"><Label>PPP</Label><input type="number" min="0" step="0.01" value={formData.pppComponents} onChange={(e) => updateField('pppComponents', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
            {fundingVisibility.loans ? (
              <div className="space-y-1"><Label>Loans</Label><input type="number" min="0" step="0.01" value={formData.loansComponents} onChange={(e) => updateField('loansComponents', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
            {fundingVisibility.multilateral ? (
              <div className="space-y-1"><Label>Multilateral</Label><input type="number" min="0" step="0.01" value={formData.multiFundComponents} onChange={(e) => updateField('multiFundComponents', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
            {fundingVisibility.stateGovFund ? (
              <div className="space-y-1"><Label>State Govt Fund</Label><input type="number" min="0" step="0.01" value={formData.stateGovFundComponents} onChange={(e) => updateField('stateGovFundComponents', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
            {fundingVisibility.pmmsy ? (
              <div className="space-y-1"><Label>PMMSY</Label><input type="number" min="0" step="0.01" value={formData.pmmsyComponents} onChange={(e) => updateField('pmmsyComponents', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
            {fundingVisibility.sagarmala ? (
              <div className="space-y-1"><Label>Sagarmala</Label><input type="number" min="0" step="0.01" value={formData.sagarmalaComponents} onChange={(e) => updateField('sagarmalaComponents', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
            {fundingVisibility.otherSources ? (
              <div className="space-y-1"><Label>Other Sources</Label><input type="number" min="0" step="0.01" value={formData.otherSourceFundingComp} onChange={(e) => updateField('otherSourceFundingComp', e.target.value)} className={inputClass} disabled={!canInteract} /></div>
            ) : null}
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-black text-[#0f417a] uppercase tracking-wide">Land Acquisition</h3>
          <div className="space-y-2">
            <Label>Is Land Acquisition required?</Label>
            <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="onLandAcquistion" checked={formData.onLandAcquistion === 1} onChange={() => updateField('onLandAcquistion', 1)} disabled={!canInteract} /> Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="onLandAcquistion" checked={formData.onLandAcquistion === 0} onChange={() => updateField('onLandAcquistion', 0)} disabled={!canInteract} /> No
              </label>
            </div>
          </div>

          {formData.onLandAcquistion === 1 ? (
            <>
              <div className="space-y-1">
                <Label required>Land Area Required</Label>
                <input
                  type="text"
                  value={formData.landAreaReq}
                  onChange={(e) => updateField('landAreaReq', e.target.value)}
                  className={inputClass}
                  placeholder="Land area"
                  disabled={!canInteract}
                />
                <FieldError error={errors.landAreaReq} />
              </div>

              <div className="space-y-2">
                <Label>Is Land Acquisition completed?</Label>
                <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="onAcquisitionCompleted" checked={formData.onAcquisitionCompleted === 1} onChange={() => updateField('onAcquisitionCompleted', 1)} disabled={!canInteract} /> Yes
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="onAcquisitionCompleted" checked={formData.onAcquisitionCompleted === 0} onChange={() => updateField('onAcquisitionCompleted', 0)} disabled={!canInteract} /> No
                  </label>
                </div>
              </div>

              {formData.onAcquisitionCompleted === 0 ? (
                <div className="space-y-1">
                  <Label required>% Land Acquired</Label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.percentLandAcquired}
                    onChange={(e) => updateField('percentLandAcquired', e.target.value)}
                    className={inputClass}
                    placeholder="0 - 100"
                    disabled={!canInteract}
                  />
                  <FieldError error={errors.percentLandAcquired} />
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-black text-[#0f417a] uppercase tracking-wide">Project and Sub-Projects</h3>
          <div className="space-y-2">
            <Label>Does this project have sub-projects?</Label>
            <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="onSubProjectAvailable"
                  checked={Number(formData.onSubProjectAvailable) === 1}
                  onChange={() => {
                    updateField('onSubProjectAvailable', 1);
                    if (!formData.subProjectNum) setSubProjectCount(1);
                  }}
                  disabled={!canInteract}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="onSubProjectAvailable"
                  checked={Number(formData.onSubProjectAvailable) === 0}
                  onChange={() => {
                    updateField('onSubProjectAvailable', 0);
                    setSubProjectCount(0);
                  }}
                  disabled={!canInteract}
                />
                No
              </label>
            </div>
          </div>

          {Number(formData.onSubProjectAvailable) === 1 ? (
            <>
              <div className="space-y-1 max-w-xs">
                <Label required>Number of Sub-Projects</Label>
                <input
                  type="number"
                  min="1"
                  value={formData.subProjectNum}
                  onChange={(e) => setSubProjectCount(e.target.value)}
                  className={inputClass}
                  disabled={!canInteract}
                />
                <FieldError error={errors.subProjectNum} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.subProjectsTab || []).map((item, idx) => (
                  <div key={`subproject-${idx}`} className="space-y-1">
                    <Label required>Sub-Project {idx + 1} Name</Label>
                    <input
                      type="text"
                      value={item?.subProjectName || ''}
                      onChange={(e) => updateSubProjectName(idx, e.target.value)}
                      className={inputClass}
                      placeholder={`Enter sub-project ${idx + 1} name`}
                      disabled={!canInteract}
                    />
                  </div>
                ))}
              </div>
              <FieldError error={errors.subProjectsTab} />
            </>
          ) : null}
        </div>

        {isEditMode ? (
          <div className="border border-slate-200 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-black text-[#0f417a] uppercase tracking-wide">Update Project Files</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <Label>Document Type</Label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className={inputClass}
                  disabled={!canInteract || uploadingDocuments}
                >
                  <option value="project_ppt">Project PPT</option>
                  <option value="project_pert">Project PERT</option>
                  <option value="project_images">Project Images</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label>Choose File(s)</Label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setDocumentFiles(Array.from(e.target.files || []))}
                  className={inputClass}
                  disabled={!canInteract || uploadingDocuments}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDocumentUpload}
                disabled={!canInteract || uploadingDocuments || !documentFiles.length}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 transition shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                {uploadingDocuments ? 'Uploading...' : 'Upload File(s)'}
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 text-xs font-bold text-slate-700">Uploaded Documents</div>
              <div className="divide-y divide-slate-100">
                {documentsLoading ? (
                  <div className="px-3 py-3 text-xs text-slate-500">Loading documents...</div>
                ) : documentRows.length ? (
                  documentRows.map((doc, idx) => (
                    <div key={`${doc.document_name || 'doc'}-${idx}`} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{doc.document_name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{doc.document_type}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onDownloadDocument?.(doc.document_name)}
                          className="p-1.5 rounded hover:bg-slate-100 text-[#0f417a]"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDocument?.(doc.document_name)}
                          className="p-1.5 rounded hover:bg-rose-50 text-rose-700"
                          title="Delete"
                          disabled={!canInteract}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-3 text-xs text-slate-500">No documents uploaded.</div>
                )}
              </div>
            </div>


          </div>
        ) : null}

        <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={!canInteract}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black text-white bg-[#0f417a] hover:bg-[#1d5594] transition shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : isEditMode ? 'Update Project' : 'Save Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
