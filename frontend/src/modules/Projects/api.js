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
  if (!refreshToken) throw new Error('No refresh token');

  const res = await axios.get(`${API_BASE}/refresh-token`, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

  const nextToken = res.data?.accessToken;
  if (!nextToken) throw new Error('Refresh failed');

  localStorage.setItem('accessToken', nextToken);
  return nextToken;
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

function toProjectListParams(params = {}) {
  const query = {
    page: params.page || 1,
    limit: params.limit || 10,
  };

  const search = String(params.search || '').trim();
  if (search) query.search = search;

  if (params.projectStage && params.projectStage !== 'All') {
    query.projectStage = params.projectStage;
  }

  if (params.projectCategory && params.projectCategory !== 'All') {
    query.projectCategory = params.projectCategory;
  }

  if (params.organisationId) {
    query.organisationId = params.organisationId;
  }

  if (params.state) {
    query.state = params.state;
  }

  if (params.financialYear) {
    query.financialYear = params.financialYear;
  }

  return query;
}

export function fetchMmtDropdown(tid) {
  return api.get(`/mmt-dropdown/${tid}`);
}

export function fetchProjectList({ userId, ...params }, config = {}) {
  if (!userId) {
    throw new Error('User ID is required to fetch projects list.');
  }

  return api.get(`/project-list/${userId}`, {
    params: toProjectListParams(params),
    timeout: config.timeout ?? 20000,
    ...config,
  });
}

export function createProjectBasicInformation(payload) {
  return api.post('/add-newproject', payload);
}

export function updateProjectBasicInformation(payload) {
  return api.put('/viewproject-update', payload);
}

export function fetchEditProjectData(projectID, subProjectID) {
  return api.get(`/get-editprojectdata/${projectID}/${subProjectID}`);
}

export function submitPlanningSanctioning(payload) {
  return api.post('/planning-sanctioning', payload);
}

export function fetchPlanningSanctioning(projectID, subProjectID) {
  return api.get(`/planning-sanctioning/${projectID}/${subProjectID}`);
}

export function submitUnderTenderingDates(payload) {
  return api.post('/undertendering', payload);
}

export function fetchUnderTenderingDates(projectID, subProjectID) {
  return api.get(`/undertendering/${projectID}/${subProjectID}`);
}

export function submitUnderTenderingCostAndCalls(payload) {
  return api.post('/awardofcontract-cost', payload);
}

export function fetchUnderTenderingCostAndCalls(subProjectID, projectID) {
  return api.get(`/awardofcontract-cost/${subProjectID}/${projectID}`);
}

export function submitUnderImplementationProgress(payload) {
  return api.post('/add-physical-progress', payload);
}

export function submitUnderImplementationMilestones(payload) {
  return api.post('/milestone', payload);
}

export function fetchUnderImplementationMilestones(projectID, subProjectID) {
  return api.get(`/milestone/${projectID}/${subProjectID}`);
}

export function fetchPhysicalProgress(projectID, subProjectID) {
  return api.get(`/get-progress-value/${projectID}/${subProjectID}`);
}

export function fetchDelayReason(projectID, subProjectID) {
  return api.get(`/get-delay-reason/${projectID}/${subProjectID}`);
}

export function fetchInaugurationDates(projectID, subProjectID) {
  return api.get(`/get-inauguration-dates/${projectID}/${subProjectID}`);
}

export function fetchFundingComponents(projectID, subProjectID) {
  return api.get(`/get-component/${projectID}/${subProjectID}`);
}

export function fetchExpenditureDetails(projectID, subProjectID) {
  return api.get(`/get-expenditure-detail/${projectID}/${subProjectID}`);
}

export function fetchTotalExpenditureValue(projectID, subProjectID) {
  return api.get(`/get-total-expenditure-value/${projectID}/${subProjectID}`);
}

export function fetchExpenditureMainFinancialYear(projectID, subProjectID, financialYear, month) {
  return api.get(
    `/get-expenditure-main-financial-year/${projectID}/${subProjectID}/${encodeURIComponent(financialYear)}/${month}`
  );
}

export function submitExpenditureDetail(payload) {
  return api.post('/add-expenditure-detail', payload);
}

export function fetchExpenditureOutlay(projectID, subProjectID) {
  return api.get(`/get-expenditure-outlay/${projectID}/${subProjectID}`);
}

export function submitExpenditureOutlay(payload) {
  return api.post('/add-expenditure-outlay', payload);
}

export function submitProjectCompletion(payload) {
  return api.post('/completionpage', payload);
}

export function fetchProjectCompletion(projectID, subProjectID) {
  return api.get(`/completionpage/${projectID}/${subProjectID}`);
}

export function fetchProjectDocuments(projectID, subProjectID) {
  return api.get(`/get-project-documents/${projectID}/${subProjectID}`);
}

export function uploadProjectDocuments(formData) {
  return api.post('/add-basic-project-document-uploader', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function deleteProjectDocumentByName(projectID, subProjectID, documentName) {
  return api.delete(`/delete-project-document/${projectID}/${subProjectID}/${encodeURIComponent(documentName)}`);
}

export function downloadProjectDocumentFile(projectID, subProjectID, documentName) {
  return api.get(`/download-project-document/${projectID}/${subProjectID}/${encodeURIComponent(documentName)}`, {
    responseType: 'blob',
  });
}

export function requestDropProject(payload) {
  return api.post('/dropproject-request', payload);
}

export function fetchDropRequests(userId) {
  return api.get(`/viewdrop-projectlist/${userId}`);
}

export function acceptDropRequest(projectId, subProjectId) {
  return api.put(`/delete-project/${projectId}/${subProjectId}`);
}

export function rejectDropProject(payload) {
  return api.post('/reject-project-drop-request', payload);
}

export default api;
