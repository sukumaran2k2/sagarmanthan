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

// MIV Initiatives CRUD
export function fetchMIVData(params = {}) {
  return api.get('/miv-data', { params });
}

export function fetchMIVById(id) {
  return api.get(`/miv-datas/${id}`);
}

export function createMIVData(payload) {
  return api.post('/miv-data', payload);
}

export function updateMIVData(id, payload) {
  return api.put(`/miv-data/${id}`, payload);
}

export function uploadMIVFiles(formData) {
  return api.post('/miv-data/upload-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

// MIV Dashboard & Analytics
export function fetchMIVDashboard(params = {}) {
  return api.get('/get-miv-dashboard', { params });
}

export function fetchMIVActivityStatusWise(params = {}) {
  return api.get('/get-miv-activity-status-wise', { params });
}

export function fetchMIVActivityCurrentStatusPortWise(params = {}) {
  return api.get('/get-miv-activity-current-status-port-wise', { params });
}

export function fetchMIVCategoryCountWise(params = {}) {
  return api.get('/get-miv-category-count-wise', { params });
}

// MIV Meetings
export function fetchMIVMeetingsData() {
  return api.get('/miv-meetingsdata');
}

export function fetchMeetingLogsByOrg(orgId) {
  return api.get(`/meetinglogs-mopsw/${orgId}`);
}

export function createMeeting(formData) {
  return api.post('/meeting', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export function deleteMeeting(id) {
  return api.delete(`/meeting/delete/${id}`);
}

// Helpers & Dropdowns
export function fetchNewInitiatives() {
  return api.get('/miv-new-initiatives');
}

export function fetchInitiativeName(initiativeId) {
  return api.get(`/get-initiative-name/${initiativeId}`);
}

export function fetchInitiativeTargetDate(initiativeId) {
  return api.get(`/get-target-date/${initiativeId}`);
}

export function fetchOrganisations() {
  return api.get('/mmt-dropdown/mmt_organisation');
}

// Reports
export function fetchMIVAbstractReport(userId) {
  return api.get(`/mivabstract-report/${userId}`);
}

export function fetchMIVDetailedReport(payload) {
  return api.post('/mivdetailed-report/', payload);
}

export function fetchThemeValues() {
  return api.get('/get-mmt-Theme-Values/');
}

export function fetchThemeWiseMIVAbstractReport(userId) {
  return api.get(`/themewise-mivabstract-report/${userId}`);
}

export function fetchThemeWiseMIVDetailedReport(payload) {
  return api.post('/miv-theme-detailed-report/', payload);
}

export default api;
