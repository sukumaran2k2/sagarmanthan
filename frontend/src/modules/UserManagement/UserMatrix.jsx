import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard,
  Users,
  Shield,
  FolderGit,
  Activity,
  Database,
  Bell,
  AlertTriangle,
  FileSpreadsheet,
  FolderKanban,
  Coins,
  BarChart3,
  UserCheck,
  GraduationCap,
  UserPlus,
  Landmark,
  FolderOpen,
  ClipboardList,
  ShoppingCart,
  MessageSquare,
  FileText,
  Star,
  Megaphone,
  Scale,
  BookOpen,
  Milestone,
  FilePieChart,
  Ship,
  Settings,
  Globe,
  Flag,
  FileCheck,
  Layers,
  PenTool,
  CheckSquare,
  Compass,
  Anchor,
  Edit,
  RotateCcw
} from 'lucide-react';

const ORG_LIST = [
  'Ministry of Ports, Shipping and Waterways',
  'Major Ports',
  'CSL',
  'SCI',
  'DGLL',
  'DGS',
  'ALHW',
  'IWAI',
  'DCI',
  'IMU',
  'IPRCL',
  'SDCL',
  'Maritime Boards',
  'Other Organisations',
  'IPA',
  'CMEC',
  'CAG'
];

const FULL_MODULE_LIST = [
  'Dashboard', 'User List', 'Role Authorization', 'Assign Projects', 'User Activity', 'Master Management', 'Set Alerts', 'Escalation Matrix', 'Proposal List', 'Project List', 'View Proposals- MoPSW', 'View Project Drop Requests', 'Budget', 'Capex', 'KPI-Major Ports', 'KPI - IWAI', 'HR Management', 'Young Professionals', 'Consultant Appointment', 'Asset Management', 'File and Receipt Pendency', 'File Disposal', 'Attendance', 'GEM Procurements', 'CPGRAMS', 'Cabinet Notes - MoPSW', 'Cabinet Notes - Other Ministries', 'VIP Reference', 'Media Outreach', 'Parlimentary Issues', 'Audit Paras', 'Court Cases', 'Bills/Pre-Constitution Act', 'MIV 2030', 'Amrit Kaal Vision 2047', 'Reports', 'View Proposal Drop Request', 'IWAI Master', 'Issues Tracking', 'Expenditure', 'E Office', 'Knowledge Repository', 'Project Report', 'One Vision One Document', 'Official Foreign Visit', 'Cruise Shipping', 'Flagged Ships', 'GMIS-MoU', 'Import On FOB Basis', 'Acts & Rules', 'MoM of PSW Meetings', 'User Management', 'KPI - DGLL', 'KPI - CSL', 'KPI - IMU', 'KPI - SCI', 'KPI - CMEC', 'KPI - DGS', 'Inter State & Inter Ministerial', 'Module Management', 'Form Builder', 'Review Items', 'MoPSW Tracker'
];

const MODULES_MASTER = [
  {id:'attendance', name:'Attendance'},
  {id:'gem', name:'GEM Procurements'},
  {id:'cpgrams', name:'CPGRAMS'},
  {id:'cn_mopsw', name:'Cabinet Notes - MoPSW'},
  {id:'cn_other', name:'Cabinet Notes - Other Ministries'},
  {id:'vip', name:'VIP Reference'},
  {id:'eoffice', name:'E Office'},
  {id:'media', name:'Media Outreach'},
  {id:'parl', name:'Parliamentary Issues'},
  {id:'audit', name:'Audit Paras'},
  {id:'interstate', name:'Inter State & Inter Ministerial'},
  {id:'foreign', name:'Foreign Visit'},
  {id:'cruise', name:'Cruise Shipping'},
  {id:'flagged', name:'Flagged Ships / FOB Basis'},
  {id:'mom', name:'MOM Of PSW Meetings'},
  {id:'review', name:'Review Items'}
];

const PERMS = ['create','read','update','delete'];

