import { getModuleCrud } from '../../../utils/modulePermissions';
import { getUiViewCode, getDataScopeCode, isViewOnlyAdmin } from '../../../utils/authSession';

// Matches tbl_modules.module_code.
const MODULE_CODE = 'NMP';

/**
 * CRUD rights for the NMP module.
 *
 * This used to fall back to granting everything when the module was not configured in the
 * permission system:
 *
 *   const moduleConfigured = hasModuleAccess(MODULE_CODE) || isSuperAdmin();
 *   const canAdd = moduleConfigured ? crud.create : true;   // every user, full access
 *
 * Because NMP had no row in tbl_modules, `moduleConfigured` was false for everyone and the
 * fallback handed out create, update and delete to every signed-in user. It now reads the
 * module's permissions like every other module, so an unconfigured module grants nothing.
 */
export function useNmpPermissions() {
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
