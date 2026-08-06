import { getSessionClaims, isOrgSeniorOfficer, isSuperAdmin } from './authSession';
import {
  TAB_TO_MODULE,
  PUBLIC_UI_TABS,
  getModuleCodeForTab,
} from '../config/moduleRegistry';

export const TAB_USER_MODULE_PERMISSION = 'User/Module Permission';
export const TAB_USER_LIST = 'User List';

const PUBLIC_TABS = new Set(PUBLIC_UI_TABS);

const SUPERADMIN_TABS = new Set([
  TAB_USER_MODULE_PERMISSION,
  TAB_USER_LIST,
]);

const SENIOR_OFFICER_TABS = new Set([TAB_USER_MODULE_PERMISSION]);

const SUPERADMIN_MENU_IDS = new Set([
  'userModulePermission',
  'userList',
]);

export function normalizeTab(tab) {
  if (!tab) return tab;
  if (
    tab === 'Module/User Permission' ||
    tab === 'User Matrix' ||
    tab === 'User Management'
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

export function hasModuleAccess(moduleCode) {
  if (!moduleCode || isSuperAdmin()) return false;
  return getAllowedModuleCodes().includes(String(moduleCode).toUpperCase());
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
  return hasModuleAccess(code);
}

export function canAccessMenuItem(item) {
  if (!item) return false;
  if (item.moduleCode) return hasModuleAccess(item.moduleCode);
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
