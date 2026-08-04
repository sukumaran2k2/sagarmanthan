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
  Anchor
} from 'lucide-react';

export function normalizeRole(rawRole = '') {
  const r = String(rawRole).toLowerCase();
  if (r.includes('nodal officer')) return 'Nodal Officer';
  if (r.includes('senior officer')) return 'Senior Officer';
  return 'Wing / Division User';
}

export function normalizeOrg(v = '') {
  return String(v).replace(/\s+/g, ' ').trim();
}

export function normalizeOrgCategory(org = '') {
  const s = String(org).toLowerCase();
  if (s.includes('ministry of ports')) return 'MoPSW';
  return 'Port Organisation';
}

export function roleClassName(role = '') {
  return `role-${String(role).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export function colorFromString(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

export function getInits(n = '') {
  return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
}

export const getModuleIconAndColor = (name = '') => {
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

  return { Icon: FileText, color: '#64748B', bg: '#F1F5F9' };
};

export const getOrgIconAndColor = (name = '') => {
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

export const getRoleImage = (roleName = '') => {
  const r = roleName.toLowerCase();
  if (r.includes('all')) return 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=300&q=80';
  if (r.includes('super') || r.includes('admin')) return 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=300&q=80';
  if (r.includes('wing') || r.includes('head') || r.includes('director')) return 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80';
  if (r.includes('nodal')) return 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80';
  if (r.includes('senior') || r.includes('officer')) return 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=300&q=80';
  return 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=300&q=80';
};
