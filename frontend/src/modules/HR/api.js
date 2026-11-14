// Shared client: attaches the access token and refreshes it once on 401, coordinated
// with every other module (a module-local copy would race the global refresh).
import { axiosInstance as api } from '../../api';
import { clearHrCache } from './store/hrRequestCache';

// Every HR save or delete clears the HR list cache, so lists show the change at once.
const afterWrite = (promise) => promise.then((res) => {
  clearHrCache();
  return res;
});

// ==========================================
// 1. Vacancy Management & Post Masters
// ==========================================

export function fetchHrDepartments(orgId) {
  return api.get(`/get-hr-department-list/${orgId}`);
}

export function fetchHrPostsByDepartment(deptId, orgId) {
  const deptParam = deptId === '' || deptId === '0' || !deptId ? '001' : deptId;
  return api.get(`/get-hr-postList-by-department-organisation/${deptParam}/${orgId}`);
}

// Duplicate checks used by Add Employee (as the legacy page did before saving)
export function checkAadhaarExists(aadhaar) {
  return api.get(`/check-aadhar-number-existence/${encodeURIComponent(aadhaar)}`);
}

export function checkReferenceNumberExists(referenceNumber, orgId) {
  return api.get(`/check-reference-number-existence/${encodeURIComponent(referenceNumber)}/${orgId}`);
}

// Department and post of a post code (tbl_hr_post_strength), used to prefill Add Employee
export function fetchPostByPostCode(postCode) {
  return api.get(`/get-post-names-by-post-code/${encodeURIComponent(postCode)}`);
}

export function fetchHrPostDetails(orgId) {
  return api.get(`/get-hr-post-details/${orgId}`);
}

export function fetchHrVacancyDetails(postId, isLive = 1) {
  return api.get(`/get-hr-vacancy-details/${postId}/${isLive}`);
}

export function submitHrAnticipatedVacancies(payload) {
  return afterWrite(api.post('/submit-anticipated-vacancies', payload));
}

export function fetchHrAllData(orgId) {
  return api.get(`/get-hr-all-data/${orgId}`);
}

export function fetchPromotionVacantPostCode(postId) {
  return api.get(`/get-hr-promotion-postcode/${postId}`);
}

export function fetchVacancyLogDetailsByPostCode(postCode) {
  return api.get(`/get-vacancy-log-details-by-postcode/${postCode}`);
}

export function updateHrPostActivity(payload) {
  return afterWrite(api.put('/update-hr-post-activity', payload));
}

export function updatePostStrengthLog(payload) {
  return afterWrite(api.put('/update-post-strength-log', payload));
}

export function fetchMmtDropdown(table) {
  return api.get(`/mmt-dropdown/${table}`);
}

export function fetchDeputedEmployeesByOrgId(organisationId, currentOrganisationId) {
  return api.get(`/get-deputed-employees-by-orgId/${organisationId}/${currentOrganisationId}`);
}

export function fetchEmpDetailsForVacancyManagement(employeeId) {
  return api.get(`/get-emp-details-for-vacancy-management/${employeeId}`);
}

export function fetchCompositeEmployeeList(orgId) {
  return api.get(`/get-composite-employee-list-by-orgID/${orgId}`);
}

export function fetchTransferInEmployeesByOrg(orgId) {
  return api.get(`/get-transfer-in-employees-by-organisation/${orgId}`);
}

export function fetchChdEmployeesByOrg(orgId) {
  return api.get(`/get-chd-in-employees-by-organisation/${orgId}`);
}

export function updateAllVacancies(payload) {
  return afterWrite(api.put('/update-all-vacancies', payload));
}

// ==========================================
// 2. Abolished Posts & Post Strength
// ==========================================

// Post strength history of a post code (abolished post details)
export function fetchPostStrengthData(postCode) {
  return api.get(`/get-strength-data/${postCode}`);
}

export function submitPostRevival(payload) {
  return afterWrite(api.post('/post-revive-detail', payload));
}

export function updateRevivePostApproval(payload) {
  return afterWrite(api.post('/update-revive-post-approval', payload));
}

// ==========================================
// 3. Training Details
// ==========================================

export function fetchAllTrainingData(userId) {
  return api.get(`/get-all-training-data/${userId}`);
}

// Used by the Training form (pages/TrainingDetails/InputForm.jsx)
export function createTrainingData(data) {
  return afterWrite(api.post('/hr/create-hr-training-data', data));
}

export function updateTrainingData(trainingID, data) {
  return afterWrite(api.put(`/hr/update-hr-training-data/${trainingID}`, data));
}

export function getHRTrainingDataByID(trainingID) {
  return api.get(`/hr/get-hr-training-data-by-id/${trainingID}`);
}

export function getHRStaffTransactData(organisationID, trainingID = 0) {
  return api.get(`/hr/get-hr-staff-transact-data/${organisationID}/${trainingID}`);
}

export function getTrainingTitleData(organisationID, trainingType) {
  return api.get(`/hr/get-hr-training-title-by-org/${organisationID}/${trainingType}`);
}

