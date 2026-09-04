import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, Sparkles, CheckCircle2, XCircle, Search, 
  RotateCcw, Save, ShieldCheck, Layers, LayoutDashboard, 
  Check, ToggleLeft, ToggleRight, AlertCircle, RefreshCw,
  FolderKanban, BarChart3, Users, Scale, FileText, ChevronRight,
  HelpCircle, Shield, CheckCheck, X
} from 'lucide-react';
import { SagarBotLogo } from '../../../components/SagarBot';
import { rbacApi } from '../rbacApi';
import { getModuleIconAndColor } from '../utils';

// Category metadata and icon mappings
const CATEGORY_META = {
  'All': { icon: Layers, color: '#3B82F6', bg: '#EFF6FF' },
  'Dashboard & Overview': { icon: LayoutDashboard, color: '#2563EB', bg: '#EFF6FF' },
  'Projects & Strategies': { icon: FolderKanban, color: '#8B5CF6', bg: '#F5F3FF' },
  'KPI & Performance': { icon: BarChart3, color: '#0D9488', bg: '#F0FDFA' },
  'Governance & Operations': { icon: FileText, color: '#EA580C', bg: '#FFF7ED' },
  'HR & Capacity': { icon: Users, color: '#06B6D4', bg: '#ECFEFF' },
  'Legal & Regulations': { icon: Scale, color: '#E11D48', bg: '#FFF1F2' },
};

