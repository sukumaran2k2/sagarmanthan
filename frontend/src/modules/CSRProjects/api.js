import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

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

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const res = await axios.post(`${API_BASE}/refresh-token`, { refreshToken });
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

export const getUserIdFromToken = () => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Number(payload.userId) || 1;
    } catch (e) {
      console.error('Error parsing token', e);
    }
  }
  return 1;
};

// --- CSR Projects APIs ---
export const fetchCsrProjectsList = async (userId = getUserIdFromToken()) => {
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
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const downloadCsrDocument = async (fileName) => {
  const response = await api.get(`/download-csrfile/${fileName}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const deleteCsrDocument = async (fileName) => {
  const response = await api.delete(`/delete-csrfile`, {
    params: { fileName }
  });
  return response.data;
};

export const fetchCsrExpenditureCost = async (csrProjectId) => {
  const response = await api.get(`/get-csr-expenditure/${csrProjectId}`);
  return response.data;
};

export const addCsrExpenditure = async (payload) => {
  const response = await api.post('/add-csr-expenditure', payload);
  return response.data;
};

export const fetchCsrGalleryFiles = async (csrProjectId) => {
  const response = await api.get(`/get-csr-project-files/${csrProjectId}`);
  return response.data;
};

export const uploadCsrGalleryFiles = async (csrProjectId, formData) => {
  const response = await api.post(`/update-csr-gallery-upload/${csrProjectId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteCsrGalleryFile = async (csrProjectId, filename) => {
  const response = await api.delete(`/delete-csr-gallery-file/${csrProjectId}/${filename}`);
  return response.data;
};

// --- CSR Fund Details APIs ---
export const fetchCsrFundList = async (userId = getUserIdFromToken()) => {
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

// --- Dashboard & Drilldowns APIs ---
export const fetchCsrDashboard = async (clusterId = 0, orgId = 0, fy = 'all', focusId = 0) => {
  const response = await api.get(`/get-csr-project-dashboard/${clusterId}/${orgId}/${fy}/${focusId}`);
  return response.data;
};

export const fetchCsrFundAllocated = async (clusterId = 0, orgId = 0, fy = 'all', focusId = 0) => {
  const response = await api.get(`/get-csr-fund-allocatted/${clusterId}/${orgId}/${fy}/${focusId}`);
  return response.data;
};

export const fetchCsrProjectStageWise = async (clusterId = 0, orgId = 0, fy = 'all', focusId = 0) => {
  const response = await api.get(`/get-csr-project-stage-wise/${clusterId}/${orgId}/${fy}/${focusId}`);
  return response.data;
};

export const fetchCsrProjectCountWise = async (clusterId = 0, orgId = 0, fy = 'all', focusId = 0) => {
  const response = await api.get(`/get-csr-project-count-wise/${clusterId}/${orgId}/${fy}/${focusId}`);
  return response.data;
};

export const fetchDetailedCsrProjects = async (clusterId = 0, orgId = 0, fy = 'all', stage = 'all', focusId = 0) => {
  const response = await api.get(`/get-detailed-csr-projects/${clusterId}/${orgId}/${fy}/${stage}/${focusId}`);
  return response.data;
};

// --- Reports APIs ---
export const fetchCsrAbstractReport = async (userId = getUserIdFromToken()) => {
  const response = await api.get(`/get-csr-project-overview-reports/${userId}`);
  return response.data;
};

export const fetchCsrDetailedReport = async (orgId, orgName) => {
  const response = await api.get(`/get-csr-projects-detailed-reports/${orgId}/${encodeURIComponent(orgName)}`);
  return response.data;
};

export const fetchCsrExpenditureReport = async (userId = getUserIdFromToken()) => {
  const response = await api.get(`/get-csr-fund-expenditure-report/${userId}`);
  return response.data;
};

// Master Dropdowns
export const fetchOrganisations = async () => {
  try {
    const response = await api.get('/mmt-dropdown/mmt_organisation');
    return response.data;
  } catch {
    return [];
  }
};

export const fetchClusters = async () => {
  try {
    const response = await api.get('/mmt-dropdown/mmt_hr_cluster');
    return response.data;
  } catch {
    return [];
  }
};

export default api;
