import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { getOrgIconAndColor, getModuleIconAndColor } from '../utils';

export default function ModulePermissionsTab({
  organisations = [],
  categories = [],
  masterModules = [],
  selectedModuleOrgIds,
  setSelectedModuleOrgIds,
  orgModuleState,
  toggleOrgModule,
  setAllOrgModules,
  saveModulePermissions,
  saving = false,
}) {
  const [expandedParents, setExpandedParents] = useState(() => new Set());

  const orgsByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.category_id] = {
        category: c,
        orgs: organisations.filter(
          (o) => String(o.category_id) === String(c.category_id)
        ),
      };
    });
    return map;
  }, [categories, organisations]);

  const allOrgIds = useMemo(
    () => organisations.map((o) => o.organisation_id),
    [organisations]
  );

  const isAllSelected =
    allOrgIds.length > 0 && allOrgIds.every((id) => selectedModuleOrgIds.has(id));
  const isSomeSelected = selectedModuleOrgIds.size > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedModuleOrgIds(new Set());
    else setSelectedModuleOrgIds(new Set(allOrgIds));
  };

  const toggleSelectOrg = (orgId, childIds = []) => {
    setSelectedModuleOrgIds((prev) => {
      const next = new Set(prev);
      const ids = childIds.length ? childIds : [orgId];
      const allOn = ids.every((id) => next.has(id));
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const getCategorySelectStatus = (childIds) => {
    if (childIds.length === 0) return false;
    const n = childIds.filter((id) => selectedModuleOrgIds.has(id)).length;
    if (n === childIds.length) return true;
    if (n === 0) return false;
    return 'indeterminate';
  };

  const getModuleStatus = (moduleId) => {
    if (selectedModuleOrgIds.size === 0) return false;
    let enabled = 0;
    selectedModuleOrgIds.forEach((orgId) => {
      if (orgModuleState[orgId]?.[moduleId]) enabled++;
    });
    if (enabled === selectedModuleOrgIds.size) return true;
    if (enabled === 0) return false;
    return 'indeterminate';
  };

  const toggleParent = (categoryId) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  return (
    <>
      <div className="sidebar" style={{ width: '300px' }}>
        <div className="sidebar-head">
          <div className="sidebar-head-top flex items-center justify-between">
            <span className="sidebar-title">Select Organizations</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {selectedModuleOrgIds.size} Selected
            </span>
          </div>
        </div>

        <div className="user-list" style={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}>
          <div
            className={`user-item flex items-center py-2.5 px-3 border-b border-slate-100 cursor-pointer ${
              isAllSelected ? 'selected bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
            }`}
            onClick={toggleSelectAll}
          >
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected;
              }}
              onChange={toggleSelectAll}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 mr-2.5"
            />
            <div
              className="icon-badge mr-2"
              style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
            >
              <Building2 size={13} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>
              Select All ({allOrgIds.length})
            </span>
          </div>

          {categories.map((cat) => {
            const group = orgsByCategory[cat.category_id];
            const children = group?.orgs || [];
            const childIds = children.map((c) => c.organisation_id);
            const isExpanded = expandedParents.has(cat.category_id);
            const catStatus = getCategorySelectStatus(childIds);
            const { Icon: OrgIcon, color: orgColor, bg: orgBg } = getOrgIconAndColor(
              cat.category_name
            );

            return (
              <div key={cat.category_id} className="flex flex-col w-full">
                <div
                  className={`user-item parent-item flex items-center justify-between cursor-pointer hover:bg-slate-50 py-2.5 px-3 border-b border-slate-100 ${
                    catStatus === true
                      ? 'selected bg-purple-50/75 font-bold'
                      : catStatus === 'indeterminate'
                        ? 'bg-purple-50/30'
                        : ''
                  }`}
                  onClick={() => toggleSelectOrg(null, childIds)}
                >
                  <div className="flex items-center truncate mr-1">
                    <input
                      type="checkbox"
                      checked={catStatus === true}
                      ref={(el) => {
                        if (el) el.indeterminate = catStatus === 'indeterminate';
                      }}
                      onChange={() => toggleSelectOrg(null, childIds)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 mr-2.5"
                    />
                    <div
                      className="icon-badge mr-2"
                      style={{ backgroundColor: orgBg, color: orgColor }}
                    >
                      <OrgIcon size={13} />
                    </div>
                    <span style={{ fontSize: '12px' }} className="truncate">
                      {cat.category_name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleParent(cat.category_id);
                    }}
                    className="p-1 hover:bg-slate-200/60 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-slate-500" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-500" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50/50 border-b border-slate-100 flex flex-col">
                    {children.map((child) => {
                      const selected = selectedModuleOrgIds.has(child.organisation_id);
                      return (
                        <div
                          key={child.organisation_id}
                          className={`user-item child-item flex items-center pl-7 pr-3 py-2 cursor-pointer ${
                            selected ? 'selected bg-blue-50/70 font-bold' : 'hover:bg-slate-100/70'
                          }`}
                          onClick={() => toggleSelectOrg(child.organisation_id)}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelectOrg(child.organisation_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 mr-2"
                          />
                          <span
                            className="truncate text-left flex-1"
                            style={{
                              fontSize: '11px',
                              color: selected ? '#1d4ed8' : '#475569',
                            }}
                          >
                            {child.organisation_name}
                          </span>
                        </div>
                      );
                    })}
                    {children.length === 0 && (
                      <div className="pl-8 py-2 text-[10px] text-slate-400 italic">
                        No organisations in this category
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="main">
        <div className="user-banner">
          <div className="user-banner-left">
            <div className="banner-avatar" style={{ background: '#8B5CF6' }}>
              🏢
            </div>
            <div>
              <div className="banner-name">
                {selectedModuleOrgIds.size} Selected Organisation(s)
              </div>
              <div className="banner-sub">
                Toggle module availability for selected organisations
              </div>
            </div>
          </div>
          <div className="banner-actions">
            <button
              className="grant-all-btn"
              onClick={() => setAllOrgModules(true)}
              disabled={selectedModuleOrgIds.size === 0}
            >
              Enable All
            </button>
            <button
              className="revoke-all-btn"
              onClick={() => setAllOrgModules(false)}
              disabled={selectedModuleOrgIds.size === 0}
            >
              Disable All
            </button>
            <button
              className="save-btn"
              onClick={saveModulePermissions}
              disabled={selectedModuleOrgIds.size === 0 || saving}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="table-area">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module Name</th>
                  <th className="c" style={{ width: '160px' }}>
                    Module Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {masterModules.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="empty">
                      No modules found
                    </td>
                  </tr>
                ) : (
                  masterModules.map((m) => {
                    const modStatus = getModuleStatus(m.module_id);
                    const {
                      Icon: ModIcon,
                      color: modColor,
                      bg: modBg,
                    } = getModuleIconAndColor(m.module_name);
                    return (
                      <tr key={m.module_id}>
                        <td>
                          <div className="mod-cell">
                            <div
                              className="icon-badge mr-3"
                              style={{ backgroundColor: modBg, color: modColor }}
                            >
                              <ModIcon size={16} />
                            </div>
                            <div className="mod-name" style={{ fontWeight: 600 }}>
                              {m.module_name}
                            </div>
                          </div>
                        </td>
                        <td className="c">
                          <div className="flex items-center justify-center gap-2">
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={modStatus === true}
                                disabled={selectedModuleOrgIds.size === 0}
                                onChange={() =>
                                  toggleOrgModule(m.module_id, modStatus !== true)
                                }
                              />
                              <span
                                className={`toggle-slider ${
                                  modStatus === 'indeterminate'
                                    ? 'opacity-80 bg-amber-400'
                                    : ''
                                }`}
                              />
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
                  })
                )}
              </tbody>
            </table>
            <div className="table-footer flex justify-between items-center">
              <span>
                {selectedModuleOrgIds.size} / {allOrgIds.length} organisations selected
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
