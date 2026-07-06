  import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import { ProjectTable, AddProjectForm } from './modules/Projects/Projects';
import ProjectsLess5Cr from './modules/Projects/ProjectsLess5Cr';
import LumpsumIWAI from './modules/Projects/LumpsumIWAI';
import ViewDropRequest from './modules/Projects/ViewDropRequest';
import DashboardView from './modules/Dashboard/Dashboard';
import AddSubProjectModal from './components/AddSubProjectModal';
import LoginView from './modules/Login/Login';
import LandingView from './modules/Landing/Landing';
import { PortsDashboardView, PortsInputFormView, PortsReportsView } from './modules/MajorPorts/MajorPorts';
import EOfficeView from './modules/EOffice/EOffice';
import AttendanceView from './modules/Attendance/Attendance';
import CPGRAMSView from './modules/CPGRAMS/CPGRAMS';
import HRDashboardView from './modules/HR/HR';
import YoungProfessionalsView from './modules/YoungProfessionals/YoungProfessionals';
import ConsultantAppointmentView from './modules/ConsultantAppointment/ConsultantAppointment';
// import ProfileView from './modules/Profile/Profile';
import ProfileView from './modules/Profile/Profile-Trial';
import CabinetNotes from './modules/CabinetNotes/CabinetNotes';
import CabinetNotesOther from './modules/CabinetNotesOther/CabinetNotes';
import ParliamentaryIssues from './modules/ParliamentaryIssues/ParliamentaryIssues';
import ActsRules from './modules/ActsRules/ActsRules';
import BillsPreConstitutionsView from './modules/BillsPreConstitutions/BillsPreConstitutions';
import MediaOutreachView from './modules/MediaOutreach/MediaOutreach';
import AuditPara from './modules/AuditPara/AuditPara';
import VIPReference from './modules/VIPReference/VIPReference';
import Footer from './components/Footer';
import UserManagementView from './modules/UserManagement/UserManagement';
import { Bell, Sparkles, CheckCircle2, Home, ChevronRight, LayoutDashboard, ClipboardList, TrendingDown, TrendingUp, FolderSync, FilePieChart } from 'lucide-react';

