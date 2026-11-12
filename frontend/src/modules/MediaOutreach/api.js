import { API_BASE, createApiClient } from '../../api';

export { API_BASE };

const api = createApiClient();

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
