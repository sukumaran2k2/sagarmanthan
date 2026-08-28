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

function listParams(params = {}) {
  const query = {
    page: params.page || 1,
    limit: params.limit || 10,
  };
  if (params.financialYear) query.financialYear = params.financialYear;
  if (params.organisationId) query.organisationId = params.organisationId;
  if (params.organisationName) query.organisationName = params.organisationName;
  if (params.search) query.search = params.search;
  if (params.all) query.all = 1;
  return query;
}

const LIST_PATHS = {
  goods: '/gem-procurement-goods',
  services: '/gem-procurement-service',
  works: '/gem-procurement-work',
  total: '/gem-procurement-total',
};

const CREATE_PATHS = {
  goods: '/gem-procurement-goods',
  services: '/gem-procurement-service',
  works: '/gem-procurement-work',
};

const UPDATE_PATHS = {
  goods: '/edit-gem-procurement-goods',
  services: '/edit-gem-procurement-service',
  works: '/edit-gem-procurement-work',
};

const MONTHLY_PATHS = {
  goods: '/monthly-goods-data',
  services: '/monthly-service-data',
  works: '/monthly-work-data',
};

const MONTHLY_ID_KEYS = {
  goods: 'goodsGemID',
  services: 'serviceGemID',
  works: 'worksGemID',
};

const POTENTIAL_BODY_KEYS = {
  goods: 'goodsProcurementPotential',
  services: 'serviceProcurementPotential',
  works: 'worksProcurementPotential',
};

export function fetchGemList(category, params = {}, config = {}) {
  const path = LIST_PATHS[category] || LIST_PATHS.goods;
  return api.get(path, { params: listParams(params), ...config });
}

export function createGemTarget(category, payload) {
  const path = CREATE_PATHS[category];
  if (!path) throw new Error(`Unsupported category: ${category}`);
  const potentialKey = POTENTIAL_BODY_KEYS[category];
  return api.post(path, {
    financialYear: payload.financialYear,
    organisationId: payload.organisationId,
    [potentialKey]: payload.plannedPotential ?? payload[potentialKey],
  });
}

export function updateGemTarget(category, payload) {
  const path = UPDATE_PATHS[category];
  if (!path) throw new Error(`Unsupported category: ${category}`);
  const potentialKey = POTENTIAL_BODY_KEYS[category];
  return api.put(path, {
    financialYear: payload.financialYear,
    organisationId: payload.organisationId,
    [potentialKey]: payload.plannedPotential ?? payload[potentialKey],
  });
}

export function fetchGemMonthlyData(category, gemId) {
  const path = MONTHLY_PATHS[category];
  if (!path) throw new Error(`Unsupported category: ${category}`);
  return api.get(`${path}/${gemId}`);
}

export function saveGemMonthlyData(category, gemId, monthlyPayload) {
  const path = MONTHLY_PATHS[category];
  const idKey = MONTHLY_ID_KEYS[category];
  if (!path || !idKey) throw new Error(`Unsupported category: ${category}`);
  return api.post(path, {
    [idKey]: gemId,
    ...monthlyPayload,
  });
}

export function fetchGemReport(year) {
  return api.get(`/gem-report/${year}`);
}

export function fetchOrganisationsDropdown() {
  return api.get('/mmt-dropdown/mmt_organisation');
}

export default api;
