import React from 'react';

/**
 * InternalNavigation Component
 * @param {Array} tabs - Array of tab objects. Each object should have { id, label, icon: Component }
 * @param {String|Number} currentTab - The ID of the currently active tab
 * @param {Function} onTabChange - Callback function triggered when a tab is clicked
 */
const InternalNavigation = ({ tabs = [], currentTab, onTabChange }) => {
  if (!tabs.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border border-slate-200 rounded-xl overflow-hidden self-start md:self-auto shadow-sm bg-white p-1">
      {tabs.map((tab) => {
        const TabIcon = tab.icon;
        const isActive = currentTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange && onTabChange(tab.id)}
            className={`flex items-center space-x-2 px-4.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer rounded-lg ${
              isActive 
                ? 'bg-[#0f417a] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {TabIcon && (
              <TabIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-450'}`} />
            )}
            <span className="whitespace-nowrap uppercase tracking-wider text-[9.5px]">
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default InternalNavigation;