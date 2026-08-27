import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Coins, ListTodo, PlusCircle, 
  FilePieChart, Heart 
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import Dashboard from './pages/Dashboard';
import FundDetails from './pages/FundDetails';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';

export default function CSRProjects({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [editData, setEditData] = useState(null);

  // Derive active tab from current pathname
  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/fund-details') || path.includes('/fund')) return 'fund-details';
    if (path.includes('/project-list') || path.includes('/list') || path.includes('/data-list')) return 'list';
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) return 'add';
    if (path.includes('/reports')) return 'reports';
    return 'dashboard';
  }, [location.pathname]);

  const tabs = useMemo(() => [
    { id: 'dashboard', label: 'CSR Dashboard', icon: LayoutDashboard },
    { id: 'fund-details', label: 'CSR Fund Details', icon: Coins },
    { id: 'list', label: 'CSR Project List', icon: ListTodo },
    { id: 'add', label: editData ? 'Update CSR Project' : 'Input Form', icon: PlusCircle },
    { id: 'reports', label: 'CSR Reports', icon: FilePieChart },
  ], [editData]);

  const handleTabChange = (tabId) => {
    if (tabId === 'dashboard') {
      navigate('/projects/csr-projects/dashboard');
    } else if (tabId === 'fund-details') {
      navigate('/projects/csr-projects/fund-details');
    } else if (tabId === 'list') {
      navigate('/projects/csr-projects/project-list');
    } else if (tabId === 'add') {
      setEditData(null);
      navigate('/projects/csr-projects/input-form');
    } else if (tabId === 'reports') {
      navigate('/projects/csr-projects/reports');
    }
  };

  const handleEdit = (item) => {
    setEditData(item);
    navigate(`/projects/csr-projects/edit/${item.csr_project_id || item.id}`, { state: { item } });
  };

  const handleAddNew = () => {
    setEditData(null);
    navigate('/projects/csr-projects/input-form');
  };

  const handleFormSuccess = () => {
    setEditData(null);
    navigate('/projects/csr-projects/project-list');
  };

  const handleFormBack = () => {
    setEditData(null);
    navigate('/projects/csr-projects/project-list');
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Module Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display flex items-center gap-2">
            <Heart className="h-5 w-5 text-[#0f417a] dark:text-blue-400" />
            <span>CSR Projects</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Corporate Social Responsibility Project Monitoring, Fund Allocations, and Physical/Financial Progress.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Module Content Routes */}
      <div>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard triggerNotification={triggerNotification} />} />
          <Route path="fund-details" element={<FundDetails triggerNotification={triggerNotification} />} />
          <Route path="project-list" element={
            <DataList 
              onAddNew={handleAddNew}
              onEdit={handleEdit}
              triggerNotification={triggerNotification}
            />
          } />
          <Route path="data-list" element={<Navigate to="../project-list" replace />} />
          <Route path="input-form" element={
            <InputForm 
              editData={editData}
              onBack={handleFormBack}
              onSuccess={handleFormSuccess}
              triggerNotification={triggerNotification}
            />
          } />
          <Route path="edit/:id" element={
            <InputForm 
              editData={editData}
              onBack={handleFormBack}
              onSuccess={handleFormSuccess}
              triggerNotification={triggerNotification}
            />
          } />
          <Route path="reports" element={<Reports triggerNotification={triggerNotification} />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>

    </div>
  );
}
