import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  Briefcase,
  Shield,
  Anchor,
  Settings,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info
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
  'MOPSW - Undersecretary Level User',
  'MOPSW - Director Level User',
  'MOPSW - Joint Secretary Level User',
  'MOPSW - Secretary Level User',
  'Organisation - Senior Nodal Officer',
  'Organisation - Nodal Officer'
];

const INITIAL_USERS = [
  {
    id: 1,
    title: 'Shri',
    name: 'Sagar Kumar',
    phone: '9876543210',
    email: 'sagar.kumar@mopsw.test.local',
    organisation: 'Ministry of Ports, Shipping and Waterways',
    designation: 'Joint Secretary',
    role: 'MOPSW - Joint Secretary Level User'
  },
  {
    id: 2,
    title: 'Dr',
    name: 'T. R. Prasad',
    phone: '9444012345',
    email: 'prasad.tr@ntcpwc.test.local',
    organisation: 'NTCPWC',
    designation: 'Senior Nodal Officer',
    role: 'NTCPWC Admin'
  },
  {
    id: 3,
    title: 'Shri',
    name: 'M. K. Swamy',
    phone: '9988776655',
    email: 'swamy.mk@jnport.test.local',
    organisation: 'Jawaharlal Nehru Port Authority',
    designation: 'Senior Nodal Officer',
    role: 'Organisation - Senior Nodal Officer'
  },
  {
    id: 4,
    title: 'Ms',
    name: 'Anjali Sharma',
    phone: '9123456789',
    email: 'anjali.sharma@mopsw.test.local',
    organisation: 'Ministry of Ports, Shipping and Waterways',
    designation: 'Undersecretary',
    role: 'MOPSW - Undersecretary Level User'
  }
];

// 23 Ministry Exclusive Modules (Image 1)
const MINISTRY_EXCLUSIVE_MODULES = [
  // File Upload Modules
  { key: 'cpgrams', label: 'CPGRAMS', category: 'File Upload' },
  { key: 'file_pendency', label: 'File Pendency', category: 'File Upload' },
  { key: 'receipt_pendency', label: 'Receipt Pendency', category: 'File Upload' },
  { key: 'file_disposal', label: 'File Disposal', category: 'File Upload' },
  { key: 'attendance', label: 'Attendance', category: 'File Upload' },
  // Data Entry Modules
  { key: 'yp', label: 'Young Professional', category: 'Data Entry' },
  { key: 'consultant', label: 'Consultant Appointment', category: 'Data Entry' },
  { key: 'vip_ref', label: 'VIP Reference', category: 'Data Entry' },
  { key: 'cabinet_other', label: 'Cabinet Notes - Other Ministry', category: 'Data Entry' },
  { key: 'cabinet_mopsw', label: 'Cabinet Notes - MoPSW', category: 'Data Entry' },
  { key: 'audit_para', label: 'Audit Para', category: 'Data Entry' },
  { key: 'bills_act', label: 'Bills/PreConstitutions Act', category: 'Data Entry' },
  { key: 'mom_meetings', label: 'MOM of PSW Meetings', category: 'Data Entry' },
  { key: 'flagged_ships', label: 'Promotion of Indian Flagged Ships', category: 'Data Entry' },
  { key: 'parliamentary', label: 'Parliamentary Issues', category: 'Data Entry' },
  { key: 'review_items', label: 'Review Items', category: 'Data Entry' },
  { key: 'mopsw_tracker', label: 'MoPSW Tracker', category: 'Data Entry' },
  { key: 'expenditure', label: 'Expenditure', category: 'Data Entry' },
  { key: 'foreign_visit', label: 'Foreign Visit', category: 'Data Entry' },
  { key: 'inter_state', label: 'Inter State & Inter Ministerial Issues', category: 'Data Entry' },
  { key: 'acts_rules', label: 'Acts & Rules', category: 'Data Entry' },
  { key: 'form_builder', label: 'Form Builder', category: 'Data Entry' },
  { key: 'senior_officer_meeting', label: 'Senior Officer Meeting', category: 'Data Entry' }
];

