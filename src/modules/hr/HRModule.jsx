import React, { useState, useEffect } from 'react';
import HRDashboard from './pages/Dashboard';
import InternalNavigation from '../../components/navigation/InternalNavigation';
import { LayoutDashboard, ClipboardList, UserX, UserPlus, BookOpen, FilePieChart } from 'lucide-react';

export default function HRModule({ initialTab, onSyncTab }) {
  const [activeSubTab, setActiveSubTab] = useState(initialTab || 'HR Dashboard');

  useEffect(() => {
    if (initialTab && initialTab !== activeSubTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab) => {
    setActiveSubTab(tab);
    if (onSyncTab) onSyncTab(tab);
  };

  const SUB_TABS = [
    { id: 'HR Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Employee Database', label: 'Employee Database', icon: ClipboardList },
    { id: 'List of Abolished Posts', label: 'List of Abolished Posts', icon: UserX },
    { id: 'Contractual Employment', label: 'Contractual Employment', icon: UserPlus },
    { id: 'Training Details', label: 'Training Details', icon: BookOpen },
    { id: 'HR Reports', label: 'Reports', icon: FilePieChart }
  ];

  const headerNav = (
    <InternalNavigation
      tabs={SUB_TABS} 
      currentTab={activeSubTab} 
      onTabChange={handleTabChange}
    />
  );

  return (
    <HRDashboard 
      activeSubTab={activeSubTab} 
      setActiveSubTab={handleTabChange} 
      headerNav={headerNav} 
      subTabs={SUB_TABS}
    />
  );
}
