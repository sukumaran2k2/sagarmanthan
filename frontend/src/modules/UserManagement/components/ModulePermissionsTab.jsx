import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { getOrgIconAndColor, getModuleIconAndColor } from '../utils';
import { ORG_LIST, FULL_MODULE_LIST } from '../constants';

const CATEGORY_MAP = {
  'Major Ports': 'Major Ports',
  'Maritime Boards': 'Maritime Boards',
  'Other Organisations': 'Other Organisations-Ministry'
};

export default function ModulePermissionsTab({
  masterOrgs,
  selectedModuleOrg,
  setSelectedModuleOrg,
  orgModuleState,
  toggleOrgModule,
  setAllOrgModules,
  saveModulePermissions
}) {
  const [expandedParents, setExpandedParents] = useState(new Set(['Major Ports']));

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

  // Helper to determine if an organization name belongs to a parent category
  const getParentOfOrg = (orgName) => {
    if (!masterOrgs) return null;
    const orgObj = masterOrgs.find(o => o.organisation_name === orgName);
    if (!orgObj) return null;
    const dbCat = orgObj.organisation_category_name;
    // Reverse lookup CATEGORY_MAP
    return Object.keys(CATEGORY_MAP).find(key => CATEGORY_MAP[key] === dbCat) || null;
  };

  // Automatically expand the parent category of the currently selected organization
  useEffect(() => {
    const parent = getParentOfOrg(selectedModuleOrg);
    if (parent) {
      setExpandedParents(prev => {
        if (prev.has(parent)) return prev;
        const next = new Set(prev);
        next.add(parent);
        return next;
      });
    }
  }, [selectedModuleOrg, masterOrgs]);

  return (
    <>
      <div className="sidebar" style={{ width: "290px" }}>
        <div className="sidebar-head">
          <div className="sidebar-head-top">
            <span className="sidebar-title">Organizations</span>
          </div>
        </div>
        
        <div className="user-list" style={{ height: "calc(100% - 60px)", overflowY: "auto" }}>
          {ORG_LIST.map((item) => {
            const dbCategory = CATEGORY_MAP[item];
            const isParent = dbCategory !== undefined;
            const isExpanded = expandedParents.has(item);
            
            // Get children organizations for this parent from fetched database list
            const children = isParent && masterOrgs
              ? masterOrgs.filter(o => o.organisation_category_name === dbCategory)
              : [];

            const isSelected = selectedModuleOrg === item;
            const {
              Icon: OrgIcon,
              color: orgColor,
              bg: orgBg,
            } = getOrgIconAndColor(item);

            if (isParent) {
              return (
                <div key={item} className="flex flex-col w-full">
                  {/* Category Header Row */}
                  <div
                    className={`user-item parent-item flex items-center justify-between cursor-pointer hover:bg-slate-50 py-2.5 px-3 border-b border-slate-100 ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => toggleParent(item)}
                    style={{ fontWeight: 700, color: "#1e293b" }}
                  >
                    <div className="flex items-center">
                      <div
                        className="icon-badge mr-2.5 flex-shrink-0"
                        style={{ backgroundColor: orgBg, color: orgColor }}
                      >
                        <OrgIcon size={14} />
                      </div>
                      <span style={{ fontSize: "12px" }}>{item}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                  </div>

                  {/* Children Sub-list */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-b border-slate-100 flex flex-col">
                      {children.length > 0 ? (
                        children.map((child) => {
                          const childName = child.organisation_name;
                          const isChildSelected = selectedModuleOrg === childName;
                          return (
                            <div
                              key={childName}
                              className={`user-item child-item flex items-center pl-8 pr-3 py-2 cursor-pointer transition ${
                                isChildSelected ? "selected bg-blue-50/70 border-l-4 border-blue-600 font-bold" : "hover:bg-slate-100/70"
                              }`}
                              onClick={() => setSelectedModuleOrg(childName)}
                            >
                              <span 
                                className="truncate text-left flex-1" 
                                style={{ fontSize: "11px", color: isChildSelected ? "#1d4ed8" : "#475569" }}
                                title={childName}
                              >
                                {childName}
                              </span>
                              {isChildSelected && (
                                <Check size={12} className="text-blue-600 ml-1.5 flex-shrink-0" />
                              )}
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

            // Normal flat list item
            return (
              <div
                key={item}
                className={`user-item flex items-center py-2.5 px-3 border-b border-slate-100 cursor-pointer ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => setSelectedModuleOrg(item)}
              >
                <div
                  className="icon-badge mr-2.5 flex-shrink-0"
                  style={{ backgroundColor: orgBg, color: orgColor }}
                >
                  <OrgIcon size={14} />
                </div>
                <div className="user-info truncate">
                  <div
                    className="user-name truncate text-left"
                    style={{ fontSize: "12px", fontWeight: isSelected ? 700 : 500 }}
                  >
                    {item}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
              <div className="banner-name">{selectedModuleOrg}</div>
              <div className="banner-sub">
                Toggle modules available for this organization
              </div>
            </div>
          </div>
          <div className="banner-actions">
            <button
              className="grant-all-btn"
              onClick={() => setAllOrgModules(true)}
            >
              ✓ Enable All
            </button>
            <button
              className="revoke-all-btn"
              onClick={() => setAllOrgModules(false)}
            >
              ✕ Disable All
            </button>
            <button className="save-btn" onClick={saveModulePermissions}>
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
                  <th className="c" style={{ width: "120px" }}>
                    Enabled
                  </th>
                </tr>
              </thead>
              <tbody>
                {FULL_MODULE_LIST.map((m) => {
                  const isEnabled =
                    orgModuleState[selectedModuleOrg]?.[m] || false;
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
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) =>
                              toggleOrgModule(
                                selectedModuleOrg,
                                m,
                                e.target.checked,
                              )
                            }
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-footer">
              <span>
                {
                  Object.values(
                    orgModuleState[selectedModuleOrg] || {},
                  ).filter(Boolean).length
                }{" "}
                / {FULL_MODULE_LIST.length} modules enabled for{" "}
                {selectedModuleOrg}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
