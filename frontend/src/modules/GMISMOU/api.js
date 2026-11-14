import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient({
  headers: {
    'Content-Type': 'application/json',
  },
});

// GMIS & IMW API Endpoints
export function fetchGmisMouPaginated(params = {}) {
  return api.get('/get-gmis-mou-paginated', { params });
}

// export function fetchGmisMouDataById(mouId) {
//   return api.get(`/get-gmis-mou-data-by-id/${mouId}`);
// }

export function submitGmisMouData(payload) {
  return api.post('/submit-gmis-mou-data', payload);
}

export function updateGmisMouData(payload) {
  return api.put('/update-gmis-mou-data', payload);
}

export function uploadGmisDocument(formData) {
  return api.post('/gmisdocumentUploader', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function fetchMouCategoryNames() {
  return api.get('/get-mou-category-names');
}

export function fetchGmisNavicVibhas() {
  return api.get('/get-gismou-vibhas-navic-cell');
}

// Dashboard: every aggregate in one call (KPI cards, category chart, summit trend,
// organisation-wise stages). eventName '' or 'all' = every summit.
export function fetchGmisMouDashboard(eventName = '') {
  return api.get('/get-gmis-mou-dashboard', { params: { eventName } });
}

export function fetchGmisMouSummits() {
  return api.get('/get-gmis-mou-summits');
}

export function fetchOrganisations() {
  return api.get('/mmt-dropdown/mmt_organisation');
}

export function addRevisedPhysicalProgressDate(payload) {
  return api.post('/add-revised-physical-progress-date', payload);
}

export function addRevisedFinancialProgressDate(payload) {
  return api.post('/add-revised-financial-progress-date', payload);
}

export function fetchRevisedPhysicalProgressDate(mouId) {
  return api.get(`/get-revised-physical-progress-date/${mouId}`);
}

// Signed MoU document; sent with the login token, so it is fetched as a blob.
export function downloadGmisDocument(fileName) {
  return api.get('/download-gmismou-pdf-document', { params: { fileName }, responseType: 'blob' });
}

export function fetchRevisedFinancialProgressDate(mouId) {
  return api.get(`/get-revised-financial-progress-date/${mouId}`);
}

//report 1.1
export function getEventWiseSummary(userId) {
  return api.get(`/get-event-wise-summary/${userId}`);
}

export function getorgWisePerformanceRankingReport(userId) {
  return api.get(`/get-org-wise-performance-ranking-report/${userId}`);
}

export function getVibascellWiseSummary(userId) {
  return api.get(`/get-vibas-cell-wise-summary/${userId}`);
}

export function getCategoryWiseSummary(userId) {
  return api.get(`/get-category-wise-summary/${userId}`);
}

export function getPhysicalAndFinancialProgressWise(userId) {
  return api.get(`/get-physical-and-financial-progress-wise/${userId}`);
}

export function getDroppedMousReport(userId) {
  return api.get(`/get-dropped-mous-report/${userId}`);
}

export default api;
