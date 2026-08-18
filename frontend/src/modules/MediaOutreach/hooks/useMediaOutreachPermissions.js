import { getModuleCrud } from '../../../utils/modulePermissions';
import { getUiViewCode, getDataScopeCode, isViewOnlyAdmin, getSessionOrganisationId } from '../../../utils/authSession';

const MODULE_CODE = 'MEDIA_OUTREACH';

export function useMediaOutreachPermissions() {
  const crud = getModuleCrud(MODULE_CODE);
  const uiViewCode = getUiViewCode() || 'STANDARD';
  const dataScopeCode = getDataScopeCode();
  const viewOnly = isViewOnlyAdmin();
  const sessionOrgId = getSessionOrganisationId();
  const isStandardView = (uiViewCode || 'STANDARD').toUpperCase() === 'STANDARD';

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
    isStandardView,
    sessionOrgId,
  };
}

export default useMediaOutreachPermissions;
