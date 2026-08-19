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

export default api;
