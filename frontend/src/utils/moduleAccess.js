import {
  getSessionClaims,
  isOrgSeniorOfficer,
  isSuperAdmin,
  isViewOnlyAdmin,
} from './authSession';
import {
  TAB_TO_MODULE,
  PUBLIC_UI_TABS,
  getModuleCodeForTab,
} from '../config/moduleRegistry';

export const TAB_USER_MODULE_PERMISSION = 'User/Module Permission';
export const TAB_USER_LIST = 'User List';
export const TAB_USER_MASTER_MANAGEMENT = 'Master Management';

const PUBLIC_TABS = new Set(PUBLIC_UI_TABS);

const SUPERADMIN_TABS = new Set([
  TAB_USER_MODULE_PERMISSION,
  TAB_USER_LIST,
  TAB_USER_MASTER_MANAGEMENT,
]);

const SENIOR_OFFICER_TABS = new Set([TAB_USER_MODULE_PERMISSION]);

const SUPERADMIN_MENU_IDS = new Set([
  'userModulePermission',
  'userList',
  'userMasterManagement',
]);

export function normalizeTab(tab) {
  if (!tab) return tab;
  if (
    tab === 'Module/User Permission' ||
    tab === 'User Matrix' ||
    tab === 'User Management' ||
    tab === 'User Master Management'
  ) {
    return TAB_USER_MODULE_PERMISSION;
  }
  return tab;
}

export function getAllowedModuleCodes() {
  if (isSuperAdmin()) return [];
  const claims = getSessionClaims();
  const codes = claims?.allowedModuleCodes;
  if (!Array.isArray(codes)) return [];
  return codes.map((c) => String(c).toUpperCase());
}

/**
 * Codes that mean the same module, so a grant under any spelling satisfies all of them.
 * DRISHTI_PORTAL is the tbl_modules code; ONE_VISION_ONE_DOCUMENT and OVOD are spellings the UI
 * still uses. The other groups mirror MODULE_ALIASES in backend/src/middleware/modulePermission.js.
 */
const CODE_ALIASES = [
  ['DRISHTI_PORTAL', 'ONE_VISION_ONE_DOCUMENT', 'OVOD'],
  ['GMIS_MOU', 'GMIS_IMW_MOU_TRACKING'],
  ['MIV_2030', 'MIV2030'],
  ['CABINET_NOTES_OTHER_MINISTRIES', 'CABINET_NOTES_OTHER_MINISTRY'],
];

/** Every spelling of a module code, so a lookup matches however the grant was stored. */
export function moduleCodeAliases(moduleCode) {
  const upper = String(moduleCode || '').toUpperCase();
  const group = CODE_ALIASES.find((g) => g.includes(upper));
  return group || (upper ? [upper] : []);
}

export function hasModuleAccess(moduleCode) {
  if (!moduleCode || isSuperAdmin()) return false;
  const allowed = getAllowedModuleCodes();
  return moduleCodeAliases(moduleCode).some((code) => allowed.includes(code));
}

/**
 * Whether the user may see a module in the menu and open its pages: the organisation must have
 * the module and the user's own permission row must have Read ticked. No row, or Read off,
 * means no access, even when Create/Update/Delete are ticked. View Only Admin reads every module
 * the organisation has.
 */
export function hasModuleReadAccess(moduleCode) {
  if (!hasModuleAccess(moduleCode)) return false;
  if (isViewOnlyAdmin()) return true;

  const claims = getSessionClaims();
  const list = Array.isArray(claims?.modulePermissions) ? claims.modulePermissions : [];
  const aliases = moduleCodeAliases(moduleCode);
  const match = list.find((p) => {
    const pCode = String(p.moduleCode || p.module_code || '').toUpperCase();
    return !!pCode && aliases.includes(pCode);
  });
  if (!match) return false;

  return !!(match.read ?? match.canRead ?? match.can_read);
}

export function isSuperAdminTab(tab) {
  return SUPERADMIN_TABS.has(normalizeTab(tab));
}

export function usesOwnPageHeader(tab) {
  const t = normalizeTab(tab);
  return t === 'landing' || SUPERADMIN_TABS.has(t) || SENIOR_OFFICER_TABS.has(t);
}

export function canAccessTab(tab) {
  if (!tab) return false;

  const key = normalizeTab(tab);

  if (PUBLIC_TABS.has(tab) || PUBLIC_TABS.has(key)) return true;

  if (SENIOR_OFFICER_TABS.has(key)) {
    if (isOrgSeniorOfficer()) return true;
  }

  if (SUPERADMIN_TABS.has(key)) {
    return isSuperAdmin();
  }

  if (isSuperAdmin()) return false;

  const code = getModuleCodeForTab(key) || TAB_TO_MODULE[key];
  if (!code) return false;
  return hasModuleReadAccess(code);
}

export function canAccessMenuItem(item) {
  if (!item) return false;
  if (item.moduleCode) return hasModuleReadAccess(item.moduleCode);
  return canAccessTab(item.tab || item.targetTab || item.label);
}

export function filterMenuByAccess(menuData) {
  if (isSuperAdmin()) {
    return menuData.filter(
      (menu) => SUPERADMIN_MENU_IDS.has(menu.id) || menu.id === 'contact'
    );
  }

  return menuData
    .map((menu) => {
      if (SUPERADMIN_MENU_IDS.has(menu.id) || menu.id === 'admin') return null;
      if (menu.id === 'contact') return menu;

      if (menu.subcategories) {
        const subcategories = menu.subcategories
          .map((sub) => ({
            ...sub,
            items: (sub.items || []).filter((item) => canAccessMenuItem(item)),
          }))
          .filter((sub) => sub.items.length > 0);
        if (subcategories.length === 0) return null;
        return { ...menu, subcategories };
      }

      if (menu.items) {
        const items = menu.items.filter((item) => canAccessMenuItem(item));
        if (items.length === 0) return null;
        return { ...menu, items };
      }

      return menu;
    })
    .filter(Boolean);
}
