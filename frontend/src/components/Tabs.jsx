import React, { useMemo } from 'react';
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
  Shield
} from 'lucide-react';

export default function Tabs({ activeTab, setActiveTab }) {
  const MENU_DATA = [
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
            { label: 'Project Dashboard', icon: LayoutDashboard },
            { label: 'Project List', icon: ListTodo },
            { label: 'Projects Less Than 5 Cr', icon: Coins },
            { label: 'Lumpsum - IWAI', icon: TrendingUp },
            { label: 'View Drop Request', icon: FolderSync },
            { label: 'Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'CSR Project',
          icon: Heart,
          items: [
            { label: 'CSR Dashboard', icon: LayoutDashboard },
            { label: 'CSR Fund Details', icon: Coins },
            { label: 'CSR Project List', icon: ListTodo },
            { label: 'Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'Capex Input Form',
          icon: Coins,
          items: [
            { label: 'Estimate Values', icon: DollarSign },
            { label: 'Capex Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'Expenditure',
          icon: DollarSign,
          items: [
            { label: 'Input Form - Estimate Values', icon: FileText },
            { label: 'Expenditure Reports', icon: FilePieChart }
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
            { label: 'Major Ports Dashboard', icon: LayoutDashboard },
            { label: 'Major Ports Input Form', icon: FileEdit },
            { label: 'Major Ports Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'DSG',
          icon: ShieldCheck,
          items: [
            { label: 'MMD Master', icon: ClipboardList },
            { label: 'DSG Input Form', icon: FileEdit },
            { label: 'DSG Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'IWAI',
          icon: Ship,
          items: [
            { label: 'IWAI Master', icon: ClipboardList },
            { label: 'National Waterways', icon: Milestone },
            { label: 'Terminal/Jetties', icon: Anchor },
            { label: 'Digital Portals', icon: Globe }
          ]
        },
        {
          title: 'DGLL',
          icon: Compass,
          items: [
            { label: 'DGLL Input Form', icon: FileEdit },
            { label: 'DGLL Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'CSL',
          icon: Layers,
          items: [
            { label: 'CSL Input Form', icon: FileEdit },
            { label: 'CSL Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'IMU',
          icon: GraduationCap,
          items: [
            { label: 'IMU Input Form', icon: FileEdit },
            { label: 'IMU Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'SCI',
          icon: Ship,
          items: [
            { label: 'SCI Input Form', icon: FileEdit },
            { label: 'SCI Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'CMEC',
          icon: Activity,
          items: [
            { label: 'CMEC Input Form', icon: FileEdit },
            { label: 'CMEC Reports', icon: FilePieChart }
          ]
        }
      ]
    },
    {
      id: 'hr',
      label: 'HR & Institutional',
      icon: Users,
      align: 'left-0',
      width: 'w-[750px]',
      subcategories: [
        {
          title: 'HR Management',
          icon: UserCheck,
          items: [
            { label: 'HR Dashboard', icon: LayoutDashboard },
            { label: 'Employee Database', icon: ClipboardList },
            { label: 'List of Abolished Posts', icon: UserX },
            { label: 'Contractual Employment', icon: UserPlus },
            { label: 'Training Details', icon: BookOpen },
            { label: 'HR Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'Young Professionals',
          icon: Award,
          items: [
            { label: 'YP Input Form', icon: FileEdit },
            { label: 'YP Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'Consultant Appointment',
          icon: Briefcase,
          items: [
            { label: 'Consultant Input Form', icon: FileEdit },
            { label: 'Consultant Reports', icon: FilePieChart }
          ]
        }
      ]
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: ShieldCheck,
      align: 'left-1/2 -translate-x-1/2',
      width: 'w-[780px]',
      gridCols: 'grid-cols-3',
      items: [
        { label: 'Attendance', icon: UserCheck },
        { label: 'CPGRAMS', icon: FileCheck },
        { label: 'Cabinet Notes - Other Ministries', icon: FileText },
        { label: 'E Office', icon: Globe },
        { label: 'Parliamentary Issue', icon: Gavel },
        { label: 'GEM Procurements', icon: Coins },
        { label: 'Cabinet Notes - MoPSW', icon: FileText },
        { label: 'VIP Reference', icon: Award },
        { label: 'Media Outreach', icon: Globe },
        { label: 'Audit Paras', icon: FileCheck },
        { label: 'Inter State & Inter Ministerial', icon: Network },
        { label: 'Foreign Visit', icon: Globe },
        { label: 'Cruise Shipping', icon: Ship },
        { label: 'Flagged Ships / FOB Basis', icon: Milestone },
        { label: 'MOM Of PSW Meetings', icon: ClipboardList },
        { label: 'Review Items', icon: CheckCircle }
      ]
    },
    {
      id: 'legal',
      label: 'Legal',
      icon: Scale,
      align: 'left-1/2 -translate-x-1/2',
      width: 'w-[240px]',
      items: [
        { label: 'Courtcases', icon: Shield },
        { label: 'Acts & Rules', icon: BookOpen }
      ]
    },
    {
      id: 'strategies',
      label: 'Long Term Strategies',
      icon: TrendingUp,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        { label: 'Vision 2047', icon: Milestone },
        { label: 'Maritime India Summit', icon: Anchor },
        { label: 'Blue Economy Policy', icon: ShieldCheck }
      ]
    },
    {
      id: 'knowledge',
      label: 'Knowledge Repository',
      icon: BookMarked,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        { label: 'Research Papers', icon: FileText },
        { label: 'Policy Documents', icon: BookOpen },
        { label: 'Guidelines', icon: FileCheck }
      ]
    },
    {
      id: 'formBuilder',
      label: 'Form Builder',
      icon: FileEdit,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        { label: 'Create Dynamic Form', icon: FileEdit },
        { label: 'View Submissions', icon: ClipboardList }
      ]
    },
    {
      id: 'tracker',
      label: 'MoPSW Tracker',
      icon: LineChart,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        { label: 'Project Milestones', icon: Milestone },
        { label: 'Delay Analysis', icon: LineChart }
      ]
    },
    {
      id: 'meeting',
      label: 'Senior Officers Meeting',
      icon: UserCheck,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        { label: 'Meeting Schedule', icon: ClipboardList },
        { label: 'Minutes of Meeting', icon: BookOpen },
        { label: 'Action Taken Report', icon: CheckCircle }
      ]
    },
    {
      id: 'contact',
      label: 'Contact Us',
      icon: PhoneCall,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        { label: 'Ministry Contacts', icon: Users },
        { label: 'Helpdesk Support', icon: HelpCircle }
      ]
    }
  ];

  const handleItemClick = (label) => {
    const norm = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm === 'projectdashboard') {
      setActiveTab('dashboard');
    } else if (norm === 'projectlist') {
      setActiveTab('projects');
    } else if (norm === 'projectslessthan5cr') {
      setActiveTab('less5cr');
    } else if (norm === 'lumpsumiwai') {
      setActiveTab('lumpsum');
    } else if (norm === 'viewdroprequest') {
      setActiveTab('dropRequests');
    } else if (norm === 'reports') {
      setActiveTab('reports');
    } else {
      setActiveTab(label);
    }
  };

  return (
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-visible py-1.5 justify-between items-center">
            {/* Home Tab Button */}
            <button
                onClick={() => setActiveTab('landing')}
                className={`flex flex-col items-center space-y-0.5 py-1 px-1.5 text-center transition-all duration-200 cursor-pointer rounded-lg hover:bg-slate-50 min-w-16 ${
                    activeTab === 'landing'
                        ? 'text-blue-755 font-bold'
                        : 'text-slate-655 font-semibold hover:text-slate-900'
                }`}
            >
              <Home className={`h-4.5 w-4.5 transition-colors ${
                  activeTab === 'landing' ? 'text-blue-755' : 'text-slate-500 group-hover:text-blue-600'
              }`} />
              <span className="text-[9px] tracking-tight uppercase select-none whitespace-nowrap">
              Home
            </span>
            </button>

            {MENU_DATA.map((menu) => {
              const Icon = menu.icon;
              const hasDropdown = menu.subcategories || menu.items;
              const isHrActiveTab = [
                'HR Dashboard', 'Employee Database', 'List of Abolished Ports', 'List of Abolished Posts',
                'Contractual Employment', 'Training Details', 'HR Reports'
              ].includes(activeTab);
              const isMainMenuActive = activeTab.startsWith(menu.id) || activeTab === menu.id || (menu.id === 'hr' && isHrActiveTab);

              return (
                  <div key={menu.id} className="relative group flex-shrink-0">
                    {/* Main Menu Button */}
                    <button
                        className={`flex flex-col items-center space-y-0.5 py-1 px-1.5 text-center transition-all duration-200 cursor-pointer rounded-lg hover:bg-slate-50 min-w-16 ${
                            isMainMenuActive
                                ? 'text-blue-700 font-bold'
                                : 'text-slate-655 font-semibold hover:text-slate-900'
                        }`}
                    >
                      <Icon className="h-4.5 w-4.5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                      <span className="text-[9px] tracking-tight uppercase flex items-center gap-0.5 select-none whitespace-nowrap">
                    {menu.label}
                        {hasDropdown && <ChevronDown className="h-2.5 w-2.5 opacity-60" />}
                  </span>
                    </button>

                    {/* Reverted Main Dropdown Back to Original Slate Styling */}
                    {hasDropdown && (
                        <div className={`absolute top-full ${menu.align} ${menu.subcategories ? 'w-64 bg-slate-50 border-slate-200 text-slate-800' : menu.width + ' bg-white border-slate-200 text-slate-800'} border shadow-2xl rounded-b-2xl rounded-t-md p-3 transition-all duration-200 ease-out origin-top scale-y-95 opacity-0 invisible group-hover:scale-y-100 group-hover:opacity-100 group-hover:visible z-50`}>

                          {/* Render Subcategories Layout (e.g. Projects, KPI, HR) */}
                          {menu.subcategories && (
                              <div className="flex flex-col space-y-0.5 relative">
                                {menu.subcategories.map((sub, sIdx) => {
                                  const SubIcon = sub.icon;
                                  return (
                                      <div key={sIdx} className="relative group/sub">
                                        <div className="w-full text-left text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between text-slate-700 hover:bg-blue-50 hover:text-blue-700">
                                          <div className="flex items-center space-x-2">
                                            {SubIcon && <SubIcon className="h-4 w-4 text-slate-400 group-hover/sub:text-blue-600 transition-colors" />}
                                            <span>{sub.title}</span>
                                          </div>
                                          <span className="text-[10px] text-slate-400 group-hover/sub:text-blue-600 transition-colors">➔</span>
                                        </div>

                                        {/* Adjusted flyout container placement to align flawlessly to the right side edge */}
                                        <div className={`absolute ${menu.id === 'hr' ? 'right-full -top-3 mr-3 origin-right' : 'left-full -top-3 ml-3 origin-left'} w-60 bg-white text-slate-800 border border-slate-200 shadow-2xl rounded-2xl p-4 transition-all duration-200 scale-95 opacity-0 invisible group-hover/sub:scale-100 group-hover/sub:opacity-100 group-hover/sub:visible z-50 space-y-3`}>
                                          <h4 className="text-[11px] font-bold text-[#0f417a] uppercase tracking-widest block border-b border-slate-150 pb-2">
                                            {sub.title} Options
                                          </h4>
                                          <div className="flex flex-col space-y-1.5">
                                            {sub.items.map((item, iIdx) => {
                                              const ItemIcon = item.icon;
                                              return (
                                                  <button
                                                      key={iIdx}
                                                      onClick={() => handleItemClick(item.label)}
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

                          {/* Render Grid/List of Single Items Layout (e.g. Governance, Legal) */}
                          {menu.items && (
                              <div className={`grid ${menu.gridCols || 'grid-cols-1'} gap-3`}>
                                {menu.items.map((item, iIdx) => {
                                  const ItemIcon = item.icon;
                                  return (
                                      <button
                                          key={iIdx}
                                          onClick={() => handleItemClick(item.label)}
                                          className="flex items-center space-x-2 w-full text-left text-xs font-semibold text-slate-650 hover:text-blue-605 hover:bg-slate-55 transition-all px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-100 cursor-pointer"
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
      </nav>
  );
}