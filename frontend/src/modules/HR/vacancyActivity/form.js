// Form state, mapping from the saved vacancy log, validation and request payload.

import { ROOT_KEY, isStagedMode } from './config';

export const EMPTY_FORM = {
  vacancyType: 'Regular',
  reasonForExemption: '',
  dateOfAriseInVacancy: '',

  // Staged modes
  processInitiatedDate: '',
  recruitmentThrough: '', // '1' = IPA / other agencies, '0' = respective port authority
  notificationIssuedDate: '',
  numberOfEligibleApplication: '',
  examConductedDate: '',
  interviewConductedDate: '',
  selectionProcessDate: '',
  resultDeclaredDate: '',
  appointmentLetterIssuedDate: '',
  vigilanceClearanceDatePromotion: '',
  dpcConductedDatePromotion: '',
  approvalByAuthorityDatePromotion: '',
  orderDatePromotion: '',
  applicationReceivedDeputation: '',
  reviewOfApplicationDeputation: '',
  approvalReceivedDeputation: '',
  orderIssuedDeputation: '',

  employeeExistComposite: '', // '1' = existing employee, '0' = add a new one; no default, the user must choose

  employeeId: '',
  empMasterId: '',
  organisationOfEmp: '',
  joiningDate: '',

  // Redeployed from CHD
  approvalCompetentAuthorityDateCHD: '',
  orderIssuedDateCHD: '',
  fromWhichPostCHD: '',
  chdCategoryEmpMasterId: '',
};

// Every key the backend binds; sent as null unless the mode fills it.
const PAYLOAD_KEYS = [
  'recruitmentThrough',
  'processInitiatedDate',
  'notificationIssuedDate',
  'numberOfEligibleApplication',
  'reNotificationIssuedDate',
  'examConductedDate',
  'interviewConductedDate',
  'selectionProcessDate',
  'resultDeclaredDate',
  'appointmentLetterIssuedDate',
  'vigilanceClearanceDatePromotion',
  'dpcConductedDatePromotion',
  'approvalByAuthorityDatePromotion',
  'orderDatePromotion',
  'selectEmployeeId',
  'applicationReceivedDeputation',
  'reviewOfApplicationDeputation',
  'approvalReceivedDeputation',
  'orderIssuedDeputation',
  'organisationOfEmp',
  'deputedEmpId',
  'deputedEmpMasterId',
  'transferEmpId',
  'transferEmpMasterId',
  'dateOfJoiningTransferIn',
  'employeeJoinedDate',
  'approvalCompetentAuthorityDateCHD',
  'orderIssuedDateCHD',
  'dateOfJoiningCHD',
  'fromWhichPostCHD',
  'chdCategoryEmpMasterId',
  'dischargeReason',
  'isEmployeeJoined',
  'isEmployeeJoinedExist',
];

/** Some log columns come back as arrays (joined rows); take the first real value. */
export const unwrap = (v) =>
  Array.isArray(v) ? (v.find((x) => x !== null && x !== undefined && x !== '') ?? null) : v;

const nullable = (v) => (v === '' || v === undefined || v === null ? null : v);

const text = (v) => {
  const u = unwrap(v);
  return u === null || u === undefined ? '' : String(u);
};

