import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({ baseURL: API_BASE });
const LOCAL_FALLBACK_BASE = 'http://localhost:3000';

function shouldRetryWithLocalFallback(error) {
  const configured = String(API_BASE || '').toLowerCase();
  const isNetworkError = error?.code === 'ERR_NETWORK' || error?.message === 'Network Error';
  return isNetworkError && configured.includes('localhost:3001');
}

async function requestWithLocalFallback(method, path, dataOrConfig, maybeConfig) {
  try {
    if (method === 'get') return await api.get(path, dataOrConfig || {});
    if (method === 'post') return await api.post(path, dataOrConfig, maybeConfig || {});
    if (method === 'put') return await api.put(path, dataOrConfig, maybeConfig || {});
    return await api.request({ method, url: path, ...(maybeConfig || {}) });
  } catch (error) {
    if (!shouldRetryWithLocalFallback(error)) throw error;

    if (method === 'get') {
      return api.get(path, { ...(dataOrConfig || {}), baseURL: LOCAL_FALLBACK_BASE });
    }
    if (method === 'post') {
      return api.post(path, dataOrConfig, { ...(maybeConfig || {}), baseURL: LOCAL_FALLBACK_BASE });
    }
    if (method === 'put') {
      return api.put(path, dataOrConfig, { ...(maybeConfig || {}), baseURL: LOCAL_FALLBACK_BASE });
    }
    return api.request({ method, url: path, baseURL: LOCAL_FALLBACK_BASE, ...(maybeConfig || {}) });
  }
}

async function getWithLocalFallback(path, config = {}) {
  return requestWithLocalFallback('get', path, config);
}

async function postWithLocalFallback(path, data, config = {}) {
  return requestWithLocalFallback('post', path, data, config);
}

async function putWithLocalFallback(path, data, config = {}) {
  return requestWithLocalFallback('put', path, data, config);
}

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
  return getWithLocalFallback(path, { params: listParams(params), ...config });
}

export function createGemTarget(category, payload) {
  const path = CREATE_PATHS[category];
  if (!path) throw new Error(`Unsupported category: ${category}`);
  const potentialKey = POTENTIAL_BODY_KEYS[category];
  return postWithLocalFallback(path, {
    financialYear: payload.financialYear,
    organisationId: payload.organisationId,
    [potentialKey]: payload.plannedPotential ?? payload[potentialKey],
  });
}

export function updateGemTarget(category, payload) {
  const path = UPDATE_PATHS[category];
  if (!path) throw new Error(`Unsupported category: ${category}`);
  const potentialKey = POTENTIAL_BODY_KEYS[category];
  return putWithLocalFallback(path, {
    financialYear: payload.financialYear,
    organisationId: payload.organisationId,
    [potentialKey]: payload.plannedPotential ?? payload[potentialKey],
  });
}

export function fetchGemMonthlyData(category, gemId) {
  const path = MONTHLY_PATHS[category];
  if (!path) throw new Error(`Unsupported category: ${category}`);
  return getWithLocalFallback(`${path}/${gemId}`);
}

export function saveGemMonthlyData(category, gemId, monthlyPayload) {
  const path = MONTHLY_PATHS[category];
  const idKey = MONTHLY_ID_KEYS[category];
  if (!path || !idKey) throw new Error(`Unsupported category: ${category}`);
  return postWithLocalFallback(path, {
    [idKey]: gemId,
    ...monthlyPayload,
  });
}

export function fetchGemReport(year) {
  return getWithLocalFallback(`/gem-report/${year}`);
}

export function fetchGemSummaryReport(year) {
  return getWithLocalFallback(`/gem-summary-report/${year}`);
}

export function fetchGemYoYReport() {
  return getWithLocalFallback('/gem-yoy-report');
}

export function fetchOrganisationsDropdown() {
  return getWithLocalFallback('/mmt-dropdown/mmt_organisation');
}

export default api;
