import React, { useState, useMemo, useEffect } from 'react';
import { Search, Building2, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { getOrgIconAndColor, getModuleIconAndColor } from '../utils';
import { rbacApi } from '../rbacApi';

export default function ModulePermissionListTab({
  organisations = [],
  categories = [],
  masterModules = [],
  showToast,
}) {
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [moduleSearchTerm, setModuleSearchTerm] = useState('');
  const [expandedParents, setExpandedParents] = useState(() => new Set());
  const [localState, setLocalState] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedOrgId) {
      setLocalState({});
      return;
    }
    setLoading(true);
    rbacApi
      .getOrgModulePermissions([selectedOrgId])
      .then((res) => {
        const block = (res.data || [])[0];
        const map = {};
        (block?.modules || []).forEach((m) => {
          map[m.module_id] = !!m.is_allowed;
        });
        masterModules.forEach((m) => {
          if (map[m.module_id] === undefined) map[m.module_id] = false;
        });
        setLocalState(map);
      })
      .catch(() => showToast?.('Failed to load permissions', '#EF4444'))
      .finally(() => setLoading(false));
  }, [selectedOrgId, masterModules, showToast]);

  const filteredOrgs = useMemo(() => {
    const q = orgSearchTerm.trim().toLowerCase();
    if (!q) return organisations;
    return organisations.filter((o) =>
      (o.organisation_name || '').toLowerCase().includes(q)
    );
  }, [organisations, orgSearchTerm]);

  const filteredModules = useMemo(() => {
    const q = moduleSearchTerm.trim().toLowerCase();
    if (!q) return masterModules;
    return masterModules.filter((m) =>
      (m.module_name || '').toLowerCase().includes(q)
    );
  }, [masterModules, moduleSearchTerm]);

  const orgsByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.category_id] = filteredOrgs.filter(
        (o) => String(o.category_id) === String(c.category_id)
      );
    });
    return map;
  }, [categories, filteredOrgs]);

  const selectedOrgName =
    organisations.find((o) => o.organisation_id === selectedOrgId)
      ?.organisation_name || '';

  const allowedCount = useMemo(
    () => Object.values(localState).filter(Boolean).length,
    [localState]
  );

  return (
    <>
      <div className="sidebar" style={{ width: '300px' }}>
        <div className="sidebar-head">
          <div className="sidebar-head-top">
            <span className="sidebar-title">Organisations</span>
          </div>
          <div className="search-wrap">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                className="search-input pl-7"
                placeholder="Search organisations..."
                value={orgSearchTerm}
                onChange={(e) => setOrgSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="user-list" style={{ height: 'calc(100% - 100px)', overflowY: 'auto' }}>
          {categories.map((cat) => {
            const children = orgsByCategory[cat.category_id] || [];
            const isExpanded = expandedParents.has(cat.category_id);
            const { Icon: OrgIcon, color, bg } = getOrgIconAndColor(cat.category_name);

            return (
              <div key={cat.category_id}>
                <div
                  className="user-item flex items-center justify-between py-2 px-3 border-b cursor-pointer hover:bg-slate-50 font-bold"
                  onClick={() =>
                    setExpandedParents((prev) => {
                      const next = new Set(prev);
                      if (next.has(cat.category_id)) next.delete(cat.category_id);
                      else next.add(cat.category_id);
                      return next;
                    })
                  }
                >
                  <div className="flex items-center truncate">
                    <div className="icon-badge mr-2" style={{ backgroundColor: bg, color }}>
                      <OrgIcon size={13} />
                    </div>
                    <span style={{ fontSize: '12px' }}>{cat.category_name}</span>
                    <span className="ml-2 text-[10px] text-slate-400">
                      ({children.length})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </div>
                {isExpanded &&
                  children.map((org) => (
                    <div
                      key={org.organisation_id}
                      className={`user-item pl-7 pr-3 py-2 cursor-pointer border-b ${
                        selectedOrgId === org.organisation_id
                          ? 'selected bg-blue-50 font-bold'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedOrgId(org.organisation_id)}
                    >
                      <span style={{ fontSize: '11px' }}>{org.organisation_name}</span>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="main">
        <div className="user-banner">
          <div className="user-banner-left">
            <div className="banner-avatar" style={{ background: '#0EA5E9' }}>
              <Building2 size={18} />
            </div>
            <div>
              <div className="banner-name">
                {selectedOrgId ? selectedOrgName : 'No organisation selected'}
              </div>
              <div className="banner-sub">
                Select an organisation on the left to view allowed modules. To change access, use Modules → Update.
              </div>
            </div>
          </div>
          <div className="banner-actions">
            <div className="search-wrap" style={{ margin: 0 }}>
              <input
                type="text"
                className="search-input"
                placeholder="Filter modules..."
                value={moduleSearchTerm}
                onChange={(e) => setModuleSearchTerm(e.target.value)}
              />
            </div>
            {selectedOrgId && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                <Eye size={13} />
                {loading ? 'Loading…' : `${allowedCount} allowed`}
              </span>
            )}
          </div>
        </div>

        <div className="table-area">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th className="c" style={{ width: '140px' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {!selectedOrgId ? (
                  <tr>
                    <td colSpan="2" className="empty">
                      Select an organisation from the left to view its module access.
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan="2" className="empty">
                      Loading permissions…
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((m) => {
                    const on = !!localState[m.module_id];
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
                              className="icon-badge mr-2"
                              style={{ backgroundColor: modBg, color: modColor }}
                            >
                              <ModIcon size={16} />
                            </div>
                            <span className="mod-name">{m.module_name}</span>
                          </div>
                        </td>
                        <td className="c">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              on
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {on ? 'Allowed' : 'Denied'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
