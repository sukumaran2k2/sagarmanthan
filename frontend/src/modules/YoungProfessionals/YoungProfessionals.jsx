import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useYpPermissions } from './hooks/useYpPermissions';
import { useYpStore } from './store/useYpStore';

export default function YoungProfessionalsView({
  triggerNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useYpPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  // Zustand YP Store (atomic selectors so DataList filter/search updates don't re-render the shell)
  const wings = useYpStore(state => state.wings);
  const divisions = useYpStore(state => state.divisions);
  const loadWingsAndDivisions = useYpStore(state => state.loadWingsAndDivisions);

  // The record being edited travels with the route entry, so it is gone as soon as
  // the user navigates to the form any other way (tab, sidebar, new session)
  const editData = location.state?.item ?? null;

  // Dynamically render internal sub-tabs based on permissions
  const tabs = useMemo(() => {
    const list = [];
    if (canAdd) list.push({ id: 'input-form', label: 'Input Form' });
    if (canView) list.push({ id: 'list-view', label: 'Data List' });
    if (canView) list.push({ id: 'report', label: 'Report' });
    return list;
  }, [canAdd, canView]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) return 'input-form';
    if (path.includes('/report')) return 'report';
    return 'list-view';
  }, [location.pathname]);

  // Load wings and divisions once via store
  useEffect(() => {
    loadWingsAndDivisions();
  }, [loadWingsAndDivisions]);

  const handleEdit = useCallback((yp) => {
    navigate('/hr/young-professionals/input-form', { state: { item: yp } });
  }, [navigate]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    navigate('/hr/young-professionals/list-view', { replace: true });
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('/hr/young-professionals/list-view');
  }, [navigate]);

  // Render RestrictedAccess component if user has no permissions at all
  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="Young Professionals" />;
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">
            Young Professionals
          </h1>
          <p className="module-header-subtitle">
            Manage, register and monitor Young Professionals recruited across various wings and divisions.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId === 'input-form') navigate('/hr/young-professionals/input-form');
            else if (tabId === 'report') navigate('/hr/young-professionals/report');
            else navigate('/hr/young-professionals/list-view');
          }}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="list-view" element={
            <DataList
              onEdit={handleEdit}
              triggerNotification={triggerNotification}
              wings={wings}
              divisions={divisions}
              canEdit={canEdit}
              canAdd={canAdd}
              canRemove={canRemove}
            />
          } />

          <Route path="input-form" element={
            <InputForm
              key={editData?.yp_id ?? 'new'}
              wings={wings}
              divisions={divisions}
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
              canEdit={canEdit}
              canAdd={canAdd}
            />
          } />

          <Route path="report" element={
            <Reports
              wings={wings}
              divisions={divisions}
              triggerNotification={triggerNotification}
            />
          } />

          <Route index element={<Navigate to={canView ? "list-view" : "input-form"} replace />} />
          <Route path="*" element={<Navigate to={canView ? "list-view" : "input-form"} replace />} />
        </Routes>
      </div>
    </div>
  );
}
