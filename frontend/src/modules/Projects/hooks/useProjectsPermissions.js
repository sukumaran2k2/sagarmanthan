import { getModuleCrud } from '../../../utils/modulePermissions';
import {
  getCurrentUserId,
  getDataScopeCode,
  getSessionOrganisationId,
  getUiViewCode,
  isViewOnlyAdmin,
} from '../../../utils/authSession';

const MODULE_CODE = 'PROJECTS';

function resolveViewMode(dataScopeCode) {
  const code = String(dataScopeCode || '').toUpperCase();
  if (code.includes('ORG')) return 'org';
  if (code.includes('MINISTRY')) return 'ministry';
  return 'standard';
}

export function useProjectsPermissions() {
  const crud = getModuleCrud(MODULE_CODE);
  const dataScopeCode = getDataScopeCode();

  return {
    moduleCode: MODULE_CODE,
    ...crud,
    canAdd: crud.create,
    canEdit: crud.update,
    canRemove: crud.delete,
    canView: crud.read,
    uiViewCode: getUiViewCode() || 'STANDARD',
    dataScopeCode,
    viewMode: resolveViewMode(dataScopeCode),
    isViewOnlyAdmin: isViewOnlyAdmin(),
    userId: getCurrentUserId(),
    organisationId: getSessionOrganisationId(),
  };
}
