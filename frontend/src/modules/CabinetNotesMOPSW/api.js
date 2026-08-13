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

export function fetchCabinetNotes() {
  return api.get('/cabinet-mopsw');
}

export function fetchCabinetNoteById(id) {
  return api.get(`/cabinet-mopsw/${id}`);
}

export function createCabinetNote(payload) {
  return api.post('/cabinet-mopsw', payload);
}

export function updateCabinetNote(payload) {
  return api.put('/cabinet-mopsw', payload);
}

export function deleteCabinetNote(id, userId) {
  return api.delete(`/cabinet-mopsw/${id}/${userId}`);
}

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

export function fetchCabinetStages() {
  return api.get('/mmt-dropdown/mmt_cabinet_mopsw_stage');
}

export function fetchNoteDocuments(id) {
  return api.get(`/mopsw-document/${id}`);
}

export function uploadNoteDocuments(formData) {
  return api.post('/mopsw-document-uploader', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function downloadNoteDocumentUrl(noteId, fileName) {
  const q = encodeURIComponent(fileName || '');
  return `${API_BASE}/cabinet_notes_mopsw/download/${noteId}?file=${q}`;
}

export async function downloadNoteDocument(noteId, fileName) {
  const res = await api.get(`/cabinet_notes_mopsw/download/${noteId}`, {
    params: { file: fileName },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'document.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function fetchCabinetWingWiseReport() {
  return api.get('/cabinetmopsw-report');
}

export function fetchCabinetDivisionWiseReport(wingId) {
  return api.get(`/cabinetmopsw-divisionwise/${wingId}/`);
}

export function fetchCabinetWingDetail(wingId, stage) {
  return api.get(`/getmopsw-wingwise/${wingId}/${stage}`);
}

export function fetchCabinetDivisionDetail(divisionId, stage) {
  return api.get(`/getmopsw-divisionwise/${divisionId}/${stage}`);
}

export default api;
