import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useTrafficPermissions } from './hooks/useTrafficPermissions';
import { useTrafficStore } from './store/useTrafficStore';
import { usePortPerformanceStore } from './store/usePortPerformanceStore';
import { useNotifier, COMMON_TOASTS } from '../../utils/notify';
import {
  createPortPerformanceAccessGrant,
  createTrafficAccessGrant,
  fetchPortPerformanceAccessGrants,
  fetchTrafficAccessGrants,
  revokePortPerformanceAccessGrant,
  revokeTrafficAccessGrant,
} from './api';
import KpiEntryAccess from './pages/Traffic/EntryAccess';
import { useLatestRef } from './pages/Traffic/usePagedList';

// ?section= value per monthly KPI section; Traffic is the default
const SECTIONS = [
  { id: 'traffic', label: 'Traffic' },
  { id: 'port-performance', label: 'Port Performance' },
];

const pickAccess = (state) => ({
  organisations: state.organisations,
  mastersError: state.mastersError,
  loadMasters: state.loadMasters,
  list: state.access,
  actions: state.accessActions,
});

/**
 * KPI Major Ports → Entry Access (the earlier portal's "Ministry Access Unlock").
 * Ministry users unlock late data entry for organisations after the monthly cut-off,
 * separately for each section (Traffic, Port Performance).
 */
export default function PortsEntryAccessView({ triggerNotification }) {
  const { canViewEntryAccess, canGrantAccess, canRevokeAccess } = useTrafficPermissions();
  const notify = useNotifier(triggerNotification);
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionId = SECTIONS.some((s) => s.id === searchParams.get('section')) ? searchParams.get('section') : 'traffic';
  const isPortPerformance = sectionId === 'port-performance';

  const traffic = useTrafficStore(useShallow(pickAccess));
  const portPerformance = usePortPerformanceStore(useShallow(pickAccess));
  const active = isPortPerformance ? portPerformance : traffic;
  const { loadMasters, mastersError } = active;

  useEffect(() => {
    if (canViewEntryAccess) loadMasters();
  }, [canViewEntryAccess, loadMasters]);

  const notifyRef = useLatestRef(notify);
  useEffect(() => {
    if (mastersError) notifyRef.current(COMMON_TOASTS.loadFailed(mastersError));
  }, [mastersError, notifyRef]);

  const source = useMemo(() => (isPortPerformance
    ? {
      id: 'port-performance',
      label: 'Port Performance',
      subject: 'port performance data',
      list: active.list,
      actions: active.actions,
      fetchGrants: fetchPortPerformanceAccessGrants,
      createGrant: createPortPerformanceAccessGrant,
      revokeGrant: revokePortPerformanceAccessGrant,
    }
    : {
      id: 'traffic',
      label: 'Traffic',
      subject: 'traffic',
      list: active.list,
      actions: active.actions,
      fetchGrants: fetchTrafficAccessGrants,
      createGrant: createTrafficAccessGrant,
      revokeGrant: revokeTrafficAccessGrant,
    }), [isPortPerformance, active.list, active.actions]);

  if (!canViewEntryAccess) {
    return <RestrictedAccess moduleName="KPI - Major Ports · Entry Access" />;
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div className="min-w-0">
          <h1 className="module-header-title">Entry Access · {source.label}</h1>
          <p className="module-header-subtitle">
            Unlock monthly {source.subject} entry for organisations after the cut-off, and track every grant.
          </p>
        </div>
        <InternalNavigation
          tabs={SECTIONS}
          currentTab={sectionId}
          onTabChange={(id) => setSearchParams(id === 'traffic' ? {} : { section: id }, { replace: true })}
        />
      </div>

      <KpiEntryAccess
        // A new page per section, so the grant dialog and confirmations never carry over
        key={source.id}
        source={source}
        organisations={active.organisations}
        canGrant={canGrantAccess}
        canRevoke={canRevokeAccess}
        triggerNotification={triggerNotification}
      />
    </div>
  );
}
