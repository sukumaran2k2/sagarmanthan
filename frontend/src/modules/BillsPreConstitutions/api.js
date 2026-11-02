import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// A stalled request fails after 30 s, so the page shows its error and Retry instead of loading forever
const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

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

// Dashboard figures; wingId narrows the cards, heat map and long-pending list
export function fetchBillDashboard(wingId) {
  return api.get('/bill-dashboard', { params: wingId ? { wingId } : {} });
}

export function fetchBills(userID) {
  return api.get('/bill', { params: { userID } });
}

export function createBill(payload) {
  return api.post('/bill', payload);
}

export function updateBill(payload) {
  return api.put('/bill', payload);
}

export function deleteBill(billId) {
  return api.delete(`/delete-bill/${billId}`);
}

export function fetchBillWingWiseReport() {
  return api.get('/billwingwise-report');
}

export function fetchBillDivisionWiseReport(wingId) {
  return api.get(`/billdivisionwise-report/${wingId}`);
}

// Every wing with each of its divisions (and wings without divisions), in one request
export function fetchBillAbstractReport() {
  return api.get('/bill-abstract-report');
}

export function fetchBillWingWiseDetail(wingId, stageId) {
  return api.get(`/getbill-wingwise/${wingId}/${stageId}`);
}

export function fetchBillDivisionWiseDetail(divisionId, stageId) {
  return api.get(`/getbill-divisionwise/${divisionId}/${stageId}`);
}

export default api;
