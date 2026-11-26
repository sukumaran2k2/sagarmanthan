import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { fetchMarineSheetForm, createMarineSheet, updateMarineSheet } from '../../api';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGS_TOASTS } from '../../toastMessages';
import { yearOptions } from '../../data/periodOptions';
import { CASUALTY_TYPES, MONTH_SHORT, sumCounts } from '../../data/marineCasualty';

const selectCls =
  'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';
const cellInputCls =
  'w-full min-w-[52px] h-8 px-1 text-xs text-center border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed';
const thCls = 'px-2 py-2 border border-[#0f417a] font-bold text-center whitespace-nowrap';
const tdCls = 'px-1 py-1 border border-slate-200 dark:border-slate-700';
const totalCls = 'px-2 py-1 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60';

const THIS_YEAR = new Date().getFullYear();
const digitsOnly = (raw) => raw.replace(/[^\d]/g, '');
const fmt = (n) => n.toLocaleString('en-IN');

// K-2.5.1 / 2.5.3 / 2.5.4 Marine Casualty sheets: a year + casualty type, one row per incident type
// (or country, or vessel type) with the incidents in each month. One entry per year + casualty type.
//   add  - a year + casualty type that already has an entry is blocked; no year after this one, and
//          this year's months that haven't started stay at 0
//   edit - opened from the Data List; year and casualty type are fixed, the counts change
// A blank count is saved as 0.
export default function MarineCasualtySheet({ slug, config, triggerNotification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView } = useKPIDGSPermissions();

  // The Data List's Edit button passes the row in route state
  const editItem = location.state?.slug === slug ? location.state.item : null;
  const isEdit = Boolean(editItem);
  const allowed = isEdit ? canEdit : canAdd;

  const [year, setYear] = useState(isEdit ? String(editItem.year) : '');
  const [casualtyType, setCasualtyType] = useState(isEdit ? editItem.casualty_type : '');
  // The sheet for the chosen year + casualty type, tagged with what it was asked for
  const [loaded, setLoaded] = useState(null); // { key, sheet, error }
  const [counts, setCounts] = useState({}); // row name -> 12 strings
  const [saving, setSaving] = useState(false);

  const key = year && casualtyType ? `${year}|${casualtyType}` : '';
  const loading = Boolean(key) && loaded?.key !== key;
  const sheet = key && loaded?.key === key ? loaded.sheet : null;
  const duplicate = !isEdit && Boolean(sheet?.exists);

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const [y, type] = key.split('|');
    fetchMarineSheetForm(config.sheet, y, type)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setCounts(Object.fromEntries(data.rows.map((r) => [r.name, r.months.map((v) => (v == null ? '' : String(v)))])));
        setLoaded({ key, sheet: data, error: null });
        if (!isEdit && data.exists) notify(DGS_TOASTS.duplicate('year and casualty type'));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Error loading ${config.code} sheet:`, err);
        setLoaded({ key, sheet: null, error: true });
        notify(COMMON_TOASTS.loadFailed(`${config.code} rows`));
      });
    return () => { cancelled = true; };
  }, [key, config.sheet, config.code, isEdit, notify]);

  const future = useMemo(() => new Set(sheet?.futureMonths || []), [sheet]);
  const rows = useMemo(() => sheet?.rows || [], [sheet]);

  const setCell = useCallback((name, m, raw) => {
    setCounts((prev) => {
      const next = [...(prev[name] || Array(12).fill(''))];
      next[m] = digitsOnly(raw);
      return { ...prev, [name]: next };
    });
  }, []);

  const rowTotal = (name) => sumCounts(counts[name] || []);
  const monthTotals = useMemo(() => MONTH_SHORT.map((_, m) => sumCounts(rows.map((r) => counts[r.name]?.[m]))), [rows, counts]);
  const grandTotal = sumCounts(monthTotals);

  const goBack = useCallback(() => {
    navigate(isEdit && canView ? `/kpi/dgs/data-list/${slug}` : '/kpi/dgs/input-forms');
  }, [navigate, isEdit, canView, slug]);

  const handleSubmit = async () => {
    if (!year) { notify(COMMON_TOASTS.requiredSelect('Year')); return; }
    if (!casualtyType) { notify(COMMON_TOASTS.requiredSelect('Casualty Type')); return; }
    if (!sheet) return;
    if (duplicate) { notify(DGS_TOASTS.duplicate('year and casualty type')); return; }
    const payload = {
      year: Number(year),
      casualtyType,
      rows: rows.map((r) => ({ name: r.name, months: (counts[r.name] || []).map((v, m) => (future.has(m + 1) || v === '' ? 0 : Number(v))) })),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await updateMarineSheet(config.sheet, payload);
        notify(DGS_TOASTS.updated(config.title));
      } else {
        await createMarineSheet(config.sheet, payload);
        notify(DGS_TOASTS.added(config.title));
      }
      navigate(canView ? `/kpi/dgs/data-list/${slug}` : '/kpi/dgs/input-forms', { replace: isEdit });
    } catch (err) {
      console.error(`Error saving ${config.code}:`, err);
      // 409: someone saved this year + casualty type after the form loaded
      if (!isEdit && err?.response?.status === 409) notify(DGS_TOASTS.duplicate('year and casualty type'));
      else notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  const years = useMemo(() => yearOptions(year).filter((y) => isEdit || y <= THIS_YEAR), [year, isEdit]);
  const busy = saving || loading;
  const editable = Boolean(sheet) && !duplicate && allowed;

  return (
    <div className="module-card space-y-5">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{config.code}</span>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {isEdit ? 'Update' : 'Add'} {config.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${slug}-year`} className={labelCls}>Year<span className="text-red-500">*</span></label>
          <select id={`${slug}-year`} value={year} onChange={(e) => setYear(e.target.value)} disabled={isEdit || saving} className={selectCls}>
            <option value="">--Select Year--</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${slug}-type`} className={labelCls}>Casualty Type<span className="text-red-500">*</span></label>
          <select id={`${slug}-type`} value={casualtyType} onChange={(e) => setCasualtyType(e.target.value)} disabled={isEdit || saving} className={selectCls}>
            <option value="">--Select Casualty Type--</option>
            {CASUALTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {duplicate && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
          <span>An entry for {casualtyType}, {year} already exists. Edit it from the Data List instead.</span>
        </div>
      )}

      {!key && (
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Select a year and a casualty type to enter the number of incidents in each month.</p>
      )}
      {loading && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading...</p>}

      {sheet && (
        <>
          {future.size > 0 && (
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Months of {year} that haven&apos;t started yet are locked at 0.
            </p>
          )}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#0f417a] text-white">
                  <th className={`${thCls} sticky left-0 z-10 bg-[#0f417a] min-w-[60px]`}>S.No</th>
                  <th className={`${thCls} sticky left-[60px] z-10 bg-[#0f417a] min-w-[190px] text-left`}>{sheet.rowLabel}</th>
                  {MONTH_SHORT.map((m) => <th key={m} className={thCls}>{m}</th>)}
                  <th className={thCls}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className={`${tdCls} sticky left-0 bg-white dark:bg-slate-900 text-center font-bold text-slate-500 min-w-[60px]`}>{i + 1}</td>
                    <td className={`${tdCls} sticky left-[60px] bg-white dark:bg-slate-900 px-2 font-semibold text-slate-700 dark:text-slate-200 min-w-[190px]`}>{r.name}</td>
                    {MONTH_SHORT.map((label, m) => {
                      const locked = future.has(m + 1);
                      return (
                        <td key={label} className={tdCls}>
                          <input
                            type="text"
                            inputMode="numeric"
                            aria-label={`${r.name}, ${label}`}
                            value={locked ? '' : (counts[r.name]?.[m] ?? '')}
                            placeholder={locked ? '-' : '0'}
                            onChange={(e) => setCell(r.name, m, e.target.value)}
                            disabled={locked || busy || !editable}
                            className={cellInputCls}
                          />
                        </td>
                      );
                    })}
                    <td className={totalCls}>{fmt(rowTotal(r.name))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <td className={`${totalCls} sticky left-0 z-10 bg-slate-100! dark:bg-slate-800!`} />
                  <td className={`${totalCls} sticky left-[60px] z-10 bg-slate-100! dark:bg-slate-800! text-left`}>Total</td>
                  {monthTotals.map((t, m) => <td key={MONTH_SHORT[m]} className={totalCls}>{fmt(t)}</td>)}
                  <td className={totalCls}>{fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !editable}
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
