import React, { useState, useMemo } from 'react';
import sagarmanthanLogo from '../assets/sagarmanthan_logo.png';
import { isSuperAdmin } from '../utils/authSession';
import {
  canAccessTab,
  filterMenuByAccess,
  normalizeTab,
  TAB_USER_MODULE_PERMISSION,
  TAB_USER_LIST,
} from '../utils/moduleAccess';
import { canCreateModule } from '../utils/modulePermissions';
import {
  Home,
  Briefcase,
  Activity,
  Users,
  ShieldCheck,
  Scale,
  TrendingUp,
  BookMarked,
  FileEdit,
  LineChart,
  UserCheck,
  PhoneCall,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Heart,
  Coins,
  DollarSign,
  Anchor,
  Ship,
  Compass,
  Layers,
  GraduationCap,
  Award,
  FileText,
  LayoutDashboard,
  ListTodo,
  FolderSync,
  FilePieChart,
  UserX,
  UserPlus,
  BookOpen,
  FileCheck,
  ClipboardList,
  Network,
  Globe,
  Milestone,
  CheckCircle,
  HelpCircle,
  Gavel,
  Shield,
  Menu,
  X
} from 'lucide-react';

function getLoggedInUserRole() {
  try {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    if (!token) return 1;
    const base64Url = token.split(".")[1];
    if (!base64Url) return 1;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    return Number(decoded.roleId || decoded.role_id || decoded.role || 1);
  } catch (e) {
    return 1;
  }
}

