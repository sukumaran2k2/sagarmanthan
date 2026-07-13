import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import Projects from './modules/Projects/Projects';
import ProjectsLess5Cr from './modules/Projects/ProjectsLess5Cr';
import LumpsumIWAI from './modules/Projects/LumpsumIWAI';
import ViewDropRequest from './modules/Projects/ViewDropRequest';
import DashboardView from './modules/Dashboard/Dashboard';
import LoginView from './modules/Login/Login';
import LandingView from './modules/Landing/Landing';
import { PortsDashboardView, PortsInputFormView, PortsReportsView } from './modules/MajorPorts/MajorPorts';
import EOfficeView from './modules/EOffice/EOffice';
import AttendanceView from './modules/Attendance/Attendance';
import CPGRAMSView from './modules/CPGRAMS/CPGRAMS';
import HRDashboardView from './modules/HR/HR';
import YoungProfessionalsView from './modules/YoungProfessionals/YoungProfessionals';
import ConsultantAppointmentView from './modules/ConsultantAppointment/ConsultantAppointment';
import ProfileView from './modules/Profile/Profile';
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
import ContactUsView from './modules/ContactUs/ContactUs';
import { Bell, Sparkles, CheckCircle2, Home, ChevronRight, LayoutDashboard, ClipboardList, TrendingDown, TrendingUp, FolderSync, FilePieChart, Shield, X } from 'lucide-react';
import Loader from './components/Loader';
import CompatibilityChecker from './components/CompatibilityChecker';

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

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
  if (tab === 'Bills/PreConstitutions Act') return ['Home', 'Legal', 'Bills/PreConstitutions Act'];
  if (tab === 'Media Outreach') return ['Home', 'Governance', 'Media Outreach'];
  if (tab === 'Audit Paras') return ['Home', 'Governance', 'Audit Paras'];
  if (tab === 'VIP Reference') return ['Home', 'Governance', 'VIP Reference'];
  if (tab === 'User Management') return ['Home', 'Governance', 'User Management'];

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
  'Parliamentary Issue': 'governance/parliamentary-issue',
  'Media Outreach': 'governance/media-outreach',
  'Audit Paras': 'governance/audit-paras',

  // Legal nested routes
  'Courtcases': 'legal/courtcases',
  'Acts & Rules': 'legal/acts-rules',
  'Bills/PreConstitutions Act': 'legal/bills-preconstitutions',

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
  'Contact Us': 'contact/contact-us',

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
  const cleanSlug = slug.replace(/^\//, '').replace(/\/$/, '');
  const entry = Object.entries(ROUTE_MAP).find(([, value]) => value === cleanSlug);
  return entry ? entry[0] : cleanSlug;
};

