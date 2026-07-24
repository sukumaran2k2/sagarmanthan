import React, { useState, useMemo } from 'react';
import { Edit, RotateCcw, Shield, X } from 'lucide-react';
import { colorFromString, getInits, roleClassName } from '../utils';
import { rbacApi } from '../rbacApi';

function CrudDot({ on, label }) {
  return (
    <span
      title={label}
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${
        on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-300'
      }`}
    >
      {label}
    </span>
  );
}

export default function UserListTab({
  dbUserList,
  userListSearch,
  setUserListSearch,
  selectedDbRole,
  setSelectedDbRole,
  selectedDbOrg,
  setSelectedDbOrg,
  organisations = [],
  dbLoading,
  filteredDbUsers,
  masterRoles,
  handleOpenEdit,
  toggleUserStatus,
  handleResetPassword,
  showToast,
}) {
  const [accessUser, setAccessUser] = useState(null);
  const [accessRows, setAccessRows] = useState([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessIsSuperAdmin, setAccessIsSuperAdmin] = useState(false);

  const isUserSuperAdmin = (u) =>
    String(u?.role_code || '').toUpperCase() === 'SUPERADMIN' ||
    String(u?.role_name || '').toUpperCase() === 'SUPERADMIN';

  const orgOptions = useMemo(() => {
    const map = new Map();
    dbUserList.forEach((u) => {
      if (u.organisation_id != null && !map.has(u.organisation_id)) {
        map.set(u.organisation_id, u.organisation_name || `Org ${u.organisation_id}`);
      }
    });
    organisations.forEach((o) => {
      if (o.organisation_id != null && !map.has(o.organisation_id)) {
        map.set(o.organisation_id, o.organisation_name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [dbUserList, organisations]);

  const openAccess = async (user) => {
    setAccessUser(user);
    setAccessRows([]);
    // Hardcoded: single SUPERADMIN is not driven by permission tables
    if (isUserSuperAdmin(user)) {
      setAccessIsSuperAdmin(true);
      setAccessLoading(false);
      return;
    }
    setAccessIsSuperAdmin(false);
    setAccessLoading(true);
    try {
      const res = await rbacApi.getUserModuleCrud(
        [user.user_id],
        user.organisation_id || undefined
      );
      const rows = (res.data || []).filter(
        (r) => r.can_create || r.can_read || r.can_update || r.can_delete
      );
      setAccessRows(rows);
    } catch {
      showToast?.('Failed to load user access', '#EF4444');
      setAccessUser(null);
    } finally {
      setAccessLoading(false);
    }
  };

  const closeAccess = () => {
    setAccessUser(null);
    setAccessRows([]);
    setAccessIsSuperAdmin(false);
  };

  return (
    <div className="main" style={{ flex: 1, height: '100%', position: 'relative' }}>
      <div className="user-banner">
        <div className="user-banner-left">
          <div className="banner-avatar" style={{ background: '#3B82F6' }}>
            👥
          </div>
          <div>
            <div className="banner-name">All users</div>
            <div className="banner-sub">
              Filter by organisation or role, then open Access or Edit as needed.
            </div>
          </div>
        </div>
        <div className="banner-actions topbar-filters" style={{ flex: '0 1 auto' }}>
          <div className="filter-field" style={{ maxWidth: '200px' }}>
            <label htmlFor="um-list-org">Organisation</label>
            <select
              id="um-list-org"
              value={selectedDbOrg}
              onChange={(e) => setSelectedDbOrg(e.target.value)}
            >
              <option value="All">All organisations</option>
              {orgOptions.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field" style={{ maxWidth: '180px' }}>
            <label htmlFor="um-list-role">Role</label>
            <select
              id="um-list-role"
              value={selectedDbRole}
              onChange={(e) => setSelectedDbRole(e.target.value)}
            >
              <option value="All">All roles</option>
              {(masterRoles || []).map((role) => (
                <option key={role.role_id} value={String(role.role_id)}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field" style={{ maxWidth: '220px' }}>
            <label htmlFor="um-list-search">Search</label>
            <input
              id="um-list-search"
              type="text"
              className="search-input"
              placeholder="Search by name or email…"
              value={userListSearch}
              onChange={(e) => setUserListSearch(e.target.value)}
              style={{ height: '34px' }}
            />
          </div>
        </div>
      </div>

      <div className="table-area">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No</th>
                <th>User Name</th>
                <th>Designation</th>
                <th>Organisation</th>
                <th>Role</th>
                <th style={{ width: '130px' }}>Phone Number</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Access</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Edit</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Reset Password</th>
              </tr>
            </thead>
            <tbody>
              {dbLoading ? (
                <tr>
                  <td colSpan="10" className="empty">
                    Loading users from database...
                  </td>
                </tr>
              ) : filteredDbUsers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty">
                    No users found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredDbUsers.map((u, index) => (
                  <tr key={u.user_id}>
                    <td>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="avatar"
                          style={{
                            background: colorFromString(`${u.name}|${u.email}`),
                            width: '28px',
                            height: '28px',
                            fontSize: '.65rem',
                          }}
                        >
                          {getInits(u.name || '')}
                        </div>
                        <span style={{ font: 'inherit', fontWeight: 600, color: '#334155' }}>
                          {u.title && `${u.title} `}
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td>{u.designation || '—'}</td>
                    <td>{u.organisation_name || '—'}</td>
                    <td>
                      <span
                        className={`role-pill ${roleClassName(u.role_name || '')}`}
                        style={{ fontSize: '.7rem', padding: '2px 8px' }}
                      >
                        {u.role_name}
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontFamily: 'monospace' }}>
                      {u.phone || '—'}
                    </td>
                    <td className="c">
                      <button
                        onClick={() => openAccess(u)}
                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg cursor-pointer transition-all active:scale-90"
                        style={{ border: 'none', background: 'none' }}
                        title="View module access"
                      >
                        <Shield size={16} />
                      </button>
                    </td>
                    <td className="c">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer transition-all active:scale-90"
                        style={{ border: 'none', background: 'none' }}
                        title="Edit User"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                    <td className="c">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={u.status === 1}
                          onChange={(e) => toggleUserStatus(u, e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td className="c">
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="p-1.5 hover:bg-slate-100 text-slate-655 rounded-lg cursor-pointer transition-all active:scale-90"
                        style={{
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          borderRadius: '6px',
                        }}
                        title="Reset Password"
                      >
                        <RotateCcw size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="table-footer">
            <span>
              Showing {filteredDbUsers.length} of {dbUserList.length} users
            </span>
          </div>
        </div>
      </div>

      {accessUser && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.35)' }}
          onClick={closeAccess}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 w-[520px] max-h-[75%] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <div className="text-sm font-bold text-slate-800">
                  {accessUser.title ? `${accessUser.title} ` : ''}
                  {accessUser.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {accessUser.organisation_name || '—'} · {accessUser.role_name || '—'}
                  <span className="ml-2 text-slate-400">(view only)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAccess}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                style={{ border: 'none', background: 'none' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-50">
              {accessIsSuperAdmin
                ? 'SUPERADMIN access (hardcoded)'
                : 'Assigned modules · C Create · R Read · U Update · D Delete'}
            </div>

            <div className="overflow-y-auto flex-1 px-2 py-2">
              {accessIsSuperAdmin ? (
                <div className="px-3 py-6 text-center space-y-2">
                  <div className="text-sm font-bold text-slate-800">Full Permission Manager access</div>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    This account is the single SUPERADMIN. Access is hardcoded by role
                    (<code className="mx-1 text-[11px]">SUPERADMIN</code>
                    — not stored in organisation module or user CRUD tables.
                    No organisation is required.
                  </p>
                  <div className="pt-2 flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">User Matrix</span>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">Module Permissions</span>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">User List</span>
                  </div>
                </div>
              ) : accessLoading ? (
                <div className="text-center text-xs text-slate-400 py-10">Loading access…</div>
              ) : accessRows.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-10">
                  No module permissions assigned
                </div>
              ) : (
                <ul className="space-y-1">
                  {accessRows.map((row) => (
                    <li
                      key={row.module_id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {row.module_name}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <CrudDot on={!!row.can_create} label="C" />
                        <CrudDot on={!!row.can_read} label="R" />
                        <CrudDot on={!!row.can_update} label="U" />
                        <CrudDot on={!!row.can_delete} label="D" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
