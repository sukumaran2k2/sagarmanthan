import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate, useParams } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import UpdateVisit from './pages/UpdateVisit';
import { useFvPermissions } from './hooks/useFvPermissions';
import { useFvStore } from './store/useFvStore';

const BASE = '/governance/foreign-visit';

export default function ForeignVisit({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAdd, canEdit, canView, canRemove } = useFvPermissions();

  const loadMetadata = useFvStore((s) => s.loadMetadata);

  // The masters are needed by all four pages, so they are fetched once at the module root.
  useEffect(() => { loadMetadata(); }, [loadMetadata]);

  const tabs = useMemo(() => {
    const list = [{ id: 'dashboard', label: 'Dashboard' }];
    if (canAdd) list.push({ id: 'input-form', label: 'Input Form' });
    if (canView) list.push({ id: 'data-list', label: 'Data List' });
    if (canView) list.push({ id: 'reports', label: 'Reports' });
    return list;
  }, [canAdd, canView]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/input-form')) return 'input-form';
    if (path.includes('/reports')) return 'reports';
    // The update screen is reached from a row, so it keeps the Data List tab highlighted.
    return 'data-list';
  }, [location.pathname]);

  const goToList = useCallback(() => navigate(`${BASE}/data-list`), [navigate]);
  const goToListReplacing = useCallback(() => navigate(`${BASE}/data-list`, { replace: true }), [navigate]);
  const goToAdd = useCallback(() => navigate(`${BASE}/input-form`), [navigate]);
  const goToUpdate = useCallback((row) => navigate(`${BASE}/update/${row.id}`), [navigate]);

  if (!canView && !canAdd && !canEdit) {
    return <RestrictedAccess moduleName="Official Foreign Visit" />;
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">Official Foreign Visit</h1>
          <p className="module-header-subtitle">
            Record and track official foreign visits from proposal through sanction to the tour report.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId === 'dashboard') navigate(`${BASE}/dashboard`);
            else if (tabId === 'input-form') navigate(`${BASE}/input-form`);
            else if (tabId === 'reports') navigate(`${BASE}/reports`);
            else goToList();
          }}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="dashboard" element={<Dashboard triggerNotification={triggerNotification} />} />

          <Route path="data-list" element={
            <DataList
              onEdit={goToUpdate}
              onAdd={goToAdd}
              triggerNotification={triggerNotification}
              canEdit={canEdit}
              canAdd={canAdd}
              canRemove={canRemove}
            />
          } />

          <Route path="input-form" element={
            <InputForm
              onBack={goToList}
              onSuccess={goToListReplacing}
              triggerNotification={triggerNotification}
              canAdd={canAdd}
            />
          } />

          <Route path="update/:id" element={
            <UpdateVisitRoute
              onBack={goToList}
              triggerNotification={triggerNotification}
              canEdit={canEdit}
            />
          } />

          <Route path="reports" element={<Reports triggerNotification={triggerNotification} />} />

          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

/** Reads the visit id from the URL so the update screen survives a refresh or a shared link. */
function UpdateVisitRoute({ onBack, triggerNotification, canEdit }) {
  const { id } = useParams();
  return (
    <UpdateVisit
      key={id}
      visitId={id}
      onBack={onBack}
      triggerNotification={triggerNotification}
      canEdit={canEdit}
    />
  );
}
