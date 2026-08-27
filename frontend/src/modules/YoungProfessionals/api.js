import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

// Automatically attach Authorization Bearer token to all outgoing requests
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

// Intercept 401 Unauthorized responses to silently refresh token and retry
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

// Explicit YP Module CRUD Endpoints
export function fetchYoungProfessionals(params = {}) {
  return api.get('/young-professional', { params });
}

export function fetchYoungProfessionalById(id) {
  return api.get(`/edit-young-professional/${id}`);
}

export function createYoungProfessional(payload) {
  return api.post('/young-professional', payload);
}

export function updateYoungProfessional(id, payload) {
  return api.put(`/young-professional/${id}`, payload);
}

export function deleteYoungProfessional(id) {
  return api.delete(`/delete-young-professional/${id}`);
}

export function uploadYPDocument(candidateId, formData) {
  return api.post(`/upload-yp-document/${candidateId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export function relieveYoungProfessional(payload) {
  return api.put('/relieve-young-professional', payload);
}

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

export function fetchYpReport() {
  return api.get('/yp-report');
}

export function fetchYPReport() {
  return api.get('/yp-report');
}

export function fetchYpDivisionReport(wingId) {
  return api.get(`/yp-division-report/${wingId}`);
}

export function fetchYPDivisionWiseCandidates(divisionId) {
  return api.get(`/divisionwise-ypcandidate/0/${divisionId}`);
}

export default api;
