import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function DashboardFilterPanel({ 
  title = "Dashboard Filters", 
  isExpanded, 
  onToggle, 
  children 
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div 
        onClick={onToggle}
        className="flex items-center justify-between border-b border-slate-100 pb-3 cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-blue-650 font-bold hover:text-blue-800 transition-colors">
          <span>{isExpanded ? 'Hide Filters' : 'Show Filters'}</span>
          <ChevronDown className={`h-4 w-4 text-blue-650 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
