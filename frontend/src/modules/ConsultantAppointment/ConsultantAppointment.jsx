import React, { useEffect, useMemo } from 'react';
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

export default function ConsultantAppointmentView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useConsultantPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  // Zustand CA Store
  const {
    editData,
    setEditData,
    clearEditData,
    wings,
    divisions,
    loadWingsAndDivisions,
    setActiveTab
  } = useCaStore();

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

  // Sync tab with store
  useEffect(() => {
    setActiveTab(currentTab);
  }, [currentTab, setActiveTab]);

  // Load wings and divisions once via store
  useEffect(() => {
    loadWingsAndDivisions();
  }, [loadWingsAndDivisions]);

  const handleEdit = (ca) => {
    setEditData(ca);
    navigate('/hr/consultant-appointment/input-form', { state: { item: ca } });
  };

  const handleSuccess = () => {
    clearEditData();
    navigate('/hr/consultant-appointment/data-list');
  };

  const handleBack = () => {
    clearEditData();
    navigate('/hr/consultant-appointment/data-list');
  };

  const handleDelete = async (ca) => {
    if (!window.confirm(`Are you sure you want to delete this Consultant Appointment record (${ca.wing} / ${ca.division})? This will also remove associated candidate records and documents.`)) {
      return;
    }
    const userId = getCurrentUserId() || 1;
    try {
      await deleteConsultantAppointment(ca.id, userId);
      if (triggerNotification) {
        triggerNotification("Consultant Appointment and associated candidates deleted successfully.", "success");
      }
    } catch (err) {
      console.error("Error deleting consultant appointment:", err);
      if (triggerNotification) {
        triggerNotification("Failed to delete Consultant Appointment.", "error");
      }
    }
  };

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
            if (tabId !== 'input-form') clearEditData();
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
              onAddClick={() => navigate('/hr/consultant-appointment/input-form')}
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
