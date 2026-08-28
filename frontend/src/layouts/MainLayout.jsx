import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Tabs from '../components/Tabs';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import NetworkCheckView from '../components/NetworkCheckView';
import RestrictedAccess from '../components/RestrictedAccess';
import { 
  canAccessTab, 
  normalizeTab, 
  usesOwnPageHeader, 
  TAB_USER_MODULE_PERMISSION 
} from '../utils/moduleAccess';
import { Home } from 'lucide-react';

export const ROUTE_MAP = {
  'landing': '',
  'profile': 'profile',

  'projects-dashboard': 'projects/project/project-dashboard',
  'projects-list': 'projects/project/project-list',
  'projects-less5cr': 'projects/project/projects-less-than-5-cr',
  'projects-lumpsum': 'projects/project/lumpsum-iwai',
  'projects-dropRequests': 'projects/project/view-drop-request',
  'projects-reports': 'projects/project/reports',

  // CSR Projects nested routes
  'CSR Dashboard': 'projects/csr-projects/dashboard',
  'CSR Fund Details': 'projects/csr-projects/fund-details',
  'CSR Project List': 'projects/csr-projects/project-list',
  'CSR Input Form': 'projects/csr-projects/input-form',
  'CSR Reports': 'projects/csr-projects/reports',
  'CSR Projects': 'projects/csr-projects/dashboard',

  // KPI nested routes
  'Major Ports Dashboard': 'kpi/major-ports/major-ports-dashboard',
  'Major Ports Input Form': 'kpi/major-ports/major-ports-input-form',
  'Major Ports Reports': 'kpi/major-ports/major-ports-reports',

  // Governance nested routes
  'E Office': 'governance/e-office',
  'Attendance': 'governance/attendance',
  'CPGRAMS': 'governance/cpgrams',
  'Cabinet Notes - MoPSW': 'governance/cabinet-notes/data-list',
  'Cabinet Notes-MoPSW': 'governance/cabinet-notes/data-list',
  'Cabinet Notes - Other Ministries': 'governance/cabinet-notes-other-ministry/data-list',
  'Cabinet Notes-Other Ministry': 'governance/cabinet-notes-other-ministry/data-list',
  'VIP Reference': 'governance/vip-reference/data-list',
  'VIP Reference - Data List': 'governance/vip-reference/data-list',
  'VIP Reference - Input Form': 'governance/vip-reference/input-form',
  'VIP Reference - Reports': 'governance/vip-reference/reports',
  'Media Outreach': 'governance/media-outreach/broadcast',
  'Parliamentary Issue': 'governance/parliamentary-issues/data-list',
  'Parliamentary Issues': 'governance/parliamentary-issues/data-list',
  'Audit Paras': 'governance/audit-paras/input-form',
  'Audit Para': 'governance/audit-paras/input-form',
  'GEM Procurements': 'governance/gem-procurements',

  // Legal nested routes
  'Courtcases': 'legal/courtcases',
  'Bills/PreConstitutions Act': 'legal/acts-rules',
  'Acts & Rules': 'legal/acts-rules',

  // Strategies nested routes
  'MIV 2030': 'strategies/miv-2030/data-list',
  'MIV Dashboard': 'strategies/miv-2030/dashboard',
  'MIV Data List': 'strategies/miv-2030/data-list',
  'MIV Input Form': 'strategies/miv-2030/input-form',
  'MIV Meetings': 'strategies/miv-2030/meetings',
  'MIV Org Report': 'strategies/miv-2030/org-report',
  'MIV Theme Report': 'strategies/miv-2030/theme-report',
  'Organisation Report': 'strategies/miv-2030/org-report',
  'Theme Report': 'strategies/miv-2030/theme-report',
  'GMIS & IMW MoUs': 'strategies/gmis-mou/dashboard',
  'GMIS-MoU': 'strategies/gmis-mou/dashboard',
  'GMIS Dashboard': 'strategies/gmis-mou/dashboard',
  'GMIS Data List': 'strategies/gmis-mou/data-list',
  'GMIS Input Form': 'strategies/gmis-mou/input-form',
  'GMIS Reports': 'strategies/gmis-mou/reports',
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
  'Contact Us': 'contact',

  // SUPERADMIN
  [TAB_USER_MODULE_PERMISSION]: 'admin/user-module-permission',
  'admin/user-list': 'admin/user-list',

  // HR nested routes
  'HR Dashboard': 'hr/hr-management/hr-dashboard',
  'Employee Database': 'hr/hr-management/employee-database',
  'List of Abolished Ports': 'hr/hr-management/abolished-ports',
  'List of Abolished Posts': 'hr/hr-management/abolished-posts',
  'Contractual Employment': 'hr/hr-management/contractual-employment',
  'Training Details': 'hr/hr-management/training-details',
  'HR Reports': 'hr/hr-management/hr-reports',

  // Young Professionals routes
  'Young Professionals': 'hr/young-professionals/list-view',
  'YP Data List': 'hr/young-professionals/list-view',
  'YP Input Form': 'hr/young-professionals/input-form',
  'YP Report': 'hr/young-professionals/report',
  'YP Reports': 'hr/young-professionals/report',
  'Data List': 'hr/young-professionals/list-view',
  'Input Form': 'hr/young-professionals/input-form',
  'Report': 'hr/young-professionals/report',

  // Consultant routes
  'Consultant Appointment': 'hr/consultant-appointment/data-list',
  'Consultant Input Form': 'hr/consultant-appointment/input-form',
  'Consultant Data List': 'hr/consultant-appointment/data-list',
  'Consultant Reports': 'hr/consultant-appointment/reports',

  // CSR Projects routes
  'CSR Project': 'projects/csr-projects/dashboard',
  'CSR Projects': 'projects/csr-projects/dashboard',
  'CSR Dashboard': 'projects/csr-projects/dashboard',
  'CSR Fund Details': 'projects/csr-projects/fund-details',
  'CSR Project List': 'projects/csr-projects/project-list',
  'CSR Input Form': 'projects/csr-projects/input-form',
  'CSR Reports': 'projects/csr-projects/reports',

  // Finance / Capex routes
  'Capex': 'finance/capex/dashboard',
  'Capex Dashboard': 'finance/capex/dashboard',
  'Capex Datalist': 'finance/capex/data-list',
  'Capex Input Form': 'finance/capex/input-form',
  'Estimate Values': 'finance/capex/estimate-values',
  'Capex Reports': 'finance/capex/reports',
};

