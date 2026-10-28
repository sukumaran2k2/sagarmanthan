/**
 * Hand-off from a vacant post's activity (Vacant Details) to the Employee Data form, as the
 * legacy hrVacantDetails -> addHrEmpData redirect did.
 *
 * The URL carries identifiers only: the post code and the page to return to. Everything about
 * the vacancy (department, post, method of appointment, date of arise, vacant/filled) is read
 * by the form from the backend (GET /get-post-names-by-post-code), so the link can never
 * contradict the database. The return path is validated so a hand-edited link can't send the
 * user off-site after saving.
 */

export const EMPLOYEE_DATA_PATH = '/hr/hr-management/input-form/employee-data';

// Every method of appointment the Employee Data form knows (used to read a vacancy's stored method)
export const APPOINTMENT_METHODS = [
  'Direct Recruitment',
  'Direct Recruitment (Compassionate Method)',
  'Promotion',
  'Composite Method',
  'Deputation In',
  'Absorption',
  'Transfer In',
];

// Methods offered when the form is opened normally: the ones GET /get-post-code-by-postId can list
// vacant post codes for (hrEmployee.getPostCodeByPostId; any other method fails there), as the
// legacy Add Employee page offered. A vacancy hand-off may carry any method above, shown read-only.
export const SELECTABLE_APPOINTMENT_METHODS = [
  'Direct Recruitment',
  'Direct Recruitment (Compassionate Method)',
  'Composite Method',
  'Transfer In',
];

// "Other organisation" in mmt_organisation: the employee's parent organisation is named in free text
export const OTHER_ORGANISATION_ID = '73';

const RETURN_PREFIX = '/hr/hr-management/';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Only paths inside the HR module ('/hr/hr-management/...'), never another origin or '//host'
const safeReturnPath = (value) =>
  typeof value === 'string' && value.startsWith(RETURN_PREFIX) && !value.includes('//') && !value.includes('\\')
    ? value
    : null;

/** Vacant Details route of a post, the page the form returns to after saving. */
export const vacancyDetailsPath = (postId, isLive = 1) =>
  `${RETURN_PREFIX}vacancy-details/${encodeURIComponent(postId)}/${Number(isLive) === 0 ? 0 : 1}`;

/** Employee Data URL for adding the employee to `postCode`. */
export function buildAddEmployeeUrl({ postCode, returnTo }) {
  const params = new URLSearchParams({ postCode: String(postCode ?? '').trim() });
  const back = safeReturnPath(returnTo);
  if (back) params.set('returnTo', back);
  return `${EMPLOYEE_DATA_PATH}?${params.toString()}`;
}

/** The hand-off in `searchParams` (URLSearchParams), or null when the form was opened normally. */
export function readAddEmployeeHandoff(searchParams) {
  const postCode = (searchParams?.get('postCode') || '').trim();
  if (!postCode) return null;
  return { postCode, returnTo: safeReturnPath(searchParams.get('returnTo')) };
}

// Stored methods vary in case and punctuation ('promotion', 'Deputation-in'); compare without them
const methodKey = (value) => String(value ?? '').toLowerCase().replace(/[^a-z]/g, '');

/** The form's spelling of a stored method of appointment, or null when the form doesn't offer it. */
export function canonicalAppointmentMethod(value) {
  const key = methodKey(value);
  return key ? APPOINTMENT_METHODS.find((m) => methodKey(m) === key) || null : null;
}

/**
 * The vacancy behind a post code, from a /get-post-names-by-post-code row, or null when the
 * post code is unknown. `status` says whether an employee can be added against it:
 * 'vacant' | 'filled' | 'otherOrganisation' (the post belongs to another organisation) |
 * 'unverified' (the row has no vacant/filled status, e.g. a backend without these fields:
 * never guessed as vacant or filled).
 */
export function vacancyFromPostRow(row, sessionOrgId) {
  if (!row?.post_id) return null;
  const date = String(row.date_of_arise_in_vacancy ?? '').slice(0, 10);
  const postOrg = Number(row.organisation_id);
  const flag = String(row.vacant_or_filled ?? '').trim().toLowerCase();
  let status = flag === 'vacant' ? 'vacant' : flag === 'filled' ? 'filled' : 'unverified';
  if (sessionOrgId && Number.isFinite(postOrg) && postOrg > 0 && postOrg !== Number(sessionOrgId)) {
    status = 'otherOrganisation';
  }
  return {
    department: String(row.department_id ?? ''),
    departmentName: row.department_name || '',
    postId: String(row.post_id),
    postName: row.post_name || '',
    method: canonicalAppointmentMethod(row.method_of_appointment),
    vacancyDate: ISO_DATE.test(date) ? date : '',
    status,
  };
}
