import { getModuleCrud } from '../../../utils/modulePermissions';
import { isOrganisationUser, getSessionOrganisationId, getSessionOrganisationName } from '../../../utils/authSession';

const MODULE_CODE = 'CSR_PROJECTS';

// Organisations record their own CSR projects and funds; the Ministry reviews them (as in 2.0).
// Adding and editing also need the CSR create / update permission the server checks.
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
