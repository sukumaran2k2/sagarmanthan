import axios from 'axios';
import { refreshAccessToken } from '../../utils/sessionRefresh';
import { getCurrentUserId } from '../../utils/authSession';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// A stalled request fails after 30 s, so the page shows its error instead of loading forever
// (QC CSR-06); file uploads get longer
const api = axios.create({ baseURL: API_BASE, timeout: 30000 });
const UPLOAD_TIMEOUT = 180000;

// Request Interceptor: Automatically attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-refresh on 401 Unauthorized
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

// The server scopes CSR data by the signed token; the user id some routes still carry in
// their path (from 2.0) is ignored there.
const pathUserId = () => getCurrentUserId() || 0;

// --- CSR Projects APIs ---
export const fetchCsrProjectsList = async (userId = pathUserId()) => {
  const response = await api.get(`/csr-projects-list/${userId}`);
  return response.data;
};

export const fetchCsrProjectById = async (csrProjectId) => {
  const response = await api.get(`/csr-list/${csrProjectId}`);
  return response.data;
};

export const createCsrProject = async (payload) => {
  const response = await api.post('/add-csr-projects', payload);
  return response.data;
};

export const updateCsrProject = async (payload) => {
  const response = await api.put('/update-csr-list', payload);
  return response.data;
};

export const uploadCsrDocument = async (formData) => {
  const response = await api.post('/csrprojectdocument', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT,
  });
  return response.data;
};

export const downloadCsrDocument = async (fileName) => {
  const response = await api.get(`/download-csrfile/${encodeURIComponent(fileName)}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const fetchCsrExpenditureCost = async (csrProjectId) => {
  const response = await api.get(`/get-csr-expenditure/${csrProjectId}`);
  return response.data;
};

export const fetchCsrGalleryFiles = async (csrProjectId) => {
  const response = await api.get(`/get-csr-project-files/${csrProjectId}`);
  return response.data;
};

export const uploadCsrGalleryFiles = async (csrProjectId, formData) => {
  const response = await api.post(`/update-csr-gallery-upload/${csrProjectId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT,
  });
  return response.data;
};

// --- CSR Fund Details APIs ---
export const fetchCsrFundList = async (userId = pathUserId()) => {
  const response = await api.get(`/csr-Fund-list/${userId}`);
  return response.data;
};

export const fetchCsrFundById = async (csrFundId) => {
  const response = await api.get(`/csr-update-fundlist/${csrFundId}`);
  return response.data;
};

export const createCsrFund = async (payload) => {
  const response = await api.post('/add-csr-Fund', payload);
  return response.data;
};

export const updateCsrFund = async (payload) => {
  const response = await api.post('/csrFund-edit', payload);
  return response.data;
};

// --- Dashboard ---
// Every dashboard figure in one call. params: { clusterId, organisationId, fy, focusId }
export const fetchCsrDashboardData = async (params) => {
  const response = await api.get('/get-csr-dashboard', { params });
  return response.data;
};

export const fetchCsrFundYearWiseReport = async (fy = 'all') => {
  const response = await api.get(`/get-csr-fund-year-wise-report/${fy}`);
  return response.data;
};

export const fetchCsrFundOrgWiseReport = async (fy = 'all') => {
  const response = await api.get(`/get-csr-fund-org-wise-report/${fy}`);
  return response.data;
};

export const fetchCsrFundOrgTrendReport = async (orgId = 'all') => {
  const response = await api.get(`/get-csr-fund-org-trend-report/${orgId}`);
  return response.data;
};

export const fetchCsrProjectsYearWiseSummary = async (orgId = 'all') => {
  const response = await api.get(`/get-csr-projects-year-wise-summary/${orgId}`);
  return response.data;
};

export const fetchCsrProjectsOrgWiseSummary = async () => {
  const response = await api.get(`/get-csr-projects-org-wise-summary`);
  return response.data;
};

export const fetchCsrProjectsFocusWiseSummary = async (orgId = 'all') => {
  const response = await api.get(`/get-csr-projects-focus-wise-summary/${orgId}`);
  return response.data;
};

// Master Dropdowns
export const fetchOrganisations = async () => {
  const response = await api.get('/mmt-dropdown/mmt_organisation');
  return response.data;
};

export const fetchClusters = async () => {
  const response = await api.get('/mmt-dropdown/mmt_hr_cluster');
  return response.data;
};

export default api;