// 14 Organization Exclusive Modules (Image 2)
const ORGANIZATION_EXCLUSIVE_MODULES = [
  { key: 'projects', label: 'Projects', category: 'Major Ports' },
  { key: 'csr_projects', label: 'CSR Projects', category: 'Major Ports' },
  { key: 'capex', label: 'Capex', category: 'Major Ports' },
  { key: 'hr_management', label: 'HR Management', category: 'Major Ports' },
  { key: 'gem_goods', label: 'GEM Procurement - Goods', category: 'Major Ports' },
  { key: 'gem_service', label: 'GEM Procurement - Service', category: 'Major Ports' },
  { key: 'gem_work', label: 'GEM Procurement - Work', category: 'Major Ports' },
  { key: 'court_cases', label: 'Court Cases', category: 'Major Ports' },
  { key: 'miv_2030', label: 'MIV 2030', category: 'Major Ports' },
  { key: 'akv_2047', label: 'AKV 2047', category: 'Major Ports' },
  { key: 'ovd', label: 'OVD', category: 'Major Ports' },
  { key: 'gmis_imw', label: 'GMIS IMW', category: 'Major Ports' },
  { key: 'cruise_shipping', label: 'Cruise Shipping', category: 'Major Ports' },
  { key: 'media_outreach', label: 'Media Outreach', category: 'Major Ports' }
];

const MINISTRY_ROLES = [
  'MOPSW - Wing/Division Level User',
  'MOPSW - Undersecretary Level User',
  'MOPSW - Director Level User',
  'MOPSW - Joint Secretary Level User',
  'MOPSW - Secretary Level User'
];

const ORGANIZATION_ROLES = [
  'Organisation - Senior Nodal Officer',
  'Organisation - Nodal Officer'
];

const ADMIN_ROLES = [
  'Super Admin',
  'NTCPWC Admin',
  'View Only Admin'
];

