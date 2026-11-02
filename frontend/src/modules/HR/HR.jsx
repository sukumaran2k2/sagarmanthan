import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import {
  Building2,
  UserPlus,
  BookOpen,
  Users,
  FileEdit,
  Briefcase,
  ShieldCheck,
  FilePieChart,
  Archive,
  LayoutDashboard,
  FileSpreadsheet
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useNotifier } from '../../utils/notify';
import { useHRPermissions } from './hooks/useHRPermissions';
import { useHrStore } from './store/useHrStore';
import './hrTables.css';
import { HR_LIST_VIEWS, hrListViewKey } from './views';
import { HR_VIEWS, hrViewAllows, hrPageFromPath } from './utils/hrViews';

import HrDashboard from './pages/HrDashboard';
import NonPortDashboard from './pages/NonPortDashboard';
import NonPortMonthlyUpload from './pages/NonPortMonthlyUpload';
import OrganisationStructure from './pages/OrganisationStructure';
import ContractualEmployment from './pages/ContractualEmployment';
import TrainingDetails from './pages/TrainingDetails';
import InputForm from './pages/InputForm';
import ListAbolishedPosts from './pages/ListAbolishedPosts';
import EmployeeDatabase from './pages/EmployeeDatabase';
import EmployeeDetails from './pages/EmployeeDetails';
import EmployeeDataForm from './components/EmployeeDataForm';
import AddPostForm from './components/AddPostForm';
import VacantDetails from './pages/VacantDetails';
import HrAdministration from './pages/HrAdministration';
import HrReports from './pages/Reports';


