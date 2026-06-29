import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * InternalNavigation Component
 *
 * @param {Array}    tabs            - Array of tab objects:
 *                                    { id, label, icon: Component, subMenu?: [{ id, label }] }
 * @param {string}   currentTab      - The ID of the currently active top-level tab
 * @param {Function} onTabChange     - Called with (tabId) when a top-level tab is clicked
 * @param {string}   currentSubItem  - The ID of the currently active sub-menu item (optional)
 * @param {Function} onSubItemChange - Called with (subItemId) when a sub-menu item is clicked (optional)
 */
const InternalNavigation = ({
  tabs = [],
  currentTab,
  onTabChange,
  currentSubItem,
  onSubItemChange,
}) => {
  const [openMenu, setOpenMenu] = useState(null);
  const closeTimer = useRef(null);

  if (!tabs.length) return null;

  const handleMouseEnter = (tabId) => {
    clearTimeout(closeTimer.current);
    setOpenMenu(tabId);
  };

  const handleMouseLeave = () => {
    // Small delay so the user can move the pointer into the dropdown
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  };

  return (
    <div className="flex justify-end">
      <div className="inline-flex items-center gap-0.5 border border-slate-200 rounded-xl shadow-sm bg-white p-1">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = currentTab === tab.id;
          const hasSubMenu = Array.isArray(tab.subMenu) && tab.subMenu.length > 0;
          const isOpen = openMenu === tab.id;

          return (
            <div
              key={tab.id}
              className="relative"
              onMouseEnter={() => hasSubMenu ? handleMouseEnter(tab.id) : null}
              onMouseLeave={hasSubMenu ? handleMouseLeave : null}
            >
              {/* Main tab button */}
              <button
                onClick={() => {
                  if (!hasSubMenu) {
                    onTabChange && onTabChange(tab.id);
                  } else {
                    // Toggle open on click too (for touch devices)
                    setOpenMenu(isOpen ? null : tab.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-lg whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0f417a] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {TabIcon && (
                  <TabIcon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                )}
                {tab.label}
                {hasSubMenu && (
                  <ChevronDown
                    className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-blue-200' : 'text-slate-400'}`}
                  />
                )}
              </button>

              {/* Hover dropdown */}
              {hasSubMenu && isOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 z-50 min-w-52 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in"
                  onMouseEnter={() => handleMouseEnter(tab.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Dropdown arrow */}
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45" />

                  <div className="relative py-1.5">
                    {tab.subMenu.map((item, idx) => {
                      const isSubActive = currentSubItem === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onTabChange && onTabChange(tab.id);
                            onSubItemChange && onSubItemChange(item.id);
                            setOpenMenu(null);
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-left transition-colors cursor-pointer ${
                            isSubActive
                              ? 'bg-blue-50 text-[#0f417a] border-l-2 border-[#0f417a]'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'
                          } ${idx !== 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          {isSubActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0f417a] flex-shrink-0" />
                          )}
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InternalNavigation;