export default function SagarBotPermissionsTab({ triggerNotification }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [originalState, setOriginalState] = useState({ globalEnabled: true, permissions: [] });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Load Permissions
  const loadPermissions = async () => {
    setLoading(true);
    try {
      const res = await rbacApi.getSagarbotPermissions();
      if (res.data) {
        const globalVal = res.data.globalEnabled !== undefined ? res.data.globalEnabled : true;
        const permsList = Array.isArray(res.data.permissions) ? res.data.permissions : [];
        
        setGlobalEnabled(globalVal);
        setPermissions(permsList);
        setOriginalState({
          globalEnabled: globalVal,
          permissions: JSON.parse(JSON.stringify(permsList))
        });
      }
    } catch (err) {
      console.error('Failed to load SagarBot permissions:', err);
      triggerNotification?.('Failed to load SagarBot permissions from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  // Compute Categories with module counts
  const categoryStats = useMemo(() => {
    const map = {
      'All': { total: permissions.length, enabled: permissions.filter(p => p.isEnabled).length }
    };
    
    permissions.forEach(p => {
      const cat = p.category || 'General';
      if (!map[cat]) {
        map[cat] = { total: 0, enabled: 0 };
      }
      map[cat].total += 1;
      if (p.isEnabled) {
        map[cat].enabled += 1;
      }
    });

    return map;
  }, [permissions]);

  const categoryList = useMemo(() => {
    const list = Object.keys(categoryStats);
    // Sort so All is first, Dashboard second
    return list.sort((a, b) => {
      if (a === 'All') return -1;
      if (b === 'All') return 1;
      if (a === 'Dashboard & Overview') return -1;
      if (b === 'Dashboard & Overview') return 1;
      return a.localeCompare(b);
    });
  }, [categoryStats]);

  // Filtered Module Items
  const filteredModules = useMemo(() => {
    return permissions.filter(item => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.itemName.toLowerCase().includes(q) ||
          item.itemKey.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [permissions, selectedCategory, searchTerm]);

  // Total counts
  const totalModules = permissions.length;
  const totalEnabled = useMemo(() => permissions.filter(p => p.isEnabled).length, [permissions]);
  const currentViewEnabled = useMemo(() => filteredModules.filter(p => p.isEnabled).length, [filteredModules]);

  // Unsaved changes count
  const hasChanges = useMemo(() => {
    if (globalEnabled !== originalState.globalEnabled) return true;
    if (permissions.length !== originalState.permissions.length) return true;
    for (let i = 0; i < permissions.length; i++) {
      const current = permissions[i];
      const orig = originalState.permissions.find(p => p.itemKey === current.itemKey);
      if (!orig || orig.isEnabled !== current.isEnabled) return true;
    }
    return false;
  }, [globalEnabled, permissions, originalState]);

  // Single Item Toggle
  const toggleItem = (itemKey) => {
    setPermissions(prev => prev.map(item => {
      if (item.itemKey === itemKey) {
        return { ...item, isEnabled: !item.isEnabled };
      }
      return item;
    }));
  };

  // Bulk Category Toggle
  const toggleCategoryInView = (enableAll) => {
    const keysToToggle = new Set(filteredModules.map(m => m.itemKey));
    setPermissions(prev => prev.map(item => {
      if (keysToToggle.has(item.itemKey)) {
        return { ...item, isEnabled: enableAll };
      }
      return item;
    }));
  };

  // Bulk All Modules Toggle
  const toggleAllModules = (enableAll) => {
    setPermissions(prev => prev.map(item => ({ ...item, isEnabled: enableAll })));
  };

  // Save Permissions
  const handleSave = async () => {
    setSaving(true);
    try {
      const permsMap = {};
      permissions.forEach(p => {
        permsMap[p.itemKey] = p.isEnabled;
      });

      const payload = {
        globalEnabled,
        permissions: permsMap
      };

      const res = await rbacApi.saveSagarbotPermissions(payload);
      if (res.data && res.data.success !== false) {
        triggerNotification?.('SagarBot AI Copilot permissions updated successfully!', 'success');
        setOriginalState({
          globalEnabled,
          permissions: JSON.parse(JSON.stringify(permissions))
        });
      } else {
        triggerNotification?.(res.data?.message || 'Failed to save SagarBot permissions.', 'error');
      }
    } catch (err) {
      console.error('Failed to save SagarBot permissions:', err);
      triggerNotification?.('Error saving SagarBot permissions: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset Permissions
  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all SagarBot Copilot permissions to default enabled?')) {
      return;
    }
    setSaving(true);
    try {
      const res = await rbacApi.resetSagarbotPermissions();
      if (res.data && res.data.success !== false) {
        triggerNotification?.('All SagarBot permissions reset to default.', 'success');
        loadPermissions();
      } else {
        triggerNotification?.(res.data?.message || 'Failed to reset SagarBot permissions.', 'error');
      }
    } catch (err) {
      console.error('Failed to reset SagarBot permissions:', err);
      triggerNotification?.('Error resetting SagarBot permissions: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 min-h-[400px]">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 animate-spin">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Bot size={24} className="text-blue-600 animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loading SagarBot Copilot Permissions Matrix...
        </p>
        <span className="text-xs text-slate-400 mt-1">Retrieving system configuration</span>
      </div>
    );
  }

  return (
    <>
      {/* ===================== SIDEBAR (LEFT DIMENSION) ===================== */}
      <div className="sidebar" style={{ width: '310px' }}>
        {/* Sidebar Header */}
        <div className="sidebar-head">
          <div className="sidebar-head-top flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-blue-600 dark:text-blue-400" />
              <span className="sidebar-title">Categories & Scope</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 rounded-full">
              {totalEnabled} / {totalModules} Active
            </span>
          </div>

          {/* Quick Search */}
          <div className="search-wrap mt-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search modules or routes..."
                className="search-input text-xs pl-8 pr-7 py-2"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories List (Navigation & Filter) */}
        <div className="user-list" style={{ height: 'calc(100% - 95px)', overflowY: 'auto' }}>
          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
            Navigation Categories
          </div>

          {categoryList.map((catName) => {
            const stats = categoryStats[catName] || { total: 0, enabled: 0 };
            const isSelected = selectedCategory === catName;
            const meta = CATEGORY_META[catName] || { icon: Layers, color: '#6366F1', bg: '#EEF2FF' };
            const CatIcon = meta.icon;
            const allActive = stats.enabled === stats.total && stats.total > 0;
            const noneActive = stats.enabled === 0;

            return (
              <div
                key={catName}
                className={`user-item flex items-center justify-between py-2.5 px-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'selected bg-blue-50/80 dark:bg-blue-950/50 font-bold border-l-4 border-l-blue-600' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
                onClick={() => setSelectedCategory(catName)}
              >
                <div className="flex items-center truncate mr-2 min-w-0">
                  <div
                    className="icon-badge mr-2.5 flex-shrink-0 flex items-center justify-center rounded-lg w-7 h-7"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    <CatIcon size={14} />
                  </div>
                  <div className="truncate">
                    <div className={`text-xs truncate ${isSelected ? 'text-blue-900 dark:text-blue-200 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {catName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {stats.total} {stats.total === 1 ? 'module' : 'modules'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      allActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : noneActive
                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {stats.enabled}/{stats.total}
                  </span>
                  <ChevronRight size={13} className={`text-slate-400 ${isSelected ? 'text-blue-600' : ''}`} />
                </div>
              </div>
            );
          })}

          {/* Quick Info Box in Sidebar */}
          <div className="m-3 p-3 rounded-xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100/80 dark:border-indigo-900/40 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300 mb-1">
              <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
              SagarBot Copilot
            </div>
            <p className="text-[10px] leading-relaxed">
              When enabled, users inside the allowed module will see the intelligent SagarBot AI Assistant with contextual insights.
            </p>
          </div>
        </div>
      </div>

      {/* ===================== MAIN PANEL (RIGHT DIMENSION) ===================== */}
      <div className="main">
        {/* Banner Area with Master Controls */}
        <div className="user-banner">
          <div className="user-banner-left">
            <div 
              className="banner-avatar relative overflow-hidden shadow-sm"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #06B6D4 100%)' }}
            >
              <Bot size={22} className="text-white" />
              {globalEnabled && (
                <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
              )}
            </div>
            <div>
              <div className="banner-name flex items-center gap-2">
                <span>SagarBot AI Copilot Permissions</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                  {selectedCategory}
                </span>
                {hasChanges && (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 rounded border border-amber-300 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Unsaved Changes
                  </span>
                )}
              </div>
              <div className="banner-sub flex items-center gap-2">
                <span>
                  Showing {filteredModules.length} modules &bull; {currentViewEnabled} enabled in this view
                </span>
              </div>
            </div>
          </div>

          {/* Banner Actions: Global Switch & Buttons */}
          <div className="banner-actions flex items-center gap-2 flex-wrap">
            {/* Global Master Switch */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Global Bot Switch:
              </span>
              <button
                type="button"
                onClick={() => setGlobalEnabled(!globalEnabled)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  globalEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    globalEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${globalEnabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                {globalEnabled ? 'Active' : 'Off'}
              </span>
            </div>

            {/* Enable/Disable in view */}
            <button
              type="button"
              className="grant-all-btn flex items-center gap-1.5"
              onClick={() => toggleCategoryInView(true)}
              title="Enable all modules in current filtered view"
            >
              <Check size={14} />
              Enable All
            </button>
            <button
              type="button"
              className="revoke-all-btn flex items-center gap-1.5"
              onClick={() => toggleCategoryInView(false)}
              title="Disable all modules in current filtered view"
            >
              <X size={14} />
              Disable All
            </button>

            {/* Reset Defaults */}
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <RotateCcw size={13} />
              Reset
            </button>

            {/* Save Changes */}
            <button
              type="button"
              className="save-btn flex items-center gap-1.5 shadow-sm"
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: hasChanges ? '#2563EB' : '#3B82F6',
                boxShadow: hasChanges ? '0 0 10px rgba(37,99,235,0.4)' : 'none'
              }}
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Disabled Alert Banner if Global Switch is OFF */}
        {!globalEnabled && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <div className="flex-1 font-medium">
              <strong>Global Master Switch is turned OFF.</strong> SagarBot Copilot is temporarily deactivated across all modules regardless of individual settings. Toggle Global Switch ON to resume Copilot.
            </div>
            <button
              type="button"
              onClick={() => setGlobalEnabled(true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-colors"
            >
              Turn On Globally
            </button>
          </div>
        )}

        {/* Table / 2-Dimensional Matrix Area */}
        <div className="table-area">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '42%' }}>Module & Scope</th>
                  <th style={{ width: '25%' }}>Category</th>
                  <th style={{ width: '18%' }}>Copilot Feature Scope</th>
                  <th className="c" style={{ width: '15%' }}>Copilot Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search size={28} className="text-slate-300" />
                        <span className="font-semibold">No matching modules found</span>
                        <span className="text-xs">Try clearing search filters or selecting a different category.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((item) => {
                    const isEnabled = item.isEnabled;
                    const { Icon: ModIcon, color: modColor, bg: modBg } = getModuleIconAndColor(item.itemName);
                    const isDashboard = item.itemKey === 'dashboard';

                    return (
                      <tr 
                        key={item.itemKey}
                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                          isDashboard ? 'bg-blue-50/30 dark:bg-blue-950/20 font-semibold' : ''
                        }`}
                      >
                        {/* 1. Module Name & Key */}
                        <td>
                          <div className="mod-cell flex items-center">
                            <div
                              className="icon-badge mr-3 flex-shrink-0 flex items-center justify-center rounded-lg w-8 h-8"
                              style={{ backgroundColor: modBg, color: modColor }}
                            >
                              <ModIcon size={16} />
                            </div>
                            <div>
                              <div className="mod-name flex items-center gap-2" style={{ fontWeight: 600 }}>
                                <span>{item.itemName}</span>
                                {isDashboard && (
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded">
                                    MAIN DASHBOARD
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                <span>KEY: {item.itemKey}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Category Tag */}
                        <td>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.category}
                          </span>
                        </td>

                        {/* 3. Copilot Features */}
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                              Natural Query
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                              Insights
                            </span>
                          </div>
                        </td>

                        {/* 4. Copilot Status Toggle */}
                        <td className="c">
                          <div className="flex items-center justify-center gap-2">
                            <label className="toggle-switch cursor-pointer" title={`Click to turn ${isEnabled ? 'OFF' : 'ON'}`}>
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => toggleItem(item.itemKey)}
                              />
                              <span className={`toggle-slider ${isEnabled ? 'bg-blue-600' : 'bg-slate-300'}`} />
                            </label>

                            <button
                              type="button"
                              onClick={() => toggleItem(item.itemKey)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                                isEnabled
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}
                            >
                              {isEnabled ? 'ENABLED' : 'DISABLED'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="table-footer flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {currentViewEnabled} of {filteredModules.length} modules enabled in view
                </span>
                <span>&bull;</span>
                <span>Total: {totalEnabled} / {totalModules} system-wide</span>
              </div>
              <div className="flex items-center gap-2">
                {hasChanges ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle size={13} />
                    Unsaved permissions &mdash; click Save Changes
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Synchronized with Database
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
