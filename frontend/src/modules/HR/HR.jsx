import React, { useMemo, useCallback, useState } from 'react';
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
  CalendarCheck
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import { isOrganisationUser, isOtherOrganisationUser, isSuperAdmin } from '../../utils/authSession';
import RestrictedAccess from '../../components/RestrictedAccess';
import Notification from '../../components/Notification';
import { useHRPermissions } from './hooks/useHRPermissions';
import './hrTables.css';
import { resolveHRListView } from './views';

import OrganisationStructure from './pages/OrganisationStructure';
import ContractualEmployment from './pages/ContractualEmployment';
import TrainingDetails from './pages/TrainingDetails';
import InputForm from './pages/InputForm';
import ListAbolishedPosts from './pages/ListAbolishedPosts';
import EmployeeDatabase from './pages/EmployeeDatabase';
import EmployeeDataForm from './components/EmployeeDataForm';
import AddPostForm from './components/AddPostForm';
import NonPortMonthlyUpload from './pages/NonPortMonthlyUpload';
import VacantDetails from './pages/VacantDetails';
import HrAdministration from './pages/HrAdministration';
import HrReports from './pages/Reports';


export default function HRDashboardView({ onGoHome, triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isOrg = isOrganisationUser();
  const userIsOtherOrg = isOtherOrganisationUser();

  // If the user is specifically an Other Org (like CSL, DGLL, IWAI, DGS, etc.), default to other org view.
  // Otherwise, allow admin/ministry to toggle or detect based on active path.
  const isOtherOrgPath = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes('/non-port-monthly-upload');
  }, [location.pathname]);

  const [activeOrgCategory, setActiveOrgCategory] = useState(
    userIsOtherOrg || isOtherOrgPath ? 'other' : 'major'
  );

  const isOtherOrgActive = userIsOtherOrg || activeOrgCategory === 'other';

  const permissions = useHRPermissions();

  const ListView = useMemo(
    () => resolveHRListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  const [toast, setToast] = useState(null);

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

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (isOtherOrgActive) {
      if (path.includes('/non-port-monthly-upload')) return 'non-port-monthly-upload';
      if (path.includes('/contractual-employment')) return 'contractual-employment';
      if (path.includes('/training-details')) return 'training-details';
      if (path.includes('/input-form')) return 'input-form';
      return 'non-port-monthly-upload';
    } else {
      if (path.includes('/hr-management/reports')) return 'reports';
      if (path.includes('/organisation-structure')) return 'organisation-structure';
      if (path.includes('/employee-database')) return 'employee-database';
      if (path.includes('/vacancy-management') || path.includes('/vacancy-details')) return 'vacancy-management';
      if (path.includes('/administration')) return 'administration';
      if (path.includes('/abolished-posts')) return 'abolished-posts';
      if (path.includes('/contractual-employment')) return 'contractual-employment';
      if (path.includes('/training-details')) return 'training-details';
      if (path.includes('/input-form')) return 'input-form';
      return 'employee-database';
    }
  }, [location.pathname, isOtherOrgActive]);

  const isEditMode = !!location.state?.editData;

  // Tabs for Other Organisation Users
  const otherOrgTabs = useMemo(() => {
    const list = [
      { id: 'non-port-monthly-upload', label: 'Non Port Monthly Upload', icon: CalendarCheck },
      { id: 'contractual-employment', label: 'Contractual Employment', icon: UserPlus },
      { id: 'training-details', label: 'Training Details', icon: BookOpen },
    ];
    if (permissions.canUseInputForm) {
      list.push({
        id: 'input-form',
        label: isEditMode && currentTab === 'input-form' ? 'Update Form' : 'Input Form',
        icon: FileEdit
      });
    }
    return list;
  }, [permissions.canUseInputForm, isEditMode, currentTab]);

  // Standard Tabs for Major Ports
  const majorPortTabs = useMemo(() => {
    const list = [
      { id: 'organisation-structure', label: 'Organisation Structure', icon: Building2 },
      { id: 'employee-database', label: 'Employee Database', icon: Users },
      { id: 'abolished-posts', label: isOrg ? 'Abolished Posts' : 'List of Abolished Posts', icon: Users },
    ];

    if (permissions.canViewVacancy) {
      list.push({ id: 'vacancy-management', label: 'Vacancy Management', icon: Briefcase });
    }

    if (permissions.canViewAdministration) {
      list.push({ id: 'administration', label: 'HR Administration & Actions', icon: ShieldCheck });
    }

    list.push(
      { id: 'contractual-employment', label: 'Contractual Employment', icon: UserPlus },
      { id: 'training-details', label: 'Training Details', icon: BookOpen },
      { id: 'reports', label: 'Reports', icon: FilePieChart }
    );

    if (permissions.canUseInputForm) {
      list.push({
        id: 'input-form',
        label: isEditMode && currentTab === 'input-form' ? 'Update Form' : 'Input Form',
        icon: FileEdit
      });
    }

    return list;
  }, [isOrg, permissions.canViewVacancy, permissions.canViewAdministration, permissions.canUseInputForm, isEditMode, currentTab]);

  const effectiveTabs = isOtherOrgActive ? otherOrgTabs : majorPortTabs;

  const handleTabChange = (tabId) => {
    navigate(`/hr/hr-management/${tabId}`);
  };

  const handleCategorySwitch = (category) => {
    setActiveOrgCategory(category);
    if (category === 'other') {
      navigate('/hr/hr-management/non-port-monthly-upload');
    } else {
      navigate('/hr/hr-management/employee-database');
    }
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
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <Notification message={toast} onDismiss={() => setToast(null)} />

      {/* Header Row with Title & Internal Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0f417a] dark:text-blue-400" />
              <span>HR Management</span>
            </h1>

            {/* View Selector for Admin / Ministry Users */}
            {!userIsOtherOrg && (
              <div className="hidden sm:inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('major')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeOrgCategory === 'major'
                      ? 'bg-[#0f417a] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Major Ports
                </button>
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('other')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeOrgCategory === 'other'
                      ? 'bg-[#0f417a] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Other Organisations (Non-Port)
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            {isOtherOrgActive 
              ? 'Manage Non-Port monthly vacancy uploads, contractual employment, training records and reporting compliance.'
              : 'Manage organisation structure, employee database, vacancies, abolished posts, contractual employment and training details.'}
          </p>
        </div>

        <InternalNavigation
          tabs={effectiveTabs}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Child Routes with Permission Injection */}
      <div>
        <Routes>
          {/* Other Org Exclusive / Shared Routes */}
          <Route path="non-port-monthly-upload" element={<NonPortMonthlyUpload triggerNotification={triggerNotification} />} />

          {/* Standard Major Port Routes */}
          <Route path="organisation-structure" element={<OrganisationStructure triggerNotification={triggerNotification} />} />
          <Route path="employee-database" element={<EmployeeDatabase triggerNotification={triggerNotification} />} />
          <Route path="add-employee" element={<EmployeeDataForm triggerNotification={triggerNotification} />} />
          <Route path="add-post" element={<AddPostForm triggerNotification={triggerNotification} />} />
          <Route
            path="abolished-posts"
            element={
              <ListAbolishedPosts
                permissions={permissions}
                notify={notify}
                triggerNotification={triggerNotification}
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
                    notify={notify}
                    triggerNotification={triggerNotification}
                  />
                }
              />
              <Route
                path="vacancy-details/:postId/:isLive"
                element={
                  <VacantDetails
                    permissions={permissions}
                    notify={notify}
                    triggerNotification={triggerNotification}
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
                  notify={notify}
                  triggerNotification={triggerNotification}
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
                triggerNotification={triggerNotification}
              />
            }
          />

          <Route
            path="training-details"
            element={
              <TrainingDetails
                permissions={permissions}
                notify={notify}
                triggerNotification={triggerNotification}
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

          {/* Default Redirection */}
          <Route 
            index 
            element={<Navigate to={isOtherOrgActive ? "non-port-monthly-upload" : "employee-database"} replace />} 
          />
          <Route 
            path="*" 
            element={<Navigate to={isOtherOrgActive ? "/hr/hr-management/non-port-monthly-upload" : "/hr/hr-management/employee-database"} replace />} 
          />
        </Routes>
      </div>
      
    </div>
  );
}
