// Edit Employee: Employee Database opens Input Forms > Employee Data with the list row in
// location.state.item; the form loads the full record (with the current posting) by its master id.

export const HIGHEST_EDUCATION = ['Below SSLC', 'SSLC', 'HSC', 'Diploma', 'UG', 'PG', 'Ph. D'];

const dateOnly = (v) => (v ? String(v).slice(0, 10) : '');

/** A stored qualification as the matching option ("below SSLC" -> "Below SSLC"); other values unchanged. */
export function canonicalEducation(value) {
  const v = value == null ? '' : String(value).trim();
  return HIGHEST_EDUCATION.find((o) => o.toLowerCase() === v.toLowerCase()) || v;
}
const text = (v) => (v == null ? '' : String(v).trim());
const csv = (v) => text(v).split(',').map((d) => d.trim()).filter(Boolean);

/** { masterId, employeeId } of the employee to edit, or null when the row lacks them. */
export function readEmployeeEditIds(item) {
  if (!item) return null;
  const masterId = item.emp_master_id ?? item.employee_master_id ?? item.employeeMasterId;
  const employeeId = item.employee_id ?? item.employeeId;
  if (masterId == null || masterId === '' || employeeId == null || employeeId === '') return null;
  return { masterId: String(masterId), employeeId: String(employeeId) };
}

/** Form fields from the get-hr-employee-by-id record (employee master + current posting). */
export function employeeFormFromRecord(emp = {}) {
  const ugDisciplines = csv(emp.ug_discipline);
  const pgDisciplines = csv(emp.pg_discipline);
  return {
    employeeName: text(emp.emp_name),
    referenceNumber: text(emp.emp_reference_id),
    dateOfBirth: dateOnly(emp.emp_dob),
    employeeAadhar: text(emp.emp_aadhar_number),
    whethVhorOh: text(emp.emp_disability),
    religion: text(emp.emp_religion),
    ethnicOrigin: text(emp.emp_ethnic_origin),
    domicileState: text(emp.emp_domicile_state),
    gender: text(emp.emp_gender) || 'Male',
    exService: emp.ex_service_or_not == null ? '0' : String(emp.ex_service_or_not),
    retirementDate: dateOnly(emp.emp_dor),
    empDivisionName: text(emp.emp_division_name),

    empHighestEdu: canonicalEducation(emp.emp_highest_edu),
    // The degree counts follow the stored disciplines, so every degree keeps its dropdown
    ugCount: ugDisciplines.length ? String(ugDisciplines.length) : (emp.ug_count ? String(emp.ug_count) : ''),
    pgCount: pgDisciplines.length ? String(pgDisciplines.length) : (emp.pg_count ? String(emp.pg_count) : ''),
    ugDisciplines,
    pgDisciplines,

    department: text(emp.emp_department_id),
    departmentName: text(emp.emp_department_name),
    empPostId: text(emp.emp_post_id),
    empPostName: text(emp.emp_post_name),
    appoinmentMethod: text(emp.method_of_appointment),
    postCode: text(emp.emp_post_code),
    vacancyAriseDate: dateOnly(emp.date_of_arise_in_vacancy),
    // "Date of Joining in Current Organisation" is the master's date (the posting has its own join date)
    joiningDate: dateOnly(emp.emp_curr_org_join_date || emp.emp_post_join_date),
    parentOrganisation: text(emp.emp_parent_org_id),
    otherParentOrg: text(emp.emp_other_parent_org),
    parentOrgJoiningDate: dateOnly(emp.emp_parent_org_joined_date),
  };
}
