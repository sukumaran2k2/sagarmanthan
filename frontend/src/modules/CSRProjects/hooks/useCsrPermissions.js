import { getModuleCrud } from '../../../utils/modulePermissions';
import { isOrganisationUser, getSessionOrganisationId, getSessionOrganisationName, getRoleCode } from '../../../utils/authSession';

const MODULE_CODE = 'CSR_PROJECTS';

// Organisations record their own CSR projects and funds; the Ministry reviews them (as in 2.0).
// Only Organisation Nodal Officers add and edit (QC CSR-18 / CSR-34): Ministry users and
// Organisation Senior Officers only view. The server applies the same rule, and adding and
// editing also need the CSR create / update permission.
export function useCsrPermissions() {
  const crud = getModuleCrud(MODULE_CODE);
  const isOrgUser = isOrganisationUser();
  const canWrite = isOrgUser && getRoleCode() === 'ORG_NODAL_OFFICER';

  return {
    moduleCode: MODULE_CODE,
    isOrgUser,
    organisationId: isOrgUser ? getSessionOrganisationId() : null,
    organisationName: isOrgUser ? getSessionOrganisationName() : null,
    canAdd: canWrite && crud.create,
    canEdit: canWrite && crud.update,
  };
}
