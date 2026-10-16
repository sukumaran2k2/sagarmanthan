import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useTrafficPermissions } from './hooks/useTrafficPermissions';
import { useTrafficStore } from './store/useTrafficStore';
import { useNotifier, COMMON_TOASTS } from '../../utils/notify';
import TrafficEntryAccess from './pages/Traffic/EntryAccess';
import { useLatestRef } from './pages/Traffic/usePagedList';

/**
 * KPI Major Ports → Entry Access (the earlier portal's "Ministry Access Unlock").
 * Ministry users unlock late traffic entry for organisations after the monthly cut-off.
 */
export default function PortsEntryAccessView({ triggerNotification }) {
  const { canViewEntryAccess, canGrantAccess, canRevokeAccess } = useTrafficPermissions();
  const notify = useNotifier(triggerNotification);
  const { organisations, mastersError, loadMasters } = useTrafficStore(
    useShallow((state) => ({
      organisations: state.organisations,
      mastersError: state.mastersError,
      loadMasters: state.loadMasters,
    }))
  );

  useEffect(() => {
    if (canViewEntryAccess) loadMasters();
  }, [canViewEntryAccess, loadMasters]);

  const notifyRef = useLatestRef(notify);
  useEffect(() => {
    if (mastersError) notifyRef.current(COMMON_TOASTS.loadFailed(mastersError));
  }, [mastersError, notifyRef]);

  if (!canViewEntryAccess) {
    return <RestrictedAccess moduleName="KPI - Major Ports · Entry Access" />;
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div className="min-w-0">
          <h1 className="module-header-title">Entry Access</h1>
          <p className="module-header-subtitle">
            Unlock traffic data entry for organisations after the monthly cut-off, and track every grant.
          </p>
        </div>
      </div>
      <TrafficEntryAccess
        organisations={organisations}
        canGrant={canGrantAccess}
        canRevoke={canRevokeAccess}
        triggerNotification={triggerNotification}
      />
    </div>
  );
}