const PROJECT_TABS = [
  { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Project List', icon: ClipboardList },
  { id: 'less5cr', label: 'Projects Less Than 5 Cr', icon: TrendingDown },
  { id: 'lumpsum', label: 'Lumpsum - IWAI', icon: TrendingUp },
  { id: 'dropRequests', label: 'View Drop Request', icon: FolderSync },
  { id: 'reports', label: 'Reports', icon: FilePieChart },
];

const INITIAL_PROJECTS = [
  {
    id: 1,
    projectId: 'PR0699',
    subProjectId: '-',
    projectName: 'Development of PPP Projects',
    subProjectName: '-',
    cost: '',
    agency: '',
    stage: 'null',
    category: 'Capacity Enhancement',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'PPP',
    projectType: 'Capital',
    projectBrief: 'Development of various PPP Projects',
    initiatedDate: '2025-01-01',
    completionDate: '2028-12-31',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'Sagarmala',
    initiative: 'Modernization',
    output: 'Berth Built',
    outcome: 'Increased cargo throughput',
    capacity: '10',
    fundingSource: 'Private',
    primaryFundingAgency: 'Concessionaire',
    secondaryFundingAgency: '',
    state: 'Maharashtra',
    district: 'Mumbai',
    taluka: '',
    village: '',
    mpConstituency: 'MumbaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '100',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 2,
    projectId: 'PR0894',
    subProjectId: '-',
    projectName: 'Rail connectivity to MMT',
    subProjectName: '-',
    cost: '',
    agency: '',
    stage: 'null',
    category: 'Connectivity Enhancement',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'EPC',
    projectType: 'Capital',
    projectBrief: 'Rail line connectivity to MMT',
    initiatedDate: '2025-02-15',
    completionDate: '2027-06-30',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'GatiShakti',
    initiative: 'Connectivity',
    output: 'IT System',
    outcome: 'Improved multimodal transport connectivity',
    capacity: '',
    fundingSource: 'Budgetary',
    primaryFundingAgency: 'MoPSW',
    secondaryFundingAgency: '',
    state: 'Gujarat',
    district: 'Mumbai',
    taluka: '',
    village: '',
    mpConstituency: 'MumbaiSouth',
    isLandAcquiredRequired: 'Yes',
    percentageLandAcquired: '80',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 3,
    projectId: 'PR0643',
    subProjectId: '-',
    projectName: 'Coastal Districts Skill Development Program - Phase II -Karnataka',
    subProjectName: '-',
    cost: '',
    agency: 'Ministry of Rural Development (DDU-GKY)',
    stage: 'Project Initiated',
    category: 'Coastal Berth',
    physicalProgress: '',
    financialProgress: '',
    isSagarmalaFunded: true,
    implementationType: 'Lumpsum',
    projectType: 'General',
    projectBrief: 'Skill development training program in coastal Karnataka districts',
    initiatedDate: '2025-03-01',
    completionDate: '2026-03-01',
    revisedCompletionDate: '',
    secondaryAgency: 'Karnataka State Government',
    scheme: 'Sagarmala',
    initiative: 'Community',
    output: 'IT System',
    outcome: 'Employment opportunities for coastal youth',
    capacity: '',
    fundingSource: 'Budgetary',
    primaryFundingAgency: 'MoPSW',
    secondaryFundingAgency: 'MoRD',
    state: 'TamilNadu',
    district: 'Chennai',
    taluka: '',
    village: '',
    mpConstituency: 'ChennaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 4,
    projectId: 'PR0787',
    subProjectId: '-',
    projectName: 'Setting up of New Container Terminal at BD II',
    subProjectName: '-',
    cost: '',
    agency: 'Chennai Port Authority',
    stage: 'Project Initiated',
    category: 'Port Modernization',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'PPP',
    projectType: 'Capital',
    projectBrief: 'Setting up container terminal BD II',
    initiatedDate: '2025-04-10',
    completionDate: '2029-12-31',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'MIV2030',
    initiative: 'Modernization',
    output: 'Berth Built',
    outcome: 'Add 2 MTPA capacity',
    capacity: '2.0',
    fundingSource: 'Internal',
    primaryFundingAgency: 'Chennai Port Authority',
    secondaryFundingAgency: '',
    state: 'TamilNadu',
    district: 'Chennai',
    taluka: '',
    village: '',
    mpConstituency: 'ChennaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 5,
    projectId: 'PR0786',
    subProjectId: '-',
    projectName: 'Setting up of Multi Cargo Terminal at JD - West through PPP.',
    subProjectName: '-',
    cost: '',
    agency: 'Chennai Port Authority',
    stage: 'Project Initiated',
    category: 'Port Modernization',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'PPP',
    projectType: 'Capital',
    projectBrief: 'Developing multi cargo terminal at JD west',
    initiatedDate: '2025-05-15',
    completionDate: '2028-10-31',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'Sagarmala',
    initiative: 'Modernization',
    output: 'Berth Built',
    outcome: 'Enhance bulk handling capacity',
    capacity: '1.5',
    fundingSource: 'Private',
    primaryFundingAgency: 'PPP Partner',
    secondaryFundingAgency: '',
    state: 'TamilNadu',
    district: 'Chennai',
    taluka: '',
    village: '',
    mpConstituency: 'ChennaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 6,
    projectId: 'PR0752',
    subProjectId: '-',
    projectName: 'Setting up of Multi Cargo Terminal at JD - East through PPP mode',
    subProjectName: '-',
    cost: '',
    agency: 'Chennai Port Authority',
    stage: 'Project Initiated',
    category: 'Port Modernization',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'PPP',
    projectType: 'Capital',
    projectBrief: 'Developing multi cargo terminal at JD east',
    initiatedDate: '2025-06-20',
    completionDate: '2028-12-31',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'Sagarmala',
    initiative: 'Modernization',
    output: 'Berth Built',
    outcome: 'Increased bulk cargo space',
    capacity: '1.8',
    fundingSource: 'Private',
    primaryFundingAgency: 'PPP Partner',
    secondaryFundingAgency: '',
    state: 'TamilNadu',
    district: 'Chennai',
    taluka: '',
    village: '',
    mpConstituency: 'ChennaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 7,
    projectId: 'PR0759',
    subProjectId: '-',
    projectName: 'Multi Cargo Terminal-II',
    subProjectName: '-',
    cost: '',
    agency: 'Kamarajar Port Limited',
    stage: 'Project Initiated',
    category: 'Port Modernization',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'PPP',
    projectType: 'Capital',
    projectBrief: 'Establish multi cargo terminal II',
    initiatedDate: '2025-07-01',
    completionDate: '2029-03-31',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'MIV2030',
    initiative: 'Modernization',
    output: 'Berth Built',
    outcome: 'Additional cargo draft',
    capacity: '3.0',
    fundingSource: 'Internal',
    primaryFundingAgency: 'KPL',
    secondaryFundingAgency: '',
    state: 'TamilNadu',
    district: 'Chennai',
    taluka: '',
    village: '',
    mpConstituency: 'ChennaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 8,
    projectId: 'PR0760',
    subProjectId: '-',
    projectName: 'Second Container Terminal',
    subProjectName: '-',
    cost: '',
    agency: 'Kamarajar Port Limited',
    stage: 'Project Initiated',
    category: 'Port Modernization',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'PPP',
    projectType: 'Capital',
    projectBrief: 'Setup second container terminal',
    initiatedDate: '2025-08-10',
    completionDate: '2029-12-31',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'Sagarmala',
    initiative: 'Modernization',
    output: 'Berth Built',
    outcome: '2.5 MTPA capacity addition',
    capacity: '2.5',
    fundingSource: 'Private',
    primaryFundingAgency: 'Concessionaire',
    secondaryFundingAgency: '',
    state: 'TamilNadu',
    district: 'Chennai',
    taluka: '',
    village: '',
    mpConstituency: 'ChennaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 9,
    projectId: 'PR0762',
    subProjectId: '-',
    projectName: 'Bulk Terminal-1',
    subProjectName: '-',
    cost: '',
    agency: 'Kamarajar Port Limited',
    stage: 'Project Initiated',
    category: 'Port Modernization',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'PPP',
    projectType: 'Capital',
    projectBrief: 'Setup bulk terminal 1',
    initiatedDate: '2025-09-01',
    completionDate: '2028-06-30',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'MIV2030',
    initiative: 'Modernization',
    output: 'Berth Built',
    outcome: 'Optimized bulk handling',
    capacity: '2.0',
    fundingSource: 'Private',
    primaryFundingAgency: 'Concessionaire',
    secondaryFundingAgency: '',
    state: 'TamilNadu',
    district: 'Chennai',
    taluka: '',
    village: '',
    mpConstituency: 'ChennaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  },
  {
    id: 10,
    projectId: 'PR0763',
    subProjectId: '-',
    projectName: 'General Cargo Berth 3',
    subProjectName: '-',
    cost: '',
    agency: 'Kamarajar Port Limited',
    stage: 'Project Initiated',
    category: 'Port Modernization',
    physicalProgress: '',
    financialProgress: '',
    implementationType: 'EPC',
    projectType: 'Capital',
    projectBrief: 'Establish general cargo berth 3',
    initiatedDate: '2025-10-01',
    completionDate: '2027-12-31',
    revisedCompletionDate: '',
    secondaryAgency: '',
    scheme: 'Sagarmala',
    initiative: 'Modernization',
    output: 'Berth Built',
    outcome: 'Increased roll-on/roll-off capability',
    capacity: '1.0',
    fundingSource: 'Budgetary',
    primaryFundingAgency: 'MoPSW',
    secondaryFundingAgency: '',
    state: 'TamilNadu',
    district: 'Chennai',
    taluka: '',
    village: '',
    mpConstituency: 'ChennaiSouth',
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [
      { sn: 1, year: '2025-26', target: '' }
    ]
  }
];

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
    'Major Ports Dashboard': ['KPI', 'Major Ports'],
    'Major Ports Input Form': ['KPI', 'Major Ports'],
    'Major Ports Reports': ['KPI', 'Major Ports'],
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

  const legalItems = ['Courtcases', 'Acts & Rules', 'Bills/PreConstitutions Act'];
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

const ROUTE_MAP = {
  'landing': 'landing',
  'profile': 'profile',
  
  // Projects nested routes
  'dashboard': 'projects/project/project-dashboard',
  'projects': 'projects/project/project-list',
  'less5cr': 'projects/project/projects-less-than-5-cr',
  'lumpsum': 'projects/project/lumpsum-iwai',
  'dropRequests': 'projects/project/view-drop-request',
  'reports': 'projects/project/reports',
  
  // KPI nested routes
  'Major Ports Dashboard': 'kpi/major-ports/major-ports-dashboard',
  'Major Ports Input Form': 'kpi/major-ports/major-ports-input-form',
  'Major Ports Reports': 'kpi/major-ports/major-ports-reports',
  
  // Governance nested routes
  'E Office': 'governance/e-office',
  'Attendance': 'governance/attendance',
  'CPGRAMS': 'governance/cpgrams',
  'Cabinet Notes - MoPSW': 'governance/cabinet-notes',
  'Cabinet Notes - Other Ministries': 'governance/cabinet-notes-other-ministry',
  'VIP Reference': 'governance/vip-reference',
  
  // Legal nested routes
  'Courtcases': 'legal/courtcases',
  'Acts & Rules': 'legal/acts-rules',
  
  // Strategies nested routes
  'Vision 2047': 'strategies/vision-2047',
  'Maritime India Summit': 'strategies/maritime-india-summit',
  'Blue Economy Policy': 'strategies/blue-economy-policy',
  
  // Knowledge nested routes
  'Research Papers': 'knowledge/research-papers',
  'Policy Documents': 'knowledge/policy-documents',
  'Guidelines': 'knowledge/guidelines',
  
  // Form Builder nested routes
  'Create Dynamic Form': 'formBuilder/create-dynamic-form',
  'View Submissions': 'formBuilder/view-submissions',
  
  // Tracker nested routes
  'Project Milestones': 'tracker/project-milestones',
  'Delay Analysis': 'tracker/delay-analysis',
  
  // Meetings nested routes
  'Meeting Schedule': 'meeting/meeting-schedule',
  'Minutes of Meeting': 'meeting/minutes-of-meeting',
  'Action Taken Report': 'meeting/action-taken-report',
  
  // Contacts nested routes
  'Ministry Contacts': 'contact/ministry-contacts',
  'Helpdesk Support': 'contact/helpdesk-support',
  
  // User Management
  'User Management': 'userManagement/user-management',
  
  // HR nested routes
  'HR Dashboard': 'hr/hr-management/hr-dashboard',
  'Employee Database': 'hr/hr-management/employee-database',
  'List of Abolished Ports': 'hr/hr-management/abolished-ports',
  'List of Abolished Posts': 'hr/hr-management/abolished-posts',
  'Contractual Employment': 'hr/hr-management/contractual-employment',
  'Training Details': 'hr/hr-management/training-details',
  'HR Reports': 'hr/hr-management/hr-reports',
};

const getTabFromSlug = (slug) => {
  const entry = Object.entries(ROUTE_MAP).find(([, value]) => value === slug);
  return entry ? entry[0] : slug;
};

export default function App() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    return path ? getTabFromSlug(path) : 'landing';
  });
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddSubProjectOpen, setIsAddSubProjectOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [eOfficeKpi, setEOfficeKpi] = useState('file-pendency');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync pathname changes from browser back/forward history buttons to activeTab state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '');
      if (path) {
        setActiveTab(getTabFromSlug(path));
      } else {
        setActiveTab('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync activeTab changes back to browser path
  useEffect(() => {
    if (isLoggedIn) {
      const slug = ROUTE_MAP[activeTab] || activeTab;
      const currentPath = window.location.pathname.replace(/^\//, '');
      if (currentPath !== slug) {
        window.history.pushState(null, '', `/${slug}`);
      }
    }
  }, [activeTab, isLoggedIn]);

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
        {activeTab !== 'landing' && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold px-2 mb-6 mt-3 animate-fade-in select-none bg-white py-2.5 px-4 rounded-xl border border-slate-200 shadow-sm w-fit">
            <Home className="h-3.5 w-3.5 text-slate-500 cursor-pointer hover:text-blue-700 transition-colors" onClick={() => setActiveTab('landing')} />
            {getBreadcrumbs(activeTab).slice(1).map((crumb, idx, arr) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="text-slate-350">/</span>
                <span className={idx === arr.length - 1 ? "text-blue-800 font-bold" : "text-slate-550"}>
                  {crumb}
                </span>
              </div>
            ))}
          </div>
        )}
        
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

        {activeTab === 'dashboard' && (
          <DashboardView 
            projects={projects} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        )}
        
        {['projects', 'reports'].includes(activeTab) && (
          isAddingProject ? (
            <AddProjectForm 
              onAdd={handleAddProject}
              onClose={() => setIsAddingProject(false)}
            />
          ) : (
            <ProjectTable 
              projects={projects} 
              setProjects={setProjects}
              onAddProjectClick={() => setIsAddingProject(true)}
              onAddSubProjectClick={() => setIsAddSubProjectOpen(true)}
              onExportTrigger={(type) => triggerNotification(`${type} triggered successfully.`)}
              activeTab={activeTab} 
              setActiveTab={setActiveTab}
            />
          )
        )}

        {activeTab === 'less5cr' && (
          <ProjectsLess5Cr 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'lumpsum' && (
          <LumpsumIWAI 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'dropRequests' && (
          <ViewDropRequest 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'Major Ports Dashboard' && (
          <PortsDashboardView />
        )}

        {activeTab === 'Major Ports Input Form' && (
          <PortsInputFormView />
        )}

        {activeTab === 'Major Ports Reports' && (
          <PortsReportsView />
        )}

        {activeTab === 'E Office' && (
          <EOfficeView key={eOfficeKpi} initialKpi={eOfficeKpi} />
        )}

        {activeTab === 'Attendance' && (
          <AttendanceView />
        )}

        {activeTab === 'CPGRAMS' && (
          <CPGRAMSView />
        )}

        {activeTab === 'Cabinet Notes - MoPSW' && (
          <CabinetNotes />
        )}

        {activeTab === 'Cabinet Notes - Other Ministries' && (
          <CabinetNotesOther />
        )}

        {activeTab === 'Parliamentary Issue' && (
          <ParliamentaryIssues />
        )}

        {['HR Dashboard', 'Employee Database', 'List of Abolished Ports', 'List of Abolished Posts', 'Contractual Employment', 'Training Details', 'HR Reports'].includes(activeTab) && (
          <HRDashboardView activeSubTab={activeTab} setActiveSubTab={setActiveTab} />
        )}

        {['YP Input Form', 'YP Reports'].includes(activeTab) && (
          <YoungProfessionalsView activeSubTab={activeTab} setActiveSubTab={setActiveTab} triggerNotification={triggerNotification} />
        )}

        {['Consultant Input Form', 'Consultant Reports'].includes(activeTab) && (
          <ConsultantAppointmentView activeSubTab={activeTab} setActiveSubTab={setActiveTab} triggerNotification={triggerNotification} />
        )}

        {activeTab === 'profile' && (
          <ProfileView triggerNotification={triggerNotification} />
        )}

        {activeTab === 'User Management' && (
          <UserManagementView triggerNotification={triggerNotification} />
        )}

        {activeTab === 'Acts & Rules' && (
          <ActsRules triggerNotification={triggerNotification} />
        )}

        {activeTab === 'Bills/PreConstitutions Act' && (
          <BillsPreConstitutionsView triggerNotification={triggerNotification} />
        )}

        {activeTab === 'Media Outreach' && (
          <MediaOutreachView triggerNotification={triggerNotification} />
        )}

        {activeTab === 'Audit Paras' && (
          <AuditPara />
        )}

        {activeTab === 'VIP Reference' && (
          <VIPReference />
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
        {!['dashboard', 'projects', 'less5cr', 'lumpsum', 'dropRequests', 'reports', 'landing', 'Major Ports Dashboard', 'Major Ports Input Form', 'Major Ports Reports', 'E Office', 'Attendance', 'CPGRAMS', 'HR Dashboard', 'Employee Database', 'List of Abolished Ports', 'List of Abolished Posts', 'Contractual Employment', 'Training Details', 'HR Reports', 'YP Input Form', 'YP Reports', 'Consultant Input Form', 'Consultant Reports', 'profile', 'Cabinet Notes - MoPSW', 'Cabinet Notes - Other Ministries', 'Parliamentary Issue', 'Acts & Rules', 'Bills/PreConstitutions Act', 'Media Outreach', 'Audit Paras', 'VIP Reference', 'User Management'].includes(activeTab) && (
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