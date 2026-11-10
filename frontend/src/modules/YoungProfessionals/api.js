import { axiosInstance, API_BASE } from '../../api';

export { API_BASE };

// ── YP Module CRUD Endpoints ──

export function fetchYoungProfessionals(params = {}) {
  return axiosInstance.get('/young-professional', { params });
}

export function createYoungProfessional(payload) {
  return axiosInstance.post('/young-professional', payload);
}

export function updateYoungProfessional(id, payload) {
  return axiosInstance.put(`/young-professional/${id}`, payload);
}

export function fetchYpWingCandidates(wingId) {
  return axiosInstance.get(`/wingwise-ypcandidate/0/${wingId}`);
}

export function uploadYPDocument(candidateId, formData) {
  return axiosInstance.post(`/upload-yp-document/${candidateId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function relieveYoungProfessional(payload) {
  return axiosInstance.put('/relieve-young-professional', payload);
}

// ── Dropdowns ──

export function fetchWings() {
  return axiosInstance.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return axiosInstance.get('/mmt-dropdown/mmt_division');
}

// ── Reports ──

export function fetchYpReport() {
  return axiosInstance.get('/yp-report');
}

export function fetchYPDivisionWiseCandidates(divisionId) {
  return axiosInstance.get(`/divisionwise-ypcandidate/0/${divisionId}`);
}
