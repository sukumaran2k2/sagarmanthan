import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Layers, PlusCircle, Globe 
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import { useGMISPermissions } from './hooks/useGMISPermissions';

export default function GMISMOUView({
  triggerNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useGMISPermissions();
  const { canAdd, canEdit, canView } = permissions;

  const [editData, setEditData] = useState(null);

  // Derive active tab ID from current pathname
  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/data-list') || path.includes('/list')) return 'list';
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) return 'add';
    return 'dashboard';
  }, [location.pathname]);

  const tabs = useMemo(() => {
    const list = [];
    if (canView) list.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
    if (canAdd) list.push({ id: 'add', label: editData ? 'Update MoU' : 'Input Form', icon: PlusCircle });
    if (canView) list.push({ id: 'list', label: 'Data List', icon: Layers });
    return list;
  }, [canAdd, canView, editData]);

  const handleTabChange = (tabId) => {
    if (tabId === 'dashboard') {
      navigate('/strategies/gmis-mou/dashboard');
    } else if (tabId === 'list') {
      navigate('/strategies/gmis-mou/data-list');
    } else if (tabId === 'add') {
      setEditData(null);
      navigate('/strategies/gmis-mou/input-form');
    }
  };

  const handleEdit = (item) => {
    setEditData(item);
    navigate(item?.id ? `/strategies/gmis-mou/edit/${item.id}` : '/strategies/gmis-mou/input-form', { state: { item } });
  };

  const handleAddNew = () => {
    setEditData(null);
    navigate('/strategies/gmis-mou/input-form');
  };

  const handleFormSuccess = () => {
    setEditData(null);
    navigate('/strategies/gmis-mou/data-list');
  };

  const handleFormCancel = () => {
    setEditData(null);
    navigate('/strategies/gmis-mou/data-list');
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
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Child Routes */}
      <div>
        <Routes>
          <Route path="dashboard" element={
            <Dashboard 
              onNavigateToTab={(tabId) => handleTabChange(tabId)} 
            />
          } />
          
          <Route path="data-list" element={
            <DataList
              onEdit={canEdit ? handleEdit : null}
              onAddNew={canAdd ? handleAddNew : null}
              triggerNotification={triggerNotification}
            />
          } />

          <Route path="input-form" element={
            <InputForm
              editData={editData}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              triggerNotification={triggerNotification}
            />
          } />

          <Route path="edit/:mouId" element={
            <InputForm
              editData={editData}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              triggerNotification={triggerNotification}
            />
          } />

          {/* Default fallback inside GMIS */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>

    </div>
  );
}

