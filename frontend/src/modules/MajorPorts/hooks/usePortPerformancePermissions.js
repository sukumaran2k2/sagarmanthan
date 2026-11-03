import { useTrafficPermissions } from './useTrafficPermissions';

/**
 * Port Performance actions: the same KPI_MAJOR_PORTS rules as Traffic, enforced again by
 * controllers/KPI/portPerformanceEntry.js and portPerformanceDwell.js:
 *  - organisation users enter, update and delete their own monthly actuals
 *  - ministry users maintain targets, grant/revoke late-entry access and upload the
 *    monthly dwell time sheet (replacing an uploaded month needs update)
 */
export function usePortPerformancePermissions() {
  const base = useTrafficPermissions();
  return {
    ...base,
    canUploadDwell: base.isMinistryView && (base.create || base.update),
    canEditDwell: base.isMinistryView && base.update,
    canDeleteDwell: base.isMinistryView && base.delete,
  };
}
