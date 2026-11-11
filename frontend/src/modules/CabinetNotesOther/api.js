import axios from 'axios';
import { refreshAccessToken } from '../../utils/sessionRefresh';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

// A new access token comes from the shared session refresh (cookie-based)

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