export function toInputDate(value) {
  const v = unwrap(value);
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function recruitmentThroughFrom(raw) {
  const ipa = unwrap(raw.is_recruitment_through_ipa ?? raw.A_is_recruitment_through_ipa);
  if (ipa === 1 || ipa === '1' || ipa === true || ipa === 'Yes') return '1';
  if (ipa === 0 || ipa === '0' || ipa === false || ipa === 'No') return '0';
  return '';
}

const firstDate = (raw, ...keys) => toInputDate(keys.map((k) => unwrap(raw[k])).find(Boolean));

/** Builds the form from the saved log row (`get-vacancy-log-details-by-postcode`). */
export function buildFormFromLog(raw = {}) {
  const eligible = unwrap(raw.number_of_eligible_application ?? raw.A_number_of_eligible_application);
  const joinedExist = unwrap(raw.is_employee_joined_exist);

  return {
    ...EMPTY_FORM,
    vacancyType: text(raw.vacancy_type) || 'Regular',
    reasonForExemption: text(raw.reason_for_exemption),
    dateOfAriseInVacancy: toInputDate(raw.date_of_arise_in_vacancy),

    processInitiatedDate: firstDate(raw, 'process_initiated_date', 'A_process_initiated_date'),
    recruitmentThrough: recruitmentThroughFrom(raw),
    notificationIssuedDate: firstDate(raw, 'notification_adv_issued_date', 'A_notification_adv_issued_date'),
    numberOfEligibleApplication: eligible !== null && eligible !== undefined ? String(eligible) : '',
    examConductedDate: firstDate(raw, 'exam_conducted_date', 'A_exam_conducted_date'),
    interviewConductedDate: firstDate(raw, 'interview_conducted_date', 'A_interview_conducted_date'),
    selectionProcessDate: firstDate(raw, 'selection_process_completed_date', 'A_selection_process_completed_date'),
    resultDeclaredDate: firstDate(raw, 'result_declared_date', 'A_result_declared_date'),
    appointmentLetterIssuedDate: firstDate(raw, 'appointment_letter_issued_date', 'A_appointment_letter_issued_date'),

    vigilanceClearanceDatePromotion: firstDate(raw, 'vigilance_clr_received_date', 'A_vigilance_clr_received_date'),
    dpcConductedDatePromotion: firstDate(raw, 'dpc_conducted_date', 'A_dpc_conducted_date'),
    approvalByAuthorityDatePromotion: firstDate(raw, 'approval_by_ca_date', 'A_approval_by_ca_date'),
    orderDatePromotion: firstDate(raw, 'promotion_order_issued_date', 'A_promotion_order_issued_date'),

    applicationReceivedDeputation: firstDate(raw, 'application_received_date', 'A_application_received_date'),
    reviewOfApplicationDeputation: firstDate(raw, 'review_application_by_comm', 'A_review_application_by_comm'),
    approvalReceivedDeputation: firstDate(raw, 'approval_received_date', 'A_approval_received_date'),
    orderIssuedDeputation: firstDate(raw, 'order_issued_date', 'A_order_issued_date'),

    employeeId: text(raw.employee_id) || text(raw.select_employee_id) || text(raw.selectEmployeeId),
    empMasterId: text(raw.emp_master_id),
    organisationOfEmp: text(raw.organisationOfEmp) || text(raw.organisation_id),
    joiningDate: firstDate(raw, 'employee_joined_date', 'date_of_joining', 'joining_date'),

    approvalCompetentAuthorityDateCHD: firstDate(raw, 'approval_by_ca_date', 'approval_competent_authority_date_chd'),
    orderIssuedDateCHD: firstDate(raw, 'order_issued_date', 'order_issued_date_chd'),
    fromWhichPostCHD: text(raw.post_chd) || text(raw.from_which_post_chd),
    chdCategoryEmpMasterId: text(raw.chd_category_emp_master_id) || text(raw.emp_master_id),
    employeeExistComposite: joinedExist === 0 || joinedExist === '0' ? '0' : joinedExist === 1 || joinedExist === '1' ? '1' : '',
  };
}

/**
 * Seeds the form from the log, then applies what the opening screen knows
 * (expected method, vacancy date, exemption reason), which takes precedence.
 */
export function initialForm(raw, { vacancyType, dateOfVacancy, reasonForExemption } = {}) {
  const form = buildFormFromLog(raw || {});
  if (vacancyType) form.vacancyType = vacancyType;
  if (dateOfVacancy) form.dateOfAriseInVacancy = toInputDate(dateOfVacancy);
  if (reasonForExemption) form.reasonForExemption = reasonForExemption;
  return form;
}

export function validateActivity(form, modeKey) {
  const e = {};
  const need = (key, msg) => {
    if (!String(form[key] ?? '').trim()) e[key] = msg;
  };

  if (isStagedMode(modeKey)) {
    // Every staged method needs the process date; there is no "not initiated" reason.
    if (!form[ROOT_KEY]) {
      e[ROOT_KEY] = 'Enter the date the process was initiated.';
      return e;
    }

    if (modeKey === 'directRecruitment') {
      if (!form.recruitmentThrough) e.recruitmentThrough = 'Select who is conducting the recruitment.';
      const n = form.numberOfEligibleApplication;
      if (form.recruitmentThrough === '0' && n !== '' && !/^\d+$/.test(String(n))) {
        e.numberOfEligibleApplication = 'Enter a whole number, 0 or more.';
      }
    }

    if (modeKey === 'deputation' && form.orderIssuedDeputation) {
      need('organisationOfEmp', 'Select the employee organisation.');
      if (form.organisationOfEmp !== '73') need('employeeId', 'Select an employee.');
      need('joiningDate', 'Enter the employee joining date.');
    }

    if (modeKey === 'composite') {
      need('employeeExistComposite', 'Select whether the employee is already in the database.');
    }

    if (modeKey === 'composite' && form.employeeExistComposite === '1') {
      need('employeeId', 'Select an employee.');
      need('joiningDate', 'Enter the employee joining date.');
    }

    if (modeKey === 'promotion' && form.orderDatePromotion && form.employeeId) {
      need('joiningDate', 'Enter the date of employee joined.');
    }
    return e;
  }

  switch (modeKey) {
    case 'transfer':
      need('organisationOfEmp', 'Select the previous organisation.');
      need('employeeId', 'Select the transferred employee.');
      need('joiningDate', 'Enter the date of joining.');
      break;
    case 'redeployedCHD':
      need('approvalCompetentAuthorityDateCHD', 'Enter the approval date.');
      need('orderIssuedDateCHD', 'Enter the order issue date.');
      break;
    case 'redeployedIn':
    case 'promotionDR':
      need('joiningDate', 'Enter the date of joining.');
      need('employeeId', 'Select the employee.');
      break;
    default:
      break;
  }
  return e;
}

const DEPUTATION_STAGE_FIELDS = [
  'processInitiatedDate',
  'notificationIssuedDate',
  'applicationReceivedDeputation',
  'reviewOfApplicationDeputation',
  'approvalReceivedDeputation',
  'orderIssuedDeputation',
];

const copy = (payload, form, keys) => keys.forEach((k) => { payload[k] = nullable(form[k]); });

/** Request body for update-hr-post-activity / update-post-strength-log. */
export function buildPayload(form, mode, { organisationID, userID, postId, postCode }) {
  const f = form;
  const payload = Object.fromEntries(PAYLOAD_KEYS.map((k) => [k, null]));

  Object.assign(payload, {
    organisationID,
    postId: postId || null,
    postCode,
    userID,
    methodOfAppointment: mode.key,
    method_of_appointment: mode.label,
    vacancyType: f.vacancyType,
    exceptionAbolish: f.reasonForExemption ? '1' : '0',
    reasonForExemption: nullable(f.reasonForExemption),
    dateOfAriseInVacancy: nullable(f.dateOfAriseInVacancy),
  });

  switch (mode.key) {
    case 'directRecruitment':
      copy(payload, f, ['processInitiatedDate', 'recruitmentThrough', 'appointmentLetterIssuedDate']);
      if (f.recruitmentThrough === '0') {
        copy(payload, f, [
          'notificationIssuedDate',
          'numberOfEligibleApplication',
          'examConductedDate',
          'interviewConductedDate',
          'selectionProcessDate',
          'resultDeclaredDate',
        ]);
      }
      break;

    case 'promotion':
      payload.methodOfAppointment = 'promotion';
      copy(payload, f, [
        'processInitiatedDate',
        'vigilanceClearanceDatePromotion',
        'dpcConductedDatePromotion',
        'approvalByAuthorityDatePromotion',
        'orderDatePromotion',
      ]);
      if (f.employeeId) {
        payload.selectEmployeeId = nullable(f.employeeId);
        payload.employeeJoinedDate = nullable(f.joiningDate);
      }
      break;

    case 'deputation':
      payload.methodOfAppointment = 'deputationIn';
      copy(payload, f, [...DEPUTATION_STAGE_FIELDS, 'organisationOfEmp']);
      if (f.employeeId) {
        payload.selectEmployeeId = nullable(f.employeeId);
        payload.deputedEmpId = nullable(f.employeeId);
        payload.deputedEmpMasterId = nullable(f.empMasterId);
      }
      if (f.joiningDate) payload.employeeJoinedDate = nullable(f.joiningDate);
      break;

    case 'composite':
      payload.methodOfAppointment = 'composite';
      copy(payload, f, DEPUTATION_STAGE_FIELDS);
      payload.isEmployeeJoinedExist = nullable(f.employeeExistComposite);
      if (f.employeeExistComposite === '1' && f.employeeId) {
        payload.selectEmployeeId = nullable(f.employeeId);
        payload.deputedEmpId = nullable(f.employeeId);
        payload.deputedEmpMasterId = nullable(f.empMasterId);
        payload.employeeJoinedDate = nullable(f.joiningDate);
      }
      break;

    case 'transfer':
      payload.methodOfAppointment = 'transferIn';
      payload.organisationOfEmp = nullable(f.organisationOfEmp);
      payload.transferEmpId = nullable(f.employeeId);
      payload.transferEmpMasterId = nullable(f.empMasterId);
      payload.dateOfJoiningTransferIn = nullable(f.joiningDate);
      payload.employeeJoinedDate = nullable(f.joiningDate);
      break;

    case 'redeployedCHD':
      payload.methodOfAppointment = 'prevredeployedFromCHD';
      copy(payload, f, ['approvalCompetentAuthorityDateCHD', 'orderIssuedDateCHD', 'fromWhichPostCHD']);
      payload.dateOfJoiningCHD = nullable(f.joiningDate);
      payload.employeeJoinedDate = nullable(f.joiningDate);
      payload.selectEmployeeId = nullable(f.employeeId);
      payload.chdCategoryEmpMasterId = nullable(f.empMasterId || f.chdCategoryEmpMasterId);
      break;

    case 'redeployedIn':
    case 'promotionDR':
      payload.methodOfAppointment =
        mode.key === 'redeployedIn'
          ? 'prevredeployedFromredeployedIn'
          : 'prevredeployedFromprevredeployedPromotionbyDR';
      payload.dateOfJoiningCHD = nullable(f.joiningDate);
      payload.employeeJoinedDate = nullable(f.joiningDate);
      payload.selectEmployeeId = nullable(f.employeeId);
      payload.chdCategoryEmpMasterId = nullable(f.empMasterId || f.chdCategoryEmpMasterId);
      break;

    case 'directCompassionate':
      payload.methodOfAppointment = 'directRecruitmentCompassionate';
      break;

    default:
      break;
  }
  return payload;
}
