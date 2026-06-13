import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import ProjectTable from './components/ProjectTable';
import DashboardView from './components/DashboardView';
import AddProjectForm from './components/AddProjectForm';
import AddSubProjectModal from './components/AddSubProjectModal';
import LoginView from './components/LoginView';
import { Bell, Sparkles, CheckCircle2 } from 'lucide-react';

const INITIAL_PROJECTS = [
  {
    id: 1,
    projectId: 'PR1372',
    subProjectId: '-',
    projectName: 'Supply and Setting up of ICT Infrastructure & FMS Support for Data Center at SCI',
    subProjectName: '-',
    cost: '58.25',
    agency: 'Shipping Corporation of India',
    stage: 'Under Implementation',
    category: 'Digital Infrastructure',
    physicalProgress: '68',
    financialProgress: '54',
  },
  {
    id: 2,
    projectId: 'PR1371',
    subProjectId: '-',
    projectName: 'Deepening & widening of common portion of main channel of mumbai harbour & anchorages by JNPA',
    subProjectName: '-',
    cost: '5.00',
    agency: 'Jawaharlal Nehru Port Authority',
    stage: 'Under Implementation',
    category: 'Dredging Projects',
    physicalProgress: '85',
    financialProgress: '70',
  },
  {
    id: 3,
    projectId: 'PR1370',
    subProjectId: '-',
    projectName: 'Coal Berth 4',
    subProjectName: '-',
    cost: '0.00',
    agency: 'Kamarajar Port Limited',
    stage: 'Project Initiated',
    category: 'Coastal Berth',
    physicalProgress: '12',
    financialProgress: '0',
  },
  {
    id: 4,
    projectId: 'PR1369',
    subProjectId: '-',
    projectName: 'Coal Berth 3',
    subProjectName: '-',
    cost: '0.00',
    agency: 'Kamarajar Port Limited',
    stage: 'Project Initiated',
    category: 'Coastal Berth',
    physicalProgress: '10',
    financialProgress: '0',
  },
  {
    id: 5,
    projectId: 'PR1368',
    subProjectId: '-',
    projectName: 'Coal Berth 1 & 2',
    subProjectName: '-',
    cost: '0.00',
    agency: 'Kamarajar Port Limited',
    stage: 'Project Initiated',
    category: 'Coastal Berth',
    physicalProgress: '15',
    financialProgress: '5',
  },
  {
    id: 6,
    projectId: 'PR1367',
    subProjectId: '-',
    projectName: 'Replacement of FLP-WP LED light fitting with poles & allied works at PirPau',
    subProjectName: '-',
    cost: '7.75',
    agency: 'Mumbai Port Authority',
    stage: 'Under Tendering',
    category: 'Green Initiatives',
    physicalProgress: '0',
    financialProgress: '0',
  },
  {
    id: 7,
    projectId: 'PR1366',
    subProjectId: '-',
    projectName: 'DRY-DOCKING/REPAIRS of SCI PANNA',
    subProjectName: '-',
    cost: '0.00',
    agency: 'Shipping Corporation of India',
    stage: 'Project Initiated',
    category: 'Shipyard Development',
    physicalProgress: '5',
    financialProgress: '0',
  },
  {
    id: 8,
    projectId: 'PR1365',
    subProjectId: '-',
    projectName: 'Operation and Maintenance of existing EQ-10 berth at Visakhapatnam Port Authority',
    subProjectName: '-',
    cost: '11.41',
    agency: 'Visakhapatnam Port Authority',
    stage: 'Under Tendering',
    category: 'Port Modernization',
    physicalProgress: '0',
    financialProgress: '0',
  },
];

export default function App() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [activeTab, setActiveTab] = useState('projects');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddSubProjectOpen, setIsAddSubProjectOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Notification Trigger
  const triggerNotification = (message) => {
    setNotification(message);
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAddProject = (newProject) => {
    setProjects([newProject, ...projects]);
    triggerNotification(`Project ${newProject.projectId} successfully created.`);
  };

  const handleAddSubProject = (newSubProject) => {
    setProjects(prev => [newSubProject, ...prev]);
    triggerNotification(`Sub-project ${newSubProject.subProjectId} successfully created.`);
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative antialiased selection:bg-blue-100">
      
      {/* Toast Notification Alert Banner */}
      {notification && (
        <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in">
          <div className="p-1 bg-emerald-500 rounded-lg">
            <CheckCircle2 className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold font-display leading-tight">Notification</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{notification}</p>
          </div>
        </div>
      )}

      {/* Government Portal Header */}
      <Header onLogout={() => setIsLoggedIn(false)} />

      {/* Tab Navigation Menu */}
      <Tabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        projectCount={projects.length} 
      />

      {/* Main Content Viewport */}
      <main className="flex-grow w-full max-w-full px-4 sm:px-6 lg:px-8 pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView projects={projects} />
        )}
        
        {activeTab === 'projects' && (
          isAddingProject ? (
            <AddProjectForm 
              onAdd={handleAddProject}
              onClose={() => setIsAddingProject(false)}
            />
          ) : (
            <ProjectTable 
              projects={projects} 
              onAddProjectClick={() => setIsAddingProject(true)}
              onAddSubProjectClick={() => setIsAddSubProjectOpen(true)}
              onExportTrigger={(type) => triggerNotification(`${type} triggered successfully.`)}
            />
          )
        )}

        {isAddSubProjectOpen && (
          <AddSubProjectModal
            isOpen={isAddSubProjectOpen}
            onClose={() => setIsAddSubProjectOpen(false)}
            onAdd={handleAddSubProject}
            projects={projects}
          />
        )}

        {/* Placeholder / Empty State for other inactive government menu views */}
        {['less5cr', 'lumpsum', 'dropRequests', 'reports'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 shadow-inner">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 font-display">Specialized Monitored View</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              This section is configured to dynamically display filtered SAGARMANTHAN metrics for the selected category.
            </p>
          </div>
        )}
      </main>

      {/* Government Footer */}
      <footer className="bg-slate-900 border-t border-slate-850 text-slate-400 py-6 text-center text-xs mt-auto font-medium">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="tracking-wide text-slate-300">
            Copyright © {new Date().getFullYear()} Ministry of Ports, Shipping and Waterways, Government of India. All Rights Reserved.
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            Designed and developed for SAGARMANTHAN National Database Portal.
          </p>
        </div>
      </footer>
    </div>
  );
}