import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  fetchKpi2_3_Masterdata,
  fetchKpi2_3_EditMasterdata,
  createKpi2_3_2,
} from '../../api';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGS_TOASTS } from '../../toastMessages';
import { MONTHS, EXAM_TYPES, yearOptions, examTypeName } from '../../data/periodOptions';

const SECTION = 'Exam Overall Performance Statistics';
const SLUG = 'exam-overall-performance';

const selectCls =
  'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';
const cellCls = 'px-2 py-1.5 border border-slate-200 dark:border-slate-700';
const inputCls =
  'w-full h-8 px-2 text-xs text-center border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200';
const inputErrorCls =
  'w-full h-8 px-2 text-xs text-center border border-red-500 bg-red-50 dark:bg-red-900/20 rounded focus:outline-none font-semibold text-red-700 dark:text-red-300';
const readCls =
  'w-full h-8 px-2 text-xs text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-semibold leading-8';

const toText = (v) => (v === null || v === undefined ? '' : String(v));
const n = (v) => Number(v) || 0;
const passPercent = (appeared, passed) => (n(appeared) > 0 ? `${((n(passed) / n(appeared)) * 100).toFixed(2)}%` : '');

// One grid row. Memoised: typing changes only that row's object, so the other ~100 rows of the
// grid skip re-rendering (onCellChange is a stable callback).
const ExamRow = memo(function ExamRow({ row, index, serial, disabled, onCellChange }) {
  const overPassed = row.candidatesPassed !== '' && n(row.candidatesPassed) > n(row.candidatesAppeared);
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <td className={`${cellCls} text-center font-bold text-slate-500`}>{serial}</td>
      <td className={`${cellCls} text-slate-700 dark:text-slate-200 font-semibold`}>{row.codeName}</td>
      <td className={`${cellCls} text-slate-700 dark:text-slate-200`}>{row.subjectName}</td>
      <td className={`${cellCls} text-slate-700 dark:text-slate-200`}>{row.frequencyName}</td>
      <td className={cellCls}>
        <input
          type="text"
          inputMode="numeric"
          value={row.candidatesAppeared}
          onChange={(e) => onCellChange(index, 'candidatesAppeared', e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      </td>
      <td className={cellCls}>
        <input
          type="text"
          inputMode="numeric"
          value={row.candidatesPassed}
          onChange={(e) => onCellChange(index, 'candidatesPassed', e.target.value)}
          disabled={disabled}
          className={overPassed ? inputErrorCls : inputCls}
          title={overPassed ? 'Candidates passed is more than candidates appeared' : undefined}
        />
      </td>
      <td className={cellCls}>
        <div className={readCls}>{passPercent(row.candidatesAppeared, row.candidatesPassed)}</div>
      </td>
    </tr>
  );
});

// K-2.3.2 DGS - Exam Overall Performance Statistics (tbl_kpi_dgs_2_3_2).
// Year + Month + Type load that type's exam rows (Grade > Code > Subject > Frequency) from
// mmt_kpi_2_3_data; the user enters candidates appeared / passed and pass % is worked out.
// Same rules as the old portal:
//   add  - a year/month/type that already has data is blocked (edit it from the Data List)
//   edit - opened from the Data List with year/month/type fixed
//   blank cells are allowed and saved as empty; the backend saves new rows and updates saved ones
export default function ExamOverallPerformance({ triggerNotification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView } = useKPIDGSPermissions();

  // The Data List's Edit button passes the row in route state
  const editItem = location.state?.slug === SLUG ? location.state.item : null;
  const isEdit = Boolean(editItem);
  const allowed = isEdit ? canEdit : canAdd;

  const [year, setYear] = useState(isEdit ? String(editItem.year) : '');
  const [month, setMonth] = useState(isEdit ? String(editItem.month) : '');
  const [type, setType] = useState(isEdit ? String(editItem.type_id) : '');
  // Grid rows, tagged with the year/month/type they were loaded for
  const [loaded, setLoaded] = useState(null);
  const [saving, setSaving] = useState(false);
  // Collapsed grade groups, keyed "<year-month-type>|<grade>" so a new grid starts fully expanded
  const [collapsedGrades, setCollapsedGrades] = useState({});
  const latestLoadRef = useRef('');

  const selectionDone = Boolean(year && month && type);
  const loadKey = selectionDone ? `${year}-${month}-${type}` : '';
  const current = loadKey && loaded?.key === loadKey ? loaded : null;
  const loadingRows = Boolean(loadKey) && !current;
  const rows = useMemo(() => current?.rows ?? [], [current]);
  const duplicate = Boolean(current?.duplicate);

  const isCollapsed = (gradeKey) => Boolean(collapsedGrades[`${loadKey}|${gradeKey}`]);
  const toggleGrade = useCallback((gradeKey) => {
    const id = `${loadKey}|${gradeKey}`;
    setCollapsedGrades((prev) => ({ ...prev, [id]: !prev[id] }));
  }, [loadKey]);

  // Load the grid whenever year, month and type are all chosen (one request).
  // The grid comes back as the saved rows when the combination already has data, so on Add
  // that answer is also the duplicate check (the old portal made a separate check call first).
  useEffect(() => {
    latestLoadRef.current = loadKey;
    if (!loadKey) return;
    const [y, m, t] = loadKey.split('-');
    const isStale = () => latestLoadRef.current !== loadKey;

    const load = async () => {
      const res = isEdit
        ? await fetchKpi2_3_EditMasterdata(y, m, t)
        : await fetchKpi2_3_Masterdata(y, m, t);
      if (isStale()) return;
      const list = Array.isArray(res.data?.rowData) ? res.data.rowData : [];
      if (!isEdit && list.some((r) => r.dgs_2_3_2_ID)) {
        setLoaded({ key: loadKey, rows: [], duplicate: true });
        notify(DGS_TOASTS.duplicate('year, month and type'));
        return;
      }
      setLoaded({
        key: loadKey,
        duplicate: false,
        rows: list.map((r) => ({
          ...r,
          candidatesAppeared: toText(r.candidatesAppeared),
          candidatesPassed: toText(r.candidatesPassed),
        })),
      });
    };

    load().catch((err) => {
      if (isStale()) return;
      setLoaded({ key: loadKey, rows: [], duplicate: false });
      if (err?.response?.status === 404) {
        notify(DGS_TOASTS.examRowsMissing(examTypeName(t)));
      } else {
        console.error('Error loading K-2.3.2 rows:', err);
        notify(COMMON_TOASTS.loadFailed(`${SECTION} rows`));
      }
    });
  }, [isEdit, loadKey, notify]);

  const setCell = useCallback((index, field, raw) => {
    const value = raw.replace(/[^\d]/g, '');
    setLoaded((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }));
  }, []);

  // Rows grouped by grade in the order the master list returns them
  const groups = useMemo(() => {
    const byGrade = new Map();
    rows.forEach((row, index) => {
      const key = row.gradeId ?? row.gradeName;
      if (!byGrade.has(key)) byGrade.set(key, { key, gradeName: row.gradeName, items: [] });
      byGrade.get(key).items.push({ row, index });
    });
    let serial = 0;
    return [...byGrade.values()].map((g) => ({
      ...g,
      items: g.items.map((item) => ({ ...item, serial: ++serial })),
    }));
  }, [rows]);

  const goBack = useCallback(() => {
    navigate(isEdit && canView ? `/kpi/dgs/data-list/${SLUG}` : '/kpi/dgs/input-forms');
  }, [navigate, isEdit, canView]);

  const handleSubmit = async () => {
    if (!year) { notify(COMMON_TOASTS.requiredSelect('Year')); return; }
    if (!month) { notify(COMMON_TOASTS.requiredSelect('Month')); return; }
    if (!type) { notify(COMMON_TOASTS.requiredSelect('Type')); return; }
    if (!isEdit && duplicate) { notify(DGS_TOASTS.duplicate('year, month and type')); return; }
    if (!rows.length) { notify(DGS_TOASTS.examRowsMissing(examTypeName(type))); return; }

    const toNumber = (v) => (v === '' ? null : Number(v));
    const rowData = rows.map((r) => ({
      dgs_2_3_2_ID: r.dgs_2_3_2_ID ?? null,
      typeId: r.typeId,
      gradeId: r.gradeId,
      codeId: r.codeId,
      subjectId: r.subjectId,
      frequencyId: r.frequencyId,
      candidatesAppeared: toNumber(r.candidatesAppeared),
      candidatesPassed: toNumber(r.candidatesPassed),
    }));

    setSaving(true);
    try {
      await createKpi2_3_2({ year: Number(year), month: Number(month), rowData });
      notify(isEdit ? DGS_TOASTS.updated(SECTION) : DGS_TOASTS.added(SECTION));
      navigate(canView ? `/kpi/dgs/data-list/${SLUG}` : '/kpi/dgs/input-forms', { replace: isEdit });
    } catch (err) {
      console.error('Error saving K-2.3.2:', err);
      // 409 on add: someone saved this year/month/type after the form's check
      if (!isEdit && err?.response?.status === 409) notify(DGS_TOASTS.duplicate('year, month and type'));
      else notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-card space-y-5">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">K-2.3.2</span>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {isEdit ? 'Update' : 'Add'} DGS - Exam Overall Performance Statistics
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Year<span className="text-red-500">*</span></label>
          <select value={year} onChange={(e) => setYear(e.target.value)} disabled={isEdit || saving} className={selectCls}>
            <option value="">--Select Year--</option>
            {yearOptions(year).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Month<span className="text-red-500">*</span></label>
          <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={isEdit || saving} className={selectCls}>
            <option value="">--Select Month--</option>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Type<span className="text-red-500">*</span></label>
          <select value={type} onChange={(e) => setType(e.target.value)} disabled={isEdit || saving} className={selectCls}>
            <option value="">--Select Type--</option>
            {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {!isEdit && duplicate && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
          <span>Data for this year, month and type already exists. Edit it from the Data List instead.</span>
        </div>
      )}

      {selectionDone && !duplicate && (
        <div className="overflow-auto max-h-[60vh] border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="min-w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0f417a] text-white">
                <th rowSpan={2} className="px-3 py-2 border border-[#0f417a] font-bold text-center w-14">S.No</th>
                <th rowSpan={2} className="px-3 py-2 border border-[#0f417a] font-bold text-center">Code</th>
                <th rowSpan={2} className="px-3 py-2 border border-[#0f417a] font-bold text-center">Subject</th>
                <th rowSpan={2} className="px-3 py-2 border border-[#0f417a] font-bold text-center">Frequency</th>
                <th colSpan={3} className="px-3 py-2 border border-[#0f417a] font-bold text-center">Input Data</th>
              </tr>
              <tr className="bg-[#0f417a] text-white text-[10px]">
                <th className="px-2 py-2 border border-[#0f417a] font-bold w-36">No. of Candidates Appeared</th>
                <th className="px-2 py-2 border border-[#0f417a] font-bold w-36">No. of Candidates Passed</th>
                <th className="px-2 py-2 border border-[#0f417a] font-bold w-32" title="(Candidates Passed / Candidates Appeared) x 100">
                  Pass Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingRows ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-500">Loading exam rows...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-500">No exam rows found for the selected type.</td></tr>
              ) : (
                <>
                  {groups.map((g) => {
                    const collapsed = isCollapsed(g.key);
                    const Chevron = collapsed ? ChevronRight : ChevronDown;
                    return (
                      <Fragment key={g.key}>
                        <tr className="bg-slate-100 dark:bg-slate-800">
                          {/* Grade name and number of subjects only, as in the old portal's group rows.
                              Click to collapse / expand its subjects (values are kept while hidden). */}
                          <td colSpan={7} className="p-0 border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => toggleGrade(g.key)}
                              aria-expanded={!collapsed}
                              className="w-full flex items-center gap-1.5 px-3 py-2 text-left font-bold text-[#0f417a] dark:text-blue-400 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                            >
                              <Chevron className="h-4 w-4 shrink-0" />
                              Grade: {g.gradeName} <span className="font-semibold text-slate-500">({g.items.length})</span>
                            </button>
                          </td>
                        </tr>
                        {!collapsed && g.items.map(({ row, index, serial }) => (
                          <ExamRow
                            key={row.dgs_2_3_2_ID ?? row.id ?? index}
                            row={row}
                            index={index}
                            serial={serial}
                            disabled={saving}
                            onCellChange={setCell}
                          />
                        ))}
                      </Fragment>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || loadingRows || !allowed || !selectionDone || duplicate || rows.length === 0}
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
