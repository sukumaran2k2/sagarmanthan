import { useState, useMemo, useEffect, useCallback } from 'react';
import { Home } from 'lucide-react';
import api, { rbacApi } from './rbacApi';
import './UserMatrix.css';
import { colorFromString } from './utils';
import { PERMS } from './constants';
import { getCurrentUserId } from '../../utils/authSession';

import UserPermissionsTab from './components/UserPermissionsTab';
import ModulePermissionsTab from './components/ModulePermissionsTab';
import ModulePermissionListTab from './components/ModulePermissionListTab';
import UserListTab from './components/UserListTab';
import EditUserModal from './components/EditUserModal';

const NAV_GROUPS = [
  {
    id: 'users',
    label: 'Users',
    items: [
      { key: 'users', label: 'Update', hint: 'Edit CRUD access' },
      { key: 'userlist', label: 'List', hint: 'Browse & manage users' },
    ],
  },
  {
    id: 'modules',
    label: 'Modules',
    items: [
      { key: 'modules', label: 'Update', hint: 'Assign org modules' },
      { key: 'module_permission_list', label: 'List', hint: 'View module access' },
    ],
  },
];

const TAB_META = {
  users: {
    title: 'Update User Access',
    note: 'Select an Organisation Category, then an Organisation, to load users and assign Create / Read / Update / Delete permissions.',
  },
  modules: {
    title: 'Update Module Access',
    note: 'Select one or more organisations on the left, then enable the modules each organisation is allowed to use.',
  },
  module_permission_list: {
    title: 'Module Access List',
    note: 'Select an organisation on the left to view its allowed modules. To change access, switch to Modules → Update.',
  },
  userlist: {
    title: 'User Directory',
    note: 'Browse users by organisation or role. Open Access to view module permissions, or Edit to update profile details.',
  },
};

function mapUser(row) {
  return {
    id: row.user_id,
    user_id: row.user_id,
    name: row.name || '',
    email: row.email || '',
    org: row.organisation_name || '',
    organisation_id: row.organisation_id,
    orgCategory: row.category_name || '',
    category_id: row.category_id,
    role: row.role_name || '',
    role_id: row.role_id,
    role_code: row.role_code,
    color: colorFromString(`${row.name}|${row.email}|${row.organisation_id}`),
    perms: {},
  };
}

