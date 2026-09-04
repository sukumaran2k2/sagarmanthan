import { axiosInstance } from "../../api";
// ── CRUD Operations ──

export function fetchVIPReferences(params = {}, config = {}) {
  return axiosInstance.get('/vip-reference', { params, ...config });
}

export function fetchVIPReferenceById(id) {
  return axiosInstance.get(`/vip-reference/${id}`);
}

export function createVIPReference(payload) {
  return axiosInstance.post('/vip-reference', payload);
}

export function updateVIPReference(payload) {
  return axiosInstance.put('/vip-reference', payload);
}

export function deleteVIPReference(id, userId) {
  return axiosInstance.delete(`/vip-reference/${id}/${userId}`);
}

// ── Dropdowns ──

export function fetchWings() {
  return axiosInstance.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return axiosInstance.get('/mmt-dropdown/mmt_division');
}

export function fetchVIPStages() {
  return axiosInstance.get('/mmt-dropdown/mmt_vip_stage');
}

// ── Abstract Reports ──

export function fetchVIPWingWiseReport() {
  return axiosInstance.get('/vipwingwise-report');
}

export function fetchVIPDivisionWiseReport(wingId) {
  return axiosInstance.get(`/vipdivisionwise-report/${wingId}/`);
}

export function fetchVIPWingDetail(wingId, stageId) {
  const url = stageId !== undefined && stageId !== '' && stageId !== null
    ? `/getvip-wingwise/${wingId}/${stageId}`
    : `/getvip-wingwise/${wingId}/`;
  return axiosInstance.get(url);
}

export function fetchVIPDivisionDetail(divisionId, stageId) {
  const url = stageId !== undefined && stageId !== '' && stageId !== null
    ? `/getvip-divisionwise/${divisionId}/${stageId}`
    : `/getvip-divisionwise/${divisionId}/`;
  return axiosInstance.get(url);
}

// ── Pendency Reports ──

export function fetchVIPPendencyWingWiseReport() {
  return axiosInstance.get('/vip-pendencywingwise-report');
}

export function fetchVIPPendencyDivisionWiseReport(wingId) {
  return axiosInstance.get(`/vip-pendencydivisionwise-report/${wingId}/`);
}

export function fetchVIPPendencyWingDetail(wingId, countDate) {
  return axiosInstance.get(`/getvippendency-wingwise/${wingId}/${countDate}`);
}

export function fetchVIPPendencyDivisionDetail(divisionId, countDate) {
  return axiosInstance.get(`/getvippendency-divisionwise/${divisionId}/${countDate}`);
}

export {axiosInstance}
