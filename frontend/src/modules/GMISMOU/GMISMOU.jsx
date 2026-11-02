import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import GMISReports from './pages/Reports';
import { useGMISPermissions } from './hooks/useGMISPermissions';
import { useGmisStore } from './store/useGmisStore';
import { useNotifier } from '../../utils/notify';

const BASE = '/strategies/gmis-mou';

// The menu flyout names a sub-tab ('Dashboard' / 'Data List' / 'Input Form' / 'Reports'); it leaves the
// label in sessionStorage for a first visit and sends an event when the module is open
const INIT_TAB_KEY = 'gmisMouInitTab';
const MENU_EVENT = 'gmis-mou-subtab';
const MENU_PATHS = { Dashboard: 'dashboard', 'Data List': 'data-list', 'Input Form': 'input-form', Reports: 'reports', Report: 'reports' };

export default function GMISMOUView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const permissions = useGMISPermissions();
  const { canAdd, canEdit, canView } = permissions;

  // Reference data from the store (one selector per field, so list changes don't re-render the shell)
  const organisations = useGmisStore((state) => state.organisations);
  const categories = useGmisStore((state) => state.categories);
  const navicCells = useGmisStore((state) => state.navicCells);
  const loadLookups = useGmisStore((state) => state.loadLookups);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Menu flyout -> sub-tab route
  useEffect(() => {
    const open = (label, replace = false) => {
      const path = MENU_PATHS[label];
      if (path) navigate(`${BASE}/${path}`, { replace });
    };
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      open(init, true);
    }
    const onMenu = (e) => open(e.detail);
    window.addEventListener(MENU_EVENT, onMenu);
    return () => window.removeEventListener(MENU_EVENT, onMenu);
  }, [navigate]);

  // The MoU being edited travels with the route entry, so it is gone as soon as the
  // form is opened any other way (tab, menu, new session)
  const editData = location.state?.item ?? null;
  // Opening an MoU needs edit rights; a new MoU needs add rights
  const formAllowed = editData ? canEdit : canAdd;

  const tabs = useMemo(() => {
    const list = [];
    if (canView) list.push({ id: 'dashboard', label: 'Dashboard' });
    if (canAdd || editData) list.push({ id: 'input-form', label: editData ? 'Update MoU' : 'Input Form' });
    if (canView) list.push({ id: 'data-list', label: 'Data List' });
    if (canView) list.push({ id: 'reports', label: 'Report' });
    return list;
  }, [canAdd, canView, editData]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form')) return 'input-form';
    if (path.includes('/data-list')) return 'data-list';
    if (path.includes('/reports')) return 'reports';
    return 'dashboard';
  }, [location.pathname]);

  const handleEdit = useCallback((item) => {
    navigate(`${BASE}/input-form`, { state: { item } });
  }, [navigate]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    navigate(canView ? `${BASE}/data-list` : `${BASE}/input-form`, { replace: true });
  }, [navigate, canView]);

  const handleBack = useCallback(() => navigate(`${BASE}/data-list`), [navigate]);

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="GMIS & IMW MoU Tracking" />;
  }

  const defaultTab = canView ? 'dashboard' : 'input-form';

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">GMIS & IMW MoU Tracking</h1>
          <p className="module-header-subtitle">
            Track and monitor Global Maritime India Summit (GMIS) and India Maritime Week (IMW) Memorandums of Understanding (MoUs).
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => navigate(`${BASE}/${tabId}`)}
        />
      </div>

      <Routes>
        <Route path="dashboard" element={canView ? <Dashboard /> : <Navigate to={`${BASE}/input-form`} replace />} />

        <Route path="data-list" element={canView ? (
          <DataList
            onEdit={canEdit ? handleEdit : null}
            notify={notify}
            organisations={organisations}
            categories={categories}
            navicCells={navicCells}
          />
        ) : <Navigate to={`${BASE}/input-form`} replace />} />

        <Route path="input-form" element={formAllowed ? (
          <InputForm
            key={editData?.id ?? editData?.mou_id ?? 'new'}
            editData={editData}
            onSuccess={handleSuccess}
            onCancel={canView ? handleBack : undefined}
            notify={notify}
            organisations={organisations}
            categories={categories}
            navicCells={navicCells}
          />
        ) : <Navigate to={`${BASE}/data-list`} replace />} />

        <Route path="reports" element={canView ? (
          <GMISReports notify={notify} triggerNotification={triggerNotification} />
        ) : <Navigate to={`${BASE}/input-form`} replace />} />

        {/* Old links: the MoU being edited now travels with the route state */}
        <Route path="edit/*" element={<Navigate to={`${BASE}/data-list`} replace />} />
        <Route index element={<Navigate to={defaultTab} replace />} />
        <Route path="*" element={<Navigate to={defaultTab} replace />} />
      </Routes>
    </div>
  );
}
