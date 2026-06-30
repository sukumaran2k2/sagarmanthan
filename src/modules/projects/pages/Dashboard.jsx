import { useState } from 'react';
import InternalNavigation from '../../../components/navigation/InternalNavigation';
import Dashboard from '../../../components/dashboard/Dashboard';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import ProjectFilters from '../components/ProjectFilters';
import ProjectStatistics from '../components/ProjectStatistics';
import ProjectCharts from '../components/ProjectCharts';
import PhysicalProgressTable from '../components/PhysicalProgressTable';
import OngoingProjectsTab from '../components/OngoingProjectsTab';

export default function ProjectDashboard({ projects, headerNav }) {
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  return (
    <Dashboard>

      <DashboardHeader 
        title="Projects Dashboard" 
        description="Real-time status updates and financial tracking of key maritime category plans."
      >
        <div className="flex flex-col items-start space-y-2 md:items-end">
          {/* Primary navigation tabs */}
          {headerNav}
          {/* Secondary navigation for Project Dashboard sub‑views */}
          <InternalNavigation
            tabs={[
              { id: 'all', label: 'All Projects View' },
              { id: 'ongoing', label: 'Ongoing Projects – Major Ports' },
            ]}
            currentTab={activeSubTab}
            onTabChange={setActiveSubTab}
          />
        </div>
      </DashboardHeader>

     


      {activeSubTab === 'all' ? (
        <>
          <ProjectFilters 
            isFiltersExpanded={isFiltersExpanded} 
            setIsFiltersExpanded={setIsFiltersExpanded} 
          />

          {/* KPI Cards Grid */}
          <ProjectStatistics />

          {/* Charts Row: Organisations Wise Project Count & Delay Status side-by-side */}
          <ProjectCharts />

          {/* Physical Progress (20% Buckets) Card */}
          <PhysicalProgressTable />
        </>
      ) : (
        <OngoingProjectsTab />
      )}

    </Dashboard>
  );
}
