import React, { useState, useEffect } from 'react';
import TrafficDashboard from './pages/TrafficDashboard';
import PortsInputForm from './pages/PortsInputForm';
import PortsReports from './pages/PortsReports';
import InternalNavigation from '../../components/navigation/InternalNavigation';
import { LayoutDashboard, FileEdit, FilePieChart } from 'lucide-react';

export default function PortsModule({ initialTab, onSyncTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'Ports Dashboard');

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onSyncTab) onSyncTab(tab);
  };

  const headerNav = (
    <div className="flex justify-end mt-2 md:mt-0">
      <InternalNavigation
        tabs={[
          { id: 'Ports Dashboard', label: 'Ports Dashboard', icon: LayoutDashboard },
          { id: 'Ports Input Form', label: 'Ports Input Form', icon: FileEdit },
          { id: 'Ports Reports', label: 'Ports Reports', icon: FilePieChart },
        ]}
        currentTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );

  return (
    <>
      {activeTab === 'Ports Dashboard' && <TrafficDashboard headerNav={headerNav} />}
      {activeTab === 'Ports Input Form' && <PortsInputForm headerNav={headerNav} />}
      {activeTab === 'Ports Reports' && <PortsReports headerNav={headerNav} />}
    </>
  );
}
