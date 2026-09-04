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
    physicalProgress: safeNumber(raw.physical_progress || raw.physicalProgress),
    financialProgress: safeNumber(raw.financial_progress || raw.financialProgress),
    raw,
  };
}

export function mapProjectBasicInfoPayload(form, options = {}) {
  const { userId, organisationId, isUpdate = false, initialData = null } = options;
  const identity = getProjectIdentity(initialData || {});

  const payload = {
    projectName: form.projectName,
    projectBrief: form.projectBrief,
    estimatedProjectCost: form.estimatedProjectCost,
    projectType: form.projectType,
    implementationMode: form.implementationMode,
    implementationType: form.implementationType,
    primaryImplementingAgency: form.primaryImplementingAgency,
    secondaryImplementingAgency: form.secondaryImplementingAgency,
    projectCategory: form.projectCategory,
    scheme: form.scheme,
    initiative: form.initiative,
    projectInitiatedDate: form.projectInitiatedDate,
    targetCompletionDate: form.targetCompletionDate,
    projectOutput: form.projectOutput,
    newProjectOutputUnits: form.newProjectOutputUnits || '',
    projectOutcome: form.projectOutcome,
    newProjectOutcomeUnits: form.newProjectOutcomeUnits || '',
    capacityAddition: form.capacityAddition,
    sourceOfFunding: form.sourceOfFunding,
    primaryFundingAgency: form.primaryFundingAgency,
    secondaryFundingAgency: form.secondaryFundingAgency,
    state: form.state,
    district: form.district,
    taluka: form.taluka,
    village: form.village,
    mpConstituency: form.mpConstituency,
    selectedStage: resolveStageId(form.selectedStage),

    gbsComponents: form.gbsComponents || '',
    iebrComponents: form.iebrComponents || '',
    pppComponents: form.pppComponents || '',
    loansComponents: form.loansComponents || '',
    multiFundComponents: form.multiFundComponents || '',
    stateGovFundComponents: form.stateGovFundComponents || '',
    pmmsyComponents: form.pmmsyComponents || '',
    sagarmalaComponents: form.sagarmalaComponents || '',
    otherSourceFundingComp: form.otherSourceFundingComp || '',
    sagarmalaFunding: form.sagarmalaFunding || '',
    onLandAcquistion: form.onLandAcquistion ?? null,
    landAreaReq: form.landAreaReq || null,
    onAcquisitionCompleted: form.onAcquisitionCompleted ?? null,
    percentLandAcquired: form.percentLandAcquired || null,

    userID: userId,
    organisationID: organisationId,
    wingID: null,
    onSubProjectAvailable: Number(form.onSubProjectAvailable || 0),
    subProjectNum: Number(form.subProjectNum || 0),
    subProjectsTab: Array.isArray(form.subProjectsTab) ? form.subProjectsTab : [],
  };

  if (isUpdate) {
    payload.projectID = identity.projectID;
    payload.subProjectID = identity.subProjectID;
  }

  return payload;
}
