import React, { useState } from 'react';
import { Shield, Lock, Eye, Plus, Edit3, Trash2, Save, UserCheck, Info, ChevronDown, ChevronRight } from 'lucide-react';

const INITIAL_ROLES = [
  { id: 'senior_officer', name: 'Senior Officer', category: 'Port Organization' },
  { id: 'nodal_officer', name: 'Nodal Officer', category: 'Port Organization' },
  { id: 'wing_level', name: 'Wing/Division Level User', category: 'Ministry (MOPSW)' },
  { id: 'under_secretary', name: 'Under Secretary Level', category: 'Ministry (MOPSW)' },
  { id: 'director', name: 'Director Level', category: 'Ministry (MOPSW)' },
  { id: 'joint_secretary', name: 'Joint Secretary Level', category: 'Ministry (MOPSW)' },
  { id: 'secretary', name: 'Secretary Level', category: 'Ministry (MOPSW)' }
];

const INITIAL_MODULES = [
  // Project (4)
  { id: 'projects', name: 'Projects' },
  { id: 'csr_projects', name: 'CSR Projects' },
  { id: 'capex', name: 'Capex' },
  { id: 'expenditure', name: 'Expenditure' },

  // KPI (8)
  { id: 'major_ports', name: 'Major Ports' },
  { id: 'dgs', name: 'DGS' },
  { id: 'iwai', name: 'IWAI' },
  { id: 'dgll', name: 'DGLL' },
  { id: 'csl', name: 'CSL' },
  { id: 'imu', name: 'IMU' },
  { id: 'sci', name: 'SCI' },
  { id: 'cmec', name: 'CMEC' },

  // HR & Institutional (3)
  { id: 'hr_management', name: 'HR Management' },
  { id: 'young_professionals', name: 'Young Professionals' },
  { id: 'consultants_appointment', name: 'Consultants Appointment' },

  // Governance (16)
  { id: 'attendance', name: 'Attendance' },
  { id: 'gem_procurements', name: 'GEM Procurements' },
  { id: 'cpgrams', name: 'CPGRAMS' },
  { id: 'cabinet_notes_mopsw', name: 'Cabinet Notes - MoPSW' },
  { id: 'cabinet_notes_other', name: 'Cabinet Notes - Other Ministries' },
  { id: 'vip_reference', name: 'VIP Reference' },
  { id: 'e_office', name: 'E Office' },
  { id: 'media_outreach', name: 'Media Outreach' },
  { id: 'parliamentary_issues', name: 'Parliamentary Issues' },
  { id: 'audit_paras', name: 'Audit Paras' },
  { id: 'inter_state_ministerial', name: 'Inter State & Inter Ministerial' },
  { id: 'foreign_visit', name: 'Foreign Visit' },
  { id: 'cruise_shipping', name: 'Cruise Shipping' },
  { id: 'flagged_ships', name: 'Flagged Ships / FOB Basis' },
  { id: 'mom_meetings', name: 'MOM Of PSW Meetings' },
  { id: 'review_items', name: 'Review Items' },

  // Legal (3)
  { id: 'court_cases', name: 'Court Cases' },
  { id: 'acts_rules', name: 'Acts & Rules' },
  { id: 'bills_preconstitutions', name: 'Bills/PreConstitutions Act' },

  // Long Term Strategies (4)
  { id: 'miv_2030', name: 'MIV 2030' },
  { id: 'amrit_kaal_vision_2047', name: 'Amrit Kaal Vision 2047' },
  { id: 'drishti_portal', name: 'Drishti portal (OVOD)' },
  { id: 'gmis_imw_mou', name: 'GMIS & IMW - MoU Tracking' },

  // Others (5)
  { id: 'knowledge_repository', name: 'Knowledge Repository' },
  { id: 'form_builder', name: 'Form Builder' },
  { id: 'mopsw_tracker', name: 'MoPSW Tracker' },
  { id: 'senior_officer_meetings', name: 'Senior Officer Meetings' },
  { id: 'contact_us', name: 'Contact Us' }
];

