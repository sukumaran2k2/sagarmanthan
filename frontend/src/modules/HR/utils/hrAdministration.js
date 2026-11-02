// Business rules for HR Administration & Actions (employee activities).
// Kept free of React so they can be unit tested.

export const ACTIVITY = {
  TRANSFER_OUT: 'Transfer Out',
  DEPUTATION_OUT: 'Deputation Out',
  SEPARATION: 'Separation',
  PROMOTION: 'Promotion',
  ABSORPTION: 'Absorption',
  END_OF_DEPUTATION: 'End of Deputation',
};

export const DEPUTATION_BACK_ACTIVITY = {
  PROMOTION: 'Promotion',
  DEPUTATION_BACK: 'Deputation Back',
};

export const CLASS_OPTIONS = ['I/A', 'II/B', 'III/C', 'IV/D'];

// mmt_class ids of the class names (posts carry class_id)
export const CLASS_ID = { 'I/A': 1, 'II/B': 2, 'III/C': 3, 'IV/D': 4 };

export const SEPARATION_REASONS = [
  'Retirement',
  'Resignation',
  'Voluntary Retirement Scheme',
  'Special Voluntary Retirement Scheme',
  'Compulsory Retirement',
  'Dismissal',
  'Deceased',
  'Promotion / Promotion-out by Direct Recruitment',
  'Transfer',
  'Removal From Service',
  'Technical Resignation',
  'Absorption Basis',
  'Redeployment-out',
  'Others',
];

const RETIREMENT_REASONS = new Set([
  'Retirement',
  'Voluntary Retirement Scheme',
  'Special Voluntary Retirement Scheme',
  'Compulsory Retirement',
]);

export const SVRS_REASON = 'Special Voluntary Retirement Scheme';

export function isDeputationIn(methodOfAppointment) {
  return String(methodOfAppointment || '').trim().toLowerCase() === 'deputation in';
}

// Employees who came in on deputation can only be absorbed, sent back or deputed out.
export function activityOptionsFor(methodOfAppointment) {
  if (isDeputationIn(methodOfAppointment)) {
    return [
      { value: ACTIVITY.ABSORPTION, label: 'Absorption' },
      { value: ACTIVITY.END_OF_DEPUTATION, label: 'End of Deputation' },
      { value: ACTIVITY.DEPUTATION_OUT, label: 'Deputation Out' },
    ];
  }
  return [
    { value: ACTIVITY.TRANSFER_OUT, label: 'Transfer Out' },
    { value: ACTIVITY.DEPUTATION_OUT, label: 'Deputation Out / Deputation on Absorption Basis' },
    { value: ACTIVITY.SEPARATION, label: 'Separation' },
    { value: ACTIVITY.PROMOTION, label: 'Promotion' },
  ];
}

export function isRetirementReason(reason) {
  return RETIREMENT_REASONS.has(reason);
}

// The deputation start date is mandatory except for employees already on deputation-in.
export function isDeputationStartRequired(methodOfAppointment) {
  return !isDeputationIn(methodOfAppointment);
}

