import React, { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Layers,
  BarChart2,
  FileBarChart
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import Dashboard from './pages/Dashboard';
import InterventionList from './pages/InterventionList';
import InputForm from './pages/InputForm';
import DataList from './pages/DataList';
import Reports from './pages/Reports';
import DataEntryStatusReport from './pages/DataEntryStatusReport';
import { isOrganisationUser } from '../../utils/authSession';

export default function OVODModule({
  subTab: initialSubTab,
  triggerNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isOrgUser = isOrganisationUser();

  // The record being edited travels with the route entry, so it is gone as soon as the user
  // opens the form any other way (tab, sidebar, new session) and can never reopen stale
  const editingItem = location.state?.item ?? null;

  // Sync route / props
  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/performance-report')) return 'performance-report';
    if (path.includes('/data-entry-status')) return 'data-entry-status';
    if (path.includes('/data-list') || path.includes('/list')) return 'data-list';
    if (path.includes('/intervention-list') || path.includes('/interventions')) return 'interventions';
    if (path.includes('/input-form') || path.includes('/form') || path.includes('/add') || path.includes('/edit')) return 'input-form';
    return 'dashboard';
  }, [location.pathname]);

  const tabs = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'interventions', label: 'Intervention List', icon: ClipboardList },
    { id: 'input-form', label: editingItem ? 'Update Initiative' : 'Input Form', icon: PlusCircle },
    { id: 'data-list', label: 'Data List', icon: Layers },
    ...(!isOrgUser ? [
      { id: 'performance-report', label: 'Performance Report', icon: BarChart2 },
      { id: 'data-entry-status', label: 'Data Entry Status', icon: FileBarChart },
    ] : []),
  ], [editingItem, isOrgUser]);

  const handleTabChange = (tabId) => {
    if (tabId === 'dashboard') {
      navigate('/strategies/drishti-portal/dashboard');
    } else if (tabId === 'interventions') {
      navigate('/strategies/drishti-portal/intervention-list');
    } else if (tabId === 'input-form') {
      navigate('/strategies/drishti-portal/input-form');
    } else if (tabId === 'data-list') {
      navigate('/strategies/drishti-portal/data-list');
    } else if (tabId === 'performance-report') {
      navigate('/strategies/drishti-portal/performance-report');
    } else if (tabId === 'data-entry-status') {
      navigate('/strategies/drishti-portal/data-entry-status');
    }
  };

  const handleAddNew = useCallback(() => {
    navigate('/strategies/drishti-portal/input-form');
  }, [navigate]);

  const handleEdit = useCallback((item) => {
    navigate('/strategies/drishti-portal/input-form', { state: { item } });
  }, [navigate]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleFormSuccess = useCallback(() => {
    navigate('/strategies/drishti-portal/data-list', { replace: true });
  }, [navigate]);

  const handleFormCancel = useCallback(() => {
    navigate('/strategies/drishti-portal/data-list');
  }, [navigate]);

  return (
    <div className="module-page-container space-y-6 animate-fade-in">

      {/* Module Page Header matching GMIS / CA / YP */}
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">
            Drishti Portal (One Vision One Document)
          </h1>
          <p className="module-header-subtitle">
            Strategic tracking, goal alignment, and action item monitoring across Ministry wings and organisations.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* View Content */}
      <div className="pt-1">
        {currentTab === 'dashboard' && (
          <Dashboard triggerNotification={triggerNotification} />
        )}
        {currentTab === 'interventions' && (
          <InterventionList triggerNotification={triggerNotification} />
        )}
        {currentTab === 'input-form' && (
          <InputForm
            key={editingItem?.id ?? 'new'}
            editData={editingItem}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            triggerNotification={triggerNotification} 
          />
        )}
        {currentTab === 'data-list' && (
          <DataList
            onAddNew={handleAddNew}
            onEdit={handleEdit}
            triggerNotification={triggerNotification}
          />
        )}
        {!isOrgUser && currentTab === 'performance-report' && (
          <Reports triggerNotification={triggerNotification} />
        )}
        {!isOrgUser && currentTab === 'data-entry-status' && (
          <DataEntryStatusReport triggerNotification={triggerNotification} />
        )}
      </div>

    </div>
  );
}
