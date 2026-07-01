import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit, 
  Search, 
  ChevronDown, 
  X, 
  Save, 
  UserCheck, 
  Plus,
  Phone,
  Mail,
  Building,
  Briefcase
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const TITLE_OPTIONS = ['Shri', 'Smt', 'Dr', 'Mr', 'Ms', 'Mrs'];

const ROLE_OPTIONS = [
  'Super Admin',
  'NTCPWC Admin',
  'View Only Admin',
  'MOPSW - Wing/Division Level User',
  'MOPSW - Undersecretary Level',
  'MOPSW - Director Level',
  'MOPSW - Joint Secretary Level',
  'MOPSW - Secretary Level',
  'Organisation Port - S.O',
  'Organisation Port - N.O',
  'Organisation Non-Port - S.O',
  'Organisation Non-Port - N.O'
];

const INITIAL_USERS = [
  {
    id: 1,
    title: 'Shri',
    name: 'Sagar Kumar',
    phone: '9876543210',
    email: 'sagar.kumar@mopsw.gov.in',
    organisation: 'Ministry of Ports, Shipping and Waterways',
    designation: 'Joint Secretary',
    role: 'MOPSW - Joint Secretary Level'
  },
  {
    id: 2,
    title: 'Dr',
    name: 'T. R. Prasad',
    phone: '9444012345',
    email: 'prasad.tr@ntcpwc.org',
    organisation: 'NTCPWC',
    designation: 'Senior Nodal Officer',
    role: 'NTCPWC Admin'
  },
  {
    id: 3,
    title: 'Shri',
    name: 'M. K. Swamy',
    phone: '9988776655',
    email: 'swamy.mk@jnport.gov.in',
    organisation: 'Jawaharlal Nehru Port Authority',
    designation: 'Senior Officer (S.O)',
    role: 'Organisation Port - S.O'
  },
  {
    id: 4,
    title: 'Ms',
    name: 'Anjali Sharma',
    phone: '9123456789',
    email: 'anjali.sharma@mopsw.gov.in',
    organisation: 'Ministry of Ports, Shipping and Waterways',
    designation: 'Undersecretary',
    role: 'MOPSW - Undersecretary Level'
  }
];