export function toDateInput(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function formatDisplayDate(value) {
  const iso = toDateInput(value);
  if (!iso) return '--';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export function shiftDate(isoDate, days) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function emptyActivityForm() {
  return {
    activityName: '',
    separationReason: '',
    retirementDate: '',
    separationDate: '',
    deleteSVRS: '',
    absorptionDate: '',
    orgToBeDeputed: '',
    deputationStartDate: '',
    deputationEndDate: '',
    dateOfDeputingOut: '',
    orgToBeTransferred: '',
    dateOfTransferOut: '',
    promotionDepartment: '',
    promotionPostId: '',
    promotionPostCode: '',
    dateOfPromotion: '',
    deputationCompleteDate: '',
  };
}

/**
 * Returns { field: message } for every invalid field (empty object when valid).
 * `postCodeReady` is the vacancy-status flag of the chosen promotion post code.
 */
export function validateActivityForm(form, { methodOfAppointment, postCodeReady } = {}) {
  const errors = {};
  const req = (key, message) => {
    if (!String(form[key] || '').trim()) errors[key] = message;
  };

  if (!form.activityName) {
    errors.activityName = 'Please select the activity.';
    return errors;
  }

  switch (form.activityName) {
    case ACTIVITY.SEPARATION: {
      req('separationReason', 'Please select the reason for separation.');
      if (!form.separationReason) break;
      if (isRetirementReason(form.separationReason)) {
        req('retirementDate', 'Please enter the retirement date.');
        if (form.separationReason === SVRS_REASON && form.deleteSVRS === '') {
          errors.deleteSVRS = 'Please choose whether to delete the post.';
        }
      } else {
        req('separationDate', `Please enter the date of ${form.separationReason.toLowerCase()}.`);
      }
      break;
    }
    case ACTIVITY.ABSORPTION:
      req('absorptionDate', 'Please enter the absorption date.');
      break;
    case ACTIVITY.DEPUTATION_OUT: {
      req('orgToBeDeputed', 'Please select the organisation to be deputed.');
      req('dateOfDeputingOut', 'Please enter the date of deputing out.');
      const start = form.deputationStartDate;
      if (isDeputationStartRequired(methodOfAppointment)) {
        req('deputationStartDate', 'Please enter the deputation start date.');
      }
      if (start && form.deputationEndDate && form.deputationEndDate <= start) {
        errors.deputationEndDate = 'Deputation end date must be after the start date.';
      }
      if (start && form.dateOfDeputingOut && form.dateOfDeputingOut >= start) {
        errors.dateOfDeputingOut = 'Date of deputing out must be before the start date.';
      }
      break;
    }
    case ACTIVITY.TRANSFER_OUT:
      req('orgToBeTransferred', 'Please select the organisation to be transferred to.');
      req('dateOfTransferOut', 'Please enter the transfer out date.');
      break;
    case ACTIVITY.PROMOTION:
      req('promotionDepartment', 'Please select the department.');
      req('promotionPostId', 'Please select the post.');
      req('promotionPostCode', 'Please select the post code.');
      req('dateOfPromotion', 'Please enter the employee joining date.');
      if (form.promotionPostCode && !postCodeReady) {
        errors.promotionPostCode =
          'Enter all the activities for this post code in Vacancy Management before promoting.';
      }
      break;
    case ACTIVITY.END_OF_DEPUTATION:
      req('deputationCompleteDate', 'Please enter the deputation end date.');
      break;
    default:
      break;
  }
  return errors;
}

/**
 * Payload for PUT /update-hr-employee-activity. Every field the backend binds is
 * present (null by default) and only the selected activity's fields are filled.
 * In particular the prefilled retirement date must not leak into non-retirement
 * separations, because the backend falls back to it as the post end date.
 */
export function buildActivityPayload(form, { employeeId, empMasterId, organisationID, userID }) {
  const v = (x) => (x === '' || x === undefined ? null : x);
  const payload = {
    employeeId,
    empMasterId,
    activityName: form.activityName,
    separationReason: null,
    retirementDate: null,
    separationDate: null,
    deleteSVRS: null,
    absorptionDate: null,
    orgToBeDeputed: null,
    deputationStartDate: null,
    deputationEndDate: null,
    dateOfDeputingOut: null,
    orgToBeTransferred: null,
    dateOfTransferOut: null,
    promotionPostCode: null,
    dateOfPromotion: null,
    deputationCompleteDate: null,
    organisationID,
    userID,
  };

  switch (form.activityName) {
    case ACTIVITY.SEPARATION:
      payload.separationReason = form.separationReason;
      if (isRetirementReason(form.separationReason)) {
        payload.retirementDate = v(form.retirementDate);
        if (form.separationReason === SVRS_REASON) payload.deleteSVRS = Number(form.deleteSVRS);
      } else {
        payload.separationDate = v(form.separationDate);
      }
      break;
    case ACTIVITY.ABSORPTION:
      payload.absorptionDate = v(form.absorptionDate);
      break;
    case ACTIVITY.DEPUTATION_OUT:
      payload.orgToBeDeputed = v(form.orgToBeDeputed);
      payload.deputationStartDate = v(form.deputationStartDate);
      payload.deputationEndDate = v(form.deputationEndDate);
      payload.dateOfDeputingOut = v(form.dateOfDeputingOut);
      break;
    case ACTIVITY.TRANSFER_OUT:
      payload.orgToBeTransferred = v(form.orgToBeTransferred);
      payload.dateOfTransferOut = v(form.dateOfTransferOut);
      break;
    case ACTIVITY.PROMOTION:
      payload.promotionPostCode = v(form.promotionPostCode);
      payload.dateOfPromotion = v(form.dateOfPromotion);
      break;
    case ACTIVITY.END_OF_DEPUTATION:
      payload.deputationCompleteDate = v(form.deputationCompleteDate);
      break;
    default:
      break;
  }
  return payload;
}

/** Confirmation text needed before a separation is saved, or null when none is needed. */
export function separationConfirmMessage(form, originalRetirementDate) {
  if (form.activityName !== ACTIVITY.SEPARATION || !isRetirementReason(form.separationReason)) {
    return null;
  }
  const deletesPost = form.separationReason === SVRS_REASON && String(form.deleteSVRS) === '1';
  const original = toDateInput(originalRetirementDate);
  if (original && original !== form.retirementDate) {
    return deletesPost
      ? 'Are you sure about the modified retirement date? The post will also be deleted and cannot be restored.'
      : 'Are you sure about the modified retirement date?';
  }
  if (deletesPost) {
    return 'Are you sure you want to delete the post? Once it is deleted, it cannot be restored.';
  }
  return null;
}

export function validateDeputationBackForm(form) {
  const errors = {};
  if (!form.activityName) errors.activityName = 'Please select the activity.';
  if (!form.departmentId) errors.departmentId = 'Please select the department.';
  if (!form.postId) errors.postId = 'Please select the post.';
  if (!form.postCode) errors.postCode = 'Please select the post code.';
  if (!form.joiningDate) errors.joiningDate = 'Please enter the employee joining date.';
  return errors;
}

/** Payload for PUT /update-activity-data (field names follow the backend contract). */
export function buildDeputationBackPayload(form, employee, { departmentName, postName, organisationID, userID }) {
  return {
    currentEmployeeId: employee.employee_id,
    currentEmpMasterId: employee.emp_master_id,
    currentReferenceId: employee.emp_reference_id,
    promotionActivityName: form.activityName,
    departmentValue: form.departmentId,
    departmentName,
    promotionPostCode: form.postCode,
    postName,
    promotionPostID: form.postId,
    promotionOrderDate: form.joiningDate,
    userID,
    organisationID,
  };
}

/** Client-side filters for the employee table; mirrors Vacancy Management. */
export function filterEmployees(rows, { departmentId, postId, className, search, exactMatch } = {}) {
  const q = String(search || '').trim().toLowerCase();
  const searchable = (r) => [
    r.post_name, r.emp_post_code, r.reference_id, r.emp_name, r.department_name, r.class, r.employee_id,
  ].map((x) => String(x ?? '').trim().toLowerCase());

  return rows.filter((r) => {
    if (departmentId && String(r.department_id) !== String(departmentId)) return false;
    if (postId && String(r.post_id) !== String(postId)) return false;
    if (className && String(r.class || '') !== className) return false;
    if (q) {
      const cells = searchable(r);
      return exactMatch ? cells.some((c) => c === q) : cells.some((c) => c.includes(q));
    }
    return true;
  });
}
