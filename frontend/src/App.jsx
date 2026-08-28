import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import MainLayout, { ROUTE_MAP, getTabFromSlug } from './layouts/MainLayout';
import LoginView from './modules/Login/Login';
import Loader from './components/Loader';
import { Activity, Sparkles } from 'lucide-react';
import { TAB_USER_MODULE_PERMISSION, TAB_USER_LIST, normalizeTab } from './utils/moduleAccess';

// Lazy-loaded feature modules for code splitting and instant initial page load
const LandingView = lazy(() => import('./modules/Landing/Landing'));
const DashboardView = lazy(() => import('./modules/Dashboard/Dashboard'));
const Projects = lazy(() => import('./modules/Projects/Projects'));
const CSRProjectsView = lazy(() => import('./modules/CSRProjects/CSRProjects'));
const GMISMOUView = lazy(() => import('./modules/GMISMOU/GMISMOU'));
const MIV2030View = lazy(() => import('./modules/MIV2030/MIV2030'));
const CapexView = lazy(() => import('./modules/Capex/Capex'));
const EOfficeView = lazy(() => import('./modules/EOffice/EOffice'));
const AttendanceView = lazy(() => import('./modules/Attendance/Attendance'));
const CPGRAMSView = lazy(() => import('./modules/CPGRAMS/CPGRAMS'));
const CabinetNotes = lazy(() => import('./modules/CabinetNotesMOPSW/CabinetNotesMOPSW'));
const CabinetNotesOther = lazy(() => import('./modules/CabinetNotesOther/CabinetNotesOther'));
const ParliamentaryIssues = lazy(() => import('./modules/ParliamentaryIssues/ParliamentaryIssues'));
const HRDashboardView = lazy(() => import('./modules/HR/HR'));
const YoungProfessionalsView = lazy(() => import('./modules/YoungProfessionals/YoungProfessionals'));
const ConsultantAppointmentView = lazy(() => import('./modules/ConsultantAppointment/ConsultantAppointment'));
const ProfileView = lazy(() => import('./modules/Profile/Profile'));
const AuditParaView = lazy(() => import('./modules/AuditPara/AuditPara'));
const VIPReferenceView = lazy(() => import('./modules/VIPReference/VIPReference'));
const MediaOutreachView = lazy(() => import('./modules/MediaOutreach/MediaOutreach'));
const BillsPreConstitutionsView = lazy(() => import('./modules/BillsPreConstitutions/BillsPreConstitutions'));
const ActsAndRulesView = lazy(() => import('./modules/ActsAndRules/ActsAndRules'));
const GEMProcurementView = lazy(() => import('./modules/GEMProcurement/GEMProcurement'));
const UserMatrix = lazy(() => import('./modules/UserManagement/UserMatrix'));
const ContactUs = lazy(() => import('./modules/Contact/Contact'));