const MODULE_CATEGORIES = [
  {
    title: 'Project',
    moduleIds: ['projects', 'csr_projects', 'capex', 'expenditure']
  },
  {
    title: 'KPI',
    moduleIds: ['major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec']
  },
  {
    title: 'HR & Institutional',
    moduleIds: ['hr_management', 'young_professionals', 'consultants_appointment']
  },
  {
    title: 'Governance',
    moduleIds: ['attendance', 'gem_procurements', 'cpgrams', 'cabinet_notes_mopsw', 'cabinet_notes_other', 'vip_reference', 'e_office', 'media_outreach', 'parliamentary_issues', 'audit_paras', 'inter_state_ministerial', 'foreign_visit', 'cruise_shipping', 'flagged_ships', 'mom_meetings', 'review_items']
  },
  {
    title: 'Legal',
    moduleIds: ['court_cases', 'acts_rules', 'bills_preconstitutions']
  },
  {
    title: 'Long Term Strategies',
    moduleIds: ['miv_2030', 'amrit_kaal_vision_2047', 'drishti_portal', 'gmis_imw_mou']
  },
  {
    title: 'General Modules',
    moduleIds: ['knowledge_repository', 'form_builder', 'mopsw_tracker', 'senior_officer_meetings', 'contact_us']
  }
];

const DEFAULT_PERMISSIONS = {
  director: Object.fromEntries(INITIAL_MODULES.map(m => {
    const isRestricted = ['attendance', 'gem_procurements', 'cpgrams', 'cabinet_notes_mopsw', 'cabinet_notes_other', 'vip_reference', 'e_office', 'media_outreach', 'parliamentary_issues', 'audit_paras', 'inter_state_ministerial', 'foreign_visit', 'cruise_shipping', 'flagged_ships', 'mom_meetings', 'review_items', 'court_cases', 'acts_rules', 'bills_preconstitutions', 'form_builder'].includes(m.id);
    return [m.id, { visibility: !isRestricted, add: false, update: false, delete: false }];
  })),
  joint_secretary: Object.fromEntries(INITIAL_MODULES.map(m => {
    const isAllowed = m.id === 'projects' || m.id === 'csr_projects' || m.id === 'capex' || m.id === 'expenditure' || ['major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec'].includes(m.id);
    return [m.id, { visibility: isAllowed, add: false, update: false, delete: false }];
  })),
  secretary: Object.fromEntries(INITIAL_MODULES.map(m => {
    const isAllowed = m.id === 'projects' || m.id === 'csr_projects' || m.id === 'capex' || m.id === 'expenditure' || ['major_ports', 'dgs', 'iwai', 'dgll', 'csl', 'imu', 'sci', 'cmec'].includes(m.id);
    return [m.id, { visibility: isAllowed, add: false, update: false, delete: false }];
  })),
  senior_officer: Object.fromEntries(INITIAL_MODULES.map(m => [m.id, { visibility: true, add: true, update: true, delete: false }])),
  nodal_officer: Object.fromEntries(INITIAL_MODULES.map(m => [m.id, { visibility: true, add: true, update: true, delete: false }])),
  wing_level: Object.fromEntries(INITIAL_MODULES.map(m => [m.id, { visibility: true, add: true, update: true, delete: false }])),
  under_secretary: Object.fromEntries(INITIAL_MODULES.map(m => [m.id, { visibility: true, add: true, update: false, delete: false }])),
  admin: Object.fromEntries(INITIAL_MODULES.map(m => [m.id, { visibility: true, add: true, update: true, delete: true }])),
  super_admin: Object.fromEntries(INITIAL_MODULES.map(m => [m.id, { visibility: true, add: true, update: true, delete: true }])),
  view_only_admin: Object.fromEntries(INITIAL_MODULES.map(m => [m.id, { visibility: true, add: false, update: false, delete: false }])),
};

