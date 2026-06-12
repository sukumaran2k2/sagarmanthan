import React from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  Coins, 
  TrendingDown, 
  FolderSync, 
  FilePieChart 
} from 'lucide-react';

export default function Tabs({ activeTab, setActiveTab, projectCount = 8 }) {
  const tabsList = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Project List', icon: ListTodo, badge: projectCount },
    { id: 'less5cr', label: 'Projects Less Than 5 Cr', icon: Coins },
    { id: 'lumpsum', label: 'Lumpsum - IWAI', icon: TrendingDown },
    { id: 'dropRequests', label: 'View Drop Request', icon: FolderSync },
    { id: 'reports', label: 'Reports', icon: FilePieChart },
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-thin scrollbar-thumb-slate-300">
          {tabsList.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2.5 px-4 py-3 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
