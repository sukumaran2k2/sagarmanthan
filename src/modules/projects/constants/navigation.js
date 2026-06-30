import { LayoutDashboard, ClipboardList, TrendingDown, TrendingUp, FolderSync, FilePieChart } from 'lucide-react';

export const PROJECTS_NAVIGATION_TABS = [
  { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Project List', icon: ClipboardList },
  { id: 'less5cr', label: 'Projects Less Than 5 Cr', icon: TrendingDown },
  { id: 'lumpsum', label: 'Lumpsum - IWAI', icon: TrendingUp },
  { id: 'dropRequests', label: 'View Drop Request', icon: FolderSync },
  { id: 'reports', label: 'Reports', icon: FilePieChart },
];