export default function HRDashboardView({ onGoHome, triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();

  const permissions = useHRPermissions();
  const { isOrgUser: isOrg, hrView } = permissions;
  // Page the URL points at, and whether this user's view offers it (utils/hrViews.js)
  const urlPage = hrPageFromPath(location.pathname);
  const pageAllowed = hrViewAllows(hrView, urlPage);

  // Every HR toast goes through notify(HR_TOASTS.x / COMMON_TOASTS.x)
  const notify = useNotifier(triggerNotification);

  // Reference data, loaded once and passed to the pages (one source of truth)
  const departments = useHrStore((state) => state.departments);
  const organisations = useHrStore((state) => state.organisations);
  const loadMasters = useHrStore((state) => state.loadMasters);
  useEffect(() => {
    if (permissions.canView) loadMasters(permissions.orgId);
  }, [loadMasters, permissions.canView, permissions.orgId]);
  const masters = { departments, organisations };

  // List view for the user's UI view code (Standard / Secretary-JS / Director), as in
  // Parliamentary Issues. Indexed from the static registry (not a resolver call) so the
  // react-hooks/static-components rule can see no component is created in render.
  const ListView = HR_LIST_VIEWS[hrListViewKey(permissions.uiViewCode)] || HR_LIST_VIEWS.STANDARD;

  // Menu entry that holds the page (pages reached from another page light up that page's entry)
  const currentTab = {
    'employee-details': 'employee-database',
    'add-employee': 'employee-database',
    'vacancy-details': 'vacancy-management',
    'add-post': 'organisation-structure',
  }[urlPage] || urlPage;

  const isEditMode = !!location.state?.item;

  // The groups open a sub-menu on hover (or click/tap). Pages are filtered by the user's view
  // (Major Port / non-port / Secretary / ministry) and permissions, and a group left with a
  // single page is shown as a plain tab, so nobody gets a one-item menu.
  const tabs = useMemo(() => {
    const offered = (page) => page && hrViewAllows(hrView, page.id) && page;
    const groups = [
      { id: 'hr-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'non-port-monthly-upload', label: 'Non Port Monthly Upload', icon: FileSpreadsheet },
      {
        id: 'posts-vacancies',
        label: 'Posts & Vacancies',
        icon: Building2,
        pages: [
          { id: 'organisation-structure', label: 'Organisation Structure', icon: Building2 },
          // Vacancy Management: organisation users in the Standard view only
          permissions.canViewVacancy && { id: 'vacancy-management', label: 'Vacancy Management', icon: Briefcase },
          { id: 'abolished-posts', label: isOrg ? 'Abolished Posts' : 'List of Abolished Posts', icon: Archive },
        ],
      },
      {
        id: 'employees',
        label: 'Employees',
        icon: Users,
        pages: [
          { id: 'employee-database', label: 'Employee Database', icon: Users },
          permissions.canViewAdministration && { id: 'administration', label: 'HR Administration & Actions', icon: ShieldCheck },
        ],
      },
      {
        id: 'contractual-training',
        label: 'Contractual & Training',
        icon: UserPlus,
        pages: [
          { id: 'contractual-employment', label: 'Contractual Employment', icon: UserPlus },
          { id: 'training-details', label: 'Training Details', icon: BookOpen },
        ],
      },
      permissions.canUseInputForm && {
        id: 'input-form',
        label: isEditMode && currentTab === 'input-form' ? 'Update Form' : 'Input Forms',
        icon: FileEdit,
      },
      { id: 'reports', label: 'Reports', icon: FilePieChart },
    ];

    return groups.filter(Boolean).map(({ pages, ...entry }) => {
      if (!pages) return offered(entry) && { ...entry, pageIds: [entry.id] };
      const visible = pages.map(offered).filter(Boolean);
      if (visible.length === 0) return null;
      if (visible.length === 1) {
        const [page] = visible;
        return { id: page.id, label: page.label, icon: page.icon, pageIds: [page.id] };
      }
      return { ...entry, isGroup: true, subMenu: visible, pageIds: visible.map((page) => page.id) };
    }).filter(Boolean);
  }, [hrView, isOrg, permissions.canViewVacancy, permissions.canViewAdministration, permissions.canUseInputForm, isEditMode, currentTab]);

  // Top-level entry (group or plain tab) that holds the current page.
  const activeTabId = tabs.find((tab) => tab.pageIds.includes(currentTab))?.id;

  const goToPage = (pageId) => {
    navigate(`/hr/hr-management/${pageId}`);
  };

  // RBAC Access Guard matching Cabinet Notes
  if (!permissions.canView) {
    return (
      <RestrictedAccess
        moduleName="HR Management"
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container hr-module-header">
        <div className="min-w-0">
          <h1 className="module-header-title">HR Management</h1>
          <p className="module-header-subtitle">
            {hrView === HR_VIEWS.NON_PORT
              ? 'Upload monthly vacancy details and manage contractual employment and training details.'
              : 'Manage organisation structure, employee database, vacancies, abolished posts, contractual employment and training details.'}
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeTabId}
          currentSubItem={currentTab}
          onTabChange={goToPage}
          onSubItemChange={goToPage}
        />
      </div>

      {/* Child Routes with Permission Injection */}
      <div>
        {/* A page outside the user's view (an old link, a typed URL) goes back to the dashboard */}
        {!pageAllowed ? <Navigate to="/hr/hr-management/hr-dashboard" replace /> : (
        <Routes>
          <Route
            path="hr-dashboard"
            element={hrView === HR_VIEWS.NON_PORT ? <NonPortDashboard notify={notify} canUpload={permissions.canUseInputForm} /> : <HrDashboard notify={notify} />}
          />
          <Route
            path="non-port-monthly-upload/*"
            element={<NonPortMonthlyUpload notify={notify} triggerNotification={triggerNotification} />}
          />
          <Route path="organisation-structure" element={<OrganisationStructure notify={notify} />} />
          <Route path="employee-database" element={<EmployeeDatabase notify={notify} />} />
          <Route
            path="employee-details/:empMasterId"
            element={<EmployeeDetails notify={notify} canEdit={permissions.canEdit && permissions.canUseInputForm} />}
          />
          <Route path="add-employee" element={<EmployeeDataForm notify={notify} />} />
          <Route path="add-post" element={<AddPostForm notify={notify} />} />
          <Route
            path="abolished-posts"
            element={
              <ListAbolishedPosts
                permissions={permissions}
                notify={notify}
              />
            }
          />

          {permissions.canViewVacancy && (
            <>
              <Route
                path="vacancy-management"
                element={
                  <ListView
                    permissions={permissions}
                    departments={masters.departments}
                    notify={notify}
                  />
                }
              />
              <Route
                path="vacancy-details/:postId/:isLive"
                element={
                  <VacantDetails
                    permissions={permissions}
                    notify={notify}
                  />
                }
              />
            </>
          )}

          {permissions.canViewAdministration && (
            <Route
              path="administration"
              element={
                <HrAdministration
                  permissions={permissions}
                  departments={masters.departments}
                  organisations={masters.organisations}
                  notify={notify}
                />
              }
            />
          )}

          <Route
            path="contractual-employment"
            element={
              <ContractualEmployment
                permissions={permissions}
                notify={notify}
              />
            }
          />

          <Route
            path="training-details"
            element={
              <TrainingDetails
                permissions={permissions}
                notify={notify}
              />
            }
          />

          <Route path="reports/*" element={<HrReports notify={notify} />} />

          {permissions.canUseInputForm && (
            <Route
              path="input-form/*"
              element={
                <InputForm
                  permissions={permissions}
                  notify={notify}
                  triggerNotification={triggerNotification}
                />
              }
            />
          )}

          <Route index element={<Navigate to="hr-dashboard" replace />} />
          {/* Absolute: a relative target inside a splat route is appended to the unknown path (redirect loop). */}
          <Route path="*" element={<Navigate to="/hr/hr-management/hr-dashboard" replace />} />
        </Routes>
        )}
      </div>

    </div>
  );
}