export function getTrainingTypeData() {
  return api.get('/hr/get-hr-training-type');
}

export function getDropDownData(table) {
  return api.get(`/mmt-dropdown/${encodeURIComponent(table)}`);
}

// ==========================================
// 4. Contractual Employment
// ==========================================

// Used by the Contractual form (pages/ContractualEmployment/InputForm.jsx)
export function createContractualData(data) {
  return afterWrite(api.post('/hr/contractual-employment', data));
}

export function deleteContractualData(contractId, orgId) {
  return afterWrite(api.delete(`/delete-contractual-data/${contractId}/${orgId}`));
}

export function fetchAllContractualData(userId) {
  return api.get(`/get-all-contractual-data/${userId}`);
}

// Employee Database > edit an employee
export function fetchHrEmployeeById(employeeMasterId) {
  return api.get(`/get-hr-employee-by-id/${encodeURIComponent(employeeMasterId)}`);
}

// Service history, latest first. The backend takes the organisation and role from the login for
// organisation users; ministry users pass their role (0 = every organisation).
export function fetchEmployeeServiceHistory(employeeMasterId, orgId = 0, roleId = 0) {
  return api.get(`/get-employee-transaction-history-by-org/${encodeURIComponent(employeeMasterId)}/${orgId}/${roleId}`);
}

export function updateHrEmployee(employeeMasterId, employeeId, payload) {
  return afterWrite(api.put(
    `/edit-employee-details/${encodeURIComponent(employeeMasterId)}/${encodeURIComponent(employeeId)}`,
    payload
  ));
}

// ==========================================
// 5. HR Administration & Actions
// ==========================================

export function updateEmployeeActivity(payload) {
  return afterWrite(api.put('/update-hr-employee-activity', payload));
}

export function fetchDeputationEndedEmployees(orgId) {
  return api.get(`/get-deputed-end-employee-data-org/${orgId}`);
}

export function fetchDeputationEndEmployeeDetails(employeeId, empMasterId, empReferenceId) {
  return api.get(
    `/get-deputation-end-employees/${employeeId}/${empMasterId}/${encodeURIComponent(empReferenceId)}`
  );
}

export function updateDeputationBackActivity(payload) {
  return afterWrite(api.put('/update-activity-data', payload));
}

export function fetchActivityDateData(fromDate, toDate, orgId) {
  return api.get(`/get-activity-date-data/${fromDate}/${toDate}/${orgId}`);
}

// ==========================================
// Organisation structure and employee database (whole lists, paged in the browser)
// ==========================================

// orgId: the organisation, or 'all' (ministry users)
export function fetchOrganisationStructurePosts(orgId) {
  return api.get(`/get-organisation-structure-posts/${orgId}`);
}

export function fetchOrganisationStructureDepartments() {
  return api.get('/get-organisation-structure-departments');
}

export function fetchOrganisationStructureClasses() {
  return api.get('/get-organisation-structure-classes');
}

export function fetchOrganisationMaster() {
  return api.get('/master-table/mmt_organisation');
}

// 'None' is the backend's "no filter" value for department and post; orgId 'null' = all (ministry)
export function fetchEmployeeList(roleId, orgId, depId = 'None', postId = 'None') {
  return api.get(`/get-employee-list-by-organisation-dep-post/${roleId}/${orgId}/${depId}/${postId}`);
}

// Vacant post codes of a post for a method of appointment (Add Employee)
export function fetchPostCodesByPost(postId, methodOfAppointment) {
  return api.get(`/get-post-code-by-postId/${postId}/${methodOfAppointment}`);
}

// ==========================================
// 6. Server-side paginated lists
// ==========================================
// Params: page, limit plus only the filters that are set. GETs accept { signal } so a newer
// request can cancel an older one. Response: { data, pagination: { total, page, limit,
// totalPages }, ...extra }. The organisation comes from the login on the server.

const listGet = (url) => (params, config = {}) => api.get(url, { params, ...config });

export const fetchEmployeesPage = listGet('/hr/employees');
export const fetchVacancyOverviewPage = listGet('/hr/vacancy-overview');
export const fetchAnticipatedVacanciesPage = listGet('/hr/anticipated-vacancies');
export const fetchAbolishedPostsPage = listGet('/hr/abolished-posts');

// ==========================================
// 7. HR Reports (legacy pages/HR/hrMinistryReviewReports.html)
// ==========================================
// orgCategory: 1 = Major Ports, 3 = Non-Major Ports.
// deptCategory: 1 = departments grouped by cluster, 0 = without cluster.
// The MIS reports answer { columnDefs, rowData } and 404 when there is no data.
// period: { year, month } for a monthly snapshot

export function fetchHrStaffingOverviewReport(orgCategory, period) {
  return api.get(`/get-hr-staffing-overview-report/${orgCategory}`, { params: period ?? undefined });
}

