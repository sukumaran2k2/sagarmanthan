import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

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
