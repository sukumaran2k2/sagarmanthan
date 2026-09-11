function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function textOrDash(value) {
  if (value == null) return '-';
  const s = String(value).trim();
  return s ? s : '-';
}

function normalizeSubProjectId(value) {
  if (value == null) return '-1';
  const text = String(value).trim();
  if (!text || text === '-') return '-1';
  return text;
}

function normalizeMulti(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === '') return [];
  return String(value)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function toTitleCase(value) {
  return String(value || '').replace(/\b\w/g, (char) => char.toUpperCase());
}

function nullIfInvalidNumber(value) {
  if (value === '' || value == null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getProjectIdentity(input = {}) {
  const projectId = input.projectId || input.projectID || input?.raw?.project_id || '';
  const subProjectId =
    input.subProjectId || input.subProjectID || input?.raw?.sub_project_id || '-1';

  return {
    projectID: String(projectId || '').trim(),
    subProjectID: normalizeSubProjectId(subProjectId),
  };
}

export function resolveStageId(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return '0';

  if (/^\d+$/.test(normalized)) return normalized;

  if (normalized.includes('completed')) return '14';
  if (normalized.includes('under implementation')) return '13';
  if (normalized.includes('under tendering')) return '12';
  if (normalized.includes('project initiated')) return '0';

  return '0';
}

export function deriveImplementationMode(sourceOfFunding) {
  const ids = normalizeMulti(sourceOfFunding);
  return ids.includes('3') ? 'PPP' : 'EPC';
}

export function deriveSagarmalaFunding(sourceOfFunding) {
  const ids = normalizeMulti(sourceOfFunding);
  return ids.includes('8') ? '1' : '';
}

/**
 * Normalize Others selections into API-ready values (legacy addNewProject parity).
 */
export function normalizeProjectFormForSubmit(form = {}) {
  const next = { ...form };

  if (String(next.secondaryImplementingAgency) === 'Others') {
    next.secondaryImplementingAgency = toTitleCase(next.newImplementingAgency);
  }

  if (String(next.secondaryFundingAgency) === 'Others') {
    next.secondaryFundingAgency = toTitleCase(next.newFundingAgency);
  }

  if (String(next.projectOutput) === 'Others') {
    next.projectOutput = toTitleCase(next.newProjectOutput);
  }

  if (String(next.projectOutcome) === 'Others') {
    next.projectOutcome = toTitleCase(next.newProjectOutcome);
  }

  next.implementationMode = deriveImplementationMode(next.sourceOfFunding);
  next.sagarmalaFunding = deriveSagarmalaFunding(next.sourceOfFunding);

  return next;
}

export function mapProjectListRow(raw = {}, index = 0) {
  const projectId = raw.project_id || raw.projectId || '-';
  const subProjectId = raw.sub_project_id || raw.subProjectId || '-';

  const stateName =
    raw.sub_state_names || raw.state_names || raw.state_name || raw.state || raw.stateName;

  return {
    id: raw.id || raw.project_details_id || `${projectId}-${subProjectId}-${index}`,
    projectId: textOrDash(projectId),
    subProjectId: textOrDash(subProjectId),
    projectName: textOrDash(raw.project_name || raw.projectName),
    subProjectName: textOrDash(raw.sub_project_name || raw.subProjectName),
    stage: textOrDash(raw.project_stage || raw.projectStageName || raw.stage || raw.stage_name),
    category: textOrDash(
      raw.project_category || raw.projectCategory || raw.category || raw.project_category_names
    ),
    organisationName: textOrDash(raw.organisation_name || raw.organisationName || raw.agency),
    stateName: textOrDash(stateName),
    cost: safeNumber(
      raw.project_cost || raw.estimatedProjectCost || raw.cost || raw.estimated_cost || raw.sanctioned_cost
    ),
    sanctionedCost: (raw.sanctioned_cost !== undefined && raw.sanctioned_cost !== null && raw.sanctioned_cost !== '')
      ? safeNumber(raw.sanctioned_cost)
      : (raw.cost !== undefined && raw.cost !== null ? safeNumber(raw.cost) : null),
    primaryImplementingAgency: textOrDash(
      raw.primary_ia_name || raw.primaryImplementingAgency || raw.primary_ia || raw.primaryImplementingAgencyName || raw.ia_name
    ),
    physicalProgress: safeNumber(raw.physical_progress || raw.physicalProgress),
    financialProgress: safeNumber(raw.financial_progress || raw.financialProgress),
    dropDate: raw.drop_date || raw.dropDate || raw.raw?.drop_date || null,
    dropRemarks: textOrDash(raw.drop_remarks || raw.dropRemarks || raw.remarks || raw.raw?.drop_remarks),
    raw,
  };
}

export function mapProjectBasicInfoPayload(form, options = {}) {
  const {
    userId,
    organisationId,
    wingId = null,
    isUpdate = false,
    initialData = null,
  } = options;
  const identity = getProjectIdentity(initialData || {});
  const normalized = normalizeProjectFormForSubmit(form);

  const payload = {
    projectName: normalized.projectName,
    projectBrief: normalized.projectBrief,
    estimatedProjectCost: normalized.estimatedProjectCost,
    projectType: normalized.projectType,
    implementationMode: normalized.implementationMode,
    implementationType: normalized.implementationType,
    primaryImplementingAgency: normalized.primaryImplementingAgency,
    secondaryImplementingAgency: normalized.secondaryImplementingAgency,
    newImplementingAgencyCode:
      String(form.secondaryImplementingAgency) === 'Others'
        ? form.newImplementingAgencyCode || ''
        : '',
    projectCategory: normalized.projectCategory,
    scheme: normalized.scheme,
    initiative: normalized.initiative,
    projectInitiatedDate: normalized.projectInitiatedDate,
    targetCompletionDate: normalized.targetCompletionDate,
    projectOutput: normalized.projectOutput,
    newProjectOutputUnits: normalized.newProjectOutputUnits || '',
    projectOutcome: normalized.projectOutcome,
    newProjectOutcomeUnits: normalized.newProjectOutcomeUnits || '',
    capacityAddition: nullIfInvalidNumber(normalized.capacityAddition),
    sourceOfFunding: normalized.sourceOfFunding,
    primaryFundingAgency: normalized.primaryFundingAgency,
    secondaryFundingAgency: normalized.secondaryFundingAgency,
    state: normalized.state,
    district: normalized.district,
    taluka: normalized.taluka,
    village: normalized.village,
    mpConstituency: normalized.mpConstituency,
    selectedStage: isUpdate ? resolveStageId(normalized.selectedStage) : '0',

    gbsComponents: normalized.gbsComponents || '',
    iebrComponents: normalized.iebrComponents || '',
    pppComponents: normalized.pppComponents || '',
    loansComponents: normalized.loansComponents || '',
    multiFundComponents: normalized.multiFundComponents || '',
    stateGovFundComponents: normalized.stateGovFundComponents || '',
    pmmsyComponents: normalized.pmmsyComponents || '',
    sagarmalaComponents: normalized.sagarmalaComponents || '',
    otherSourceFundingComp: normalized.otherSourceFundingComp || '',
    sagarmalaFunding: normalized.sagarmalaFunding || '',
    onLandAcquistion: normalized.onLandAcquistion ?? null,
    landAreaReq: normalized.landAreaReq || null,
    onAcquisitionCompleted: normalized.onAcquisitionCompleted ?? null,
    percentLandAcquired: normalized.percentLandAcquired || null,

    userID: userId,
    organisationID: organisationId,
    wingID: wingId,
    onSubProjectAvailable: Number(normalized.onSubProjectAvailable || 0),
    subProjectNum: Number(normalized.subProjectNum || 0),
    subProjectsTab: Array.isArray(normalized.subProjectsTab) ? normalized.subProjectsTab : [],
  };

  if (isUpdate) {
    payload.projectID = identity.projectID;
    payload.subProjectID = identity.subProjectID;
  }

  return payload;
}
