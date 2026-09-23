import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import ProjectBasicInformationPage from './pages/ProjectBasicInformationPage';
import DropRequestsPage from './pages/DropRequestsPage';
import ProjectsLessThan5CrPage from './pages/ProjectsLessThan5CrPage';
import ProjectDetailView from './components/ProjectDetailView';
import { useProjectsPermissions } from './hooks/useProjectsPermissions';
import { resolveProjectsListView } from './views';
import { fetchDropRequests } from './api';
import { getCurrentUserId } from '../../utils/authSession';

const INIT_TAB_KEY = 'projectsInitTab';

function resolveSubTabId(label, canAdd, isOrgUser = false) {
  const key = String(label || '').toLowerCase().trim();
  if (key.includes('view-project') || key.includes('detail')) return 'view-project';
  if (key.includes('edit')) return 'edit-info';
  if (key.includes('basic') || key.includes('input')) return (canAdd && isOrgUser) ? 'basic-info' : 'list';
  if (key.includes('drop') || key === 'view-drop-request' || key === 'projects-droprequests') {
    return isOrgUser ? 'list' : 'drop-requests';
  }
  if (
    key.includes('less5cr')
    || key.includes('less-than-5')
    || key.includes('less than 5')
    || key === 'projects-less5cr'
  ) {
    return 'less5cr-list';
  }
  return 'list';
}

