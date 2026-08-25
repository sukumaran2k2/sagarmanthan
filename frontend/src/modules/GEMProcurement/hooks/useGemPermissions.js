import { getModuleCrud } from '../../../utils/modulePermissions';
import {
  getUiViewCode,
  getDataScopeCode,
  getSessionOrganisationId,
  isViewOnlyAdmin,
} from '../../../utils/authSession';

const MODULE_CODE = 'GEM_PROCUREMENT';

export function useGemPermissions() {
  const crud = getModuleCrud(MODULE_CODE);
  const uiViewCode = getUiViewCode() || 'STANDARD';
  const dataScopeCode = getDataScopeCode();
  const viewOnly = isViewOnlyAdmin();
  const organisationId = getSessionOrganisationId();
  const isOrgScope = String(dataScopeCode || '').toUpperCase() === 'ORGANISATION';

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
    isOrgScope,
    organisationId,
    viewMode: isOrgScope ? 'org' : 'ministry',
  };
}
