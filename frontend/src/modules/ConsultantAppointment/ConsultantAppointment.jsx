import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useConsultantPermissions } from './hooks/useConsultantPermissions';
import { fetchWings, fetchDivisions, deleteConsultantAppointment } from './api';
import { getCurrentUserId } from '../../utils/authSession';

export default function ConsultantAppointmentView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useConsultantPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  const [editData, setEditData] = useState(null);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

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

  useEffect(() => {
    fetchWings()
      .then(res => setWings(res.data || []))
      .catch(err => console.error("Error loading wings:", err));

    fetchDivisions()
      .then(res => setDivisions(res.data || []))
      .catch(err => console.error("Error loading divisions:", err));
  }, []);

  const handleEdit = (ca) => {
    setEditData(ca);
    navigate('/hr/consultant-appointment/input-form', { state: { item: ca } });
  };

  const handleSuccess = () => {
    setEditData(null);
    navigate('/hr/consultant-appointment/data-list');
  };

  const handleBack = () => {
    setEditData(null);
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
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Consultant Appointment
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Manage and monitor Consultant Appointments across various wings and divisions.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId !== 'input-form') setEditData(null);
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
