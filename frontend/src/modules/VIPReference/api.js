import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

// Request Interceptor: Attach JWT Access Token
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

// Response Interceptor: Auto-refresh on 401 Unauthorized
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

// ── CRUD Operations ──

export function fetchVIPReferences(params = {}, config = {}) {
  return api.get('/vip-reference', { params, ...config });
}

export function fetchVIPReferenceById(id) {
  return api.get(`/vip-reference/${id}`);
}

export function createVIPReference(payload) {
  return api.post('/vip-reference', payload);
}

export function updateVIPReference(payload) {
  return api.put('/vip-reference', payload);
}

export function deleteVIPReference(id, userId) {
  return api.delete(`/vip-reference/${id}/${userId}`);
}

// ── Dropdowns ──

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

export function fetchVIPStages() {
  return api.get('/mmt-dropdown/mmt_vip_stage');
}

// ── Abstract Reports ──

export function fetchVIPWingWiseReport() {
  return api.get('/vipwingwise-report');
}

export function fetchVIPDivisionWiseReport(wingId) {
  return api.get(`/vipdivisionwise-report/${wingId}/`);
}

export function fetchVIPWingDetail(wingId, stageId) {
  const url = stageId !== undefined && stageId !== '' && stageId !== null
    ? `/getvip-wingwise/${wingId}/${stageId}`
    : `/getvip-wingwise/${wingId}/`;
  return api.get(url);
}

export function fetchVIPDivisionDetail(divisionId, stageId) {
  const url = stageId !== undefined && stageId !== '' && stageId !== null
    ? `/getvip-divisionwise/${divisionId}/${stageId}`
    : `/getvip-divisionwise/${divisionId}/`;
  return api.get(url);
}

// ── Pendency Reports ──

export function fetchVIPPendencyWingWiseReport() {
  return api.get('/vip-pendencywingwise-report');
}

export function fetchVIPPendencyDivisionWiseReport(wingId) {
  return api.get(`/vip-pendencydivisionwise-report/${wingId}/`);
}

export function fetchVIPPendencyWingDetail(wingId, countDate) {
  return api.get(`/getvippendency-wingwise/${wingId}/${countDate}`);
}

export function fetchVIPPendencyDivisionDetail(divisionId, countDate) {
  return api.get(`/getvippendency-divisionwise/${divisionId}/${countDate}`);
}

export default api;
