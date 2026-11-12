import { axiosInstance } from '../../api';

// ── Dashboard ──

export function fetchNmpDashboard(params = {}) {
  return axiosInstance.get('/nmp/dashboard', { params });
}

// ── Land Abstract List ──

export function fetchLandAbstractList(params = {}, config = {}) {
  return axiosInstance.get('/nmp/land-abstract', { params, ...config });
}

// ── Past Land - NMP Plan for Ports ──

export function fetchPastLandList(params = {}, config = {}) {
  return axiosInstance.get('/nmp/past-land', { params, ...config });
}

// ── Future Land - NMP Plan for Ports ──

export function fetchFutureLandList(params = {}, config = {}) {
  return axiosInstance.get('/nmp/future-land', { params, ...config });
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
