import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

let pending = null;

/**
 * Gets a new access token when the current one has expired (30 minutes), so the user stays
 * signed in for the session instead of being sent back to the login page.
 *
 * The refresh token is an httpOnly cookie set at login, so JavaScript never sees it; the browser
 * sends it only with `withCredentials`. The server rebuilds the session (role, organisation,
 * module permissions) from the database. Requests that fail at the same moment share one refresh.
 * Every module's API client uses this one function.
 */
export function refreshAccessToken() {
  if (!pending) {
    pending = axios
      .get(`${API_BASE}/refresh-token`, { withCredentials: true })
      .then((res) => {
        const next = res.data?.accessToken;
        if (!next) throw new Error('Refresh failed');
        localStorage.setItem('accessToken', next);
        return next;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/**
 * Signs the session out on the server too: the refresh-token cookie is invalidated and removed,
 * so the signed-out browser can't be signed back in by a refresh. Never throws; the local
 * sign-out goes ahead even if the server can't be reached.
 */
export function endSession() {
  const token = localStorage.getItem('accessToken');
  return axios
    .post(`${API_BASE}/logout`, null, {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    .catch(() => {});
}