export default function App() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname;
    return path && path !== '/' ? getTabFromSlug(path) : 'landing';
  });
  const [notification, setNotification] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('accessToken');
  });
  const [eOfficeKpi, setEOfficeKpi] = useState('file-pendency');
  const [isTabLoading, setIsTabLoading] = useState(false);

  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem('sm_rbac_matrix');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { }
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = decodeToken(token);
        if (decoded) {
          const roleMapping = {
            1: 'super_admin',
            2: 'admin',
            3: 'senior_officer',
            4: 'nodal_officer',
            5: 'wing_level',
            6: 'under_secretary',
            7: 'director',
            8: 'joint_secretary',
            9: 'secretary',
            10: 'view_only_admin'
          };
          return {
            name: decoded.email ? decoded.email.split('@')[0] : 'User',
            role: roleMapping[decoded.roleId] || 'view_only_admin',
            roleLabel: roleMapping[decoded.roleId] || 'User'
          };
        }
      } catch (e) { }
    }
    return null;
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = decodeToken(token);
        if (decoded) {
          const roleMapping = {
            1: 'super_admin',
            2: 'admin',
            3: 'senior_officer',
            4: 'nodal_officer',
            5: 'wing_level',
            6: 'under_secretary',
            7: 'director',
            8: 'joint_secretary',
            9: 'secretary',
            10: 'view_only_admin'
          };
          setCurrentUser({
            name: decoded.email ? decoded.email.split('@')[0] : 'User',
            role: roleMapping[decoded.roleId] || 'view_only_admin',
            roleLabel: roleMapping[decoded.roleId] || 'User'
          });
        }
      } catch (e) { }
    } else {
      setCurrentUser(null);
    }
  }, [isLoggedIn]);

  const userPermissions = useMemo(() => {
    if (!currentUser) return {};
    const saved = localStorage.getItem('sm_rbac_matrix');
    let matrix = {};
    if (saved) {
      try {
        matrix = JSON.parse(saved);
      } catch (e) { }
    } else {
      const mods = [
        'projects', 'csr_projects', 'capex', 'expenditure', 'major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec',
        'hr_management', 'young_professionals', 'consultants_appointment', 'attendance', 'gem_procurements', 'cpgrams',
        'cabinet_notes_mopsw', 'cabinet_notes_other', 'vip_reference', 'e_office', 'media_outreach', 'parliamentary_issues',
        'audit_paras', 'inter_state_ministerial', 'foreign_visit', 'cruise_shipping', 'flagged_ships', 'mom_meetings',
        'review_items', 'court_cases', 'acts_rules', 'bills_preconstitutions', 'miv_2030', 'amrit_kaal_vision_2047',
        'drishti_portal', 'gmis_imw_mou', 'knowledge_repository', 'form_builder', 'mopsw_tracker', 'senior_officer_meetings',
        'contact_us'
      ];
      matrix = {
        director: Object.fromEntries(mods.map(m => {
          const isRestricted = ['attendance', 'gem_procurements', 'cpgrams', 'cabinet_notes_mopsw', 'cabinet_notes_other', 'vip_reference', 'e_office', 'media_outreach', 'parliamentary_issues', 'audit_paras', 'inter_state_ministerial', 'foreign_visit', 'cruise_shipping', 'flagged_ships', 'mom_meetings', 'review_items', 'court_cases', 'acts_rules', 'bills_preconstitutions', 'form_builder'].includes(m);
          return [m, { visibility: !isRestricted, add: false, update: false, delete: false }];
        })),
        joint_secretary: Object.fromEntries(mods.map(m => {
          const isAllowed = m === 'projects' || m === 'csr_projects' || m === 'capex' || m === 'expenditure' || ['major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec'].includes(m);
          return [m, { visibility: isAllowed, add: false, update: false, delete: false }];
        })),
        secretary: Object.fromEntries(mods.map(m => {
          const isAllowed = m === 'projects' || m === 'csr_projects' || m === 'capex' || m === 'expenditure' || ['major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec'].includes(m);
          return [m, { visibility: isAllowed, add: false, update: false, delete: false }];
        })),
        senior_officer: Object.fromEntries(mods.map(m => [m, { visibility: true, add: true, update: true, delete: false }])),
        nodal_officer: Object.fromEntries(mods.map(m => [m, { visibility: true, add: true, update: true, delete: false }])),
        wing_level: Object.fromEntries(mods.map(m => [m, { visibility: true, add: true, update: true, delete: false }])),
        under_secretary: Object.fromEntries(mods.map(m => [m, { visibility: true, add: true, update: false, delete: false }])),
        admin: Object.fromEntries(mods.map(m => [m, { visibility: true, add: true, update: true, delete: true }])),
        super_admin: Object.fromEntries(mods.map(m => [m, { visibility: true, add: true, update: true, delete: true }])),
        view_only_admin: Object.fromEntries(mods.map(m => [m, { visibility: true, add: false, update: false, delete: false }]))
      };
    }
    return matrix[currentUser.role] || {};
  }, [currentUser, permissions]);

  useEffect(() => {
    if (isLoggedIn) {
      let isMounted = true;

      // Start loading process deferred to avoid synchronous cascade render warnings
      Promise.resolve().then(() => {
        if (isMounted) {
          setIsTabLoading(true);
        }
      });

      const simulateDataFetch = async () => {
        try {
          // Instantly resolve to remove simulated delay
          await new Promise((resolve) => setTimeout(resolve, 0));
        } catch (error) {
          console.error("Telemetry fetch error:", error);
        } finally {
          // End loading process
          if (isMounted) {
            setIsTabLoading(false);
          }
        }
      };

      simulateDataFetch();

      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, isLoggedIn]);

  // Sync pathname changes from browser back/forward history buttons to activeTab state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path && path !== '/') {
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

  // Listen to global show-notification events (used for mock periodic bandwidth toasts)
  useEffect(() => {
    const handleShowNotification = (e) => {
      if (e.detail && e.detail.message) {
        triggerNotification(e.detail.message);
      }
    };
    window.addEventListener('show-notification', handleShowNotification);
    return () => window.removeEventListener('show-notification', handleShowNotification);
  }, []);

  const handleAddProject = (newProject) => {
    setProjects([newProject, ...projects]);
    triggerNotification(`Project ${newProject.projectId} successfully created.`);
  };

  const handleAddSubProject = (newSubProject) => {
    setProjects(prev => [newSubProject, ...prev]);
    triggerNotification(`Sub-project ${newSubProject.subProjectId} successfully created.`);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <>
        <LoginView onLogin={handleLoginSuccess} />
        <CompatibilityChecker />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative antialiased selection:bg-blue-100">

      {/* Toast Notification Alert Banner */}
      {notification && (
        <div className="fixed top-6 right-6 z-55 flex items-center justify-between space-x-4 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in max-w-sm">
          <div className="flex items-center space-x-2.5">
            <div className="p-1 bg-emerald-500 rounded-lg flex-shrink-0">
              <CheckCircle2 className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold font-display leading-tight">Notification</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{notification}</p>
            </div>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/10 active:scale-95 rounded-lg transition cursor-pointer text-slate-400 hover:text-white"
            title="Close"
          >
            <X className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Government Portal Header */}
      <Header
        onLogout={() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setIsLoggedIn(false);
        }}
        onProfileClick={() => setActiveTab('profile')}
        onAdminClick={() => setActiveTab('User Management')}
        currentUser={currentUser}
      />

      {/* Tab Navigation Menu */}
      <Tabs
        key={currentUser?.role + '_' + JSON.stringify(permissions)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectCount={projects.length}
        userRole={currentUser?.role}
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

        {isTabLoading ? (
          <div className="py-12 animate-fade-in">
            <Loader message={`Fetching telemetry and compiling active panels for ${activeTab}...`} fullPage={false} />
          </div>
        ) : (
          (() => {
            const tabToModule = {
              dashboard: 'projects',
              projects: 'projects',
              less5cr: 'projects',
              lumpsum: 'projects',
              dropRequests: 'projects',
              reports: 'projects',
              'Major Ports Dashboard': 'major_ports',
              'Major Ports Input Form': 'major_ports',
              'Major Ports Reports': 'major_ports',
              'E Office': 'e_office',
              'Attendance': 'attendance',
              'CPGRAMS': 'cpgrams',
              'Cabinet Notes - MoPSW': 'cabinet_notes_mopsw',
              'Cabinet Notes - Other Ministries': 'cabinet_notes_other',
              'Parliamentary Issue': 'parliamentary_issues',
              'HR Dashboard': 'hr_management',
              'Employee Database': 'hr_management',
              'List of Abolished Ports': 'hr_management',
              'List of Abolished Posts': 'hr_management',
              'Contractual Employment': 'hr_management',
              'Training Details': 'hr_management',
              'HR Reports': 'hr_management',
              'YP Input Form': 'young_professionals',
              'YP Reports': 'young_professionals',
              'Consultant Input Form': 'consultants_appointment',
              'Consultant Reports': 'consultants_appointment',
              'Acts & Rules': 'acts_rules',
              'Bills/PreConstitutions Act': 'bills_preconstitutions',
              'Media Outreach': 'media_outreach',
              'Audit Paras': 'audit_paras',
              'VIP Reference': 'vip_reference',
              'User Management': 'super_admin'
            };
            const moduleKey = tabToModule[activeTab];
            if (moduleKey && userPermissions[moduleKey]?.visibility === false) {
              return (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in bg-white rounded-2xl border border-slate-200 shadow-sm mt-6 max-w-3xl mx-auto">
                  <div className="h-16 w-16 bg-red-50 text-red-650 rounded-2xl flex items-center justify-center mb-4 border border-red-100 shadow-inner animate-pulse">
                    <Shield className="h-7 w-7 text-red-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 font-display">Access Restricted</h3>
                  <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                    Your role (<strong className="text-blue-700">{currentUser?.name} - {currentUser?.roleLabel}</strong>) does not have permission to view the <strong className="text-red-700">{activeTab}</strong> module. Please contact the administrator if you believe this is an error.
                  </p>
                  <button
                    onClick={() => setActiveTab('landing')}
                    className="mt-6 px-4 py-2 bg-blue-650 hover:bg-blue-705 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
                  >
                    Go to Home
                  </button>
                </div>
              );
            }
            return null;
          })() || (
            <>
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

              {activeTab === 'projects' && (
                <Projects
                  projects={projects}
                  onAddProject={handleAddProject}
                  onAddSubProject={handleAddSubProject}
                  triggerNotification={triggerNotification}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
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

              {activeTab === 'User Management' && currentUser?.role === 'super_admin' && (
                <UserManagementView triggerNotification={triggerNotification} onPermissionsChange={(newPerms) => setPermissions(newPerms)} />
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

              {activeTab === 'Contact Us' && (
                <ContactUsView />
              )}

              {/* Placeholder / Empty State for other inactive government menu views */}
              {!['dashboard', 'projects', 'less5cr', 'lumpsum', 'dropRequests', 'reports', 'landing', 'Major Ports Dashboard', 'Major Ports Input Form', 'Major Ports Reports', 'E Office', 'Attendance', 'CPGRAMS', 'HR Dashboard', 'Employee Database', 'List of Abolished Ports', 'List of Abolished Posts', 'Contractual Employment', 'Training Details', 'HR Reports', 'profile', 'Cabinet Notes - MoPSW', 'Cabinet Notes - Other Ministries', 'Parliamentary Issue', 'YP Input Form', 'YP Reports', 'Consultant Input Form', 'Consultant Reports', 'User Management', 'Acts & Rules', 'Bills/PreConstitutions Act', 'Media Outreach', 'Audit Paras', 'VIP Reference', 'Contact Us'].includes(activeTab) && (
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
            </>
          )
        )}
      </main>

      {/* Background Compatibility and Network Speed Checker Alert Overlay */}
      {/* <CompatibilityChecker /> */}

      {/* Government Footer */}
      <Footer />
    </div>
  );
}