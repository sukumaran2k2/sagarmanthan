import { useMajorPortsPermissions } from './useMajorPortsPermissions';

/**
 * Traffic actions = KPI_MAJOR_PORTS CRUD flags + who owns each kind of data.
 * Mirrors the server rules in controllers/KPI/trafficEntry.js:
 *  - organisation users enter, update and delete their own monthly actuals
 *  - ministry users maintain targets and grant/revoke late-entry access
 * Organisation scope is read from the JWT data scope, exactly as the server does.
 */
export function useTrafficPermissions() {
  const base = useMajorPortsPermissions();
  const isOrgScope = String(base.dataScopeCode || '').toUpperCase() === 'ORGANISATION';
  const isMinistry = !isOrgScope;

  return {
    ...base,
    isOrgScope,
    isMinistryView: isMinistry,
    canEnterActuals: isOrgScope && base.create,
    canEditActuals: isOrgScope && base.update,
    canDeleteActuals: isOrgScope && base.delete,
    canAddTarget: isMinistry && base.create,
    canEditTarget: isMinistry && base.update,
    canDeleteTarget: isMinistry && base.delete,
    canViewEntryAccess: isMinistry && base.read,
    canGrantAccess: isMinistry && base.create,
    canRevokeAccess: isMinistry && base.update,
  };
}
