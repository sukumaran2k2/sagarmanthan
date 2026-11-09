import { getModuleCrud } from '../../../utils/modulePermissions';
import { isOrganisationUser, getSessionOrganisationId, getSessionOrganisationName } from '../../../utils/authSession';

const MODULE_CODE = 'CSR_PROJECTS';

// Organisations record their own CSR projects and funds; the Ministry reviews them (as in 2.0).
// Any organisation login can add and edit, as its CSR create / update permission allows
// (QC R-14); Ministry users only view (QC CSR-18 / CSR-34). The server applies the same rule.
export function useCsrPermissions() {
  const crud = getModuleCrud(MODULE_CODE);
  const isOrgUser = isOrganisationUser();

  return {
    moduleCode: MODULE_CODE,
    isOrgUser,
    organisationId: isOrgUser ? getSessionOrganisationId() : null,
    organisationName: isOrgUser ? getSessionOrganisationName() : null,
    canAdd: isOrgUser && crud.create,
    canEdit: isOrgUser && crud.update,
  };
}
