import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useCabinetNotesPermissions } from './hooks/useCabinetNotesPermissions';
import resolveCabinetNotesListView from './views';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { fetchCabinetMinistry, fetchWings, deleteCabinetMinistry } from './api';

export default function CabinetNotesOther({
  onGoHome,
  triggerNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useCabinetNotesPermissions();

  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [wingsList, setWingsList] = useState([]);
  const [toast, setToast] = useState(null);

  const notify = useCallback(
    (message, type = 'success') => {
      if (typeof triggerNotification === 'function') {
        triggerNotification(message);
        return;
      }
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    [triggerNotification]
  );

  const getActiveUserId = () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.user_id || payload.id || 1;
      }
    } catch (e) {
      console.error("Error decoding token:", e);
    }
    return 1;
  };

  useEffect(() => {
    fetchWings()
      .then(res => setWingsList(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Error loading wings:", err));
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const userId = getActiveUserId();
    fetchCabinetMinistry(userId)
      .then(res => {
        setRowData(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error("Error loading Cabinet Notes Other Ministry data:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs = useMemo(() => {
    const items = [];
    if (permissions.canAdd) {
      items.push({ id: 'input-form', label: 'Input Form' });
    }
    items.push(
      { id: 'data-list', label: 'Data List' },
      { id: 'reports', label: 'Reports' }
    );
    return items;
  }, [permissions.canAdd]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) return 'input-form';
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    return 'data-list';
  }, [location.pathname]);

  const ListView = useMemo(
    () => resolveCabinetNotesListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  const handleEdit = (note) => {
    if (!permissions.canEdit) {
      notify("You do not have permission to edit records.", "error");
      return;
    }
    setEditData(note);
    navigate('/governance/cabinet-notes-other-ministry/input-form', { state: { item: note } });
  };

  const handleDelete = async (note) => {
    if (!permissions.canRemove) {
      notify("You do not have permission to delete records.", "error");
      return;
    }
    const noteId = note.cabinet_notes_ministry_id;
    if (!noteId) return;

    if (window.confirm("Deleting the record will also delete the stored data. Are you sure you want to delete?")) {
      try {
        const userId = getActiveUserId();
        await deleteCabinetMinistry(noteId, userId);
        notify("Cabinet Notes Ministry record deleted successfully.");
        fetchData();
      } catch (err) {
        console.error("Delete error:", err);
        notify("Error deleting record. Please try again.", "error");
      }
    }
  };

  const handleSuccess = () => {
    setEditData(null);
    fetchData();
    navigate('/governance/cabinet-notes-other-ministry/data-list');
  };

  const handleBack = () => {
    setEditData(null);
    navigate('/governance/cabinet-notes-other-ministry/data-list');
  };

  if (!permissions.canView) {
    return (
      <RestrictedAccess
        moduleName="Cabinet Notes - Other Ministry"
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-300 tracking-wide uppercase font-display">
            Cabinet Notes - Other Ministries
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage, record, and track Cabinet Notes stages for Other Ministries.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId !== 'input-form') setEditData(null);
            if (tabId === 'input-form') navigate('/governance/cabinet-notes-other-ministry/input-form');
            else if (tabId === 'reports') navigate('/governance/cabinet-notes-other-ministry/reports');
            else navigate('/governance/cabinet-notes-other-ministry/data-list');
          }}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="data-list" element={
            <ListView
              rowData={rowData}
              loading={loading}
              wingsList={wingsList}
              onEdit={handleEdit}
              onDelete={handleDelete}
              notify={notify}
              canEdit={permissions.canEdit}
              canRemove={permissions.canRemove}
            />
          } />

          {permissions.canAdd && (
            <Route path="input-form" element={
              <InputForm
                wingsList={wingsList}
                editData={editData}
                onSuccess={handleSuccess}
                onBack={handleBack}
                notify={notify}
              />
            } />
          )}

          <Route path="reports" element={<Reports notify={notify} />} />

          <Route index element={<Navigate to="data-list" replace />} />
          <Route path="*" element={<Navigate to="data-list" replace />} />
        </Routes>
      </div>
    </div>
  );
}