export const getTabFromSlug = (slug) => {
  const cleanSlug = decodeURIComponent(slug).replace(/^\//, '').replace(/\/$/, '');
  if (!cleanSlug || cleanSlug === 'landing') return 'landing';
  
  if (cleanSlug.startsWith('projects/csr-projects') || cleanSlug.startsWith('projects/csr-project')) return 'CSR Projects';
  if (cleanSlug.startsWith('hr/young-professionals')) return 'YP Data List';
  if (cleanSlug.startsWith('hr/consultant-appointment')) return 'Consultant Data List';
  if (cleanSlug.startsWith('strategies/gmis-mou')) return 'GMIS & IMW MoUs';
  if (cleanSlug.startsWith('strategies/miv-2030')) return 'MIV 2030';
  if (cleanSlug.startsWith('finance/capex')) return 'Capex';
  if (cleanSlug.startsWith('governance/vip-reference')) return 'VIP Reference';
  if (cleanSlug.startsWith('governance/audit-paras')) return 'Audit Paras';
  if (cleanSlug.startsWith('governance/cabinet-notes-other-ministry')) return 'Cabinet Notes - Other Ministries';
  if (cleanSlug.startsWith('governance/cabinet-notes')) return 'Cabinet Notes - MoPSW';
  if (cleanSlug.startsWith('governance/parliamentary-issue')) return 'Parliamentary Issues';
  if (cleanSlug.startsWith('governance/media-outreach')) return 'Media Outreach';

  // Exact match
  const entry = Object.entries(ROUTE_MAP).find(([, value]) => value === cleanSlug);
  if (entry) return normalizeTab(entry[0]);

  // Prefix match for nested child routes
  const prefixEntry = Object.entries(ROUTE_MAP).find(([, value]) => value && cleanSlug.startsWith(value));
  if (prefixEntry) return normalizeTab(prefixEntry[0]);

  return normalizeTab(cleanSlug);
};

const getBreadcrumbs = (tab) => {
  if (tab === 'landing') return ['Home'];
  if (tab === 'Ports Reports') return ['KPI - Major Ports - (Output Reports)'];

  if (tab === 'projects-dashboard') return ['Home', 'Projects', 'Project', 'Project Dashboard'];
  if (tab === 'projects-list') return ['Home', 'Projects', 'Project', 'Project List'];
  if (tab === 'projects-less5cr') return ['Home', 'Projects', 'Project', 'Projects Less Than 5 Cr'];
  if (tab === 'projects-lumpsum') return ['Home', 'Projects', 'Project', 'Lumpsum - IWAI'];
  if (tab === 'projects-dropRequests') return ['Home', 'Projects', 'Project', 'View Drop Request'];
  if (tab === 'projects-reports') return ['Home', 'Projects', 'Project', 'Reports'];

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
    'Young Professionals': ['HR & Institutional', 'Young Professionals'],
    'YP Data List': ['HR & Institutional', 'Young Professionals'],
    'YP Input Form': ['HR & Institutional', 'Young Professionals'],
    'YP Report': ['HR & Institutional', 'Young Professionals'],
    'Data List': ['HR & Institutional', 'Young Professionals'],
    'Input Form': ['HR & Institutional', 'Young Professionals'],
    'Report': ['HR & Institutional', 'Young Professionals'],
    'Consultant Appointment': ['HR & Institutional', 'Consultant Appointment'],
    'Consultant Input Form': ['HR & Institutional', 'Consultant Appointment'],
    'Consultant Data List': ['HR & Institutional', 'Consultant Appointment'],
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
  if (tab === 'Media Outreach') return ['Home', 'Media Outreach - (Input Form)'];
  if (governanceItems.includes(tab)) return ['Home', 'Governance', tab];

  const legalItems = ['Courtcases', 'Bills/PreConstitutions Act', 'Acts & Rules'];
  if (legalItems.includes(tab)) return ['Home', 'Legal', tab];

  const mivItems = ['MIV 2030', 'MIV Dashboard', 'MIV Data List', 'MIV Input Form', 'MIV Meetings', 'MIV Org Report', 'MIV Theme Report', 'Organisation Report', 'Theme Report'];
  if (mivItems.includes(tab)) return ['Home', 'Long Term Strategies', 'MIV 2030', tab === 'MIV 2030' ? 'Dashboard' : tab];

  const gmisItems = ['GMIS & IMW MoUs', 'GMIS-MoU', 'GMIS Dashboard', 'GMIS Data List', 'GMIS Input Form', 'GMIS Reports'];
  if (gmisItems.includes(tab)) return ['Home', 'Long Term Strategies', 'GMIS & IMW MoUs', tab === 'GMIS & IMW MoUs' ? 'Dashboard' : tab];

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

export default function MainLayout({
  onLogout,
  toasts = [],
  removeToast,
  showNetworkCheck,
  isManualNetworkCheck,
  setShowNetworkCheck,
  setIsLoggedIn,
  projectCount = 0
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // Active tab is derived directly from the current URL path
  const activeTab = useMemo(() => {
    const cleanSlug = location.pathname.replace(/^\//, '');
    return getTabFromSlug(cleanSlug);
  }, [location.pathname]);

  const goToTab = (tab) => {
    const norm = normalizeTab(tab);
    const slug = ROUTE_MAP[norm] !== undefined ? ROUTE_MAP[norm] : norm;
    const targetPath = (slug === 'landing' || slug === '') ? '/' : `/${slug}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const tabAllowed = canAccessTab(activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative antialiased selection:bg-blue-100">
      {showNetworkCheck && (
        <NetworkCheckView
          isManual={isManualNetworkCheck}
          onContinue={() => setShowNetworkCheck(false)}
          onCancel={() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setIsLoggedIn(false);
            setShowNetworkCheck(false);
          }}
        />
      )}

      {/* Toast Notification Stack */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Government Portal Header */}
      <Header
        onLogout={onLogout}
        onProfileClick={() => goToTab('profile')}
        onUserManagementClick={() => goToTab(TAB_USER_MODULE_PERMISSION)}
      />

      {/* Tab Navigation Menu */}
      <Tabs
        activeTab={activeTab}
        setActiveTab={goToTab}
        projectCount={projectCount}
      />

      {/* Main Content Viewport */}
      <main className="flex-grow w-full max-w-full px-4 sm:px-6 lg:px-8 pb-12">
        {!usesOwnPageHeader(activeTab) && tabAllowed && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold px-2 mb-6 mt-3 animate-fade-in select-none bg-white py-2.5 px-4 rounded-xl border border-slate-200 shadow-sm w-fit">
            <Home className="h-3.5 w-3.5 text-slate-500 cursor-pointer hover:text-blue-700 transition-colors" onClick={() => goToTab('landing')} />
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

        {!tabAllowed ? (
          <RestrictedAccess
            moduleName={activeTab}
            onGoHome={() => goToTab('landing')}
          />
        ) : (
          /* The Outlet is where the matched child Route component renders */
          <Outlet />
        )}
      </main>

      {/* Government Portal Footer */}
      <Footer />
    </div>
  );
}
