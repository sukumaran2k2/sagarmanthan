import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useConsultantPermissions } from './hooks/useConsultantPermissions';
import { deleteConsultantAppointment } from './api';
import { getCurrentUserId } from '../../utils/authSession';
import { useCaStore } from './store/useCaStore';
import { useNotifier, getErrorMessage } from '../../utils/notify';
import { CA_TOASTS } from './toastMessages';

export default function ConsultantAppointmentView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useConsultantPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  // Zustand CA Store (atomic selectors so DataList filter/search updates don't re-render the shell)
  const wings = useCaStore(state => state.wings);
  const divisions = useCaStore(state => state.divisions);
  const loadWingsAndDivisions = useCaStore(state => state.loadWingsAndDivisions);

  // The record being edited travels with the route entry, so it is gone as soon as
  // the user navigates to the form any other way (tab, sidebar, new session)
  const editData = location.state?.item ?? null;

  const notify = useNotifier(triggerNotification);

  const tabs = useMemo(() => {
    const list = [];
    if (canAdd) list.push({ id: 'input-form', label: 'Input Form' });
    if (canView) list.push({ id: 'data-list', label: 'Data List' });
    if (canView) list.push({ id: 'reports', label: 'Report' });
    return list;
  }, [canAdd, canView]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) return 'input-form';
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    return 'data-list';
  }, [location.pathname]);

  // Load wings and divisions once via store
  useEffect(() => {
    loadWingsAndDivisions();
  }, [loadWingsAndDivisions]);

  const handleEdit = useCallback((ca) => {
    navigate('/hr/consultant-appointment/input-form', { state: { item: ca } });
  }, [navigate]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    navigate('/hr/consultant-appointment/data-list', { replace: true });
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('/hr/consultant-appointment/data-list');
  }, [navigate]);

  const handleAddClick = useCallback(() => {
    navigate('/hr/consultant-appointment/input-form');
  }, [navigate]);

  const handleDelete = useCallback(async (ca) => {
    if (!window.confirm(`Are you sure you want to delete this Consultant Appointment record (${ca.wing} / ${ca.division})? This will also remove associated candidate records and documents.`)) {
      return;
    }
    const userId = getCurrentUserId() || 1;
    try {
      await deleteConsultantAppointment(ca.id, userId);
      notify(CA_TOASTS.deleted(ca.wing, ca.division));
    } catch (err) {
      console.error("Error deleting consultant appointment:", err);
      notify(CA_TOASTS.deleteFailed(ca.wing, ca.division, getErrorMessage(err)));
    }
  }, [notify]);

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="Consultant Appointment" />;
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">
            Consultant Appointment
          </h1>
          <p className="module-header-subtitle">
            Manage and monitor Consultant Appointments across various wings and divisions.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId === 'input-form') navigate('/hr/consultant-appointment/input-form');
            else if (tabId === 'reports') navigate('/hr/consultant-appointment/reports');
            else navigate('/hr/consultant-appointment/data-list');
          }}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="data-list" element={
            <DataList
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddClick={handleAddClick}
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
              key={editData?.id ?? 'new'}
              wings={wings}
              divisions={divisions}
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
            />
          } />

          <Route path="reports" element={
            <Reports
              wings={wings}
              triggerNotification={triggerNotification}
            />
          } />

          <Route index element={<Navigate to={canView ? "data-list" : "input-form"} replace />} />
          <Route path="*" element={<Navigate to={canView ? "data-list" : "input-form"} replace />} />
        </Routes>
      </div>
    </div>
  );
}
