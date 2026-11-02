import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Coins, ListTodo, PlusCircle, FilePieChart } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import Dashboard from './pages/Dashboard';
import FundDetails from './pages/FundDetails';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useCsrPermissions } from './hooks/useCsrPermissions';
import { useCsrStore } from './store/useCsrStore';
import { reportsFor, resolveReport } from './utils/reports';
import { useNotifier } from '../../utils/notify';

const BASE = '/projects/csr-projects';

export default function CSRProjects({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const permissions = useCsrPermissions();
  const { isOrgUser, canAdd, canEdit } = permissions;

  const loadLookups = useCsrStore((state) => state.loadLookups);
  const reportType = useCsrStore((state) => state.reportType);
  const setReportType = useCsrStore((state) => state.setReportType);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // The project being edited travels with the route entry, so it is gone as soon as the
  // form is opened any other way (tab, menu, new session)
  const editData = location.state?.item ?? null;
  const path = location.pathname.toLowerCase();
  const formType = path.includes('/input-form/fund') ? 'fund' : 'project';
  const activeReport = resolveReport(reportType, isOrgUser);

  const currentTab = path.includes('/fund-details') ? 'fund-details'
    : path.includes('/project-list') ? 'list'
      : path.includes('/input-form') ? 'add'
        : path.includes('/reports') ? 'reports'
          : 'dashboard';

  const tabs = useMemo(() => {
    const list = [{ id: 'dashboard', label: 'CSR Dashboard', icon: LayoutDashboard }];
    if (canAdd) {
      list.push({
        id: 'add',
        label: editData ? 'Update CSR Project' : 'Input Form',
        icon: PlusCircle,
        subMenu: [
          { id: 'project', label: 'Add CSR Project' },
          { id: 'fund', label: 'Add CSR Fund Detail' },
        ],
      });
    }
    list.push(
      { id: 'fund-details', label: 'CSR Fund Details', icon: Coins },
      { id: 'list', label: 'CSR Project List', icon: ListTodo },
      {
        id: 'reports',
        label: 'CSR Reports',
        icon: FilePieChart,
        subMenu: reportsFor(isOrgUser).map((r) => ({ id: r.id, label: r.label })),
      },
    );
    return list;
  }, [canAdd, editData, isOrgUser]);

  const TAB_PATHS = { dashboard: 'dashboard', 'fund-details': 'fund-details', list: 'project-list', add: 'input-form', reports: 'reports' };
  const handleTabChange = (tabId) => navigate(`${BASE}/${TAB_PATHS[tabId]}`);

  const handleSubItemChange = (subId) => {
    if (subId === 'project') navigate(`${BASE}/input-form`);
    else if (subId === 'fund') navigate(`${BASE}/input-form/fund`);
    else {
      setReportType(subId);
      navigate(`${BASE}/reports`);
    }
  };

  const handleEdit = useCallback((item) => {
    navigate(`${BASE}/input-form`, { state: { item } });
  }, [navigate]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleProjectSaved = useCallback(() => navigate(`${BASE}/project-list`, { replace: true }), [navigate]);
  const handleFundSaved = useCallback(() => navigate(`${BASE}/fund-details`, { replace: true }), [navigate]);
  const handleBack = useCallback(() => navigate(`${BASE}/project-list`), [navigate]);

  // Opening a project needs edit rights; a new record needs add rights
  const formAllowed = editData ? canEdit : canAdd;

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">CSR Projects</h1>
          <p className="module-header-subtitle">
            Corporate Social Responsibility Project Monitoring, Fund Allocations, and Physical/Financial Progress.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          currentSubItem={currentTab === 'add' ? formType : currentTab === 'reports' ? activeReport.id : null}
          onTabChange={handleTabChange}
          onSubItemChange={handleSubItemChange}
        />
      </div>

      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard notify={notify} isOrgUser={isOrgUser} />} />
        <Route path="fund-details" element={<FundDetails notify={notify} permissions={permissions} />} />
        <Route path="project-list" element={
          <DataList notify={notify} permissions={permissions} onEdit={handleEdit} />
        } />
        <Route path="data-list" element={<Navigate to="../project-list" replace />} />
        <Route path="input-form/*" element={formAllowed ? (
          <InputForm
            key={formType === 'project' ? (editData?.csr_project_id ?? 'new') : 'fund'}
            formType={formType}
            editData={formType === 'project' ? editData : null}
            permissions={permissions}
            onFormTypeChange={(type) => navigate(type === 'fund' ? `${BASE}/input-form/fund` : `${BASE}/input-form`)}
            onBack={handleBack}
            onProjectSaved={handleProjectSaved}
            onFundSaved={handleFundSaved}
            notify={notify}
          />
        ) : <Navigate to="../project-list" replace />} />
        {/* Old edit links: the project now travels with the route state */}
        <Route path="edit/*" element={<Navigate to="../project-list" replace />} />
        <Route path="reports" element={
          <Reports notify={notify} triggerNotification={triggerNotification} isOrgUser={isOrgUser} />
        } />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </div>
  );
}
