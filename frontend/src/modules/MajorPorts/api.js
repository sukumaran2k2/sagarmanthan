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
// write clears the response cache (shared by Traffic and Port Performance) so
// lists and the dashboard show the change.

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

// ---- Port Performance ----
// Same rules as Traffic: user and organisation come from the session token, GETs take
// { signal }, and every write clears the response cache.

/** Organisations visible to the user and the target KPI types. */
export function fetchPortPerformanceMasters() {
  return api.get('/kpi/port-performance/masters');
}

/** Entry window and the organisation's active ministry unlocks. */
export function fetchPortPerformanceEntryStatus() {
  return api.get('/kpi/port-performance/entry-status');
}

/** view: 'turnaround' | 'berthOutput' | 'timeAtPort' | 'vesselsCargo' | 'productivity' | 'callSize' */
export function fetchPortPerformanceActuals(params = {}, config = {}) {
  return api.get('/kpi/port-performance/actuals', { ...config, params });
}

export function fetchPortPerformancePeriod({ fiscalYear, month, organisationId }) {
  return api.get('/kpi/port-performance/period', { params: { fiscalYear, month, organisationId } });
}

/** Saves one input step: { fiscalYear, month, section, values: { column: number } } */
export function savePortPerformancePeriod(payload) {
  return afterWrite(api.post('/kpi/port-performance/period', payload));
}

export function deletePortPerformancePeriod({ fiscalYear, month }) {
  return afterWrite(api.delete('/kpi/port-performance/period', { params: { fiscalYear, month } }));
}

/** organisationId may also be 'overall' or 'total-smpa' (ministry users). */
export function fetchPortPerformanceTargets(params = {}, config = {}) {
  return api.get('/kpi/port-performance/targets', { ...config, params });
}

/** rowKey: 'org-<id>' | 'overall' | 'total-smpa' */
export function fetchPortPerformanceTargetRecord({ financialYear, rowKey }) {
  return api.get('/kpi/port-performance/targets/record', { params: { financialYear, rowKey } });
}

/** { financialYear, rowKey, values: { [kpiTypeId]: number | null } }; null clears a target. */
export function savePortPerformanceTargetRecord(payload) {
  return afterWrite(api.put('/kpi/port-performance/targets/record', payload));
}

export function deletePortPerformanceTargetRecord({ financialYear, rowKey }) {
  return afterWrite(api.delete('/kpi/port-performance/targets/record', { params: { financialYear, rowKey } }));
}

export function fetchPortPerformanceAccessGrants(params = {}, config = {}) {
  return api.get('/kpi/port-performance/access', { ...config, params });
}

/** { organisationIds: [], financialYears: [], months: [] | 'ALL', expiryDate?, remarks? } */
export function createPortPerformanceAccessGrant(payload) {
  return afterWrite(api.post('/kpi/port-performance/access', payload));
}

export function revokePortPerformanceAccessGrant(accessId) {
  return afterWrite(api.patch(`/kpi/port-performance/access/${accessId}/revoke`));
}

// Same rules as Traffic: user and organisation come from the session token, GETs take
// { signal }, and every write clears the response cache. There is no monthly entry window.

/** Organisations visible to the user. */
export function fetchFinancialParameterMasters() {
  return api.get('/kpi/financial-parameters/masters');
}

/** Monthly records: { fiscalYear?, month?, organisationId?, search?, page, limit } */
export function fetchFinancialParameterActuals(params = {}, config = {}) {
  return api.get('/kpi/financial-parameters/actuals', { ...config, params });
}

export function fetchFinancialParameterActual(id) {
  return api.get(`/kpi/financial-parameters/actuals/${id}`);
}

/** { fiscalYear, month, values: { column: number | null } }; the calculated values are set by the server. */
export function createFinancialParameterActual(payload) {
  return afterWrite(api.post('/kpi/financial-parameters/actuals', payload));
}

/** { values: { column: number | null } } */
export function updateFinancialParameterActual(id, payload) {
  return afterWrite(api.put(`/kpi/financial-parameters/actuals/${id}`, payload));
}

export function deleteFinancialParameterActual(id) {
  return afterWrite(api.delete(`/kpi/financial-parameters/actuals/${id}`));
}

export function fetchFinancialParameterTargets(params = {}, config = {}) {
  return api.get('/kpi/financial-parameters/targets', { ...config, params });
}

/** { financialYear, organisationId, values: { key: number } } */
export function createFinancialParameterTarget(payload) {
  return afterWrite(api.post('/kpi/financial-parameters/targets', payload));
}

/** { values: { key: number } } */
export function updateFinancialParameterTarget(id, payload) {
  return afterWrite(api.put(`/kpi/financial-parameters/targets/${id}`, payload));
}

export function deleteFinancialParameterTarget(id) {
  return afterWrite(api.delete(`/kpi/financial-parameters/targets/${id}`));
}

// Financial dashboard: the earlier portal's queries. part = summary (the eight cards) | drill (one card's detail)
// params: { fy: '2026-2027' | 'all', months: '4,5,6' | 'all', organisationId, kpi? (drill) }
export const FINANCIAL_DASHBOARD_PARTS = ['summary', 'drill'];

export function fetchFinancialDashboardPart(part, params = {}, config = {}) {
  if (!FINANCIAL_DASHBOARD_PARTS.includes(part)) return Promise.reject(new Error(`Unknown dashboard part: ${part}`));
  return api.get(`/kpi/financial-parameters/dashboard/${part}`, { ...config, params });
}

// ---- Cruise and Passenger Traffic ----
// Same rules as Financial Parameters: user and organisation come from the session token, GETs take
// { signal }, every write clears the response cache, and there is no monthly entry window.

/** Organisations visible to the user. */
export function fetchCruisePassengerMasters() {
  return api.get('/kpi/cruise-passenger-traffic/masters');
}

/** Monthly records: { fiscalYear?, month?, organisationId?, search?, page, limit } */
export function fetchCruisePassengerActuals(params = {}, config = {}) {
  return api.get('/kpi/cruise-passenger-traffic/actuals', { ...config, params });
}

export function fetchCruisePassengerActual(id) {
  return api.get(`/kpi/cruise-passenger-traffic/actuals/${id}`);
}

/** { fiscalYear, month, handlesPassengerFerry, values: { column: number } }; ferry values only when handled. */
export function createCruisePassengerActual(payload) {
  return afterWrite(api.post('/kpi/cruise-passenger-traffic/actuals', payload));
}

/** { handlesPassengerFerry, values: { column: number } } */
export function updateCruisePassengerActual(id, payload) {
  return afterWrite(api.put(`/kpi/cruise-passenger-traffic/actuals/${id}`, payload));
}

export function deleteCruisePassengerActual(id) {
  return afterWrite(api.delete(`/kpi/cruise-passenger-traffic/actuals/${id}`));
}

export function fetchCruisePassengerTargets(params = {}, config = {}) {
  return api.get('/kpi/cruise-passenger-traffic/targets', { ...config, params });
}

/** { financialYear, organisationId, values: { target_cruise_vessel_calls, target_ferry_calls } } */
export function createCruisePassengerTarget(payload) {
  return afterWrite(api.post('/kpi/cruise-passenger-traffic/targets', payload));
}

/** { values: { target_cruise_vessel_calls, target_ferry_calls } } */
export function updateCruisePassengerTarget(id, payload) {
  return afterWrite(api.put(`/kpi/cruise-passenger-traffic/targets/${id}`, payload));
}

export function deleteCruisePassengerTarget(id) {
  return afterWrite(api.delete(`/kpi/cruise-passenger-traffic/targets/${id}`));
}

export default api;
