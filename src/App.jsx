import React, { useState, useEffect } from 'react';
import Header from './components/navigation/Header';
import Tabs from './components/navigation/Tabs';
import Footer from './components/navigation/Footer';
// Project module
import ProjectsModule from './modules/projects/ProjectsModule';
// Ports module
import PortsModule from './modules/ports/PortsModule';
// HR module
import HRModule from './modules/hr/HRModule';
// Governance modules
import AttendanceModule from './modules/attendance/AttendanceModule';
import CPGRAMSModule from './modules/cpgrams/CPGRAMSModule';
import EOfficeModule from './modules/eoffice/EOfficeModule';
// Standalone pages
import LandingView from './components/LandingView';
import LoginView from './components/LoginView';
import ProfileView from './components/ProfileView';
import { Sparkles, CheckCircle2 } from 'lucide-react';

const getBreadcrumbs = (tab) => {
  if (tab === 'landing') return ['Home'];
  if (tab === 'Ports Reports') return ['KPI - Major Ports - (Output Reports)'];
  
  // Projects tab routes
  if (tab === 'dashboard') return ['Home', 'Projects', 'Project', 'Project Dashboard'];
  if (tab === 'projects') return ['Home', 'Projects', 'Project', 'Project List'];
  if (tab === 'less5cr') return ['Home', 'Projects', 'Project', 'Projects Less Than 5 Cr'];
  if (tab === 'lumpsum') return ['Home', 'Projects', 'Project', 'Lumpsum - IWAI'];
  if (tab === 'dropRequests') return ['Home', 'Projects', 'Project', 'View Drop Request'];
  if (tab === 'reports') return ['Home', 'Projects', 'Project', 'Reports'];
  
  // Dynamic lookup for other tabs
  const kpiItems = {
    'Ports Dashboard': ['KPI', 'Major Ports'],
    'Ports Input Form': ['KPI', 'Major Ports'],
    'Ports Reports': ['KPI', 'Major Ports'],
    'MMD Master': ['KPI', 'DSG'],
    'DSG Input Form': ['KPI', 'DSG'],
    'DSG Reports': ['KPI', 'DSG'],
    'IWAI Master': ['KPI', 'IWAI'],
    'National Waterways': ['KPI', 'IWAI'],
    'Terminal/Jetties': ['KPI', 'IWAI'],
    'Digital Portals': ['KPI', 'IWAI'],
    'DGLL Input Form': ['KPI', 'DGLL'],
    'DGLL Reports': ['KPI', 'DGLL'],
    'CSL Input Form': ['KPI', 'CSL'],
    'CSL Reports': ['KPI', 'CSL'],
    'IMU Input Form': ['KPI', 'IMU'],
    'IMU Reports': ['KPI', 'IMU'],
    'SCI Input Form': ['KPI', 'SCI'],
    'SCI Reports': ['KPI', 'SCI'],
    'CMEC Input Form': ['KPI', 'CMEC'],
    'CMEC Reports': ['KPI', 'CMEC'],
  };
  if (kpiItems[tab]) return ['Home', ...kpiItems[tab], tab];

  const hrItems = {
    'HR Dashboard': ['HR & Institutional', 'HR Management'],
    'Employee Database': ['HR & Institutional', 'HR Management'],
    'List of Abolished Ports': ['HR & Institutional', 'HR Management'],
    'Contractual Employment': ['HR & Institutional', 'HR Management'],
    'Training Details': ['HR & Institutional', 'HR Management'],
    'HR Reports': ['HR & Institutional', 'HR Management'],
    'YP Input Form': ['HR & Institutional', 'Young Professionals'],
    'YP Reports': ['HR & Institutional', 'Young Professionals'],
    'Consultant Input Form': ['HR & Institutional', 'Consultant Appointment'],
    'Consultant Reports': ['HR & Institutional', 'Consultant Appointment'],
  };
  if (hrItems[tab]) return ['Home', ...hrItems[tab], tab];

  const governanceItems = [
    'Attendance', 'CPGRAMS', 'Cabinet Notes - Other Ministries', 'E Office',
    'Parliamentary Issues', 'GEM Procurements', 'Cabinet Notes - MoPSW',
    'VIP Reference', 'Media Outreach', 'Audit Paras',
    'Inter State & Inter Ministerial', 'Foreign Visit', 'Cruise Shipping',
    'Flagged Ships / FOB Basis', 'MOM Of PSW Meetings', 'Review Items'
  ];
  if (governanceItems.includes(tab)) return ['Home', 'Governance', tab];

  const legalItems = ['Courtcases', 'Acts & Rules'];
  if (legalItems.includes(tab)) return ['Home', 'Legal', tab];

  const visionItems = ['Vision 2047', 'Maritime India Summit', 'Blue Economy Policy'];
  if (visionItems.includes(tab)) return ['Home', 'Long Term Strategies', tab];

  const knowledgeItems = ['Research Papers', 'Policy Documents', 'Guidelines'];
  if (knowledgeItems.includes(tab)) return ['Home', 'Knowledge Repository', tab];

  const formBuilderItems = ['Create Dynamic Form', 'View Submissions'];
  if (formBuilderItems.includes(tab)) return ['Home', 'Form Builder', tab];

  const trackerItems = ['Project Milestones', 'Delay Analysis'];
  if (trackerItems.includes(tab)) return ['Home', 'MoPSW Tracker', tab];

  const meetingItems = ['Meeting Schedule', 'Minutes of Meeting', 'Action Taken Report'];
  if (meetingItems.includes(tab)) return ['Home', 'Senior Officers Meeting', tab];

  const contactItems = ['Ministry Contacts', 'Helpdesk Support'];
  if (contactItems.includes(tab)) return ['Home', 'Contact Us', tab];

  return ['Home', tab];
};

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [notification, setNotification] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [eOfficeKpi, setEOfficeKpi] = useState('file-pendency');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [projects, setProjects] = useState([]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
      <Header 
        onLogout={() => setIsLoggedIn(false)} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onProfileClick={() => setActiveTab('profile')}
      />

      {/* Tab Navigation Menu */}
      <Tabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        projectCount={projects.length} 
      />

      {/* Main Content Viewport */}
      <main className="flex-grow w-full max-w-full px-4 sm:px-6 lg:px-8 pb-12">
        {/* Dynamic Breadcrumbs Row */}
        {activeTab === 'landing' && (
          <LandingView 
            onNavigate={(tab, subKpi) => {
              if (subKpi) {
                setEOfficeKpi(subKpi);
              }
              setActiveTab(tab);
            }} 
          />
        )}

        {['dashboard', 'projects', 'less5cr', 'lumpsum', 'dropRequests', 'reports'].includes(activeTab) && (
          <ProjectsModule 
            initialTab={activeTab}
            onSyncTab={setActiveTab}
            triggerNotification={triggerNotification}
          />
        )}

        {['Ports Dashboard', 'Ports Input Form', 'Ports Reports'].includes(activeTab) && (
          <PortsModule initialTab={activeTab} onSyncTab={setActiveTab} />
        )}

        {activeTab === 'E Office' && (
          <EOfficeModule />
        )}

        {activeTab === 'Attendance' && (
          <AttendanceModule />
        )}

        {activeTab === 'CPGRAMS' && (
          <CPGRAMSModule />
        )}

        {['HR Dashboard', 'Employee Database', 'List of Abolished Ports', 'List of Abolished Posts', 'Contractual Employment', 'Training Details', 'HR Reports'].includes(activeTab) && (
          <HRModule initialTab={activeTab} onSyncTab={setActiveTab} />
        )}

        {activeTab === 'profile' && (
          <ProfileView triggerNotification={triggerNotification} />
        )}

        {/* Placeholder / Empty State for other inactive government menu views */}
        {!['dashboard', 'projects', 'landing', 'Ports Dashboard', 'Ports Input Form', 'Ports Reports', 'E Office', 'Attendance', 'CPGRAMS', 'HR Dashboard', 'Employee Database', 'List of Abolished Ports', 'List of Abolished Posts', 'Contractual Employment', 'Training Details', 'HR Reports', 'profile'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in bg-white rounded-2xl border border-slate-200 shadow-sm mt-6 max-w-3xl mx-auto">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 shadow-inner">
              <Sparkles className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 font-display">SAGARMANTHAN - {activeTab}</h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              This module is currently processing real-time telemetry from the Ministry databases. Custom reports, input forms, and analytics for <strong className="text-blue-700">{activeTab}</strong> are being compiled.
            </p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="mt-6 px-4 py-2 bg-blue-650 hover:bg-blue-705 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Government Footer */}
      <Footer />
    </div>
  );
}