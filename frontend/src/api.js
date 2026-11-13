import axios from 'axios';
import { refreshAccessToken } from './utils/sessionRefresh';
import { getAccessToken, clearAccessToken } from './utils/tabSession';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://sagarmanthan.ntcpwc.net:8443/api';

const withToken = (config, token) => {
  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
};

// On a 401, renews the token once and resends the request
async function retryWithNewToken(error, send, { clearOnFailure }) {
  const original = error.config;
  if (error.response?.status !== 401 || !original || original._retry) {
    return Promise.reject(error);
  }
  original._retry = true;
  try {
    const token = await refreshAccessToken();
    return send(withToken(original, token));
  } catch {
    if (clearOnFailure) clearAccessToken();
    return Promise.reject(error);
  }
}

// Backend client for every module; options are axios.create options
export function createApiClient(options = {}) {
  const client = axios.create({ baseURL: API_BASE, ...options });
  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    return token ? withToken(config, token) : config;
  });
  client.interceptors.response.use(
    (response) => response,
    (error) => retryWithNewToken(error, client, { clearOnFailure: true })
  );
  return client;
}

const axiosInstance = createApiClient();

// Plain axios calls to the backend (axios.get(`${API_BASE}/...`)) get the same token and
// session refresh as axiosInstance: the backend needs a signed-in user for every request
// except login and password reset. Calls to other servers are left alone.
const isBackendUrl = (url) => typeof url === 'string'
  && (url.startsWith(API_BASE) || url.startsWith('/'))
  && !/\/(refresh-token|login-validation)\b/.test(url);

axios.interceptors.request.use((config) => {
  const token = getAccessToken();
  return token && isBackendUrl(config.url) && !config.headers?.Authorization
    ? withToken(config, token)
    : config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => (isBackendUrl(error.config?.url)
    ? retryWithNewToken(error, axios, { clearOnFailure: false })
    : Promise.reject(error))
);

export { axiosInstance };
