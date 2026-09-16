import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Layers, FilePieChart, 
  PlusCircle, BarChart3, Building2 
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Meetings from './pages/Meetings';
import OrgReport from './pages/OrgReport';
import ThemeReport from './pages/ThemeReport';
import { useMIVPermissions } from './hooks/useMIVPermissions';

export default function MIV2030View({
  triggerNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useMIVPermissions();
  const { canAdd, canEdit, canView } = permissions;

  const [inputFormType, setInputFormType] = useState('initiative'); // 'initiative' | 'meeting'
  const [editData, setEditData] = useState(null);

  // Derive current tab and sub-item from location pathname
  const { currentTabId, currentActiveSubItem } = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/dashboard')) return { currentTabId: 'dashboard', currentActiveSubItem: null };
    if (path.includes('/meetings')) return { currentTabId: 'meetings', currentActiveSubItem: null };
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) {
      return { currentTabId: 'add', currentActiveSubItem: inputFormType };
    }
    if (path.includes('/theme-report')) return { currentTabId: 'reports', currentActiveSubItem: 'theme-report' };
    if (path.includes('/org-report') || path.includes('/reports')) return { currentTabId: 'reports', currentActiveSubItem: 'org-report' };
    return { currentTabId: 'list', currentActiveSubItem: null };
  }, [location.pathname, inputFormType]);

  const tabs = useMemo(() => {
    const list = [];
    if (canView) list.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
    if (canAdd) {
      list.push({ 
        id: 'add', 
        label: 'Input Form', 
        icon: PlusCircle,
        subMenu: [
          { id: 'initiative', label: 'Add Initiative' },
          { id: 'meeting', label: 'Add MVIC Meeting' },
        ]
      });
    }
    if (canView) list.push({ id: 'meetings', label: 'MIV Meetings', icon: Users });
    if (canView) list.push({ id: 'list', label: 'MIV Initiatives', icon: Layers });
    if (canView) {
      list.push({ 
        id: 'reports', 
        label: 'Reports', 
        icon: FilePieChart,
        subMenu: [
          { id: 'org-report', label: 'Organisation Report' },
          { id: 'theme-report', label: 'Theme Report' },
        ]
      });
    }
    return list;
  }, [canAdd, canView]);

  const handleTabChange = (tabId) => {
    if (tabId !== 'add') setEditData(null);
    if (tabId === 'dashboard') navigate('/strategies/miv-2030/dashboard');
    else if (tabId === 'list') navigate('/strategies/miv-2030/data-list');
    else if (tabId === 'meetings') navigate('/strategies/miv-2030/meetings');
    else if (tabId === 'add') navigate('/strategies/miv-2030/input-form');
    else if (tabId === 'reports') navigate('/strategies/miv-2030/org-report');
  };

  const handleSubItemChange = (subId) => {
    if (subId === 'initiative' || subId === 'meeting') {
      setInputFormType(subId);
      navigate('/strategies/miv-2030/input-form');
    } else if (subId === 'org-report') {
      navigate('/strategies/miv-2030/org-report');
    } else if (subId === 'theme-report') {
      navigate('/strategies/miv-2030/theme-report');
    }
  };

  const handleEditInitiative = (item) => {
    setEditData(item);
    setInputFormType('initiative');
    navigate('/strategies/miv-2030/input-form', { state: { item } });
  };

  const handleAddNew = () => {
    setEditData(null);
    setInputFormType('initiative');
    navigate('/strategies/miv-2030/input-form');
  };

  const handleFormSuccess = () => {
    setEditData(null);
    navigate('/strategies/miv-2030/data-list');
  };

  const handleFormCancel = () => {
    setEditData(null);
    navigate('/strategies/miv-2030/data-list');
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="Maritime India Vision 2030 (MIV 2030)" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Maritime India Vision 2030 (MIV 2030)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Strategic framework to unlock maritime economic potential with world-class port infrastructure and initiatives.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTabId}
          currentSubItem={currentActiveSubItem}
          onTabChange={handleTabChange}
          onSubItemChange={handleSubItemChange}
        />
      </div>

      {/* Main View Router */}
      <div>
        <Routes>
          <Route path="dashboard" element={
            <Dashboard onNavigateToTab={handleTabChange} />
          } />

          <Route path="meetings" element={
            <Meetings triggerNotification={triggerNotification} />
          } />

          <Route path="data-list" element={
            <DataList
              onEdit={handleEditInitiative}
              onAddNew={canAdd ? handleAddNew : null}
              triggerNotification={triggerNotification}
            />
          } />

          <Route path="input-form" element={
            <InputForm
              editData={editData}
              initialFormType={inputFormType}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              triggerNotification={triggerNotification}
            />
          } />

          <Route path="org-report" element={
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 select-none px-1">
                <button
                  type="button"
                  onClick={() => navigate('/strategies/miv-2030/org-report')}
                  className="flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg"
                >
                  <Building2 className="h-4 w-4" />
                  <span>ORGANISATION REPORT (FORM 1A)</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/strategies/miv-2030/theme-report')}
                  className="flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>THEME REPORT (FORM 2A)</span>
                </button>
              </div>
              <OrgReport triggerNotification={triggerNotification} />
            </div>
          } />

          <Route path="theme-report" element={
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 select-none px-1">
                <button
                  type="button"
                  onClick={() => navigate('/strategies/miv-2030/org-report')}
                  className="flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
                >
                  <Building2 className="h-4 w-4" />
                  <span>ORGANISATION REPORT (FORM 1A)</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/strategies/miv-2030/theme-report')}
                  className="flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>THEME REPORT (FORM 2A)</span>
                </button>
              </div>
              <ThemeReport triggerNotification={triggerNotification} />
            </div>
          } />

          <Route index element={<Navigate to="data-list" replace />} />
          <Route path="*" element={<Navigate to="data-list" replace />} />
        </Routes>
      </div>

    </div>
  );
}
