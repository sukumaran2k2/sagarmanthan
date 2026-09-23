export const WORKBENCH_STAGES = [
  'basic',
  'planning',
  'tendering',
  'implementation',
  'completion',
];

export const DEFAULT_STAGE_UNLOCK = {
  basic: true,
  planning: false,
  tendering: false,
  implementation: false,
  completion: false,
};

export function workbenchLevelFromStageId(stageId) {
  const id = Number(stageId);
  if (!Number.isFinite(id) || id <= 0) return 0;
  if (id === 14) return 4;
  if (id === 13) return 3;
  if (id === 12) return 2;
  return 1;
}

export function stageLabelFromStageId(stageId) {
  const id = Number(stageId);
  if (id === 14) return 'Completed';
  if (id === 13) return 'Under Implementation';
  if (id === 12) return 'Under Tendering';
  if (id >= 1) return 'Planning & Sanctioning';
  return 'Project Initiated';
}

export function workbenchStageFromStageId(stageId) {
  return WORKBENCH_STAGES[workbenchLevelFromStageId(stageId)] || 'basic';
}

export function workbenchLevelFromStageName(stageName) {
  const text = String(stageName || '').toLowerCase();
  if (text.includes('complete')) return 4;
  if (text.includes('implement')) return 3;
  if (text.includes('tender')) return 2;
  if (text.includes('plan') || text.includes('sanction')) return 1;
  return 0;
}

export function resolveWorkbenchLevel({ stageId, stageName } = {}) {
  const fromId = stageId != null && stageId !== '' ? workbenchLevelFromStageId(stageId) : 0;
  const fromName = workbenchLevelFromStageName(stageName);
  return Math.max(fromId, fromName);
}

export function isBasicInfoCheckpointMet(rows = []) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return false;
  const type = row.project_type;
  return type !== null && type !== undefined && String(type).trim() !== '';
}

/** Requires sanctioned cost and admin or chairman approval date. */
export function isPlanningCheckpointMet(rows = []) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return false;
  const cost = row.sanctioned_cost;
  const hasCost = cost !== null && cost !== undefined && String(cost).trim() !== '';
  const hasAdmin = Boolean(row.admin_approval_approval_date);
  const hasChairman = Boolean(row.chairman_approval_date);
  return hasCost && (hasAdmin || hasChairman);
}

/** Requires contract-signed actual date and award cost. */
export function isTenderingCheckpointMet(rows = []) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return false;
  const cost = row.resultValue;
  const hasCost = cost !== null && cost !== undefined && String(cost).trim() !== '';
  return Boolean(row.actualDate) && hasCost;
}

/** Requires final milestone (id 5) end date. */
export function isImplementationCheckpointMet(rows = []) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return false;
  return Boolean(row.end_date);
}

export function buildStageUnlockState({
  basicMet = false,
  planningMet = false,
  tenderingMet = false,
  implementationMet = false,
} = {}) {
  const planning = Boolean(basicMet);
  const tendering = planning && Boolean(planningMet);
  const implementation = tendering && Boolean(tenderingMet);
  const completion = implementation && Boolean(implementationMet);

  return {
    basic: true,
    planning,
    tendering,
    implementation,
    completion,
  };
}

export function isStageUnlocked(stageId, unlockState = DEFAULT_STAGE_UNLOCK) {
  if (!stageId) return false;
  if (stageId === 'basic') return true;
  return Boolean(unlockState?.[stageId]);
}

export function getStageLockMessage(stageId) {
  const messages = {
    planning:
      'Please complete Basic Information (Project Type must be saved) before opening Planning & Sanctioning.',
    tendering:
      'Please complete Planning & Sanctioning (Admin/Chairman approval date with sanctioned cost) before opening Under Tendering.',
    implementation:
      'Please complete Under Tendering (Contract Agreement Signed actual date and Awarded Project Cost) before opening Under Implementation.',
    completion:
      'Please complete Under Implementation (Final Milestone actual end date) before opening Completion.',
  };
  return messages[stageId] || 'Please complete the previous stage before proceeding.';
}

export function maxUnlockedStageIndex(unlockState = DEFAULT_STAGE_UNLOCK) {
  let max = 0;
  WORKBENCH_STAGES.forEach((id, idx) => {
    if (unlockState?.[id]) max = idx;
  });
  return max;
}

export function nextActiveStageAfterSave(savedStageId, checkpoints = {}) {
  const current = String(savedStageId || '');
  if (current === 'completion') return 'completion';

  if (current === 'basic' && checkpoints.planningUnlocked) return 'planning';
  if (current === 'planning' && checkpoints.planningUnlocked) return 'tendering';
  if (current === 'tendering' && checkpoints.tenderingUnlocked) return 'implementation';
  if (current === 'implementation' && checkpoints.implementationUnlocked) return 'completion';

  return current;
}

export function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function isValidDateOrder(later, earlier) {
  if (!later || !earlier) return true;
  return new Date(later) >= new Date(earlier);
}
