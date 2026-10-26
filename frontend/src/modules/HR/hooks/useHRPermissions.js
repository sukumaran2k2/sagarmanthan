import { useMemo } from 'react';
import { getModuleCrud } from '../../../utils/modulePermissions';
import {
  getCurrentUserId,
  getDataScopeCode,
  getSessionClaims,
  getSessionOrganisationId,
  getSessionOrganisationName,
  getUiViewCode,
  isOrganisationUser,
  isViewOnlyAdmin,
} from '../../../utils/authSession';

const MODULE_CODE = 'HR_MANAGEMENT';

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

// Identity of the signed-in user, read from the access token. This is the only place the
// HR module reads the token. Values are null when the token does not carry them; callers
// must not substitute defaults (several HR write endpoints trust these IDs, so a fallback
// would read or write as another user/organisation).
export function getHrIdentity() {
  const claims = getSessionClaims();
  const roleId = Number(claims?.roleId ?? claims?.role_id);
  return {
    userId: getCurrentUserId(),
    orgId: getSessionOrganisationId(),
    orgName: getSessionOrganisationName(),
    roleId: Number.isFinite(roleId) && roleId > 0 ? roleId : null,
    isOrgUser: isOrganisationUser(),
    uiViewCode: getUiViewCode() || 'STANDARD',
    dataScopeCode: getDataScopeCode(),
  };
}

// Page rules, shared by the top menu (components/Tabs.jsx) and the HR shell (HR.jsx)
// so the menu never offers a page the shell refuses, or the other way round.

// Vacancy Management is for organisation users, in the Standard view only;
// the Secretary/JS view does not get it.
export function canViewVacancyManagement(identity = getHrIdentity()) {
  return identity.isOrgUser && identity.uiViewCode !== 'SECRETARY_JS';
}

// HR Administration & Actions works on the session organisation's employees,
// so it is offered to organisation users only.
export function canViewHrAdministration(identity = getHrIdentity()) {
  return identity.isOrgUser;
}

// Contractual and training data are entered by organisation users; the ministry only
// sees the organisation-wise summaries.
export function canUseHrInputForm(identity, crud) {
  return identity.isOrgUser && (crud.create || crud.update);
}

export function getHrPermissions() {
  const identity = getHrIdentity();
  const crud = getModuleCrud(MODULE_CODE);

  return {
    moduleCode: MODULE_CODE,
    ...crud,
    canAdd: crud.create,
    canEdit: crud.update,
    canRemove: crud.delete,
    canView: crud.read,
    ...identity,
    isMinistryView: !identity.isOrgUser,
    isViewOnlyAdmin: isViewOnlyAdmin(),
    canViewVacancy: canViewVacancyManagement(identity),
    canViewAdministration: canViewHrAdministration(identity),
    canUseInputForm: canUseHrInputForm(identity, crud),
  };
}

// Identity and permissions come from the access token, which only changes on sign-in
// (and signing in remounts the app), so they are read once per mount.
export function useHRPermissions() {
  return useMemo(() => getHrPermissions(), []);
}
