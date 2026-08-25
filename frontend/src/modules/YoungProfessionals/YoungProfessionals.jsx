import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useYpPermissions } from './hooks/useYpPermissions';
import { fetchWings, fetchDivisions } from './api';

export default function YoungProfessionalsView({
  triggerNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useYpPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  const [editData, setEditData] = useState(null);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

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

  useEffect(() => {
    fetchWings()
      .then(res => setWings(res.data || []))
      .catch(err => console.error("Error loading wings:", err));

    fetchDivisions()
      .then(res => setDivisions(res.data || []))
      .catch(err => console.error("Error loading divisions:", err));
  }, []);

  const handleEdit = (yp) => {
    setEditData(yp);
    navigate('/hr/young-professionals/input-form', { state: { item: yp } });
  };

  const handleSuccess = () => {
    setEditData(null);
    navigate('/hr/young-professionals/list-view');
  };

  const handleBack = () => {
    setEditData(null);
    navigate('/hr/young-professionals/list-view');
  };

  // Render RestrictedAccess component if user has no permissions at all
  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="Young Professionals" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Young Professionals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Manage, register and monitor Young Professionals recruited across various wings and divisions.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId !== 'input-form') setEditData(null);
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
