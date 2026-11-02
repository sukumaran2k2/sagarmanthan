// Form state, mapping from the saved vacancy log, validation and request payload.

import { ORG_OTHER, ROOT_KEY, isStagedMode } from './config';

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

function recruitmentThroughFrom(value) {
  const ipa = unwrap(value);
  if (ipa === 1 || ipa === '1' || ipa === true || ipa === 'Yes') return '1';
  if (ipa === 0 || ipa === '0' || ipa === false || ipa === 'No') return '0';
  return '';
}

const firstDate = (raw, ...keys) => toInputDate(keys.map((k) => unwrap(raw[k])).find(Boolean));

/**
 * Builds the form from the saved log row (`get-vacancy-log-details-by-postcode`).
 * The row carries two sets of stage columns for the same post code: the actual vacancy's
 * (tbl_hr_post_strength, e.g. `process_initiated_date`) and the anticipated vacancy's
 * (`A_process_initiated_date`). Each screen reads only its own set, as the legacy pages did:
 * Anticipated Vacancies (target 'anticipated') the A_ columns, Vacant Details ('vacant') the
 * plain ones. Mixing them showed (and then saved) one vacancy's dates as the other's.
 */
export function buildFormFromLog(raw = {}, { target = 'vacant' } = {}) {
  const stage = (column) => (target === 'anticipated' ? raw[`A_${column}`] : raw[column]);
  const stageDate = (column) => toInputDate(stage(column));
  const eligible = unwrap(stage('number_of_eligible_application'));
  const joinedExist = unwrap(raw.is_employee_joined_exist);

  return {
    ...EMPTY_FORM,
    vacancyType: text(raw.vacancy_type) || 'Regular',
    reasonForExemption: text(raw.reason_for_exemption),
    dateOfAriseInVacancy: toInputDate(raw.date_of_arise_in_vacancy),

    processInitiatedDate: stageDate('process_initiated_date'),
    recruitmentThrough: recruitmentThroughFrom(stage('is_recruitment_through_ipa')),
    notificationIssuedDate: stageDate('notification_adv_issued_date'),
    numberOfEligibleApplication: eligible !== null && eligible !== undefined ? String(eligible) : '',
    examConductedDate: stageDate('exam_conducted_date'),
    interviewConductedDate: stageDate('interview_conducted_date'),
    selectionProcessDate: stageDate('selection_process_completed_date'),
    resultDeclaredDate: stageDate('result_declared_date'),
    appointmentLetterIssuedDate: stageDate('appointment_letter_issued_date'),

    vigilanceClearanceDatePromotion: stageDate('vigilance_clr_received_date'),
    dpcConductedDatePromotion: stageDate('dpc_conducted_date'),
    approvalByAuthorityDatePromotion: stageDate('approval_by_ca_date'),
    orderDatePromotion: stageDate('promotion_order_issued_date'),

    applicationReceivedDeputation: stageDate('application_received_date'),
    reviewOfApplicationDeputation: stageDate('review_application_by_comm'),
    approvalReceivedDeputation: stageDate('approval_received_date'),
    orderIssuedDeputation: stageDate('order_issued_date'),

    employeeId: text(raw.employee_id) || text(raw.select_employee_id) || text(raw.selectEmployeeId),
    empMasterId: text(raw.emp_master_id),
    // The log has no column for the employee's source organisation (its organisation_id is the
    // post's own), so the user picks it, as on the legacy page.
    organisationOfEmp: '',
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
export function initialForm(raw, { target, vacancyType, dateOfVacancy, reasonForExemption } = {}) {
  const form = buildFormFromLog(raw || {}, { target });
  if (vacancyType) form.vacancyType = vacancyType;
  if (dateOfVacancy) form.dateOfAriseInVacancy = toInputDate(dateOfVacancy);
  if (reasonForExemption) form.reasonForExemption = reasonForExemption;
  return form;
}

// What to enter when a fill-rule field is missing
const FILL_MESSAGES = {
  vigilanceClearanceDatePromotion: 'Enter the date of vigilance clearance received.',
  dpcConductedDatePromotion: 'Enter the date of DPC conducted.',
  approvalByAuthorityDatePromotion: 'Enter the date of approval by the competent authority.',
  orderDatePromotion: 'Enter the date of the promotion order.',
  notificationIssuedDate: 'Enter the date of notification / advertisement issued.',
  applicationReceivedDeputation: 'Enter the date the application was received.',
  reviewOfApplicationDeputation: 'Enter the date of review of application by the committee.',
  approvalReceivedDeputation: 'Enter the date the approval was received.',
  orderIssuedDeputation: 'Enter the date the order was issued.',
  organisationOfEmp: 'Select the employee organisation.',
  employeeId: 'Select the employee.',
  joiningDate: 'Enter the employee joining date.',
  fromWhichPostCHD: 'Enter the CHD post the employee is redeployed from.',
  // Not a field of this window: it comes from the vacancy row (shown in the header)
  dateOfAriseInVacancy:
    'The date of arise in vacancy is missing. Close this window, enter it in the vacancy table and save, then try again.',
};

/**
 * Fill rules of PUT /update-post-strength-log (revisedHrPost.updatePostStrengthLog), per method.
 * The backend marks the post 'filled' only when every field of the method's rule is present, but
 * moves the employee onto the post (employee transaction) whenever an employee is sent. So once a
 * save would move an employee (`applies`), every field of the rule is required here: an employee is
 * never moved onto a post that stays vacant. Saves without an employee keep recording progress.
 * `masterId(form)`: the employee's emp_master_id as buildPayload sends it, when the backend needs it.
 * Only Vacant Details moves employees; Anticipated Vacancies (update-hr-post-activity) ignores them.
 * Every rule also needs the date of arise in vacancy, which comes from the vacancy row.
 */
export const FILL_RULES = {
  promotion: {
    applies: (f) => Boolean(f.employeeId),
    fields: () => [
      'vigilanceClearanceDatePromotion',
      'dpcConductedDatePromotion',
      'approvalByAuthorityDatePromotion',
      'orderDatePromotion',
      'joiningDate',
    ],
  },
  // An issued order completes the deputation process, so it brings in the appointment too
  deputation: {
    applies: (f) => Boolean(f.orderIssuedDeputation || f.employeeId),
    fields: (f) => [
      'notificationIssuedDate',
      'applicationReceivedDeputation',
      'reviewOfApplicationDeputation',
      'approvalReceivedDeputation',
      'orderIssuedDeputation',
      'organisationOfEmp',
      // An employee of "other organisation" is added afterwards through Add Employee
      ...(f.organisationOfEmp === ORG_OTHER ? [] : ['employeeId']),
      'joiningDate',
    ],
    masterId: (f) => f.empMasterId,
  },
  composite: {
    applies: (f) => f.employeeExistComposite === '1',
    fields: () => [
      'notificationIssuedDate',
      'applicationReceivedDeputation',
      'reviewOfApplicationDeputation',
      'employeeId',
      'joiningDate',
    ],
  },
  redeployedCHD: {
    applies: (f) => Boolean(f.employeeId || f.joiningDate),
    fields: () => ['employeeId', 'joiningDate', 'fromWhichPostCHD'],
    masterId: (f) => f.empMasterId || f.chdCategoryEmpMasterId,
  },
  transfer: { applies: (f) => Boolean(f.employeeId), fields: () => ['employeeId', 'joiningDate'], masterId: (f) => f.empMasterId },
  // Their emp_master_id is stored with the employee (sent as chdCategoryEmpMasterId)
  redeployedIn: {
    applies: (f) => Boolean(f.employeeId),
    fields: () => ['employeeId', 'joiningDate'],
    masterId: (f) => f.empMasterId || f.chdCategoryEmpMasterId,
  },
  promotionDR: {
    applies: (f) => Boolean(f.employeeId),
    fields: () => ['employeeId', 'joiningDate'],
    masterId: (f) => f.empMasterId || f.chdCategoryEmpMasterId,
  },
};

function applyFillRule(form, modeKey, target, e) {
  const rule = FILL_RULES[modeKey];
  if (!rule || target !== 'vacant' || !rule.applies(form)) return;
  [...rule.fields(form), 'dateOfAriseInVacancy'].forEach((key) => {
    if (!e[key] && !String(form[key] ?? '').trim()) e[key] = FILL_MESSAGES[key];
  });
  if (rule.masterId && form.employeeId && !rule.masterId(form) && !e.employeeId) {
    e.employeeId = 'Select the employee again from the list.';
  }
}

/** Field errors for the activity form; empty when it can be saved. `target`: 'vacant' | 'anticipated'. */
export function validateActivity(form, modeKey, { target = 'vacant' } = {}) {
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

    if (modeKey === 'composite') {
      need('employeeExistComposite', 'Select whether the employee is already in the database.');
    }

    applyFillRule(form, modeKey, target, e);
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
  applyFillRule(form, modeKey, target, e);
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