export default function UserMatrix({ onGoHome }) {
  const [activeMainTab, setActiveMainTab] = useState('users');
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [masterModules, setMasterModules] = useState([]);
  const [masterRoles, setMasterRoles] = useState([]);
  const [masterOrgs, setMasterOrgs] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [matrixUsers, setMatrixUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [draft, setDraft] = useState({});
  const [activeModules, setActiveModules] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [selectedModuleOrgIds, setSelectedModuleOrgIds] = useState(() => new Set());
  const [orgModuleState, setOrgModuleState] = useState({});

  const [dbUserList, setDbUserList] = useState([]);
  const [userListSearch, setUserListSearch] = useState('');
  const [selectedDbRole, setSelectedDbRole] = useState('All');
  const [selectedDbOrg, setSelectedDbOrg] = useState('All');
  const [dbLoading, setDbLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formTitle, setFormTitle] = useState('Mr');
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState('#3B82F6');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg, color = '#3B82F6') => {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  useEffect(() => {
    rbacApi.getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => showToast('Failed to load categories', '#EF4444'));

    rbacApi.getModules()
      .then((res) => setMasterModules(res.data || []))
      .catch(() => showToast('Failed to load modules', '#EF4444'));

    rbacApi.getOrganisations()
      .then((res) => {
        setOrganisations(res.data || []);
        setMasterOrgs(res.data || []);
      })
      .catch(() => showToast('Failed to load organisations', '#EF4444'));

    api.get('/mmt-dropdown/tbl_role')
      .then((res) => setMasterRoles(res.data || []))
      .catch(() => {});
  }, [showToast]);

  const orgsForCategory = useMemo(() => {
    if (selectedCategory === 'all') return [];
    return organisations.filter(
      (o) => String(o.category_id) === String(selectedCategory)
    );
  }, [organisations, selectedCategory]);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setMatrixUsers([]);
      setSelectedIds(new Set());
      setActiveModules([]);
      return;
    }

    setUsersLoading(true);
    const params = { categoryId: selectedCategory };
    if (selectedOrg !== 'all') params.organisationId = selectedOrg;
    if (selectedRole !== 'all') params.roleId = selectedRole;

    rbacApi
      .getMatrixUsers(params)
      .then((res) => {
        const mapped = (res.data || []).map(mapUser);
        setMatrixUsers(mapped);
        setSelectedIds(new Set(mapped.map((u) => u.id)));
      })
      .catch(() => {
        showToast('Failed to load users', '#EF4444');
        setMatrixUsers([]);
      })
      .finally(() => setUsersLoading(false));
  }, [selectedCategory, selectedOrg, selectedRole, showToast]);

  useEffect(() => {
    if (selectedCategory === 'all' || selectedOrg === 'all') {
      setActiveModules([]);
      return;
    }

    rbacApi
      .getAllowedModules(selectedOrg)
      .then((res) => {
        const mods = (res.data || []).map((m) => ({
          id: m.module_id,
          name: m.module_name,
          code: m.module_code,
        }));
        setActiveModules(mods);
      })
      .catch(() => {
        setActiveModules([]);
        showToast('Failed to load organisation modules', '#EF4444');
      });
  }, [selectedCategory, selectedOrg, showToast]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return matrixUsers;
    return matrixUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [matrixUsers, searchTerm]);

  const selectedUsers = useMemo(
    () => filteredUsers.filter((u) => selectedIds.has(u.id)),
    [filteredUsers, selectedIds]
  );

  useEffect(() => {
    if (selectedUsers.length === 0 || activeModules.length === 0 || selectedOrg === 'all') {
      const empty = {};
      activeModules.forEach((m) => {
        empty[m.id] = { create: false, read: false, update: false, delete: false };
      });
      setDraft(empty);
      return;
    }

    const userIds = selectedUsers.map((u) => u.id);
    rbacApi
      .getUserModuleCrud(userIds, selectedOrg)
      .then((res) => {
        const rows = res.data || [];
        const byUserModule = {};
        rows.forEach((row) => {
          if (!byUserModule[row.user_id]) byUserModule[row.user_id] = {};
          byUserModule[row.user_id][row.module_id] = {
            create: !!row.can_create,
            read: !!row.can_read,
            update: !!row.can_update,
            delete: !!row.can_delete,
          };
        });

        const newDraft = {};
        activeModules.forEach((m) => {
          newDraft[m.id] = {};
          PERMS.forEach((p) => {
            const vals = selectedUsers.map(
              (u) => byUserModule[u.id]?.[m.id]?.[p] ?? false
            );
            const allTrue = vals.every(Boolean);
            const allFalse = vals.every((v) => !v);
            newDraft[m.id][p] = allTrue ? true : allFalse ? false : 'mixed';
          });
        });
        setDraft(newDraft);
      })
      .catch(() => showToast('Failed to load user permissions', '#EF4444'));
  }, [selectedUsers, activeModules, selectedOrg, showToast]);

  const loadOrgModuleState = useCallback(
    async (orgIds) => {
      if (!orgIds.length || !masterModules.length) return;
      try {
        const res = await rbacApi.getOrgModulePermissions(orgIds);
        const next = { ...orgModuleState };
        (res.data || []).forEach((orgBlock) => {
          next[orgBlock.organisationId] = {};
          orgBlock.modules.forEach((m) => {
            next[orgBlock.organisationId][m.module_id] = !!m.is_allowed;
          });
        });
        orgIds.forEach((id) => {
          if (!next[id]) next[id] = {};
          masterModules.forEach((m) => {
            if (next[id][m.module_id] === undefined) next[id][m.module_id] = false;
          });
        });
        setOrgModuleState(next);
      } catch {
        showToast('Failed to load module permissions', '#EF4444');
      }
    },
    [masterModules, orgModuleState, showToast]
  );

  useEffect(() => {
    const ids = Array.from(selectedModuleOrgIds);
    if (ids.length > 0 && masterModules.length > 0) {
      loadOrgModuleState(ids);
    }
    // skip loadOrgModuleState in deps — causes loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModuleOrgIds, masterModules]);

  const handleOrgCatChange = (e) => {
    setSelectedCategory(e.target.value);
    setSelectedOrg('all');
    setSelectedRole('all');
    setSelectedIds(new Set());
    setActiveModules([]);
  };

  const toggleUser = (id, additive, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (additive) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected =
      filteredUsers.length > 0 &&
      filteredUsers.every((u) => selectedIds.has(u.id));
    setSelectedIds(() => {
      const next = new Set();
      if (!allSelected) filteredUsers.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const handleCheck = (modId, perm, val) => {
    setDraft((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], [perm]: val },
    }));
  };

  const setAll = (val) => {
    const newDraft = { ...draft };
    activeModules.forEach((m) => {
      newDraft[m.id] = { ...newDraft[m.id] };
      PERMS.forEach((p) => {
        newDraft[m.id][p] = val;
      });
    });
    setDraft(newDraft);
    showToast(
      val ? 'All permissions granted' : 'All permissions revoked',
      val ? '#10B981' : '#EF4444'
    );
  };

  const colAll = (perm) => {
    const allOn = activeModules.every((m) => draft[m.id]?.[perm] === true);
    const newVal = !allOn;
    const newDraft = { ...draft };
    activeModules.forEach((m) => {
      newDraft[m.id] = { ...newDraft[m.id], [perm]: newVal };
    });
    setDraft(newDraft);
  };

  const handleSave = async () => {
    if (selectedUsers.length === 0) {
      showToast('No users selected', '#F59E0B');
      return;
    }
    if (selectedOrg === 'all') {
      showToast('Select an Organisation to save permissions', '#F59E0B');
      return;
    }

    const cleanPermissions = activeModules
      .filter((m) => {
        const row = draft[m.id];
        return row && PERMS.every((p) => row[p] !== 'mixed');
      })
      .map((m) => ({
        moduleId: m.id,
        canCreate: !!draft[m.id].create,
        canRead: !!draft[m.id].read,
        canUpdate: !!draft[m.id].update,
        canDelete: !!draft[m.id].delete,
      }));

    if (cleanPermissions.length === 0) {
      showToast(
        'Nothing to save — resolve mixed checkboxes or change a permission first',
        '#F59E0B'
      );
      return;
    }

    setSaving(true);
    try {
      await rbacApi.saveUserModuleCrud({
        userIds: selectedUsers.map((u) => u.id),
        permissions: cleanPermissions,
        updatedBy: getCurrentUserId(),
      });
      showToast(
        selectedUsers.length === 1
          ? `Saved for ${selectedUsers[0].name.split(' ')[0]}`
          : `Saved for ${selectedUsers.length} users`,
        '#10B981'
      );
    } catch {
      showToast('Failed to save user permissions', '#EF4444');
    } finally {
      setSaving(false);
    }
  };

  const allSel =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedIds.has(u.id));
  const someSel = filteredUsers.some((u) => selectedIds.has(u.id));

  let grantedCount = 0;
  let mixedCount = 0;
  if (activeModules.length > 0 && Object.keys(draft).length > 0) {
    activeModules.forEach((m) =>
      PERMS.forEach((p) => {
        if (draft[m.id]?.[p] === true) grantedCount++;
        else if (draft[m.id]?.[p] === 'mixed') mixedCount++;
      })
    );
  }

  const toggleOrgModule = (moduleId, val) => {
    if (selectedModuleOrgIds.size === 0) {
      showToast('Select at least one organisation', '#F59E0B');
      return;
    }
    setOrgModuleState((prev) => {
      const next = { ...prev };
      selectedModuleOrgIds.forEach((orgId) => {
        next[orgId] = { ...(next[orgId] || {}), [moduleId]: val };
      });
      return next;
    });
  };

  const setAllOrgModules = (val) => {
    if (selectedModuleOrgIds.size === 0) {
      showToast('Select at least one organisation', '#F59E0B');
      return;
    }
    setOrgModuleState((prev) => {
      const next = { ...prev };
      selectedModuleOrgIds.forEach((orgId) => {
        const updated = { ...(next[orgId] || {}) };
        masterModules.forEach((m) => {
          updated[m.module_id] = val;
        });
        next[orgId] = updated;
      });
      return next;
    });
  };

  const saveModulePermissions = async () => {
    if (selectedModuleOrgIds.size === 0) {
      showToast('No organisations selected', '#F59E0B');
      return;
    }

    const modules = masterModules.map((m) => {
      const vals = Array.from(selectedModuleOrgIds).map(
        (orgId) => !!orgModuleState[orgId]?.[m.module_id]
      );
      const allTrue = vals.every(Boolean);
      const allFalse = vals.every((v) => !v);
      if (!allTrue && !allFalse) return null; // mixed — don't overwrite
      return { moduleId: m.module_id, isAllowed: allTrue };
    }).filter(Boolean);

    if (modules.length === 0) {
      showToast('No clear module changes to save (all partial)', '#F59E0B');
      return;
    }

    setSaving(true);
    try {
      await rbacApi.saveOrgModulePermissions({
        organisationIds: Array.from(selectedModuleOrgIds),
        modules,
        updatedBy: getCurrentUserId(),
      });
      showToast(
        `Saved module permissions for ${selectedModuleOrgIds.size} organisation(s)`,
        '#10B981'
      );
    } catch {
      showToast('Failed to save module permissions', '#EF4444');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (activeMainTab !== 'userlist') return;
    setDbLoading(true);
    api
      .get('/userlist')
      .then((res) => setDbUserList(res.data || []))
      .catch(() => showToast('Failed to load users', '#EF4444'))
      .finally(() => setDbLoading(false));
  }, [activeMainTab, showToast]);

  const filteredDbUsers = useMemo(() => {
    let result = dbUserList;
    if (selectedDbOrg !== 'All') {
      result = result.filter((u) => u.organisation_id === Number(selectedDbOrg));
    }
    if (selectedDbRole !== 'All') {
      result = result.filter((u) => u.role_id === Number(selectedDbRole));
    }
    const q = userListSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((u) =>
        [u.name, u.email, u.role_name, u.organisation_name, u.designation, u.phone]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    return result;
  }, [dbUserList, userListSearch, selectedDbRole, selectedDbOrg]);

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormTitle(u.title || 'Mr');
    setFormName(u.name || '');
    setFormDesignation(u.designation || '');
    setFormOrg(u.organisation_id || '');
    setFormRole(u.role_id || '');
    setFormPhone(u.phone || '');
    setFormEmail(u.email || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateUserSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formOrg || !formRole) {
      showToast('Please fill required fields', '#F59E0B');
      return;
    }
    api
      .put('/edituser', {
        userID: editingUser.user_id,
        title: formTitle,
        name: formName,
        designation: formDesignation,
        role: formRole,
        organisation: formOrg,
        wingId: editingUser.wing_id || null,
        divisionId: editingUser.division_id || null,
        email: formEmail,
        phone: formPhone,
        loginUser: 'Admin',
      })
      .then(() => {
        showToast('User updated', '#10B981');
        setIsEditModalOpen(false);
        return api.get('/userlist');
      })
      .then((res) => setDbUserList(res.data || []))
      .catch(() => showToast('Failed to update user', '#EF4444'));
  };

  const toggleUserStatus = (u, checked) => {
    api
      .put('/user-status', {
        userID: u.user_id,
        userStatus: checked ? 1 : 0,
        loginUser: 'Admin',
      })
      .then(() => {
        setDbUserList((prev) =>
          prev.map((item) =>
            item.user_id === u.user_id
              ? { ...item, status: checked ? 1 : 0 }
              : item
          )
        );
        showToast(`Status set to ${checked ? 'Active' : 'Inactive'}`, '#10B981');
      })
      .catch(() => showToast('Failed to update status', '#EF4444'));
  };

  const handleResetPassword = (u) => {
    const newPass = window.prompt(
      `Reset password for ${u.name}. Enter new password:`,
      'Sagarmanthan@123'
    );
    if (newPass === null) return;
    if (!newPass.trim()) {
      showToast('Password cannot be empty', '#F59E0B');
      return;
    }
    api
      .post('/changepassword', {
        userID: u.user_id,
        confirmPassword: newPass,
        loginUser: 'Admin',
      })
      .then(() => showToast('Password reset', '#10B981'))
      .catch(() => showToast('Failed to reset password', '#EF4444'));
  };

  const activeRoles = useMemo(
    () => (masterRoles || []).filter((r) => r.is_active !== 0 && r.is_active !== false),
    [masterRoles]
  );

  return (
    <div className="user-matrix-page animate-fade-in">
      <div className="um-page-header">
        <div className="um-breadcrumb">
          <Home
            className="h-3.5 w-3.5 text-slate-500 cursor-pointer hover:text-blue-700 transition-colors"
            onClick={onGoHome}
          />
          <span className="text-slate-300">/</span>
          <span className="text-blue-800 font-bold">User Matrix</span>
        </div>

        <nav className="um-nav" aria-label="User Matrix sections">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.id} className="um-nav-group">
              {gi > 0 && <div className="um-nav-divider" aria-hidden="true" />}
              <span className="um-nav-group-label">{group.label}</span>
              <div className="um-nav-pills">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    title={item.hint}
                    onClick={() => setActiveMainTab(item.key)}
                    className={`um-nav-pill ${activeMainTab === item.key ? 'is-active' : ''}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="user-matrix-container w-full h-[85vh] bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans relative overflow-hidden rounded-xl border border-slate-200">
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-brand">
              <div className="dot"></div>
              <h1>{TAB_META[activeMainTab]?.title}</h1>
            </div>
            <p className="topbar-note">{TAB_META[activeMainTab]?.note}</p>
          </div>

          {activeMainTab === 'users' && (
            <div className="topbar-filters">
              <div className="filter-field">
                <label htmlFor="um-filter-category">Category</label>
                <select
                  id="um-filter-category"
                  value={selectedCategory}
                  onChange={handleOrgCatChange}
                >
                  <option value="all">Select category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="um-filter-org">Organisation</label>
                <select
                  id="um-filter-org"
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  disabled={selectedCategory === 'all'}
                >
                  <option value="all">All organisations</option>
                  {orgsForCategory.map((o) => (
                    <option key={o.organisation_id} value={o.organisation_id}>
                      {o.organisation_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="um-filter-role">Role</label>
                <select
                  id="um-filter-role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={selectedCategory === 'all'}
                >
                  <option value="all">All roles</option>
                  {activeRoles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="layout">
          {activeMainTab === 'users' && (
            <UserPermissionsTab
              selectedCategory={selectedCategory}
              selectedOrg={selectedOrg}
              setSelectedOrg={setSelectedOrg}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              draft={draft}
              categories={categories}
              orgs={orgsForCategory}
              filteredUsers={filteredUsers}
              selectedUsers={selectedUsers}
              activeModules={activeModules}
              handleOrgCatChange={handleOrgCatChange}
              toggleUser={toggleUser}
              toggleSelectAll={toggleSelectAll}
              handleCheck={handleCheck}
              setAll={setAll}
              colAll={colAll}
              handleSave={handleSave}
              allSel={allSel}
              someSel={someSel}
              grantedCount={grantedCount}
              mixedCount={mixedCount}
              usersLoading={usersLoading}
              saving={saving}
            />
          )}

          {activeMainTab === 'modules' && (
            <ModulePermissionsTab
              organisations={organisations}
              categories={categories}
              masterModules={masterModules}
              selectedModuleOrgIds={selectedModuleOrgIds}
              setSelectedModuleOrgIds={setSelectedModuleOrgIds}
              orgModuleState={orgModuleState}
              toggleOrgModule={toggleOrgModule}
              setAllOrgModules={setAllOrgModules}
              saveModulePermissions={saveModulePermissions}
              saving={saving}
            />
          )}

          {activeMainTab === 'module_permission_list' && (
            <ModulePermissionListTab
              organisations={organisations}
              categories={categories}
              masterModules={masterModules}
              showToast={showToast}
            />
          )}

          {activeMainTab === 'userlist' && (
            <UserListTab
              dbUserList={dbUserList}
              userListSearch={userListSearch}
              setUserListSearch={setUserListSearch}
              selectedDbRole={selectedDbRole}
              setSelectedDbRole={setSelectedDbRole}
              selectedDbOrg={selectedDbOrg}
              setSelectedDbOrg={setSelectedDbOrg}
              organisations={organisations}
              dbLoading={dbLoading}
              filteredDbUsers={filteredDbUsers}
              masterRoles={masterRoles}
              handleOpenEdit={handleOpenEdit}
              toggleUserStatus={toggleUserStatus}
              handleResetPassword={handleResetPassword}
              showToast={showToast}
            />
          )}
        </div>

        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateUserSubmit}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formName={formName}
          setFormName={setFormName}
          formDesignation={formDesignation}
          setFormDesignation={setFormDesignation}
          formOrg={formOrg}
          setFormOrg={setFormOrg}
          formRole={formRole}
          setFormRole={setFormRole}
          formPhone={formPhone}
          setFormPhone={setFormPhone}
          formEmail={formEmail}
          setFormEmail={setFormEmail}
          masterOrgs={masterOrgs}
          masterRoles={masterRoles}
        />

        {toastVisible && (
          <div
            className="toast"
            style={{ background: toastColor, opacity: toastVisible ? 1 : 0 }}
          >
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
