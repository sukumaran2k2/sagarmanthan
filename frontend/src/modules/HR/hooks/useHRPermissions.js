import { useMemo } from 'react';
import { getModuleCrud } from '../../../utils/modulePermissions';
import {
  getCurrentUserId,
  getDataScopeCode,
  getSessionClaims,
  getSessionOrganisationCategoryId,
  getSessionOrganisationId,
  getSessionOrganisationName,
  getUiViewCode,
  isOrganisationUser,
  isOtherOrganisationUser,
  isViewOnlyAdmin,
} from '../../../utils/authSession';
import { useHrStore } from '../store/useHrStore';
import { HR_VIEWS, resolveHrView } from '../utils/hrViews';

const MODULE_CODE = 'HR_MANAGEMENT';

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

// Identity of the signed-in user, read from the access token. This is the only place the
// HR module reads the token. Values are null when the token does not carry them; callers
// must not substitute defaults (several HR write endpoints trust these IDs, so a fallback
// would read or write as another user/organisation).
// overrides: values known from elsewhere, e.g. the organisation category from the organisation
// master when the token predates that claim (see useHRPermissions).
export function getHrIdentity(overrides = {}) {
  const claims = getSessionClaims();
  const roleId = Number(claims?.roleId ?? claims?.role_id);
  const identity = {
    userId: getCurrentUserId(),
    orgId: getSessionOrganisationId(),
    orgName: getSessionOrganisationName(),
    roleId: Number.isFinite(roleId) && roleId > 0 ? roleId : null,
    isOrgUser: isOrganisationUser(),
    uiViewCode: getUiViewCode() || 'STANDARD',
    dataScopeCode: getDataScopeCode(),
    organisationCategoryId: getSessionOrganisationCategoryId(),
    ...overrides,
  };
  // PORT / NON_PORT / SECRETARY / MINISTRY: which pages the user gets (utils/hrViews.js)
  return { ...identity, hrView: resolveHrView(identity) };
}

// The identity's HR view, worked out when the caller passed a bare identity
const viewOf = (identity) => identity.hrView ?? resolveHrView(identity);

// Page rules, shared by the top menu (components/Tabs.jsx) and the HR shell (HR.jsx)
// so the menu never offers a page the shell refuses, or the other way round.

// Vacancy Management is for Major Port organisation users, in the Standard view only;
// the Secretary/JS view and non-port organisations (monthly upload instead) do not get it.
export function canViewVacancyManagement(identity = getHrIdentity()) {
  return viewOf(identity) === HR_VIEWS.PORT && identity.uiViewCode !== 'SECRETARY_JS';
}

// HR Administration & Actions works on the session organisation's employees,
// so it is offered to Major Port organisation users only.
export function canViewHrAdministration(identity = getHrIdentity()) {
  return viewOf(identity) === HR_VIEWS.PORT;
}

// Contractual and training data are entered by organisation users; the ministry only
// sees the organisation-wise summaries.
export function canUseHrInputForm(identity, crud) {
  if (isOtherOrganisationUser()) return true;
  return identity.isOrgUser && (crud.create || crud.update);
}

export function getHrPermissions(overrides) {
  const identity = getHrIdentity(overrides);
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
// (and signing in remounts the app), so they are read once per mount. A token from before the
// organisation category claim gets the category from the organisation master once it is loaded.
export function useHRPermissions() {
  const fromToken = useMemo(() => getHrPermissions(), []);
  const organisations = useHrStore((state) => state.organisations);
  return useMemo(() => {
    if (!fromToken.isOrgUser || fromToken.organisationCategoryId !== undefined) return fromToken;
    const own = organisations.find((o) => Number(o.organisation_id) === Number(fromToken.orgId));
    return own ? getHrPermissions({ organisationCategoryId: own.organisation_category_id ?? null }) : fromToken;
  }, [fromToken, organisations]);
}
