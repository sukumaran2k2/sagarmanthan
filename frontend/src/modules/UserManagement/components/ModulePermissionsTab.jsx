import React from 'react';
import { getOrgIconAndColor, getModuleIconAndColor } from '../utils';
import { ORG_LIST, FULL_MODULE_LIST } from '../constants';

export default function ModulePermissionsTab({
  selectedModuleOrg,
  setSelectedModuleOrg,
  orgModuleState,
  toggleOrgModule,
  setAllOrgModules,
  saveModulePermissions
}) {
  return (
    <>
      <div className="sidebar" style={{ width: "280px" }}>
        <div className="sidebar-head">
          <div className="sidebar-head-top">
            <span className="sidebar-title">Organizations</span>
          </div>
        </div>
        <div className="user-list">
          {ORG_LIST.map((org) => {
            const {
              Icon: OrgIcon,
              color: orgColor,
              bg: orgBg,
            } = getOrgIconAndColor(org);
            return (
              <div
                key={org}
                className={`user-item ${selectedModuleOrg === org ? "selected" : ""}`}
                onClick={() => setSelectedModuleOrg(org)}
              >
                <div
                  className="icon-badge mr-3"
                  style={{ backgroundColor: orgBg, color: orgColor }}
                >
                  <OrgIcon size={16} />
                </div>
                <div className="user-info">
                  <div
                    className="user-name"
                    style={{ whiteSpace: "normal", lineHeight: "1.4" }}
                  >
                    {org}
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
