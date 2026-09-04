import { useCallback, useEffect, useMemo, useState } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import ProjectListPage from './pages/ProjectListPage';
import ProjectBasicInformationPage from './pages/ProjectBasicInformationPage';
import { useProjectsPermissions } from './hooks/useProjectsPermissions';

const INIT_TAB_KEY = 'projectsInitTab';

function resolveSubTabId(label, canAdd) {
  const key = String(label || '').toLowerCase().trim();
  if (key.includes('basic') || key.includes('input')) return canAdd ? 'basic-info' : 'list';
  return 'list';
}

export default function Projects({
  activeSubTab: activeSubTabProp,
  onGoHome,
  triggerNotification,
}) {
  const permissions = useProjectsPermissions();
  const [manualSubTab, setManualSubTab] = useState(() => {
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (!init) return null;
    sessionStorage.removeItem(INIT_TAB_KEY);
    return resolveSubTabId(init, true);
  });
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [editingRecord, setEditingRecord] = useState(null);
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
    const onMenu = (event) => {
      setManualSubTab(resolveSubTabId(event.detail, permissions.canAdd));
    };

    window.addEventListener('projects-subtab', onMenu);
    return () => window.removeEventListener('projects-subtab', onMenu);
  }, [permissions.canAdd]);

  const tabs = useMemo(() => {
    const items = [{ id: 'list', label: 'Data List' }];
    if (permissions.canAdd || permissions.canEdit) {
      items.push({ id: 'basic-info', label: 'Input Form' });
    }
    return items;
  }, [permissions.canAdd, permissions.canEdit]);

  const activeSubTab = useMemo(() => {
    const base = manualSubTab ?? resolveSubTabId(activeSubTabProp, permissions.canAdd);
    if (base === 'basic-info' && !permissions.canAdd && !permissions.canEdit) {
      return 'list';
    }
    return base;
  }, [manualSubTab, activeSubTabProp, permissions.canAdd, permissions.canEdit]);

  if (!permissions.canView) {
    return (
      <RestrictedAccess
        moduleName="Projects"
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      {toast ? (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-300 tracking-wide uppercase font-display">
            Projects Module
          </h1>

        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeSubTab}
          onTabChange={(tab) => setManualSubTab(tab)}
        />
      </div>

      <div className="space-y-8">
        {activeSubTab === 'list' ? (
          <ProjectListPage
            key={listRefreshKey}
            notify={notify}
            onOpenBasicInfo={(row) => {
              setEditingRecord(row);
              setManualSubTab('basic-info');
            }}
          />
        ) : null}

        {activeSubTab === 'basic-info' ? (
          <ProjectBasicInformationPage
            initialData={editingRecord}
            notify={notify}
            onBack={() => {
              setEditingRecord(null);
              setManualSubTab('list');
            }}
            onSuccess={() => {
              setEditingRecord(null);
              setManualSubTab('list');
              setListRefreshKey((prev) => prev + 1);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
