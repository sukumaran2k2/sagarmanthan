import { getModuleCrud } from '../../../utils/modulePermissions';
import { getUiViewCode, getDataScopeCode, isViewOnlyAdmin, isSuperAdmin } from '../../../utils/authSession';
import { hasModuleAccess } from '../../../utils/moduleAccess';

const MODULE_CODE = 'NMP';

export function useNmpPermissions() {
  const crud = getModuleCrud(MODULE_CODE);
  const uiViewCode = getUiViewCode() || 'STANDARD';
  const dataScopeCode = getDataScopeCode();
  const viewOnly = isViewOnlyAdmin();

  const moduleConfigured = hasModuleAccess(MODULE_CODE) || isSuperAdmin();
  const canAdd = moduleConfigured ? crud.create : true;
  const canEdit = moduleConfigured ? crud.update : true;
  const canRemove = moduleConfigured ? crud.delete : true;
  const canView = moduleConfigured ? crud.read : true;

  return {
    moduleCode: MODULE_CODE,
    ...crud,
    canAdd,
    canEdit,
    canRemove,
    canView,
    uiViewCode,
    dataScopeCode,
    isViewOnlyAdmin: viewOnly,
  };
}