export default function Projects({
  activeSubTab: activeSubTabProp,
  onGoHome,
  triggerNotification,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const permissions = useProjectsPermissions();
  const viewMode = permissions.viewMode;
  const showInputForm = Boolean(permissions.canAdd && (permissions.isOrganisationUser || viewMode === 'org'));

  const ListView = useMemo(
    () => resolveProjectsListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  const [manualSubTab, setManualSubTab] = useState(() => {
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      return resolveSubTabId(init, permissions.canAdd, permissions.isOrganisationUser);
    }
    const path = String(location.pathname || '').toLowerCase();
    if (path.includes('view-project') || path.includes('/detail')) {
      return 'view-project';
    }
    if (path.includes('view-drop-request') || path.includes('drop-request')) {
      return permissions.isOrganisationUser ? 'list' : 'drop-requests';
    }
    if (path.includes('less-than-5') || path.includes('less5cr')) {
      return 'less5cr-list';
    }
    if (path.includes('input-form') || path.includes('basic-info') || path.includes('add-project')) {
      return (permissions.canAdd && permissions.isOrganisationUser) ? 'basic-info' : 'list';
    }
    return resolveSubTabId(activeSubTabProp, permissions.canAdd, permissions.isOrganisationUser);
  });
  const [dropRequestCount, setDropRequestCount] = useState(0);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [editingRecord, setEditingRecord] = useState(null);
  const [less5CrEditingRecord, setLess5CrEditingRecord] = useState(null);
  const [less5CrListRefreshKey, setLess5CrListRefreshKey] = useState(0);
  const [formReadOnly, setFormReadOnly] = useState(false);
  const [toast, setToast] = useState(null);
  const initialOrgRouteHandledRef = useRef(false);

  useEffect(() => {
    if (permissions.isOrganisationUser) return;

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
  }, [permissions.isOrganisationUser]);

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
    const path = String(location.pathname || '').toLowerCase();
    if (!initialOrgRouteHandledRef.current) {
      initialOrgRouteHandledRef.current = true;
      const isInputFormRoute =
        path.includes('input-form') || path.includes('basic-info') || path.includes('add-project');
      const hasExplicitEditIntent = Boolean(
        location.state?.project || location.state?.editData || location.state?.fromList
      );

      if (permissions.isOrganisationUser && isInputFormRoute && !hasExplicitEditIntent) {
        setEditingRecord(null);
        setFormReadOnly(false);
        setManualSubTab('list');
        navigate('/projects/project/project-list', { replace: true });
        return;
      }
    }

    if (path.includes('view-project') || path.includes('/detail')) {
      setManualSubTab('view-project');
    } else if (path.includes('view-drop-request') || path.includes('drop-request')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab(permissions.isOrganisationUser ? 'list' : 'drop-requests');
    } else if (path.includes('less-than-5') || path.includes('less5cr')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setLess5CrEditingRecord(null);
      setManualSubTab('less5cr-list');
    } else if (path.includes('input-form') || path.includes('basic-info') || path.includes('add-project')) {
      const navProject = location.state?.project || location.state?.editData || null;
      const isEditFlow = Boolean(location.state?.fromEdit || navProject);

      if (isEditFlow) {
        if (navProject) setEditingRecord(navProject);
        setManualSubTab('edit-info');
      } else {
        setEditingRecord(null);
        setFormReadOnly(false);
        setManualSubTab((permissions.canAdd && permissions.isOrganisationUser) ? 'basic-info' : 'list');
      }
    } else if (path.includes('project-list') || path.includes('data-list')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab('list');
    }
  }, [location.pathname, location.state, permissions.canAdd, permissions.isOrganisationUser]);

  useEffect(() => {
    const onMenu = (event) => {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab(resolveSubTabId(event.detail, permissions.canAdd, permissions.isOrganisationUser));
    };

    window.addEventListener('projects-subtab', onMenu);
    return () => window.removeEventListener('projects-subtab', onMenu);
  }, [permissions.canAdd, permissions.isOrganisationUser]);

  useEffect(() => {
    if (manualSubTab === 'basic-info' && !showInputForm && !editingRecord) {
      setManualSubTab('list');
    }
  }, [manualSubTab, showInputForm, editingRecord]);

  const isLess5CrRoute = useMemo(() => {
    const path = String(location.pathname || '').toLowerCase();
    return path.includes('less-than-5') || path.includes('less5cr')
      || String(manualSubTab || '').startsWith('less5cr');
  }, [location.pathname, manualSubTab]);

  const showLess5CrInputForm = Boolean(
    permissions.canAdd
    && (permissions.isOrganisationUser || viewMode === 'org')
    && !permissions.isViewOnlyAdmin
  );

  const tabs = useMemo(() => {
    if (isLess5CrRoute) {
      const items = [{ id: 'less5cr-list', label: 'Data List' }];
      if (showLess5CrInputForm) {
        items.push({ id: 'less5cr-form', label: 'Input Form' });
      }
      return items;
    }
    const items = [{ id: 'list', label: 'Data List' }];
    if (showInputForm) {
      items.push({ id: 'basic-info', label: 'Input Form' });
    }
    if (!permissions.isOrganisationUser && permissions.canView) {
      items.push({
        id: 'drop-requests',
        label: 'Drop Requests',
        count: dropRequestCount,
      });
    }
    return items;
  }, [
    showInputForm,
    showLess5CrInputForm,
    permissions.isOrganisationUser,
    permissions.canView,
    dropRequestCount,
    isLess5CrRoute,
  ]);

  const activeSubTab = useMemo(() => {
    if (isLess5CrRoute) {
      if (manualSubTab === 'less5cr-form' || (less5CrEditingRecord && manualSubTab === 'less5cr-edit')) {
        if (manualSubTab === 'less5cr-form' && !showLess5CrInputForm && !less5CrEditingRecord) {
          return 'less5cr-list';
        }
        return manualSubTab === 'less5cr-edit' ? 'less5cr-edit' : 'less5cr-form';
      }
      return 'less5cr-list';
    }
    if (editingRecord && !['view-project', 'edit-info'].includes(manualSubTab)) return 'edit-info';
    const base = manualSubTab ?? resolveSubTabId(activeSubTabProp, permissions.canAdd, permissions.isOrganisationUser);
    if (base === 'edit-info' && !editingRecord) return 'list';
    if (base === 'basic-info' && (!permissions.canAdd || !permissions.isOrganisationUser)) {
      return 'list';
    }
    if (base === 'drop-requests' && (permissions.isOrganisationUser || !permissions.canView)) {
      return 'list';
    }
    if (base === 'less5cr' || base === 'less5cr-list') return 'list';
    return base;
  }, [
    isLess5CrRoute,
    manualSubTab,
    less5CrEditingRecord,
    showLess5CrInputForm,
    activeSubTabProp,
    permissions.canAdd,
    permissions.canView,
    permissions.isOrganisationUser,
    editingRecord,
  ]);

  if (!permissions.canView) {
    return (
      <RestrictedAccess
        moduleName="Projects"
        onGoHome={onGoHome}
      />
    );
  }

  if (activeSubTab === 'view-project') {
    return (
      <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
        <ProjectDetailView
          projectId={routeId || editingRecord?.projectId || editingRecord?.project_id}
          project={editingRecord || location.state?.project}
          canEdit={permissions.canEdit}
          onBack={() => {
            setEditingRecord(null);
            setManualSubTab('list');
            navigate('/projects/project/project-list');
          }}
          onEdit={(proj) => {
            setEditingRecord(proj);
            setManualSubTab('basic-info');
            navigate('/projects/project/input-form');
          }}
        />
      </div>
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
            <span>{isLess5CrRoute ? 'Projects Less Than 5 Cr' : 'Projects Module'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            {isLess5CrRoute
              ? 'Organisation-wise yearly summary of CAPEX projects under ₹5 Cr.'
              : 'Track and monitor infrastructure projects, milestone timelines, financial outlays, and execution progress.'}
          </p>
        </div>

        {tabs.length > 1 ? (
          <InternalNavigation
            tabs={tabs}
            currentTab={
              activeSubTab === 'edit-info'
                ? 'list'
                : activeSubTab === 'less5cr-edit'
                  ? (showLess5CrInputForm ? 'less5cr-form' : 'less5cr-list')
                  : activeSubTab
            }
            onTabChange={(tab) => {
              if (tab !== 'edit-info') {
                setEditingRecord(null);
                setFormReadOnly(false);
              }
              if (tab === 'basic-info' && !showInputForm) {
                setManualSubTab('list');
                return;
              }
              if (tab === 'less5cr-list') {
                setLess5CrEditingRecord(null);
                setManualSubTab('less5cr-list');
                return;
              }
              if (tab === 'less5cr-form') {
                if (!showLess5CrInputForm) {
                  setManualSubTab('less5cr-list');
                  return;
                }
                setLess5CrEditingRecord(null);
                setManualSubTab('less5cr-form');
                return;
              }
              setManualSubTab(tab);
            }}
          />
        ) : null}
      </div>

      <div className="space-y-8">
        {activeSubTab === 'less5cr-list' ? (
          <ProjectsLessThan5CrPage
            key={`less5cr-list-${less5CrListRefreshKey}`}
            view="list"
            notify={notify}
            onEdit={(row) => {
              setLess5CrEditingRecord(row);
              setManualSubTab(showLess5CrInputForm ? 'less5cr-form' : 'less5cr-edit');
            }}
          />
        ) : null}

        {activeSubTab === 'less5cr-form' || activeSubTab === 'less5cr-edit' ? (
          <ProjectsLessThan5CrPage
            view="form"
            notify={notify}
            initialData={less5CrEditingRecord}
            onBack={() => {
              setLess5CrEditingRecord(null);
              setManualSubTab('less5cr-list');
            }}
            onSuccess={() => {
              setLess5CrEditingRecord(null);
              setManualSubTab('less5cr-list');
              setLess5CrListRefreshKey((prev) => prev + 1);
            }}
          />
        ) : null}

        {activeSubTab === 'list' ? (
          <ListView
            key={listRefreshKey}
            notify={notify}
            onAddNew={
              showInputForm
                ? () => {
                    setEditingRecord(null);
                    setFormReadOnly(false);
                    setManualSubTab('basic-info');
                    navigate('/projects/project/input-form');
                  }
                : undefined
            }
            onOpenBasicInfo={(row, options = {}) => {
              setEditingRecord(row);
              setFormReadOnly(
                Boolean(options.readOnly) || (!permissions.canEdit && permissions.canView)
              );
              setManualSubTab('edit-info');
              navigate('/projects/project/input-form', { state: { project: row, fromEdit: true } });
            }}
            onOpenProjectDetail={(row) => {
              setEditingRecord(row);
              setManualSubTab('view-project');
              const pid = row?.projectId || row?.project_id || row?.raw?.project_id;
              const subId = row?.subProjectId || row?.sub_project_id || row?.raw?.sub_project_id;
              const cleanSub = subId && subId !== '-' && subId !== 'null' ? subId : null;
              if (pid) {
                navigate(`/projects/project/view-project/${pid}${cleanSub ? `?subId=${cleanSub}` : ''}`, { state: { project: row } });
              }
            }}
          />
        ) : null}

        {activeSubTab === 'basic-info' || activeSubTab === 'edit-info' ? (
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

        {activeSubTab === 'drop-requests' && !permissions.isOrganisationUser ? (
          <DropRequestsPage notify={notify} />
        ) : null}
      </div>
    </div>
  );
}
