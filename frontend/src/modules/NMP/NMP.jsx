import React, { useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Layers, PlusCircle } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import { useNmpPermissions } from './hooks/useNmpPermissions';

const NMP_BASE = '/finance/nmp';

export default function NMPView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useNmpPermissions();
  const { canAdd, canEdit, canView } = permissions;

  const editData = location.state?.item ?? null;

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) return 'input-form';
    return 'data-list';
  }, [location.pathname]);

  const tabs = useMemo(() => {
    const list = [];
    if (canView) list.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
    if (canAdd) list.push({ id: 'input-form', label: 'Input Form', icon: PlusCircle });
    if (canView) list.push({ id: 'data-list', label: 'Data List', icon: Layers });
    return list;
  }, [canAdd, canView]);

  const handleTabChange = useCallback((tabId) => {
    if (tabId === 'dashboard') navigate(`${NMP_BASE}/dashboard`);
    else if (tabId === 'input-form') navigate(`${NMP_BASE}/input-form`);
    else navigate(`${NMP_BASE}/data-list`);
  }, [navigate]);

  const handleEdit = useCallback((row) => {
    navigate(`${NMP_BASE}/input-form`, { state: { item: row } });
  }, [navigate]);

  const handleSuccess = useCallback(() => {
    navigate(`${NMP_BASE}/data-list`, { replace: true });
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate(`${NMP_BASE}/data-list`);
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    navigate(`${NMP_BASE}/input-form`);
  }, [navigate]);

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="National Monetization Plan (NMP)" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            National Monetization Plan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Track and manage National Monetization Plans for port land assets across all Major Ports.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />
      </div>

      <div>
        <Routes>
          <Route
            path="dashboard"
            element={<Dashboard onNavigateToTab={handleTabChange} />}
          />
          <Route
            path="data-list"
            element={
              <DataList
                onEdit={handleEdit}
                onAddNew={canAdd ? handleAddNew : null}
                triggerNotification={triggerNotification}
                canEdit={canEdit}
                canAdd={canAdd}
                canRemove={permissions.canRemove}
              />
            }
          />
          <Route
            path="input-form"
            element={
              <InputForm
                key={editData?.id ?? 'new'}
                editData={editData}
                onSuccess={handleSuccess}
                onCancel={handleBack}
                triggerNotification={triggerNotification}
              />
            }
          />
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="data-list" replace />} />
        </Routes>
      </div>
    </div>
  );
}
