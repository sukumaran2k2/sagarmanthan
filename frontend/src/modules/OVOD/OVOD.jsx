import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  PlusCircle, 
  Layers,
  FilePieChart
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import Dashboard from './pages/Dashboard';
import InterventionList from './pages/InterventionList';
import InputForm from './pages/InputForm';
import DataList from './pages/DataList';
import Reports from './pages/Reports';

export default function OVODModule({
  subTab: initialSubTab,
  triggerNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [editingItem, setEditingItem] = useState(null);

  // Sync route / props
  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/data-list') || path.includes('/list')) return 'data-list';
    if (path.includes('/intervention-list') || path.includes('/interventions')) return 'interventions';
    if (path.includes('/input-form') || path.includes('/form') || path.includes('/add') || path.includes('/edit')) return 'input-form';
    if (path.includes('/report') || path.includes('/reports')) return 'report';
    return 'dashboard';
  }, [location.pathname]);

  const tabs = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'interventions', label: 'Intervention List', icon: ClipboardList },
    { id: 'input-form', label: editingItem ? 'Update B2/B3' : 'Input Form', icon: PlusCircle },
    { id: 'data-list', label: 'Data List', icon: Layers },
    { id: 'report', label: 'Reports', icon: FilePieChart },
  ], [editingItem]);

  const handleTabChange = (tabId) => {
    if (tabId === 'dashboard') {
      navigate('/strategies/drishti-portal/dashboard');
    } else if (tabId === 'interventions') {
      navigate('/strategies/drishti-portal/intervention-list');
    } else if (tabId === 'input-form') {
      setEditingItem(null);
      navigate('/strategies/drishti-portal/input-form');
    } else if (tabId === 'data-list') {
      setEditingItem(null);
      navigate('/strategies/drishti-portal/data-list');
    } else if (tabId === 'report') {
      navigate('/strategies/drishti-portal/report');
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    navigate('/strategies/drishti-portal/input-form');
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    navigate('/strategies/drishti-portal/input-form', { state: { item } });
  };

  const handleFormSuccess = () => {
    setEditingItem(null);
    navigate('/strategies/drishti-portal/data-list');
  };

  const handleFormCancel = () => {
    setEditingItem(null);
    navigate('/strategies/drishti-portal/data-list');
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-2 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Module Page Header matching GMIS / CA / YP */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Drishti Portal (One Vision One Document)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
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
        {currentTab === 'report' && (
          <Reports triggerNotification={triggerNotification} />
        )}
      </div>

    </div>
  );
}
