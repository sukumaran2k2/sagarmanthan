import { API_BASE, createApiClient } from '../../api';

const api = createApiClient({ baseURL: API_BASE });

export function fetchConsultantAppointmentDashboard() {
  return api.get('/consultant-appointment-dashboard');
}

export function fetchConsultantAppointments(params = {}) {
  return api.get('/consultant-appointment', { params });
}

export function createConsultantAppointment(payload) {
  return api.post('/consultant-appointment', payload);
}

export function updateConsultantAppointment(payload) {
  return api.put('/consultant-appointment', payload);
}

export function deleteConsultantAppointment(id, userId) {
  return api.delete(`/consultant-candidate-all-data/${id}/${userId}`);
}

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

// The Data List's Stage filter matches stage_name on the server, so the options have to come
// from the same master table rather than a list hardcoded in the page.
export function fetchConsultantStages() {
  return api.get('/mmt-dropdown/mmt_consultant_appointment_stage');
}

export function fetchConsultantReport() {
  return api.get('/consultantapp-report');
}

export function fetchConsultantDivisionReport(wingId) {
  return api.get(`/cadivision-report/${wingId}/`);
}

export function fetchCaWingWiseCandidates(wingId) {
  return api.get(`/wingwise-cacandidate/${wingId}/`);
}

export function fetchCaDivisionWiseCandidates(divisionId) {
  return api.get(`/divisionwise-cacandidate/${divisionId}/`);
}

export function addCandidateDetail(candidateData) {
  return api.post('/ca-candidate-detail', candidateData);
}

export function updateCandidateDetail(candidateData) {
  return api.put('/ca-candidate-detail', candidateData);
}

export function uploadCandidateDocument(formData) {
  return api.post('/ca-candidate-uploader', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export function fetchCandidateDetail(candidateId) {
  return api.get(`/ca-candidate-detail/${candidateId}`);
}

export function fetchCandidateDocument(candidateId) {
  return api.get(`/ca-candidate-detail-document/${candidateId}`);
}

export function fetchCandidatesByConsultantAppointmentId(consultantAppointmentId) {
  return api.get(`/get-ca-candidates/${consultantAppointmentId}`);
}

export function addConsultantID(payload) {
  return api.post('/add-consultant-id', payload);
}

export function deleteCandidateDetail(candidateId, userId) {
  return api.delete(`/ca-candidate-single/${candidateId}/${userId}`);
}

export default api;
