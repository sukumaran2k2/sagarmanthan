import { useTrafficPermissions } from './useTrafficPermissions';

/**
 * Cruise and Passenger Traffic actions: the same KPI_MAJOR_PORTS rules as Traffic, enforced again by
 * controllers/KPI/cruisePassengerTrafficEntry.js:
 *  - organisation users enter, update and delete their own monthly actuals
 *  - ministry users maintain the financial-year targets of every organisation
 * There is no monthly entry window, so Entry Access does not apply here.
 */
export function useCruisePassengerPermissions() {
  return useTrafficPermissions();
}
