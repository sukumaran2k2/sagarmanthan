import axios from 'axios';
import { refreshAccessToken } from '../../utils/sessionRefresh';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

// A new access token comes from the shared session refresh (cookie-based)

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

// User-friendly text for a failed request; server or technical error text is never shown
export function friendlyErrorMessage(err, fallback) {
  if (!err?.response) return 'Unable to reach the server. Please check your connection and try again.';
  const status = err.response.status;
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission to do this.';
  return fallback;
}

// The server reads the user from the token, so no user id is sent
export function fetchSocialMediaData() {
  return api.get('/monthly-socialmedia-parameter');
}

export function fetchOrganisations() {
  return api.get('/mmt-dropdown/mmt_organisation');
}

export function createSocialMedia(payload) {
  return api.post('/create-social-media', payload);
}

export function updateSocialMedia(payload) {
  return api.put('/media-outreach-data-edit', payload);
}

// mediaType is the tab the record was deleted from; the server records it in the delete log
export function deleteSocialMedia(mediaOutreachId, mediaType) {
  return api.delete(`/delete-social-media/${mediaOutreachId}`, { params: { type: mediaType } });
}

export default api;
