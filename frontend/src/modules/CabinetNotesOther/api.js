import axios from 'axios';

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

export function fetchCabinetMinistry(userId = 1) {
  return api.get(`/cabinet-ministry/${userId}`);
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

export function deleteCabinetMinistry(id, userId = 1) {
  return api.delete(`/cabinet-ministry/${id}/${userId}`);
}

export function fetchMinistryList() {
  return api.get('/mmt-dropdown/mmt_ministry');
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
