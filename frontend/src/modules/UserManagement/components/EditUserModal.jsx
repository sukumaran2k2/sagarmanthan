import React from 'react';
import { Edit } from 'lucide-react';

export default function EditUserModal({
  isOpen,
  onClose,
  onSubmit,
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
  formPhone,
  setFormPhone,
  formEmail,
  setFormEmail,
  masterOrgs,
  masterRoles
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end animate-fade-in"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col slide-in-right border-l border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 bg-slate-55 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Edit className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-black text-[#0f417a] uppercase tracking-wide">
              Update User
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            style={{
              border: "none",
              background: "none",
              fontSize: "1.2rem",
              fontWeight: "bold",
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5 text-xs font-semibold text-slate-700 text-left"
        >
          {/* Title* */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Title *
            </label>
            <select
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
              className="w-full text-xs pl-3 pr-8 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {["Mr", "Ms", "Mrs", "Shri", "Smt", "Dr"].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Name* */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Name *
            </label>
            <input
              type="text"
              required
              placeholder="Enter full name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Designation* */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Designation *
            </label>
            <input
              type="text"
              required
              placeholder="Enter designation"
              value={formDesignation}
              onChange={(e) => setFormDesignation(e.target.value)}
              className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Organization* */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Organization *
            </label>
            <select
              value={formOrg}
              onChange={(e) => setFormOrg(e.target.value)}
              required
              className="w-full text-xs pl-3 pr-8 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Organization</option>
              {masterOrgs.map((org) => (
                <option
                  key={org.organisation_id}
                  value={org.organisation_id}
                >
                  {org.organisation_name}
                </option>
              ))}
            </select>
          </div>

          {/* User Role* */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              User Role *
            </label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              required
              className="w-full text-xs pl-3 pr-8 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select User Role</option>
              {masterRoles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          {/* Email* */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Email *
            </label>
            <input
              type="email"
              required
              placeholder="Enter email address"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Mobile Number* */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Mobile Number *
            </label>
            <input
              type="tel"
              required
              placeholder="Enter mobile number"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Disclaimer */}
          <div className="text-[10px] text-slate-400 italic pt-2">
            Fields marked with * are mandatory
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0f417a] hover:bg-blue-800 text-white rounded-lg shadow cursor-pointer font-bold transition-all active:scale-95"
            >
              Update Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
