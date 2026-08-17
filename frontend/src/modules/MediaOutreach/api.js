import axios from 'axios';

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

// Media Outreach API endpoints
export function fetchSocialMediaData(userId = 1) {
  return api.get(`/monthly-socialmedia-parameter/${userId}`);
}

export function fetchOrganisations() {
  return api.get('/mmt-dropdown/mmt_organisation');
}

export function fetchDropdownAllValues(tableName = 'mmt_organisation') {
  return api.get(`/allvalue-dropdown/${tableName}`);
}

export function fetchUpdateBroadcastMediaData(mediaOutreachId) {
  return api.get(`/update-broadcastmediadata/${mediaOutreachId}`);
}

export function createSocialMedia(payload) {
  return api.post('/create-social-media', payload);
}

export function updateSocialMedia(payload) {
  return api.put('/media-outreach-data-edit', payload);
}

export function deleteSocialMedia(mediaOutreachId) {
  return api.delete(`/delete-social-media/${mediaOutreachId}`);
}

export default api;
