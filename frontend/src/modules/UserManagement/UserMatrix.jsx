import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import './UserMatrix.css';

// Import Constants
import { ORG_LIST, FULL_MODULE_LIST, MODULES_MASTER, USERS_RAW, PERMS } from './constants';

// Import Utilities
import { normalizeRole, normalizeOrg, normalizeOrgCategory, colorFromString } from './utils';

// Import Components
import UserPermissionsTab from './components/UserPermissionsTab';
import ModulePermissionsTab from './components/ModulePermissionsTab';
import UserListTab from './components/UserListTab';
import EditUserModal from './components/EditUserModal';

// Initialize users array once
const initialUsers = USERS_RAW.map((r, i) => {
  const u = {
    id: i + 1,
    name: r.name,
    email: r.email,
    org: normalizeOrg(r.org),
    orgCategory: normalizeOrgCategory(r.org),
    role: normalizeRole(r.role_original),
    color: colorFromString(`${r.name}|${r.email}|${r.org}`),
    perms: {}
  };
  MODULES_MASTER.forEach(m => {
    u.perms[m.id] = { create: false, read: false, update: false, delete: false };
  });
  return u;
});

export default function UserMatrix() {
  const [activeMainTab, setActiveMainTab] = useState('users');

  // ---- STATE FOR USER PERMISSIONS TAB ----
  const [users, setUsers] = useState(initialUsers);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [draft, setDraft] = useState({});

  // ---- STATE FOR MODULE PERMISSIONS TAB ----
  const [selectedModuleOrg, setSelectedModuleOrg] = useState(ORG_LIST[0]);
  const [orgModuleState, setOrgModuleState] = useState(() => {
    const initial = {};
    ORG_LIST.forEach(org => {
      initial[org] = {};
      FULL_MODULE_LIST.forEach(m => initial[org][m] = true);
    });
    return initial;
  });

  // ---- STATE FOR USER DATABASE TAB ----
  const [dbUserList, setDbUserList] = useState([]);
  const [userListSearch, setUserListSearch] = useState('');
  const [selectedDbRole, setSelectedDbRole] = useState('All');
  const [dbLoading, setDbLoading] = useState(false);
  
  // Modal Edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formTitle, setFormTitle] = useState('Mr');
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Master lists for editing
  const [masterOrgs, setMasterOrgs] = useState([]);
  const [masterRoles, setMasterRoles] = useState([]);

  // ---- COMMON TOAST STATE ----
  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState('#3B82F6');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg, color = '#3B82F6') => {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // ---- FETCH USER DATA AND DROPDOWNS FROM DATABASE ----
  useEffect(() => {
    if (activeMainTab === 'userlist') {
      setDbLoading(true);
      
      // Load user list
      axios.get('http://localhost:3000/userlist')
        .then(res => {
          setDbUserList(res.data);
          setDbLoading(false);
        })
        .catch(err => {
          console.error("Error loading userlist:", err);
          showToast("⚠ Failed to load users from database", "#EF4444");
          setDbLoading(false);
        });

      // Load master roles
      axios.get('http://localhost:3000/mmt-dropdown/tbl_role')
        .then(res => setMasterRoles(res.data))
        .catch(err => console.error("Error loading roles:", err));

      // Load master organisations
      axios.get('http://localhost:3000/mmt-dropdown/mmt_organisation')
        .then(res => setMasterOrgs(res.data))
        .catch(err => console.error("Error loading organisations:", err));
    }
  }, [activeMainTab]);

  // Filtered DB users based on search criteria and card filter
  const filteredDbUsers = useMemo(() => {
    let result = dbUserList;

    if (selectedDbRole !== 'All') {
      result = result.filter(u => u.role_id === Number(selectedDbRole));
    }

    const q = userListSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(u => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const role = (u.role_name || '').toLowerCase();
        const org = (u.organisation_name || '').toLowerCase();
        const desig = (u.designation || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q) || org.includes(q) || desig.includes(q) || phone.includes(q);
      });
    }
    return result;
  }, [dbUserList, userListSearch, selectedDbRole]);

  // ---- LOGIC FOR USER PERMISSIONS TAB ----
  const categories = useMemo(() => [...new Set(users.map(u => u.orgCategory))].sort((a, b) => a.localeCompare(b)), [users]);
  const orgs = useMemo(() => {
    return [...new Set(users.filter(u => selectedCategory === 'all' ? false : u.orgCategory === selectedCategory).map(u => u.org))].sort((a, b) => a.localeCompare(b));
  }, [users, selectedCategory]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter(u => {
      const matchCat = (selectedCategory === 'all' || u.orgCategory === selectedCategory);
      const matchOrg = (selectedOrg === 'all' || u.org === selectedOrg);
      const matchRole = (selectedRole === 'all' || u.role === selectedRole);
      const matchSearch = !q || u.name.toLowerCase().includes(q);
      return matchCat && matchOrg && matchRole && matchSearch;
    });
  }, [users, selectedCategory, selectedOrg, selectedRole, searchTerm]);

  const selectedUsers = useMemo(() => filteredUsers.filter(u => selectedIds.has(u.id)), [filteredUsers, selectedIds]);
  const activeModules = selectedCategory !== 'all' ? MODULES_MASTER : [];

  useEffect(() => {
    const newDraft = {};
    activeModules.forEach(m => {
      newDraft[m.id] = {};
      PERMS.forEach(p => {
        if (selectedUsers.length === 0) {
          newDraft[m.id][p] = false;
        } else {
          const vals = selectedUsers.map(u => u.perms[m.id][p]);
          const allTrue = vals.every(v => v);
          const allFalse = vals.every(v => !v);
          newDraft[m.id][p] = allTrue ? true : (allFalse ? false : 'mixed');
        }
      });
    });
    setDraft(newDraft);
  }, [selectedUsers, activeModules]);

  const handleOrgCatChange = (e) => {
    const cat = e.target.value;
    setSelectedCategory(cat);
    setSelectedOrg('all');
    setSelectedRole('all');
    if (cat === 'all') {
      setSelectedIds(new Set());
    } else {
      showToast(`📦 Modules fetched for ${cat}`, '#3B82F6');
    }
  };

  useEffect(() => {
    if (selectedCategory !== 'all') {
      const currentFiltered = users.filter(u => 
        (selectedCategory === 'all' || u.orgCategory === selectedCategory) &&
        (selectedOrg === 'all' || u.org === selectedOrg) &&
        (selectedRole === 'all' || u.role === selectedRole)
      );
      setSelectedIds(new Set(currentFiltered.map(u => u.id)));
    }
  }, [selectedCategory, selectedOrg, selectedRole, users]);

  const toggleUser = (id, additive, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (additive) {
        if (next.has(id)) next.delete(id); else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
    setSelectedIds(prev => {
      const next = new Set();
      if (!allSelected) {
        filteredUsers.forEach(u => next.add(u.id));
      }
      return next;
    });
  };

  const handleCheck = (modId, perm, val) => {
    setDraft(prev => ({
      ...prev,
      [modId]: { ...prev[modId], [perm]: val }
    }));
    const clr = { create: '#10B981', read: '#3B82F6', update: '#F59E0B', delete: '#EF4444' }[perm];
    const mod = MODULES_MASTER.find(m => m.id === modId)?.name || modId;
    showToast(`${val ? '✅' : '❌'} ${perm[0].toUpperCase() + perm.slice(1)} · ${mod}`, clr);
  };

  const setAll = (val) => {
    const newDraft = { ...draft };
    activeModules.forEach(m => {
      newDraft[m.id] = { ...newDraft[m.id] };
      PERMS.forEach(p => newDraft[m.id][p] = val);
    });
    setDraft(newDraft);
    showToast(val ? '✅ All permissions set to granted' : '❌ All permissions set to revoked', val ? '#10B981' : '#EF4444');
  };

  const colAll = (perm) => {
    const allOn = activeModules.every(m => draft[m.id] && draft[m.id][perm] === true);
    const newVal = !allOn;
    const newDraft = { ...draft };
    activeModules.forEach(m => {
      newDraft[m.id] = { ...newDraft[m.id], [perm]: newVal };
    });
    setDraft(newDraft);
    const clr = { create: '#10B981', read: '#3B82F6', update: '#F59E0B', delete: '#EF4444' }[perm];
    showToast(`${newVal ? '✅' : '❌'} ${perm[0].toUpperCase() + perm.slice(1)} toggled for all modules`, clr);
  };

  const handleSave = () => {
    if (selectedUsers.length === 0) { showToast('⚠ No users selected', '#F59E0B'); return; }
    
    setUsers(prev => prev.map(u => {
      if (!selectedIds.has(u.id)) return u;
      const updatedPerms = { ...u.perms };
      activeModules.forEach(m => {
        PERMS.forEach(p => {
          const v = draft[m.id]?.[p];
          if (v !== 'mixed') {
            updatedPerms[m.id][p] = v;
          }
        });
      });
      return { ...u, perms: updatedPerms };
    }));
    
    showToast(selectedUsers.length === 1 ? `💾 Saved for ${selectedUsers[0].name.split(' ')[0]}` : `💾 Saved for ${selectedUsers.length} users`, '#10B981');
  };

  const allSel = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
  const someSel = filteredUsers.some(u => selectedIds.has(u.id));

  let grantedCount = 0, mixedCount = 0;
  if (activeModules.length > 0 && Object.keys(draft).length > 0) {
    activeModules.forEach(m => PERMS.forEach(p => {
      if (draft[m.id]?.[p] === true) grantedCount++;
      else if (draft[m.id]?.[p] === 'mixed') mixedCount++;
    }));
  }

  // ---- LOGIC FOR MODULE PERMISSIONS TAB ----
  const toggleOrgModule = (org, mod, val) => {
    setOrgModuleState(prev => ({
      ...prev,
      [org]: { ...prev[org], [mod]: val }
    }));
    showToast(`${val ? '✅' : '❌'} ${mod}`, val ? '#10B981' : '#EF4444');
  };

  const setAllOrgModules = (val) => {
    const next = { ...orgModuleState };
    FULL_MODULE_LIST.forEach(m => next[selectedModuleOrg][m] = val);
    setOrgModuleState(next);
    showToast(val ? '✅ All modules enabled' : '❌ All modules disabled', val ? '#10B981' : '#EF4444');
  };

  const saveModulePermissions = () => {
    showToast(`💾 Saved permissions for ${selectedModuleOrg}`, '#10B981');
  };

  // ---- USER LIST ACTIONS LOGIC ----
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
    if (!formName.trim()) { showToast('⚠ Name is required', '#F59E0B'); return; }
    if (!formEmail.trim()) { showToast('⚠ Email is required', '#F59E0B'); return; }
    if (!formOrg) { showToast('⚠ Organisation is required', '#F59E0B'); return; }
    if (!formRole) { showToast('⚠ Role is required', '#F59E0B'); return; }

    const payload = {
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
      loginUser: 'Admin'
    };

    axios.put('http://localhost:3000/edituser', payload)
      .then(() => {
        showToast('✅ User updated successfully', '#10B981');
        setIsEditModalOpen(false);
        axios.get('http://localhost:3000/userlist')
          .then(res => setDbUserList(res.data));
      })
      .catch(err => {
        console.error("Error updating user:", err);
        showToast('❌ Failed to update user', '#EF4444');
      });
  };

  const toggleUserStatus = (u, checked) => {
    const newStatus = checked ? 1 : 0;
    axios.put('http://localhost:3000/user-status', {
      userID: u.user_id,
      userStatus: newStatus,
      loginUser: 'Admin'
    })
      .then(() => {
        setDbUserList(prev => prev.map(item => item.user_id === u.user_id ? { ...item, status: newStatus } : item));
        showToast(`✅ Status updated to ${newStatus ? 'Active' : 'Inactive'}`, '#10B981');
      })
      .catch(err => {
        console.error("Error updating user status:", err);
        showToast('❌ Failed to update status', '#EF4444');
      });
  };

  const handleResetPassword = (u) => {
    const newPass = window.prompt(`Reset password for ${u.name}. Enter new password:`, 'Sagarmanthan@123');
    if (newPass === null) return;
    if (!newPass.trim()) { showToast('⚠ Password cannot be empty', '#F59E0B'); return; }

    axios.post('http://localhost:3000/changepassword', {
      userID: u.user_id,
      confirmPassword: newPass,
      loginUser: 'Admin'
    })
      .then(() => {
        showToast('✅ Password reset successfully', '#10B981');
      })
      .catch(err => {
        console.error("Error resetting password:", err);
        showToast('❌ Failed to reset password', '#EF4444');
      });
  };

  return (
    <div className="user-matrix-container w-full h-[85vh] bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans relative overflow-hidden rounded-xl border border-slate-200">
      
      <div className="topbar">
        <div className="topbar-brand">
          <div className="dot"></div>
          <h1>Permission Manager</h1>
        </div>

        <div className="flex ml-6 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveMainTab("users")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeMainTab === "users" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 cursor-pointer"}`}
          >
            User Permissions
          </button>
          <button
            onClick={() => setActiveMainTab("modules")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeMainTab === "modules" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 cursor-pointer"}`}
          >
            Module Permissions
          </button>
          <button
            onClick={() => setActiveMainTab("userlist")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeMainTab === "userlist" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 cursor-pointer"}`}
          >
            User List
          </button>
        </div>

        {activeMainTab === "users" && (
          <>
            <div className="sep ml-auto"></div>
            <div className="filter-item ml-auto">
              <label>Organisation Category</label>
              <select value={selectedCategory} onChange={handleOrgCatChange}>
                <option value="all">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>Organisation</label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                disabled={selectedCategory === "all"}
              >
                <option value="all">All Organisations</option>
                {orgs.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={selectedCategory === "all"}
              >
                <option value="all">All Roles</option>
                <option value="Wing / Division User">
                  Wing / Division User
                </option>
                <option value="Senior Officer">Senior Officer</option>
                <option value="Nodal Officer">Nodal Officer</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="layout">
        {activeMainTab === "users" && (
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
            orgs={orgs}
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
          />
        )}

        {activeMainTab === "modules" && (
          <ModulePermissionsTab
            selectedModuleOrg={selectedModuleOrg}
            setSelectedModuleOrg={setSelectedModuleOrg}
            orgModuleState={orgModuleState}
            toggleOrgModule={toggleOrgModule}
            setAllOrgModules={setAllOrgModules}
            saveModulePermissions={saveModulePermissions}
          />
        )}

        {activeMainTab === "userlist" && (
          <UserListTab
            dbUserList={dbUserList}
            userListSearch={userListSearch}
            setUserListSearch={setUserListSearch}
            selectedDbRole={selectedDbRole}
            setSelectedDbRole={setSelectedDbRole}
            dbLoading={dbLoading}
            filteredDbUsers={filteredDbUsers}
            masterRoles={masterRoles}
            handleOpenEdit={handleOpenEdit}
            toggleUserStatus={toggleUserStatus}
            handleResetPassword={handleResetPassword}
          />
        )}
      </div>

      {/* Edit User overlay drawer panel */}
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

      <div className={`toast-box ${toastVisible ? "show" : ""}`}>
        <div className="tdot" style={{ background: toastColor }}></div>
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}
