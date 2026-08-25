import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useCabinetNotesPermissions } from './hooks/useCabinetNotesPermissions';
import { resolveCabinetNotesListView } from './views';
import CabinetNotesReports from './pages/Reports';
import NoteForm from './pages/NoteForm';
import { fetchCabinetStages, fetchDivisions, fetchWings } from './api';

export default function CabinetNotesMOPSW({
  onGoHome,
  triggerNotification,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useCabinetNotesPermissions();

  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [stages, setStages] = useState([]);
  const [listKey, setListKey] = useState(0);
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

  useEffect(() => {
    Promise.all([
      fetchWings().catch((err) => {
        console.error(err);
        return { data: [] };
      }),
      fetchDivisions().catch((err) => {
        console.error(err);
        return { data: [] };
      }),
      fetchCabinetStages().catch((err) => {
        console.error(err);
        return { data: [] };
      }),
    ]).then(([wingsRes, divisionsRes, stagesRes]) => {
      setWings(Array.isArray(wingsRes.data) ? wingsRes.data : []);
      setDivisions(Array.isArray(divisionsRes.data) ? divisionsRes.data : []);
      setStages(Array.isArray(stagesRes.data) ? stagesRes.data : []);
    });
  }, []);

  const tabs = useMemo(() => {
    const items = [];
    if (permissions.canAdd) {
      items.push({ id: 'input-form', label: 'Input Form' });
    }
    items.push(
      { id: 'data-list', label: 'Data List' },
      { id: 'reports', label: 'Report' }
    );
    return items;
  }, [permissions.canAdd]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form') || path.includes('/add')) return 'input-form';
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    return 'data-list';
  }, [location.pathname]);

  const ListView = useMemo(
    () => resolveCabinetNotesListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  if (!permissions.canView) {
    return (
      <RestrictedAccess
        moduleName="Cabinet Notes - MoPSW"
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
            Cabinet Notes - MoPSW
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage, record, and track Cabinet Notes stages for the Ministry of Ports, Shipping and Waterways.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId === 'input-form') navigate('/governance/cabinet-notes/input-form');
            else if (tabId === 'reports') navigate('/governance/cabinet-notes/reports');
            else navigate('/governance/cabinet-notes/data-list');
          }}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="data-list" element={
            <ListView key={listKey} notify={notify} onGoHome={onGoHome} />
          } />

          {permissions.canAdd && (
            <Route path="input-form" element={
              <NoteForm
                wings={wings}
                divisions={divisions}
                stages={stages}
                initialForm={null}
                onBack={() => navigate('/governance/cabinet-notes/data-list')}
                onSuccess={() => {
                  setListKey((k) => k + 1);
                  navigate('/governance/cabinet-notes/data-list');
                }}
                notify={notify}
              />
            } />
          )}

          <Route path="reports" element={<CabinetNotesReports notify={notify} />} />

          <Route index element={<Navigate to="data-list" replace />} />
          <Route path="*" element={<Navigate to="data-list" replace />} />
        </Routes>
      </div>
    </div>
  );
}
