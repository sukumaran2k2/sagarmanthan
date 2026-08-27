import React from 'react';
import { Edit, UserPlus } from 'lucide-react';
import UserModuleCrudPanel from './UserModuleCrudPanel';

const fieldClass =
  'w-full text-xs pl-3 pr-8 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500';
const inputClass =
  'w-full pl-3 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs';
const labelClass = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5';

export default function UserFormModal({
  isOpen,
  mode = 'edit',
  onClose,
  onSubmit,
  saving = false,
  formTitle,
  setFormTitle,
  formName,
  setFormName,
  formDesignation,
  setFormDesignation,
  formOrg,
  setFormOrg,
  formRole,
  setFormRole,
  formWing,
  setFormWing,
  formDivision,
  setFormDivision,
  formPhone,
  setFormPhone,
  formEmail,
  setFormEmail,
  masterOrgs = [],
  masterRoles = [],
  masterWings = [],
  masterDivisions = [],
  formModules = [],
  formCrudDraft = {},
  setFormCrudDraft,
  formCrudLoading = false,
  formError = '',
  lockOrganisation = false,
}) {
  if (!isOpen) return null;

  const isAdd = mode === 'add';
  const TitleIcon = isAdd ? UserPlus : Edit;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-sm animate-fade-in"
      style={{ zIndex: 9999 }}
    >
      <form onSubmit={onSubmit} className="flex flex-col h-full min-h-0">
        <div className="shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <TitleIcon className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#0f417a] dark:text-blue-300 uppercase tracking-wide truncate">
                {isAdd ? 'Add User' : 'Update User'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                Profile details and module Create / Read / Update / Delete access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || formCrudLoading}
              className="px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white rounded-lg shadow cursor-pointer font-bold text-xs transition-all active:scale-95 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isAdd ? 'Create Account' : 'Update Account'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-1"
              style={{ border: 'none', background: 'none', fontSize: '1.15rem', fontWeight: 'bold' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {formError ? (
          <div className="shrink-0 mx-3 sm:mx-4 mt-3 px-4 py-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-sm font-semibold">
            {formError}
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
          <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-y-auto p-4 sm:p-5 space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-200 text-left min-h-0 max-h-[42vh] lg:max-h-none">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2">
                User profile
              </div>

              <div>
                <label className={labelClass}>Title <span className="text-red-500">*</span></label>
                <select
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className={fieldClass}
                >
                  {['Mr', 'Ms', 'Mrs', 'Shri', 'Smt', 'Dr'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Designation <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Enter designation"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Organisation <span className="text-red-500">*</span></label>
                <select
                  value={formOrg}
                  onChange={(e) => setFormOrg(e.target.value)}
                  required
                  disabled={lockOrganisation}
                  className={fieldClass}
                >
                  <option value="">Select Organisation</option>
                  {masterOrgs.map((org) => (
                    <option key={org.organisation_id} value={org.organisation_id}>
                      {org.organisation_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>User Role <span className="text-red-500">*</span></label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  required
                  className={fieldClass}
                >
                  <option value="">Select User Role</option>
                  {masterRoles.map((role) => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Wing</label>
                <select
                  value={formWing}
                  onChange={(e) => setFormWing(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select Wing</option>
                  {masterWings.map((w) => (
                    <option key={w.wing_id} value={w.wing_id}>
                      {w.wing_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Division</label>
                <select
                  value={formDivision}
                  onChange={(e) => setFormDivision(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select Division</option>
                  {masterDivisions.map((d) => (
                    <option key={d.division_id} value={d.division_id}>
                      {d.division_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Mobile Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  placeholder="Enter mobile number"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className={inputClass}
                />
              </div>

              {isAdd && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-medium">
                  Default password will be set to <strong>Sagarmanthan@123</strong> and shared by email when possible.
                </p>
              )}

              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Fields marked with * are mandatory</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 sm:p-5 min-h-0 flex flex-col overflow-hidden">
              <UserModuleCrudPanel
                modules={formModules}
                draft={formCrudDraft}
                onDraftChange={setFormCrudDraft}
                loading={formCrudLoading}
                hasOrganisation={!!formOrg}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
