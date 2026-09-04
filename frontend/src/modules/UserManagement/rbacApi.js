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

export const rbacApi = {
  getCategories: () => api.get('/rbac/usermatrix-categories'),
  getOrganisations: (categoryId) =>
    api.get('/rbac/organisations', {
      params: categoryId && categoryId !== 'all' ? { categoryId } : {},
    }),
  getModules: () => api.get('/rbac/modules'),
  getOrgModulePermissions: (organisationIds) =>
    api.get('/rbac/org-module-permissions', {
      params: { organisationIds: organisationIds.join(',') },
    }),
  saveOrgModulePermissions: (payload) =>
    api.put('/rbac/org-module-permissions', payload),
  getAllowedModules: (organisationId) =>
    api.get(`/rbac/org-allowed-modules/${organisationId}`),
  getMatrixUsers: (params) => api.get('/rbac/matrix-users', { params }),
  getUserModuleCrud: (userIds, organisationId) =>
    api.get('/rbac/user-module-crud', {
      params: {
        userIds: userIds.join(','),
        ...(organisationId ? { organisationId } : {}),
      },
    }),
  saveUserModuleCrud: (payload) => api.put('/rbac/user-module-crud', payload),
  getPermissionAudit: (params) => api.get('/rbac/permission-audit', { params }),
  getSagarbotPermissions: () => api.get('/rbac/sagarbot-permissions'),
  saveSagarbotPermissions: (payload) => api.put('/rbac/sagarbot-permissions', payload),
  resetSagarbotPermissions: () => api.post('/rbac/sagarbot-permissions/reset'),
};

export default api;
