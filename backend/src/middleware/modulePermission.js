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

// View Only Admin: read allowed if module is in allowedModuleCodes; writes denied.
export function requireModulePermission(moduleCode, action) {
  const normalizedAction = normalizeAction(action);
  const code = String(moduleCode || '').toUpperCase();

  return (req, res, next) => {
    if (!normalizedAction) {
      return res.status(500).json({ message: 'Invalid permission action configured' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'Unauthorized!' });
    }

    if (user.roleCode === 'SUPERADMIN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Superadmin cannot access module data APIs',
      });
    }

    const allowedCodes = Array.isArray(user.allowedModuleCodes)
      ? user.allowedModuleCodes.map((c) => String(c).toUpperCase())
      : [];
    const moduleAllowed = allowedCodes.includes(code);

    if (user.roleCode === 'VIEW_ONLY_ADMIN') {
      if (normalizedAction === 'read' && moduleAllowed) {
        return next();
      }
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

    const perm = findModulePermission(user, code);
    if (!hasAction(perm, normalizedAction)) {
      return res.status(403).json({
        status: 'fail',
        message: `Missing ${normalizedAction} permission for ${code}`,
      });
    }

    return next();
  };
}

export default requireModulePermission;
