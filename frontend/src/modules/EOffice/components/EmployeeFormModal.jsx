import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, UserCog, AlertCircle } from 'lucide-react';
import { EMPLOYEE_LEVELS } from '../utils/employeeLevels';

const EMPTY = { empId: '', empName: '', designation: '', level: '', wing: '', division: '' };

/**
 * Add or edit one employee (E-Office Employee Info).
 * employee: the row being edited, or null to add. units: [{ wing_id, wing_name, division_id,
 * division_name }]. onSave(form) resolves when saved, or throws with the reason to show.
 * Mount it only while open, so each opening starts from the row (or empty).
 */
export default function EmployeeFormModal({ employee, units, unitsError, onSave, onClose }) {
  const isEdit = !!employee;
  const [form, setForm] = useState(() => (employee ? {
    empId: employee.empId || '',
    empName: employee.empName || '',
    designation: employee.designation || '',
    level: employee.level || '',
    wing: employee.wingId != null ? String(employee.wingId) : '',
    division: employee.divisionId != null ? String(employee.divisionId) : '',
  } : EMPTY));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const wings = useMemo(() => {
    const seen = new Map();
    units.forEach((u) => { if (!seen.has(u.wing_id)) seen.set(u.wing_id, u.wing_name); });
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [units]);
  const divisions = units.filter((u) => String(u.wing_id) === form.wing);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const set = (changes) => { setForm((f) => ({ ...f, ...changes })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    const missing = [
      !form.empId.trim() && 'Employee ID', !form.empName.trim() && 'Employee Name',
      !form.designation.trim() && 'Designation', !form.wing && 'Wing', !form.division && 'Division',
    ].filter(Boolean);
    if (missing.length) {
      setError(`Fill in the ${missing.join(', ')}.`);
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, empId: form.empId.trim(), empName: form.empName.trim(), designation: form.designation.trim() });
    } catch (err) {
      setError(err.message || 'The employee could not be saved. Please try again.');
      setSaving(false);
    }
  };

  const Icon = isEdit ? UserCog : UserPlus;
  const req = <span className="text-rose-500">*</span>;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-form-title"
        onSubmit={submit}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0f417a] dark:text-blue-400 border border-blue-100 dark:border-blue-900">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 id="employee-form-title" className="text-sm font-black text-slate-800 dark:text-slate-100">
              {isEdit ? 'Update Employee Details' : 'Add Employee Details'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isEdit ? 'The Employee ID can\'t be changed; it links the employee to the uploaded sheets.' : 'Used to match the Emp Id in E-Office and Attendance sheets.'}
            </p>
          </div>
        </div>

        <div className="px-5 py-4 overflow-auto flex-1 space-y-4">
          {unitsError && (
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300"><AlertCircle className="h-4 w-4" /> {unitsError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emp-id" className="module-form-label">Employee ID {req}</label>
              <input id="emp-id" value={form.empId} maxLength={255} readOnly={isEdit} disabled={saving}
                onChange={(e) => set({ empId: e.target.value })}
                className={`module-form-input ${isEdit ? 'module-form-input-readonly' : ''}`} />
            </div>
            <div>
              <label htmlFor="emp-name" className="module-form-label">Employee Name {req}</label>
              <input id="emp-name" value={form.empName} maxLength={255} disabled={saving}
                onChange={(e) => set({ empName: e.target.value })} className="module-form-input" />
            </div>
            <div>
              <label htmlFor="emp-designation" className="module-form-label">Designation {req}</label>
              <input id="emp-designation" value={form.designation} maxLength={255} disabled={saving}
                onChange={(e) => set({ designation: e.target.value })} className="module-form-input" />
            </div>
            <div>
              <label htmlFor="emp-level" className="module-form-label">Level of Designation</label>
              <select id="emp-level" value={form.level} disabled={saving} onChange={(e) => set({ level: e.target.value })} className="module-form-select">
                <option value="">None of the Above</option>
                {EMPLOYEE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="emp-wing" className="module-form-label">Wing {req}</label>
              <select id="emp-wing" value={form.wing} disabled={saving || !units.length} onChange={(e) => set({ wing: e.target.value, division: '' })} className="module-form-select">
                <option value="">--Select Wing--</option>
                {wings.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="emp-division" className="module-form-label">Division {req}</label>
              <select id="emp-division" value={form.division} disabled={saving || !form.wing} onChange={(e) => set({ division: e.target.value })} className="module-form-select">
                <option value="">{form.wing ? '--Select Division--' : '--Select Wing first--'}</option>
                {divisions.map((d) => <option key={d.division_id} value={d.division_id}>{d.division_name}</option>)}
              </select>
            </div>
          </div>
          {error && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button type="submit" disabled={saving || !units.length}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm cursor-pointer disabled:opacity-60">
            {saving ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update' : 'Submit')}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm cursor-pointer disabled:opacity-60">
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
