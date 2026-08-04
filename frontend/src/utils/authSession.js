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

export function getSessionOrganisationId() {
  const claims = getSessionClaims();
  if (!claims) return null;
  const raw = claims.organisationId ?? claims.organisation_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getSessionOrganisationName() {
  const claims = getSessionClaims();
  return claims?.organisationName || claims?.organisation_name || null;
}

export function isOrgSeniorOfficer() {
  const claims = getSessionClaims();
  if (!claims || isSuperAdmin()) return false;
  const code = String(claims.roleCode || '').toUpperCase();
  const name = String(claims.roleName || '').toLowerCase();
  if (code.includes('SENIOR')) return true;
  return name.includes('senior officer');
}

export function isNodalOfficerRole(role) {
  const code = String(role?.role_code || role?.roleCode || '').toUpperCase();
  const name = String(role?.role_name || role?.roleName || role || '').toLowerCase();
  return code.includes('NODAL') || name.includes('nodal officer');
}
