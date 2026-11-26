import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  checkEntryExit, createEntryExit, updateEntryExit, fetchEntryExitById, fetchDgsType, fetchDgsGrade,
} from '../../api';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGS_TOASTS } from '../../toastMessages';
import { MONTHS, yearOptions } from '../../data/periodOptions';

const EXITED_TOO_MANY = 'No. of candidates exited cannot be more than no. of candidates entered.';

const SECTION = 'Entry and Exit of Candidates';
const SLUG = 'entry-exit-of-candidates';

const selectCls =
  'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';

const digitsOnly = (raw) => raw.replace(/[^\d]/g, '');
const now = new Date();
const THIS_YEAR = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;

// K-2.4 DGS - Entry and Exit of Candidates (tbl_kpi_dgs_entry_exit), one entry per year + month + grade.
// Same rules as the old portal, with K-2.3's checks:
//   add  - the grade list follows the chosen type; a year/month/grade that already has an entry is
//          blocked; months after the current one can't be picked
//   edit - opened from the Data List; year, month, type and grade are fixed, the two counts change
export default function EntryExitCandidates({ triggerNotification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView } = useKPIDGSPermissions();

  // The Data List's Edit button passes the row in route state
  const editItem = location.state?.slug === SLUG ? location.state.item : null;
  const isEdit = Boolean(editItem);
  const allowed = isEdit ? canEdit : canAdd;

  const [form, setForm] = useState({
    year: isEdit ? String(editItem.year ?? '') : '',
    month: isEdit ? String(editItem.month ?? '') : '',
    type: isEdit ? String(editItem.type_id ?? '') : '',
    grade: isEdit ? String(editItem.grade_id ?? '') : '',
    entered: '',
    exited: '',
  });
  const [types, setTypes] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  // Duplicate-check answer, tagged with the year/month/grade it was asked for
  const [check, setCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const latestCheckRef = useRef('');

  const checkKey = !isEdit && form.year && form.month && form.grade ? `${form.year}-${form.month}-${form.grade}` : '';
  const checking = Boolean(checkKey) && check?.key !== checkKey;
  const duplicate = Boolean(checkKey) && check?.key === checkKey && check.exists;

  useEffect(() => {
    fetchDgsType()
      .then((res) => setTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify(COMMON_TOASTS.loadFailed('Type options')));
    fetchDgsGrade()
      .then((res) => setGrades(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify(COMMON_TOASTS.loadFailed('Grade options')));
  }, [notify]);

  // Edit: load the saved counts
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    fetchEntryExitById(editItem.id)
      .then((res) => {
        if (cancelled) return;
        const row = Array.isArray(res.data) ? res.data[0] : null;
        setForm((prev) => ({
          ...prev,
          entered: row?.no_of_candidates_entered != null ? String(row.no_of_candidates_entered) : '',
          exited: row?.no_of_candidates_exited != null ? String(row.no_of_candidates_exited) : '',
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading K-2.4 entry:', err);
        notify(COMMON_TOASTS.loadFailed(`${SECTION} entry`));
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });
    return () => { cancelled = true; };
  }, [isEdit, editItem?.id, notify]);

  // Add: a grade's month can hold only one entry, so check as soon as year, month and grade are picked
  useEffect(() => {
    latestCheckRef.current = checkKey;
    if (!checkKey) return;
    const [year, month, grade] = checkKey.split('-');
    checkEntryExit(year, month, grade)
      .then((res) => {
        if (latestCheckRef.current !== checkKey) return;
        const exists = res.status === 205;
        setCheck({ key: checkKey, exists });
        if (exists) notify(DGS_TOASTS.duplicate('year, month and grade'));
      })
      .catch((err) => {
        if (latestCheckRef.current !== checkKey) return;
        console.error('Error checking K-2.4 entry:', err);
        // A failed check should not lock the form
        setCheck({ key: checkKey, exists: false });
      });
  }, [checkKey, notify]);

  // Years up to this one; in this year, months up to this one
  const years = useMemo(() => yearOptions(form.year).filter((y) => isEdit || y <= THIS_YEAR), [form.year, isEdit]);
  const months = useMemo(
    () => MONTHS.filter((m) => isEdit || Number(form.year) !== THIS_YEAR || m.value <= THIS_MONTH),
    [form.year, isEdit],
  );
  const gradeOptions = useMemo(() => grades.filter((g) => String(g.type_id) === form.type), [grades, form.type]);

  const setField = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'type') next.grade = ''; // a grade belongs to one type
      if (field === 'year' && Number(value) === THIS_YEAR && Number(prev.month) > THIS_MONTH) next.month = '';
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    navigate(isEdit && canView ? `/kpi/dgs/data-list/${SLUG}` : '/kpi/dgs/input-forms');
  }, [navigate, isEdit, canView]);

  // Candidates exited (CoC issued) can't be more than candidates entered (assessments done)
  const exitedTooMany = form.entered !== '' && form.exited !== '' && Number(form.exited) > Number(form.entered);

  const validate = () => {
    if (!form.year) return COMMON_TOASTS.requiredSelect('Year');
    if (!form.month) return COMMON_TOASTS.requiredSelect('Month');
    if (!form.type) return COMMON_TOASTS.requiredSelect('Type');
    if (!form.grade) return COMMON_TOASTS.requiredSelect('Grade');
    if (form.entered === '') return COMMON_TOASTS.requiredInput('No. of Candidates Entered');
    if (form.exited === '') return COMMON_TOASTS.requiredInput('No. of Candidates Exited');
    if (exitedTooMany) return COMMON_TOASTS.fixValidationErrors(EXITED_TOO_MANY);
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) {
      notify(problem);
      return;
    }
    if (!isEdit && duplicate) {
      notify(DGS_TOASTS.duplicate('year, month and grade'));
      return;
    }
    const counts = { noOfCandidatesEntered: Number(form.entered), noOfCandidatesExited: Number(form.exited) };
    setSaving(true);
    try {
      if (isEdit) {
        await updateEntryExit({ Id: editItem.id, ...counts });
        notify(DGS_TOASTS.updated(SECTION));
      } else {
        await createEntryExit({
          financialYear: Number(form.year),
          month: Number(form.month),
          type: Number(form.type),
          grade: Number(form.grade),
          ...counts,
        });
        notify(DGS_TOASTS.added(SECTION));
      }
      navigate(canView ? `/kpi/dgs/data-list/${SLUG}` : '/kpi/dgs/input-forms', { replace: isEdit });
    } catch (err) {
      console.error('Error saving K-2.4:', err);
      // 409: someone saved this grade's month after the form's check
      if (!isEdit && err?.response?.status === 409) notify(DGS_TOASTS.duplicate('year, month and grade'));
      else notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || loadingEdit;
  // While editing, the fixed type / grade show by name even before the lists load
  const typeChoices = isEdit && !types.length && editItem.type_name
    ? [{ type_id: editItem.type_id, type_name: editItem.type_name }] : types;
  const gradeChoices = isEdit && !gradeOptions.length && editItem.grade_name
    ? [{ grade_id: editItem.grade_id, grade_name: editItem.grade_name }] : gradeOptions;

  return (
    <div className="module-card space-y-5">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">K-2.4</span>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {isEdit ? 'Update' : 'Add'} DGS - Entry and Exit of Candidates
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Year<span className="text-red-500">*</span></label>
          <select value={form.year} onChange={(e) => setField('year', e.target.value)} disabled={isEdit || busy} className={selectCls}>
            <option value="">--Select Year--</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Month<span className="text-red-500">*</span></label>
          <select value={form.month} onChange={(e) => setField('month', e.target.value)} disabled={isEdit || busy} className={selectCls}>
            <option value="">--Select Month--</option>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Type<span className="text-red-500">*</span></label>
          <select value={form.type} onChange={(e) => setField('type', e.target.value)} disabled={isEdit || busy} className={selectCls}>
            <option value="">--Select Type--</option>
            {typeChoices.map((t) => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Grade<span className="text-red-500">*</span></label>
          <select value={form.grade} onChange={(e) => setField('grade', e.target.value)} disabled={isEdit || busy || !form.type} className={selectCls}>
            <option value="">{form.type ? '--Select Grade--' : '--Select a Type first--'}</option>
            {gradeChoices.map((g) => <option key={g.grade_id} value={g.grade_id}>{g.grade_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>No. of Candidates Entered the System i.e. Assessments done<span className="text-red-500">*</span></label>
          <input
            type="text"
            inputMode="numeric"
            value={form.entered}
            onChange={(e) => setField('entered', digitsOnly(e.target.value))}
            disabled={busy}
            className={selectCls}
            placeholder={loadingEdit ? 'Loading...' : '0'}
          />
        </div>
        <div>
          <label className={labelCls}>No. of Candidates Exited the System i.e. CoC Issued<span className="text-red-500">*</span></label>
          <input
            type="text"
            inputMode="numeric"
            value={form.exited}
            onChange={(e) => setField('exited', digitsOnly(e.target.value))}
            disabled={busy}
            aria-invalid={exitedTooMany}
            className={`${selectCls}${exitedTooMany ? ' border-red-500!' : ''}`}
            placeholder={loadingEdit ? 'Loading...' : '0'}
          />
          {exitedTooMany && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">{EXITED_TOO_MANY}</p>}
        </div>
      </div>

      {!isEdit && duplicate && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
          <span>An entry for this grade, year and month already exists. Edit it from the Data List instead.</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || checking || !allowed || exitedTooMany || (!isEdit && duplicate)}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-bold rounded transition cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? (isEdit ? 'Updating...' : 'Submitting...') : (isEdit ? 'Update' : 'Submit')}
        </button>
        <button
          type="button"
          onClick={goBack}
          disabled={saving}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition cursor-pointer"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
