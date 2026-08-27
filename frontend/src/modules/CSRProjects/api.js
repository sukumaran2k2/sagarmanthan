import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Request Interceptor: Automatically attach Bearer token
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

// Response Interceptor: Auto-refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');

        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/refresh-token`,
          { refreshToken }
        );

        const { accessToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.error('Session expired. Please log in again.', refreshErr);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
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
    const response = await api.get('/organisations');
    return response.data;
  } catch {
    return [];
  }
};

export const fetchClusters = async () => {
  try {
    const response = await api.get('/clusters');
    return response.data;
  } catch {
    return [];
  }
};

export default api;
