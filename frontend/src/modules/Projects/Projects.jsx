import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import ProjectBasicInformationPage from './pages/ProjectBasicInformationPage';
import DropRequestsPage from './pages/DropRequestsPage';
import { useProjectsPermissions } from './hooks/useProjectsPermissions';
import { resolveProjectsListView } from './views';
import { fetchDropRequests } from './api';
import { getCurrentUserId } from '../../utils/authSession';

const INIT_TAB_KEY = 'projectsInitTab';

function resolveSubTabId(label, canAdd) {
  const key = String(label || '').toLowerCase().trim();
  if (key.includes('basic') || key.includes('input')) return canAdd ? 'basic-info' : 'list';
  if (key.includes('drop') || key === 'view-drop-request' || key === 'projects-droprequests') return 'drop-requests';
  return 'list';
}

export default function Projects({
  activeSubTab: activeSubTabProp,
  onGoHome,
  triggerNotification,
}) {
  const location = useLocation();
  const permissions = useProjectsPermissions();
  const ListView = useMemo(
    () => resolveProjectsListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  const [manualSubTab, setManualSubTab] = useState(() => {
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      return resolveSubTabId(init, permissions.canAdd);
    }
    if (location.pathname.includes('view-drop-request') || location.pathname.includes('projects-dropRequests')) {
      return 'drop-requests';
    }
    return resolveSubTabId(activeSubTabProp, permissions.canAdd);
  });
  const [dropRequestCount, setDropRequestCount] = useState(0);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formReadOnly, setFormReadOnly] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const uid = getCurrentUserId() || 1;
        const res = await fetchDropRequests(uid);
        const data = res.data || [];
        const pending = data.filter(
          (item) => item.reject_request_status !== 0 && !item.drop_date
        );
        if (isMounted) {
          setDropRequestCount(pending.length);
        }
      } catch (err) {
        console.error('Failed to fetch drop request count:', err);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    window.addEventListener('drop-request-updated', fetchCount);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('drop-request-updated', fetchCount);
    };
  }, []);

  const notify = useCallback(
    (message, type = 'success') => {
      if (typeof triggerNotification === 'function') {
        triggerNotification(message, type);
        return;
      }

      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    [triggerNotification]
  );

  useEffect(() => {
    if (location.pathname.includes('view-drop-request') || location.pathname.includes('projects-dropRequests')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab('drop-requests');
    }
  }, [location.pathname]);

  useEffect(() => {
    const onMenu = (event) => {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab(resolveSubTabId(event.detail, permissions.canAdd));
    };

    window.addEventListener('projects-subtab', onMenu);
    return () => window.removeEventListener('projects-subtab', onMenu);
  }, [permissions.canAdd]);

  const tabs = useMemo(() => {
    const items = [{ id: 'list', label: 'Data List' }];
    if (permissions.canAdd) {
      items.push({ id: 'basic-info', label: 'Input Form' });
    }
    items.push({
      id: 'drop-requests',
      label: 'Drop Requests',
      count: dropRequestCount,
    });
    return items;
  }, [permissions.canAdd, dropRequestCount]);

  const activeSubTab = useMemo(() => {
    if (editingRecord) return 'basic-info';
    const base = manualSubTab ?? resolveSubTabId(activeSubTabProp, permissions.canAdd);
    if (base === 'basic-info' && !permissions.canAdd) {
      return 'list';
    }
    return base;
  }, [manualSubTab, activeSubTabProp, permissions.canAdd, editingRecord]);

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
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[#0f417a] dark:text-blue-400" />
            <span>Projects Module</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Track and monitor infrastructure projects, milestone timelines, financial outlays, and execution progress.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={
            activeSubTab === 'basic-info' && editingRecord && !permissions.canAdd
              ? 'list'
              : activeSubTab
          }
          onTabChange={(tab) => {
            setEditingRecord(null);
            setFormReadOnly(false);
            setManualSubTab(tab);
          }}
        />
      </div>

      <div className="space-y-8">
        {activeSubTab === 'list' ? (
          <ListView
            key={listRefreshKey}
            notify={notify}
            onAddNew={() => {
              setEditingRecord(null);
              setFormReadOnly(false);
              setManualSubTab('basic-info');
            }}
            onOpenBasicInfo={(row, options = {}) => {
              setEditingRecord(row);
              setFormReadOnly(
                Boolean(options.readOnly) || (!permissions.canEdit && permissions.canView)
              );
              setManualSubTab('basic-info');
            }}
          />
        ) : null}

        {activeSubTab === 'basic-info' ? (
          <ProjectBasicInformationPage
            initialData={editingRecord}
            notify={notify}
            forceReadOnly={formReadOnly}
            onBack={() => {
              setEditingRecord(null);
              setFormReadOnly(false);
              setManualSubTab('list');
            }}
            onSuccess={() => {
              setEditingRecord(null);
              setFormReadOnly(false);
              setManualSubTab('list');
              setListRefreshKey((prev) => prev + 1);
            }}
          />
        ) : null}

        {activeSubTab === 'drop-requests' ? (
          <DropRequestsPage notify={notify} />
        ) : null}
      </div>
    </div>
  );
}
