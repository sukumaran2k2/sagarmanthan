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

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

export function fetchBills() {
  return api.get('/bill');
}

export function createBill(payload) {
  return api.post('/bill', payload);
}

export function updateBill(payload) {
  return api.put('/bill', payload);
}

export function deleteBill(billId, userId) {
  return api.delete(`/delete-bill/${billId}/${userId}`);
}

export function fetchBillWingWiseReport() {
  return api.get('/billwingwise-report');
}

export function fetchBillDivisionWiseReport(wingId) {
  return api.get(`/billdivisionwise-report/${wingId}`);
}

export function fetchBillWingWiseDetail(wingId, stageId) {
  return api.get(`/getbill-wingwise/${wingId}/${stageId}`);
}

export function fetchBillDivisionWiseDetail(divisionId, stageId) {
  return api.get(`/getbill-divisionwise/${divisionId}/${stageId}`);
}

export default api;