const USERS_RAW = [
  {name:'Samarth Verma',email:'samarth.verma1@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Sandeep Gupta',email:'sandeepkr.gupta@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Rajesh Sharma',email:'rajeshsharma-cwc@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'APS Sirohi',email:'ajay.sirohi@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Other User'},
  {name:'Super Admin',email:'SUPERADMIN',org:'Ministry of Ports,Shipping and Waterways',role_original:'SUPERADMIN'},
  {name:'Rajesh Asati',email:'rajesh.asati@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Mandeep Singh Randhawa',email:'director-ship@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Vinay Prajapati',email:'vinay.prajapati@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Shailendra Kureel',email:'shailendra.kureel@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'test',email:'test1@gmail.com',org:'Jawaharlal Nehru Port Authority',role_original:'Organisation-Senior Officer'},
  {name:'Vipul Singhal',email:'dir1-psw@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'R. Lakshmanan',email:'jscord-psw@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'N Vinod Kumar',email:'chairman@mptgoa.gov.in',org:'Mormugao Port Authority',role_original:'Organisation-Senior Officer'},
  {name:'Test 2',email:'test2@gmail.com',org:'Jawaharlal Nehru Port Authority',role_original:'Organisation-Senior Officer'},
  {name:'Kundan Bharti Sinha',email:'kb.sinha@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'R. K. Sinha',email:'as-psw@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Sushil Kumar Singh',email:'js-ports@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Sunil Kumar Singh',email:'sunilk.singh@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'H.N Aswath',email:'hn.aswath@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Sanjay Kumar',email:'sanjay.kalonia@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Bhushan Kumar',email:'bhushan.k@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Sunil Paliwal',email:'chairman@chennaiport.gov.in',org:'Chennai Port Authority',role_original:'Organisation- Senior Officer'},
  {name:'P. L. Haranadh',email:'chm@paradipport.gov.in',org:'Paradip Port Authority',role_original:'Organisation- Senior Officer'},
  {name:'Gaurav Dayal',email:'chairman@jnport.gov.in',org:'Jawaharlal Nehru Port Authority',role_original:'Organisation- Senior Officer'},
  {name:'sunand Gs',email:'sunand.g1@gmail.com',org:'Visakhapatnam Port Authority',role_original:'Organisation-Nodal Officer'},
  {name:'Chitra Nayak',email:'chitra.nayak@mptgoa.gov.in',org:'Mormugao Port Authority',role_original:'Organisation-Nodal Officer'},
  {name:'Tarannum Havaldar',email:'nodalofficermedia.mpt@gmail.com',org:'Mormugao Port Authority',role_original:'Organisation-Nodal Officer'}
];

function normalizeRole(rawRole = '') {
  const r = String(rawRole).toLowerCase();
  if (r.includes('nodal officer')) return 'Nodal Officer';
  if (r.includes('senior officer')) return 'Senior Officer';
  return 'Wing / Division User';
}
function normalizeOrg(v='') { return String(v).replace(/\s+/g,' ').trim(); }
function normalizeOrgCategory(org=''){
  const s = String(org).toLowerCase();
  if (s.includes('ministry of ports')) return 'MoPSW';
  return 'Port Organisation';
}
function roleClassName(role='') {
  return `role-${String(role).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`;
}
function colorFromString(s=''){ let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h)+s.charCodeAt(i); const hue=Math.abs(h)%360; return `hsl(${hue} 70% 45%)`; }
function getInits(n){ return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }

const getModuleIconAndColor = (name) => {
  const n = name.toLowerCase();
  
  if (n.includes('dashboard')) return { Icon: LayoutDashboard, color: '#3B82F6', bg: '#EFF6FF' };
  if (n.includes('user list') || n.includes('user management')) return { Icon: Users, color: '#10B981', bg: '#E6F4EA' };
  if (n.includes('role') || n.includes('authorization')) return { Icon: Shield, color: '#6366F1', bg: '#EEF2FF' };
  if (n.includes('assign')) return { Icon: FolderGit, color: '#F59E0B', bg: '#FFFBEB' };
  if (n.includes('activity')) return { Icon: Activity, color: '#EF4444', bg: '#FEF2F2' };
  if (n.includes('master')) return { Icon: Database, color: '#8B5CF6', bg: '#F5F3FF' };
  if (n.includes('alert')) return { Icon: Bell, color: '#EC4899', bg: '#FDF2F8' };
  if (n.includes('escalation')) return { Icon: AlertTriangle, color: '#D97706', bg: '#FFF7ED' };
  
  if (n.includes('proposal list') || n.includes('proposal drop')) return { Icon: FileSpreadsheet, color: '#059669', bg: '#ECFDF5' };
  if (n.includes('project list') || n.includes('project drop') || n.includes('projects')) return { Icon: FolderKanban, color: '#2563EB', bg: '#EFF6FF' };
  if (n.includes('budget') || n.includes('capex') || n.includes('expenditure')) return { Icon: Coins, color: '#D97706', bg: '#FEF3C7' };
  if (n.includes('kpi')) return { Icon: BarChart3, color: '#0D9488', bg: '#F0FDFA' };
  if (n.includes('hr management')) return { Icon: UserCheck, color: '#06B6D4', bg: '#ECFEFF' };
  if (n.includes('young professional')) return { Icon: GraduationCap, color: '#EC4899', bg: '#FDF2F8' };
  if (n.includes('consultant')) return { Icon: UserPlus, color: '#8B5CF6', bg: '#F5F3FF' };
  if (n.includes('asset')) return { Icon: Landmark, color: '#B45309', bg: '#FEF3C7' };
  
  if (n.includes('file') || n.includes('pendency') || n.includes('receipt') || n.includes('disposal') || n.includes('e office')) return { Icon: FolderOpen, color: '#0284C7', bg: '#F0F9FF' };
  if (n.includes('attendance')) return { Icon: ClipboardList, color: '#16A34A', bg: '#F0FDF4' };
  if (n.includes('gem')) return { Icon: ShoppingCart, color: '#4F46E5', bg: '#EEF2FF' };
  if (n.includes('cpgrams')) return { Icon: MessageSquare, color: '#E11D48', bg: '#FFF1F2' };
  if (n.includes('cabinet')) return { Icon: FileText, color: '#2563EB', bg: '#EFF6FF' };
  if (n.includes('vip')) return { Icon: Star, color: '#EAB308', bg: '#FEF9C3' };
  if (n.includes('media')) return { Icon: Megaphone, color: '#EA580C', bg: '#FFECE5' };
  
  if (n.includes('parliamentary') || n.includes('parlimentary') || n.includes('audit')) return { Icon: Landmark, color: '#475569', bg: '#F1F5F9' };
  if (n.includes('court')) return { Icon: Scale, color: '#64748B', bg: '#F8FAFC' };
  if (n.includes('bill') || n.includes('act') || n.includes('rules')) return { Icon: BookOpen, color: '#7C3AED', bg: '#F5F3FF' };
  if (n.includes('vision') || n.includes('miv') || n.includes('milestone')) return { Icon: Milestone, color: '#0369A1', bg: '#F0F9FF' };
  
  if (n.includes('report') || n.includes('reports')) return { Icon: FilePieChart, color: '#D946EF', bg: '#FDF4FF' };
  if (n.includes('iwai') || n.includes('ship') || n.includes('cruise') || n.includes('ships') || n.includes('fob')) return { Icon: Ship, color: '#1D4ED8', bg: '#EFF6FF' };
  if (n.includes('tracking') || n.includes('tracker')) return { Icon: Compass, color: '#B45309', bg: '#FFF7ED' };
  if (n.includes('knowledge')) return { Icon: BookOpen, color: '#15803D', bg: '#F0FDF4' };
  
  if (n.includes('mou') || n.includes('gmis')) return { Icon: FileCheck, color: '#047857', bg: '#E6F4EA' };
  if (n.includes('mom') || n.includes('meetings')) return { Icon: ClipboardList, color: '#6366F1', bg: '#EEF2FF' };
  if (n.includes('module')) return { Icon: Layers, color: '#A855F7', bg: '#FAF5FF' };
  if (n.includes('form builder')) return { Icon: PenTool, color: '#EC4899', bg: '#FDF2F8' };
  if (n.includes('review')) return { Icon: CheckSquare, color: '#16A34A', bg: '#F0FDF4' };

  // Fallback
  return { Icon: FileText, color: '#64748B', bg: '#F1F5F9' };
};

const getOrgIconAndColor = (name) => {
  const n = name.toLowerCase();
  
  if (n.includes('ministry')) return { Icon: Landmark, color: '#2563EB', bg: '#EFF6FF' };
  if (n.includes('major ports') || n.includes('boards')) return { Icon: Anchor, color: '#0D9488', bg: '#F0FDFA' };
  if (n.includes('csl') || n.includes('sci') || n.includes('dci') || n.includes('alhw') || n.includes('iwai')) return { Icon: Ship, color: '#0284C7', bg: '#F0F9FF' };
  if (n.includes('dgll')) return { Icon: Milestone, color: '#D97706', bg: '#FEF3C7' };
  if (n.includes('dgs')) return { Icon: Shield, color: '#16A34A', bg: '#F0FDF4' };
  if (n.includes('imu')) return { Icon: GraduationCap, color: '#EC4899', bg: '#FDF2F8' };
  if (n.includes('iprcl') || n.includes('sdcl')) return { Icon: Settings, color: '#4F46E5', bg: '#EEF2FF' };
  if (n.includes('cag')) return { Icon: Scale, color: '#E11D48', bg: '#FFF1F2' };
  if (n.includes('ipa') || n.includes('cmec')) return { Icon: Layers, color: '#8B5CF6', bg: '#F5F3FF' };
  
  return { Icon: Globe, color: '#64748B', bg: '#F1F5F9' };
};

const getRoleImage = (roleName) => {
  const r = roleName.toLowerCase();
  if (r.includes('all')) return 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=300&q=80';
  if (r.includes('super') || r.includes('admin')) return 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=300&q=80';
  if (r.includes('wing') || r.includes('head') || r.includes('director')) return 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80';
  if (r.includes('nodal')) return 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80';
  if (r.includes('senior') || r.includes('officer')) return 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=300&q=80';
  return 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=300&q=80';
};

// Initialize users array once
const initialUsers = USERS_RAW.map((r, i) => {
  const u = {
    id: i + 1,
    name: r.name,
    email: r.email,
    org: normalizeOrg(r.org),
    orgCategory: normalizeOrgCategory(r.org),
    role: normalizeRole(r.role_original),
    color: colorFromString(`${r.name}|${r.email}|${r.org}`),
    perms: {}
  };
  MODULES_MASTER.forEach(m => {
    u.perms[m.id] = {create:false,read:false,update:false,delete:false};
  });
  return u;
});

export default function UserMatrix() {
  const [activeMainTab, setActiveMainTab] = useState('users');

  // ---- STATE FOR USER PERMISSIONS TAB ----
  const [users, setUsers] = useState(initialUsers);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [draft, setDraft] = useState({});

  // ---- STATE FOR MODULE PERMISSIONS TAB ----
  const [selectedModuleOrg, setSelectedModuleOrg] = useState(ORG_LIST[0]);
  const [orgModuleState, setOrgModuleState] = useState(() => {
    const initial = {};
    ORG_LIST.forEach(org => {
      initial[org] = {};
      FULL_MODULE_LIST.forEach(m => initial[org][m] = true);
    });
    return initial;
  });

  // ---- STATE FOR USER DATABASE TAB ----
  const [dbUserList, setDbUserList] = useState([]);
  const [userListSearch, setUserListSearch] = useState('');
  const [selectedDbRole, setSelectedDbRole] = useState('All');
  const [dbLoading, setDbLoading] = useState(false);
  
  // Modal Edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formTitle, setFormTitle] = useState('Mr');
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Master lists for editing
  const [masterOrgs, setMasterOrgs] = useState([]);
  const [masterRoles, setMasterRoles] = useState([]);

  // ---- COMMON TOAST STATE ----
  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState('#3B82F6');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg, color = '#3B82F6') => {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // ---- FETCH USER DATA AND DROPDOWNS FROM DATABASE ----
  useEffect(() => {
    if (activeMainTab === 'userlist') {
      setDbLoading(true);
      
      // Load user list
      axios.get('http://localhost:3000/userlist')
        .then(res => {
          setDbUserList(res.data);
          setDbLoading(false);
        })
        .catch(err => {
          console.error("Error loading userlist:", err);
          showToast("⚠ Failed to load users from database", "#EF4444");
          setDbLoading(false);
        });

      // Load master roles
      axios.get('http://localhost:3000/mmt-dropdown/tbl_role')
        .then(res => setMasterRoles(res.data))
        .catch(err => console.error("Error loading roles:", err));

      // Load master organisations
      axios.get('http://localhost:3000/mmt-dropdown/mmt_organisation')
        .then(res => setMasterOrgs(res.data))
        .catch(err => console.error("Error loading organisations:", err));
    }
  }, [activeMainTab]);

  // Filtered DB users based on search criteria and card filter
  const filteredDbUsers = useMemo(() => {
    let result = dbUserList;

    // Filter by Card Role ID
    if (selectedDbRole !== 'All') {
      result = result.filter(u => u.role_id === Number(selectedDbRole));
    }

    // Filter by Search Query
    const q = userListSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(u => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const role = (u.role_name || '').toLowerCase();
        const org = (u.organisation_name || '').toLowerCase();
        const desig = (u.designation || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q) || org.includes(q) || desig.includes(q) || phone.includes(q);
      });
    }
    return result;
  }, [dbUserList, userListSearch, selectedDbRole]);

  // ---- LOGIC FOR USER PERMISSIONS TAB ----
  const categories = useMemo(() => [...new Set(users.map(u=>u.orgCategory))].sort((a,b)=>a.localeCompare(b)), [users]);
  const orgs = useMemo(() => {
    return [...new Set(users.filter(u => selectedCategory === 'all' ? false : u.orgCategory === selectedCategory).map(u=>u.org))].sort((a,b)=>a.localeCompare(b));
  }, [users, selectedCategory]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter(u => {
      const matchCat = (selectedCategory === 'all' || u.orgCategory === selectedCategory);
      const matchOrg = (selectedOrg === 'all' || u.org === selectedOrg);
      const matchRole = (selectedRole === 'all' || u.role === selectedRole);
      const matchSearch = !q || u.name.toLowerCase().includes(q);
      return matchCat && matchOrg && matchRole && matchSearch;
    });
  }, [users, selectedCategory, selectedOrg, selectedRole, searchTerm]);

  const selectedUsers = useMemo(() => filteredUsers.filter(u => selectedIds.has(u.id)), [filteredUsers, selectedIds]);
  const activeModules = selectedCategory !== 'all' ? MODULES_MASTER : [];

  useEffect(() => {
    const newDraft = {};
    activeModules.forEach(m => {
      newDraft[m.id] = {};
      PERMS.forEach(p => {
        if (selectedUsers.length === 0) {
          newDraft[m.id][p] = false;
        } else {
          const vals = selectedUsers.map(u => u.perms[m.id][p]);
          const allTrue = vals.every(v => v);
          const allFalse = vals.every(v => !v);
          newDraft[m.id][p] = allTrue ? true : (allFalse ? false : 'mixed');
        }
      });
    });
    setDraft(newDraft);
  }, [selectedUsers, activeModules]);

  const handleOrgCatChange = (e) => {
    const cat = e.target.value;
    setSelectedCategory(cat);
    setSelectedOrg('all');
    setSelectedRole('all');
    if (cat === 'all') {
      setSelectedIds(new Set());
    } else {
      showToast(`📦 Modules fetched for ${cat}`, '#3B82F6');
    }
  };

  useEffect(() => {
    if (selectedCategory !== 'all') {
      const currentFiltered = users.filter(u => 
        (selectedCategory === 'all' || u.orgCategory === selectedCategory) &&
        (selectedOrg === 'all' || u.org === selectedOrg) &&
        (selectedRole === 'all' || u.role === selectedRole)
      );
      setSelectedIds(new Set(currentFiltered.map(u => u.id)));
    }
  }, [selectedCategory, selectedOrg, selectedRole, users]);

  const toggleUser = (id, additive, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (additive) {
        if (next.has(id)) next.delete(id); else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
    setSelectedIds(prev => {
      const next = new Set();
      if (!allSelected) {
        filteredUsers.forEach(u => next.add(u.id));
      }
      return next;
    });
  };

  const handleCheck = (modId, perm, val) => {
    setDraft(prev => ({
      ...prev,
      [modId]: { ...prev[modId], [perm]: val }
    }));
    const clr = {create:'#10B981',read:'#3B82F6',update:'#F59E0B',delete:'#EF4444'}[perm];
    const mod = MODULES_MASTER.find(m => m.id === modId)?.name || modId;
    showToast(`${val?'✅':'❌'} ${perm[0].toUpperCase()+perm.slice(1)} · ${mod}`, clr);
  };

  const setAll = (val) => {
    const newDraft = { ...draft };
    activeModules.forEach(m => {
      newDraft[m.id] = { ...newDraft[m.id] };
      PERMS.forEach(p => newDraft[m.id][p] = val);
    });
    setDraft(newDraft);
    showToast(val ? '✅ All permissions set to granted' : '❌ All permissions set to revoked', val ? '#10B981' : '#EF4444');
  };

  const colAll = (perm) => {
    const allOn = activeModules.every(m => draft[m.id] && draft[m.id][perm] === true);
    const newVal = !allOn;
    const newDraft = { ...draft };
    activeModules.forEach(m => {
      newDraft[m.id] = { ...newDraft[m.id], [perm]: newVal };
    });
    setDraft(newDraft);
    const clr = {create:'#10B981',read:'#3B82F6',update:'#F59E0B',delete:'#EF4444'}[perm];
    showToast(`${newVal?'✅':'❌'} ${perm[0].toUpperCase()+perm.slice(1)} toggled for all modules`, clr);
  };

  const handleSave = () => {
    if (selectedUsers.length === 0) { showToast('⚠ No users selected','#F59E0B'); return; }
    
    setUsers(prev => prev.map(u => {
      if (!selectedIds.has(u.id)) return u;
      const updatedPerms = { ...u.perms };
      activeModules.forEach(m => {
        PERMS.forEach(p => {
          const v = draft[m.id]?.[p];
          if (v !== 'mixed') {
            updatedPerms[m.id][p] = v;
          }
        });
      });
      return { ...u, perms: updatedPerms };
    }));
    
    showToast(selectedUsers.length === 1 ? `💾 Saved for ${selectedUsers[0].name.split(' ')[0]}` : `💾 Saved for ${selectedUsers.length} users`, '#10B981');
  };

  const allSel = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
  const someSel = filteredUsers.some(u => selectedIds.has(u.id));

  let grantedCount = 0, mixedCount = 0;
  if (activeModules.length > 0 && Object.keys(draft).length > 0) {
    activeModules.forEach(m => PERMS.forEach(p => {
      if (draft[m.id]?.[p] === true) grantedCount++;
      else if (draft[m.id]?.[p] === 'mixed') mixedCount++;
    }));
  }

  // ---- LOGIC FOR MODULE PERMISSIONS TAB ----
  const toggleOrgModule = (org, mod, val) => {
    setOrgModuleState(prev => ({
      ...prev,
      [org]: { ...prev[org], [mod]: val }
    }));
    showToast(`${val?'✅':'❌'} ${mod}`, val ? '#10B981' : '#EF4444');
  };

  const setAllOrgModules = (val) => {
    const next = {...orgModuleState};
    FULL_MODULE_LIST.forEach(m => next[selectedModuleOrg][m] = val);
    setOrgModuleState(next);
    showToast(val ? '✅ All modules enabled' : '❌ All modules disabled', val ? '#10B981' : '#EF4444');
  };

  const saveModulePermissions = () => {
    showToast(`💾 Saved permissions for ${selectedModuleOrg}`, '#10B981');
  };

  // ---- USER LIST ACTIONS LOGIC ----
  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormTitle(u.title || 'Mr');
    setFormName(u.name || '');
    setFormDesignation(u.designation || '');
    setFormOrg(u.organisation_id || '');
    setFormRole(u.role_id || '');
    setFormPhone(u.phone || '');
    setFormEmail(u.email || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateUserSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) { showToast('⚠ Name is required', '#F59E0B'); return; }
    if (!formEmail.trim()) { showToast('⚠ Email is required', '#F59E0B'); return; }
    if (!formOrg) { showToast('⚠ Organisation is required', '#F59E0B'); return; }
    if (!formRole) { showToast('⚠ Role is required', '#F59E0B'); return; }

    const payload = {
      userID: editingUser.user_id,
      title: formTitle,
      name: formName,
      designation: formDesignation,
      role: formRole,
      organisation: formOrg,
      wingId: editingUser.wing_id || null,
      divisionId: editingUser.division_id || null,
      email: formEmail,
      phone: formPhone,
      loginUser: 'Admin'
    };

    axios.put('http://localhost:3000/edituser', payload)
      .then(() => {
        showToast('✅ User updated successfully', '#10B981');
        setIsEditModalOpen(false);
        // Reload userlist
        axios.get('http://localhost:3000/userlist')
          .then(res => setDbUserList(res.data));
      })
      .catch(err => {
        console.error("Error updating user:", err);
        showToast('❌ Failed to update user', '#EF4444');
      });
  };

  const toggleUserStatus = (u, checked) => {
    const newStatus = checked ? 1 : 0;
    axios.put('http://localhost:3000/user-status', {
      userID: u.user_id,
      userStatus: newStatus,
      loginUser: 'Admin'
    })
      .then(() => {
        setDbUserList(prev => prev.map(item => item.user_id === u.user_id ? { ...item, status: newStatus } : item));
        showToast(`✅ Status updated to ${newStatus ? 'Active' : 'Inactive'}`, '#10B981');
      })
      .catch(err => {
        console.error("Error updating user status:", err);
        showToast('❌ Failed to update status', '#EF4444');
      });
  };

  const handleResetPassword = (u) => {
    const newPass = window.prompt(`Reset password for ${u.name}. Enter new password:`, 'Sagarmanthan@123');
    if (newPass === null) return;
    if (!newPass.trim()) { showToast('⚠ Password cannot be empty', '#F59E0B'); return; }

    axios.post('http://localhost:3000/changepassword', {
      userID: u.user_id,
      confirmPassword: newPass,
      loginUser: 'Admin'
    })
      .then(() => {
        showToast('✅ Password reset successfully', '#10B981');
      })
      .catch(err => {
        console.error("Error resetting password:", err);
        showToast('❌ Failed to reset password', '#EF4444');
      });
  };

  return (
    <div className="user-matrix-container w-full h-[85vh] bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans relative overflow-hidden rounded-xl border border-slate-200">
      <style>{`
        .user-matrix-container *, .user-matrix-container *::before, .user-matrix-container *::after { box-sizing: border-box; }
        .user-matrix-container .topbar { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 14px 28px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .user-matrix-container .topbar-brand { display: flex; align-items: center; gap: 9px; margin-right: 8px; }
        .user-matrix-container .topbar-brand .dot { width: 10px; height: 10px; border-radius: 50%; background: #3B82F6; }
        .user-matrix-container .topbar-brand h1 { font-size: 1rem; font-weight: 700; color: #1E293B; margin:0; }
        .user-matrix-container .filter-item { display: flex; align-items: center; gap: 8px; }
        .user-matrix-container .filter-item label { font-size: .8rem; font-weight: 600; color: #64748B; white-space: nowrap; }
        .user-matrix-container select { padding: 7px 30px 7px 11px; border: 1.5px solid #E2E8F0; border-radius: 7px; font-size: .85rem; color: #1E293B; background: #fff; cursor: pointer; outline: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center; transition: border-color .15s, opacity .15s; }
        .user-matrix-container select:focus { border-color: #3B82F6; }
        .user-matrix-container select:disabled { opacity: .55; cursor: not-allowed; }
        .user-matrix-container .sep { width: 1px; height: 28px; background: #E2E8F0; }
        .user-matrix-container .layout { display: flex; flex: 1; min-height: 0; }
        .user-matrix-container .sidebar { width: 270px; flex-shrink: 0; background: #fff; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; }
        .user-matrix-container .sidebar-head { padding: 12px 14px; border-bottom: 1px solid #F1F5F9; }
        .user-matrix-container .sidebar-head-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .user-matrix-container .sidebar-title { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #94A3B8; }
        .user-matrix-container .user-count-badge { background: #EFF6FF; color: #3B82F6; font-size: .68rem; font-weight: 700; border-radius: 20px; padding: 2px 7px; }
        .user-matrix-container .select-all-row { display: flex; align-items: center; gap: 9px; padding: 7px 8px; background: #F8FAFC; border-radius: 7px; cursor: pointer; user-select: none; margin-top: 8px; }
        .user-matrix-container .select-all-row:hover { background: #F1F5F9; }
        .user-matrix-container .select-all-row .sa-label { font-size: .8rem; font-weight: 600; color: #475569; }
        .user-matrix-container .select-all-row .sa-hint { font-size: .7rem; color: #94A3B8; margin-left: auto; }
        .user-matrix-container .search-wrap { margin-top: 10px; }
        .user-matrix-container .search-input { width: 100%; padding: 8px 10px; border: 1.5px solid #E2E8F0; border-radius: 7px; font-size: .82rem; color: #1E293B; outline: none; background: #fff; }
        .user-matrix-container .search-input:focus { border-color: #3B82F6; }
        .user-matrix-container .search-hint { font-size: .68rem; color: #94A3B8; margin-top: 5px; }
        .user-matrix-container .user-list { flex: 1; overflow-y: auto; padding: 6px 0; }
        .user-matrix-container .user-item { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; transition: background .1s; border-left: 3px solid transparent; }
        .user-matrix-container .user-item:hover { background: #F8FAFC; }
        .user-matrix-container .user-item.selected { background: #EFF6FF; border-left-color: #3B82F6; }
        .user-matrix-container .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .7rem; color: #fff; flex-shrink: 0; }
        .user-matrix-container .user-info { min-width: 0; flex: 1; }
        .user-matrix-container .user-name { font-size: .84rem; font-weight: 600; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-matrix-container .user-role { font-size: .71rem; color: #94A3B8; }
        .user-matrix-container .sel-cb { -webkit-appearance:none; appearance:none; width:18px; height:18px; border-radius:5px; border:2px solid #CBD5E1; cursor:pointer; position:relative; transition:all .15s; flex-shrink:0; }
        .user-matrix-container .sel-cb:hover:not(:checked){ border-color:#94A3B8; }
        .user-matrix-container .sel-cb:checked{ background:#3B82F6; border-color:#3B82F6; }
        .user-matrix-container .sel-cb:checked::after{ content:''; position:absolute; top:2px; left:5px; width:5px; height:9px; border:2px solid #fff; border-top:none; border-left:none; transform:rotate(45deg); }
        .user-matrix-container .sel-cb.indeterminate{ background:#93C5FD; border-color:#93C5FD; }
        .user-matrix-container .sel-cb.indeterminate::after{ content:''; position:absolute; top:7px; left:3px; width:10px; height:0; border:1px solid #fff; transform:none; border-radius:1px; }
        .user-matrix-container .main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
        .user-matrix-container .user-banner { padding: 15px 24px; background: #fff; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .user-matrix-container .user-banner-left { display: flex; align-items: center; gap: 12px; }
        .user-matrix-container .banner-avatar { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .9rem; color: #fff; flex-shrink:0; }
        .user-matrix-container .banner-name { font-weight: 700; font-size: 1rem; display:flex; align-items:center; flex-wrap:wrap; gap:2px; }
        .user-matrix-container .banner-sub { font-size: .78rem; color: #94A3B8; margin-top: 2px; }
        .user-matrix-container .role-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: .72rem; font-weight: 700; margin-left: 6px; background: #F1F5F9; color: #475569; }
        .user-matrix-container .role-wing-division-user{background:#EFF6FF;color:#1D4ED8;}
        .user-matrix-container .role-senior-officer{background:#F0FDF4;color:#15803D;}
        .user-matrix-container .role-nodal-officer{background:#FFF7ED;color:#C2410C;}
        .user-matrix-container .role-mixed{background:#F5F3FF;color:#6D28D9;}
        .user-matrix-container .role-mopsw-admin { background: #EEF2FF; color: #4F46E5; }
        .user-matrix-container .role-superadmin { background: #FEF2F2; color: #EF4444; }
        .user-matrix-container .role-mopsw-wing-head { background: #FFF7ED; color: #C2410C; }
        .user-matrix-container .banner-actions { display: flex; align-items: center; gap: 8px; flex-wrap:wrap; }
        .user-matrix-container .grant-all-btn { background: #F0FDF4; color: #15803D; border: 1.5px solid #BBF7D0; border-radius: 7px; padding: 7px 14px; font-size: .8rem; font-weight: 600; cursor: pointer; transition: all .15s; }
        .user-matrix-container .grant-all-btn:hover { background: #DCFCE7; }
        .user-matrix-container .revoke-all-btn { background: #FEF2F2; color: #DC2626; border: 1.5px solid #FECACA; border-radius: 7px; padding: 7px 14px; font-size: .8rem; font-weight: 600; cursor: pointer; transition: all .15s; }
        .user-matrix-container .revoke-all-btn:hover { background: #FEE2E2; }
        .user-matrix-container .save-btn { background: #3B82F6; color: #fff; border: none; border-radius: 7px; padding: 7px 18px; font-size: .8rem; font-weight: 700; cursor: pointer; transition: background .15s; }
        .user-matrix-container .save-btn:hover { background: #2563EB; }
        .user-matrix-container .bulk-notice { background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; font-size:.78rem; font-weight:600; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:6px; }
        .user-matrix-container .table-area { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .user-matrix-container .table-wrap { border: 1.5px solid #E2E8F0; border-radius: 10px; overflow: hidden; background: #fff; }
        .user-matrix-container table { width: 100%; border-collapse: collapse; }
        .user-matrix-container thead th { padding: 11px 16px; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #64748B; background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0; text-align: left; }
        .user-matrix-container thead th.c { text-align: center; }
        .user-matrix-container .col-label { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .user-matrix-container .all-link { font-size: .62rem; color: #3B82F6; cursor: pointer; font-weight: 700; text-transform: none; letter-spacing: 0; }
        .user-matrix-container .all-link:hover { text-decoration: underline; }
        .user-matrix-container tbody tr { border-bottom: 1px solid #F1F5F9; }
        .user-matrix-container tbody tr:last-child { border-bottom: none; }
        .user-matrix-container tbody tr:hover { background: #FAFBFC; }
        .user-matrix-container td { padding: 10px 16px; font-size: .84rem; }
        .user-matrix-container td.c { text-align: center; }
        .user-matrix-container .mod-cell { display: flex; align-items: center; gap: 10px; }
        .user-matrix-container .mod-name { font-size: .875rem; font-weight: 500; color: #334155; }
        .user-matrix-container .cb { -webkit-appearance:none; appearance:none; width:18px; height:18px; border-radius:5px; border:2px solid #CBD5E1; cursor:pointer; position:relative; transition:all .15s; display:block; margin:0 auto; }
        .user-matrix-container .cb:hover:not(:checked){ border-color:#94A3B8; background:#F8FAFC; }
        .user-matrix-container .cb:checked{ border-color:transparent; }
        .user-matrix-container .cb.c-create:checked{ background:#10B981; } .user-matrix-container .cb.c-read:checked{ background:#3B82F6; }
        .user-matrix-container .cb.c-update:checked{ background:#F59E0B; } .user-matrix-container .cb.c-delete:checked{ background:#EF4444; }
        .user-matrix-container .cb:checked::after{ content:''; position:absolute; top:2px; left:5px; width:5px; height:9px; border:2px solid #fff; border-top:none; border-left:none; transform:rotate(45deg); }
        .user-matrix-container .cb.mixed{ background:#E2E8F0; border-color:#CBD5E1; }
        .user-matrix-container .cb.mixed::after{ content:''; position:absolute; top:7px; left:3px; width:10px; height:0; border:1px solid #64748B; transform:none; }
        .user-matrix-container .table-footer { padding: 10px 20px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: .78rem; color: #94A3B8; display: flex; align-items: center; justify-content: space-between; }
        .user-matrix-container .legend { display: flex; gap: 14px; }
        .user-matrix-container .legend-item { display: flex; align-items: center; gap: 5px; font-size: .72rem; }
        .user-matrix-container .ldot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .user-matrix-container .empty { padding: 60px; text-align: center; color: #94A3B8; font-size: .9rem; }
        .user-matrix-container .toast-box { position: absolute; bottom: 20px; right: 20px; background: #1E293B; color: #fff; padding: 10px 18px; border-radius: 8px; font-size: .82rem; font-weight: 500; display: flex; align-items: center; gap: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.2); transform: translateY(70px); opacity: 0; transition: all .3s; z-index: 999; }
        .user-matrix-container .toast-box.show { transform: translateY(0); opacity: 1; }
        .user-matrix-container .tdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .3s; border-radius: 24px; }
        .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
        input:checked + .toggle-slider { background-color: #10B981; }
        input:checked + .toggle-slider:before { transform: translateX(20px); }

        .icon-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0; }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .slide-in-right {
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      
      <div className="topbar">
        <div className="topbar-brand">
          <div className="dot"></div>
          <h1>Permission Manager</h1>
        </div>
        
        <div className="flex ml-6 bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveMainTab('users')} 
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeMainTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 cursor-pointer'}`}
          >
            User Permissions
          </button>
          <button 
            onClick={() => setActiveMainTab('modules')} 
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeMainTab === 'modules' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 cursor-pointer'}`}
          >
            Module Permissions
          </button>
          <button 
            onClick={() => setActiveMainTab('userlist')} 
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeMainTab === 'userlist' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 cursor-pointer'}`}
          >
            User List
          </button>
        </div>

        {activeMainTab === 'users' && (
          <>
            <div className="sep ml-auto"></div>
            <div className="filter-item ml-auto">
              <label>Organisation Category</label>
              <select value={selectedCategory} onChange={handleOrgCatChange}>
                <option value="all">Select Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Organisation</label>
              <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)} disabled={selectedCategory === 'all'}>
                <option value="all">All Organisations</option>
                {orgs.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Role</label>
              <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} disabled={selectedCategory === 'all'}>
                <option value="all">All Roles</option>
                <option value="Wing / Division User">Wing / Division User</option>
                <option value="Senior Officer">Senior Officer</option>
                <option value="Nodal Officer">Nodal Officer</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="layout">
        {activeMainTab === 'users' && (
          <>
            <div className="sidebar">
              <div className="sidebar-head">
                <div className="sidebar-head-top">
                  <span className="sidebar-title">Users</span>
                  <span className="user-count-badge">{filteredUsers.length}</span>
                </div>
                <div className="search-wrap">
                  <input type="text" className="search-input" placeholder="Search users by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <div className="search-hint">Filter users by name</div>
                </div>
                <div className="select-all-row" onClick={toggleSelectAll}>
                  <input type="checkbox" className={`sel-cb ${!allSel && someSel ? 'indeterminate' : ''}`} checked={allSel} readOnly />
                  <span className="sa-label">Select all</span>
                  <span className="sa-hint">{selectedIds.size} selected</span>
                </div>
              </div>
              <div className="user-list">
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <div key={u.id} className={`user-item ${selectedIds.has(u.id) ? 'selected' : ''}`} onClick={() => toggleUser(u.id, false)}>
                    <input type="checkbox" className="sel-cb" checked={selectedIds.has(u.id)} onChange={(e) => toggleUser(u.id, true, e)} onClick={e => e.stopPropagation()} />
                    <div className="avatar" style={{ background: u.color }}>{getInits(u.name)}</div>
                    <div className="user-info">
                      <div className="user-name">{u.name}</div>
                      <div className="user-role">{u.role} · {u.org}</div>
                    </div>
                  </div>
                )) : <div className="empty" style={{ padding: '30px 16px', fontSize: '.82rem' }}>No users found.</div>}
              </div>
            </div>

            <div className="main">
              <div className="user-banner">
                <div className="user-banner-left">
                  <div className="banner-avatar" style={{ background: selectedUsers.length === 0 ? '#CBD5E1' : selectedUsers.length === 1 ? selectedUsers[0].color : '#3B82F6' }}>
                    {selectedUsers.length === 0 ? '—' : selectedUsers.length === 1 ? getInits(selectedUsers[0].name) : selectedUsers.length}
                  </div>
                  <div>
                    <div className="banner-name">
                      {selectedUsers.length === 0 ? 'No users selected' : selectedUsers.length === 1 ? (
                        <>{selectedUsers[0].name} <span className={`role-pill ${roleClassName(selectedUsers[0].role)}`}>{selectedUsers[0].role}</span></>
                      ) : (() => {
                        const roles = [...new Set(selectedUsers.map(u=>u.role))];
                        const roleLabel = roles.length===1 ? roles[0] : 'Mixed';
                        return <>{selectedUsers.length} users selected <span className={`role-pill ${roleClassName(roleLabel)}`}>{roleLabel}</span></>;
                      })()}
                    </div>
                    <div className="banner-sub">
                      {selectedUsers.length === 0 ? 'Select one or more users from the left' : selectedUsers.length === 1 ? `${selectedUsers[0].email} · ${selectedUsers[0].org}` : 
                        selectedUsers.slice(0,4).map(u=>u.name.split(' ')[0]).join(', ') + (selectedUsers.length>4?` +${selectedUsers.length-4} more`:'')
                      }
                    </div>
                  </div>
                </div>
                <div className="banner-actions">
                  {selectedUsers.length > 1 && <span className="bulk-notice">⚡ Editing multiple users</span>}
                  <button className="grant-all-btn" onClick={() => setAll(true)}>✓ Grant All</button>
                  <button className="revoke-all-btn" onClick={() => setAll(false)}>✕ Revoke All</button>
                  <button className="save-btn" onClick={handleSave}>{selectedUsers.length > 1 ? `Save to ${selectedUsers.length} users` : 'Save'}</button>
                </div>
              </div>

              <div className="table-area">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ minWidth: '220px' }}>Module</th>
                        <th className="c" style={{ width: '110px' }}><div className="col-label">Create <span className="all-link" onClick={() => colAll('create')}>toggle all</span></div></th>
                        <th className="c" style={{ width: '110px' }}><div className="col-label">Read <span className="all-link" onClick={() => colAll('read')}>toggle all</span></div></th>
                        <th className="c" style={{ width: '110px' }}><div className="col-label">Update <span className="all-link" onClick={() => colAll('update')}>toggle all</span></div></th>
                        <th className="c" style={{ width: '110px' }}><div className="col-label">Delete <span className="all-link" onClick={() => colAll('delete')}>toggle all</span></div></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCategory === 'all' ? (
                        <tr><td colSpan="5" className="empty">Select Organisation Category to load modules.</td></tr>
                      ) : activeModules.length === 0 ? (
                        <tr><td colSpan="5" className="empty">Loading modules...</td></tr>
                      ) : selectedUsers.length === 0 ? (
                        <tr><td colSpan="5" className="empty">Select at least one user.</td></tr>
                      ) : (
                        activeModules.map(m => {
                          const { Icon: ModIcon, color: modColor, bg: modBg } = getModuleIconAndColor(m.name);
                          return (
                            <tr key={m.id}>
                              <td>
                                <div className="mod-cell">
                                  <div className="icon-badge mr-2" style={{ backgroundColor: modBg, color: modColor }}>
                                    <ModIcon size={16} />
                                  </div>
                                  <span className="mod-name">{m.name}</span>
                                </div>
                              </td>
                              {PERMS.map(p => {
                                const v = draft[m.id]?.[p];
                                const mixed = v === 'mixed';
                                return (
                                  <td className="c" key={p}>
                                    <input 
                                      type="checkbox" 
                                      className={`cb c-${p} ${mixed?'mixed':''}`} 
                                      checked={v===true} 
                                      onChange={(e) => handleCheck(m.id, p, e.target.checked)} 
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  <div className="table-footer">
                    <span>
                      {selectedCategory !== 'all' && selectedUsers.length > 0 && activeModules.length > 0 && (
                        <>{grantedCount} / {activeModules.length*4} permissions granted
                        {mixedCount > 0 ? ` · ${mixedCount} mixed (varies across selected users)` : ''}
                        {selectedUsers.length > 1 ? ` · will apply to ${selectedUsers.length} users on Save` : ''}</>
                      )}
                    </span>
                    <div className="legend">
                      <div className="legend-item"><span className="ldot" style={{ background: '#10B981' }}></span>Create</div>
                      <div className="legend-item"><span className="ldot" style={{ background: '#3B82F6' }}></span>Read</div>
                      <div className="legend-item"><span className="ldot" style={{ background: '#F59E0B' }}></span>Update</div>
                      <div className="legend-item"><span className="ldot" style={{ background: '#EF4444' }}></span>Delete</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeMainTab === 'modules' && (
          <>
            <div className="sidebar" style={{ width: '280px' }}>
              <div className="sidebar-head">
                <div className="sidebar-head-top">
                  <span className="sidebar-title">Organizations</span>
                </div>
              </div>
              <div className="user-list">
                {ORG_LIST.map(org => {
                  const { Icon: OrgIcon, color: orgColor, bg: orgBg } = getOrgIconAndColor(org);
                  return (
                    <div 
                      key={org} 
                      className={`user-item ${selectedModuleOrg === org ? 'selected' : ''}`}
                      onClick={() => setSelectedModuleOrg(org)}
                    >
                      <div className="icon-badge mr-3" style={{ backgroundColor: orgBg, color: orgColor }}>
                        <OrgIcon size={16} />
                      </div>
                      <div className="user-info">
                        <div className="user-name" style={{ whiteSpace: 'normal', lineHeight: '1.4' }}>{org}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="main">
              <div className="user-banner">
                <div className="user-banner-left">
                  <div className="banner-avatar" style={{ background: '#8B5CF6' }}>🏢</div>
                  <div>
                    <div className="banner-name">{selectedModuleOrg}</div>
                    <div className="banner-sub">Toggle modules available for this organization</div>
                  </div>
                </div>
                <div className="banner-actions">
                  <button className="grant-all-btn" onClick={() => setAllOrgModules(true)}>✓ Enable All</button>
                  <button className="revoke-all-btn" onClick={() => setAllOrgModules(false)}>✕ Disable All</button>
                  <button className="save-btn" onClick={saveModulePermissions}>Save Changes</button>
                </div>
              </div>

              <div className="table-area">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Module Name</th>
                        <th className="c" style={{ width: '120px' }}>Enabled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FULL_MODULE_LIST.map(m => {
                        const isEnabled = orgModuleState[selectedModuleOrg]?.[m] || false;
                        const { Icon: ModIcon, color: modColor, bg: modBg } = getModuleIconAndColor(m);
                        return (
                          <tr key={m}>
                            <td>
                              <div className="mod-cell">
                                <div className="icon-badge mr-3" style={{ backgroundColor: modBg, color: modColor }}>
                                  <ModIcon size={16} />
                                </div>
                                <div className="mod-name" style={{ fontWeight: 600, color: '#475569' }}>{m}</div>
                              </div>
                            </td>
                            <td className="c">
                              <label className="toggle-switch">
                                <input 
                                  type="checkbox" 
                                  checked={isEnabled} 
                                  onChange={(e) => toggleOrgModule(selectedModuleOrg, m, e.target.checked)} 
                                />
                                <span className="toggle-slider"></span>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="table-footer">
                    <span>
                      {Object.values(orgModuleState[selectedModuleOrg] || {}).filter(Boolean).length} / {FULL_MODULE_LIST.length} modules enabled for {selectedModuleOrg}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeMainTab === 'userlist' && (
          <div className="main" style={{ flex: 1, height: '100%' }}>
            <div className="user-banner">
              <div className="user-banner-left">
                <div className="banner-avatar" style={{ background: '#3B82F6' }}>👥</div>
                <div>
                  <div className="banner-name">User List Database</div>
                  <div className="banner-sub">View all registered users and their details fetched directly from the database</div>
                </div>
              </div>
              <div className="banner-actions">
                <div className="search-wrap" style={{ margin: 0 }}>
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Search users..." 
                    value={userListSearch} 
                    onChange={e => setUserListSearch(e.target.value)} 
                    style={{ width: '260px' }}
                  />
                </div>
              </div>
            </div>

            {/* Roles cards filters row */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-2 mx-6 mt-6">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-left">
                Filter Users by Role
              </span>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                {/* All Roles Card */}
                <button
                  onClick={() => setSelectedDbRole('All')}
                  className={`relative w-44 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow border transition-all duration-300 ${
                    selectedDbRole === 'All'
                      ? 'ring-4 ring-[#0f417a] scale-95 shadow-md font-bold'
                      : 'border-slate-200 opacity-85 hover:opacity-100 hover:scale-[1.02]'
                  }`}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=300&q=80" 
                    alt="All Roles" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/45 transition-colors"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">
                      All Roles
                    </span>
                    <span className="text-[9px] font-bold text-slate-200 mt-1.5 bg-white/25 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      {dbUserList.length} Users
                    </span>
                  </div>
                </button>

                {/* Master Roles Cards */}
                {masterRoles.map((role) => {
                  const isActive = selectedDbRole === String(role.role_id);
                  const count = dbUserList.filter(u => u.role_id === role.role_id).length;
                  return (
                    <button
                      key={role.role_id}
                      onClick={() => setSelectedDbRole(String(role.role_id))}
                      className={`relative w-44 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow border transition-all duration-300 ${
                        isActive
                          ? 'ring-4 ring-[#0f417a] scale-95 shadow-md font-bold'
                          : 'border-slate-200 opacity-85 hover:opacity-100 hover:scale-[1.02]'
                      }`}
                    >
                      <img 
                        src={getRoleImage(role.role_name)} 
                        alt={role.role_name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/45 transition-colors"></div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight whitespace-normal">
                          {role.role_name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-200 mt-1.5 bg-white/25 px-2 py-0.5 rounded-full backdrop-blur-xs">
                          {count} {count === 1 ? 'User' : 'Users'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="table-area">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>S.No</th>
                      <th>User Name</th>
                      <th>Designation</th>
                      <th>Organisation</th>
                      <th>Role</th>
                      <th style={{ width: '130px' }}>Phone Number</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Edit</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Reset Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbLoading ? (
                      <tr><td colSpan="9" className="empty">Loading users from database...</td></tr>
                    ) : filteredDbUsers.length === 0 ? (
                      <tr><td colSpan="9" className="empty">No users found matching search criteria.</td></tr>
                    ) : (
                      filteredDbUsers.map((u, index) => (
                        <tr key={u.user_id}>
                          <td>{index + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="avatar" style={{ background: colorFromString(`${u.name}|${u.email}`), width: '28px', height: '28px', fontSize: '.65rem' }}>
                                {getInits(u.name || '')}
                              </div>
                              <span style={{ font: 'inherit', fontWeight: 600, color: '#334155' }}>
                                {u.title && `${u.title} `}{u.name}
                              </span>
                            </div>
                          </td>
                          <td>{u.designation || '—'}</td>
                          <td>{u.organisation_name || '—'}</td>
                          <td>
                            <span className={`role-pill ${roleClassName(u.role_name || '')}`} style={{ fontSize: '.7rem', padding: '2px 8px' }}>
                              {u.role_name}
                            </span>
                          </td>
                          <td style={{ color: '#475569', fontFamily: 'monospace' }}>{u.phone || '—'}</td>
                          
                          {/* Edit Action */}
                          <td className="c">
                            <button 
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer transition-all active:scale-90"
                              style={{ border: 'none', background: 'none' }}
                              title="Edit User"
                            >
                              <Edit size={16} />
                            </button>
                          </td>

                          {/* Status Action (toggle) */}
                          <td className="c">
                            <label className="toggle-switch">
                              <input 
                                type="checkbox" 
                                checked={u.status === 1} 
                                onChange={(e) => toggleUserStatus(u, e.target.checked)} 
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </td>

                          {/* Reset Password Action */}
                          <td className="c">
                            <button 
                              onClick={() => handleResetPassword(u)}
                              className="p-1.5 hover:bg-slate-100 text-slate-655 rounded-lg cursor-pointer transition-all active:scale-90"
                              style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '6px' }}
                              title="Reset Password"
                            >
                              <RotateCcw size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="table-footer">
                  <span>Showing {filteredDbUsers.length} of {dbUserList.length} users</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit User overlay drawer panel */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in" style={{ zIndex: 9999 }}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setIsEditModalOpen(false)}
          />
          
          {/* Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col slide-in-right border-l border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Edit className="h-5 w-5 text-blue-700" />
                <h2 className="text-base font-black text-[#0f417a] uppercase tracking-wide">
                  Update User
                </h2>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                style={{ border: 'none', background: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateUserSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs font-semibold text-slate-700 text-left">
              
              {/* Title* */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Title *</label>
                <select
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full text-xs pl-3 pr-8 py-2.5 border border-slate-350 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {['Mr', 'Ms', 'Mrs', 'Shri', 'Smt', 'Dr'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Name* */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter full name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full pl-3 pr-3 py-2.5 border border-slate-355 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Designation* */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Designation *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter designation"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="w-full pl-3 pr-3 py-2.5 border border-slate-355 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Organization* */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Organization *</label>
                <select
                  value={formOrg}
                  onChange={(e) => setFormOrg(e.target.value)}
                  required
                  className="w-full text-xs pl-3 pr-8 py-2.5 border border-slate-350 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Organization</option>
                  {masterOrgs.map(org => (
                    <option key={org.organisation_id} value={org.organisation_id}>
                      {org.organisation_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Role* */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">User Role *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  required
                  className="w-full text-xs pl-3 pr-8 py-2.5 border border-slate-350 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select User Role</option>
                  {masterRoles.map(role => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email* */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Email *</label>
                <input 
                  type="email" 
                  required
                  placeholder="Enter email address"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full pl-3 pr-3 py-2.5 border border-slate-355 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Mobile Number* */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Mobile Number *</label>
                <input 
                  type="tel" 
                  required
                  placeholder="Enter mobile number"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full pl-3 pr-3 py-2.5 border border-slate-355 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Disclaimer */}
              <div className="text-[10px] text-slate-400 italic pt-2">
                Fields marked with * are mandatory
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-655 hover:bg-slate-50 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[#0f417a] hover:bg-blue-800 text-white rounded-lg shadow cursor-pointer font-bold transition-all active:scale-95"
                >
                  Update Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={`toast-box ${toastVisible ? 'show' : ''}`}>
        <div className="tdot" style={{ background: toastColor }}></div>
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}
