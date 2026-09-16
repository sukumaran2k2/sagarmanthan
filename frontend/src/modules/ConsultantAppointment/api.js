import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const res = await axios.get(`${API_BASE}/refresh-token`, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  const next = res.data?.accessToken;
  if (!next) throw new Error('Refresh failed');
  localStorage.setItem('accessToken', next);
  return next;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const token = await refreshPromise;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return Promise.reject(error);
    }
  }
);

export function fetchConsultantAppointments(params = {}) {
  return api.get('/consultant-appointment', { params });
}

export function fetchConsultantAppointmentById(id) {
  return api.get(`/edit-consultant-appointment/${id}`);
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

export function fetchConsultantReport() {
  return api.get('/consultantapp-report');
}

export function fetchConsultantDivisionReport(wingId) {
  return api.get(`/consultantapp-division-report/${wingId}`);
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