export function fetchTotalManpowerSanctionActual(departmentId, classId, orgCategory, deptCategory, period) {
  return api.get(
    `/get-hr-mis-total-manpower-actual/${departmentId}/${classId}/${orgCategory}/${deptCategory}`,
    { params: period ?? undefined }
  );
}

export function fetchHrGenderWiseReport(orgCategory, period) {
  return api.get(`/get-hr-mis-gender-wise-major-port/${orgCategory}`, { params: period ?? undefined });
}

export function fetchTotalManpowerClassWiseReport(orgCategory, deptCategory, period) {
  return api.get(`/get-total-manpower-class-wise-report/${orgCategory}/${deptCategory}`, { params: period ?? undefined });
}

export function fetchContractDetailsReport(roleId, orgId) {
  return api.get(`/get-contract-details-report/${roleId}/${orgId}`);
}

export function fetchTrainingDetailsReport(roleId, orgId) {
  return api.get(`/get-training-details-report/${roleId}/${orgId}`);
}

// Vacancy history (clusterId 1 = Major Ports; orgId 0 = every organisation in the cluster).
export function fetchDepartmentWisePostStatus(clusterId, orgId) {
  return api.get(`/get-department-wise-post-status/${clusterId}/${orgId}`);
}

export function fetchDepartmentWisePostStatusFiltered(clusterId, orgId, year, month) {
  return api.get(
    `/get-department-wise-emp-count-by-org-data-filter/${clusterId}/${orgId}/${year}/${month}`
  );
}

// Months with an HR snapshot; scope 'mis' skips backfilled months
export function fetchVacancyLogYearsAndMonths(orgId, scope) {
  return api.get(`/get-year-and-month/${orgId}`, { params: scope ? { scope } : undefined });
}

export function fetchOrganisationsByCluster(clusterId) {
  return api.get(`/get-mmt-organisation-by-cluster-id/${clusterId}`);
}

// ==========================================
// 7. HR Dashboard (clusterId / orgId 0 = all; organisation users always get their own)
// ==========================================
const dashboardGet = (path) => (clusterId, orgId) => api.get(`/${path}/${clusterId}/${orgId}`);

export const fetchHrDashboardTotals = dashboardGet('get-admin-hr-dashboard-content');
export const fetchHrDashboardGender = dashboardGet('get-admin-hr-gender-wise-cont-by-org');
export const fetchHrDashboardExService = dashboardGet('get-admin-view-experienced-emp-count');
export const fetchHrDashboardPwbd = dashboardGet('get-admin-view-pwbd-wise-count');
export const fetchHrDashboardCommunity = dashboardGet('get-admin-view-community-wise-count-by-org');
export const fetchHrDashboardDepartmentWise = dashboardGet('get-admin-view-department-wise-post-status');
export const fetchHrDashboardAbolishing = dashboardGet('get-abolishing-post-within-month');
export const fetchHrDashboardRetiring = dashboardGet('get-emp-going-to-retire-within-six-months');
// ==========================================
// 8. Non-port organisations: monthly Excel upload instead of posts (the server reads last month's file)
// ==========================================
export const fetchNonPortTotals = dashboardGet('get-hr-dashboard-content-other-org');
export const fetchNonPortGender = dashboardGet('get-other-org-emp-gender-wise-count');
export const fetchNonPortExService = dashboardGet('get-other-org-ex-service-count-by-org');
export const fetchNonPortPwbd = dashboardGet('get-other-org-pwbd-wise-count-by-org');
export const fetchNonPortCommunity = dashboardGet('get-other-org-community-wise-count-by-org');
export const fetchNonPortAbolishing = dashboardGet('get-other-org-abolishing-post-within-month');
export const fetchNonPortRetiring = dashboardGet('get-other-org-emp-going-to-retire-within-six-months');

// params: { year, month } (optional)
export function fetchNonPortVacancyData(orgId, params) {
  return api.get(`/get-data-from-vacancy-details/${orgId}`, { params });
}

export function fetchNonPortLastUpload(orgId) {
  return api.get(`/get-last-upload-date-by-org/${orgId}`);
}

export function fetchNonPortUploads(orgId) {
  return api.get(`/get-file-upload-details/${orgId}`);
}

export function deleteNonPortUpload(fileId) {
  return afterWrite(api.delete(`/delete-vacany-details-file/${fileId}`));
}

export function uploadNonPortVacancyFile(formData) {
  return afterWrite(api.post('/upload-vacany-details-file', formData));
}

// ==========================================
// Organisation structure (posts) and new employees
// ==========================================

export function addOrganisationStructurePost(payload) {
  return afterWrite(api.post('/add-organisation-structure-post', payload));
}

export function updateOrganisationStructurePost(postId, payload) {
  return afterWrite(api.put(`/update-organisation-structure-post/${postId}`, payload));
}

export function deleteOrganisationStructurePost(postId, reason) {
  return afterWrite(api.delete(`/delete-organisation-structure-post/${postId}`, { data: { reason } }));
}

export function addNewEmployee(payload) {
  return afterWrite(api.post('/add-new-emplyee', payload));
}

export default api;
