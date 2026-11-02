function normalizeAction(action) {
  const key = String(action || '').toLowerCase();
  if (key === 'create' || key === 'read' || key === 'update' || key === 'delete') {
    return key;
  }
  return null;
}

function findModulePermission(user, moduleCode) {
  const code = String(moduleCode || '').toUpperCase();
  const list = Array.isArray(user?.modulePermissions) ? user.modulePermissions : [];

  return (
    list.find((p) => {
      const pCode = String(p.moduleCode || p.module_code || '').toUpperCase();
      if (pCode && pCode === code) return true;
      return false;
    }) || null
  );
}

function hasAction(perm, action) {
  if (!perm) return false;
  if (action === 'create') return !!(perm.create ?? perm.canCreate ?? perm.can_create);
  if (action === 'read') return !!(perm.read ?? perm.canRead ?? perm.can_read);
  if (action === 'update') return !!(perm.update ?? perm.canUpdate ?? perm.can_update);
  if (action === 'delete') return !!(perm.delete ?? perm.canDelete ?? perm.can_delete);
  return false;
}

const isSuperAdmin = (user) => user.roleCode === 'SUPERADMIN' || Number(user.roleId || user.role_id || 0) === 1;

const MODULE_ALIASES = {
  GMIS_MOU: ['GMIS_MOU', 'GMIS_IMW_MOU_TRACKING'],
  GMIS_IMW_MOU_TRACKING: ['GMIS_MOU', 'GMIS_IMW_MOU_TRACKING'],
  MIV_2030: ['MIV_2030', 'MIV2030'],
  CABINET_NOTES_OTHER_MINISTRIES: ['CABINET_NOTES_OTHER_MINISTRIES', 'CABINET_NOTES_OTHER_MINISTRY'],
};

function getCodeCandidates(moduleCode) {
  const upper = String(moduleCode || '').toUpperCase();
  return MODULE_ALIASES[upper] || [upper];
}

// View Only Admin: read allowed if module is in allowedModuleCodes; writes denied.
// Same rules as requireModulePermission, for controllers that pick the action at runtime
// (e.g. create vs update decided by whether the record already exists).
// Returns { ok: true } or { ok: false, status, message }.
//
// strict (used only where a module opts in through requireStrictModulePermission):
//  - a user without a data scope (MASTER / MINISTRY / ORGANISATION) is refused,
//    instead of being treated as seeing every organisation
export function checkModulePermission(user, moduleCode, action, { strict = false } = {}) {
  const normalizedAction = normalizeAction(action);
  const code = String(moduleCode || '').toUpperCase();
  const candidates = getCodeCandidates(code);

  if (!normalizedAction) {
    return { ok: false, status: 500, message: 'Invalid permission action configured' };
  }

  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized!' };
  }

  // Superadmin has full access, as in main. Every other role, ministry ones included,
  // goes by the organisation's modules and the user matrix, as the frontend does.
  if (isSuperAdmin(user)) return { ok: true };

  if (strict) {
    const scope = String(user.dataScopeCode || '').toUpperCase();
    if (!['MASTER', 'MINISTRY', 'ORGANISATION'].includes(scope)) {
      return { ok: false, status: 403, message: 'No data scope is set for this account' };
    }
  }

  const allowedCodes = Array.isArray(user.allowedModuleCodes)
    ? user.allowedModuleCodes.map((c) => String(c).toUpperCase())
    : [];
  const moduleAllowed = candidates.some((c) => allowedCodes.includes(c));

  if (user.roleCode === 'VIEW_ONLY_ADMIN') {
    if (normalizedAction === 'read' && moduleAllowed) {
      return { ok: true };
    }
    return { ok: false, status: 403, message: 'View Only Admin has read-only access' };
  }

  if (!moduleAllowed) {
    return { ok: false, status: 403, message: 'Module not allowed for organisation' };
  }

  let perm = null;
  for (const c of candidates) {
    perm = findModulePermission(user, c);
    if (perm) break;
  }

  // No user matrix row for the module is still allowed (also in strict mode) until the
  // matrix is filled in for every user
  if (perm && !hasAction(perm, normalizedAction)) {
    return { ok: false, status: 403, message: `Missing ${normalizedAction} permission for ${code}` };
  }

  return { ok: true };
}

function permissionMiddleware(moduleCode, action, options) {
  return (req, res, next) => {
    const result = checkModulePermission(req.user, moduleCode, action, options);
    if (result.ok) return next();
    if (result.status === 500) {
      return res.status(500).json({ message: result.message });
    }
    return res.status(result.status).json({ status: 'fail', message: result.message });
  };
}

export function requireModulePermission(moduleCode, action) {
  return permissionMiddleware(moduleCode, action);
}

/** requireModulePermission with the strict rules above (see checkModulePermission). */
export function requireStrictModulePermission(moduleCode, action) {
  return permissionMiddleware(moduleCode, action, { strict: true });
}

/** Allow if the user has any one of the listed actions. */
export function requireAnyModulePermission(moduleCode, actions = []) {
  const code = String(moduleCode || '').toUpperCase();
  const normalized = (Array.isArray(actions) ? actions : [actions])
    .map(normalizeAction)
    .filter(Boolean);

  return (req, res, next) => {
    if (!normalized.length) {
      return res.status(500).json({ message: 'Invalid permission actions configured' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'Unauthorized!' });
    }

    // Superadmin has full access
    if (isSuperAdmin(user)) return next();

    const candidates = getCodeCandidates(code);
    const allowedCodes = Array.isArray(user.allowedModuleCodes)
      ? user.allowedModuleCodes.map((c) => String(c).toUpperCase())
      : [];
    const moduleAllowed = candidates.some((c) => allowedCodes.includes(c));

    if (user.roleCode === 'VIEW_ONLY_ADMIN') {
      return res.status(403).json({
        status: 'fail',
        message: 'View Only Admin has read-only access',
      });
    }

    if (!moduleAllowed) {
      return res.status(403).json({
        status: 'fail',
        message: 'Module not allowed for organisation',
      });
    }

    let perm = null;
    for (const c of candidates) {
      perm = findModulePermission(user, c);
      if (perm) break;
    }

    const ok = !perm || normalized.some((action) => hasAction(perm, action));
    if (!ok) {
      return res.status(403).json({
        status: 'fail',
        message: `Missing permission for ${code}`,
      });
    }

    return next();
  };
}

export default requireModulePermission;
