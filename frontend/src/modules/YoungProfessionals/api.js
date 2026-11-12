import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

// Explicit YP Module CRUD Endpoints
export function fetchYoungProfessionals(params = {}) {
  return api.get('/young-professional', { params });
}

export function fetchYoungProfessionalById(id) {
  return api.get('/young-professional', { params: { search: id } });
}

export function createYoungProfessional(payload) {
  return api.post('/young-professional', payload);
}

export function updateYoungProfessional(id, payload) {
  return api.put(`/young-professional/${id}`, payload);
}

// Hard-delete endpoint — backend wired, but no UI confirmation modal yet.
// Wire to a dedicated "Delete" action (separate from Relieve) before exposing to users.
export function deleteYoungProfessional(id) {
  return api.delete(`/delete-young-professional/${id}`);
}

export function fetchYpWingCandidates(wingId) {
  return api.get(`/wingwise-ypcandidate/0/${wingId}`);
}

export function uploadYPDocument(candidateId, formData) {
  return api.post(`/upload-yp-document/${candidateId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export function relieveYoungProfessional(payload) {
  return api.put('/relieve-young-professional', payload);
}

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

export function fetchYpReport() {
  return api.get('/yp-report');
}

export function fetchYPDivisionWiseCandidates(divisionId) {
  return api.get(`/divisionwise-ypcandidate/0/${divisionId}`);
}

export default api;
