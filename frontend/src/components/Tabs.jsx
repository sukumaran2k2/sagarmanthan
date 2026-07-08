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

export default function Tabs({ activeTab, setActiveTab, projectCount, userRole }) {
  const permissions = useMemo(() => {
    const mods = [
      'projects', 'csr_projects', 'capex', 'expenditure', 'major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec',
      'hr_management', 'young_professionals', 'consultants_appointment', 'attendance', 'gem_procurements', 'cpgrams',
      'cabinet_notes_mopsw', 'cabinet_notes_other', 'vip_reference', 'e_office', 'media_outreach', 'parliamentary_issues',
      'audit_paras', 'inter_state_ministerial', 'foreign_visit', 'cruise_shipping', 'flagged_ships', 'mom_meetings',
      'review_items', 'court_cases', 'acts_rules', 'bills_preconstitutions', 'miv_2030', 'amrit_kaal_vision_2047',
      'drishti_portal', 'gmis_imw_mou', 'knowledge_repository', 'form_builder', 'mopsw_tracker', 'senior_officer_meetings',
      'contact_us'
    ];
    const defaults = {
      director: Object.fromEntries(mods.map(m => {
        const isRestricted = ['attendance', 'gem_procurements', 'cpgrams', 'cabinet_notes_mopsw', 'cabinet_notes_other', 'vip_reference', 'e_office', 'media_outreach', 'parliamentary_issues', 'audit_paras', 'inter_state_ministerial', 'foreign_visit', 'cruise_shipping', 'flagged_ships', 'mom_meetings', 'review_items', 'court_cases', 'acts_rules', 'bills_preconstitutions', 'form_builder'].includes(m);
        return [m, { visibility: !isRestricted }];
      })),
      joint_secretary: Object.fromEntries(mods.map(m => {
        const isAllowed = m === 'projects' || m === 'csr_projects' || m === 'capex' || m === 'expenditure' || ['major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec'].includes(m);
        return [m, { visibility: isAllowed }];
      })),
      secretary: Object.fromEntries(mods.map(m => {
        const isAllowed = m === 'projects' || m === 'csr_projects' || m === 'capex' || m === 'expenditure' || ['major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec'].includes(m);
        return [m, { visibility: isAllowed }];
      })),
      senior_officer: Object.fromEntries(mods.map(m => [m, { visibility: true }])),
      nodal_officer: Object.fromEntries(mods.map(m => [m, { visibility: true }])),
      wing_level: Object.fromEntries(mods.map(m => [m, { visibility: true }])),
      under_secretary: Object.fromEntries(mods.map(m => [m, { visibility: true }])),
      admin: Object.fromEntries(mods.map(m => [m, { visibility: true }])),
      super_admin: Object.fromEntries(mods.map(m => [m, { visibility: true }])),
      view_only_admin: Object.fromEntries(mods.map(m => [m, { visibility: true }]))
    };

    const saved = localStorage.getItem('sm_rbac_matrix');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = {};
        Object.keys(defaults).forEach(roleId => {
          merged[roleId] = {
            ...defaults[roleId],
            ...(parsed[roleId] || {})
          };
        });
        return merged;
      } catch (e) { }
    }
    return defaults;
  }, []);

  const MAP_ITEM_TO_MODULE = {
    // Project
    'Projects': 'projects',
    'CSR Projects': 'csr_projects',
    'Capex': 'capex',
    'Expenditure': 'expenditure',
    'Project': 'projects',
    'CSR Project': 'csr_projects',
    'Capex Input Form': 'capex',

    // KPI
    'Major Ports': 'major_ports',
    'DGS': 'dgs',
    'DSG': 'dgs',
    'IWAI': 'iwai',
    'DGLL': 'dgll',
    'CSL': 'csl',
    'IMU': 'imu',
    'SCI': 'sci',
    'CMEC': 'cmec',

    // HR & Institutional
    'HR Management': 'hr_management',
    'Young Professionals': 'young_professionals',
    'Consultants Appointment': 'consultants_appointment',
    'Consultant Appointment': 'consultants_appointment',

    // Governance
    'Attendance': 'attendance',
    'GEM Procurements': 'gem_procurements',
    'CPGRAMS': 'cpgrams',
    'Cabinet Notes - MoPSW': 'cabinet_notes_mopsw',
    'Cabinet Notes - Other Ministries': 'cabinet_notes_other',
    'VIP Reference': 'vip_reference',
    'E Office': 'e_office',
    'Media Outreach': 'media_outreach',
    'Parliamentary Issues': 'parliamentary_issues',
    'Parliamentary Issue': 'parliamentary_issues',
    'Audit Paras': 'audit_paras',
    'Inter State & Inter Ministerial': 'inter_state_ministerial',
    'Foreign Visit': 'foreign_visit',
    'Cruise Shipping': 'cruise_shipping',
    'Flagged Ships / FOB Basis': 'flagged_ships',
    'MOM Of PSW Meetings': 'mom_meetings',
    'Review Items': 'review_items',

    // Legal
    'Court Cases': 'court_cases',
    'Courtcases': 'court_cases',
    'Acts & Rules': 'acts_rules',
    'Bills/PreConstitutions Act': 'bills_preconstitutions',

    // Long Term Strategies
    'MIV 2030': 'miv_2030',
    'Amrit Kaal Vision 2047': 'amrit_kaal_vision_2047',
    'Vision 2047': 'amrit_kaal_vision_2047',
    'Drishti portal (OVOD)': 'drishti_portal',
    'GMIS & IMW - MoU Tracking': 'gmis_imw_mou',

    // Others
    'knowledge': 'knowledge_repository',
    'formBuilder': 'form_builder',
    'tracker': 'mopsw_tracker',
    'meeting': 'senior_officer_meetings',
    'contact': 'contact_us'
  };

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
            { label: 'Input Form', icon: FileEdit },
            { label: 'Reports', icon: FilePieChart }
          ]
        },
        {
          title: 'Consultant Appointment',
          icon: Briefcase,
          items: [
            { label: 'Input Form', icon: FileEdit },
            { label: 'Reports', icon: FilePieChart }
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
        { label: 'Acts & Rules', icon: BookOpen },
        { label: 'Bills/PreConstitutions Act', icon: FileText }
      ]
    },
    {
      id: 'strategies',
      label: 'Long Term Strategies',
      icon: TrendingUp,
      align: 'right-0',
      width: 'w-[240px]',
      items: [
        { label: 'MIV 2030', icon: Milestone },
        { label: 'Amrit Kaal Vision 2047', icon: Anchor },
        { label: 'Drishti portal (OVOD)', icon: Globe },
        { label: 'GMIS & IMW - MoU Tracking', icon: ClipboardList }
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

  const filteredMenuData = useMemo(() => {
    if (!userRole) return MENU_DATA;
    const rolePerms = permissions[userRole] || {};

    return MENU_DATA.map(menu => {
      // 1. Check direct tab visibility
      const directKey = MAP_ITEM_TO_MODULE[menu.id];
      if (directKey && rolePerms[directKey]?.visibility === false) {
        return null;
      }

      // 2. Filter subcategories (like Projects, KPI, HR)
      if (menu.subcategories) {
        const filteredSubs = menu.subcategories.map(sub => {
          const subModuleKey = MAP_ITEM_TO_MODULE[sub.title];
          if (subModuleKey && rolePerms[subModuleKey]?.visibility === false) {
            return null;
          }
          return sub;
        }).filter(Boolean);

        return { ...menu, subcategories: filteredSubs };
      }

      // 3. Filter flat items (like Governance, Legal, Strategies, Contact Us)
      if (menu.items) {
        const filteredItems = menu.items.filter(item => {
          const itemModuleKey = MAP_ITEM_TO_MODULE[item.label] || MAP_ITEM_TO_MODULE[menu.id];
          if (itemModuleKey && rolePerms[itemModuleKey]?.visibility === false) {
            return false;
          }
          return true;
        });

        return { ...menu, items: filteredItems };
      }

      return menu;
    }).filter(menu => {
      if (!menu) return false;
      if (menu.subcategories && menu.subcategories.length === 0) return false;
      if (menu.items && menu.items.length === 0) return false;
      return true;
    });
  }, [userRole, permissions]);

  const handleItemClick = (label, subTitle) => {
    const norm = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normSub = subTitle ? subTitle.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    if (normSub === 'youngprofessionals') {
      if (norm === 'inputform') {
        setActiveTab('YP Input Form');
        return;
      } else if (norm === 'reports') {
        setActiveTab('YP Reports');
        return;
      }
    }

    if (normSub === 'consultantappointment') {
      if (norm === 'inputform') {
        setActiveTab('Consultant Input Form');
        return;
      } else if (norm === 'reports') {
        setActiveTab('Consultant Reports');
        return;
      }
    }

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
        <div className={`flex space-x-1 overflow-visible py-1.5 items-center ${
          filteredMenuData.length < 6 ? 'justify-center gap-6 md:gap-10 px-8' : 'justify-between'
        }`}>
          {/* Home Tab Button */}
          <button
            onClick={() => setActiveTab('landing')}
            className={`flex flex-col items-center space-y-0.5 py-1 px-1.5 text-center transition-all duration-200 cursor-pointer rounded-lg hover:bg-slate-50 min-w-16 ${activeTab === 'landing'
              ? 'text-blue-755 font-bold'
              : 'text-slate-655 font-semibold hover:text-slate-900'
              }`}
          >
            <Home className={`h-4.5 w-4.5 transition-colors ${activeTab === 'landing' ? 'text-blue-755' : 'text-slate-500 group-hover:text-blue-600'
              }`} />
            <span className="text-[9px] tracking-tight uppercase select-none whitespace-nowrap">
              Home
            </span>
          </button>

          {filteredMenuData.map((menu) => {
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
                  className={`flex flex-col items-center space-y-0.5 py-1 px-1.5 text-center transition-all duration-200 cursor-pointer rounded-lg hover:bg-slate-50 min-w-16 ${isMainMenuActive
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
                                        onClick={() => handleItemClick(item.label, sub.title)}
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