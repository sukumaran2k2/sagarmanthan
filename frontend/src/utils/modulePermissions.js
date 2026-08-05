import {
  getSessionClaims,
  isSuperAdmin,
  isViewOnlyAdmin,
} from './authSession';
import { hasModuleAccess } from './moduleAccess';

const EMPTY = Object.freeze({
  create: false,
  read: false,
  update: false,
  delete: false,
});

const VIEW_ONLY = Object.freeze({
  create: false,
  read: true,
  update: false,
  delete: false,
});

// View Only Admin forces read-only when the module is allowed; else JWT CRUD flags.
export function getModuleCrud(moduleCode) {
  if (!moduleCode) return { ...EMPTY };

  if (isSuperAdmin()) return { ...EMPTY };

  const code = String(moduleCode).toUpperCase();
  const moduleAllowed = hasModuleAccess(code);

  if (isViewOnlyAdmin()) {
    return moduleAllowed ? { ...VIEW_ONLY } : { ...EMPTY };
  }

  if (!moduleAllowed) return { ...EMPTY };

  const claims = getSessionClaims();
  const list = Array.isArray(claims?.modulePermissions)
    ? claims.modulePermissions
    : [];

  const match = list.find((p) => {
    const pCode = String(p.moduleCode || p.module_code || '').toUpperCase();
    if (pCode && pCode === code) return true;
    return false;
  });

  if (!match) return { ...EMPTY };

  return {
    create: !!match.create || !!match.canCreate || !!match.can_create,
    read: !!match.read || !!match.canRead || !!match.can_read,
    update: !!match.update || !!match.canUpdate || !!match.can_update,
    delete: !!match.delete || !!match.canDelete || !!match.can_delete,
  };
}

export function canCreateModule(moduleCode) {
  return getModuleCrud(moduleCode).create;
}

export function canReadModule(moduleCode) {
  return getModuleCrud(moduleCode).read;
}

export function canUpdateModule(moduleCode) {
  return getModuleCrud(moduleCode).update;
}

export function canDeleteModule(moduleCode) {
  return getModuleCrud(moduleCode).delete;
}