// Major Ports Components
import { PortsDashboardView, PortsInputFormView, PortsReportsView } from './modules/MajorPorts/MajorPorts';

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
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [toasts, setToasts] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('accessToken');
  });
  const [showNetworkCheck, setShowNetworkCheck] = useState(false);
  const [isManualNetworkCheck, setIsManualNetworkCheck] = useState(false);
  const [eOfficeKpi, setEOfficeKpi] = useState('file-pendency');

  const triggerNotification = (message, type = 'success', title = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4300);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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
    setIsManualNetworkCheck(false);
    setShowNetworkCheck(true);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLoginSuccess} />;
  }

  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader message="Loading Sagarmanthan portal telemetry..." fullPage={true} />
        </div>
      }>
        <Routes>
          {/* Main Layout Shell */}
          <Route 
            path="/" 
            element={
              <MainLayout
                onLogout={handleLogout}
                toasts={toasts}
                removeToast={removeToast}
                showNetworkCheck={showNetworkCheck}
                isManualNetworkCheck={isManualNetworkCheck}
                setShowNetworkCheck={setShowNetworkCheck}
                setIsLoggedIn={setIsLoggedIn}
                projectCount={projects.length}
              />
            }
          >
            {/* Landing Route */}
            <Route index element={
              <LandingView 
                onNavigate={(tab, subKpi) => {
                  if (subKpi) setEOfficeKpi(subKpi);
                  const norm = normalizeTab(tab);
                  const slug = ROUTE_MAP[norm] !== undefined ? ROUTE_MAP[norm] : norm;
                  navigate(slug === 'landing' || slug === '' ? '/' : `/${slug}`);
                }} 
              />
            } />
            <Route path="landing" element={<Navigate to="/" replace />} />

            {/* Profile */}
            <Route path="profile" element={<ProfileView triggerNotification={triggerNotification} />} />

            {/* Projects Routes */}
            <Route path="projects/project/project-dashboard" element={<DashboardView projects={projects} />} />
            <Route path="projects/project/project-list" element={
              <Projects
                projects={projects}
                onAddProject={handleAddProject}
                onAddSubProject={handleAddSubProject}
                triggerNotification={triggerNotification}
              />
            } />
            <Route path="projects/project/projects-less-than-5-cr" element={
              <Projects
                projects={projects}
                onAddProject={handleAddProject}
                onAddSubProject={handleAddSubProject}
                triggerNotification={triggerNotification}
              />
            } />
            <Route path="projects/project/lumpsum-iwai" element={
              <Projects
                projects={projects}
                onAddProject={handleAddProject}
                onAddSubProject={handleAddSubProject}
                triggerNotification={triggerNotification}
              />
            } />
            <Route path="projects/project/view-drop-request" element={
              <Projects
                projects={projects}
                onAddProject={handleAddProject}
                onAddSubProject={handleAddSubProject}
                triggerNotification={triggerNotification}
              />
            } />
            <Route path="projects/project/reports" element={
              <Projects
                projects={projects}
                onAddProject={handleAddProject}
                onAddSubProject={handleAddSubProject}
                triggerNotification={triggerNotification}
              />
            } />

            {/* CSR Projects Routes */}
            <Route path="projects/csr-projects/*" element={<CSRProjectsView triggerNotification={triggerNotification} />} />
            <Route path="projects/csr-project/*" element={<Navigate to="/projects/csr-projects/dashboard" replace />} />

            {/* KPI - Major Ports */}
            <Route path="kpi/major-ports/major-ports-dashboard" element={<PortsDashboardView />} />
            <Route path="kpi/major-ports/major-ports-input-form" element={<PortsInputFormView />} />
            <Route path="kpi/major-ports/major-ports-reports" element={<PortsReportsView />} />

            {/* Long Term Strategies - GMIS MoU */}
            <Route path="strategies/gmis-mou/*" element={<GMISMOUView triggerNotification={triggerNotification} />} />

            {/* Long Term Strategies - MIV 2030 */}
            <Route path="strategies/miv-2030/*" element={<MIV2030View triggerNotification={triggerNotification} />} />

            {/* Finance - Capex */}
            <Route path="finance/capex/*" element={<CapexView />} />

            {/* Governance Routes */}
            <Route path="governance/e-office/*" element={<EOfficeView initialKpi={eOfficeKpi} />} />
            <Route path="governance/attendance/*" element={<AttendanceView />} />
            <Route path="governance/cpgrams" element={<CPGRAMSView />} />
            <Route path="governance/cabinet-notes/*" element={<CabinetNotes triggerNotification={triggerNotification} />} />
            <Route path="governance/cabinet-notes-other-ministry/*" element={<CabinetNotesOther />} />
            <Route path="governance/vip-reference/*" element={<VIPReferenceView triggerNotification={triggerNotification} />} />
            <Route path="governance/media-outreach/*" element={<MediaOutreachView triggerNotification={triggerNotification} />} />
            <Route path="governance/parliamentary-issue/*" element={<ParliamentaryIssues triggerNotification={triggerNotification} />} />
            <Route path="governance/parliamentary-issues/*" element={<ParliamentaryIssues triggerNotification={triggerNotification} />} />
            <Route path="governance/audit-paras/*" element={<AuditParaView triggerNotification={triggerNotification} />} />
            <Route path="governance/gem-procurements" element={<GEMProcurementView />} />

            {/* Legal Routes */}
            <Route path="legal/courtcases" element={<ActsAndRulesView />} />
            <Route path="legal/acts-rules" element={<BillsPreConstitutionsView triggerNotification={triggerNotification} />} />

            {/* HR Routes */}
            <Route path="hr/hr-management/*" element={<HRDashboardView />} />
            <Route path="hr/young-professionals/*" element={<YoungProfessionalsView triggerNotification={triggerNotification} />} />
            <Route path="hr/consultant-appointment/*" element={<ConsultantAppointmentView triggerNotification={triggerNotification} />} />

            {/* Admin Routes */}
            <Route path="admin/user-module-permission" element={<UserMatrix mode="permissions" triggerNotification={triggerNotification} />} />
            <Route path="admin/user-list" element={<UserMatrix mode="userlist" triggerNotification={triggerNotification} />} />

            {/* Contact */}
            <Route path="contact" element={<ContactUs />} />
            <Route path="contact/*" element={<ContactUs />} />

            {/* Fallback / In-Progress Module Placeholder */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in bg-white rounded-2xl border border-slate-200 shadow-sm mt-6 max-w-3xl mx-auto">
                <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 shadow-inner">
                  <Sparkles className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 font-display">SAGARMANTHAN - Active Panel</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                  This module is currently processing real-time telemetry from the Ministry databases.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-6 px-4 py-2 bg-blue-650 hover:bg-blue-705 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
                >
                  Back to Home
                </button>
              </div>
            } />
          </Route>
        </Routes>
      </Suspense>

      {/* Floating Network Check FAB */}
      <button
        onClick={() => {
          setIsManualNetworkCheck(true);
          setShowNetworkCheck(true);
        }}
        className="fixed bottom-6 right-6 z-40 p-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg cursor-pointer transition-all hover:shadow-blue-500/20 group flex items-center justify-center"
        title="Check Network Speed & Compatibility"
        aria-label="Network Check"
      >
        <Activity className="h-6 w-6" />
      </button>
    </>
  );
}