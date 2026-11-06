import axios from 'axios';
import { refreshAccessToken } from './utils/sessionRefresh';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const axiosInstance = axios.create({ baseURL: API_BASE });

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

// A new access token comes from the shared session refresh (cookie-based)

axiosInstance.interceptors.response.use(
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
      return axiosInstance(original);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return Promise.reject(error);
    }
  }
);

// Plain axios calls to the backend (axios.get(`${API_BASE}/...`)) get the same token and
// session refresh as axiosInstance: the backend needs a signed-in user for every request
// except login and password reset. Calls to other servers are left alone.
const isBackendUrl = (url) => typeof url === 'string'
  && (url.startsWith(API_BASE) || url.startsWith('/'))
  && !/\/(refresh-token|login-validation)\b/.test(url);

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && isBackendUrl(config.url) && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || !original || original._retry || !isBackendUrl(original.url)) {
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
      return axios(original);
    } catch {
      return Promise.reject(error);
    }
  }
);

export { axiosInstance };