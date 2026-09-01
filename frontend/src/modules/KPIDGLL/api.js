import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const res = await axios.get(`${API_BASE}/refresh-token`, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  const next = res.data?.accessToken;
  if (!next) throw new Error('Refresh failed');
  localStorage.setItem('accessToken', next);
  return next;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const token = await refreshPromise;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return Promise.reject(error);
    }
  }
);

// ---- Shared dropdowns ----
export function fetchStates() {
  return api.get('/mmt-dropdown/mmt_state');
}

export function fetchDistricts() {
  return api.get('/mmt-dropdown/mmt_district');
}

// ---- Light House Master (K-3.1) ----
export function fetchLightHouseMaster(userId) {
  return api.get(`/light-house-list/${userId}`);
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

export function deleteLightHouseMaster(lightsHouseId, userId) {
  return api.delete(`/light-house-master/${lightsHouseId}/${userId}`);
}

export function fetchLightHouseMasterReport() {
  return api.get('/get-light-house-master-report');
}

// ---- VTMS Integration (K-3.2) ----
export function fetchVtmsIntegration(userId) {
  return api.get(`/vtms-list/${userId}`);
}

export function fetchVtmsIntegrationById(vtmsId) {
  return api.get(`/update-Vtms-data/${vtmsId}`);
}

export function createVtmsIntegration(payload) {
  return api.post('/vtms-Integration', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateVtmsIntegration(payload) {
  return api.put('/vtms-edit', payload);
}

export function deleteVtmsIntegration(vtmsId, userId) {
  return api.delete(`/vtms-integration/${vtmsId}/${userId}`);
}

export function fetchVtmsIntegrationReport() {
  return api.get('/get-vtms-integration-report');
}

// ---- NAIS Uptime (K-3.3) ----
export function fetchNaisUptime(userId) {
  return api.get(`/nais-list/${userId}`);
}

export function fetchNaisUptimeById(naisId) {
  return api.get(`/update-nais-data/${naisId}`);
}

export function createNaisUptime(payload) {
  return api.post('/nais-uptime', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateNaisUptime(payload) {
  return api.put('/nais-edit', payload);
}

export function deleteNaisUptime(naisId, userId) {
  return api.delete(`/nais-uptime/${naisId}/${userId}`);
}

export function fetchNaisUptimeReport() {
  return api.get('/get-nais-uptime-report');
}

// ---- NAIS Integration (K-3.4) ----
export function fetchNaisIntegration(userId) {
  return api.get(`/nais-integration-list/${userId}`);
}

export function fetchNaisIntegrationById(naisIntegrationId) {
  return api.get(`/update-nais-integration-data/${naisIntegrationId}`);
}

export function createNaisIntegration(payload) {
  return api.post('/nais-integration', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateNaisIntegration(payload) {
  return api.put('/nais-integration-edit', payload);
}

export function deleteNaisIntegration(naisIntegrationId, userId) {
  return api.delete(`/nais-integration/${naisIntegrationId}/${userId}`);
}

export function fetchNaisIntegrationReport() {
  return api.get('/get-nais-integration-report');
}

// ---- Lighthouse as Tourist Destinations (K-3.5) ----
export function fetchTouristDestinations(userId) {
  return api.get(`/lighthouse-tourist-destination/${userId}`);
}

export function fetchTouristDestinationById(touristDestinationId) {
  return api.get(`/update-lighthouse-tourist-destination/${touristDestinationId}`);
}

// Legacy behaviour: creation itself does not reject duplicate years, so the
// frontend must call checkTouristDestinationYear first and block submission
// if it returns 205 -- unlike VTMS/NAIS which self-check on create.
export function checkTouristDestinationYear(financialYear) {
  return api.get(`/check-financialYears/${financialYear}`, { validateStatus: (s) => s === 200 || s === 205 });
}

export function createTouristDestination(payload) {
  return api.post('/lighthose-tourist-destination', payload);
}

export function updateTouristDestination(payload) {
  return api.put('/edit-lighthouse-tourist-destination', payload);
}

export function deleteTouristDestination(touristDestinationId, userId) {
  return api.delete(`/lighthouse-tourist-destination/${touristDestinationId}/${userId}`);
}

export function fetchTouristDestinationReport() {
  return api.get('/get-lighthouse-tourist-destination-report');
}

// ---- Target Details (K-3.5 sub-entity) ----
export function fetchTargetDetails(userId) {
  return api.get(`/target-Details-lighthouse/${userId}`);
}

export function fetchTargetDetailById(targetId) {
  return api.get(`/update-target-Details-destination/${targetId}`);
}

export function checkTargetDetailYear(year) {
  return api.get(`/check-targetYears/${year}`, { validateStatus: (s) => s === 200 || s === 205 });
}

export function createTargetDetail(payload) {
  return api.post('/target-Details-lighthouse', payload, { validateStatus: (s) => s === 201 || s === 205 });
}

export function updateTargetDetail(payload) {
  return api.put('/edit-target-Details-lighthouse', payload);
}

export function deleteTargetDetail(targetId, userId) {
  return api.delete(`/target-Details-lighthouse/${targetId}/${userId}`);
}

// ---- Financial Performance (K-3.6) ----
// submitFinancialPerformance is an upsert on the backend: it updates the
// existing row for that financial year if one exists, otherwise inserts.
export function submitFinancialPerformance(payload) {
  return api.post('/dgll-submit-financial-performance', payload);
}

export function fetchFinancialPerformance() {
  return api.get('/get-dgll-financial-performance');
}

export function fetchFinancialPerformanceById(financialId) {
  return api.get(`/get-dgll-financial-performance/${financialId}`);
}

export function fetchFinancialPerformanceReport() {
  return api.get('/get-dgll-financial-performance-report');
}

export function deleteFinancialPerformance(financialId, userId) {
  return api.delete(`/dgll-financial-performance/${financialId}/${userId}`);
}

export default api;
