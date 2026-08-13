import { useCallback, useEffect, useMemo, useState } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useCabinetNotesPermissions } from './hooks/useCabinetNotesPermissions';
import { resolveCabinetNotesListView } from './views';
import CabinetNotesReports from './pages/Reports';
import NoteForm from './pages/NoteForm';
import { fetchCabinetStages, fetchDivisions, fetchWings } from './api';

const INIT_TAB_KEY = 'cabinetNotesMopswInitTab';

function resolveSubTabId(label, canAdd) {
  if (label === 'Input Form') return canAdd ? 'add' : 'list';
  if (label === 'Reports' || label === 'Report') return 'report';
  if (label === 'Data List') return 'list';
  return null;
}

export default function CabinetNotesMOPSW({
  activeSubTab: activeSubTabProp,
  onGoHome,
  triggerNotification,
}) {
  const permissions = useCabinetNotesPermissions();
  const [activeSubTab, setActiveSubTab] = useState('list');
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
    Promise.all([fetchWings(), fetchDivisions(), fetchCabinetStages()])
      .then(([wingsRes, divisionsRes, stagesRes]) => {
        setWings(Array.isArray(wingsRes.data) ? wingsRes.data : []);
        setDivisions(Array.isArray(divisionsRes.data) ? divisionsRes.data : []);
        setStages(Array.isArray(stagesRes.data) ? stagesRes.data : []);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const apply = (label) => {
      const next = resolveSubTabId(label, permissions.canAdd);
      if (next) setActiveSubTab(next);
    };

    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      apply(init);
    }

    const onMenu = (e) => apply(e.detail);
    window.addEventListener('cabinet-notes-mopsw-subtab', onMenu);
    return () => window.removeEventListener('cabinet-notes-mopsw-subtab', onMenu);
  }, [permissions.canAdd]);

  useEffect(() => {
    const next = resolveSubTabId(activeSubTabProp, permissions.canAdd);
    if (next) setActiveSubTab(next);
  }, [activeSubTabProp, permissions.canAdd]);

  useEffect(() => {
    if (activeSubTab === 'add' && !permissions.canAdd) {
      setActiveSubTab('list');
    }
  }, [activeSubTab, permissions.canAdd]);

  const tabs = useMemo(() => {
    const items = [];
    if (permissions.canAdd) {
      items.push({ id: 'add', label: 'Input Form' });
    }
    items.push(
      { id: 'list', label: 'Data List' },
      { id: 'report', label: 'Report' }
    );
    return items;
  }, [permissions.canAdd]);

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
            <span className="text-slate-400 dark:text-slate-500">
              {' '}
              · Scope: {permissions.dataScopeCode || '-'} · View: {permissions.uiViewCode}
              {permissions.isViewOnlyAdmin ? ' · View Only Admin' : ''}
            </span>
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeSubTab}
          onTabChange={setActiveSubTab}
        />
      </div>

      <div className="space-y-8">
        {activeSubTab === 'list' && (
          <ListView key={listKey} notify={notify} onGoHome={onGoHome} />
        )}

        {activeSubTab === 'add' && permissions.canAdd && (
          <NoteForm
            wings={wings}
            divisions={divisions}
            stages={stages}
            initialForm={null}
            onBack={() => setActiveSubTab('list')}
            onSuccess={() => {
              setListKey((k) => k + 1);
              setActiveSubTab('list');
            }}
            notify={notify}
          />
        )}

        {activeSubTab === 'report' && <CabinetNotesReports notify={notify} />}
      </div>
    </div>
  );
}
