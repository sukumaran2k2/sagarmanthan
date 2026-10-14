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
  if (!refreshToken) throw new Error('No refresh token');
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

// ---- Traffic: masters ----
export function fetchTrafficCommodityGroups() {
  return api.get('/get-traffic-commodity-groups');
}

export function fetchCommoditiesByGroup(groupId) {
  return api.get('/get-commodities-by-group', { params: { groupId } });
}

export function fetchTrafficCommodities(groupId) {
  return api.get('/get-traffic-commodities', { params: { groupId } });
}

// ---- Traffic: actuals ----
export function fetchTrafficActualData(params = {}, config = {}) {
  return api.get('/get-traffic-actual-data', { params, ...config });
}

export function fetchRoroTrafficActualData(organisationId) {
  const params = {};
  if (organisationId) params.organisationId = organisationId;
  return api.get('/get-roro-traffic-actual-data', { params });
}

export function fetchCommodityData({ fiscalYear, month, organisationId }) {
  return api.get('/get-commodity-data', {
    params: { fiscalYear, month, organisationId },
  });
}

export function submitCommodityData(payload) {
  return api.post('/submit-commodity-data', payload);
}

// ---- Traffic: fiscal targets ----
export function fetchFiscalYearTargetList() {
  return api.get('/get-fiscal-year-target-list');
}

export function fetchFiscalYearTargetData({ financialYear, organisationId }) {
  return api.get('/get-fiscal-year-target-data', {
    params: { financialYear, organisationId },
  });
}

export function submitFiscalYearTargetData(payload) {
  return api.post('/submit-fiscal-year-target-data', payload);
}

export function updateFiscalYearTargetData(payload) {
  return api.post('/update-fiscal-year-target-data', payload);
}

/** Shared org master used across finance/KPI input forms. */
export function fetchOrganisationsForEntry() {
  return api.get('/data-entry-capex');
}

export default api;
