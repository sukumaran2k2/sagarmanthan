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
};

export default api;