export default function Tabs({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const isOrgUser = useMemo(() => {
    const roleId = getLoggedInUserRole();
    return roleId === 6 || roleId === 7;
  }, []);

  const canCreateParliamentary = canCreateModule('PARLIAMENTARY_ISSUES');
  const canCreateConsultant = canCreateModule('CONSULTANT_APPOINTMENT');

  const accessKey = (() => {
    try {
      const t = localStorage.getItem('accessToken');
      if (!t) return '';
      const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const codes = payload?.allowedModuleCodes;
      return `${payload?.roleCode || ''}|${Array.isArray(codes) ? codes.join(',') : ''}|piCreate:${canCreateParliamentary ? 1 : 0}|caCreate:${canCreateConsultant ? 1 : 0}`;
    } catch {
      return `piCreate:${canCreateParliamentary ? 1 : 0}|caCreate:${canCreateConsultant ? 1 : 0}`;
    }
  })();

  const m = (moduleCode, item) => ({ ...item, moduleCode });

  const MENU_DATA = useMemo(
    () =>
      filterMenuByAccess([
    {
      id: 'projects',
      label: 'Projects',
      icon: Briefcase,
      align: 'left-0',
      width: 'w-[750px]',
      subcategories: [
        {
          title: 'Project',
          icon: FolderOpen,
          items: [
            m('PROJECTS', { label: 'Project Dashboard', tab: 'projects-dashboard', icon: LayoutDashboard }),
            m('PROJECTS', { label: 'Project List', tab: 'projects-list', icon: ListTodo }),
            m('PROJECTS', { label: 'Projects Less Than 5 Cr', tab: 'projects-less5cr', icon: Coins }),
            m('PROJECTS', { label: 'Lumpsum - IWAI', tab: 'projects-lumpsum', icon: TrendingUp }),
            m('PROJECTS', { label: 'View Drop Request', tab: 'projects-dropRequests', icon: FolderSync }),
            m('PROJECTS', { label: 'Reports', tab: 'projects-reports', icon: FilePieChart }),
          ]
        },
        {
          title: 'CSR Project',
          icon: Heart,
          items: [
            m('CSR_PROJECTS', { label: 'CSR Dashboard', icon: LayoutDashboard }),
            m('CSR_PROJECTS', { label: 'CSR Fund Details', icon: Coins }),
            m('CSR_PROJECTS', { label: 'CSR Project List', icon: ListTodo }),
            m('CSR_PROJECTS', { label: 'Reports', tab: 'CSR Dashboard', icon: FilePieChart }),
          ]
        },
        {
          title: 'Capex',
          icon: Coins,
          items: isOrgUser
            ? [
                m('CAPEX', { label: 'Capex Dashboard', icon: LayoutDashboard, tab: 'Capex' }),
                m('CAPEX', { label: 'Capex Datalist', icon: ClipboardList, tab: 'Capex' }),
              ]
            : [
                m('CAPEX', { label: 'Capex Dashboard', icon: LayoutDashboard, tab: 'Capex' }),
                m('CAPEX', { label: 'Capex Datalist', icon: ClipboardList, tab: 'Capex' }),
                m('CAPEX', { label: 'Capex Reports', icon: FilePieChart, tab: 'Capex' }),
              ]
        },
        {
          title: 'Expenditure',
          icon: DollarSign,
          items: [
            m('EXPENDITURE', { label: 'Input Form - Estimate Values', icon: FileText }),
            m('EXPENDITURE', { label: 'Expenditure Reports', icon: FilePieChart }),
          ]
        }
      ]
    },
    {
      id: 'kpi',
      label: 'KPI',
      icon: Activity,
      align: 'left-0',
      width: 'w-[850px]',
      subcategories: [
        {
          title: 'Major Ports',
          icon: Anchor,
          items: [
            m('KPI_MAJOR_PORTS', { label: 'Major Ports Dashboard', icon: LayoutDashboard }),
            m('KPI_MAJOR_PORTS', { label: 'Major Ports Input Form', icon: FileEdit }),
            m('KPI_MAJOR_PORTS', { label: 'Major Ports Reports', icon: FilePieChart }),
          ]
        },
        {
          title: 'DSG',
          icon: ShieldCheck,
          items: [
            m('KPI_DGS', { label: 'MMD Master', icon: ClipboardList }),
            m('KPI_DGS', { label: 'DSG Input Form', icon: FileEdit }),
            m('KPI_DGS', { label: 'DSG Reports', icon: FilePieChart }),
          ]
        },
        {
          title: 'IWAI',
          icon: Ship,
          items: [
            m('KPI_IWAI', { label: 'IWAI Master', icon: ClipboardList }),
            m('KPI_IWAI', { label: 'National Waterways', icon: Milestone }),
            m('KPI_IWAI', { label: 'Terminal/Jetties', icon: Anchor }),
            m('KPI_IWAI', { label: 'Digital Portals', icon: Globe }),
          ]
        },
        {
          title: 'DGLL',
          icon: Compass,
          items: [
            m('KPI_DGLL', { label: 'DGLL Input Form', icon: FileEdit }),
            m('KPI_DGLL', { label: 'DGLL Reports', icon: FilePieChart }),
          ]
        },
        {
          title: 'CSL',
          icon: Layers,
          items: [
            m('KPI_CSL', { label: 'CSL Input Form', icon: FileEdit }),
            m('KPI_CSL', { label: 'CSL Reports', icon: FilePieChart }),
          ]
        },
        {
          title: 'IMU',
          icon: GraduationCap,
          items: [
            m('KPI_IMU', { label: 'IMU Input Form', icon: FileEdit }),
            m('KPI_IMU', { label: 'IMU Reports', icon: FilePieChart }),
          ]
        },
        {
          title: 'SCI',
          icon: Ship,
          items: [
            m('KPI_SCI', { label: 'SCI Input Form', icon: FileEdit }),
            m('KPI_SCI', { label: 'SCI Reports', icon: FilePieChart }),
          ]
        },
        {
          title: 'CMEC',
          icon: Layers,
          items: [
            m('KPI_CMEC', { label: 'CMEC Input Form', icon: FileEdit }),
            m('KPI_CMEC', { label: 'CMEC Reports', icon: FilePieChart }),
          ]
        }
      ]
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: ShieldCheck,
      align: 'left-0',
      width: 'w-[480px]',
      gridCols: 'grid-cols-2',
      items: [
        m('ATTENDANCE', { label: 'Attendance', icon: UserCheck }),
        m('CPGRAMS', { label: 'CPGRAMS', icon: PhoneCall }),
        m('CABINET_NOTES_OTHER_MINISTRIES', {
          label: 'Cabinet Notes - Other Ministries', icon: FileText,
          targetTab: 'Cabinet Notes - Other Ministries',
          subItems: [
            { label: 'Data List', tab: 'Cabinet Notes - Other Ministries', targetSubTab: 'Data List', icon: ClipboardList },
            { label: 'Input Form', tab: 'Cabinet Notes - Other Ministries', targetSubTab: 'Input Form', icon: FileEdit },
            { label: 'Reports', tab: 'Cabinet Notes - Other Ministries', targetSubTab: 'Reports', icon: FilePieChart },
          ]
        }),
        m('E_OFFICE', { label: 'E Office', icon: Briefcase }),
        m('PARLIAMENTARY_ISSUES', {
          label: 'Parliamentary Issue',
          icon: Scale,
          targetTab: 'Parliamentary Issue',
          subItems: [
            { label: 'Data List', tab: 'Parliamentary Issue', targetSubTab: 'Data List', icon: ClipboardList },
            ...(canCreateParliamentary
              ? [{ label: 'Input Form', tab: 'Parliamentary Issue', targetSubTab: 'Input Form', icon: FileEdit }]
              : []),
            { label: 'Reports', tab: 'Parliamentary Issue', targetSubTab: 'Reports', icon: FilePieChart },
          ],
        }),
        m('GEM_PROCUREMENT', { label: 'GEM Procurements', icon: Coins }),
        m('CABINET_NOTES_MOPSW', {
          label: 'Cabinet Notes - MoPSW', icon: FileText,
          targetTab: 'Cabinet Notes - MoPSW',
          subItems: [
            { label: 'Data List', tab: 'Cabinet Notes - MoPSW', targetSubTab: 'Data List', icon: ClipboardList },
            { label: 'Input Form', tab: 'Cabinet Notes - MoPSW', targetSubTab: 'Input Form', icon: FileEdit },
            { label: 'Reports', tab: 'Cabinet Notes - MoPSW', targetSubTab: 'Reports', icon: FilePieChart },
          ]
        }),
        m('VIP_REFERENCE', {
          label: 'VIP Reference', icon: Users,
          targetTab: 'VIP Reference',
          subItems: [
            { label: 'Data List', tab: 'VIP Reference', targetSubTab: 'Data List', icon: ClipboardList },
            { label: 'Input Form', tab: 'VIP Reference', targetSubTab: 'Input Form', icon: FileEdit },
            { label: 'Reports', tab: 'VIP Reference', targetSubTab: 'Reports', icon: FilePieChart },
          ]
        }),
        m('MEDIA_OUTREACH', {
          label: 'Media Outreach', icon: Globe,
          targetTab: 'Media Outreach',
          subItems: [
            { label: 'Broadcast / TV Media', tab: 'Media Outreach', mediaType: 'broadcast', icon: FileText },
            { label: 'Print Media', tab: 'Media Outreach', mediaType: 'print_media', icon: FileText },
            { label: 'Online', tab: 'Media Outreach', mediaType: 'online', icon: Globe },
            { label: 'Social Media', tab: 'Media Outreach', mediaType: 'social_media', icon: Network },
            { label: 'Input Form', tab: 'Media Outreach', mediaType: 'add_details', icon: FileEdit },
          ]
        }),
        m('AUDIT_PARAS', { label: 'Audit Paras', icon: CheckCircle }),
        m('INTERSTATE_INTERMINISTERIAL', { label: 'Inter State & Inter Ministerial', icon: Network }),
        m('FOREIGN_VISIT', { label: 'Foreign Visit', icon: Globe }),
        m('CRUISE_SHIPPING', { label: 'Cruise Shipping', icon: Ship }),
        m('FLAGSHIP_FOB_BASIS', { label: 'Flagged Ships / FOB Basis', icon: Shield }),
        m('MOM_MINISTRY_MEETINGS', { label: 'MOM Of PSW Meetings', icon: FileText }),
        m('REVIEW_ITEMS', { label: 'Review Items', icon: ClipboardList }),
      ]
    },
    {
      id: 'hr',
      label: 'HR & Institutional',
      icon: Users,
      align: 'left-0',
      width: 'w-[680px]',
      subcategories: [
        {
          title: 'HR Management',
          icon: Users,
          items: [
            m('HR_MANAGEMENT', { label: 'HR Dashboard', icon: LayoutDashboard }),
            m('HR_MANAGEMENT', { label: 'Employee Database', icon: ClipboardList }),
            m('HR_MANAGEMENT', { label: 'List of Abolished Ports', icon: UserX }),
            m('HR_MANAGEMENT', { label: 'List of Abolished Posts', icon: UserX }),
            m('HR_MANAGEMENT', { label: 'Contractual Employment', icon: UserPlus }),
            m('HR_MANAGEMENT', { label: 'Training Details', icon: BookOpen }),
            m('HR_MANAGEMENT', { label: 'HR Reports', icon: FilePieChart }),
          ]
        },
        {
          title: 'Young Professionals',
          icon: UserCheck,
          items: [
            m('YOUNG_PROFESSIONAL', { label: 'Input Form', tab: 'YP Input Form', icon: FileEdit }),
            m('YOUNG_PROFESSIONAL', { label: 'Data List', tab: 'YP Data List', icon: ClipboardList }),
            m('YOUNG_PROFESSIONAL', { label: 'Report', tab: 'YP Report', icon: FilePieChart }),
          ]
        },
        {
          title: 'Consultant Appointment',
          icon: UserPlus,
          items: [
            ...(canCreateConsultant ? [m('CONSULTANT_APPOINTMENT', { label: 'Consultant Input Form', icon: FileEdit })] : []),
            m('CONSULTANT_APPOINTMENT', { label: 'Consultant Data List', icon: ClipboardList }),
            m('CONSULTANT_APPOINTMENT', { label: 'Consultant Reports', icon: FilePieChart }),
          ]
        }
      ]
    },
    {
      id: 'legal',
      label: 'Legal',
      icon: Scale,
      align: 'left-0',
      width: 'w-[260px]',
      items: [
        m('COURT_CASES', { label: 'Courtcases', icon: Gavel }),
        m('BILLS_PRE_CONSTITUTION', {
          label: 'Bills/PreConstitutions Act', icon: BookMarked,
          targetTab: 'Bills/PreConstitutions Act',
          clickableHeader: true,
          subItems: [
            { label: 'Data List', tab: 'Bills/PreConstitutions Act', targetSubTab: 'Data List', icon: ClipboardList },
            { label: 'Input Form', tab: 'Bills/PreConstitutions Act', targetSubTab: 'Input Form', icon: FileEdit },
            { label: 'Reports', tab: 'Bills/PreConstitutions Act', targetSubTab: 'Reports', icon: FilePieChart },
          ]
        }),
        m('ACTS_AND_RULES', { label: 'Acts & Rules', icon: Scale }),
      ]
    },
    {
      id: 'vision',
      label: 'Strategies',
      icon: TrendingUp,
      align: 'left-0',
      width: 'w-[240px]',
      items: [
        m('AKV_2047', { label: 'Vision 2047', icon: Milestone }),
        m('MIV_2030', { label: 'Maritime India Summit', icon: Anchor }),
        m('AKV_2047', { label: 'Blue Economy Policy', icon: Globe }),
      ]
    },
    {
      id: 'knowledge',
      label: 'Knowledge',
      icon: BookMarked,
      align: 'left-0',
      width: 'w-[220px]',
      items: [
        m('KNOWLEDGE_REPOSITORY', { label: 'Research Papers', icon: FileText }),
        m('KNOWLEDGE_REPOSITORY', { label: 'Policy Documents', icon: BookOpen }),
        m('KNOWLEDGE_REPOSITORY', { label: 'Guidelines', icon: FileCheck }),
      ]
    },
    {
      id: 'formBuilder',
      label: 'Form Builder',
      icon: FileEdit,
      align: 'left-0',
      width: 'w-[220px]',
      items: [
        m('FORM_BUILDER', { label: 'Create Dynamic Form', icon: FileText }),
        m('FORM_BUILDER', { label: 'View Submissions', icon: ClipboardList }),
      ]
    },
    {
      id: 'tracker',
      label: 'Tracker',
      icon: LineChart,
      align: 'right-0',
      width: 'w-[220px]',
      items: [
        m('MOPSW_TRACKER', { label: 'Project Milestones', icon: Milestone }),
        m('MOPSW_TRACKER', { label: 'Delay Analysis', icon: LineChart }),
      ]
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: UserCheck,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        m('SENIOR_OFFICE_MEETINGS', { label: 'Meeting Schedule', icon: ClipboardList }),
        m('SENIOR_OFFICE_MEETINGS', { label: 'Minutes of Meeting', icon: FileText }),
        m('SENIOR_OFFICE_MEETINGS', { label: 'Action Taken Report', icon: CheckCircle }),
      ]
    },
    ...(isSuperAdmin()
      ? [
          {
            id: 'userModulePermission',
            label: TAB_USER_MODULE_PERMISSION,
            icon: ShieldCheck,
            directTab: TAB_USER_MODULE_PERMISSION,
          },
          {
            id: 'userList',
            label: TAB_USER_LIST,
            icon: UserCheck,
            directTab: TAB_USER_LIST,
          },
        ]
      : []),
    {
      id: 'contact',
      label: 'Contact Us',
      icon: PhoneCall,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        { label: 'Ministry Contacts', icon: Users },
        { label: 'Helpdesk Support', icon: HelpCircle },
      ],
    },
  ]),
    [accessKey, isOrgUser, canCreateParliamentary, canCreateConsultant]
  );

  const handleItemClick = (tabOrLabel) => {
    const tab = normalizeTab(tabOrLabel);
    if (!canAccessTab(tab)) return;
    setActiveTab(tab);
    setIsOpen(false);
  };

  const toggleExpand = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm select-none">
      
      {/* 1. Large Screens Navbar - Desktop Layout (hidden on screens below lg) */}
      <div className="hidden lg:block w-full px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-visible py-1.5 justify-between items-center">
          
          {/* Home Tab Button */}
          <button
            onClick={() => setActiveTab('landing')}
            className={`flex flex-col items-center space-y-0.5 py-1 px-1.5 text-center transition-all duration-205 cursor-pointer rounded-lg hover:bg-slate-50 min-w-16 ${
              activeTab === 'landing' ? 'text-blue-755 font-bold' : 'text-slate-655 font-semibold hover:text-slate-900'
            }`}
          >
            <Home className={`h-4.5 w-4.5 transition-colors ${
              activeTab === 'landing' ? 'text-blue-755' : 'text-slate-500'
            }`} />
            <span className="text-[9px] tracking-tight uppercase select-none whitespace-nowrap">Home</span>
          </button>

          {MENU_DATA.map((menu) => {
            const Icon = menu.icon;
            const hasDropdown = !menu.directTab && (menu.subcategories || menu.items);
            const isHrActiveTab = [
              'HR Dashboard', 'Employee Database', 'List of Abolished Ports', 'List of Abolished Posts',
              'Contractual Employment', 'Training Details', 'HR Reports'
            ].includes(activeTab);
            const isMainMenuActive =
              activeTab === menu.directTab ||
              activeTab.startsWith(menu.id) ||
              activeTab === menu.id ||
              (menu.id === 'hr' && isHrActiveTab);

            if (menu.directTab) {
              return (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => handleItemClick(menu.directTab)}
                  className={`flex flex-col items-center space-y-0.5 py-1 px-1.5 text-center transition-all duration-200 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 min-w-16 ${
                    isMainMenuActive ? 'text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-655 font-semibold hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 transition-colors ${isMainMenuActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="text-[9px] tracking-tight uppercase select-none whitespace-nowrap text-center leading-tight max-w-[72px]">
                    {menu.label}
                  </span>
                </button>
              );
            }

            return (
              <div key={menu.id} className="relative group flex-shrink-0">
                {/* Main Menu Button */}
                <button
                  className={`flex flex-col items-center space-y-0.5 py-1 px-1.5 text-center transition-all duration-200 cursor-pointer rounded-lg hover:bg-slate-50 min-w-16 ${
                    isMainMenuActive ? 'text-blue-700 font-bold' : 'text-slate-655 font-semibold hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                  <span className="text-[9px] tracking-tight uppercase flex items-center gap-0.5 select-none whitespace-nowrap">
                    {menu.label}
                    {hasDropdown && <ChevronDown className="h-2.5 w-2.5 opacity-60" />}
                  </span>
                </button>

                {/* Dropdown Menu Container */}
                {hasDropdown && (
                  <div className={`absolute top-full ${menu.align} ${menu.subcategories ? 'w-64 bg-slate-50 border-slate-200 text-slate-800' : menu.width + ' bg-white border-slate-200 text-slate-800'} border shadow-2xl rounded-b-2xl rounded-t-md p-3 transition-all duration-200 ease-out origin-top scale-y-95 opacity-0 invisible group-hover:scale-y-100 group-hover:opacity-100 group-hover:visible z-50`}>
                    
                    {/* Render Subcategories (Projects, KPI, HR) */}
                    {menu.subcategories && (
                      <div className="flex flex-col space-y-0.5 relative">
                        {menu.subcategories.map((sub, sIdx) => {
                          const SubIcon = sub.icon;
                          return (
                            <div key={sIdx} className="relative group/sub">
                              <button
                                onClick={() => {
                                  const first = sub.items[0];
                                  handleItemClick(first?.tab ?? first?.label);
                                }}
                                className="w-full text-left text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <div className="flex items-center space-x-2">
                                  {SubIcon && <SubIcon className="h-4 w-4 text-slate-400 group-hover/sub:text-blue-600 transition-colors" />}
                                  <span>{sub.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 group-hover/sub:text-blue-600 transition-colors">➔</span>
                              </button>

                              <div className={`absolute ${menu.id === 'hr' ? 'right-full -top-3 mr-3 origin-right' : 'left-full -top-3 ml-3 origin-left'} w-60 bg-white text-slate-800 border border-slate-200 shadow-2xl rounded-2xl p-4 transition-all duration-200 scale-95 opacity-0 invisible group-hover/sub:scale-100 group-hover/sub:opacity-100 group-hover/sub:visible z-50 space-y-3`}>
                                <h4 className="text-[11px] font-bold text-[#0f417a] uppercase tracking-widest block border-b border-slate-150 pb-2">
                                  {sub.title} Options
                                </h4>
                                <div className="flex flex-col space-y-1.5">
                                  {sub.items.map((item, iIdx) => {
                                    const ItemIcon = item.icon;
                                    if (item.subItems) {
                                      return (
                                        <div key={iIdx} className="relative group/ypfly">
                                          <button
                                            className="flex items-center justify-between w-full text-left text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all py-1.5 px-2 rounded border border-transparent hover:border-slate-100 cursor-pointer"
                                          >
                                            <div className="flex items-center space-x-2">
                                              {ItemIcon && <ItemIcon className="h-3.5 w-3.5 text-slate-400" />}
                                              <span>{item.label}</span>
                                            </div>
                                            <ChevronRight className="h-3 w-3 text-slate-350" />
                                          </button>
                                          {/* Sub-flyout for YP tabs */}
                                          <div className="absolute right-full top-0 mr-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-3 z-[70] transition-all duration-200 origin-right scale-95 opacity-0 invisible group-hover/ypfly:scale-100 group-hover/ypfly:opacity-100 group-hover/ypfly:visible space-y-1">
                                            <h5 className="text-[10px] font-extrabold text-[#0f417a] dark:text-blue-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-2">
                                              Young Professionals
                                            </h5>
                                            {item.subItems.map((sub2, s2Idx) => {
                                              const Sub2Icon = sub2.icon;
                                              return (
                                                <button
                                                  key={s2Idx}
                                                  onClick={() => {
                                                    handleItemClick(sub2.tab);
                                                  }}
                                                  className="flex items-center space-x-2 w-full text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all py-1.5 px-2.5 rounded-lg border border-transparent hover:border-slate-100 dark:hover:border-slate-700 cursor-pointer"
                                                >
                                                  {Sub2Icon && <Sub2Icon className="h-3.5 w-3.5 text-slate-400" />}
                                                  <span>{sub2.label}</span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <button
                                        key={iIdx}
                                        onClick={() => handleItemClick(item.tab ?? item.label)}
                                        className="flex items-center space-x-2 w-full text-left text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all py-1.5 px-2 rounded border border-transparent hover:border-slate-100 cursor-pointer"
                                      >
                                        {ItemIcon && <ItemIcon className="h-3.5 w-3.5 text-slate-400 group-hover/sub:text-blue-600 transition-colors" />}
                                        <span>{item.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Render Grid Items (Governance, Legal, vision, etc.) */}
                    {menu.items && (
                      <div className={`grid ${menu.gridCols || 'grid-cols-1'} gap-3`}>
                        {menu.items.map((item, iIdx) => {
                          const ItemIcon = item.icon;
                          if (item.subItems) {
                            return (
                              <div key={iIdx} className="relative group/flyout">
                                <button
                                  onClick={() => handleItemClick(item.tab ?? item.label)}
                                  className="flex items-center justify-between space-x-2 w-full text-left text-xs font-semibold text-slate-655 hover:text-blue-605 hover:bg-slate-55 transition-all px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-100 cursor-pointer group/flyoutbtn"
                                >
                                  <div className="flex items-center space-x-2">
                                    {ItemIcon && <ItemIcon className="h-4 w-4 text-slate-400" />}
                                    <span>{item.label}</span>
                                  </div>
                                  <ChevronRight className="h-3 w-3 text-slate-350 group-hover/flyoutbtn:text-blue-500 transition-colors" />
                                </button>
                                {/* Flyout sub-panel on hover */}
                                <div className="absolute left-full top-0 ml-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-3 z-[60] transition-all duration-200 origin-left scale-95 opacity-0 invisible group-hover/flyout:scale-100 group-hover/flyout:opacity-100 group-hover/flyout:visible space-y-1">
                                  {item.clickableHeader ? (
                                    <button
                                      onClick={() => { handleItemClick(item.tab ?? item.label); setIsOpen(false); }}
                                      className="w-full text-left text-[10px] font-extrabold text-[#0f417a] dark:text-blue-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-2 hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer"
                                    >
                                      {item.label}
                                    </button>
                                  ) : (
                                    <h5 className="text-[10px] font-extrabold text-[#0f417a] dark:text-blue-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-2">
                                      {item.label}
                                    </h5>
                                  )}
                                  {item.subItems.map((sub, sIdx) => {
                                    const SubIcon = sub.icon;
                                    return (
                                      <button
                                        key={sIdx}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const mainTab = sub.tab || item.targetTab || item.label;
                                          setActiveTab(mainTab);
                                          setIsOpen(false);
                                          if (sub.mediaType) {
                                            sessionStorage.setItem('mediaOutreachInitTab', sub.mediaType);
                                          }
                                          if (
                                            sub.targetSubTab &&
                                            mainTab === 'Parliamentary Issue'
                                          ) {
                                            sessionStorage.setItem(
                                              'parliamentaryIssueInitTab',
                                              sub.targetSubTab
                                            );
                                            window.dispatchEvent(
                                              new CustomEvent('parliamentary-issue-subtab', {
                                                detail: sub.targetSubTab,
                                              })
                                            );
                                          }
                                        }}
                                        className="flex items-center space-x-2 w-full text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all py-1.5 px-2.5 rounded-lg border border-transparent hover:border-slate-100 dark:hover:border-slate-700 cursor-pointer"
                                      >
                                        {SubIcon && <SubIcon className="h-3.5 w-3.5 text-slate-400" />}
                                        <span>{sub.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <button
                              key={iIdx}
                              onClick={() => handleItemClick(item.tab ?? item.label)}
                              className="flex items-center space-x-2 w-full text-left text-xs font-semibold text-slate-655 hover:text-blue-605 hover:bg-slate-55 transition-all px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-100 cursor-pointer"
                            >
                              {ItemIcon && <ItemIcon className="h-4 w-4 text-slate-400" />}
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Responsive Small/Medium Screens Navbar (Visible on screens below lg) */}
      <div className="lg:hidden w-full px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-slate-700 hover:text-blue-600 active:scale-95 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer flex items-center space-x-2 shadow-sm transition-all"
        >
          <Menu className="h-5 w-5 text-slate-550" />
          <span className="text-xs font-black uppercase tracking-wider">Menu</span>
        </button>

        {/* Current Active Tab Info Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-blue-50/70 border border-blue-100 rounded-full px-3 py-1.5 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-[10px] font-black text-blue-800 uppercase tracking-tight truncate max-w-[160px] md:max-w-xs" title={activeTab}>
            {activeTab === 'landing' ? 'Home' : activeTab}
          </span>
        </div>
      </div>

      {/* 3. Sliding Hamburger Menu Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-55 flex select-none lg:hidden">
          {/* Backdrop Blur Lockout */}
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          ></div>

          {/* Drawer Container Panel */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#f8fafc] border-r border-slate-200 shadow-2xl flex flex-col z-10 animate-slide-in-left">
            
            {/* Drawer Header details */}
            <div className="p-4 bg-gradient-to-r from-[#0a2540] to-[#0f417a] text-white flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-2">
                <img src={sagarmanthanLogo} alt="Sagarmanthan Logo" className="h-7 w-auto object-contain" />
                <span className="text-xs font-black tracking-widest uppercase">Navigation Menu</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg text-white transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Accordion Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
              
              {/* Home item */}
              <button
                onClick={() => { setActiveTab('landing'); setIsOpen(false); }}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  activeTab === 'landing' 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Home className="h-4.5 w-4.5 text-slate-400" />
                <span>Home</span>
              </button>

              {/* Loop Category Menus */}
              {MENU_DATA.map((menu) => {
                const CatIcon = menu.icon;
                const menuKey = menu.id;
                const isCatExpanded = !!expandedMenus[menuKey];
                const hasSub = !menu.directTab && (menu.subcategories || menu.items);

                if (menu.directTab) {
                  return (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => { handleItemClick(menu.directTab); setIsOpen(false); }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        activeTab === menu.directTab
                          ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <CatIcon className="h-4.5 w-4.5 text-slate-400" />
                      <span>{menu.label}</span>
                    </button>
                  );
                }

                return (
                  <div key={menu.id} className="space-y-1.5">
                    {/* Category Selector Header */}
                    <button
                      onClick={() => toggleExpand(menuKey)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        isCatExpanded 
                          ? 'bg-slate-100 border-slate-300/60 text-slate-800 shadow-inner' 
                          : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <CatIcon className="h-4.5 w-4.5 text-slate-400" />
                        <span>{menu.label}</span>
                      </div>
                      {hasSub && (
                        <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${
                          isCatExpanded ? 'rotate-180' : ''
                        }`} />
                      )}
                    </button>

                    {/* Expandable Category Contents Accordion */}
                    {isCatExpanded && (
                      <div className="pl-3.5 border-l border-slate-200 py-1 space-y-1.5 animate-fade-in">
                        
                        {/* Subcategories (Projects, KPI, HR) */}
                        {menu.subcategories && menu.subcategories.map((sub, sIdx) => {
                          const SubIcon = sub.icon;
                          const subKey = `${menu.id}-${sub.title}`;
                          const isSubExpanded = !!expandedMenus[subKey];

                          return (
                            <div key={sIdx} className="space-y-1.5">
                              <button
                                onClick={() => toggleExpand(subKey)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-extrabold transition-all ${
                                  isSubExpanded 
                                    ? 'bg-blue-50/50 text-blue-750' 
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  {SubIcon && <SubIcon className="h-3.5 w-3.5 text-slate-400" />}
                                  <span>{sub.title}</span>
                                </div>
                                <ChevronRight className={`h-3 w-3 opacity-60 transition-transform duration-200 ${
                                  isSubExpanded ? 'rotate-90' : ''
                                }`} />
                              </button>

                              {isSubExpanded && (
                                <div className="pl-3 border-l border-slate-200/80 py-1 flex flex-col space-y-1">
                                  {sub.items.map((item, iIdx) => {
                                    if (item.subItems) {
                                      const ypKey = `mobile-yp-${sub.title}-${item.label}`;
                                      const isYpExpanded = !!expandedMenus[ypKey];
                                      return (
                                        <div key={iIdx} className="space-y-1">
                                          <button
                                            onClick={() => toggleExpand(ypKey)}
                                            className="flex items-center justify-between w-full text-left text-[11px] font-semibold transition-all py-1.5 px-2 rounded-md text-slate-600 hover:bg-slate-50"
                                          >
                                            <div className="flex items-center space-x-2">
                                              {item.icon && React.createElement(item.icon, { className: "h-3 w-3 opacity-80" })}
                                              <span>{item.label}</span>
                                            </div>
                                            <ChevronRight className={`h-3 w-3 opacity-60 transition-transform duration-200 ${isYpExpanded ? 'rotate-90' : ''}`} />
                                          </button>
                                          {isYpExpanded && (
                                            <div className="pl-3 border-l border-slate-200/80 py-1 flex flex-col space-y-1 animate-fade-in">
                                              {item.subItems.map((sub2, s2Idx) => (
                                                <button
                                                  key={s2Idx}
                                                  onClick={() => { handleItemClick(sub2.tab); setIsOpen(false); }}
                                                  className={`flex items-center space-x-2 text-left text-[11px] font-semibold transition-all py-1.5 px-2 rounded-md ${
                                                    activeTab === sub2.tab
                                                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                                                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                                                  }`}
                                                >
                                                  {sub2.icon && React.createElement(sub2.icon, { className: "h-3 w-3 opacity-80" })}
                                                  <span>{sub2.label}</span>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    return (
                                      <button
                                        key={iIdx}
                                        onClick={() => { handleItemClick(item.tab ?? item.label); setIsOpen(false); }}
                                        className={`flex items-center space-x-2 text-left text-[11px] font-semibold transition-all py-1.5 px-2 rounded-md ${
                                          activeTab === (item.tab ?? item.label)
                                            ? 'bg-blue-600 text-white font-bold shadow-sm' 
                                            : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                                        }`}
                                      >
                                        {item.icon && React.createElement(item.icon, { className: "h-3 w-3 opacity-80" })}
                                        <span>{item.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Flat Items (Governance, Legal, etc.) */}
                        {menu.items && (
                          <div className="flex flex-col space-y-1">
                            {menu.items.map((item, iIdx) => {
                              if (item.subItems) {
                                const subKey = `mobile-${menu.id}-${item.label}`;
                                const isSubExpanded = !!expandedMenus[subKey];
                                return (
                                  <div key={iIdx} className="space-y-1">
                                    <button
                                      onClick={() => toggleExpand(subKey)}
                                      className={`flex items-center justify-between w-full text-left text-[11px] font-semibold transition-all py-2 px-3 rounded-lg border border-transparent ${
                                        activeTab === item.label
                                          ? 'bg-blue-600 text-white font-bold shadow-sm border-blue-500'
                                          : 'text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2.5">
                                        {item.icon && React.createElement(item.icon, { className: "h-3.5 w-3.5 opacity-80 text-slate-400" })}
                                        <span>{item.label}</span>
                                      </div>
                                      <ChevronRight className={`h-3 w-3 opacity-60 transition-transform duration-200 ${isSubExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                    {isSubExpanded && (
                                      <div className="pl-4 border-l border-slate-200 py-1 space-y-1 animate-fade-in">
                                        {item.subItems.map((sub, sIdx) => (
                                          <button
                                            key={sIdx}
                                            onClick={() => {
                                              const mainTab = sub.tab || item.targetTab || item.label;
                                              setActiveTab(mainTab);
                                              if (sub.mediaType) {
                                                sessionStorage.setItem('mediaOutreachInitTab', sub.mediaType);
                                              }
                                              if (
                                                sub.targetSubTab &&
                                                mainTab === 'Parliamentary Issue'
                                              ) {
                                                sessionStorage.setItem(
                                                  'parliamentaryIssueInitTab',
                                                  sub.targetSubTab
                                                );
                                                window.dispatchEvent(
                                                  new CustomEvent('parliamentary-issue-subtab', {
                                                    detail: sub.targetSubTab,
                                                  })
                                                );
                                              }
                                              setIsOpen(false);
                                            }}
                                            className="flex items-center space-x-2 text-left text-[11px] font-semibold transition-all py-1.5 px-2 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                                          >
                                            {sub.icon && React.createElement(sub.icon, { className: "h-3 w-3 opacity-80" })}
                                            <span>{sub.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <button
                                  key={iIdx}
                                  onClick={() => handleItemClick(item.tab ?? item.label)}
                                  className={`flex items-center space-x-2.5 text-left text-[11px] font-semibold transition-all py-2 px-3 rounded-lg border border-transparent ${
                                    activeTab === item.label 
                                      ? 'bg-blue-600 text-white font-bold shadow-sm border-blue-500' 
                                      : 'text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {item.icon && React.createElement(item.icon, { className: "h-3.5 w-3.5 opacity-80 text-slate-400" })}
                                  <span>{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Government Attribution Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 text-center select-none text-[9px] text-slate-400 font-bold">
              Ministry of Ports, Shipping and Waterways
            </div>

          </div>
        </div>
      )}

    </nav>
  );
}