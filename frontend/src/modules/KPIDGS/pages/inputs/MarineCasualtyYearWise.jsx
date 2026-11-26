import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { fetchMarineYearWiseEntry, createMarineYearWise, updateMarineYearWise } from '../../api';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGS_TOASTS } from '../../toastMessages';
import { yearOptions } from '../../data/periodOptions';
import { YEAR_WISE_COUNTS, YEAR_WISE_SLUG, sumCounts } from '../../data/marineCasualty';

const selectCls =
  'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';

const SECTION = 'Marine Casualty Incidents - Year-wise';
const THIS_YEAR = new Date().getFullYear();
const digitsOnly = (raw) => raw.replace(/[^\d]/g, '');
const blankCounts = () => Object.fromEntries(YEAR_WISE_COUNTS.map((c) => [c.field, '']));

// K-2.5.2 Marine Casualty Incidents - Year-wise (tbl_kpi_incident_year_wise): one entry per year with
// seven counts, as the old portal.
//   add  - a year that already has an entry is blocked; no year after this one
//   edit - opened from the Data List; the year is fixed, the counts change
export default function MarineCasualtyYearWise({ triggerNotification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView } = useKPIDGSPermissions();

  const editItem = location.state?.slug === YEAR_WISE_SLUG ? location.state.item : null;
  const isEdit = Boolean(editItem);
  const allowed = isEdit ? canEdit : canAdd;

  const [year, setYear] = useState(isEdit ? String(editItem.year) : '');
  const [counts, setCounts] = useState(() => (isEdit
    ? Object.fromEntries(YEAR_WISE_COUNTS.map((c) => [c.field, editItem[c.column] == null ? '' : String(editItem[c.column])]))
    : blankCounts()));
  // Whether the chosen year already has an entry, tagged with the year it was asked for
  const [check, setCheck] = useState(null);
  const [saving, setSaving] = useState(false);

  const checking = !isEdit && Boolean(year) && check?.year !== year;
  const duplicate = !isEdit && Boolean(year) && check?.year === year && check.exists;

  useEffect(() => {
    if (isEdit || !year) return undefined;
    let cancelled = false;
    fetchMarineYearWiseEntry(year)
      .then((res) => {
        if (cancelled) return;
        setCheck({ year, exists: Boolean(res.data?.exists) });
        if (res.data?.exists) notify(DGS_TOASTS.duplicate('year'));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error checking K-2.5.2 year:', err);
        setCheck({ year, exists: false }); // a failed check should not lock the form
      });
    return () => { cancelled = true; };
  }, [year, isEdit, notify]);

  const total = useMemo(() => sumCounts(Object.values(counts)), [counts]);
  const years = useMemo(() => yearOptions(year).filter((y) => isEdit || y <= THIS_YEAR), [year, isEdit]);

  const goBack = useCallback(() => {
    navigate(isEdit && canView ? `/kpi/dgs/data-list/${YEAR_WISE_SLUG}` : '/kpi/dgs/input-forms');
  }, [navigate, isEdit, canView]);

  const handleSubmit = async () => {
    if (!year) { notify(COMMON_TOASTS.requiredSelect('Year')); return; }
    const missing = YEAR_WISE_COUNTS.find((c) => counts[c.field] === '');
    if (missing) { notify(COMMON_TOASTS.requiredInput(missing.label)); return; }
    if (duplicate) { notify(DGS_TOASTS.duplicate('year')); return; }
    const payload = { year: Number(year), ...Object.fromEntries(YEAR_WISE_COUNTS.map((c) => [c.field, Number(counts[c.field])])) };
    setSaving(true);
    try {
      if (isEdit) {
        await updateMarineYearWise(payload);
        notify(DGS_TOASTS.updated(SECTION));
      } else {
        await createMarineYearWise(payload);
        notify(DGS_TOASTS.added(SECTION));
      }
      navigate(canView ? `/kpi/dgs/data-list/${YEAR_WISE_SLUG}` : '/kpi/dgs/input-forms', { replace: isEdit });
    } catch (err) {
      console.error('Error saving K-2.5.2:', err);
      if (!isEdit && err?.response?.status === 409) notify(DGS_TOASTS.duplicate('year'));
      else notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-card space-y-5">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">K-2.5.2</span>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{isEdit ? 'Update' : 'Add'} {SECTION}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="k252-year" className={labelCls}>Year<span className="text-red-500">*</span></label>
          <select id="k252-year" value={year} onChange={(e) => setYear(e.target.value)} disabled={isEdit || saving} className={selectCls}>
            <option value="">--Select Year--</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="hidden md:block" />
        {YEAR_WISE_COUNTS.map((c) => (
          <div key={c.field}>
            <label htmlFor={`k252-${c.field}`} className={labelCls}>{c.label}<span className="text-red-500">*</span></label>
            <input
              id={`k252-${c.field}`}
              type="text"
              inputMode="numeric"
              value={counts[c.field]}
              onChange={(e) => setCounts((prev) => ({ ...prev, [c.field]: digitsOnly(e.target.value) }))}
              disabled={saving || duplicate || !allowed}
              className={selectCls}
              placeholder="0"
            />
          </div>
        ))}
        <div>
          <span className={labelCls}>Total Incidents</span>
          <div className="h-9 px-3 flex items-center text-xs font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100">
            {total.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {duplicate && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
          <span>An entry for {year} already exists. Edit it from the Data List instead.</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || checking || duplicate || !allowed}
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
