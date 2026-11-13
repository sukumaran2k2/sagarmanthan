import { axiosInstance } from '../../api';

// ── Dashboard ──

export function fetchNmpDashboard(params = {}) {
  return axiosInstance.get('/nmp/dashboard', { params });
}

// ── Land Abstract List ──

export function fetchLandAbstractList(userId, config = {}) {
  return axiosInstance.get(`/nmp/land-abstract/${userId}`, config);
}
export function fetchPastLandList(userId, config = {}) {
  return axiosInstance.get(`/nmp/past-land/${userId}`, config);
}
export function fetchFutureLandList(userId, config = {}) {
  return axiosInstance.get(`/nmp/future-land/${userId}`, config);
}

// ── CRUD ──

export function createNmpEntry(payload) {
  return axiosInstance.post('/nmp', payload);
}

export function updateNmpEntry(payload) {
  return axiosInstance.put('/nmp', payload);
}

export function deleteNmpEntry(id, userId, formType = 'future-land') {
  return axiosInstance.delete(`/nmp/${id}/${userId}`, { params: { form_type: formType } });
}

export function fetchNmpById(id, formType = 'future-land') {
  return axiosInstance.get(`/nmp/${id}`, { params: { form_type: formType } });
}

export const getNmpCaseNumber = (organisationId) =>
  axiosInstance.get(`/get-last-nmp-no/${organisationId}`);
