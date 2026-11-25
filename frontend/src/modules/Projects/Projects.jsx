import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
// import { FolderKanban } from 'lucide-react';
import { FolderKanban, ListChecks, PlusCircle } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import ProjectBasicInformationPage from './pages/ProjectBasicInformationPage';
import AddSubProjectPage from './pages/AddSubProjectPage';
import DropRequestsPage from './pages/DropRequestsPage';
import ProjectsLessThan5CrPage from './pages/ProjectsLessThan5CrPage';
import LumpsumIwai from './pages/lumpsumListPage'; 
import LumpsumFormPage from './pages/addLumpsumFormPage';
import ProjectReportsPage from './pages/ProjectReportsPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import ProjectDetailView from './components/ProjectDetailView';
import { useProjectsPermissions } from './hooks/useProjectsPermissions';
import { resolveProjectsListView } from './views';
import { fetchDropRequests, fetchLumpsumData } from './api';
import { getCurrentUserId } from '../../utils/authSession';

const INIT_TAB_KEY = 'projectsInitTab';

function resolveSubTabId(label, canAdd, isOrgScope = false) {
  const key = String(label || '').toLowerCase().trim();

  if (key.includes('lumpsum-iwai-input-form')) {
    return 'input-form';
  }

  if (key.includes('lumpsum-iwai-list') || key.includes('lumpsum')) {
    return 'lumpsum-iwai-list';
  }

  if (key.includes('dashboard')) return 'dashboard';
  if (key.includes('view-project') || key.includes('detail')) return 'view-project';
  if (key.includes('report')) return 'reports';

  if (key.includes('sub-project') || key.includes('subproject')) {
    return (canAdd && isOrgScope) ? 'add-sub-project' : 'list';
  }

  if (key.includes('edit')) return 'edit-info';

  if (key.includes('basic') || key.includes('input')) {
    return (canAdd && isOrgScope) ? 'basic-info' : 'list';
  }

  if (key.includes('drop') || key === 'view-drop-request' || key === 'projects-droprequests') {
    return isOrgScope ? 'list' : 'drop-requests';
  }

  if (
    key.includes('less5cr') ||
    key.includes('less-than-5') ||
    key.includes('less than 5') ||
    key === 'projects-less5cr'
  ) {
    return 'less5cr-list';
  }

  return 'list';
}

