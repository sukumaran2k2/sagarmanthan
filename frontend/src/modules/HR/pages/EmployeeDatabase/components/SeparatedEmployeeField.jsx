import { useEffect, useState } from 'react';
import { fetchSeparatedEmployees } from '../../../api';

const BOX = 'w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs';
const LABEL = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5';

// Direct Recruitment: asks whether the employee is separated and, if so, which one.
export default function SeparatedEmployeeField({ separated, errors, onAnswer, onSelect }) {
  const wanted = separated.answer === '1';
  const [list, setList] = useState({ status: 'loading', rows: [] });
  const [chosen, setChosen] = useState('');
  // after a failed load the list goes back to "Select", so the same name can be picked again
  const value = separated.error ? '' : String(separated.employee?.referenceId ?? chosen);

  useEffect(() => {
    if (!wanted) return undefined;
    let alive = true;
    fetchSeparatedEmployees()
      .then((res) => { if (alive) setList({ status: 'ready', rows: Array.isArray(res.data) ? res.data : [] }); })
      .catch((err) => {
        console.error('Error loading separated employees:', err);
        if (alive) setList({ status: 'error', rows: [] });
      });
    return () => { alive = false; };
  }, [wanted]);

  const answer = (value) => {
    setChosen('');
    onAnswer(value);
  };

  const choose = (referenceId) => {
    setChosen(referenceId);
    onSelect(list.rows.find((r) => String(r.emp_reference_id) === referenceId) || null);
  };

  return (
    <>
      <fieldset>
        <legend className={LABEL}>Is the employee separated? <span className="text-rose-500">*</span></legend>
        <div className="flex items-center gap-6 pt-1">
          {[['1', 'Yes'], ['0', 'No']].map(([value, text]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="isSeparated"
                value={value}
                checked={separated.answer === value}
                onChange={() => answer(value)}
                className="text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>{text}</span>
            </label>
          ))}
        </div>
        {errors.isSeparated && <p className="text-2xs text-rose-500 mt-1">{errors.isSeparated}</p>}
      </fieldset>

      {wanted && (
        <div className="space-y-2">
          <label htmlFor="separatedEmployee" className={LABEL}>
            Select Employee <span className="text-rose-500">*</span>
          </label>
          <select
            id="separatedEmployee"
            value={value}
            onChange={(e) => choose(e.target.value)}
            disabled={list.status !== 'ready'}
            className={`${BOX} disabled:opacity-50`}
          >
            <option value="">{list.status === 'loading' ? 'Loading employees…' : '--Select Employee--'}</option>
            {list.rows.map((r) => (
              <option key={r.emp_reference_id} value={r.emp_reference_id}>
                {r.emp_reference_id} - {r.emp_name}
              </option>
            ))}
          </select>
          {separated.loading && <p className="text-2xs text-slate-500">Loading employee details…</p>}
          {separated.employee && <p className="text-2xs text-emerald-600">Details filled in. Please check Basic Details and Education.</p>}
          {list.status === 'ready' && list.rows.length === 0 && <p className="text-2xs text-amber-600">No separated employees found.</p>}
          {list.status === 'error' && <p className="text-2xs text-rose-500">The employee list could not be loaded.</p>}
          {separated.error ? (
            <p className="text-2xs text-rose-500">The employee details could not be loaded: {separated.error}</p>
          ) : (
            errors.separatedEmployee && !separated.loading && <p className="text-2xs text-rose-500">{errors.separatedEmployee}</p>
          )}
        </div>
      )}
    </>
  );
}