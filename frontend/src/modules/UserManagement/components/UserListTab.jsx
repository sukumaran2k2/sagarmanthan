import React from 'react';
import { Edit, RotateCcw } from 'lucide-react';
import { getRoleImage, colorFromString, getInits, roleClassName } from '../utils';

export default function UserListTab({
  dbUserList,
  userListSearch,
  setUserListSearch,
  selectedDbRole,
  setSelectedDbRole,
  dbLoading,
  filteredDbUsers,
  masterRoles,
  handleOpenEdit,
  toggleUserStatus,
  handleResetPassword
}) {
  return (
    <div className="main" style={{ flex: 1, height: "100%" }}>
      <div className="user-banner">
        <div className="user-banner-left">
          <div
            className="banner-avatar"
            style={{ background: "#3B82F6" }}
          >
            👥
          </div>
          <div>
            <div className="banner-name">User List Database</div>
            <div className="banner-sub">
              View all registered users and their details fetched directly
              from the database
            </div>
          </div>
        </div>
        <div className="banner-actions">
          <div className="search-wrap" style={{ margin: 0 }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search users..."
              value={userListSearch}
              onChange={(e) => setUserListSearch(e.target.value)}
              style={{ width: "260px" }}
            />
          </div>
        </div>
      </div>

      {/* Roles cards filters row */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-2 mx-6 mt-6">
        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-left">
          Filter Users by Role
        </span>
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
          {/* All Roles Card */}
          <button
            onClick={() => setSelectedDbRole("All")}
            className={`relative w-44 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow border transition-all duration-300 ${
              selectedDbRole === "All"
                ? "ring-4 ring-[#0f417a] scale-95 shadow-md font-bold"
                : "border-slate-200 opacity-85 hover:opacity-100 hover:scale-[1.02]"
            }`}
          >
            <img
              src="https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=300&q=80"
              alt="All Roles"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/45 transition-colors"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">
                All Roles
              </span>
              <span className="text-[9px] font-bold text-slate-200 mt-1.5 bg-white/25 px-2 py-0.5 rounded-full backdrop-blur-xs">
                {dbUserList.length} Users
              </span>
            </div>
          </button>

          {/* Master Roles Cards */}
          {masterRoles.map((role) => {
            const isActive = selectedDbRole === String(role.role_id);
            const count = dbUserList.filter(
              (u) => u.role_id === role.role_id,
            ).length;
            return (
              <button
                key={role.role_id}
                onClick={() => setSelectedDbRole(String(role.role_id))}
                className={`relative w-44 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow border transition-all duration-300 ${
                  isActive
                    ? "ring-4 ring-[#0f417a] scale-95 shadow-md font-bold"
                    : "border-slate-200 opacity-85 hover:opacity-100 hover:scale-[1.02]"
                }`}
              >
                <img
                  src={getRoleImage(role.role_name)}
                  alt={role.role_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/45 transition-colors"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight whitespace-normal">
                    {role.role_name}
                  </span>
                  <span className="text-[9px] font-bold text-slate-200 mt-1.5 bg-white/25 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {count} {count === 1 ? "User" : "Users"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="table-area">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: "60px" }}>S.No</th>
                <th>User Name</th>
                <th>Designation</th>
                <th>Organisation</th>
                <th>Role</th>
                <th style={{ width: "130px" }}>Phone Number</th>
                <th style={{ width: "80px", textAlign: "center" }}>
                  Edit
                </th>
                <th style={{ width: "90px", textAlign: "center" }}>
                  Status
                </th>
                <th style={{ width: "120px", textAlign: "center" }}>
                  Reset Password
                </th>
              </tr>
            </thead>
            <tbody>
              {dbLoading ? (
                <tr>
                  <td colSpan="9" className="empty">
                    Loading users from database...
                  </td>
                </tr>
              ) : filteredDbUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty">
                    No users found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredDbUsers.map((u, index) => (
                  <tr key={u.user_id}>
                    <td>{index + 1}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          className="avatar"
                          style={{
                            background: colorFromString(
                              `${u.name}|${u.email}`,
                            ),
                            width: "28px",
                            height: "28px",
                            fontSize: ".65rem",
                          }}
                        >
                          {getInits(u.name || "")}
                        </div>
                        <span
                          style={{
                            font: "inherit",
                            fontWeight: 600,
                            color: "#334155",
                          }}
                        >
                          {u.title && `${u.title} `}
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td>{u.designation || "—"}</td>
                    <td>{u.organisation_name || "—"}</td>
                    <td>
                      <span
                        className={`role-pill ${roleClassName(u.role_name || "")}`}
                        style={{ fontSize: ".7rem", padding: "2px 8px" }}
                      >
                        {u.role_name}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "#475569",
                        fontFamily: "monospace",
                      }}
                    >
                      {u.phone || "—"}
                    </td>

                    {/* Edit Action */}
                    <td className="c">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer transition-all active:scale-90"
                        style={{ border: "none", background: "none" }}
                        title="Edit User"
                      >
                        <Edit size={16} />
                      </button>
                    </td>

                    {/* Status Action (toggle) */}
                    <td className="c">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={u.status === 1}
                          onChange={(e) =>
                            toggleUserStatus(u, e.target.checked)
                          }
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>

                    {/* Reset Password Action */}
                    <td className="c">
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="p-1.5 hover:bg-slate-100 text-slate-655 rounded-lg cursor-pointer transition-all active:scale-90"
                        style={{
                          border: "1px solid #E2E8F0",
                          background: "#F8FAFC",
                          borderRadius: "6px",
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
              Showing {filteredDbUsers.length} of {dbUserList.length}{" "}
              users
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
