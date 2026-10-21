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

export function fetchHrDivisions() {
  return api.get('/get-hr-division-list');
}

export function fetchHrPostsByOrg(orgId) {
  return api.get(`/get-hr-post-list/${orgId}`);
}

export function fetchHrPostsByDepartment(deptId, orgId) {
  const deptParam = deptId === '' || deptId === '0' || !deptId ? '001' : deptId;
  return api.get(`/get-hr-postList-by-department-organisation/${deptParam}/${orgId}`);
}

export function fetchHrPostDetails(orgId) {
  return api.get(`/get-hr-post-details/${orgId}`);
}

export function fetchHrVacancyDetails(postId, isLive = 1) {
  return api.get(`/get-hr-vacancy-details/${postId}/${isLive}`);
}

export function fetchHrAnticipatedVacancies(deptId, postId, className, orgId, selectedYears) {
  const d = deptId || '0';
  const p = postId || '0';
  const c = className || '0';
  const y = selectedYears || new Date().getFullYear();
  return api.get(`/get-hr-anticipated-vacancies-by-org/${d}/${p}/${c}/${orgId}/${y}`);
}

export function submitHrAnticipatedVacancies(payload) {
  return afterWrite(api.post('/submit-anticipated-vacancies', payload));
}

export function submitHrVacancyAnticipation(payload) {
  return afterWrite(api.post('/submit-hr-vacancy-anticipation', payload));
}

export function fetchHrAssessmentData(orgId) {
  return api.get(`/get-hr-assessment-data-by-org/${orgId}`);
}

export function fetchHrAllData(orgId) {
  return api.get(`/get-hr-all-data/${orgId}`);
}

export function updateHrEmployeeActivity(payload) {
  return afterWrite(api.put('/update-hr-employee-activity', payload));
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

export function fetchPermanentAbolishedPosts() {
  return api.get('/get-permanent-abolished-post/');
}

export function fetchPermanentAbolishedPostsByOrg(orgId) {
  return api.get(`/get-permanent-abolished-post-org/${orgId}`);
}

export function fetchFilledPosts(postId) {
  return api.get(`/get-filled-post/${postId}`);
}

export function fetchVacantPosts(postId) {
  return api.get(`/get-vacant-post/${postId}`);
}

export function postRevivalDate(payload) {
  return afterWrite(api.post('/post-revival-date', payload));
}

export function updateRevivePostApproval(payload) {
  return afterWrite(api.post('/update-revive-post-approval', payload));
}

export function deleteHrPostData(postId, postCode) {
  return afterWrite(api.delete(`/delete-hr-post-data/${postId}/${postCode}`));
}

// ==========================================
// 3. Training Details
// ==========================================

// roleId must come from the session (the backend also pins it to the token).
export function fetchHrTrainingDataByOrg(orgId, roleId) {
  return api.get(`/get-hr-training-data-by-org/${orgId}/${roleId}`);
}

export function fetchHrTrainingDataById(trainingId) {
  return api.get(`/hr/get-hr-training-data-by-id/${trainingId}`);
}

export function deleteHrTrainingData(trainingId, orgId) {
  return afterWrite(api.delete(`/delete-training-data/${trainingId}/${orgId}`));
}

export function fetchAllTrainingData(userId) {
  return api.get(`/get-all-training-data/${userId}`);
}

// Used by the Training form (components/TrainingDataForm.jsx)
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

export function fetchContractData(roleId, orgId) {
  return api.get(`/get-contract-data/${roleId}/${orgId}`);
}

export function fetchContractualDataById(contractId) {
  return api.get(`/get-contractual-data-by-id/${contractId}`);
}

// Used by the Contractual form (components/ContractualDataForm.jsx)
export function createContractualData(data) {
  return afterWrite(api.post('/hr/contractual-employment', data));
}

export function getContractualData() {
  return api.get('/hr/contractual-employment');
}

export function deleteContractualData(contractId, orgId) {
  return afterWrite(api.delete(`/delete-contractual-data/${contractId}/${orgId}`));
}

export function fetchAllContractualData(userId) {
  return api.get(`/get-all-contractual-data/${userId}`);
}

// ==========================================
// 5. HR Administration & Actions
// ==========================================

// 'None' is the backend's "no filter" value for department and post.
export function fetchEmployeesHoldingDesignation(orgId, deptId = 'None', postId = 'None') {
  return api.get(`/get-employee-list-holding-designation/${orgId}/${deptId}/${postId}`);
}

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

export function fetchAbolishedPostFacets() {
  return api.get('/hr/abolished-posts/facets');
}

// ==========================================
// 7. HR Reports (legacy pages/HR/hrMinistryReviewReports.html)
// ==========================================
// orgCategory: 1 = Major Ports, 3 = Non-Major Ports.
// deptCategory: 1 = departments grouped by cluster, 0 = without cluster.
// The MIS reports answer { columnDefs, rowData } and 404 when there is no data.

export function fetchHrStaffingOverviewReport(orgCategory) {
  return api.get(`/get-hr-staffing-overview-report/${orgCategory}`);
}

export function fetchTotalManpowerSanctionActual(departmentId, classId, orgCategory, deptCategory) {
  return api.get(
    `/get-hr-mis-total-manpower-actual/${departmentId}/${classId}/${orgCategory}/${deptCategory}`
  );
}

export function fetchHrGenderWiseReport(orgCategory) {
  return api.get(`/get-hr-mis-gender-wise-major-port/${orgCategory}`);
}

export function fetchTotalManpowerClassWiseReport(orgCategory, deptCategory) {
  return api.get(`/get-total-manpower-class-wise-report/${orgCategory}/${deptCategory}`);
}

export function fetchContractDetailsReport(roleId, orgId) {
  return api.get(`/get-contract-details-report/${roleId}/${orgId}`);
}

export function fetchTrainingDetailsReport(roleId, orgId) {
  return api.get(`/get-training-details-report/${roleId}/${orgId}`);
}

// Vacancy history (clusterId 1 = Major Ports; orgId 0 = every organisation in the cluster).
export function fetchHrDashboardContent(clusterId, orgId) {
  return api.get(`/get-hr-dashboard-content/${clusterId}/${orgId}`);
}

export function fetchHrDashboardContentFiltered(clusterId, orgId, year, month) {
  return api.get(`/get-hr-dashboard-content-data-filter/${clusterId}/${orgId}/${year}/${month}`);
}

export function fetchDepartmentWisePostStatus(clusterId, orgId) {
  return api.get(`/get-department-wise-post-status/${clusterId}/${orgId}`);
}

export function fetchDepartmentWisePostStatusFiltered(clusterId, orgId, year, month) {
  return api.get(
    `/get-department-wise-emp-count-by-org-data-filter/${clusterId}/${orgId}/${year}/${month}`
  );
}

export function fetchVacancyLogYearsAndMonths(orgId) {
  return api.get(`/get-year-and-month/${orgId}`);
}

export function fetchOrganisationsByCluster(clusterId) {
  return api.get(`/get-mmt-organisation-by-cluster-id/${clusterId}`);
}

export default api;