function resolveLumpsumRoute(pathname) {
  const path = String(pathname || '').toLowerCase();

  if (path.includes('lumpsum-iwai-input-form')) {
    return 'input-form';
  }

  // if (path.includes('lumpsum-iwai-dashboard')) {
  //   return 'dashboard';
  // }

  // if (path.includes('lumpsum-iwai-reports')) {
  //   return 'reports';
  // }

  if (
    path.includes('lumpsum-iwai-list') ||
    path.includes('/data-list') ||
    path.includes('/project-list')
  ) {
    return 'lumpsum-iwai-list';
  }

  return 'lumpsum-iwai-list';
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
  const isOrgScope = Boolean(permissions.isOrgScope);
  const showInputForm = Boolean(permissions.canAdd && isOrgScope);
  const canAccessDropRequests = Boolean(permissions.canView && !isOrgScope);
  // Only Data QC reports remain (MIS is hidden), and those are Ministry only
  const canAccessReports = Boolean(permissions.canView && !isOrgScope);

  const LUMPSUM_ORG_ID = '17';
  const canAccessLumpsum = Boolean(
    permissions.canView &&
    (!isOrgScope || String(permissions.organisationId) === LUMPSUM_ORG_ID)
  );

  const ListView = useMemo(
    () => resolveProjectsListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  const [manualSubTab, setManualSubTab] = useState(() => {
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      return resolveSubTabId(init, permissions.canAdd, isOrgScope);
    }
    const path = String(location.pathname || '').toLowerCase();
    if (path.includes('view-project') || path.includes('/detail')) {
      return 'view-project';
    }
    if (path.includes('dashboard')) {
      return 'dashboard';
    }
    if (path.includes('report')) {
      return canAccessReports ? 'reports' : 'list';
    }
    if (path.includes('view-drop-request') || path.includes('drop-request')) {
      return canAccessDropRequests ? 'drop-requests' : 'list';
    }
    if (path.includes('lumpsum')) {
      return resolveLumpsumRoute(path);
    }       
    if (path.includes('less-than-5') || path.includes('less5cr')) {
      return 'less5cr-list';
    }
    if (path.includes('add-sub-project')) {
      return showInputForm ? 'add-sub-project' : 'list';
    }
    if (path.includes('input-form') || path.includes('basic-info') || path.includes('add-project')) {
      return showInputForm ? 'basic-info' : 'list';
    }
    return resolveSubTabId(activeSubTabProp, permissions.canAdd, isOrgScope);
  });
  const [lumpsumContext, setLumpsumContext] = useState(() => {
  const p = String(location.pathname || '').toLowerCase();
  return p.includes('lumpsum') || String(manualSubTab || '').startsWith('lumpsum');
});
const [lumpsumEditingRecord, setLumpsumEditingRecord] = useState(null);
const [lumpsumRefreshKey, setLumpsumRefreshKey] = useState(0);
  const [dropRequestCount, setDropRequestCount] = useState(0);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [editingRecord, setEditingRecord] = useState(null);
  const [less5CrEditingRecord, setLess5CrEditingRecord] = useState(null);
  const [less5CrListRefreshKey, setLess5CrListRefreshKey] = useState(0);
  const [formReadOnly, setFormReadOnly] = useState(false);
  const [toast, setToast] = useState(null);
  const initialOrgRouteHandledRef = useRef(false);

  useEffect(() => {
    if (!canAccessDropRequests) return undefined;

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
  }, [canAccessDropRequests]);

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

    const isOtherKnownRoute = [
      'view-project', '/detail', 'dashboard', 'report', 'drop-request',
      'add-sub-project', 'input-form', 'basic-info', 'add-project',
      'project-list', 'data-list', 'less-than-5', 'less5cr',
    ].some((k) => path.includes(k));

    if (path.includes('lumpsum') && !canAccessLumpsum) {
      setManualSubTab('list');
      navigate('/projects/project/project-list', { replace: true });
      return;
    }

    if (path.includes('lumpsum')) setLumpsumContext(true);
    else if (isOtherKnownRoute) setLumpsumContext(false);

    if (!initialOrgRouteHandledRef.current) {
      initialOrgRouteHandledRef.current = true;
     const isLumpsumInputFormRoute = path.includes('lumpsum-iwai-input-form');

    const isInputFormRoute =
      !isLumpsumInputFormRoute &&
      (
        path.includes('input-form') ||
        path.includes('basic-info') ||
        path.includes('add-project')
      );

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
    } else if (path.includes('dashboard')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab('dashboard');
    } else if (path.includes('report')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab(canAccessReports ? 'reports' : 'list');
    } else if (path.includes('view-drop-request') || path.includes('drop-request')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab(canAccessDropRequests ? 'drop-requests' : 'list');
    } else if (path.includes('lumpsum')) {
        setEditingRecord(null);
        setFormReadOnly(false);

        const lumpsumTab = resolveLumpsumRoute(path);

        setLumpsumContext(true);
        setManualSubTab(lumpsumTab);

        if (lumpsumTab !== 'input-form') {
          setLumpsumEditingRecord(null);
        }
      } else if (path.includes('less-than-5') || path.includes('less5cr')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setLess5CrEditingRecord(null);
      setManualSubTab('less5cr-list');
    } else if (path.includes('add-sub-project')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab(showInputForm ? 'add-sub-project' : 'list');
    } else if (path.includes('input-form') || path.includes('basic-info') || path.includes('add-project')) {
      const navProject = location.state?.project || location.state?.editData || null;
      const isEditFlow = Boolean(location.state?.fromEdit || navProject);

      if (isEditFlow) {
        if (navProject) setEditingRecord(navProject);
        setManualSubTab('edit-info');
      } else {
        setEditingRecord(null);
        setFormReadOnly(false);
        setManualSubTab(showInputForm ? 'basic-info' : 'list');
      }
    } else if (path.includes('project-list') || path.includes('data-list')) {
      setEditingRecord(null);
      setFormReadOnly(false);
      setManualSubTab('list');
    }
  }, [
    location.pathname,
    location.state,
    showInputForm,
    canAccessDropRequests,
    canAccessReports,
    canAccessLumpsum,
    permissions.isOrganisationUser,
  ]);

  useEffect(() => {
    const onMenu = (event) => {
      setEditingRecord(null);
      setFormReadOnly(false);
      const next = String(resolveSubTabId(event.detail, permissions.canAdd, isOrgScope));
      setLumpsumContext(next.startsWith('lumpsum'));
      // setManualSubTab(resolveSubTabId(event.detail, permissions.canAdd, isOrgScope));
      setManualSubTab(next);
    };

    window.addEventListener('projects-subtab', onMenu);
    return () => window.removeEventListener('projects-subtab', onMenu);
  }, [permissions.canAdd, isOrgScope]);

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

  const isLumpsumRoute =
  manualSubTab === 'input-form' || manualSubTab === 'lumpsum-iwai-list';

  const isReportsRoute = useMemo(() => {
    const path = String(location.pathname || '').toLowerCase();
    return path.includes('report') || manualSubTab === 'reports';
  }, [location.pathname, manualSubTab]);

  const showLess5CrInputForm = Boolean(
    permissions.canAdd && isOrgScope && !permissions.isViewOnlyAdmin
  );
  // Org users (org 17): Add + Edit
  const showLumpsumInputForm = Boolean(
    permissions.canAdd && isOrgScope && !permissions.isViewOnlyAdmin
  );

  // Ministry + Org 17: Edit only (Update form)
  const canEditLumpsum = Boolean(
    permissions.canEdit && !permissions.isViewOnlyAdmin
  );

 const canViewReports = canAccessReports;
  const tabs = useMemo(() => {
  if (isLess5CrRoute) {
    const items = [];
    if (showLess5CrInputForm) items.push({ id: 'less5cr-form', label: 'Input Form' });
    items.push({ id: 'less5cr-list', label: 'Data List' });
    return items;
  }

  const items = [{ id: 'dashboard', label: 'Dashboard' }];

  if (showInputForm) {
    items.push({ id: 'basic-info', label: 'Input Form' });
    items.push({ id: 'add-sub-project', label: 'Add Sub Project' });
  }

  if (canAccessDropRequests) {
    items.push({ id: 'drop-requests', label: 'Drop Requests', count: dropRequestCount });
  }

  items.push({ id: 'list', label: 'Data List' });

  // Lumpsum: dropdown group (Data List first, then Input Form)
  if (canAccessLumpsum) {
    const lumpsumMenu = [{ id: 'lumpsum-iwai-list', label: 'Data List' }];
    if (showLumpsumInputForm) lumpsumMenu.push({ id: 'input-form', label: 'Input Form' });

    items.push({
      id: 'lumpsum',
      label: 'Lumpsum',
      isGroup: true,
      subMenu: lumpsumMenu,
    });
  }

  if (canAccessReports) items.push({ id: 'reports', label: 'Reports' });
  return items;
}, [
  showInputForm,
  showLess5CrInputForm,
  showLumpsumInputForm,
  canAccessLumpsum,
  canAccessDropRequests,
  canAccessReports,
  dropRequestCount,
  isLess5CrRoute,
]);


