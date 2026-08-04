import React, { useState, useMemo, useCallback } from 'react';
import { Edit, RotateCcw, Shield, X, UserPlus } from 'lucide-react';
import Table from '../../../components/Table';
import { colorFromString, getInits, roleClassName } from '../utils';
import { rbacApi } from '../rbacApi';

function CrudDot({ on, label }) {
  return (
    <span
      title={label}
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${
        on
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-slate-50 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
      }`}
    >
      {label}
    </span>
  );
}

function NameCell({ data }) {
  if (!data) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%' }}>
      <div
        className="avatar"
        style={{
          background: colorFromString(`${data.name}|${data.email}`),
          width: '28px',
          height: '28px',
          fontSize: '.65rem',
          flexShrink: 0,
        }}
      >
        {getInits(data.name || '')}
      </div>
      <span className="um-name-cell" style={{ fontWeight: 600, textAlign: 'left' }}>
        {data.title && `${data.title} `}
        {data.name}
      </span>
    </div>
  );
}

function RoleCell({ value }) {
  return (
    <span className={`role-text ${roleClassName(value || '')}`}>
      {value || '—'}
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
  handleOpenAdd,
  handleOpenEdit,
  toggleUserStatus,
  handleResetPassword,
  showToast,
  hideOrgFilter = false,
  bannerTitle,
  bannerSub,
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

  const openAccess = useCallback(
    async (user) => {
      setAccessUser(user);
      setAccessRows([]);
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
    },
    [showToast]
  );

  const closeAccess = () => {
    setAccessUser(null);
    setAccessRows([]);
    setAccessIsSuperAdmin(false);
  };

  const columnDefs = useMemo(
    () => [
      {
        headerName: 'S.No',
        valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        width: 80,
        maxWidth: 90,
        sortable: false,
        filter: false,
        cellClass: 'text-center font-semibold text-slate-500',
      },
      {
        headerName: 'User Name',
        field: 'name',
        minWidth: 200,
        flex: 1.4,
        cellStyle: { textAlign: 'left', display: 'flex', alignItems: 'center' },
        cellRenderer: NameCell,
        valueGetter: (params) =>
          `${params.data?.title ? `${params.data.title} ` : ''}${params.data?.name || ''}`,
      },
      {
        headerName: 'Designation',
        field: 'designation',
        minWidth: 140,
        flex: 1,
        valueFormatter: (params) => params.value || '—',
      },
      {
        headerName: 'Organisation',
        field: 'organisation_name',
        minWidth: 180,
        flex: 1.2,
        valueFormatter: (params) => params.value || '—',
      },
      {
        headerName: 'Role',
        field: 'role_name',
        minWidth: 140,
        flex: 1,
        cellRenderer: RoleCell,
      },
      {
        headerName: 'Phone Number',
        field: 'phone',
        minWidth: 130,
        width: 140,
        cellClass: 'font-mono text-slate-600',
        valueFormatter: (params) => params.value || '—',
      },
      {
        headerName: 'Access',
        field: 'user_id',
        width: 90,
        sortable: false,
        filter: false,
        cellRenderer: (params) => (
          <button
            type="button"
            onClick={() => openAccess(params.data)}
            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer transition-all active:scale-90"
            style={{ border: 'none', background: 'none' }}
            title="View module access"
          >
            <Shield size={16} />
          </button>
        ),
      },
      {
        headerName: 'Edit',
        colId: 'edit',
        width: 80,
        sortable: false,
        filter: false,
        cellRenderer: (params) => (
          <button
            type="button"
            onClick={() => handleOpenEdit(params.data)}
            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer transition-all active:scale-90"
            style={{ border: 'none', background: 'none' }}
            title="Edit User"
          >
            <Edit size={16} />
          </button>
        ),
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 90,
        sortable: false,
        filter: false,
        cellRenderer: (params) => (
          <label className="toggle-switch" style={{ margin: '0 auto' }}>
            <input
              type="checkbox"
              checked={params.data?.status === 1}
              onChange={(e) => toggleUserStatus(params.data, e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        ),
      },
      {
        headerName: 'Reset Password',
        colId: 'reset',
        width: 130,
        sortable: false,
        filter: false,
        cellRenderer: (params) => (
          <button
            type="button"
            onClick={() => handleResetPassword(params.data)}
            className="um-reset-btn p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-all active:scale-90"
            style={{
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              borderRadius: '6px',
            }}
            title="Reset Password"
          >
            <RotateCcw size={15} />
          </button>
        ),
      },
    ],
    [openAccess, handleOpenEdit, toggleUserStatus, handleResetPassword]
  );

  const getRowId = useCallback((params) => String(params.data.user_id), []);

  return (
    <div className="main" style={{ flex: 1, height: '100%', position: 'relative' }}>
      <div className="user-banner">
        <div className="user-banner-left">
          <div className="banner-avatar" style={{ background: '#3B82F6' }}>
            👥
          </div>
          <div>
            <div className="banner-name">{bannerTitle || 'All users'}</div>
            <div className="banner-sub">
              {bannerSub ||
                'Filter by organisation or role, then open Access or Edit as needed.'}
            </div>
          </div>
        </div>
        <div className="banner-actions topbar-filters" style={{ flex: '0 1 auto', alignItems: 'flex-end' }}>
          {!hideOrgFilter && (
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
          )}
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
          {handleOpenAdd && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 text-xs text-white bg-[#0f417a] hover:bg-blue-800 rounded-lg cursor-pointer font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              style={{ height: '34px', marginBottom: '1px' }}
            >
              <UserPlus size={14} />
              Add
            </button>
          )}
        </div>
      </div>

      <div className="table-area">
        <Table
          rowData={filteredDbUsers}
          columnDefs={columnDefs}
          loading={dbLoading}
          pagination
          paginationPageSize={20}
          getRowId={getRowId}
          color="#0f417a"
          defaultColDef={{
            sortable: true,
            filter: false,
            resizable: true,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
          }}
          overlayNoRowsTemplate="No users found matching search criteria."
        />
      </div>

      {accessUser && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.35)' }}
          onClick={closeAccess}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-[520px] max-h-[75%] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {accessUser.title ? `${accessUser.title} ` : ''}
                  {accessUser.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {accessUser.organisation_name || '—'} · {accessUser.role_name || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={closeAccess}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                style={{ border: 'none', background: 'none' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-50 dark:border-slate-800">
              {accessIsSuperAdmin
                ? 'SUPERADMIN'
                : 'Assigned modules · C Create · R Read · U Update · D Delete'}
            </div>

            <div className="overflow-y-auto flex-1 px-2 py-2">
              {accessIsSuperAdmin ? (
                <div className="px-3 py-6 text-center space-y-2">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">Permission Manager</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                    This user is SUPERADMIN and can manage User/Module Permission and User List.
                    Permissions are not taken from org or CRUD tables.
                  </p>
                </div>
              ) : accessLoading ? (
                <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-10">Loading access…</div>
              ) : accessRows.length === 0 ? (
                <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-10">
                  No module permissions assigned
                </div>
              ) : (
                <ul className="space-y-1">
                  {accessRows.map((row) => (
                    <li
                      key={row.module_id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
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
