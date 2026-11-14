import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

const MMT_INSERT_MAP = {
  mmt_division:          { name: 'division_name', extras: { wingId: 'wing_id', divisionCode: 'division_code' } },
  mmt_wings:             { name: 'wing_name',     extras: { wingCode: 'wing_code' } },
  mmt_source_of_funding: { name: 'source_of_funding_name', extras: {} },
  mmt_output: { name: 'project_output_name', extras: { units: 'project_output_units' } },
  mmt_mp_constituency: { name: 'mpc_name', extras: { stateId: 'state_id' } },
  mmt_district: { name: 'district_name', extras: { stateId: 'state_id' } },
  mmt_section: { name: 'section_name', extras: { divId: 'division_id', sectionCode: 'section_code' } }, 
  mmt_department: { name: 'department_name', extras: { departmentCode: 'department_code' } }, 
  mmt_post: {
  name: null,
  extras: { postName: 'post_name', postCode: 'post_code', departmentId: 'department_id' },
},
mmt_outcome: {
  name: 'project_outcome_name',
  extras: { units: 'project_outcome_units', projectOutputId: 'project_output_id' },
},
  mmt_implementing_agency: { name: 'ia_name', extras: { iaCode: 'ia_code' } },
  mmt_organisation: {
    name: null,
    extras: {
      organisationName: 'organisation_name',
      organisationCode: 'organisation_code',
      organisationCategory: 'organisation_category_id',
      state: 'state_id',
      district: 'district_id',
      wing: 'wing_id',
      division: 'division_id',
    },
  },
};
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
  updateMmtData: (table, id, payload) => {
  if (!table) return Promise.reject(new Error('No master table provided'));

  const keys = Object.keys(payload);
  const nameKey = keys.find((k) => /_name$/i.test(k)) ?? keys[0];
  const map = MMT_INSERT_MAP[table] || { name: nameKey, extras: {} };

  const body = { TID: table, rowID: id };
  if (map.name) body.name = payload[map.name];
  Object.entries(map.extras).forEach(([backendKey, formKey]) => {
    const v = payload[formKey];
    body[backendKey] = v === '' || v === undefined ? null : v;
  });
  if (payload.status !== undefined) body.status = Number(payload.status); 
  console.log('PUT body →', body);
  return api.put('/mmt', body);
},
  getMmtList: (table) => api.get(`/mmt/${table}`),
  getMmtData: (table) => api.get(`/mmt-dropdown/${table}`),   // keep for the form's selects
  insertMmtData: (table, payload) => {
    if (!table) return Promise.reject(new Error('No master table provided'));

    // masters without an explicit mapping save one name field (createMmt reads body.name)
    const keys = Object.keys(payload);
    const nameKey = keys.find((k) => /_name$/i.test(k)) ?? keys[0];
    const map = MMT_INSERT_MAP[table] || { name: nameKey, extras: {} };

    const body = { TID: table };
    if (map.name) body.name = payload[map.name];
    Object.entries(map.extras).forEach(([backendKey, formKey]) => {
      const v = payload[formKey];
      body[backendKey] = v === '' || v === undefined ? null : v;
    });
    return api.post('/mmt', body);
  },
};

export default api;
