import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

// ---- Student Enrollment (K-5.1) ----
// createStudentEnrollment on the backend is itself an upsert (keyed on
// financial_year) -- there's no separate update endpoint, so the frontend
// always calls this same create function for both add and edit.
export function fetchStudentEnrollment(params = {}) {
  return api.get('/get-imu-k-5-1', { params });
}

export function fetchStudentEnrollmentById(studentId) {
  return api.get(`/get-imu-k-5-1/${studentId}`);
}

export function saveStudentEnrollment(payload) {
  return api.post('/add-imu-k-5-1', payload);
}

export function fetchStudentEnrollmentReport() {
  return api.get('/get-imu-k-5-1-report');
}

export function fetchStudentEnrollmentLinegraphReport() {
  return api.get('/get-imu-k-5-1-linegraph-report');
}

export function deleteStudentEnrollment(studentId) {
  return api.delete(`/delete-imu-k-5-1/${studentId}`);
}

// ---- Final Year Pass Percentage (K-5.1.1) ----
// createimuFinalYearpassPercentage is also an upsert, keyed on
// (programme, batch).
export function fetchFinalYearPassPercentage() {
  return api.get('/get-student-perecntage-list'); // the route takes no user id (KPI-14)
}

export function fetchFinalYearPassPercentageById(studentId) {
  return api.get(`/update-student-perecntage-data/${studentId}`);
}

export function saveFinalYearPassPercentage(payload) {
  return api.post('/add-imu-k-5-1-1', payload);
}

export function fetchFinalYearPassPercentageReport() {
  return api.get('/get-imu-k-5-1-1-report');
}

export function deleteFinalYearPassPercentage(studentId) {
  return api.delete(`/delete-imu-k-5-1-1/${studentId}`);
}

// ---- New Course Upgradation (K-5.2) ----
// createimunewCourseUpgradation is an upsert keyed on financial_year.
export function fetchNewCourseUpgradation(params = {}) {
  return api.get('/get-imu-k-5-2', { params });
}

export function fetchNewCourseUpgradationById(courseId) {
  return api.get(`/get-imu-k-5-2/${courseId}`);
}

export function saveNewCourseUpgradation(payload) {
  return api.post('/add-imu-k-5-2', payload);
}

export function fetchNewCourseUpgradationReport() {
  return api.get('/get-imu-k-5-2-report');
}

export function deleteNewCourseUpgradation(courseId) {
  return api.delete(`/delete-imu-k-5-2/${courseId}`);
}

// ---- Facilities (K-5.3) ----
// createimuFacilities is an upsert keyed on financial_year.
export function fetchFacilities(params = {}) {
  return api.get('/get-imu-k-5-3', { params });
}

export function fetchFacilitiesById(facilitiesId) {
  return api.get(`/get-imu-k-5-3/${facilitiesId}`);
}

export function saveFacilities(payload) {
  return api.post('/add-imu-k-5-3', payload);
}

export function fetchFacilitiesReport() {
  return api.get('/get-imu-k-5-3-report');
}

export function deleteFacilities(facilitiesId) {
  return api.delete(`/delete-imu-k-5-3/${facilitiesId}`);
}

// ---- Partnership (K-5.4) ----
// createimuPartnership is an upsert keyed on financial_year.
export function fetchPartnership(params = {}) {
  return api.get('/get-imu-k-5-4', { params });
}

export function fetchPartnershipById(partnershipId) {
  return api.get(`/get-imu-k-5-4/${partnershipId}`);
}

export function savePartnership(payload) {
  return api.post('/add-imu-k-5-4', payload);
}

export function fetchPartnershipReport() {
  return api.get('/get-imu-k-5-4-report');
}

export function deletePartnership(partnershipId) {
  return api.delete(`/delete-imu-k-5-4/${partnershipId}`);
}

// ---- Research, Innovation & Startups (K-5.5) ----
// createImuResearch is an upsert keyed on financial_year.
export function fetchResearch(params = {}) {
  return api.get('/get-imu-k-5-5', { params });
}

export function fetchResearchById(researchId) {
  return api.get(`/get-imu-k-5-5/${researchId}`);
}

export function saveResearch(payload) {
  return api.post('/add-imu-k-5-5', payload);
}

export function fetchResearchReport() {
  return api.get('/get-imu-k-5-5-report');
}

export function deleteResearch(researchId) {
  return api.delete(`/delete-imu-k-5-5/${researchId}`);
}

export default api;
