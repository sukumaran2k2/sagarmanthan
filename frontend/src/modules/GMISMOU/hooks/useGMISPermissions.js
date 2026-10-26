import { getSessionClaims, getSessionOrganisationId } from '../../../utils/authSession';

// The module is registered under either code; rights are looked up in this order, as on the server.
const GMIS_CODES = ['GMIS_MOU', 'GMIS_IMW_MOU_TRACKING'];
// Ministry-side roles (1 SuperAdmin, 2 Secretary, 3 Joint Secretary, 4 Director, 5 Under Secretary).
const MINISTRY_ROLE_IDS = [1, 2, 3, 4, 5];

const flag = (p, ...keys) => keys.some((k) => !!p[k]);

/**
 * GMIS & IMW MoU permissions from the login token, following the same rules the server
 * enforces (requireModulePermission), so the page never offers an action the server refuses:
 * - Ministry roles: everything.
 * - View Only Admin: view only, if GMIS is enabled for them.
 * - Others with GMIS enabled: their recorded GMIS rights; with none recorded, everything.
 * - GMIS not enabled: nothing.
 */
export function useGMISPermissions() {
  const claims = getSessionClaims() || {};
  const roleId = Number(claims.roleId ?? claims.role_id ?? 0);
  const roleCode = String(claims.roleCode || '').toUpperCase();
  const organisationId = getSessionOrganisationId();

  const allowed = (Array.isArray(claims.allowedModuleCodes) ? claims.allowedModuleCodes : []).map((c) => String(c).toUpperCase());
  const moduleEnabled = GMIS_CODES.some((c) => allowed.includes(c));
  const permissionList = Array.isArray(claims.modulePermissions) ? claims.modulePermissions : [];
  const rights = GMIS_CODES
    .map((code) => permissionList.find((p) => String(p.moduleCode || p.module_code || '').toUpperCase() === code))
    .find(Boolean);

  let crud;
  if (roleCode === 'SUPERADMIN' || MINISTRY_ROLE_IDS.includes(roleId)) {
    crud = { create: true, read: true, update: true, delete: true };
  } else if (!moduleEnabled) {
    crud = { create: false, read: false, update: false, delete: false };
  } else if (roleCode === 'VIEW_ONLY_ADMIN') {
    crud = { create: false, read: true, update: false, delete: false };
  } else if (rights) {
    crud = {
      create: flag(rights, 'create', 'canCreate', 'can_create'),
      read: flag(rights, 'read', 'canRead', 'can_read'),
      update: flag(rights, 'update', 'canUpdate', 'can_update'),
      delete: flag(rights, 'delete', 'canDelete', 'can_delete'),
    };
  } else {
    crud = { create: true, read: true, update: true, delete: true };
  }

  return {
    canAdd: crud.create,
    canEdit: crud.update,
    canRemove: crud.delete,
    canView: crud.read,
    isReadOnly: !crud.create && !crud.update,
    roleId,
    organisationId,
  };
}
