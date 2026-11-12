import axios from 'axios';
import { decodeAccessToken } from './authSession';
import { getAccessToken, setAccessToken, clearAccessToken } from './tabSession';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

let pending = null;

const sessionUserId = (token) => {
  const claims = decodeAccessToken(token);
  return claims ? String(claims.userId ?? claims.user_id ?? claims.id ?? '') : '';
};

// Fired on window when the server refuses to renew the session (refresh cookie expired, signed
// out elsewhere, or the account deactivated). App signs out and shows the login page.
export const SESSION_EXPIRED_EVENT = 'sagarmanthan:session-expired';

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
    // A signed-out tab must not sign in from another tab's cookie
    const current = getAccessToken();
    if (!current) return Promise.reject(new Error('This tab is not signed in'));
    const userId = sessionUserId(current);

    pending = axios
      .get(`${API_BASE}/refresh-token`, { withCredentials: true })
      .then((res) => {
        const next = res.data?.accessToken;
        if (!next) throw new Error('Refresh failed');
        // The cookie now belongs to another user signed in elsewhere
        if (sessionUserId(next) !== userId) {
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { keepServerSession: true } }));
          throw new Error('Signed in as another user in another tab');
        }
        setAccessToken(next);
        return next;
      })
      .catch((err) => {
        // Only a refusal ends the session; a network error or a busy server (503) doesn't
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
        throw err;
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
function endSession() {
  const token = getAccessToken();
  return axios
    .post(`${API_BASE}/logout`, null, {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    .catch(() => {});
}

// keepServerSession: sign out this tab only
export function signOut({ keepServerSession = false } = {}) {
  if (!keepServerSession) endSession();
  clearAccessToken();
}