const CONFIGURABLE_MODULES = [
  {
    title: 'Projects Module Access Control',
    moduleKey: 'projects',
    fields: [
      { key: 'dashboard', label: 'View Project Dashboard' },
      { key: 'list', label: 'View Project List' },
      { key: 'less5cr', label: 'View Projects Less Than 5 Cr' },
      { key: 'lumpsum', label: 'View Lumpsum - IWAI' },
      { key: 'dropRequests', label: 'View Drop Requests' },
      { key: 'reports', label: 'View Reports' },
      { key: 'create', label: 'Create Projects' },
      { key: 'update', label: 'Update Projects' },
      { key: 'delete', label: 'Delete Projects' }
    ]
  },
  {
    title: 'KPI Module Access Control',
    moduleKey: 'kpi',
    fields: [
      { key: 'dashboard', label: 'View Major Ports Dashboard' },
      { key: 'inputForm', label: 'View Major Ports Input Form' },
      { key: 'reports', label: 'View Major Ports Reports' },
      { key: 'create', label: 'Create KPI Inputs' },
      { key: 'update', label: 'Update KPI Inputs' },
      { key: 'delete', label: 'Delete KPI Inputs' }
    ]
  },
  {
    title: 'Cabinet Notes & Governance Access Control',
    moduleKey: 'governance',
    fields: [
      { key: 'eOffice', label: 'View E Office' },
      { key: 'attendance', label: 'View Attendance' },
      { key: 'cpgrams', label: 'View CPGRAMS' },
      { key: 'cabinetNotes', label: 'View Cabinet Notes - MoPSW' },
      { key: 'vipReference', label: 'View VIP Reference' },
      { key: 'createCabinetNotes', label: 'Add Cabinet Notes' },
      { key: 'updateCabinetNotes', label: 'Update Cabinet Notes' }
    ]
  },
  {
    title: 'Legal Module Access Control',
    moduleKey: 'legal',
    fields: [
      { key: 'courtCases', label: 'View Court Cases' },
      { key: 'actsRules', label: 'View Acts & Rules' }
    ]
  },
  {
    title: 'Strategies Module Access Control',
    moduleKey: 'strategies',
    fields: [
      { key: 'vision2047', label: 'View Vision 2047' },
      { key: 'mis', label: 'View Maritime India Summit' },
      { key: 'blueEconomy', label: 'View Blue Economy Policy' }
    ]
  },
  {
    title: 'Knowledge Repository Access Control',
    moduleKey: 'knowledge',
    fields: [
      { key: 'researchPapers', label: 'View Research Papers' },
      { key: 'policyDocuments', label: 'View Policy Documents' },
      { key: 'guidelines', label: 'View Guidelines' }
    ]
  },
  {
    title: 'Form Builder Access Control',
    moduleKey: 'formBuilder',
    fields: [
      { key: 'createForm', label: 'View Create Dynamic Form' },
      { key: 'viewSubmissions', label: 'View Submissions' }
    ]
  },
  {
    title: 'MoPSW Tracker Access Control',
    moduleKey: 'tracker',
    fields: [
      { key: 'milestones', label: 'View Project Milestones' },
      { key: 'delayAnalysis', label: 'View Delay Analysis' }
    ]
  },
  {
    title: 'Senior Officers Meeting Access Control',
    moduleKey: 'meeting',
    fields: [
      { key: 'schedule', label: 'View Meeting Schedule' },
      { key: 'mom', label: 'View Minutes of Meeting' },
      { key: 'atr', label: 'View Action Taken Report' }
    ]
  },
  {
    title: 'Contact Us Access Control',
    moduleKey: 'contact',
    fields: [
      { key: 'ministryContacts', label: 'View Ministry Contacts' },
      { key: 'helpdesk', label: 'View Helpdesk Support' }
    ]
  },
  {
    title: 'User Access Control Settings',
    moduleKey: 'userAccess',
    fields: [
      { key: 'manage', label: 'Manage Access Control' }
    ]
  }
];

