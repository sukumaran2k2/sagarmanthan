import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';

const inputClass =
  'w-full pl-3 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs';
const labelClass = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5';

// Same rule as the server (and the Profile page note)
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_RULE = 'Password must be at least 8 characters with upper and lower case letters, a number and a special character';

function PasswordField({ id, label, value, onChange, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="p-1.5 text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300 rounded-lg cursor-pointer shrink-0"
          style={{ border: 'none', background: 'none' }}
          title={visible ? 'Hide password' : 'Show password'}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordModal({ user, onClose, onSubmit, saving = false }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Please enter the new password in both fields');
      return;
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setError(PASSWORD_RULE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New Password and Confirm Password do not match');
      return;
    }
    setError('');
    onSubmit(newPassword);
  };

  // Rendered on <body>: the page wrapper's fade-in transform would otherwise trap a fixed overlay
  // inside it, so it would not cover the site header and would scroll away with the page
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-fade-in"
      style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.45)' }}
      onClick={saving ? undefined : onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-[440px] overflow-hidden text-left"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#0f417a] via-[#134e96] to-[#1a5ba3] text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <KeyRound className="h-5 w-5 text-blue-100 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-wide">Reset Password</h3>
              <p className="text-[11px] text-blue-100/80 font-medium truncate">
                {user.title ? `${user.title} ` : ''}
                {user.name}
                {user.email ? ` · ${user.email}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer shrink-0"
            style={{ border: 'none', background: 'none' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {error ? (
            <div className="px-3 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-semibold">
              {error}
            </div>
          ) : null}

          <PasswordField
            id="um-reset-new"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            autoFocus
          />
          <PasswordField
            id="um-reset-confirm"
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-medium">
            {PASSWORD_RULE}. The user is emailed once the password is reset.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer font-bold text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white rounded-lg shadow cursor-pointer font-bold text-xs transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Reset Password'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
