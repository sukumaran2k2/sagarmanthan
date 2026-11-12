import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

// The backend scopes the list to the signed-in user (from the token)
export function fetchCabinetMinistry() {
  return api.get('/cabinet-ministry');
}

export function fetchCabinetNotesOtherDashboard() {
  return api.get('/cabinet-notes-other-dashboard');
}

export function fetchCabinetMinistryById(id) {
  return api.get(`/cabinet-ministry-update/${id}`);
}

export function createCabinetMinistry(payload) {
  return api.post('/cabinet-ministry', payload);
}

export function updateCabinetMinistry(payload) {
  return api.put('/cabinet-ministry', payload);
}

export function deleteCabinetMinistry(id) {
  return api.delete(`/cabinet-ministry/${id}`);
}

export function fetchMinistryList() {
  return api.get('/allvalue-dropdown/mmt_ministry');
}

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDropdownAllValues(tableName = 'mmt_cabinet_ministry_stage') {
  return api.get(`/allvalue-dropdown/${tableName}`);
}

export function fetchCabinetMinistryReport() {
  return api.get('/cabinetministry-report');
}

export function fetchDetailMinistryReport(ministryId, stageId = 'all') {
  return api.get(`/detailministry-report/${ministryId}/${stageId}`);
}

export function fetchCabinetMinistryPendencyReport() {
  return api.get('/minstry-pendencyreport');
}

export function fetchDetailMinistryPendencyReport(ministryId, countDate = 'all') {
  return api.get(`/detailministry-pendencyreport/${ministryId}/${countDate}`);
}
