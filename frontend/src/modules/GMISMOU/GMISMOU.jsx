import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, Layers, FilePieChart, PlusCircle, Globe 
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import { useGMISPermissions } from './hooks/useGMISPermissions';

export default function GMISMOUView({
  activeSubTab: activeSubTabProp,
  setActiveSubTab: setActiveSubTabProp,
  triggerNotification
}) {
  const permissions = useGMISPermissions();
  const { canAdd, canEdit, canView } = permissions;

  const [activeTab, setActiveTab] = useState(canView ? 'dashboard' : (canAdd ? 'add' : 'list'));
  const [editData, setEditData] = useState(null);

  const tabs = useMemo(() => {
    const list = [];
    if (canView) list.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
    if (canAdd) list.push({ id: 'add', label: editData ? 'Update MoU' : 'Input Form', icon: PlusCircle });
    if (canView) list.push({ id: 'list', label: 'Data List', icon: Layers });
    return list;
  }, [canAdd, canView, editData]);

  // Sync tab navigation state to URL / Router
  const syncGlobalRoute = useCallback((tabId) => {
    if (!setActiveSubTabProp) return;
    if (tabId === 'dashboard') {
      setActiveSubTabProp('GMIS Dashboard');
    } else if (tabId === 'list') {
      setActiveSubTabProp('GMIS Data List');
    } else if (tabId === 'add') {
      setActiveSubTabProp('GMIS Input Form');
    }
  }, [setActiveSubTabProp]);

  // Map subtab strings from props / events / URLs
  const mapTabNameToId = useCallback((name) => {
    if (!name) return 'dashboard';
    const lower = name.toLowerCase();
    if (lower.includes('input') || lower.includes('add') || lower.includes('edit')) return 'add';
    if (lower.includes('data') || lower.includes('list') || lower.includes('mou')) return 'list';
    if (lower.includes('report')) return 'reports';
    if (lower.includes('dash')) return 'dashboard';
    return 'dashboard';
  }, []);

  useEffect(() => {
    if (activeSubTabProp && activeSubTabProp !== 'GMIS-MoU' && activeSubTabProp !== 'GMIS & IMW MoUs') {
      const tabId = mapTabNameToId(activeSubTabProp);
      setActiveTab(tabId);
    }
  }, [activeSubTabProp, mapTabNameToId]);

  // Listen for custom sub-tab switch event from top navbar dropdown
  useEffect(() => {
    const handleSubTabEvent = (e) => {
      if (e.detail) {
        const tabId = mapTabNameToId(e.detail);
        setActiveTab(tabId);
        syncGlobalRoute(tabId);
      }
    };

    const storedTab = sessionStorage.getItem('gmisMouInitTab');
    if (storedTab) {
      const tabId = mapTabNameToId(storedTab);
      setActiveTab(tabId);
      syncGlobalRoute(tabId);
      sessionStorage.removeItem('gmisMouInitTab');
    }

    window.addEventListener('gmis-mou-subtab', handleSubTabEvent);
    return () => window.removeEventListener('gmis-mou-subtab', handleSubTabEvent);
  }, [mapTabNameToId, syncGlobalRoute]);

  const handleEdit = (item) => {
    setEditData(item);
    setActiveTab('add');
    syncGlobalRoute('add');
  };

  const handleAddNew = () => {
    setEditData(null);
    setActiveTab('add');
    syncGlobalRoute('add');
  };

  const handleFormSuccess = () => {
    setEditData(null);
    setActiveTab('list');
    syncGlobalRoute('list');
  };

  const handleFormCancel = () => {
    setEditData(null);
    setActiveTab('list');
    syncGlobalRoute('list');
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="GMIS & IMW MoU Tracking" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#0f417a] dark:text-blue-400" />
            <span>GMIS & IMW MoU Tracking</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Track and monitor Global Maritime India Summit (GMIS) and India Maritime Week (IMW) Memorandums of Understanding (MoUs).
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeTab}
          onTabChange={(tabId) => {
            if (tabId !== 'add') {
              setEditData(null);
            }
            setActiveTab(tabId);
            syncGlobalRoute(tabId);
          }}
        />
      </div>

      {/* Main Tab Render */}
      <div>
        {activeTab === 'dashboard' && (
          <Dashboard 
            onNavigateToTab={(tabId) => {
              if (tabId === 'add') setEditData(null);
              setActiveTab(tabId);
              syncGlobalRoute(tabId);
            }} 
          />
        )}

        {activeTab === 'list' && (
          <DataList
            onEdit={canEdit ? handleEdit : null}
            onAddNew={canAdd ? handleAddNew : null}
            triggerNotification={triggerNotification}
          />
        )}

        {activeTab === 'add' && (
          <InputForm
            editData={editData}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            triggerNotification={triggerNotification}
          />
        )}
      </div>

    </div>
  );
}
