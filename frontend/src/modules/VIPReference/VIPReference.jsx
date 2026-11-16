import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useVipPermissions } from './hooks/useVipPermissions';
import { useVipStore } from './store/useVipStore';
import { useNotifier, COMMON_TOASTS } from '../../utils/notify';

const BASE = '/governance/vip-reference';

export default function VIPReference({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canRemove, canView } = useVipPermissions();

  const loadWingsAndDivisions = useVipStore(state => state.loadWingsAndDivisions);
  const metadataError = useVipStore(state => state.metadataError);

  const editData = location.state?.item ?? null;

  const tabs = useMemo(() => {
    const list = [];
    if (canView) list.push({ id: 'dashboard', label: 'Dashboard' });
    if (canAdd) list.push({ id: 'input-form', label: 'Input Form' });
    if (canView) {
      list.push({ id: 'data-list', label: 'Data List' });
      list.push({ id: 'reports', label: 'Report' });
    }
    return list;
  }, [canAdd, canView]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) return 'input-form';
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    return 'data-list';
  }, [location.pathname]);

  useEffect(() => {
    loadWingsAndDivisions();
  }, [loadWingsAndDivisions]);

  // The store records a metadata failure but nothing used to show it, so the wing and division
  // dropdowns would just come up empty with no explanation.
  useEffect(() => {
    if (metadataError) notify(COMMON_TOASTS.loadFailed('Wings and divisions'));
  }, [metadataError, notify]);

  const handleEdit = useCallback((row) => {
    navigate(`${BASE}/input-form`, { state: { item: row } });
  }, [navigate]);

  const handleSuccess = useCallback(() => {
    navigate(`${BASE}/data-list`, { replace: true });
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate(`${BASE}/data-list`);
  }, [navigate]);

  // The tab a user is allowed to land on, used for both the index route and any unknown path
  const fallbackTab = canView ? 'dashboard' : 'input-form';

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="VIP References" />;
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">
            VIP References
          </h1>
          <p className="module-header-subtitle">
            Track and manage VIP communications, queries, and action status across departments.
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
          {/* Each route repeats its tab's permission check: hiding a tab is not access control,
              the path can still be typed in or bookmarked. */}
          <Route
            path="dashboard"
            element={canView
              ? <Dashboard triggerNotification={triggerNotification} />
              : <RestrictedAccess moduleName="VIP References" />}
          />

          <Route
            path="data-list"
            element={canView
              ? (
                <DataList
                  onEdit={handleEdit}
                  triggerNotification={triggerNotification}
                  canEdit={canEdit}
                  canRemove={canRemove}
                />
              )
              : <RestrictedAccess moduleName="VIP References" />}
          />

          <Route
            path="input-form"
            element={(canAdd || canEdit)
              ? (
                <InputForm
                  key={editData?.id ?? 'new'}
                  onBack={handleBack}
                  onSuccess={handleSuccess}
                  triggerNotification={triggerNotification}
                  editData={editData}
                  canEdit={canEdit}
                  canAdd={canAdd}
                />
              )
              : <RestrictedAccess moduleName="VIP References" />}
          />

          <Route
            path="reports"
            element={canView
              ? <Reports triggerNotification={triggerNotification} />
              : <RestrictedAccess moduleName="VIP References" />}
          />

          <Route index element={<Navigate to={fallbackTab} replace />} />
          <Route path="*" element={<Navigate to={fallbackTab} replace />} />
        </Routes>
      </div>
    </div>
  );
}
