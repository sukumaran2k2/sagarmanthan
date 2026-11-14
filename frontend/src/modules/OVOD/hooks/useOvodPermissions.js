import { getModuleCrud } from '../../../utils/modulePermissions';
import { getUiViewCode, getDataScopeCode, isViewOnlyAdmin } from '../../../utils/authSession';

/**
 * DRISHTI_PORTAL is the code that exists in tbl_modules (module_id 37). ONE_VISION_ONE_DOCUMENT
 * and OVOD are aliases the UI still uses; getModuleCrud resolves all three to the same grant.
 */
const MODULE_CODE = 'DRISHTI_PORTAL';

/**
 * CRUD rights for the Drishti Portal (OVOD) module.
 *
 * The module previously checked no permissions at all -- it only consulted isOrganisationUser()
 * for data scoping -- so anyone who could open it could add, edit and delete, including a View
 * Only Admin. These flags come from the same source every other module uses.
 */
export function useOvodPermissions() {
  const crud = getModuleCrud(MODULE_CODE);
  const uiViewCode = getUiViewCode() || 'STANDARD';
  const dataScopeCode = getDataScopeCode();
  const viewOnly = isViewOnlyAdmin();

  return {
    moduleCode: MODULE_CODE,
    ...crud,
    canAdd: crud.create,
    canEdit: crud.update,
    canRemove: crud.delete,
    canView: crud.read,
    uiViewCode,
    dataScopeCode,
    isViewOnlyAdmin: viewOnly,
  };
}
