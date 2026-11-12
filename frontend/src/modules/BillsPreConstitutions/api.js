import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

// A stalled request fails after 30 s, so the page shows its error and Retry instead of loading forever
const api = createApiClient({ timeout: 30000 });

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

// Dashboard figures; wingId narrows the cards, heat map and long-pending list
export function fetchBillDashboard(wingId) {
  return api.get('/bill-dashboard', { params: wingId ? { wingId } : {} });
}

export function fetchBills(userID) {
  return api.get('/bill', { params: { userID } });
}

export function createBill(payload) {
  return api.post('/bill', payload);
}

export function updateBill(payload) {
  return api.put('/bill', payload);
}

export function deleteBill(billId) {
  return api.delete(`/delete-bill/${billId}`);
}

export function fetchBillWingWiseReport() {
  return api.get('/billwingwise-report');
}

export function fetchBillDivisionWiseReport(wingId) {
  return api.get(`/billdivisionwise-report/${wingId}`);
}

// Every wing with each of its divisions (and wings without divisions), in one request
export function fetchBillAbstractReport() {
  return api.get('/bill-abstract-report');
}

export function fetchBillWingWiseDetail(wingId, stageId) {
  return api.get(`/getbill-wingwise/${wingId}/${stageId}`);
}

export function fetchBillDivisionWiseDetail(divisionId, stageId) {
  return api.get(`/getbill-divisionwise/${divisionId}/${stageId}`);
}

export default api;
