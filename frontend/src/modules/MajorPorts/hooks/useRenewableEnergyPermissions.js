import { useTrafficPermissions } from './useTrafficPermissions';

/**
 * Renewable Energy actions: the same KPI_MAJOR_PORTS rules as Traffic, enforced again by
 * controllers/KPI/renewableEnergyEntry.js:
 *  - organisation users enter, update and delete their own monthly actuals
 *  - ministry users maintain the financial-year targets of every organisation
 * There is no monthly entry window, so Entry Access does not apply here.
 */
export function useRenewableEnergyPermissions() {
  return useTrafficPermissions();
}
