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

export function getRoleCode() {
  const claims = getSessionClaims();
  return String(claims?.roleCode || '').toUpperCase() || null;
}

// View Only Admin: read takes priority over JWT CRUD write flags.
export function isViewOnlyAdmin() {
  const claims = getSessionClaims();
  if (!claims) return false;
  const code = String(claims.roleCode || '').toUpperCase();
  if (code === 'VIEW_ONLY_ADMIN') return true;
  const name = String(claims.roleName || '').toLowerCase();
  return name.includes('view only admin') || name === 'view only';
}

export function getUiViewCode() {
  const claims = getSessionClaims();
  return String(claims?.uiViewCode || '').toUpperCase() || null;
}

export function getDataScopeCode() {
  const claims = getSessionClaims();
  return String(claims?.dataScopeCode || '').toUpperCase() || null;
}

export function getSessionWingId() {
  const claims = getSessionClaims();
  if (!claims) return null;
  const raw = claims.wingId ?? claims.wing_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isOrganisationUser() {
  const claims = getSessionClaims();
  if (!claims || isSuperAdmin()) return false;

  const scope = String(claims.dataScopeCode || '').toUpperCase();
  if (scope === 'ORGANISATION') return true;
  if (scope === 'MINISTRY' || scope === 'MASTER') return false;

  const roleCode = String(claims.roleCode || '').toUpperCase();
  if (roleCode.startsWith('ORG') || roleCode.includes('ORGANISATION') || roleCode.includes('ORGANIZATION')) return true;
  if (roleCode.startsWith('MINISTRY') || roleCode === 'SUPERADMIN' || roleCode === 'VIEW_ONLY_ADMIN') return false;

  const roleName = String(claims.roleName || claims.role || '').toLowerCase();
  if (
    roleName.includes('organisation') ||
    roleName.includes('organization') ||
    roleName.includes('senior officer') ||
    roleName.includes('nodal officer')
  ) {
    return true;
  }
  if (roleName.includes('ministry') || roleName.includes('super admin') || roleName.includes('superadmin')) {
    return false;
  }

  const roleId = Number(claims.roleId || claims.role_id || 0);
  if (roleId === 6 || roleId === 7) return true;

  const orgId = Number(claims.organisationId ?? claims.organisation_id ?? 0);
  const orgName = String(claims.organisationName || claims.organisation_name || '').toLowerCase();
  if (orgId > 0 && orgName && !orgName.includes('ministry') && orgName !== 'system') {
    return true;
  }

  return false;
}

export const isOrgUser = isOrganisationUser;

