import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { axiosInstance as api } from '../api';
import { getErrorMessage } from '../utils/notify';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Asks for the details of Emp Ids in an uploaded sheet that are not in the employee list
 * (Attendance and E-Office), creates them, then lets the page upload the sheet again.
 *
 * employees: [{ empId, empName?, designation?, wingName?, divisionName? }] (filled in from the
 *   sheet where it has them)
 * unitsUrl / createUrl: the module's endpoints for the wing / division list and for creating
 *   an employee
 * onCreated(): called once every employee exists; onClose(): cancel
 * Mount it only while asking (each ask starts with an empty form).
 */
export default function MissingEmployeesModal({ isOpen, employees, unitsUrl, createUrl, onCreated, onClose }) {
  const [units, setUnits] = useState([]); // [{ wing_id, wing_name, division_id, division_name }]
  const [unitsError, setUnitsError] = useState('');
  // What the user has typed or chosen, and each row's result, by Emp Id
  const [edits, setEdits] = useState({}); // empId -> { empName?, designation?, wing?, division?, error?, done? }
  const [saving, setSaving] = useState(false);

  // Wing / division list, loaded when the window opens
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    api.get(unitsUrl)
      .then((res) => { if (!cancelled) { setUnits(Array.isArray(res.data) ? res.data : []); setUnitsError(''); } })
      .catch((err) => {
        if (cancelled) return;
        console.error('Wing / division list could not be loaded:', err);
        setUnitsError('The wing and division list could not be loaded. Close this window and try again.');
      });
    return () => { cancelled = true; };
  }, [isOpen, unitsUrl]);

  const wings = useMemo(() => {
    const seen = new Map();
    units.forEach((u) => { if (!seen.has(u.wing_id)) seen.set(u.wing_id, u.wing_name); });
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [units]);
  const divisionsOf = (wingId) => units.filter((u) => String(u.wing_id) === String(wingId));

  // One form row per missing Emp Id: the sheet's values (wing / division matched by name), then
  // whatever the user has changed
  const rows = useMemo(() => employees.map((e) => {
    const unit = units.find((u) => norm(u.wing_name) === norm(e.wingName) && norm(u.division_name) === norm(e.divisionName))
      || units.find((u) => norm(u.wing_name) === norm(e.wingName));
    return {
      empId: e.empId,
      empName: e.empName ? String(e.empName) : '',
      designation: e.designation ? String(e.designation) : '',
      wing: unit ? String(unit.wing_id) : '',
      division: unit && norm(unit.division_name) === norm(e.divisionName) ? String(unit.division_id) : '',
      error: '',
      done: false,
      ...edits[e.empId],
    };
  }), [employees, units, edits]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const change = (empId, changes) => setEdits((prev) => ({ ...prev, [empId]: { ...prev[empId], ...changes, error: '' } }));
  const setResult = (empId, result) => setEdits((prev) => ({ ...prev, [empId]: { ...prev[empId], ...result } }));

  const createAll = async () => {
    // Every field is needed before anything is saved
    let incomplete = false;
    rows.forEach((r) => {
      if (r.done) return;
      const missing = [!r.empName.trim() && 'name', !r.designation.trim() && 'designation', !r.wing && 'wing', !r.division && 'division'].filter(Boolean);
      if (missing.length) {
        incomplete = true;
        setResult(r.empId, { error: `Fill in the ${missing.join(', ')}.` });
      }
    });
    if (incomplete) return;

    // One employee at a time, so each row reports its own result
    setSaving(true);
    let allDone = true;
    for (const r of rows.filter((x) => !x.done)) {
      try {
        await api.post(createUrl, { empId: r.empId, empName: r.empName.trim(), designation: r.designation.trim(), wing: Number(r.wing), division: Number(r.division) });
        setResult(r.empId, { done: true });
      } catch (err) {
        // Already in the list (e.g. created by someone else meanwhile) is fine for the upload
        if (err.response?.status === 409) {
          setResult(r.empId, { done: true });
        } else {
          allDone = false;
          setResult(r.empId, { error: getErrorMessage(err) || 'Could not be created.' });
        }
      }
    }
    setSaving(false);
    if (allDone) onCreated();
  };

  const inputClass = 'w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0f417a] disabled:opacity-60';

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose?.(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="missing-employees-title"
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-100 dark:border-amber-900">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 id="missing-employees-title" className="text-sm font-black text-slate-800 dark:text-slate-100">
              {rows.length === 1 ? 'Employee ID does not exist' : `${rows.length} Employee IDs do not exist`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {rows.length === 1 ? 'This Emp Id in the sheet is' : 'These Emp Ids in the sheet are'} not in the employee list.
              Enter the details to create {rows.length === 1 ? 'it' : 'them'}; the sheet is then uploaded.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 overflow-auto flex-1">
          {unitsError && (
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300"><AlertCircle className="h-4 w-4" /> {unitsError}</p>
          )}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">
                <th className="py-2 pr-2">Emp Id</th>
                <th className="py-2 pr-2">Emp Name *</th>
                <th className="py-2 pr-2">Designation *</th>
                <th className="py-2 pr-2">Wing *</th>
                <th className="py-2">Division *</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.empId} className="align-top border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-2 font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {r.empId}
                    {r.done && <span className="block text-[10px] font-bold text-emerald-600">Created</span>}
                  </td>
                  <td className="py-2 pr-2 min-w-[150px]">
                    <input aria-label={`Name of ${r.empId}`} value={r.empName} disabled={saving || r.done} onChange={(e) => change(r.empId, { empName: e.target.value })} className={inputClass} />
                  </td>
                  <td className="py-2 pr-2 min-w-[140px]">
                    <input aria-label={`Designation of ${r.empId}`} value={r.designation} disabled={saving || r.done} onChange={(e) => change(r.empId, { designation: e.target.value })} className={inputClass} />
                  </td>
                  <td className="py-2 pr-2 min-w-[150px]">
                    <select aria-label={`Wing of ${r.empId}`} value={r.wing} disabled={saving || r.done} onChange={(e) => change(r.empId, { wing: e.target.value, division: '' })} className={inputClass}>
                      <option value="">--Select Wing--</option>
                      {wings.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 min-w-[150px]">
                    <select aria-label={`Division of ${r.empId}`} value={r.division} disabled={saving || r.done || !r.wing} onChange={(e) => change(r.empId, { division: e.target.value })} className={inputClass}>
                      <option value="">{r.wing ? '--Select Division--' : '--Select Wing first--'}</option>
                      {divisionsOf(r.wing).map((d) => <option key={d.division_id} value={d.division_id}>{d.division_name}</option>)}
                    </select>
                    {r.error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{r.error}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 transition cursor-pointer disabled:opacity-60"
          >
            Cancel upload
          </button>
          <button
            type="button"
            onClick={createAll}
            disabled={saving || !!unitsError || !units.length}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-[#0f417a] text-white hover:bg-[#0c3361] transition shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {saving ? 'Creating...' : rows.length === 1 ? 'Create employee and upload' : 'Create employees and upload'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
