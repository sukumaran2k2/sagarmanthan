import { getModuleCrud } from '../../../utils/modulePermissions';
import {
  getUiViewCode,
  getDataScopeCode,
  getSessionOrganisationId,
  isViewOnlyAdmin,
  isOrganisationUser,
} from '../../../utils/authSession';

const MODULE_CODE = 'KPI_MAJOR_PORTS';

export function useMajorPortsPermissions() {
  const crud = getModuleCrud(MODULE_CODE);
  const uiViewCode = getUiViewCode() || 'STANDARD';
  const dataScopeCode = getDataScopeCode();
  const viewOnly = isViewOnlyAdmin();
  const organisationId = getSessionOrganisationId();
  const isOrgScope =
    String(dataScopeCode || '').toUpperCase() === 'ORGANISATION' || isOrganisationUser();

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
    organisationId,
    isOrgScope,
    isMinistryView: !isOrgScope,
    viewMode: isOrgScope ? 'org' : 'ministry',
  };
}
