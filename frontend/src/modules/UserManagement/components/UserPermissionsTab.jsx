import React from 'react';
import { getInits, getModuleIconAndColor, roleClassName } from '../utils';
import { PERMS } from '../constants';

export default function UserPermissionsTab({
  selectedCategory,
  selectedOrg,
  setSelectedOrg,
  selectedRole,
  setSelectedRole,
  searchTerm,
  setSearchTerm,
  selectedIds,
  setSelectedIds,
  draft,
  categories,
  orgs,
  filteredUsers,
  selectedUsers,
  activeModules,
  handleOrgCatChange,
  toggleUser,
  toggleSelectAll,
  handleCheck,
  setAll,
  colAll,
  handleSave,
  allSel,
  someSel,
  grantedCount,
  mixedCount,
  usersLoading = false,
  saving = false,
}) {
  return (
    <>
      <div className="sidebar">
        <div className="sidebar-head">
          <div className="sidebar-head-top">
            <span className="sidebar-title">Users</span>
            <span className="user-count-badge">
              {filteredUsers.length}
            </span>
          </div>
          <div className="search-wrap">
            <input
              type="text"
              className="search-input"
              placeholder="Search users by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="search-hint">Filter users by name</div>
          </div>
          <div className="select-all-row" onClick={toggleSelectAll}>
            <input
              type="checkbox"
              className={`sel-cb ${!allSel && someSel ? "indeterminate" : ""}`}
              checked={allSel}
              readOnly
            />
            <span className="sa-label">Select all</span>
            <span className="sa-hint">{selectedIds.size} selected</span>
          </div>
        </div>
        <div className="user-list">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`user-item ${selectedIds.has(u.id) ? "selected" : ""}`}
                onClick={() => toggleUser(u.id, false)}
              >
                <input
                  type="checkbox"
                  className="sel-cb"
                  checked={selectedIds.has(u.id)}
                  onChange={(e) => toggleUser(u.id, true, e)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="avatar" style={{ background: u.color }}>
                  {getInits(u.name)}
                </div>
                <div className="user-info">
                  <div className="user-name">{u.name}</div>
                  <div className="user-role">
                    {u.role} · {u.org}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              className="empty"
              style={{ padding: "30px 16px", fontSize: ".82rem" }}
            >
              No users found.
            </div>
          )}
        </div>
      </div>

      <div className="main">
        <div className="user-banner">
          <div className="user-banner-left">
            <div
              className="banner-avatar"
              style={{
                background:
                  selectedUsers.length === 0
                    ? "#CBD5E1"
                    : selectedUsers.length === 1
                      ? selectedUsers[0].color
                      : "#3B82F6",
              }}
            >
              {selectedUsers.length === 0
                ? "—"
                : selectedUsers.length === 1
                  ? getInits(selectedUsers[0].name)
                  : selectedUsers.length}
            </div>
            <div>
              <div className="banner-name">
                {selectedUsers.length === 0 ? (
                  "No users selected"
                ) : selectedUsers.length === 1 ? (
                  <>
                    {selectedUsers[0].name}{" "}
                    <span
                      className={`role-pill ${roleClassName(selectedUsers[0].role)}`}
                    >
                      {selectedUsers[0].role}
                    </span>
                  </>
                ) : (
                  (() => {
                    const roles = [
                      ...new Set(selectedUsers.map((u) => u.role)),
                    ];
                    const roleLabel =
                      roles.length === 1 ? roles[0] : "Mixed";
                    return (
                      <>
                        {selectedUsers.length} users selected{" "}
                        <span
                          className={`role-pill ${roleClassName(roleLabel)}`}
                        >
                          {roleLabel}
                        </span>
                      </>
                    );
                  })()
                )}
              </div>
              <div className="banner-sub">
                {selectedUsers.length === 0
                  ? "Select users on the left to assign Create, Read, Update, and Delete permissions"
                  : selectedUsers.length === 1
                    ? `${selectedUsers[0].email} · ${selectedUsers[0].org}`
                    : selectedUsers
                        .slice(0, 4)
                        .map((u) => u.name.split(" ")[0])
                        .join(", ") +
                      (selectedUsers.length > 4
                        ? ` +${selectedUsers.length - 4} more`
                        : "")}
              </div>
            </div>
          </div>
          <div className="banner-actions">
            {selectedUsers.length > 1 && (
              <span className="bulk-notice">
                ⚡ Editing multiple users
              </span>
            )}
            <button
              className="grant-all-btn"
              onClick={() => setAll(true)}
            >
              ✓ Grant All
            </button>
            <button
              className="revoke-all-btn"
              onClick={() => setAll(false)}
            >
              ✕ Revoke All
            </button>
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving…"
                : selectedUsers.length > 1
                  ? `Save to ${selectedUsers.length} users`
                  : "Save"}
            </button>
          </div>
        </div>

        <div className="table-area">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: "220px" }}>Module</th>
                  <th className="c" style={{ width: "110px" }}>
                    <div className="col-label">
                      Create{" "}
                      <span
                        className="all-link"
                        onClick={() => colAll("create")}
                      >
                        toggle all
                      </span>
                    </div>
                  </th>
                  <th className="c" style={{ width: "110px" }}>
                    <div className="col-label">
                      Read{" "}
                      <span
                        className="all-link"
                        onClick={() => colAll("read")}
                      >
                        toggle all
                      </span>
                    </div>
                  </th>
                  <th className="c" style={{ width: "110px" }}>
                    <div className="col-label">
                      Update{" "}
                      <span
                        className="all-link"
                        onClick={() => colAll("update")}
                      >
                        toggle all
                      </span>
                    </div>
                  </th>
                  <th className="c" style={{ width: "110px" }}>
                    <div className="col-label">
                      Delete{" "}
                      <span
                        className="all-link"
                        onClick={() => colAll("delete")}
                      >
                        toggle all
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedCategory === "all" ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      Select a Category, then an Organisation, to load modules and assign permissions.
                    </td>
                  </tr>
                ) : selectedOrg === "all" ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      Select an Organisation to load the modules allowed for that organisation.
                    </td>
                  </tr>
                ) : usersLoading ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      Loading users…
                    </td>
                  </tr>
                ) : activeModules.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      No modules enabled for this organisation. Assign them first under Modules → Update.
                    </td>
                  </tr>
                ) : selectedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      Select at least one user from the left to assign permissions.
                    </td>
                  </tr>
                ) : (
                  activeModules.map((m) => {
                    const {
                      Icon: ModIcon,
                      color: modColor,
                      bg: modBg,
                    } = getModuleIconAndColor(m.name);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="mod-cell">
                            <div
                              className="icon-badge mr-2"
                              style={{
                                backgroundColor: modBg,
                                color: modColor,
                              }}
                            >
                              <ModIcon size={16} />
                            </div>
                            <span className="mod-name">{m.name}</span>
                          </div>
                        </td>
                        {PERMS.map((p) => {
                          const v = draft[m.id]?.[p];
                          const mixed = v === "mixed";
                          return (
                            <td className="c" key={p}>
                              <input
                                type="checkbox"
                                className={`cb c-${p} ${mixed ? "mixed" : ""}`}
                                checked={v === true}
                                onChange={(e) =>
                                  handleCheck(m.id, p, e.target.checked)
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="table-footer">
              <span>
                {selectedCategory !== "all" &&
                  selectedUsers.length > 0 &&
                  activeModules.length > 0 && (
                    <>
                      {grantedCount} / {activeModules.length * 4}{" "}
                      permissions granted
                      {mixedCount > 0
                        ? ` · ${mixedCount} mixed (varies across selected users)`
                        : ""}
                      {selectedUsers.length > 1
                        ? ` · will apply to ${selectedUsers.length} users on Save`
                        : ""}
                    </>
                  )}
              </span>
              <div className="legend">
                <div className="legend-item">
                  <span
                    className="ldot"
                    style={{ background: "#10B981" }}
                  ></span>
                  Create
                </div>
                <div className="legend-item">
                  <span
                    className="ldot"
                    style={{ background: "#3B82F6" }}
                  ></span>
                  Read
                </div>
                <div className="legend-item">
                  <span
                    className="ldot"
                    style={{ background: "#F59E0B" }}
                  ></span>
                  Update
                </div>
                <div className="legend-item">
                  <span
                    className="ldot"
                    style={{ background: "#EF4444" }}
                  ></span>
                  Delete
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
