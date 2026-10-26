import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useBillsPermissions } from './hooks/useBillsPermissions';
import { useBillsStore } from './store/useBillsStore';
import { fetchBills } from './api';
import { getCurrentUserId } from '../../utils/authSession';
import { useNotifier, COMMON_TOASTS } from '../../utils/notify';

const BASE = '/legal/acts-rules';

// The menu flyout names a sub-tab ('Data List' / 'Input Form' / 'Reports'); it leaves the
// label in sessionStorage for a first visit and sends an event when the module is open
const INIT_TAB_KEY = 'billsPreConstitutionsInitTab';
const MENU_EVENT = 'bills-preconstitutions-subtab';
const pathForMenuLabel = (label) => {
  if (label === 'Input Form') return 'input-form';
  if (label === 'Reports' || label === 'Report') return 'reports';
  if (label === 'Data List') return 'data-list';
  return null;
};

export default function BillsPreConstitutionsView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const permissions = useBillsPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  // Reference data from the store (one selector per field, so list changes don't re-render the shell)
  const wings = useBillsStore((state) => state.wings);
  const divisions = useBillsStore((state) => state.divisions);
  const loadLookups = useBillsStore((state) => state.loadLookups);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Menu flyout -> sub-tab route
  useEffect(() => {
    const open = (label, replace = false) => {
      const path = pathForMenuLabel(label);
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

  // The bill being edited (or viewed) travels with the route entry, so it is gone as soon
  // as the form is opened any other way (tab, menu, new session)
  const editData = location.state?.item ?? null;
  // Opening a bill needs edit rights, or view rights for a read-only form; a new bill needs add rights
  const formAllowed = editData ? (canEdit || canView) : canAdd;

  // Fetched bills live here; only the latest request may update them
  const [rowData, setRowData] = useState([]);
  // The first load starts on mount, so loading starts true for users who can see the list
  const [loading, setLoading] = useState(canView);
  const latestRequestRef = useRef(0);

  const loadBills = useCallback(() => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    return fetchBills(getCurrentUserId())
      .then((res) => {
        if (!isStale()) setRowData(res.data || []);
      })
      .catch((err) => {
        if (isStale()) return;
        console.error('Error loading Bills data list:', err);
        setRowData([]);
        notify(COMMON_TOASTS.loadFailed('Bills'));
      })
      .finally(() => {
        if (!isStale()) setLoading(false);
      });
  }, [notify]);

  // Reload after a save or delete
  const fetchData = useCallback(() => {
    setLoading(true);
    return loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (canView) loadBills();
  }, [canView, loadBills]);

  const tabs = useMemo(() => {
    const list = [];
    if (canAdd) list.push({ id: 'input-form', label: 'Input Form' });
    if (canView) list.push({ id: 'data-list', label: 'Data List' });
    if (canView) list.push({ id: 'reports', label: 'Reports' });
    return list;
  }, [canAdd, canView]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form')) return 'input-form';
    if (path.includes('/reports')) return 'reports';
    return 'data-list';
  }, [location.pathname]);

  const handleEdit = useCallback((bill) => {
    navigate(`${BASE}/input-form`, { state: { item: bill } });
  }, [navigate]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    fetchData();
    navigate(canView ? `${BASE}/data-list` : `${BASE}/input-form`, { replace: true });
  }, [fetchData, navigate, canView]);

  const handleBack = useCallback(() => navigate(`${BASE}/data-list`), [navigate]);

  if (!canAdd && !canView) {
    return <RestrictedAccess moduleName="Bills/Pre-Constitutions Act" />;
  }

  const defaultTab = canAdd ? 'input-form' : 'data-list';

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">Bills/Pre-Constitutions Act</h1>
          <p className="module-header-subtitle">
            Manage, record, and track Legislative Bills and Pre-Constitutions Acts.
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
          <Route path="data-list" element={canView ? (
            <DataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDeleted={fetchData}
              notify={notify}
              wings={wings}
              divisions={divisions}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          ) : <Navigate to={`${BASE}/input-form`} replace />} />

          <Route path="input-form" element={formAllowed ? (
            <InputForm
              key={editData?.id ?? editData?.bill_id ?? 'new'}
              wings={wings}
              divisions={divisions}
              onBack={canView ? handleBack : undefined}
              onSuccess={handleSuccess}
              notify={notify}
              editData={editData}
              readOnly={!!editData && !canEdit}
            />
          ) : <Navigate to={`${BASE}/data-list`} replace />} />

          <Route path="reports" element={canView ? (
            <Reports notify={notify} triggerNotification={triggerNotification} wings={wings} />
          ) : <Navigate to={`${BASE}/input-form`} replace />} />

          <Route index element={<Navigate to={defaultTab} replace />} />
          <Route path="*" element={<Navigate to={defaultTab} replace />} />
        </Routes>
      </div>
    </div>
  );
}
