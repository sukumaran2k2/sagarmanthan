import React, { useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { 
  UserPlus, 
  BookOpen, 
  Users,
  FileEdit
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';

import ContractualEmployment from './pages/ContractualEmployment';
import TrainingDetails from './pages/TrainingDetails';
import InputForm from './pages/InputForm';
import ListAbolishedPosts from './pages/ListAbolishedPosts';

export default function HRDashboardView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/abolished-posts')) return 'abolished-posts';
    if (path.includes('/training-details')) return 'training-details';
    if (path.includes('/input-form')) return 'input-form';
    return 'contractual-employment';
  }, [location.pathname]);

  const isEditMode = !!location.state?.editData;

  const tabs = [
    { id: 'abolished-posts', label: 'List of Abolished Posts', icon: Users },
    { id: 'contractual-employment', label: 'Contractual Employment', icon: UserPlus },
    { id: 'training-details', label: 'Training Details', icon: BookOpen },
    { id: 'input-form', label: isEditMode && currentTab === 'input-form' ? 'Update Form' : 'Input Form', icon: FileEdit },
  ];

  const handleTabChange = (tabId) => {
    navigate(`/hr/hr-management/${tabId}`);
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-[#0f417a] dark:text-blue-400" />
            <span>HR Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Manage contractual employment and training details.
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
          <Route path="abolished-posts" element={<ListAbolishedPosts triggerNotification={triggerNotification} />} />
          <Route path="contractual-employment" element={<ContractualEmployment triggerNotification={triggerNotification} />} />
          <Route path="training-details" element={<TrainingDetails triggerNotification={triggerNotification} />} />
          <Route path="input-form/*" element={<InputForm triggerNotification={triggerNotification} />} />

          <Route index element={<Navigate to="abolished-posts" replace />} />
          <Route path="*" element={<Navigate to="abolished-posts" replace />} />
        </Routes>
      </div>
      
    </div>
  );
}
