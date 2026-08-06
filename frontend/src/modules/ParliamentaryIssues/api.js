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

export function fetchParliamentaryIssues() {
  return api.get('/parliamentary-issue');
}

export function fetchParliamentaryIssueById(id) {
  return api.get(`/parliamentary-issue/${id}`);
}

export function createParliamentaryIssue(payload) {
  return api.post('/parliamentary-issue', payload);
}

export function updateParliamentaryIssue(payload) {
  return api.put('/parliamentary-issue', payload);
}

export function deleteParliamentaryIssue(id, userId) {
  return api.delete(`/parliamentary-issue/${id}/${userId}`);
}

export function fetchWings() {
  return api.get('/mmt-dropdown/mmt_wings');
}

export function fetchDivisions() {
  return api.get('/mmt-dropdown/mmt_division');
}

export function fetchAllDivisions() {
  return api.get('/allvalue-dropdown/mmt_division');
}

export function fetchParliamentaryStages() {
  return api.get('/mmt-dropdown/mmt_parliamentary_stage');
}

export function fetchAssuranceWingWiseReport() {
  return api.get('/assurancewingwise-report');
}

export function fetchAssuranceDivisionWiseReport(wingId) {
  return api.get(`/assurancedivisionwise-report/${wingId}/`);
}

export function fetchAssuranceWingDetail(wingId, stage) {
  return api.get(`/getwingwise-assurance/${wingId}/${stage}`);
}

export function fetchAssuranceDivisionDetail(divisionId, stage) {
  return api.get(`/getdivisionwise-assurance/${divisionId}/${stage}`);
}

export function fetchMatterWingWiseReport(issueType) {
  return api.get(`/matterraised-wingwisereport/${encodeURIComponent(issueType)}/`);
}

export function fetchMatterDivisionWiseReport(wingId, issueType) {
  return api.get(
    `/matterraised-divisionwise/${wingId}/${encodeURIComponent(issueType)}/`
  );
}

export function fetchMatterWingDetail(wingId, stage, issueType) {
  return api.get(
    `/getwingwise-matter/${wingId}/${stage}/${encodeURIComponent(issueType)}/`
  );
}

export function fetchMatterDivisionDetail(divisionId, stage, issueType) {
  return api.get(
    `/getdivisionwise-matter/${divisionId}/${stage}/${encodeURIComponent(issueType)}/`
  );
}

export function fetchPscWingWiseReport() {
  return api.get('/psnwingwise-report');
}

export function fetchPscDivisionWiseReport(wingId) {
  return api.get(`/psndivisionwise-report/${wingId}/`);
}

export function fetchPscWingDetail(wingId, stage) {
  return api.get(`/getwingwise-psc/${wingId}/${stage}`);
}

export function fetchPscDivisionDetail(divisionId, stage) {
  return api.get(`/getdivisionwise-psc/${divisionId}/${stage}`);
}

export default api;
