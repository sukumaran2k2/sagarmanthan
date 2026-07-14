import { useState } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  UserX, 
  UserPlus, 
  BookOpen, 
  FilePieChart
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';

import Dashboard from './pages/Dashboard';
import EmployeeDatabase from './pages/EmployeeDatabase';
import ListOfAbolishedPosts from './pages/ListOfAbolishedPosts';
import ContractualEmployment from './pages/ContractualEmployment';
import TrainingDetails from './pages/TrainingDetails';
import Reports from './pages/Reports';

export default function HRDashboardView({ activeSubTab, setActiveSubTab }) {
  // Sub-tabs configuration
  const SUB_TABS = [
    { id: 'HR Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Employee Database', label: 'Employee Database', icon: ClipboardList },
    { id: 'List of Abolished Posts', label: 'List of Abolished Posts', icon: UserX },
    { id: 'Contractual Employment', label: 'Contractual Employment', icon: UserPlus },
    { id: 'Training Details', label: 'Training Details', icon: BookOpen },
    { id: 'HR Reports', label: 'Reports', icon: FilePieChart }
  ];

  // Determine current active sub-tab (fallback to 'HR Dashboard' if prop is invalid or empty)
  const currentTab = SUB_TABS.some(t => t.id === activeSubTab) ? activeSubTab : 'HR Dashboard';

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">

      {/* Header Row: Title & Navigation Tab Switcher on the same line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            HR Management
          </h2>
        </div>

        {/* Modern Segmented Control Tab Switcher */}
        <InternalNavigation
          tabs={SUB_TABS} 
          currentTab={currentTab} 
          onTabChange={setActiveSubTab}
        />
      </div>

      {/* Render sub-page depending on selected tab */}
      <div className="space-y-6">
        {currentTab === 'HR Dashboard' && <Dashboard />}
        {currentTab === 'Employee Database' && <EmployeeDatabase />}
        {currentTab === 'List of Abolished Posts' && <ListOfAbolishedPosts />}
        {currentTab === 'Contractual Employment' && <ContractualEmployment />}
        {currentTab === 'Training Details' && <TrainingDetails />}
        {currentTab === 'HR Reports' && <Reports />}
      </div>

    </div>
  );
}
