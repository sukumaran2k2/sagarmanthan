import { useTrafficPermissions } from './useTrafficPermissions';

/**
 * Port Performance actions: the same KPI_MAJOR_PORTS rules as Traffic, enforced again by
 * controllers/KPI/portPerformanceEntry.js:
 *  - organisation users enter, update and delete their own monthly actuals
 *  - ministry users maintain targets and grant/revoke late-entry access
 */
export function usePortPerformancePermissions() {
  return useTrafficPermissions();
}
