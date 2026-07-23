import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Building2, 
  ShieldCheck, 
  Layers, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  XCircle,
  X
} from 'lucide-react';
import { FULL_MODULE_LIST } from '../constants';
import { getOrgIconAndColor, getModuleIconAndColor } from '../utils';

const CATEGORY_MAP = {
  'Major Ports': 'Major Ports',
  'Maritime Boards': 'Maritime Boards',
  'Other Organisations': 'Other Organisations-Ministry'
};

export default function ModulePermissionListTab({
  orgModuleState = {},
  toggleOrgModule,
  setAllOrgModules,
  showToast
}) {
  const [selectedOrg, setSelectedOrg] = useState('All Organizations');
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [moduleSearchTerm, setModuleSearchTerm] = useState('');
  const [expandedParents, setExpandedParents] = useState(new Set(['Major Ports', 'Maritime Boards', 'Other Organisations']));

  // Toggle parent category expansion
  const toggleParent = (parentName) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentName)) next.delete(parentName);
      else next.add(parentName);
      return next;
    });
  };

  // Master Organizations List
  const masterOrgsList = useMemo(() => {
    return [
      { name: 'Ministry of Ports, Shipping and Waterways', category: 'Ministry' },
      { name: 'Major Ports', category: 'Category', isParent: true },
      { name: 'Syama Prasad Mookerjee Port Kolkata', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'Paradip Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'Visakhapatnam Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'Kamarajar Port Limited', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'Chennai Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'V.O. Chidambaranar Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'Cochin Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'New Mangalore Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'Mormugao Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'Jawaharlal Nehru Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'Deendayal Port Authority', category: 'Major Ports', parent: 'Major Ports' },
      { name: 'CSL', category: 'Other Organisations' },
      { name: 'SCI', category: 'Other Organisations' },
      { name: 'DGLL', category: 'Other Organisations' },
      { name: 'DGS', category: 'Other Organisations' },
      { name: 'ALHW', category: 'Other Organisations' },
      { name: 'IWAI', category: 'Other Organisations' },
      { name: 'DCI', category: 'Other Organisations' },
      { name: 'IMU', category: 'Other Organisations' },
      { name: 'IPRCL', category: 'Other Organisations' },
      { name: 'SDCL', category: 'Other Organisations' },
      { name: 'Maritime Boards', category: 'Category', isParent: true },
      { name: 'Gujarat Maritime Board', category: 'Maritime Boards', parent: 'Maritime Boards' },
      { name: 'Maharashtra Maritime Board', category: 'Maritime Boards', parent: 'Maritime Boards' },
      { name: 'Tamil Nadu Maritime Board', category: 'Maritime Boards', parent: 'Maritime Boards' },
      { name: 'Other Organisations', category: 'Category', isParent: true },
      { name: 'IPA', category: 'Other Organisations', parent: 'Other Organisations' },
      { name: 'CMEC', category: 'Other Organisations', parent: 'Other Organisations' },
      { name: 'CAG', category: 'Other Organisations', parent: 'Other Organisations' }
    ];
  }, []);

  // Filtered organizations for the left sidebar
  const filteredOrgs = useMemo(() => {
    if (!orgSearchTerm.trim()) return masterOrgsList;
    const q = orgSearchTerm.toLowerCase();
    return masterOrgsList.filter(o => 
      o.name.toLowerCase().includes(q) || o.category.toLowerCase().includes(q)
    );
  }, [masterOrgsList, orgSearchTerm]);

  // Compute modules and their enabled state for the currently selected organization
  const modulesForSelectedOrg = useMemo(() => {
    return FULL_MODULE_LIST.map((mName, idx) => {
      let isEnabled = true;

      if (selectedOrg === 'All Organizations') {
        // If All Organizations selected, check if enabled across all
        isEnabled = Object.values(orgModuleState).every(map => map?.[mName] !== false);
      } else {
        isEnabled = orgModuleState[selectedOrg]?.[mName] !== false;
      }

      return {
        id: `mod_${idx + 1}`,
        name: mName,
        isEnabled
      };
    });
  }, [selectedOrg, orgModuleState]);

  // Filtered modules for the right panel table
  const filteredModules = useMemo(() => {
    if (!moduleSearchTerm.trim()) return modulesForSelectedOrg;
    const q = moduleSearchTerm.toLowerCase();
    return modulesForSelectedOrg.filter(m => m.name.toLowerCase().includes(q));
  }, [modulesForSelectedOrg, moduleSearchTerm]);

  // Enabled modules count for current selection
  const enabledCount = useMemo(() => {
    return modulesForSelectedOrg.filter(m => m.isEnabled).length;
  }, [modulesForSelectedOrg]);

  // Toggle single module permission
  const handleToggleModule = (mName, nextVal) => {
    if (toggleOrgModule) {
      toggleOrgModule(mName, nextVal);
    }
  };

  // Enable all modules for current org
  const handleEnableAll = () => {
    if (setAllOrgModules) setAllOrgModules(true);
    if (showToast) showToast(`✅ Enabled all modules for ${selectedOrg}`, '#10B981');
  };

  // Disable all modules for current org
  const handleDisableAll = () => {
    if (setAllOrgModules) setAllOrgModules(false);
    if (showToast) showToast(`❌ Disabled all modules for ${selectedOrg}`, '#EF4444');
  };

  const { Icon: SelectedOrgIcon, color: selectedOrgColor, bg: selectedOrgBg } = getOrgIconAndColor(selectedOrg);

  return (
    <div className="w-full h-full flex bg-slate-50 overflow-hidden font-sans text-left">
      {/* Left Sidebar: Organization List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-[#0f417a]" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Organizations & Categories
              </h3>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-50 text-[#0f417a] rounded-full border border-blue-100">
              {masterOrgsList.length} Items
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search organization..."
              value={orgSearchTerm}
              onChange={(e) => setOrgSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Scrollable Organization Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
          {/* Top Option: All Organizations */}
          <div
            className={`flex items-center justify-between py-3 px-4 cursor-pointer transition ${
              selectedOrg === 'All Organizations'
                ? 'bg-blue-50/80 border-l-4 border-[#0f417a] font-extrabold text-[#0f417a]'
                : 'hover:bg-slate-50 text-slate-700 font-semibold'
            }`}
            onClick={() => setSelectedOrg('All Organizations')}
          >
            <div className="flex items-center space-x-2.5 truncate">
              <div className="p-1.5 rounded-lg bg-blue-100 text-[#0f417a] flex-shrink-0">
                <Building2 size={14} />
              </div>
              <span className="truncate">All Organizations</span>
            </div>
            {selectedOrg === 'All Organizations' && (
              <Check size={14} className="text-[#0f417a] flex-shrink-0 ml-1" />
            )}
          </div>

          {/* Rendered Organization Tree / Flat List */}
          {filteredOrgs.map((org) => {
            const isSelected = selectedOrg === org.name;
            const { Icon: OrgIcon, color: orgColor, bg: orgBg } = getOrgIconAndColor(org.name);

            if (org.isParent) {
              const isExpanded = expandedParents.has(org.name);
              const children = masterOrgsList.filter(o => o.parent === org.name);

              return (
                <div key={org.name} className="flex flex-col">
                  {/* Category Parent Row */}
                  <div
                    className={`flex items-center justify-between py-3 px-4 cursor-pointer transition ${
                      isSelected
                        ? 'bg-purple-50/80 border-l-4 border-purple-600 font-extrabold text-purple-900'
                        : 'hover:bg-slate-50 text-slate-800 font-bold'
                    }`}
                    onClick={() => {
                      setSelectedOrg(org.name);
                      if (!isExpanded) toggleParent(org.name);
                    }}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: orgBg, color: orgColor }}>
                        <OrgIcon size={14} />
                      </div>
                      <span className="truncate" title={org.name}>{org.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isSelected && <Check size={14} className="text-purple-600" />}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleParent(org.name);
                        }}
                        className="p-1 hover:bg-slate-200/60 rounded transition cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Children Sub-list */}
                  {isExpanded && children.length > 0 && (
                    <div className="bg-slate-50/60 border-t border-slate-100">
                      {children.map(child => {
                        const isChildSelected = selectedOrg === child.name;
                        return (
                          <div
                            key={child.name}
                            className={`flex items-center justify-between py-2.5 pl-9 pr-4 cursor-pointer transition ${
                              isChildSelected
                                ? 'bg-blue-50/80 border-l-4 border-[#0f417a] font-extrabold text-[#0f417a]'
                                : 'hover:bg-slate-100/70 text-slate-600 font-medium'
                            }`}
                            onClick={() => setSelectedOrg(child.name)}
                          >
                            <span className="truncate" title={child.name}>{child.name}</span>
                            {isChildSelected && <Check size={12} className="text-[#0f417a] flex-shrink-0 ml-1" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (org.parent) return null; // rendered inside parent

            return (
              <div
                key={org.name}
                className={`flex items-center justify-between py-3 px-4 cursor-pointer transition ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-4 border-[#0f417a] font-extrabold text-[#0f417a]'
                    : 'hover:bg-slate-50 text-slate-700 font-semibold'
                }`}
                onClick={() => setSelectedOrg(org.name)}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: orgBg, color: orgColor }}>
                    <OrgIcon size={14} />
                  </div>
                  <span className="truncate" title={org.name}>{org.name}</span>
                </div>
                {isSelected && <Check size={14} className="text-[#0f417a] flex-shrink-0 ml-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side Main Content Panel: Modules Permission Table */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Banner Bar for Selected Organization */}
        <div className="bg-white border-b border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl flex-shrink-0 shadow-2xs" style={{ backgroundColor: selectedOrgBg, color: selectedOrgColor }}>
              <SelectedOrgIcon size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-slate-900 font-display">
                  {selectedOrg}
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-[#0f417a] text-[10px] font-extrabold rounded-md border border-blue-100">
                  {enabledCount} / {FULL_MODULE_LIST.length} Modules Enabled
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Toggle module permissions available for {selectedOrg}.
              </p>
            </div>
          </div>

          {/* Module Search & Bulk Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="Search modules..."
                value={moduleSearchTerm}
                onChange={(e) => setModuleSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={handleEnableAll}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition cursor-pointer flex-shrink-0"
            >
              ✓ Enable All
            </button>
            <button
              type="button"
              onClick={handleDisableAll}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex-shrink-0"
            >
              ✕ Disable All
            </button>
          </div>
        </div>

        {/* Modules Table for Selected Organization */}
        <div className="flex-1 overflow-auto p-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-14 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Module Name</th>
                  <th className="py-3.5 px-4 text-center min-w-[180px]">Access Permission Status</th>
                  <th className="py-3.5 px-4 text-center min-w-[140px]">Toggle Permission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {filteredModules.length > 0 ? (
                  filteredModules.map((item, idx) => {
                    const { Icon: ModIcon, color: modColor, bg: modBg } = getModuleIconAndColor(item.name);
                    return (
                      <tr key={item.name} className="hover:bg-slate-50/80 transition-colors">
                        {/* # S.No */}
                        <td className="py-3.5 px-4 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Module Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs"
                              style={{ backgroundColor: modBg, color: modColor }}
                            >
                              <ModIcon size={18} />
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-slate-900">{item.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{item.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Permission Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            item.isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {item.isEnabled ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            <span>{item.isEnabled ? 'Permission Enabled' : 'Permission Restricted'}</span>
                          </span>
                        </td>

                        {/* Toggle Switch Button */}
                        <td className="py-3.5 px-4 text-center">
                          <label className="toggle-switch inline-block cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isEnabled}
                              onChange={(e) => handleToggleModule(item.name, e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 italic font-medium">
                      No modules match search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