function CollapsibleModuleTable({ title, moduleKey, fields, rolePermissions, setRolePermissions, toggleNotification }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-all font-bold text-xs text-[#0f417a] uppercase tracking-wider cursor-pointer border-b border-slate-200 text-left"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4.5 w-4.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="overflow-x-auto p-4 bg-white animate-fade-in">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-700 border-b border-slate-200">
                <th className="p-3 border-r border-slate-150">Role Profile</th>
                {fields.map(f => (
                  <th key={f.key} className="p-3 text-center border-r border-slate-150">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_OPTIONS.map((roleName) => {
                const roleConfig = rolePermissions[roleName]?.[moduleKey] || {};
                return (
                  <tr key={roleName} className="border-b border-slate-150 hover:bg-slate-50/50 text-[11px] font-semibold text-slate-750">
                    <td className="p-3 border-r border-slate-150 font-bold text-slate-850 bg-white sticky left-0 z-10 shadow-sm">{roleName}</td>
                    {fields.map(f => {
                      const toggleVal = () => {
                        setRolePermissions(prev => {
                          const roleObj = prev[roleName] || {};
                          const moduleObj = roleObj[moduleKey] || {};
                          return {
                            ...prev,
                            [roleName]: {
                              ...roleObj,
                              [moduleKey]: {
                                ...moduleObj,
                                [f.key]: !moduleObj[f.key]
                              }
                            }
                          };
                        });
                        toggleNotification(`Updated ${f.label} for ${roleName} in ${title}.`);
                      };
                      return (
                        <td key={f.key} className="p-3 text-center border-r border-slate-150">
                          <input 
                            type="checkbox" 
                            checked={roleConfig[f.key] || false}
                            disabled={roleName === 'Super Admin' && f.key === 'manage'}
                            onChange={toggleVal}
                            className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UserManagement({ rolePermissions = {}, setRolePermissions }) {
  const gridRef = useRef();
  const [users, setUsers] = useState(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Form states
  const [formTitle, setFormTitle] = useState('Shri');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formOrganisation, setFormOrganisation] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formRole, setFormRole] = useState('MOPSW - Wing/Division Level User');
  
  const [notification, setNotification] = useState(null);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormTitle('Shri');
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormOrganisation('');
    setFormDesignation('');
    setFormRole('MOPSW - Wing/Division Level User');
    setIsModalOpen(true);
  };

  const handleOpenEdit = useCallback((user) => {
    setEditingUser(user);
    setFormTitle(user.title || 'Shri');
    setFormName(user.name || '');
    setFormPhone(user.phone || '');
    setFormEmail(user.email || '');
    setFormOrganisation(user.organisation || '');
    setFormDesignation(user.designation || '');
    setFormRole(user.role || 'MOPSW - Wing/Division Level User');
    setIsModalOpen(true);
  }, []);

  const handleDeleteUser = useCallback((user) => {
    if (window.confirm(`Are you sure you want to delete user ${user.title} ${user.name}?`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      triggerNotification('User deleted successfully.');
    }
  }, []);

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      triggerNotification('Please enter a name.');
      return;
    }
    if (!formEmail.trim()) {
      triggerNotification('Please enter an email.');
      return;
    }

    if (editingUser) {
      // Update
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        title: formTitle,
        name: formName,
        phone: formPhone,
        email: formEmail,
        organisation: formOrganisation,
        designation: formDesignation,
        role: formRole
      } : u));
      triggerNotification('User updated successfully.');
    } else {
      // Add
      const newUser = {
        id: Date.now(),
        title: formTitle,
        name: formName,
        phone: formPhone,
        email: formEmail,
        organisation: formOrganisation,
        designation: formDesignation,
        role: formRole
      };
      setUsers(prev => [newUser, ...prev]);
      triggerNotification('New user registered successfully.');
    }
    setIsModalOpen(false);
  };

  // Filtered rows for grid display
  const filteredRows = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.organisation && user.organisation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.designation && user.designation.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = selectedRoleFilter === 'All' || user.role === selectedRoleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRoleFilter]);

  // Column definitions for AG Grid
  const colDefs = useMemo(() => [
    {
      headerName: 'Title',
      field: 'title',
      width: 80,
      cellClass: 'border-r border-slate-100 flex items-center justify-center font-bold text-slate-700',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Name',
      field: 'name',
      minWidth: 150,
      flex: 1,
      cellClass: 'border-r border-slate-100 flex items-center font-semibold text-slate-800',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Phone Number',
      field: 'phone',
      width: 120,
      cellClass: 'border-r border-slate-100 flex items-center text-slate-650',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Email Address',
      field: 'email',
      minWidth: 200,
      flex: 1.2,
      cellClass: 'border-r border-slate-100 flex items-center text-slate-650 font-medium',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Organisation',
      field: 'organisation',
      minWidth: 220,
      flex: 1.2,
      cellClass: 'border-r border-slate-100 flex items-center text-slate-700 font-semibold',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Designation',
      field: 'designation',
      minWidth: 150,
      flex: 1,
      cellClass: 'border-r border-slate-100 flex items-center text-slate-650',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Role / Access Level',
      field: 'role',
      minWidth: 220,
      flex: 1.2,
      headerClass: 'border-r border-blue-900/30',
      cellClass: 'border-r border-slate-100 flex items-center justify-start',
      cellRenderer: (params) => {
        const val = params.value || '';
        let badgeColor = 'bg-slate-50 text-slate-700 border-slate-150';
        if (val.includes('Admin')) {
          badgeColor = 'bg-rose-50 text-rose-700 border border-rose-100';
        } else if (val.includes('MOPSW')) {
          badgeColor = 'bg-blue-50 text-blue-700 border border-blue-100';
        } else if (val.includes('Port')) {
          badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        }
        return (
          <div className="flex items-center h-full">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${badgeColor}`}>
              {val}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Actions',
      width: 100,
      cellClass: 'text-center flex items-center justify-center gap-2',
      cellRenderer: (params) => {
        const user = params.data;
        return (
          <div className="flex items-center justify-center space-x-1.5 h-full">
            <button 
              onClick={() => handleOpenEdit(user)}
              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
              title="Edit User"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => handleDeleteUser(user)}
              className="p-1.5 bg-red-650 hover:bg-red-700 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
              title="Delete User"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }
  ], [handleDeleteUser, handleOpenEdit]);

  // Sync Quick Search
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('quickFilterText', searchQuery);
    }
  }, [searchQuery]);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Toast Notification Alert Banner */}
      {notification && (
        <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in">
          <div className="p-1 bg-emerald-500 rounded-lg">
            <UserCheck className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold font-display leading-tight">Notification</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{notification}</p>
          </div>
        </div>
      )}

      {/* Main Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-700" />
            <span>User Management & Access Control</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Manage credentials, permissions, and organizational role hierarchies for MoPSW and external Port agencies.</p>
        </div>
        
        <button 
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Register New User</span>
        </button>
      </div>

      {/* Database filters / search controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Quick Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name, email, organisation, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-250 rounded-xl bg-slate-50/50 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            />
          </div>

          {/* Filter by Role */}
          <div className="md:col-span-4 flex items-center space-x-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Role:</label>
            <div className="relative flex-grow">
              <select 
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="w-full text-xs pl-3 pr-8 py-2.5 border border-slate-250 rounded-xl bg-white text-slate-750 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="All">All Roles / Access Levels</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
          
          <div className="md:col-span-3 text-right">
            <span className="text-[10px] text-slate-400 font-black uppercase">
              Total Users: <strong className="text-blue-700 text-xs">{filteredRows.length}</strong>
            </span>
          </div>
        </div>

        {/* AG Grid Table Container */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50/20">
          <div className="ag-theme-alpine w-full" style={{ height: '300px' }}>
            <AgGridReact
              ref={gridRef}
              rowData={filteredRows}
              columnDefs={colDefs}
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true,
              }}
              rowHeight={38}
              headerHeight={32}
              pagination={true}
              paginationPageSize={10}
              gridOptions={{
                theme: 'legacy'
              }}
            />
          </div>
        </div>

      </div>

      {/* RBAC Configurator Collapsible Panel Group */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-150 pb-2">
          <h2 className="text-xs font-black text-[#0f417a] uppercase tracking-wider">
            Role-Based Access Control (RBAC) Configurator
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Expand individual modules below to manage specific view, create, update, and delete access rights across all 12 roles.</p>
        </div>

        <div className="space-y-3">
          {CONFIGURABLE_MODULES.map((module) => (
            <CollapsibleModuleTable
              key={module.moduleKey}
              title={module.title}
              moduleKey={module.moduleKey}
              fields={module.fields}
              rolePermissions={rolePermissions}
              setRolePermissions={setRolePermissions}
              toggleNotification={triggerNotification}
            />
          ))}
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden transform transition-all animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-150">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-blue-700" />
                <h3 className="text-sm font-black text-[#0f417a] uppercase tracking-wide font-display">
                  {editingUser ? 'Update User Details' : 'Register New Access Account'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs font-semibold text-slate-750">
              
              <div className="grid grid-cols-3 gap-4">
                {/* Title */}
                <div className="col-span-1 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title</label>
                  <div className="relative">
                    <select
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full text-xs pl-3 pr-8 py-2 border border-slate-250 rounded-lg bg-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      {TITLE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Enter full name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="tel" 
                      placeholder="e.g. 9876543210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. email@mopsw.gov.in"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-550"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Organisation */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Organisation</label>
                  <div className="relative">
                    <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. NTCPWC / JNPA"
                      value={formOrganisation}
                      onChange={(e) => setFormOrganisation(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Designation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. Undersecretary"
                      value={formDesignation}
                      onChange={(e) => setFormDesignation(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Role Option Selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned Role & Access Permission Level</label>
                <div className="relative">
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full text-xs pl-3 pr-8 py-2.5 border border-slate-250 rounded-lg bg-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-150">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 rounded-lg text-slate-655 hover:bg-slate-55 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-650 hover:bg-blue-705 text-white rounded-lg shadow cursor-pointer font-bold"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingUser ? 'Update Account' : 'Register Account'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
