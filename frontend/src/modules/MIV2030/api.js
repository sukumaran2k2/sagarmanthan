import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

// MIV Initiatives CRUD
export function fetchMIVData(params = {}) {
  return api.get('/miv-data', { params });
}

export function fetchMIVById(id) {
  return api.get(`/miv-data/${id}`);
}

export function createMIVData(payload) {
  return api.post('/miv-data', payload);
}

export function updateMIVData(id, payload) {
  return api.put(`/miv-data/${id}`, payload);
}

export function uploadMIVFiles(formData) {
  return api.post('/miv-data/upload-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

// MIV Dashboard & Analytics
export function fetchMIVDashboard(params = {}) {
  return api.get('/get-miv-dashboard', { params });
}

export function fetchMIVActivityStatusWise(params = {}) {
  return api.get('/get-miv-activity-status-wise', { params });
}

export function fetchMIVActivityCurrentStatusPortWise(params = {}) {
  return api.get('/get-miv-activity-current-status-port-wise', { params });
}

export function fetchMIVCategoryCountWise(params = {}) {
  return api.get('/get-miv-category-count-wise', { params });
}

// MIV Meetings
export function fetchMIVMeetingsData(userId) {
  return api.get(`/miv-meetingsdata/${userId}`);
}

export function fetchMeetingLogsByOrg(orgId) {
  return api.get(`/meetinglogs-mopsw/${orgId}`);
}

export function createMeeting(formData) {
  return api.post('/meeting', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export function deleteMeeting(id) {
  return api.delete(`/meeting/delete/${id}`);
}

// Helpers & Dropdowns
export function fetchNewInitiatives() {
  return api.get('/miv-new-initiatives');
}

export function fetchInitiativeName(initiativeId) {
  return api.get(`/get-initiative-name/${initiativeId}`);
}

export function fetchInitiativeTargetDate(initiativeId) {
  return api.get(`/get-target-date/${initiativeId}`);
}

export function fetchOrganisations() {
  return api.get('/mmt-dropdown/mmt_organisation');
}

export function fetchMIVDetailedReport(payload) {
  return api.post('/mivdetailed-report/', payload);
}

export function fetchThemeValues() {
  return api.get('/get-mmt-Theme-Values/');
}

export function fetchThemeWiseMIVDetailedReport(payload) {
  return api.post('/mivdetailed-report/', payload);
}

// Report 1.1
// Organisation-wise Performance Ranking
export function getMIVOrgWisePerformanceReport(userId) {
  return api.get(`/miv-org-wise-performance-report/${userId}`);
}

// Report 1.2
// Theme-wise Performance Ranking
export function getThemeWiseMIVPerformanceReport(userId) {
  return api.get(`/themewise-mivabstract-report/${userId}`);
}

// Report 1.3
// Category-wise Performance Ranking
export function getCategoryWiseMIVPerformanceReport(userId) {
  return api.get(
    `/category-wise-miv-performance-report/${userId}`
  );
}

// Report 1.4
// Summary - Delayed / Overdue Initiatives
export function getSummaryReportOverdueInitiatives(userId) {
  return api.get(`/get-summary-report-overdue-initiatives/${userId}`);
}

// Report 1.5
// Detailed - Delayed / Overdue Initiatives
export function detailedReportDelayedOverdueInitiatives(userId) {
  return api.get(`/detailed-report-delayed-overdue-initiatives/${userId}`);
}

export default api;
