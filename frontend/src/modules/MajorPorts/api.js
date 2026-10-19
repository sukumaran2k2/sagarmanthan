import axios from 'axios';
import { clearTrafficCache } from './store/trafficRequestCache';

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

// ---- Traffic ----
// The server takes the user and organisation from the session token, so no
// request sends userId, and organisation users never send organisationId.
// GETs accept { signal } so a newer request can cancel an older one; every
// write clears the response cache so lists and the dashboard show the change.

const afterWrite = (promise) => promise.then((res) => {
  clearTrafficCache();
  return res;
});

/** Commodity groups, commodities and the organisations visible to the user. */
export function fetchTrafficMasters() {
  return api.get('/kpi/traffic/masters');
}

/** Entry window and the organisation's active ministry unlocks. */
export function fetchTrafficEntryStatus() {
  return api.get('/kpi/traffic/entry-status');
}

/** view: 'period' | 'commodity' | 'roro' */
export function fetchTrafficActuals(params = {}, config = {}) {
  return api.get('/kpi/traffic/actuals', { ...config, params });
}

export function fetchTrafficPeriod({ fiscalYear, month, organisationId }) {
  return api.get('/kpi/traffic/period', { params: { fiscalYear, month, organisationId } });
}

/** Saves one wizard page: { fiscalYear, month, commodityData?, trafficData? } */
export function saveTrafficPeriod(payload) {
  return afterWrite(api.post('/kpi/traffic/period', payload));
}

export function deleteTrafficPeriod({ fiscalYear, month }) {
  return afterWrite(api.delete('/kpi/traffic/period', { params: { fiscalYear, month } }));
}

export function fetchTrafficTargets(params = {}, config = {}) {
  return api.get('/kpi/traffic/targets', { ...config, params });
}

export function createTrafficTarget(payload) {
  return afterWrite(api.post('/kpi/traffic/targets', payload));
}

export function updateTrafficTarget(id, payload) {
  return afterWrite(api.put(`/kpi/traffic/targets/${id}`, payload));
}

export function deleteTrafficTarget(id) {
  return afterWrite(api.delete(`/kpi/traffic/targets/${id}`));
}

export function fetchTrafficAccessGrants(params = {}, config = {}) {
  return api.get('/kpi/traffic/access', { ...config, params });
}

/** { organisationIds: [], financialYears: [], months: [] | 'ALL', expiryDate?, remarks? } */
export function createTrafficAccessGrant(payload) {
  return afterWrite(api.post('/kpi/traffic/access', payload));
}

export function revokeTrafficAccessGrant(accessId) {
  return afterWrite(api.patch(`/kpi/traffic/access/${accessId}/revoke`));
}

// Dashboard: the earlier portal's queries. part = traffic | cargo | performance | coastal | summary
// | drill/traffic | drill/cargo | drill/performance | drill/coastal | drill/cargo-wise
// params: { fy: '2026-2027' | 'all', months: '4,5,6' | 'all', organisationId, kpi?, cargo?, commodity?, subcategoryId? }
export const TRAFFIC_DASHBOARD_PARTS = [
  'traffic', 'cargo', 'performance', 'coastal', 'summary',
  'drill/traffic', 'drill/cargo', 'drill/performance', 'drill/coastal', 'drill/cargo-wise',
];

export function fetchTrafficDashboardPart(part, params = {}, config = {}) {
  if (!TRAFFIC_DASHBOARD_PARTS.includes(part)) return Promise.reject(new Error(`Unknown dashboard part: ${part}`));
  return api.get(`/kpi/traffic/dashboard/${part}`, { ...config, params });
}

export default api;
