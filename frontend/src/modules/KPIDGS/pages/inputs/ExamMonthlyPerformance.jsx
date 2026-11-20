import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  checkKpi2_3_1_Data,
  createKpi2_3_1,
  fetchKpi2_3_1_EditData,
  updateKpi2_3_1,
} from '../../api';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGS_TOASTS } from '../../toastMessages';
import { MONTHS, EXAM_TYPES, yearOptions } from '../../data/periodOptions';

const SECTION = 'Exam Monthly Performance';
const SLUG = 'exam-monthly-performance';
const NAUTICAL = 1;
const ENGINEERING = 2;

const selectCls =
  'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';

const digitsOnly = (raw) => raw.replace(/[^\d]/g, '');

// K-2.3.1 DGS - Exam Monthly Performance (tbl_kpi_dgs_2_3_1), one entry per year/month.
// Same rules as the old portal:
//   add  - pick a Type and enter that type's total; a month that already has an entry is blocked
//   edit - opened from the Data List; year/month are fixed and both totals are required
export default function ExamMonthlyPerformance({ triggerNotification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView } = useKPIDGSPermissions();

  // The Data List's Edit button passes the row in route state
  const editItem = location.state?.slug === SLUG ? location.state.item : null;
  const isEdit = Boolean(editItem);
  const allowed = isEdit ? canEdit : canAdd;

  const [form, setForm] = useState({
    year: isEdit ? String(editItem.year) : '',
    month: isEdit ? String(editItem.month) : '',
    type: '',
    totalExamNautical: '',
    totalExamEngineering: '',
  });
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  // Duplicate-check answer, tagged with the year/month it was asked for
  const [check, setCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const latestCheckRef = useRef('');

  const checkKey = !isEdit && form.year && form.month ? `${form.year}-${form.month}` : '';
  const checking = Boolean(checkKey) && check?.key !== checkKey;
  const duplicate = Boolean(checkKey) && check?.key === checkKey && check.exists;

  // Edit: load the saved totals for the month
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    fetchKpi2_3_1_EditData(editItem.year, editItem.month)
      .then((res) => {
        if (cancelled) return;
        const row = Array.isArray(res.data) ? res.data[res.data.length - 1] : null;
        setForm((prev) => ({
          ...prev,
          totalExamNautical: row?.total_exam_nautical != null ? String(row.total_exam_nautical) : '',
          totalExamEngineering: row?.total_exam_engineering != null ? String(row.total_exam_engineering) : '',
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading K-2.3.1 entry:', err);
        notify(COMMON_TOASTS.loadFailed(`${SECTION} entry`));
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });
    return () => { cancelled = true; };
  }, [isEdit, editItem?.year, editItem?.month, notify]);

  // Add: a month can hold only one entry, so check as soon as year and month are both picked
  useEffect(() => {
    latestCheckRef.current = checkKey;
    if (!checkKey) return;
    const [year, month] = checkKey.split('-');
    checkKpi2_3_1_Data(year, month)
      .then((res) => {
        if (latestCheckRef.current !== checkKey) return;
        const exists = res.status === 205;
        setCheck({ key: checkKey, exists });
        if (exists) notify(DGS_TOASTS.duplicate('year and month'));
      })
      .catch((err) => {
        if (latestCheckRef.current !== checkKey) return;
        console.error('Error checking K-2.3.1 entry:', err);
        // A failed check should not lock the form
        setCheck({ key: checkKey, exists: false });
      });
  }, [checkKey, notify]);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const goBack = useCallback(() => {
    navigate(isEdit && canView ? `/kpi/dgs/data-list/${SLUG}` : '/kpi/dgs/input-forms');
  }, [navigate, isEdit, canView]);

  const validate = () => {
    if (!form.year) return COMMON_TOASTS.requiredSelect('Year');
    if (!form.month) return COMMON_TOASTS.requiredSelect('Month');
    if (isEdit) {
      if (form.totalExamNautical === '') return COMMON_TOASTS.requiredInput('Total Exam Conducted - Nautical');
      if (form.totalExamEngineering === '') return COMMON_TOASTS.requiredInput('Total Exam Conducted - Engineering');
      return null;
    }
    if (!form.type) return COMMON_TOASTS.requiredSelect('Type');
    if (Number(form.type) === NAUTICAL && form.totalExamNautical === '') {
      return COMMON_TOASTS.requiredInput('Total Exam Conducted - Nautical');
    }
    if (Number(form.type) === ENGINEERING && form.totalExamEngineering === '') {
      return COMMON_TOASTS.requiredInput('Total Exam Conducted - Engineering');
    }
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) {
      notify(problem);
      return;
    }
    if (!isEdit && duplicate) {
      notify(DGS_TOASTS.duplicate('year and month'));
      return;
    }
    const toNumber = (v) => (v === '' ? null : Number(v));
    setSaving(true);
    try {
      if (isEdit) {
        await updateKpi2_3_1({
          year: Number(form.year),
          month: Number(form.month),
          totalExamNautical: toNumber(form.totalExamNautical),
          totalExamEngineering: toNumber(form.totalExamEngineering),
        });
        notify(DGS_TOASTS.updated(SECTION));
      } else {
        const type = Number(form.type);
        await createKpi2_3_1({
          year: Number(form.year),
          month: Number(form.month),
          type,
          // Only the chosen type's total is saved, as in the old portal
          totalExamNautical: type === NAUTICAL ? toNumber(form.totalExamNautical) : null,
          totalExamEngineering: type === ENGINEERING ? toNumber(form.totalExamEngineering) : null,
        });
        notify(DGS_TOASTS.added(SECTION));
      }
      navigate(canView ? `/kpi/dgs/data-list/${SLUG}` : '/kpi/dgs/input-forms', { replace: isEdit });
    } catch (err) {
      console.error('Error saving K-2.3.1:', err);
      // 409: someone saved this month after the form's check
      if (!isEdit && err?.response?.status === 409) notify(DGS_TOASTS.duplicate('year and month'));
      else notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  const showNautical = isEdit || Number(form.type) === NAUTICAL;
  const showEngineering = isEdit || Number(form.type) === ENGINEERING;
  const busy = saving || loadingEdit;

  return (
    <div className="module-card space-y-5">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">K-2.3.1</span>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {isEdit ? 'Update' : 'Add'} DGS - Exam Monthly Performance
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Year<span className="text-red-500">*</span></label>
          <select value={form.year} onChange={(e) => setField('year', e.target.value)} disabled={isEdit || busy} className={selectCls}>
            <option value="">--Select Year--</option>
            {yearOptions(form.year).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Month<span className="text-red-500">*</span></label>
          <select value={form.month} onChange={(e) => setField('month', e.target.value)} disabled={isEdit || busy} className={selectCls}>
            <option value="">--Select Month--</option>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {!isEdit && (
          <div>
            <label className={labelCls}>Type<span className="text-red-500">*</span></label>
            <div className="flex items-center gap-6 h-9">
              {EXAM_TYPES.map((t) => (
                <label key={t.value} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="k231-type"
                    value={t.value}
                    checked={Number(form.type) === t.value}
                    onChange={(e) => setField('type', e.target.value)}
                    disabled={busy}
                    className="h-4 w-4 accent-[#0f417a] cursor-pointer"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {showNautical && (
          <div>
            <label className={labelCls}>Total Exam Conducted - Nautical<span className="text-red-500">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              value={form.totalExamNautical}
              onChange={(e) => setField('totalExamNautical', digitsOnly(e.target.value))}
              disabled={busy}
              className={selectCls}
              placeholder={loadingEdit ? 'Loading...' : '0'}
            />
          </div>
        )}
        {showEngineering && (
          <div>
            <label className={labelCls}>Total Exam Conducted - Engineering<span className="text-red-500">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              value={form.totalExamEngineering}
              onChange={(e) => setField('totalExamEngineering', digitsOnly(e.target.value))}
              disabled={busy}
              className={selectCls}
              placeholder={loadingEdit ? 'Loading...' : '0'}
            />
          </div>
        )}
      </div>

      {!isEdit && duplicate && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
          <span>An entry for this year and month already exists. Edit it from the Data List instead.</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || checking || !allowed || (!isEdit && duplicate)}
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
