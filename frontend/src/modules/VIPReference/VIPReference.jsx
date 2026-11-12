import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useVipPermissions } from './hooks/useVipPermissions';
import { useVipStore } from './store/useVipStore';

export default function VIPReference({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useVipPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  const loadWingsAndDivisions = useVipStore(state => state.loadWingsAndDivisions);

  const editData = location.state?.item ?? null;

  const tabs = useMemo(() => {
    const list = [{ id: 'dashboard', label: 'Dashboard' }];
    if (canAdd) list.push({ id: 'input-form', label: 'Input Form' });
    if (canView) list.push({ id: 'data-list', label: 'Data List' });
    if (canView) list.push({ id: 'reports', label: 'Report' });
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

  const handleEdit = useCallback((row) => {
    navigate('/governance/vip-reference/input-form', { state: { item: row } });
  }, [navigate]);

  const handleSuccess = useCallback(() => {
    navigate('/governance/vip-reference/data-list', { replace: true });
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('/governance/vip-reference/data-list');
  }, [navigate]);

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
          onTabChange={(tabId) => {
            if (tabId === 'dashboard') navigate('/governance/vip-reference/dashboard');
            else if (tabId === 'input-form') navigate('/governance/vip-reference/input-form');
            else if (tabId === 'reports') navigate('/governance/vip-reference/reports');
            else navigate('/governance/vip-reference/data-list');
          }}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="data-list" element={
            <DataList
              onEdit={handleEdit}
              triggerNotification={triggerNotification}
              canEdit={canEdit}
              canAdd={canAdd}
              canRemove={canRemove}
            />
          } />

          <Route path="input-form" element={
            <InputForm
              key={editData?.id ?? 'new'}
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
              canEdit={canEdit}
              canAdd={canAdd}
            />
          } />

          <Route path="reports" element={
            <Reports triggerNotification={triggerNotification} />
          } />

          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}
