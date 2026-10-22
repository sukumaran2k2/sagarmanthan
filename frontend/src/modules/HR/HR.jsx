import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Building2,
  UserPlus, 
  BookOpen, 
  Users,
  FileEdit,
  LayoutDashboard,
  Briefcase,
  CalendarCheck,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import { isOrganisationUser, isOtherOrganisationUser, isSuperAdmin } from '../../utils/authSession';

import OrganisationStructure from './pages/OrganisationStructure';
import ContractualEmployment from './pages/ContractualEmployment';
import TrainingDetails from './pages/TrainingDetails';
import InputForm from './pages/InputForm';
import ListAbolishedPosts from './pages/ListAbolishedPosts';
import EmployeeDatabase from './pages/EmployeeDatabase';
import EmployeeDataForm from './components/EmployeeDataForm';
import AddPostForm from './components/AddPostForm';
import NonPortMonthlyUpload from './pages/NonPortMonthlyUpload';

export default function HRDashboardView({ triggerNotification }) {
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

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (isOtherOrgActive) {
      if (path.includes('/non-port-monthly-upload')) return 'non-port-monthly-upload';
      if (path.includes('/contractual-employment')) return 'contractual-employment';
      if (path.includes('/training-details')) return 'training-details';
      if (path.includes('/input-form')) return 'input-form';
      return 'non-port-monthly-upload';
    } else {
      if (path.includes('/organisation-structure')) return 'organisation-structure';
      if (path.includes('/employee-database')) return 'employee-database';
      if (path.includes('/abolished-posts')) return 'abolished-posts';
      if (path.includes('/contractual-employment')) return 'contractual-employment';
      if (path.includes('/training-details')) return 'training-details';
      if (path.includes('/input-form')) return 'input-form';
      return 'employee-database';
    }
  }, [location.pathname, isOtherOrgActive]);

  const isEditMode = !!location.state?.editData;

  // Tabs for Other Organisation Users
  const otherOrgTabs = [
    { id: 'non-port-monthly-upload', label: 'Non Port Monthly Upload', icon: CalendarCheck },
    { id: 'contractual-employment', label: 'Contractual Employment', icon: UserPlus },
    { id: 'training-details', label: 'Training Details', icon: BookOpen },
    { id: 'input-form', label: isEditMode && currentTab === 'input-form' ? 'Update Form' : 'Input Form', icon: FileEdit },
  ];

  // Standard Tabs for Major Ports
  const majorPortTabs = [
    { id: 'organisation-structure', label: 'Organisation Structure', icon: Building2 },
    { id: 'employee-database', label: 'Employee Database', icon: Users },
    { id: 'abolished-posts', label: isOrg ? 'Abolished Posts' : 'List of Abolished Posts', icon: Users },
    { id: 'contractual-employment', label: 'Contractual Employment', icon: UserPlus },
    { id: 'training-details', label: 'Training Details', icon: BookOpen },
    { id: 'input-form', label: isEditMode && currentTab === 'input-form' ? 'Update Form' : 'Input Form', icon: FileEdit },
  ];

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

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Row */}
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
              : 'Manage organization structure, employee database, abolished posts, contractual employment and training details.'}
          </p>
        </div>

        <InternalNavigation
          tabs={effectiveTabs}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Child Routes */}
      <div>
        <Routes>
          {/* Other Org Exclusive / Shared Routes */}
          <Route path="non-port-monthly-upload" element={<NonPortMonthlyUpload triggerNotification={triggerNotification} />} />

          {/* Standard Major Port Routes */}
          <Route path="organisation-structure" element={<OrganisationStructure triggerNotification={triggerNotification} />} />
          <Route path="employee-database" element={<EmployeeDatabase triggerNotification={triggerNotification} />} />
          <Route path="add-employee" element={<EmployeeDataForm triggerNotification={triggerNotification} />} />
          <Route path="add-post" element={<AddPostForm triggerNotification={triggerNotification} />} />
          <Route path="abolished-posts" element={<ListAbolishedPosts triggerNotification={triggerNotification} />} />
          <Route path="contractual-employment" element={<ContractualEmployment triggerNotification={triggerNotification} />} />
          <Route path="training-details" element={<TrainingDetails triggerNotification={triggerNotification} />} />
          <Route path="input-form/*" element={<InputForm triggerNotification={triggerNotification} />} />

          {/* Default Redirection */}
          <Route 
            index 
            element={<Navigate to={isOtherOrgActive ? "non-port-monthly-upload" : "employee-database"} replace />} 
          />
          <Route 
            path="*" 
            element={<Navigate to={isOtherOrgActive ? "non-port-monthly-upload" : "employee-database"} replace />} 
          />
        </Routes>
      </div>
      
    </div>
  );
}
