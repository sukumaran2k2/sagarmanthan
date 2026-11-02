import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';

import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useCabinetNotesPermissions } from './hooks/useCabinetNotesPermissions';
import { useCabinetNotesStore } from './store/useCabinetNotesStore';
import { CABINET_NOTES_LIST_VIEWS, listViewKey } from './views';
import Dashboard from './pages/Dashboard';
import CabinetNotesReports from './pages/Reports';
import NoteForm from './pages/NoteForm';
import { useNotifier } from '../../utils/notify';

const BASE = '/governance/cabinet-notes';

export default function CabinetNotesMOPSW({
  onGoHome,
  triggerNotification,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const permissions = useCabinetNotesPermissions();
  const { canAdd, canEdit, canView } = permissions;

  // Reference data from the store (one selector per field, so list changes don't re-render the shell)
  const wings = useCabinetNotesStore((state) => state.wings);
  const divisions = useCabinetNotesStore((state) => state.divisions);
  const stages = useCabinetNotesStore((state) => state.stages);
  const loadLookups = useCabinetNotesStore((state) => state.loadLookups);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // The note being edited (or viewed) travels with the route entry, so it is gone as soon
  // as the form is opened any other way (tab, sidebar, new session)
  const editData = location.state?.item ?? null;
  // Opening a note needs edit rights, or view rights for a read-only form; a new note needs add rights
  const formAllowed = editData ? (canEdit || canView) : canAdd;

  const tabs = useMemo(() => {
    const items = [{ id: 'dashboard', label: 'Dashboard' }];
    if (canAdd) items.push({ id: 'input-form', label: 'Input Form' });
    items.push(
      { id: 'data-list', label: 'Data List' },
      { id: 'reports', label: 'Report' }
    );
    return items;
  }, [canAdd]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/input-form') || path.includes('/add')) return 'input-form';
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    if (path.includes('/data-list') || path.includes('/list')) return 'data-list';
    return 'dashboard';
  }, [location.pathname]);

  const handleEdit = useCallback((form) => {
    navigate(`${BASE}/input-form`, { state: { item: form } });
  }, [navigate]);

  const handleBack = useCallback(() => navigate(`${BASE}/data-list`), [navigate]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    navigate(`${BASE}/data-list`, { replace: true });
  }, [navigate]);

  if (!canView) {
    return (
      <RestrictedAccess
        moduleName="Cabinet Notes - MoPSW"
        onGoHome={onGoHome}
      />
    );
  }

  const ListView = CABINET_NOTES_LIST_VIEWS[listViewKey(permissions.uiViewCode)];

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">Cabinet Notes - MoPSW</h1>
          <p className="module-header-subtitle">
            Manage, record, and track Cabinet Notes stages for the Ministry of Ports, Shipping and Waterways.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => navigate(`${BASE}/${tabId}`)}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="data-list" element={
            <ListView notify={notify} onEdit={handleEdit} onGoHome={onGoHome} />
          } />

          <Route path="input-form" element={formAllowed ? (
            <NoteForm
              key={editData?.mopswCabinetID ?? 'new'}
              wings={wings}
              divisions={divisions}
              stages={stages}
              initialForm={editData}
              readOnly={!!editData && !canEdit}
              onBack={handleBack}
              onSuccess={handleSuccess}
              notify={notify}
            />
          ) : <Navigate to={`${BASE}/data-list`} replace />} />

          <Route path="reports" element={<CabinetNotesReports notify={notify} />} />

          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}
