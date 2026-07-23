// decode only — not used for auth decisions on the server
export function decodeAccessToken(token) {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getSessionClaims() {
  const token = localStorage.getItem('accessToken');
  return decodeAccessToken(token);
}

export function getCurrentUserId() {
  const claims = getSessionClaims();
  if (!claims) return null;
  const raw = claims.userId ?? claims.user_id ?? claims.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isSuperAdmin() {
  const claims = getSessionClaims();
  if (!claims) return false;
  if (claims.roleCode === 'SUPERADMIN') return true;
  const name = (claims.roleName || '').toLowerCase();
  return name.includes('superadmin') || name === 'super admin';
}
