import { getModuleCrud } from '../../../utils/modulePermissions';
import { getUiViewCode, getDataScopeCode, isViewOnlyAdmin } from '../../../utils/authSession';

const MODULE_CODE = 'MIV_2030';

export function useMIVPermissions() {
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

export default useMIVPermissions;
