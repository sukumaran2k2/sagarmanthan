import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

// ---- Shared dropdowns ----
export function fetchStates() {
  return api.get('/mmt-dropdown/mmt_state');
}

export function fetchDistricts() {
  return api.get('/mmt-dropdown/mmt_district');
}

// ---- Light House Master (K-3.1) ----
export function fetchLightHouseMaster(params = {}) {
  return api.get(`/light-house-list`, { params });
}

export function fetchLightHouseMasterById(lightHouseId) {
  return api.get(`/update-light-house-list/${lightHouseId}`);
}

export function createLightHouseMaster(payload) {
  return api.post('/light-house-master', payload);
}

export function updateLightHouseMaster(payload) {
  return api.put('/Light-House-edit', payload);
}

export function deleteLightHouseMaster(lightsHouseId) {
  return api.delete(`/light-house-master/${lightsHouseId}`);
}

export function fetchLightHouseMasterReport() {
  return api.get('/get-light-house-master-report');
}

// ---- VTMS Integration (K-3.2) ----
export function fetchVtmsIntegration(params = {}) {
  return api.get(`/vtms-list`, { params });
}

export function fetchVtmsIntegrationById(vtmsId) {
  return api.get(`/update-Vtms-data/${vtmsId}`);
}

export function createVtmsIntegration(payload) {
  return api.post('/vtms-Integration', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateVtmsIntegration(payload) {
  return api.put('/vtms-edit', payload);
}

export function deleteVtmsIntegration(vtmsId) {
  return api.delete(`/vtms-integration/${vtmsId}`);
}

export function fetchVtmsIntegrationReport() {
  return api.get('/get-vtms-integration-report');
}

// ---- NAIS Uptime (K-3.3) ----
export function fetchNaisUptime(params = {}) {
  return api.get(`/nais-list`, { params });
}

export function fetchNaisUptimeById(naisId) {
  return api.get(`/update-nais-data/${naisId}`);
}

export function createNaisUptime(payload) {
  return api.post('/nais-uptime', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateNaisUptime(payload) {
  return api.put('/nais-edit', payload);
}

export function deleteNaisUptime(naisId) {
  return api.delete(`/nais-uptime/${naisId}`);
}

export function fetchNaisUptimeReport() {
  return api.get('/get-nais-uptime-report');
}

// ---- NAIS Integration (K-3.4) ----
export function fetchNaisIntegration(params = {}) {
  return api.get(`/nais-integration-list`, { params });
}

export function fetchNaisIntegrationById(naisIntegrationId) {
  return api.get(`/update-nais-integration-data/${naisIntegrationId}`);
}

export function createNaisIntegration(payload) {
  return api.post('/nais-integration', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateNaisIntegration(payload) {
  return api.put('/nais-integration-edit', payload);
}

export function deleteNaisIntegration(naisIntegrationId) {
  return api.delete(`/nais-integration/${naisIntegrationId}`);
}

export function fetchNaisIntegrationReport() {
  return api.get('/get-nais-integration-report');
}

// ---- Lighthouse as Tourist Destinations (K-3.5) ----
export function fetchTouristDestinations(params = {}) {
  return api.get(`/lighthouse-tourist-destination`, { params });
}

export function fetchTouristDestinationById(touristDestinationId) {
  return api.get(`/update-lighthouse-tourist-destination/${touristDestinationId}`);
}

// Legacy behaviour: creation itself does not reject duplicate years, so the
// frontend must call checkTouristDestinationYear first and block submission
// if it answers { exists: true } -- unlike VTMS/NAIS which self-check on create.
export function checkTouristDestinationYear(financialYear) {
  return api.get(`/check-financialYears/${financialYear}`);
}

export function createTouristDestination(payload) {
  return api.post('/lighthose-tourist-destination', payload);
}

export function updateTouristDestination(payload) {
  return api.put('/edit-lighthouse-tourist-destination', payload);
}

export function deleteTouristDestination(touristDestinationId) {
  return api.delete(`/lighthouse-tourist-destination/${touristDestinationId}`);
}

export function fetchTouristDestinationReport() {
  return api.get('/get-lighthouse-tourist-destination-report');
}

// ---- Target Details (K-3.5 sub-entity) ----
export function fetchTargetDetails(params = {}) {
  return api.get(`/target-Details-lighthouse`, { params });
}

export function fetchTargetDetailById(targetId) {
  return api.get(`/update-target-Details-destination/${targetId}`);
}

export function createTargetDetail(payload) {
  return api.post('/target-Details-lighthouse', payload, { validateStatus: (s) => s === 201 || s === 409 });
}

export function updateTargetDetail(payload) {
  return api.put('/edit-target-Details-lighthouse', payload);
}

export function deleteTargetDetail(targetId) {
  return api.delete(`/target-Details-lighthouse/${targetId}`);
}

// ---- Financial Performance (K-3.6) ----
// submitFinancialPerformance is an upsert on the backend: it updates the
// existing row for that financial year if one exists, otherwise inserts.
export function submitFinancialPerformance(payload) {
  return api.post('/dgll-submit-financial-performance', payload);
}

export function fetchFinancialPerformance(params = {}) {
  return api.get('/get-dgll-financial-performance', { params });
}

export function fetchFinancialPerformanceById(financialId) {
  return api.get(`/get-dgll-financial-performance/${financialId}`);
}

export function fetchFinancialPerformanceReport() {
  return api.get('/get-dgll-financial-performance-report');
}

export function deleteFinancialPerformance(financialId) {
  return api.delete(`/dgll-financial-performance/${financialId}`);
}

export default api;