// const tabs = useMemo(() => {
  //   if (isLess5CrRoute) {
  //     const items = [];
  //     if (showLess5CrInputForm) items.push({ id: 'less5cr-form', label: 'Input Form' });
  //     items.push({ id: 'less5cr-list', label: 'Data List' });
  //     return items;
  //   }

  //   const items = [{ id: 'dashboard', label: 'Dashboard' }];

  //   if (showInputForm) {
  //     items.push({ id: 'basic-info', label: 'Input Form' });
  //     items.push({ id: 'add-sub-project', label: 'Add Sub Project' });
  //   }

  //   if (canAccessDropRequests) {
  //     items.push({ id: 'drop-requests', label: 'Drop Requests', count: dropRequestCount });
  //   }

  //   items.push({ id: 'list', label: 'Data List' });

  //   if (canAccessLumpsum) {
  //     const lumpsumMenu = [];
  //     if (showLumpsumInputForm) lumpsumMenu.push({ id: 'input-form', label: 'Input Form' });
  //     lumpsumMenu.push({ id: 'lumpsum-iwai-list', label: 'Data List' });

  //     items.push({
  //       id: 'lumpsum',
  //       label: 'Lumpsum',
  //       isGroup: true,
  //       subMenu: lumpsumMenu,
  //     });
  //   }

  //   if (canAccessReports) items.push({ id: 'reports', label: 'Reports' });
  //     return items;
  //   }, [
  //     showInputForm,
  //     showLess5CrInputForm,
  //     showLumpsumInputForm,
  //     canAccessLumpsum,
  //     canAccessDropRequests,
  //     canAccessReports,
  //     dropRequestCount,
  //     isLess5CrRoute,
  // ]);

  const activeSubTab = useMemo(() => {
    if ((isReportsRoute || manualSubTab === 'reports') && canViewReports) return 'reports';
      if (isLumpsumRoute) {
        if (manualSubTab === 'dashboard') return 'dashboard';

        if (manualSubTab === 'input-form' && (showLumpsumInputForm || canEditLumpsum)) {
          return 'input-form';
        }

        if (manualSubTab === 'lumpsum-iwai-list') {
          return 'lumpsum-iwai-list';
        }

        return 'lumpsum-iwai-list';
      }
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
    const base = manualSubTab ?? resolveSubTabId(activeSubTabProp, permissions.canAdd, isOrgScope);
    if (base === 'reports' && !canAccessReports) return 'list';
    if (base === 'edit-info' && !editingRecord) return 'list';
    if ((base === 'basic-info' || base === 'add-sub-project') && !showInputForm) {
      return 'list';
    }
    if (base === 'drop-requests' && !canAccessDropRequests) {
      return 'list';
    }
    if (base === 'less5cr' || base === 'less5cr-list') return 'list';
    return base;
  }, [
    isReportsRoute,
    isLess5CrRoute,
    isLumpsumRoute, 
    manualSubTab,
    less5CrEditingRecord,
    showLess5CrInputForm,
    showLumpsumInputForm,  
    canEditLumpsum,         
    showInputForm,
    canAccessDropRequests,
    canAccessReports,
    activeSubTabProp,
    permissions.canAdd,
    isOrgScope,
    editingRecord,
  ]);

  const isLumpsumActive =
  activeSubTab === 'input-form' || activeSubTab === 'lumpsum-iwai-list';

  const handleLumpsumSubItem = (subId) => {
    setEditingRecord(null);
    setFormReadOnly(false);
    setLumpsumEditingRecord(null);

    if (subId === 'input-form' && showLumpsumInputForm) {
      setManualSubTab('input-form');
      navigate('/projects/project/lumpsum-iwai-input-form');
      return;
    }

    setManualSubTab('lumpsum-iwai-list');
    navigate('/projects/project/lumpsum-iwai-list');
  };

  const [lumpsumRows, setLumpsumRows] = useState([]);
  const [lumpsumLoading, setLumpsumLoading] = useState(false);

  useEffect(() => {
  if (activeSubTab !== 'lumpsum-iwai-list') return;

  let isMounted = true;

  const loadLumpsumData = async () => {
    try {
      setLumpsumLoading(true);

      const response = await fetchLumpsumData();

      console.log('LumpSum List API Response:', response.data);

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.recordset || [];

      if (isMounted) {
        setLumpsumRows(data);
      }
    } catch (error) {
      console.error(
        'Failed to load LumpSum list:',
        error.response?.data || error
      );

      if (isMounted) {
        setLumpsumRows([]);
        notify('Unable to load LumpSum data.', 'error');
      }
    } finally {
      if (isMounted) {
        setLumpsumLoading(false);
      }
    }
  };

  loadLumpsumData();

  return () => {
    isMounted = false;
  };
}, [activeSubTab, lumpsumRefreshKey]);

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
          canEdit={Boolean(permissions.canEdit && !permissions.isViewOnlyAdmin)}
          onBack={() => {
            setEditingRecord(null);
            setManualSubTab('list');
            navigate('/projects/project/project-list');
          }}
          onEdit={(proj) => {
            if (!permissions.canEdit || permissions.isViewOnlyAdmin) return;
            setEditingRecord(proj);
            setManualSubTab('edit-info');
            navigate('/projects/project/input-form', { state: { project: proj, fromEdit: true } });
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
            <span>
              {isLumpsumRoute
                ? 'Lumpsum - IWAI'
                : isReportsRoute
                  ? 'Projects Reports'
                  : isLess5CrRoute
                    ? 'Projects Less Than 5 Cr'
                    : 'Projects Module'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
           {isLumpsumRoute
              ? 'Project-wise LumpSum cost details for IWAI.'
              : isReportsRoute
                ? 'Ministry Data QC (Gap Analysis) for data-quality follow-up.'
                : isLess5CrRoute
                  ? 'Organisation-wise yearly summary of CAPEX projects under ₹5 Cr.'
                  : 'Track and monitor infrastructure projects, milestone timelines, financial outlays, and execution progress.'}
          </p>
        </div>

        {tabs.length > 1 ? (
          <InternalNavigation
            tabs={tabs}
            currentTab={
              isLumpsumActive
                ? 'lumpsum'
                : activeSubTab === 'edit-info'
                  ? 'list'
                  : activeSubTab === 'less5cr-edit'
                    ? (showLess5CrInputForm ? 'less5cr-form' : 'less5cr-list')
                    : activeSubTab
            }
            currentSubItem={isLumpsumActive ? activeSubTab : undefined}
            onSubItemChange={handleLumpsumSubItem}
            onTabChange={(tab) => {
              if (tab !== 'edit-info') {
                setEditingRecord(null);
                setFormReadOnly(false);
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
              if (tab === 'dashboard') {
                setManualSubTab('dashboard');
                navigate('/projects/project/project-dashboard');
                return;
              }
              if (tab === 'reports') {
                if (!canAccessReports) {
                  setManualSubTab('list');
                  navigate('/projects/project/project-list');
                  return;
                }
                setManualSubTab('reports');
                navigate('/projects/project/reports');
                return;
              }
              if (tab === 'drop-requests') {
                if (!canAccessDropRequests) {
                  setManualSubTab('list');
                  navigate('/projects/project/project-list');
                  return;
                }
                setManualSubTab('drop-requests');
                navigate('/projects/project/view-drop-request');
                return;
              }
              if (tab === 'basic-info') {
                if (!showInputForm) {
                  setManualSubTab('list');
                  navigate('/projects/project/project-list');
                  return;
                }
                setManualSubTab('basic-info');
                navigate('/projects/project/input-form');
                return;
              }
              if (tab === 'add-sub-project') {
                if (!showInputForm) {
                  setManualSubTab('list');
                  navigate('/projects/project/project-list');
                  return;
                }
                setManualSubTab('add-sub-project');
                navigate('/projects/project/add-sub-project');
                return;
              }

                if (tab === 'lumpsum') {
                setLumpsumEditingRecord(null);
                setManualSubTab('lumpsum-iwai-list');
                navigate('/projects/project/lumpsum-iwai-list');
                return;
              }
              if (tab === 'list') {
                setManualSubTab('list');
                navigate('/projects/project/project-list');
                return;
              }
              setManualSubTab(tab);
            }}
          />
        ) : null}
      </div>

     {isLumpsumActive && (
      <div className="space-y-4">
        <div className="module-subtabs-strip flex-wrap">
          <button
            type="button"
            onClick={() => handleLumpsumSubItem('lumpsum-iwai-list')}
            className={`module-subtab-btn flex items-center gap-2 ${activeSubTab === 'lumpsum-iwai-list' ? 'active' : ''}`}
          >
            <ListChecks className="h-4 w-4" />
            <span>Data List</span>
          </button>

          {showLumpsumInputForm && (
            <button
              type="button"
              onClick={() => handleLumpsumSubItem('input-form')}
              className={`module-subtab-btn flex items-center gap-2 ${
                activeSubTab === 'input-form' ? 'active' : ''
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Input Form</span>
            </button>
          )}
        </div>
      </div>
    )}

      <div className="space-y-8">
        {activeSubTab === 'dashboard' ? (
          <ProjectDashboardPage triggerNotification={triggerNotification} />
        ) : null}

        {activeSubTab === 'reports' ? (
          <ProjectReportsPage />
        ) : null}


        {activeSubTab === 'lumpsum-iwai-list' ? (
          <LumpsumIwai
            rows={lumpsumRows}
            loading={lumpsumLoading}
            notify={notify}
           
            onAdd={
              showLumpsumInputForm
                ? () => {
                    setLumpsumEditingRecord(null);
                    setManualSubTab('input-form');
                    navigate('/projects/project/lumpsum-iwai-input-form');
                  }
                : undefined
            }

            onEdit={
              canEditLumpsum
                ? (row) => {
                    const projectId =
                      row.project_id ??
                      row.projectID ??
                      row.projectId ??
                      row.raw?.project_id;

                    if (!projectId) {
                      notify('Project ID not found.', 'error');
                      return;
                    }

                    setLumpsumEditingRecord(row);
                    setManualSubTab('input-form');

                    navigate(
                      `/projects/project/lumpsum-iwai-input-form?projectId=${projectId}`
                    );
                  }
                : undefined
            }
          />
        ) : null}

       {activeSubTab === 'input-form' ? (
        <LumpsumFormPage
          key={
        lumpsumEditingRecord?.lumpsum_activity_id ||
        new URLSearchParams(location.search).get('projectId') ||
        'new-lumpsum'
      }
          initialData={lumpsumEditingRecord}
          notify={notify}
          onBack={() => {
            setLumpsumEditingRecord(null);
            setLumpsumRefreshKey(prev => prev + 1);
            setManualSubTab('lumpsum-iwai-list');
            navigate('/projects/project/lumpsum-iwai-list');
          }}
          onSuccess={() => {
            setLumpsumEditingRecord(null);
            setLumpsumRefreshKey(prev => prev + 1);
            setManualSubTab('lumpsum-iwai-list');
            navigate('/projects/project/lumpsum-iwai-list');
          }}
        />
      ) : null}

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
              const readOnly =
                Boolean(options.readOnly)
                || permissions.isViewOnlyAdmin
                || (!permissions.canEdit && permissions.canView);
              setEditingRecord(row);
              setFormReadOnly(readOnly);
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

        {activeSubTab === 'add-sub-project' ? (
          <AddSubProjectPage
            notify={notify}
            onBack={() => {
              setManualSubTab('list');
              navigate('/projects/project/project-list');
            }}
            onSuccess={() => {
              setManualSubTab('list');
              setListRefreshKey((prev) => prev + 1);
              navigate('/projects/project/project-list');
            }}
          />
        ) : null}

        {activeSubTab === 'drop-requests' && canAccessDropRequests ? (
          <DropRequestsPage notify={notify} />
        ) : null}
      </div>
    </div>
  );
}
