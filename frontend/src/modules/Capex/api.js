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

export function fetchCapexList(params = {}, config = {}) {
  const query = {
    page: params.page || 1,
    limit: params.limit || 10,
  };
  if (params.financialYear) query.financialYear = params.financialYear;
  if (params.organisationId) query.organisationId = params.organisationId;
  if (params.organisationName) query.organisationName = params.organisationName;
  if (params.search) query.search = params.search;
  if (params.all) query.all = 1;
  return api.get('/capex', { params: query, ...config });
}

export function createCapexTarget(payload) {
  return api.post('/capex', payload);
}

export function updateCapexTarget(payload) {
  return api.post('/capex-edit', payload);
}

export function fetchCapexDataEntry() {
  return api.get('/data-entry-capex');
}

export function fetchCapexMonthlyData(capexId) {
  return api.get(`/capex-monthly-data/${capexId}`);
}

export function saveCapexMonthlyData(payload) {
  return api.post('/capex-monthly-data', payload);
}

export function fetchCapexReport(year) {
  return api.get(`/capex-report/${year}`);
}

export function fetchCapexSummaryReport(year) {
  return api.get(`/capex-summary-report/${year}`);
}

export function fetchCapexYoYReport() {
  return api.get('/capex-yoy-report');
}

export function fetchCapexDashboardFilters() {
  return api.get('/get-capex-dashboard-filters');
}

// Filters left as 'all' are not sent.
export function fetchCapexDashboardSummary({ financialYear, groupId, organisationId } = {}) {
  const params = {};
  if (financialYear && financialYear !== 'all') params.financialYear = financialYear;
  if (groupId && groupId !== 'all') params.groupId = groupId;
  if (organisationId && organisationId !== 'all') params.organisationId = organisationId;
  return api.get('/get-capex-dashboard-summary', { params });
}

export function fetchCapexDashboardFySummary({ financialYear, groupId, organisationId } = {}) {
  const params = {};
  if (financialYear && financialYear !== 'all') params.financialYear = financialYear;
  if (groupId && groupId !== 'all') params.groupId = groupId;
  if (organisationId && organisationId !== 'all') params.organisationId = organisationId;
  return api.get('/get-capex-dashboard-fy-summary', { params });
}

export function fetchCapexDashboardYoy({ groupId, organisationId } = {}) {
  const params = {};
  if (groupId && groupId !== 'all') params.groupId = groupId;
  if (organisationId && organisationId !== 'all') params.organisationId = organisationId;
  return api.get('/get-capex-dashboard-yoy', { params });
}

export default api;
