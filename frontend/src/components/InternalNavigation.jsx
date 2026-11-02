import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell } from 'lucide-react';

/**
 * InternalNavigation Component
 *
 * @param {Array}    tabs            - Array of tab objects:
 *                                    { id, label, icon: Component, subMenu?: [{ id, label, icon? }], isGroup? }
 *                                    isGroup: the tab is only a container for its sub-menu. Clicking it
 *                                    opens/closes the menu instead of calling onTabChange, and picking an
 *                                    item calls onSubItemChange only (one navigation per click).
 * @param {string}   currentTab      - The ID of the currently active top-level tab
 * @param {Function} onTabChange     - Called with (tabId) when a top-level tab is clicked
 * @param {string}   currentSubItem  - The ID of the currently active sub-menu item (optional)
 * @param {Function} onSubItemChange - Called with (subItemId) when a sub-menu item is clicked (optional)
 */
const InternalNavigation = ({
  tabs = [],
  currentTab,
  activeTab,
  onTabChange,
  currentSubItem,
  onSubItemChange,
}) => {
  const [openMenu, setOpenMenu] = useState(null);
  const closeTimer = useRef(null);
  const navRef = useRef(null);

  // A menu opened by click/tap stays open until the pointer or focus goes elsewhere.
  useEffect(() => {
    if (!openMenu) return undefined;
    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setOpenMenu(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  if (!tabs.length) return null;

  const effectiveCurrentTab = currentTab || activeTab;

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
      <div
        ref={navRef}
        className="inline-flex items-center gap-0.5 border rounded-xl shadow-sm p-1 transition-colors"
        style={{
          backgroundColor: 'var(--module-internal-nav-bg, #ffffff)',
          borderColor: 'var(--module-internal-nav-border, #e2e8f0)',
          borderRadius: 'var(--module-internal-nav-radius, 0.75rem)'
        }}
      >
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = effectiveCurrentTab === tab.id;
          const hasSubMenu = Array.isArray(tab.subMenu) && tab.subMenu.length > 0;
          const isGroup = hasSubMenu && !!tab.isGroup;
          const isOpen = openMenu === tab.id;
          const menuId = `internal-nav-menu-${tab.id}`;

          return (
            <div
              key={tab.id}
              className="relative"
              onMouseEnter={() => hasSubMenu ? handleMouseEnter(tab.id) : null}
              onMouseLeave={hasSubMenu ? handleMouseLeave : null}
            >
              {/* Main tab button */}
              <button
                type="button"
                aria-haspopup={hasSubMenu ? 'menu' : undefined}
                aria-expanded={hasSubMenu ? isOpen : undefined}
                aria-controls={hasSubMenu && isOpen ? menuId : undefined}
                aria-current={isActive && !hasSubMenu ? 'page' : undefined}
                onClick={() => {
                  if (!isGroup) onTabChange && onTabChange(tab.id);
                  if (hasSubMenu) {
                    setOpenMenu(isOpen ? null : tab.id);
                  }
                }}
                style={isActive ? {
                  backgroundColor: 'var(--module-internal-nav-active-bg, #0f417a)',
                  color: 'var(--module-internal-nav-active-text, #ffffff)'
                } : {
                  color: 'var(--module-internal-nav-text, #475569)'
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-lg whitespace-nowrap ${
                  isActive
                    ? 'shadow-md'
                    : 'hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {TabIcon && (
                  <TabIcon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                )}
                <span>{tab.label}</span>
                {(tab.count > 0 || tab.badge > 0) && (
                  <span
                    className={`inline-flex items-center gap-1 font-black text-[10px] min-w-[18px] h-[18px] px-1.5 rounded-full shadow-xs transition-colors ${
                      isActive
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    <Bell className="h-2.5 w-2.5 fill-current shrink-0" />
                    <span>{(tab.count || tab.badge) > 99 ? '99+' : (tab.count || tab.badge)}</span>
                  </span>
                )}
                {hasSubMenu && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-blue-200' : 'text-slate-400'}`}
                  />
                )}
              </button>

              {/* Hover dropdown */}
              {hasSubMenu && isOpen && (
                <div
                  id={menuId}
                  role="menu"
                  aria-label={tab.label}
                  className="absolute left-0 top-full mt-1.5 z-50 min-w-52 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in dark:bg-slate-900 dark:border-slate-700"
                  onMouseEnter={() => handleMouseEnter(tab.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Dropdown arrow */}
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45 dark:bg-slate-900 dark:border-slate-700" />

                  <div className="relative py-1.5">
                    {tab.subMenu.map((item, idx) => {
                      const isSubActive = currentSubItem === item.id;
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="menuitem"
                          aria-current={isSubActive ? 'page' : undefined}
                          onClick={() => {
                            if (!isGroup) onTabChange && onTabChange(tab.id);
                            onSubItemChange && onSubItemChange(item.id);
                            setOpenMenu(null);
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-left transition-colors cursor-pointer ${
                            isSubActive
                              ? 'bg-blue-50/80 text-[var(--module-internal-nav-active-bg,#0f417a)] border-l-2 border-[var(--module-internal-nav-active-bg,#0f417a)] dark:bg-slate-800 dark:text-blue-300'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                          } ${idx !== 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
                        >
                          {ItemIcon ? (
                            <ItemIcon className={`h-3.5 w-3.5 flex-shrink-0 ${isSubActive ? '' : 'text-slate-400'}`} />
                          ) : isSubActive && (
                            <span
                              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: 'var(--module-internal-nav-active-bg, #0f417a)' }}
                            />
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
