import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

export function fetchAuditParas(userID) {
  return api.get('/audit-para', { params: { userID } });
}

// Dashboard figures; wingId and category ('' = all) narrow them
export function fetchAuditParaDashboard(wingId, category) {
  const params = {};
  if (wingId) params.wingId = wingId;
  if (category) params.category = category;
  return api.get('/audit-para-dashboard', { params });
}

export function createAuditPara(payload) {
  return api.post('/audit-para', payload);
}

export function updateAuditPara(payload) {
  return api.put('/audit-para', payload);
}

export function deleteAuditPara(auditParaId) {
  return api.delete(`/audit-para/${auditParaId}`);
}

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

export default api;
