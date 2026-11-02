// Method-of-appointment configuration for the vacancy activity form.
// Shared by Vacancy Management (anticipated vacancies) and Vacant Details (actual vacancies).

export const ORG_OTHER = '73'; // "Other organisation": employee is added later through Employee Database

export const ROOT_KEY = 'processInitiatedDate';
export const ROOT_LABEL = 'Date of Process Initiated';

export const DR_IPA_STAGES = [
  { key: 'appointmentLetterIssuedDate', label: 'Date of Appointment letter Issued', required: true },
];

export const DR_PORT_STAGES = [
  { key: 'notificationIssuedDate', label: 'Date of Notification/ Adv Issued', required: true },
  { key: 'numberOfEligibleApplication', label: 'Number of Eligible Applications Received', type: 'number', required: false },
  { key: 'examConductedDate', label: 'Date of Exam Conducted', required: false },
  { key: 'resultDeclaredDate', label: 'Date of Result declared', required: true },
  { key: 'interviewConductedDate', label: 'Date of Interview Conducted', required: false },
  { key: 'selectionProcessDate', label: 'Date of Selection Process Completed', required: true },
  { key: 'appointmentLetterIssuedDate', label: 'Date of Appointment letter Issued', required: true },
];

export const PROMOTION_STAGES = [
  { key: 'vigilanceClearanceDatePromotion', label: 'Date of Vigilance Clearance Received', required: true },
  { key: 'dpcConductedDatePromotion', label: 'Date of DPC Conducted', required: true },
  { key: 'approvalByAuthorityDatePromotion', label: 'Date of Approval by Competent Authority', required: true },
  { key: 'orderDatePromotion', label: 'Date of Promotion Order Issued', required: true },
];

export const DEPUTATION_STAGES = [
  { key: 'notificationIssuedDate', label: 'Date of Notification Adv Issued', required: true },
  { key: 'applicationReceivedDeputation', label: 'Date of Application Received', required: true },
  { key: 'reviewOfApplicationDeputation', label: 'Date of Review of application by Committee', required: true },
  { key: 'approvalReceivedDeputation', label: 'Date of Approval Received', required: true },
  { key: 'orderIssuedDeputation', label: 'Date of Order issued', required: true },
];

export const ALL_STAGE_KEYS = Array.from(
  new Set([DR_IPA_STAGES, DR_PORT_STAGES, PROMOTION_STAGES, DEPUTATION_STAGES].flat().map((s) => s.key))
);

export const STAGED_MODES = ['directRecruitment', 'promotion', 'deputation', 'composite'];

export function isStagedMode(modeKey) {
  return STAGED_MODES.includes(modeKey);
}


export function getNormalizedMode(modeStr) {
  const m = String(modeStr || '').trim();
  if (m === 'Direct Recruitment (Compassionate Method)') return { key: 'directCompassionate', label: m };
  if (m === 'Promotion-in by Direct Recruitment') return { key: 'promotionDR', label: m };
  if (m === 'Redeployed from CHD Category') return { key: 'redeployedCHD', label: m };
  if (m === 'Redeployed-in') return { key: 'redeployedIn', label: m };
  const lower = m.toLowerCase();
  if (lower.includes('promotion')) return { key: 'promotion', label: 'Promotion' };
  if (lower.includes('deputation')) return { key: 'deputation', label: 'Deputation In' };
  if (lower.includes('composite')) return { key: 'composite', label: 'Composite Method' };
  if (lower.includes('transfer')) return { key: 'transfer', label: 'Transfer In' };
  return { key: 'directRecruitment', label: 'Direct Recruitment' };
}

/** The ordered stage chain for a staged mode. Direct Recruitment depends on who recruits. */
export function getChain(modeKey, form) {
  switch (modeKey) {
    case 'directRecruitment':
      if (form.recruitmentThrough === '1') return DR_IPA_STAGES;
      if (form.recruitmentThrough === '0') return DR_PORT_STAGES;
      return [];
    case 'promotion':
      return PROMOTION_STAGES;
    case 'deputation':
    case 'composite':
      return DEPUTATION_STAGES;
    default:
      return [];
  }
}

/** Direct Recruitment stages wait for the process date; the other staged modes are open. */
export function isStageDisabled(modeKey, form) {
  return modeKey === 'directRecruitment' && !form[ROOT_KEY];
}

// Which employee list the mode picks from (see useVacancyActivity for the API per source).
export const EMPLOYEE_SOURCE = {
  promotion: 'composite',
  composite: 'composite',
  redeployedCHD: 'chd',
  redeployedIn: 'chd',
  promotionDR: 'chd',
  deputation: 'deputed', // per selected organisation
  transfer: 'transferIn', // per selected organisation
};

export const MODES_WITH_ORGANISATION = ['deputation', 'transfer'];

/** Modes whose save hands off to "Add Employee" instead of a plain update. */
export function addEmployeeOnly(modeKey, form) {
  return modeKey === 'directCompassionate' || (modeKey === 'composite' && form.employeeExistComposite === '0');
}

/** Deputation from "other organisation" saves and then continues to Add Employee. */
export function savesThenAddsEmployee(modeKey, form) {
  return modeKey === 'deputation' && form.organisationOfEmp === ORG_OTHER;
}
