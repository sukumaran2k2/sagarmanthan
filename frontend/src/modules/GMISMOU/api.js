import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-refresh expired access token on 401 response
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/refresh-token`, { refreshToken });
          const newAccessToken = res.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.clear();
          window.location.href = '/';
          return Promise.reject(refreshErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

// GMIS & IMW API Endpoints
export function fetchGmisMouPaginated(params = {}) {
  return api.get('/get-gmis-mou-paginated', { params });
}

export function fetchGmisMouData(roleId = 2, organisationId = 0) {
  return api.get(`/get-gmis-mou-data/${roleId}/${organisationId}`);
}

export function fetchGmisMouDataById(mouId) {
  return api.get(`/get-gmis-mou-data-by-id/${mouId}`);
}

export function submitGmisMouData(payload) {
  return api.post('/submit-gmis-mou-data', payload);
}

export function updateGmisMouData(payload) {
  return api.put('/update-gmis-mou-data', payload);
}

export function uploadGmisDocument(formData) {
  return api.post('/gmisdocumentUploader', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function fetchMouCategoryNames() {
  return api.get('/get-mou-category-names');
}

export function fetchGmisMouChartData() {
  return api.get('/get-gmis-mou-chart-data');
}

export function fetchOrganisationWiseCountAmount() {
  return api.get('/get-organisation-wise-count-amount');
}

export function fetchStatusWiseCount() {
  return api.get('/get-status-wise-count');
}

export function fetchGmisSecondParty() {
  return api.get('/get-gismou-second-party');
}

export function fetchGmisNavicVibhas() {
  return api.get('/get-gismou-vibhas-navic-cell');
}

export function fetchGmisPresentStatus() {
  return api.get('/get-gismou-present-status');
}

export function fetchMouTotalCountAmount() {
  return api.get('/get-mou-total-count-amount');
}

export function fetchYearWiseGmisData() {
  return api.get('/get-yearwise-gmis-data');
}

export function fetchGmisDrilldownData(params = {}) {
  return api.get('/get-gmis-drilldown-data', { params });
}

export function fetchOrganisations() {
  return api.get('/mmt-dropdown/mmt_organisation');
}

export function addRevisedPhysicalProgressDate(payload) {
  return api.post('/add-revised-physical-progress-date', payload);
}

export function addRevisedFinancialProgressDate(payload) {
  return api.post('/add-revised-financial-progress-date', payload);
}

export function fetchRevisedPhysicalProgressDate(mouId) {
  return api.get(`/get-revised-physical-progress-date/${mouId}`);
}

export function fetchRevisedFinancialProgressDate(mouId) {
  return api.get(`/get-revised-financial-progress-date/${mouId}`);
}

export default api;
