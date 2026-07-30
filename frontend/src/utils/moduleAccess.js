import { getSessionClaims, isSuperAdmin } from './authSession';

const PUBLIC_TABS = new Set([
  'landing',
  'profile',
  'Ministry Contacts',
  'Helpdesk Support',
]);

// Menu / tab label → module_code
const TAB_TO_MODULE = {
  // Projects
  dashboard: 'PROJECTS',
  projects: 'PROJECTS',
  less5cr: 'PROJECTS',
  lumpsum: 'PROJECTS',
  dropRequests: 'PROJECTS',
  reports: 'PROJECTS',
  'Project Dashboard': 'PROJECTS',
  'Project List': 'PROJECTS',
  'Projects Less Than 5 Cr': 'PROJECTS',
  'Lumpsum - IWAI': 'PROJECTS',
  'View Drop Request': 'PROJECTS',
  Reports: 'PROJECTS',

  'CSR Dashboard': 'CSR_PROJECTS',
  'CSR Fund Details': 'CSR_PROJECTS',
  'CSR Project List': 'CSR_PROJECTS',

  'Estimate Values': 'CAPEX',
  'Capex Reports': 'CAPEX',
  'Input Form - Estimate Values': 'EXPENDITURE',
  'Expenditure Reports': 'EXPENDITURE',
  Expenditure: 'EXPENDITURE',

  // KPI
  'Major Ports Dashboard': 'KPI_MAJOR_PORTS',
  'Major Ports Input Form': 'KPI_MAJOR_PORTS',
  'Major Ports Reports': 'KPI_MAJOR_PORTS',
  'Ports Reports': 'KPI_MAJOR_PORTS',
  'MMD Master': 'KPI_DGS',
  'DSG Input Form': 'KPI_DGS',
  'DSG Reports': 'KPI_DGS',
  'IWAI Master': 'KPI_IWAI',
  'National Waterways': 'KPI_IWAI',
  'Terminal/Jetties': 'KPI_IWAI',
  'Digital Portals': 'KPI_IWAI',
  'DGLL Input Form': 'KPI_DGLL',
  'DGLL Reports': 'KPI_DGLL',
  'CSL Input Form': 'KPI_CSL',
  'CSL Reports': 'KPI_CSL',
  'IMU Input Form': 'KPI_IMU',
  'IMU Reports': 'KPI_IMU',
  'SCI Input Form': 'KPI_SCI',
  'SCI Reports': 'KPI_SCI',
  'CMEC Input Form': 'KPI_CMEC',
  'CMEC Reports': 'KPI_CMEC',

  // Governance
  Attendance: 'ATTENDANCE',
  CPGRAMS: 'CPGRAMS',
  'Cabinet Notes - Other Ministries': 'CABINET_NOTES_OTHER_MINISTRIES',
  'Cabinet Notes-Other Ministry': 'CABINET_NOTES_OTHER_MINISTRIES',
  'E Office': 'E_OFFICE',
  'Parliamentary Issue': 'PARLIAMENTARY_ISSUES',
  'Parliamentary Issues': 'PARLIAMENTARY_ISSUES',
  'GEM Procurements': 'GEM_PROCUREMENT',
  'Cabinet Notes - MoPSW': 'CABINET_NOTES_MOPSW',
  'VIP Reference': 'VIP_REFERENCE',
  'Media Outreach': 'MEDIA_OUTREACH',
  'Audit Paras': 'AUDIT_PARAS',
  'Inter State & Inter Ministerial': 'INTERSTATE_INTERMINISTERIAL',
  'Foreign Visit': 'FOREIGN_VISIT',
  'Cruise Shipping': 'CRUISE_SHIPPING',
  'Flagged Ships / FOB Basis': 'FLAGSHIP_FOB_BASIS',
  'MOM Of PSW Meetings': 'MOM_MINISTRY_MEETINGS',
  'Review Items': 'REVIEW_ITEMS',

  // HR
  'HR Dashboard': 'HR_MANAGEMENT',
  'Employee Database': 'HR_MANAGEMENT',
  'List of Abolished Ports': 'HR_MANAGEMENT',
  'List of Abolished Posts': 'HR_MANAGEMENT',
  'Contractual Employment': 'HR_MANAGEMENT',
  'Training Details': 'HR_MANAGEMENT',
  'HR Reports': 'HR_MANAGEMENT',
  'Young Professionals': 'YOUNG_PROFESSIONAL',
  'YP Data List': 'YOUNG_PROFESSIONAL',
  'YP Input Form': 'YOUNG_PROFESSIONAL',
  'YP Report': 'YOUNG_PROFESSIONAL',
  'YP Reports': 'YOUNG_PROFESSIONAL',
  'Data List': 'YOUNG_PROFESSIONAL',
  'Input Form': 'YOUNG_PROFESSIONAL',
  Report: 'YOUNG_PROFESSIONAL',
  'Consultant Input Form': 'CONSULTANT_APPOINTMENT',
  'Consultant Data List': 'CONSULTANT_APPOINTMENT',
  'Consultant Reports': 'CONSULTANT_APPOINTMENT',

  // Legal / strategies / knowledge / tools
  Courtcases: 'COURT_CASES',
  'Bills/PreConstitutions Act': 'BILLS_PRE_CONSTITUTION',
  'Acts & Rules': 'ACTS_AND_RULES',
  'Vision 2047': 'AKV_2047',
  'Maritime India Summit': 'MIV_2030',
  'Blue Economy Policy': 'AKV_2047',
  'Research Papers': 'KNOWLEDGE_REPOSITORY',
  'Policy Documents': 'KNOWLEDGE_REPOSITORY',
  Guidelines: 'KNOWLEDGE_REPOSITORY',
  'Create Dynamic Form': 'FORM_BUILDER',
  'View Submissions': 'FORM_BUILDER',
  'Project Milestones': 'MOPSW_TRACKER',
  'Delay Analysis': 'MOPSW_TRACKER',
  'Meeting Schedule': 'SENIOR_OFFICE_MEETINGS',
  'Minutes of Meeting': 'SENIOR_OFFICE_MEETINGS',
  'Action Taken Report': 'SENIOR_OFFICE_MEETINGS',
};