export default function UserManagementView({ triggerNotification, onPermissionsChange }) {
  const [selectedRole, setSelectedRole] = useState('director');
  const [openCategory, setOpenCategory] = useState('ministry');
  const [activeCategory, setActiveCategory] = useState('Project');
  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem('sm_rbac_matrix');
    if (!saved) return DEFAULT_PERMISSIONS;
    try {
      const parsed = JSON.parse(saved);
      const merged = {};
      Object.keys(DEFAULT_PERMISSIONS).forEach(roleId => {
        merged[roleId] = {
          ...DEFAULT_PERMISSIONS[roleId],
          ...(parsed[roleId] || {})
        };
      });
      return merged;
    } catch (e) {
      return DEFAULT_PERMISSIONS;
    }
  });

  const toggleCategory = (title) => {
    setActiveCategory(prev => prev === title ? '' : title);
  };

  const handleCheckboxChange = (moduleId, permType) => {
    setPermissions(prev => {
      const currentRolePerms = prev[selectedRole] || {};
      const currentModulePerms = currentRolePerms[moduleId] || { visibility: false, add: false, update: false, delete: false };

      const updatedModulePerms = {
        ...currentModulePerms,
        [permType]: !currentModulePerms[permType]
      };

      // If we enable add, update, or delete, visibility must be enabled automatically
      if (['add', 'update', 'delete'].includes(permType) && updatedModulePerms[permType]) {
        updatedModulePerms.visibility = true;
      }

      // If we disable visibility, other perms must be disabled automatically
      if (permType === 'visibility' && !updatedModulePerms.visibility) {
        updatedModulePerms.add = false;
        updatedModulePerms.update = false;
        updatedModulePerms.delete = false;
      }

      return {
        ...prev,
        [selectedRole]: {
          ...currentRolePerms,
          [moduleId]: updatedModulePerms
        }
      };
    });
  };

  const handleSave = () => {
    localStorage.setItem('sm_rbac_matrix', JSON.stringify(permissions));
    if (onPermissionsChange) {
      onPermissionsChange(permissions);
    }
    if (triggerNotification) {
      triggerNotification("Permissions matrix successfully saved.");
    }
  };

  const activeRoleConfig = permissions[selectedRole] || {};

  // Group roles for sidebar categorization
  const ministryRoles = INITIAL_ROLES.filter(r => r.category === 'Ministry (MOPSW)' || r.category === 'Administrative');
  const organizationRoles = INITIAL_ROLES.filter(r => r.category === 'Port Organization');

  return (
    <div className="w-full max-w-7xl mx-auto mt-6 animate-fade-in bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white font-display">User Role Management</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Control module access permissions and visibility matrix across the Ministry portal</p>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg transition duration-205 cursor-pointer border-none outline-none"
          >
            <Save className="h-4 w-4" />
            <span>Save Matrix</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left Side: Roles Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4.5 space-y-4 transition-colors duration-200 h-fit">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center space-x-1.5">
            <UserCheck className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Select System Role</span>
          </h2>

          <div className="space-y-3">
            {/* Ministry Category Accordion */}
            <div className="space-y-1">
              <button
                onClick={() => setOpenCategory(openCategory === 'ministry' ? '' : 'ministry')}
                className="relative w-full h-16 rounded-xl overflow-hidden cursor-pointer shadow-md transition-all duration-300 border-none outline-none flex items-center justify-between px-4 hover:scale-[1.02] active:scale-[0.99] select-none"
              >
                <img
                  src="https://images.unsplash.com/photo-1590086782957-93c06ef21604?auto=format&fit=crop&w=300&q=80"
                  alt="Ministry"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/55 transition-colors hover:bg-slate-950/45"></div>
                <span className="relative z-10 text-xs font-black text-white uppercase tracking-widest font-display">Ministry</span>
                <span className="relative z-10">
                  {openCategory === 'ministry' ? (
                    <ChevronDown className="h-4.5 w-4.5 text-white" />
                  ) : (
                    <ChevronRight className="h-4.5 w-4.5 text-white" />
                  )}
                </span>
              </button>

              <div className={`space-y-1 pl-1 transition-all duration-300 overflow-hidden ${openCategory === 'ministry' ? 'max-h-[500px] opacity-100 py-1' : 'max-h-0 opacity-0'
                }`}>
                {ministryRoles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition duration-150 flex flex-col cursor-pointer border-none outline-none ${selectedRole === role.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-850 dark:text-blue-300 border border-blue-150 dark:border-blue-900/60 font-bold shadow-inner'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-transparent'
                      }`}
                  >
                    <span className="text-xs font-semibold font-display">{role.name}</span>
                    <span className="text-[9px] opacity-75 mt-0.5 text-slate-500 dark:text-slate-400">{role.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Organization Category Accordion */}
            <div className="space-y-1">
              <button
                onClick={() => setOpenCategory(openCategory === 'organization' ? '' : 'organization')}
                className="relative w-full h-16 rounded-xl overflow-hidden cursor-pointer shadow-md transition-all duration-300 border-none outline-none flex items-center justify-between px-4 hover:scale-[1.02] active:scale-[0.99] select-none"
              >
                <img
                  src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=300&q=80"
                  alt="Organization"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/55 transition-colors hover:bg-slate-950/45"></div>
                <span className="relative z-10 text-xs font-black text-white uppercase tracking-widest font-display">Organization</span>
                <span className="relative z-10">
                  {openCategory === 'organization' ? (
                    <ChevronDown className="h-4.5 w-4.5 text-white" />
                  ) : (
                    <ChevronRight className="h-4.5 w-4.5 text-white" />
                  )}
                </span>
              </button>

              <div className={`space-y-1 pl-1 transition-all duration-300 overflow-hidden ${openCategory === 'organization' ? 'max-h-[500px] opacity-100 py-1' : 'max-h-0 opacity-0'
                }`}>
                {organizationRoles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition duration-150 flex flex-col cursor-pointer border-none outline-none ${selectedRole === role.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-850 dark:text-blue-300 border border-blue-150 dark:border-blue-900/60 font-bold shadow-inner'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-transparent'
                      }`}
                  >
                    <span className="text-xs font-semibold font-display">{role.name}</span>
                    <span className="text-[9px] opacity-75 mt-0.5 text-slate-500 dark:text-slate-400">{role.category}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Permissions Matrix Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
            <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-transparent flex items-center justify-between transition-colors duration-200">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                Module Permissions for <span className="text-blue-700 dark:text-blue-400 font-bold">{INITIAL_ROLES.find(r => r.id === selectedRole)?.name}</span>
              </h3>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-850 dark:text-blue-300 rounded-full text-[10px] font-mono font-bold uppercase transition-colors duration-200">
                {INITIAL_ROLES.find(r => r.id === selectedRole)?.category}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr className="bg-transparent border-b border-slate-200 dark:border-slate-800/80">
                    <th className="py-3 px-5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Module / Feature Domain</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-24">Visibility</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-24">Add</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-24">Update</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-24">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {MODULE_CATEGORIES.map(cat => {
                    const catModules = cat.moduleIds.map(id => INITIAL_MODULES.find(m => m.id === id)).filter(Boolean);
                    if (catModules.length === 0) return null;

                    return (
                      <React.Fragment key={cat.title}>
                        {/* Category Row Header styled exactly like left sidebar accordions (without images) */}
                        <tr className="border-none">
                          <td colSpan={5} className="py-2 px-3 border-none bg-transparent">
                            <button
                              onClick={() => toggleCategory(cat.title)}
                              className="relative w-full h-14 rounded-xl cursor-pointer shadow-sm transition-all duration-300 border border-slate-200 dark:border-slate-800/80 outline-none flex items-center justify-between px-4 hover:scale-[1.005] active:scale-[0.995] select-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                            >
                              <span className="relative z-10 text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest font-display">{cat.title}</span>
                              <span className="relative z-10">
                                {activeCategory === cat.title ? (
                                  <ChevronDown className="h-4.5 w-4.5 text-slate-500 dark:text-slate-300" />
                                ) : (
                                  <ChevronRight className="h-4.5 w-4.5 text-slate-500 dark:text-slate-300" />
                                )}
                              </span>
                            </button>
                          </td>
                        </tr>

                        {/* Modules under this Category */}
                        {activeCategory === cat.title && catModules.map(module => {
                          const modulePerms = activeRoleConfig[module.id] || { visibility: false, add: false, update: false, delete: false };

                          return (
                            <tr key={module.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/45 transition-colors">
                              <td className="py-3 px-8">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-display">{module.name}</span>
                                </div>
                              </td>

                              {/* Visibility Checkbox */}
                              <td className="py-3 px-4 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={modulePerms.visibility}
                                    onChange={() => handleCheckboxChange(module.id, 'visibility')}
                                    className="h-4.5 w-4.5 rounded border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-750 dark:text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer transition-all"
                                  />
                                </label>
                              </td>

                              {/* Add Checkbox */}
                              <td className="py-3 px-4 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={modulePerms.add}
                                    onChange={() => handleCheckboxChange(module.id, 'add')}
                                    className="h-4.5 w-4.5 rounded border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-750 dark:text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer transition-all"
                                  />
                                </label>
                              </td>

                              {/* Update Checkbox */}
                              <td className="py-3 px-4 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={modulePerms.update}
                                    onChange={() => handleCheckboxChange(module.id, 'update')}
                                    className="h-4.5 w-4.5 rounded border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-750 dark:text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer transition-all"
                                  />
                                </label>
                              </td>

                              {/* Delete Checkbox */}
                              <td className="py-3 px-4 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={modulePerms.delete}
                                    onChange={() => handleCheckboxChange(module.id, 'delete')}
                                    className="h-4.5 w-4.5 rounded border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-800 text-red-650 dark:text-red-500 focus:ring-red-500 focus:ring-offset-0 cursor-pointer transition-all"
                                  />
                                </label>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
