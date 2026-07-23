import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, Building2, Minus } from 'lucide-react';
import { getOrgIconAndColor, getModuleIconAndColor } from '../utils';
import { ORG_LIST, FULL_MODULE_LIST } from '../constants';

const CATEGORY_MAP = {
  'Major Ports': 'Major Ports',
  'Maritime Boards': 'Maritime Boards',
  'Other Organisations': 'Other Organisations-Ministry'
};

export default function ModulePermissionsTab({
  masterOrgs,
  selectedModuleOrgs,
  setSelectedModuleOrgs,
  orgModuleState,
  toggleOrgModule,
  setAllOrgModules,
  saveModulePermissions
}) {
  const [expandedParents, setExpandedParents] = useState(new Set(['Major Ports', 'Maritime Boards', 'Other Organisations']));

  // Toggle parent category expansion
  const toggleParent = (parentName) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentName)) {
        next.delete(parentName);
      } else {
        next.add(parentName);
      }
      return next;
    });
  };

  // Get all valid items list (categories + all orgs)
  const allOrgKeys = useMemo(() => {
    const keys = new Set(['Major Ports', 'Maritime Boards', 'Other Organisations', ...ORG_LIST]);
    if (masterOrgs) {
      masterOrgs.forEach(o => keys.add(o.organisation_name));
    }
    return Array.from(keys);
  }, [masterOrgs]);

  // Check if ALL options are selected
  const isAllSelected = useMemo(() => {
    return allOrgKeys.length > 0 && allOrgKeys.every(k => selectedModuleOrgs.has(k));
  }, [allOrgKeys, selectedModuleOrgs]);

  // Check if SOME options are selected
  const isSomeSelected = useMemo(() => {
    return selectedModuleOrgs.size > 0 && !isAllSelected;
  }, [selectedModuleOrgs, isAllSelected]);

  // Toggle Select All
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedModuleOrgs(new Set());
    } else {
      setSelectedModuleOrgs(new Set(allOrgKeys));
    }
  };

  // Toggle selection for an individual item or parent category with children
  const toggleSelectOrg = (itemKey, childNames = []) => {
    setSelectedModuleOrgs(prev => {
      const next = new Set(prev);
      const isCurrentlySelected = next.has(itemKey);

      if (isCurrentlySelected) {
        next.delete(itemKey);
        childNames.forEach(c => next.delete(c));
      } else {
        next.add(itemKey);
        childNames.forEach(c => next.add(c));
      }

      return next;
    });
  };

  // Compute status for a parent category checkbox (true, false, or 'indeterminate')
  const getCategorySelectStatus = (parentKey, childNames = []) => {
    if (childNames.length === 0) return selectedModuleOrgs.has(parentKey);
    const selectedChildCount = childNames.filter(c => selectedModuleOrgs.has(c)).length;
    if (selectedChildCount === childNames.length) return true;
    if (selectedChildCount === 0 && !selectedModuleOrgs.has(parentKey)) return false;
    return 'indeterminate';
  };

  // Compute status for a module across selected organizations (true, false, or 'indeterminate')
  const getModuleStatus = (m) => {
    if (!selectedModuleOrgs || selectedModuleOrgs.size === 0) return false;
    const orgs = Array.from(selectedModuleOrgs);
    let enabledCount = 0;

    orgs.forEach(org => {
      if (orgModuleState[org]?.[m]) enabledCount++;
    });

    if (enabledCount === orgs.length) return true;
    if (enabledCount === 0) return false;
    return 'indeterminate';
  };

  return (
    <>
      {/* Multi-Select Organizations Sidebar */}
      <div className="sidebar" style={{ width: "300px" }}>
        <div className="sidebar-head">
          <div className="sidebar-head-top flex items-center justify-between">
            <span className="sidebar-title">Select Organizations</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {selectedModuleOrgs.size} Selected
            </span>
          </div>
        </div>
        
        <div className="user-list" style={{ height: "calc(100% - 60px)", overflowY: "auto" }}>
          {/* Select All Organizations Checkbox Row */}
          <div
            className={`user-item flex items-center justify-between py-2.5 px-3 border-b border-slate-100 cursor-pointer transition ${
              isAllSelected ? "selected bg-blue-50/80 font-bold" : "hover:bg-slate-50"
            }`}
            onClick={toggleSelectAll}
          >
            <div className="flex items-center truncate">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                onChange={toggleSelectAll}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mr-2.5 flex-shrink-0"
              />
              <div
                className="icon-badge mr-2 flex-shrink-0"
                style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
              >
                <Building2 size={13} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                Select All ({allOrgKeys.length})
              </span>
            </div>
          </div>

          {/* Categories & Organizations Tree List */}
          {ORG_LIST.map((item) => {
            const dbCategory = CATEGORY_MAP[item];
            const isParent = dbCategory !== undefined;
            const isExpanded = expandedParents.has(item);
            
            const children = isParent && masterOrgs
              ? masterOrgs.filter(o => o.organisation_category_name === dbCategory)
              : [];
            const childrenNames = children.map(c => c.organisation_name);

            const catStatus = isParent ? getCategorySelectStatus(item, childrenNames) : selectedModuleOrgs.has(item);
            const {
              Icon: OrgIcon,
              color: orgColor,
              bg: orgBg,
            } = getOrgIconAndColor(item);

            if (isParent) {
              return (
                <div key={item} className="flex flex-col w-full">
                  {/* Parent Category Row with Checkbox */}
                  <div
                    className={`user-item parent-item flex items-center justify-between cursor-pointer hover:bg-slate-50 py-2.5 px-3 border-b border-slate-100 transition ${
                      catStatus === true ? "selected bg-purple-50/75 font-bold" : catStatus === 'indeterminate' ? "bg-purple-50/30" : ""
                    }`}
                    onClick={() => toggleSelectOrg(item, childrenNames)}
                    style={{ fontWeight: 700, color: "#1e293b" }}
                  >
                    <div className="flex items-center truncate mr-1">
                      <input
                        type="checkbox"
                        checked={catStatus === true}
                        ref={el => { if (el) el.indeterminate = (catStatus === 'indeterminate'); }}
                        onChange={() => toggleSelectOrg(item, childrenNames)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer mr-2.5 flex-shrink-0"
                      />
                      <div
                        className="icon-badge mr-2 flex-shrink-0"
                        style={{ backgroundColor: orgBg, color: orgColor }}
                      >
                        <OrgIcon size={13} />
                      </div>
                      <span style={{ fontSize: "12px" }} className="truncate" title={item}>{item}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleParent(item);
                      }}
                      className="p-1 hover:bg-slate-200/60 rounded transition cursor-pointer flex-shrink-0 ml-1"
                      title={isExpanded ? "Collapse Category" : "Expand Category"}
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-slate-500" />
                      ) : (
                        <ChevronRight size={14} className="text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Children Sub-list */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-b border-slate-100 flex flex-col">
                      {children.length > 0 ? (
                        children.map((child) => {
                          const childName = child.organisation_name;
                          const isChildSelected = selectedModuleOrgs.has(childName);
                          return (
                            <div
                              key={childName}
                              className={`user-item child-item flex items-center pl-7 pr-3 py-2 cursor-pointer transition ${
                                isChildSelected ? "selected bg-blue-50/70 font-bold" : "hover:bg-slate-100/70"
                              }`}
                              onClick={() => toggleSelectOrg(childName)}
                            >
                              <input
                                type="checkbox"
                                checked={isChildSelected}
                                onChange={() => toggleSelectOrg(childName)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mr-2 flex-shrink-0"
                              />
                              <span 
                                className="truncate text-left flex-1" 
                                style={{ fontSize: "11px", color: isChildSelected ? "#1d4ed8" : "#475569" }}
                                title={childName}
                              >
                                {childName}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="pl-8 py-2 text-[10px] text-slate-400 italic text-left">
                          Loading organizations...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // Flat list item
            const isFlatSelected = selectedModuleOrgs.has(item);
            return (
              <div
                key={item}
                className={`user-item flex items-center py-2.5 px-3 border-b border-slate-100 cursor-pointer ${
                  isFlatSelected ? "selected bg-blue-50/70 font-bold" : ""
                }`}
                onClick={() => toggleSelectOrg(item)}
              >
                <input
                  type="checkbox"
                  checked={isFlatSelected}
                  onChange={() => toggleSelectOrg(item)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mr-2.5 flex-shrink-0"
                />
                <div
                  className="icon-badge mr-2 flex-shrink-0"
                  style={{ backgroundColor: orgBg, color: orgColor }}
                >
                  <OrgIcon size={13} />
                </div>
                <div className="user-info truncate">
                  <div
                    className="user-name truncate text-left"
                    style={{ fontSize: "12px", fontWeight: isFlatSelected ? 700 : 500 }}
                  >
                    {item}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Module Permissions Configuration Panel */}
      <div className="main">
        <div className="user-banner">
          <div className="user-banner-left">
            <div
              className="banner-avatar"
              style={{ background: "#8B5CF6" }}
            >
              🏢
            </div>
            <div>
              <div className="banner-name flex items-center gap-2">
                <span>{selectedModuleOrgs.size} Selected Organizations & Categories</span>
              </div>
              <div className="banner-sub">
                Toggle module availability for all {selectedModuleOrgs.size} selected items simultaneously
              </div>
            </div>
          </div>
          <div className="banner-actions">
            <button
              className="grant-all-btn"
              onClick={() => setAllOrgModules(true)}
              disabled={selectedModuleOrgs.size === 0}
            >
              ✓ Enable All
            </button>
            <button
              className="revoke-all-btn"
              onClick={() => setAllOrgModules(false)}
              disabled={selectedModuleOrgs.size === 0}
            >
              ✕ Disable All
            </button>
            <button 
              className="save-btn" 
              onClick={saveModulePermissions}
              disabled={selectedModuleOrgs.size === 0}
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="table-area">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module Name</th>
                  <th className="c" style={{ width: "160px" }}>
                    Module Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {FULL_MODULE_LIST.map((m) => {
                  const modStatus = getModuleStatus(m);
                  const {
                    Icon: ModIcon,
                    color: modColor,
                    bg: modBg,
                  } = getModuleIconAndColor(m);
                  return (
                    <tr key={m}>
                      <td>
                        <div className="mod-cell">
                          <div
                            className="icon-badge mr-3"
                            style={{
                              backgroundColor: modBg,
                              color: modColor,
                            }}
                          >
                            <ModIcon size={16} />
                          </div>
                          <div
                            className="mod-name"
                            style={{ fontWeight: 600, color: "#475569" }}
                          >
                            {m}
                          </div>
                        </div>
                      </td>
                      <td className="c">
                        <div className="flex items-center justify-center gap-2">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={modStatus === true}
                              disabled={selectedModuleOrgs.size === 0}
                              onChange={() => {
                                const nextVal = modStatus !== true;
                                toggleOrgModule(m, nextVal);
                              }}
                            />
                            <span className={`toggle-slider ${modStatus === 'indeterminate' ? 'opacity-80 bg-amber-400' : ''}`}></span>
                          </label>

                          {modStatus === 'indeterminate' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                              Partial
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-footer flex justify-between items-center">
              <span>
                {selectedModuleOrgs.size} / {allOrgKeys.length} Organizations & Categories Selected
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Changes apply to all checked organizations simultaneously
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
