import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createEntryExit,
  fetchDgsType,
  fetchDgsGrade,
} from '../../api';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGS_TOASTS } from '../../toastMessages';
import { getCurrentUserId } from '../../../../utils/authSession';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => thisYear - 5 + i);

// K-2.4 DGS-Entry and Exit of Candidates (Input Form).
// POST /add-entry-exit-data expects { financialYear, month, type, grade,
//   noOfCandidatesEntered, noOfCandidatesExited, createdBy }.
export default function EntryExitCandidates({ triggerNotification }) {
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const { canAdd } = useKPIDGSPermissions();

  const [form, setForm] = useState({
    year: '',
    month: '',
    type: '',
    grade: '',
    noOfCandidatesEntered: '',
    noOfCandidatesExited: '',
  });
  const [types, setTypes] = useState([]);
  const [grades, setGrades] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDgsType()
      .then((res) => setTypes(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('Error loading Type:', err);
        notify(COMMON_TOASTS.loadFailed('Type options'));
      });
    fetchDgsGrade()
      .then((res) => setGrades(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('Error loading Grade:', err);
        notify(COMMON_TOASTS.loadFailed('Grade options'));
      });
  }, [notify]);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setNumber = useCallback((field, raw) => {
    const v = raw === '' ? '' : raw.replace(/[^\d]/g, '');
    setForm((prev) => ({ ...prev, [field]: v }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const { year, month, type, grade, noOfCandidatesEntered, noOfCandidatesExited } = form;
    if (!year || !month || !type || !grade || noOfCandidatesEntered === '' || noOfCandidatesExited === '') {
      notify(COMMON_TOASTS.requiredFields?.('All fields') || DGS_TOASTS.mmdNameRequired());
      return;
    }
    setSaving(true);
    try {
      await createEntryExit({
        financialYear: Number(year),
        month: Number(month),
        type: Number(type),
        grade: Number(grade),
        noOfCandidatesEntered: Number(noOfCandidatesEntered),
        noOfCandidatesExited: Number(noOfCandidatesExited),
        createdBy: getCurrentUserId() || 1,
      });
      notify(DGS_TOASTS.added('Entry and Exit of Candidates'));
      navigate('/kpi/dgs/input-forms');
    } catch (err) {
      console.error('Error saving K-2.4:', err);
      const status = err?.response?.status;
      if (status === 400) {
        notify(DGS_TOASTS.duplicate('year/month/grade combination'));
      } else {
        notify(DGS_TOASTS.saveFailed(false, getErrorMessage(err)));
      }
    } finally {
      setSaving(false);
    }
  }, [form, notify, navigate]);

  const selectCls =
    'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200';
  const inputCls = selectCls;
  const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';

  return (
    <div className="module-card space-y-5">
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-700">
        DGS-Entry and Exit of Candidates (Input Form)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Year<span className="text-red-500">*</span></label>
          <select value={form.year} onChange={(e) => setField('year', e.target.value)} className={selectCls}>
            <option value="">--Select Year--</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Month<span className="text-red-500">*</span></label>
          <select value={form.month} onChange={(e) => setField('month', e.target.value)} className={selectCls}>
            <option value="">--Select Month--</option>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Type<span className="text-red-500">*</span></label>
          <select value={form.type} onChange={(e) => setField('type', e.target.value)} className={selectCls}>
            <option value="">--Select Type--</option>
            {types.map((t) => (
              <option key={t.type_id} value={t.type_id}>{t.type_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Grade<span className="text-red-500">*</span></label>
          <select value={form.grade} onChange={(e) => setField('grade', e.target.value)} className={selectCls}>
            <option value="">--Select Grade--</option>
            {grades.map((g) => (
              <option key={g.grade_id} value={g.grade_id}>{g.grade_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>
            No. of Candidates Entered the System i.e. Assessments done<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.noOfCandidatesEntered}
            onChange={(e) => setNumber('noOfCandidatesEntered', e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div>
          <label className={labelCls}>
            No. of Candidates Exited the System i.e. COC Issued<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.noOfCandidatesExited}
            onChange={(e) => setNumber('noOfCandidatesExited', e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !canAdd}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-bold rounded transition cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? 'Submitting...' : 'Submit'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/kpi/dgs/input-forms')}
          disabled={saving}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition cursor-pointer"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