// Default permissions generation
const getInitialPermissions = () => {
  const localSaved = localStorage.getItem('sagarmanthan_access_permissions');
  if (localSaved) {
    try {
      return JSON.parse(localSaved);
    } catch (e) {
      console.error("Failed to parse saved permissions, initializing defaults");
    }
  }

  const permissions = {};
  
  // Set default values for all roles
  ROLE_OPTIONS.forEach(role => {
    permissions[role] = {};
    
    // Default Ministry permissions
    MINISTRY_EXCLUSIVE_MODULES.forEach(mod => {
      let c = false, r = true, u = false, d = false;
      
      // Secretary and Joint Secretary have broad update/create permissions
      if (role.includes('Secretary') || role.includes('Director')) {
        c = true;
        u = true;
      }
      if (role.includes('Super Admin') || role.includes('NTCPWC Admin')) {
        c = true; u = true; d = true;
      }
      if (role.includes('View Only')) {
        c = false; u = false; d = false; r = true;
      }
      
      permissions[role][mod.key] = { c, r, u, d };
    });

    // Default Org permissions
    ORGANIZATION_EXCLUSIVE_MODULES.forEach(mod => {
      let c = false, r = true, u = false, d = false;
      
      if (role.includes('Senior Nodal Officer') || role.includes('Super Admin') || role.includes('NTCPWC Admin')) {
        c = true;
        u = true;
      }
      if (role.includes('Nodal Officer')) {
        c = true;
        u = true;
      }
      if (role.includes('View Only')) {
        c = false; u = false; d = false; r = true;
      }
      
      permissions[role][mod.key] = { c, r, u, d };
    });
  });

  return permissions;
};

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' or 'directory'
  const [sectorTab, setSectorTab] = useState('ministry'); // 'ministry', 'organization', 'admins'
  
  // Active selected role within Ministry/Org sections for editing
  const [activeMinistryRole, setActiveMinistryRole] = useState(MINISTRY_ROLES[0]);
  const [activeOrgRole, setActiveOrgRole] = useState(ORGANIZATION_ROLES[0]);

  const [rolePermissions, setRolePermissions] = useState(getInitialPermissions);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  
  // User Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Modal Form states
  const [formTitle, setFormTitle] = useState('Shri');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formOrganisation, setFormOrganisation] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formRole, setFormRole] = useState(ROLE_OPTIONS[3]);
  
  const [notification, setNotification] = useState(null);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Toggle check inside the permission matrix
  const handlePermissionToggle = (role, moduleKey, action) => {
    // View Only Admin or Admins full permissions shouldn't be edited arbitrarily 
    if (role === 'View Only Admin') {
      triggerNotification("Cannot edit permissions for 'View Only Admin'. It is set to read-only.");
      return;
    }
    if (role === 'Super Admin' || role === 'NTCPWC Admin') {
      triggerNotification(`System administrators (${role}) have full CRUD access unlocked by default.`);
      return;
    }

    setRolePermissions(prev => {
      const rolePerms = prev[role] || {};
      const modPerms = rolePerms[moduleKey] || { c: false, r: false, u: false, d: false };
      
      const updated = {
        ...prev,
        [role]: {
          ...rolePerms,
          [moduleKey]: {
            ...modPerms,
            [action]: !modPerms[action]
          }
        }
      };
      
      localStorage.setItem('sagarmanthan_access_permissions', JSON.stringify(updated));
      return updated;
    });
  };

  // Column Select All / Deselect All helper
  const handleBulkAction = (role, modulesList, action, value) => {
    if (role === 'View Only Admin' || role === 'Super Admin' || role === 'NTCPWC Admin') {
      return;
    }

    setRolePermissions(prev => {
      const rolePerms = { ...(prev[role] || {}) };
      
      modulesList.forEach(mod => {
        const modPerms = rolePerms[mod.key] || { c: false, r: false, u: false, d: false };
        rolePerms[mod.key] = {
          ...modPerms,
          [action]: value
        };
      });

      const updated = {
        ...prev,
        [role]: rolePerms
      };

      localStorage.setItem('sagarmanthan_access_permissions', JSON.stringify(updated));
      return updated;
    });

    triggerNotification(`Bulk updated '${action.toUpperCase()}' permissions for ${role}.`);
  };

  // Save all permissions
  const handleSavePermissions = () => {
    localStorage.setItem('sagarmanthan_access_permissions', JSON.stringify(rolePermissions));
    triggerNotification("✓ Access Control permissions matrix saved successfully to local storage.");
  };

  // Reset to default presets
  const handleResetToDefaults = () => {
    if (window.confirm("Are you sure you want to reset all access controls to system defaults? Any custom checks will be lost.")) {
      localStorage.removeItem('sagarmanthan_access_permissions');
      const defaults = getInitialPermissions();
      setRolePermissions(defaults);
      triggerNotification("Permissions successfully reset to factory defaults.");
    }
  };

  // User list crud handlers
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormTitle('Shri');
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormOrganisation('');
    setFormDesignation('');
    setFormRole(ROLE_OPTIONS[3]);
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
    setFormRole(user.role || ROLE_OPTIONS[3]);
    setIsModalOpen(true);
  }, []);

  const handleDeleteUser = useCallback((user) => {
    if (window.confirm(`Are you sure you want to delete the user profile: ${user.title} ${user.name}?`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      triggerNotification('User profile deleted successfully.');
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

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.organisation && user.organisation.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = selectedRoleFilter === 'All' || user.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRoleFilter]);

  const colDefs = useMemo(() => [
    {
      headerName: 'Title',
      field: 'title',
      width: 75,
      cellClass: 'border-r border-slate-100 flex items-center justify-center font-bold text-slate-700',
      headerClass: 'border-r border-blue-900/10'
    },
    {
      headerName: 'Name',
      field: 'name',
      minWidth: 150,
      flex: 1.5,
      cellClass: 'border-r border-slate-100 flex items-center font-semibold text-slate-800',
      headerClass: 'border-r border-blue-900/10'
    },
    {
      headerName: 'Phone Number',
      field: 'phone',
      width: 120,
      cellClass: 'border-r border-slate-100 flex items-center text-slate-600',
      headerClass: 'border-r border-blue-900/10'
    },
    {
      headerName: 'Email Address',
      field: 'email',
      minWidth: 180,
      flex: 1.5,
      cellClass: 'border-r border-slate-100 flex items-center font-medium text-slate-700',
      headerClass: 'border-r border-blue-900/10'
    },
    {
      headerName: 'Organisation',
      field: 'organisation',
      minWidth: 150,
      flex: 1.2,
      cellClass: 'border-r border-slate-100 flex items-center text-slate-600',
      headerClass: 'border-r border-blue-900/10'
    },
    {
      headerName: 'Assigned Access Role',
      field: 'role',
      minWidth: 180,
      flex: 1.5,
      cellClass: 'border-r border-slate-100 flex items-center font-black text-blue-800',
      headerClass: 'border-r border-blue-900/10'
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 90,
      pinned: 'right',
      cellRenderer: (params) => {
        const u = params.data;
        return (
          <div className="flex items-center justify-center h-full space-x-1">
            <button 
              onClick={() => handleOpenEdit(u)}
              className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer transition-all active:scale-90"
              title="Edit Profile"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => handleDeleteUser(u)}
              className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer transition-all active:scale-90"
              title="Delete Profile"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }
  ], [handleOpenEdit, handleDeleteUser]);

  return (
    <div className="w-full max-w-full space-y-6 animate-fade-in font-sans p-2 sm:p-4">
      
      {/* 1. Header Hero Banner */}
      <div className="bg-gradient-to-r from-[#0a2540] to-[#0f417a] border border-slate-800 rounded-3xl p-5 shadow-lg text-white select-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shadow-inner">
              <Settings className="h-7 w-7 text-cyan-300" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-black tracking-wider uppercase font-display">User Access Management & Control Panel</h1>
              <p className="text-[10px] text-slate-300 font-semibold tracking-wide mt-0.5">Configure role-based CRUD permissions, register access accounts, and audit sector exclusivities.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer border flex items-center space-x-1.5 ${
                activeTab === 'permissions'
                  ? 'bg-cyan-500 border-cyan-400 text-slate-900'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>Role Permissions Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer border flex items-center space-x-1.5 ${
                activeTab === 'directory'
                  ? 'bg-cyan-500 border-cyan-400 text-slate-900'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>User Directory Registry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-55 flex items-center space-x-2 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl animate-fade-in font-bold text-xs select-none">
          <Info className="h-4 w-4 text-cyan-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* TAB AREA 1: ACCESS PERMISSIONS MATRIX (User Request Main Focus) */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          
          {/* Sub tabs selector */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-3 gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setSectorTab('ministry')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center justify-center space-x-2 cursor-pointer ${
                  sectorTab === 'ministry'
                    ? 'bg-white text-blue-755 shadow border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building className="h-4 w-4" />
                <span>Ministry Sector</span>
              </button>
              <button
                onClick={() => setSectorTab('organization')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center justify-center space-x-2 cursor-pointer ${
                  sectorTab === 'organization'
                    ? 'bg-white text-blue-755 shadow border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Anchor className="h-4 w-4" />
                <span>Organization Sector</span>
              </button>
              <button
                onClick={() => setSectorTab('admins')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center justify-center space-x-2 cursor-pointer ${
                  sectorTab === 'admins'
                    ? 'bg-white text-blue-755 shadow border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Administrative Roles</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button 
                onClick={handleResetToDefaults}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded-xl cursor-pointer font-bold flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Defaults</span>
              </button>
              <button 
                onClick={handleSavePermissions}
                className="px-4 py-1.5 text-xs text-white bg-[#0f417a] hover:bg-blue-800 rounded-xl cursor-pointer font-bold flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Permissions</span>
              </button>
            </div>
          </div>

          {/* TAB CONTENT: MINISTRY SECTION */}
          {sectorTab === 'ministry' && (
            <div className="space-y-5">
              
              {/* Role Select Bar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
                <div className="flex items-center space-x-2 text-[#0f417a]">
                  <Building className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0f417a]">Select Ministry Role Profile to Edit</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                  {MINISTRY_ROLES.map((role) => {
                    const shortName = role.replace('MOPSW - ', '');
                    const isSelected = activeMinistryRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setActiveMinistryRole(role)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-850 shadow-md ring-2 ring-blue-500/20'
                            : 'bg-slate-50 border-slate-150 text-slate-655 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-[10px] font-black tracking-tight">{shortName}</div>
                        <div className="text-[8px] text-slate-400 font-semibold mt-1">Ministry Role</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CRUD Permissions Matrix Grid */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Ministry Access Grid</span>
                    <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none mt-1">
                      Editing Permissions for: <span className="text-blue-700 font-black">{activeMinistryRole.replace('MOPSW - ', '')}</span>
                    </h2>
                  </div>

                  {/* Header action helpers */}
                  <div className="flex flex-wrap gap-2 text-[9px] font-bold">
                    <button 
                      onClick={() => handleBulkAction(activeMinistryRole, MINISTRY_EXCLUSIVE_MODULES, 'c', true)} 
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer shadow-sm text-slate-650"
                    >
                      + Grant All Create
                    </button>
                    <button 
                      onClick={() => handleBulkAction(activeMinistryRole, MINISTRY_EXCLUSIVE_MODULES, 'u', true)} 
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer shadow-sm text-slate-650"
                    >
                      + Grant All Update
                    </button>
                    <button 
                      onClick={() => handleBulkAction(activeMinistryRole, MINISTRY_EXCLUSIVE_MODULES, 'd', true)} 
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer shadow-sm text-slate-650"
                    >
                      + Grant All Delete
                    </button>
                    <button 
                      onClick={() => {
                        handleBulkAction(activeMinistryRole, MINISTRY_EXCLUSIVE_MODULES, 'c', false);
                        handleBulkAction(activeMinistryRole, MINISTRY_EXCLUSIVE_MODULES, 'u', false);
                        handleBulkAction(activeMinistryRole, MINISTRY_EXCLUSIVE_MODULES, 'd', false);
                      }} 
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md cursor-pointer shadow-sm text-red-700"
                    >
                      Reset Write Actions
                    </button>
                  </div>
                </div>

                {/* Table list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-700 border-b border-slate-200 select-none">
                        <th className="p-3.5 border-r border-slate-150">S.No</th>
                        <th className="p-3.5 border-r border-slate-150">Ministry Module Name</th>
                        <th className="p-3.5 border-r border-slate-150">Module Type</th>
                        <th className="p-3.5 text-center border-r border-slate-150 w-24">Create (C)</th>
                        <th className="p-3.5 text-center border-r border-slate-150 w-24">Read (R)</th>
                        <th className="p-3.5 text-center border-r border-slate-150 w-24">Update (U)</th>
                        <th className="p-3.5 text-center w-24">Delete (D)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MINISTRY_EXCLUSIVE_MODULES.map((mod, idx) => {
                        const permissions = rolePermissions[activeMinistryRole]?.[mod.key] || { c: false, r: true, u: false, d: false };
                        return (
                          <tr key={mod.key} className="border-b border-slate-150 hover:bg-slate-50/50 text-[11px] font-bold text-slate-750">
                            <td className="p-3.5 border-r border-slate-150 text-slate-400 text-center font-mono w-12">{idx + 1}</td>
                            <td className="p-3.5 border-r border-slate-150 text-slate-800 font-bold">{mod.label}</td>
                            <td className="p-3.5 border-r border-slate-150">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                mod.category === 'File Upload' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {mod.category}
                              </span>
                            </td>
                            {/* Create check */}
                            <td className="p-3.5 text-center border-r border-slate-150 bg-slate-50/30">
                              <input 
                                type="checkbox" 
                                checked={permissions.c} 
                                onChange={() => handlePermissionToggle(activeMinistryRole, mod.key, 'c')}
                                className="h-4 w-4 text-blue-650 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            {/* Read check */}
                            <td className="p-3.5 text-center border-r border-slate-150 bg-slate-50/30">
                              <input 
                                type="checkbox" 
                                checked={permissions.r} 
                                onChange={() => handlePermissionToggle(activeMinistryRole, mod.key, 'r')}
                                className="h-4 w-4 text-blue-655 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            {/* Update check */}
                            <td className="p-3.5 text-center border-r border-slate-150 bg-slate-50/30">
                              <input 
                                type="checkbox" 
                                checked={permissions.u} 
                                onChange={() => handlePermissionToggle(activeMinistryRole, mod.key, 'u')}
                                className="h-4 w-4 text-blue-650 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            {/* Delete check */}
                            <td className="p-3.5 text-center bg-slate-50/30">
                              <input 
                                type="checkbox" 
                                checked={permissions.d} 
                                onChange={() => handlePermissionToggle(activeMinistryRole, mod.key, 'd')}
                                className="h-4 w-4 text-red-650 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ORGANIZATION SECTION */}
          {sectorTab === 'organization' && (
            <div className="space-y-5">
              
              {/* Role Select Bar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
                <div className="flex items-center space-x-2 text-[#0f417a]">
                  <Anchor className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0f417a]">Select Organization Role Profile to Edit</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  {ORGANIZATION_ROLES.map((role) => {
                    const shortName = role.replace('Organisation - ', '');
                    const isSelected = activeOrgRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setActiveOrgRole(role)}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-850 shadow-md ring-2 ring-blue-500/20'
                            : 'bg-slate-50 border-slate-150 text-slate-655 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-[11px] font-black tracking-tight">{shortName}</div>
                        <div className="text-[8px] text-slate-400 font-semibold mt-1">Sector Organization Role</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CRUD Permissions Matrix Grid */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Organization Access Grid</span>
                    <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none mt-1">
                      Editing Permissions for: <span className="text-blue-700 font-black">{activeOrgRole.replace('Organisation - ', '')}</span>
                    </h2>
                  </div>

                  {/* Header action helpers */}
                  <div className="flex flex-wrap gap-2 text-[9px] font-bold">
                    <button 
                      onClick={() => handleBulkAction(activeOrgRole, ORGANIZATION_EXCLUSIVE_MODULES, 'c', true)} 
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer shadow-sm text-slate-650"
                    >
                      + Grant All Create
                    </button>
                    <button 
                      onClick={() => handleBulkAction(activeOrgRole, ORGANIZATION_EXCLUSIVE_MODULES, 'u', true)} 
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer shadow-sm text-slate-650"
                    >
                      + Grant All Update
                    </button>
                    <button 
                      onClick={() => handleBulkAction(activeOrgRole, ORGANIZATION_EXCLUSIVE_MODULES, 'd', true)} 
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer shadow-sm text-slate-650"
                    >
                      + Grant All Delete
                    </button>
                    <button 
                      onClick={() => {
                        handleBulkAction(activeOrgRole, ORGANIZATION_EXCLUSIVE_MODULES, 'c', false);
                        handleBulkAction(activeOrgRole, ORGANIZATION_EXCLUSIVE_MODULES, 'u', false);
                        handleBulkAction(activeOrgRole, ORGANIZATION_EXCLUSIVE_MODULES, 'd', false);
                      }} 
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md cursor-pointer shadow-sm text-red-700"
                    >
                      Reset Write Actions
                    </button>
                  </div>
                </div>

                {/* Table list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-700 border-b border-slate-200 select-none">
                        <th className="p-3.5 border-r border-slate-150">S.No</th>
                        <th className="p-3.5 border-r border-slate-150">Organization Module Name</th>
                        <th className="p-3.5 border-r border-slate-150">Module Category</th>
                        <th className="p-3.5 text-center border-r border-slate-150 w-24">Create (C)</th>
                        <th className="p-3.5 text-center border-r border-slate-150 w-24">Read (R)</th>
                        <th className="p-3.5 text-center border-r border-slate-150 w-24">Update (U)</th>
                        <th className="p-3.5 text-center w-24">Delete (D)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ORGANIZATION_EXCLUSIVE_MODULES.map((mod, idx) => {
                        const permissions = rolePermissions[activeOrgRole]?.[mod.key] || { c: false, r: true, u: false, d: false };
                        return (
                          <tr key={mod.key} className="border-b border-slate-150 hover:bg-slate-50/50 text-[11px] font-bold text-slate-755">
                            <td className="p-3.5 border-r border-slate-150 text-slate-400 text-center font-mono w-12">{idx + 22}</td>
                            <td className="p-3.5 border-r border-slate-150 text-slate-800 font-bold">{mod.label}</td>
                            <td className="p-3.5 border-r border-slate-150">
                              <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-250">
                                {mod.category}
                              </span>
                            </td>
                            {/* Create check */}
                            <td className="p-3.5 text-center border-r border-slate-150 bg-slate-50/30">
                              <input 
                                type="checkbox" 
                                checked={permissions.c} 
                                onChange={() => handlePermissionToggle(activeOrgRole, mod.key, 'c')}
                                className="h-4 w-4 text-blue-650 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            {/* Read check */}
                            <td className="p-3.5 text-center border-r border-slate-150 bg-slate-50/30">
                              <input 
                                type="checkbox" 
                                checked={permissions.r} 
                                onChange={() => handlePermissionToggle(activeOrgRole, mod.key, 'r')}
                                className="h-4 w-4 text-blue-650 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            {/* Update check */}
                            <td className="p-3.5 text-center border-r border-slate-150 bg-slate-50/30">
                              <input 
                                type="checkbox" 
                                checked={permissions.u} 
                                onChange={() => handlePermissionToggle(activeOrgRole, mod.key, 'u')}
                                className="h-4 w-4 text-blue-650 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            {/* Delete check */}
                            <td className="p-3.5 text-center bg-slate-50/30">
                              <input 
                                type="checkbox" 
                                checked={permissions.d} 
                                onChange={() => handlePermissionToggle(activeOrgRole, mod.key, 'd')}
                                className="h-4 w-4 text-red-650 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ADMINS SECTION */}
          {sectorTab === 'admins' && (
            <div className="space-y-6">
              
              {/* Informative Header Banner */}
              <div className="bg-blue-50/60 border border-blue-150 rounded-2xl p-4 flex items-start space-x-3 text-left">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-[#0f417a]">Administrative Class Access Controls</p>
                  <p className="text-slate-600 mt-1 font-semibold leading-relaxed">
                    Administrative accounts have pre-configured global permission profiles. Standard role permission matrices cannot overwrite these roles, ensuring system security and structural GIGW compliance.
                  </p>
                </div>
              </div>

              {/* Admin Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Super Admin Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 text-left space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-[9px] font-black uppercase rounded border border-red-150 tracking-wider">
                        Full Control
                      </span>
                      <Shield className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">Super Admin</h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      Core administrative user account. Holds global oversight of the portal telemetry.
                    </p>
                  </div>
                  <ul className="text-[10px] text-slate-655 space-y-2 font-bold bg-slate-50 p-3 rounded-2xl border border-slate-150">
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>Manage all sector permissions</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>Edit & Delete user accounts</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>Full CRUD across all modules</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <span className="block text-center py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold border border-slate-200">
                      ✓ System Hardcoded
                    </span>
                  </div>
                </div>

                {/* 2. NTCPWC Admin Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 text-left space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-[#0f417a]/10 text-blue-700 text-[9px] font-black uppercase rounded border border-blue-200 tracking-wider">
                        Co-Admin Control
                      </span>
                      <Settings className="h-5 w-5 text-blue-755" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">NTCPWC Admin</h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      National Technology Centre for Ports, Waterways and Coasts admin role.
                    </p>
                  </div>
                  <ul className="text-[10px] text-slate-655 space-y-2 font-bold bg-slate-50 p-3 rounded-2xl border border-slate-150">
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>Global viewing capabilities</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>Audit organizational metrics</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>Configure client-side telemetry</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <span className="block text-center py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold border border-slate-200">
                      ✓ Administrator Cleared
                    </span>
                  </div>
                </div>

                {/* 3. View Only Admin Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 text-left space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black uppercase rounded border border-amber-200 tracking-wider">
                        Auditor Level
                      </span>
                      <Lock className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">View Only Admin</h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      Auditor role with access to view Super Admin views, but with no CRUD privileges.
                    </p>
                  </div>
                  <ul className="text-[10px] text-slate-655 space-y-2 font-bold bg-amber-50/50 p-3 rounded-2xl border border-amber-250/70">
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      <span>View Super Admin Dashboard</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      <span className="text-red-700 line-through">NO Create permissions</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      <span className="text-red-700 line-through">NO Edit or Delete permissions</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <span className="block text-center py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold border border-amber-200">
                      🔒 Read Only Access Enforced
                    </span>
                  </div>
                </div>

              </div>

              {/* View Only Admin Read Only Matrix display to visually verify */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-left space-y-3">
                <h3 className="text-xs font-black text-[#0f417a] uppercase tracking-wide">View Only Admin - Live Simulation Access Control Matrix</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Below is the read-only authorization mapping for the Auditor. Click checks to see access block verification:</p>
                <div className="border border-slate-200 rounded-2xl overflow-hidden mt-3">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                      <tr>
                        <th className="p-3 border-r border-slate-150">Module Name</th>
                        <th className="p-3 text-center border-r border-slate-150 w-24">Create (C)</th>
                        <th className="p-3 text-center border-r border-slate-150 w-24">Read (R)</th>
                        <th className="p-3 text-center border-r border-slate-150 w-24">Update (U)</th>
                        <th className="p-3 text-center w-24">Delete (D)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-150 font-bold text-slate-700 text-[11px]">
                        <td className="p-3 border-r border-slate-150 bg-slate-50 font-black">CPGRAMS (Ministry Excl.)</td>
                        <td className="p-3 text-center border-r border-slate-150"><input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed opacity-50" /></td>
                        <td className="p-3 text-center border-r border-slate-150"><input type="checkbox" checked disabled className="h-4 w-4 cursor-not-allowed text-blue-600" /></td>
                        <td className="p-3 text-center border-r border-slate-150"><input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed opacity-50" /></td>
                        <td className="p-3 text-center"><input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed opacity-50" /></td>
                      </tr>
                      <tr className="border-t border-slate-150 font-bold text-slate-700 text-[11px]">
                        <td className="p-3 border-r border-slate-150 bg-slate-50 font-black">Projects (Organization Excl.)</td>
                        <td className="p-3 text-center border-r border-slate-150"><input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed opacity-50" /></td>
                        <td className="p-3 text-center border-r border-slate-150"><input type="checkbox" checked disabled className="h-4 w-4 cursor-not-allowed text-blue-600" /></td>
                        <td className="p-3 text-center border-r border-slate-150"><input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed opacity-50" /></td>
                        <td className="p-3 text-center"><input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed opacity-50" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB AREA 2: USER DIRECTORY REGISTRY */}
      {activeTab === 'directory' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          {/* Controls row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user registry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              />
            </div>

            {/* Filter & Register */}
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <div className="relative">
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="text-xs pl-3 pr-8 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold appearance-none cursor-pointer"
                >
                  <option value="All">All Roles</option>
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-blue-650 hover:bg-blue-700 text-white rounded-xl shadow-sm text-xs font-bold transition flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                <span>Register User</span>
              </button>
            </div>
          </div>

          {/* User Table Registry using AG Grid */}
          <div className="ag-theme-quartz border border-slate-200 rounded-2xl overflow-hidden" style={{ height: '400px', width: '100%' }}>
            <AgGridReact
              theme="legacy"
              rowData={filteredUsers}
              columnDefs={colDefs}
              rowHeight={50}
              headerHeight={46}
              suppressColumnVirtualisation={true}
              autoSizeStrategy={{ type: 'fitCellContents' }}
            />
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden transform transition-all animate-scale-in">
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
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
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
                      placeholder="e.g. email@mopsw.test.local"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="px-4 py-2 border border-slate-250 rounded-lg text-slate-655 hover:bg-slate-50 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-lg shadow cursor-pointer font-bold"
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