export function resolveTabKey(label) {
  if (!label) return label;
  const norm = String(label).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (norm === 'projectdashboard') return 'dashboard';
  if (norm === 'projectlist') return 'projects';
  if (norm === 'projectslessthan5cr') return 'less5cr';
  if (norm === 'lumpsumiwai') return 'lumpsum';
  if (norm === 'viewdroprequest') return 'dropRequests';
  if (norm === 'reports') return 'reports';
  return label;
}

export function getAllowedModuleCodes() {
  if (isSuperAdmin()) return null; // null = all modules
  const claims = getSessionClaims();
  const codes = claims?.allowedModuleCodes;
  if (!Array.isArray(codes)) return [];
  return codes.map((c) => String(c).toUpperCase());
}

export function hasModuleAccess(moduleCode) {
  if (isSuperAdmin()) return true;
  if (!moduleCode) return false;
  const allowed = getAllowedModuleCodes();
  if (allowed === null) return true;
  return allowed.includes(String(moduleCode).toUpperCase());
}

export function canAccessTab(tab) {
  if (!tab) return false;
  if (isSuperAdmin()) return true;
  if (tab === 'User Matrix' || tab === 'User Management') return false;
  if (PUBLIC_TABS.has(tab)) return true;

  const key = resolveTabKey(tab);
  if (PUBLIC_TABS.has(key)) return true;

  const code = TAB_TO_MODULE[key] || TAB_TO_MODULE[tab];
  if (!code) return false;
  return hasModuleAccess(code);
}

export function filterMenuByAccess(menuData) {
  if (isSuperAdmin()) return menuData;

  return menuData
    .map((menu) => {
      if (menu.id === 'admin') return null;
      if (menu.id === 'contact') return menu;

      if (menu.subcategories) {
        const subcategories = menu.subcategories
          .map((sub) => ({
            ...sub,
            items: (sub.items || []).filter((item) =>
              canAccessTab(item.tab || item.targetTab || item.label)
            ),
          }))
          .filter((sub) => sub.items.length > 0);
        if (subcategories.length === 0) return null;
        return { ...menu, subcategories };
      }

      if (menu.items) {
        const items = menu.items.filter((item) =>
          canAccessTab(item.tab || item.targetTab || item.label)
        );
        if (items.length === 0) return null;
        return { ...menu, items };
      }

      return menu;
    })
    .filter(Boolean);
}
