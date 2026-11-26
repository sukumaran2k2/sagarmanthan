import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
// import {
//   fetchMmdList,
//   createKpi2_1_1,
//   fetchKpi2_1_PreviousCumulative, fetchKpi2_1_ByMonth, updateKpi2_1_1,
// } from '../../api';
import {
  fetchMmdList,
  createKpi2_1_1,
  updateKpi2_1,
  fetchKpi2_1_EditData,
  fetchKpi2_1_PreviousCumulative,
} from '../../api';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGS_TOASTS } from '../../toastMessages';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => thisYear - 5 + i);

const BLANK_ROW = {
  additionApplicationReceived: '',
  additionRegisteredShips: '',
  additionTotalTonnage: '',
  deletionApplicationReceived: '',
  deletionRegisteredShips: '',
  deletionTotalTonnage: '',
};

// Add Flagging - Ships & Tonnage (K-2.1.1).
// MMDs come from MMD Master. Pending / Net / Cumulative columns auto-compute.
export default function FlaggingShipsTonnage({ triggerNotification }) {
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const { canAdd } = useKPIDGSPermissions();
  const [searchParams] = useSearchParams();
const editYear = searchParams.get('year');
const editMonth = searchParams.get('month');
const isEdit = Boolean(editYear && editMonth);

const [year, setYear] = useState(editYear || '');
const [month, setMonth] = useState(editMonth || '');

  // const [year, setYear] = useState('');
  // const [month, setMonth] = useState('');
  const [mmds, setMmds] = useState([]);
  const [values, setValues] = useState({}); // keyed by mmd_name
  const [prevCumulative, setPrevCumulative] = useState({}); // keyed by mmd_name
  const [loadingMmds, setLoadingMmds] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load active MMDs
  useEffect(() => {
    setLoadingMmds(true);
    fetchMmdList()
      .then((res) => {
        const list = (Array.isArray(res.data) ? res.data : [])
          .filter((m) => m.status === 1 || m.status === true)
          .map((m) => ({ id: m.mmd_id, name: m.mmd_name }));
        setMmds(list);
        const init = {};
        list.forEach((m) => { init[m.name] = { ...BLANK_ROW }; });
        setValues(init);
      })
      .catch((err) => {
        console.error('Error loading MMDs:', err);
        notify(COMMON_TOASTS.loadFailed('MMD list'));
        setMmds([]);
      })
      .finally(() => setLoadingMmds(false));
  }, [notify]);


useEffect(() => {
  if (!isEdit || mmds.length === 0) return;
  fetchKpi2_1_EditData(editYear, editMonth)
    .then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setValues((prev) => {
        const next = { ...prev };
        list.forEach((r) => {
          if (!next[r.type]) return;
          next[r.type] = {
            additionApplicationReceived: String(r.addition_application_received ?? ''),
            additionRegisteredShips: String(r.addition_registered_ship ?? ''),
            additionTotalTonnage: String(r.addition_total_tonnage ?? ''),
            deletionApplicationReceived: String(r.deletion_application_received ?? ''),
            deletionRegisteredShips: String(r.deletion_registered_ship ?? ''),
            deletionTotalTonnage: String(r.deletion_total_tonnage ?? ''),
          };
        });
        return next;
      });
    })
    .catch((err) => {
      console.error('Error loading K-2.1 for edit:', err);
      notify(COMMON_TOASTS.loadFailed('Flagging entry'));
    });
}, [isEdit, editYear, editMonth, mmds.length, notify]);
  // Previous-month cumulatives change whenever year/month change
  useEffect(() => {
    if (!year || !month) {
      setPrevCumulative({});
      return;
    }
    fetchKpi2_1_PreviousCumulative(year, month)
      .then((res) => setPrevCumulative(res.data || {}))
      .catch((err) => {
        console.error('Error loading previous cumulative:', err);
        setPrevCumulative({});
      });
  }, [year, month]);

  const setCell = useCallback((name, field, raw) => {
    const v = raw === '' ? '' : raw.replace(/[^\d.]/g, '');
    setValues((prev) => ({ ...prev, [name]: { ...prev[name], [field]: v } }));
  }, []);

  const n = (v) => Number(v) || 0;

  const computedRows = useMemo(() => mmds.map((m) => {
    const r = values[m.name] || BLANK_ROW;
    const additionPending = n(r.additionApplicationReceived) - n(r.additionRegisteredShips);
    const deletionPending = n(r.deletionApplicationReceived) - n(r.deletionRegisteredShips);
    const netRegistered = n(r.additionRegisteredShips) - n(r.deletionRegisteredShips);
    const netTonnage = n(r.additionTotalTonnage) - n(r.deletionTotalTonnage);
    const prev = prevCumulative[m.name] || {};
    const cumulativeRegistered = (n(prev.cummulativeRegisteredShips)) + netRegistered;
    const cumulativeTonnage = (n(prev.cummulativeTonnage)) + netTonnage;
    return {
      mmd: m,
      raw: r,
      additionPending,
      deletionPending,
      netRegistered,
      netTonnage,
      cumulativeRegistered,
      cumulativeTonnage,
    };
  }), [mmds, values, prevCumulative]);

  const totals = useMemo(() => {
    const t = {
      additionApplicationReceived: 0, additionRegisteredShips: 0, additionPending: 0, additionTotalTonnage: 0,
      deletionApplicationReceived: 0, deletionRegisteredShips: 0, deletionPending: 0, deletionTotalTonnage: 0,
      netRegistered: 0, netTonnage: 0, cumulativeRegistered: 0, cumulativeTonnage: 0,
    };
    computedRows.forEach((row) => {
      t.additionApplicationReceived += n(row.raw.additionApplicationReceived);
      t.additionRegisteredShips += n(row.raw.additionRegisteredShips);
      t.additionPending += row.additionPending;
      t.additionTotalTonnage += n(row.raw.additionTotalTonnage);
      t.deletionApplicationReceived += n(row.raw.deletionApplicationReceived);
      t.deletionRegisteredShips += n(row.raw.deletionRegisteredShips);
      t.deletionPending += row.deletionPending;
      t.deletionTotalTonnage += n(row.raw.deletionTotalTonnage);
      t.netRegistered += row.netRegistered;
      t.netTonnage += row.netTonnage;
      t.cumulativeRegistered += row.cumulativeRegistered;
      t.cumulativeTonnage += row.cumulativeTonnage;
    });
    return t;
  }, [computedRows]);

  const handleSubmit = useCallback(async () => {
  if (!year || !month) {
    notify(COMMON_TOASTS.requiredFields?.('Year and Month') || DGS_TOASTS.mmdNameRequired());
    return;
  }
  const shipAndTonnageTab = computedRows.map((row) => ({
    type: row.mmd.name,
    additionApplicationReceived: n(row.raw.additionApplicationReceived),
    additionRegisteredShips: n(row.raw.additionRegisteredShips),
    additionApplicationPending: row.additionPending,
    additionTotalTonnage: n(row.raw.additionTotalTonnage),
    deletionApplicationReceived: n(row.raw.deletionApplicationReceived),
    deletionRegisteredShips: n(row.raw.deletionRegisteredShips),
    deletionApplicationPending: row.deletionPending,
    deletionTotalTonnage: n(row.raw.deletionTotalTonnage),
  }));
  setSaving(true);
  try {
    const payload = {
      year: Number(year),
      month: Number(month),
      shipAndTonnageTab: JSON.stringify(shipAndTonnageTab),
    };
    if (isEdit) {
      await updateKpi2_1(payload);
      notify(DGS_TOASTS.updated('Flagging - Ships & Tonnage')); // toastMessages.js la check pannunga
    } else {
      await createKpi2_1_1(payload);
      notify(DGS_TOASTS.added('Flagging - Ships & Tonnage'));
    }
    navigate('/kpi/dgs/input-forms');
  } catch (err) {
    console.error('Error saving K-2.1.1:', err);
    notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
  } finally {
    setSaving(false);
  }
}, [year, month, computedRows, notify, navigate, isEdit]);
  const inputCls =
    'w-full h-8 px-2 text-xs text-center border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200';
  const readCls =
    'w-full h-8 px-2 text-xs text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-semibold';
  const totalCls =
    'w-full h-8 pl-2 pr-6 text-xs text-center border border-emerald-500/60 bg-emerald-50 dark:bg-emerald-900/20 rounded text-emerald-700 dark:text-emerald-300 font-bold relative';

  const TotalCell = ({ value }) => (
    <div className="relative">
      <input type="text" value={value} readOnly className={totalCls} />
      <CheckCircle2 className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
    </div>
  );

  return (
    <div className="module-card space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-700">
          Add Flagging - Ships &amp; Tonnage
        </h2>
      </div>

      {/* Year / Month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
            Year<span className="text-red-500">*</span>
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="">--Select Year--</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
            Month<span className="text-red-500">*</span>
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="">--Select Month--</option>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#0f417a] text-white">
              <th rowSpan={2} className="px-3 py-2 border border-[#0f417a] font-bold text-center w-24">Ship Type</th>
              <th colSpan={4} className="px-3 py-2 border border-[#0f417a] font-bold text-center">Addition of Ships &amp; Tonnage</th>
              <th colSpan={4} className="px-3 py-2 border border-[#0f417a] font-bold text-center">Deletion of Ships &amp; Tonnage</th>
              <th colSpan={2} className="px-3 py-2 border border-[#0f417a] font-bold text-center">Net - Ships &amp; Tonnage</th>
              <th colSpan={2} className="px-3 py-2 border border-[#0f417a] font-bold text-center">Cumulative Active Ships &amp; Tonnage</th>
            </tr>
            <tr className="bg-[#0f417a] text-white text-[10px]">
              <th className="px-2 py-2 border border-[#0f417a] font-bold">No. of Application Received</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">No. of Registered ships</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">No. of Pending Application</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">Total Tonnage</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">No. of Application Received</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">No. of De-registered ships</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">No. of Pending Application</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">Total Tonnage</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">No. of Registered ships</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">Total Tonnage</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">No. of Registered ships</th>
              <th className="px-2 py-2 border border-[#0f417a] font-bold">Total Tonnage</th>
            </tr>
          </thead>
          <tbody>
            {loadingMmds ? (
              <tr>
                <td colSpan={13} className="text-center py-6 text-slate-500">Loading MMDs...</td>
              </tr>
            ) : mmds.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-6 text-slate-500">No active MMDs found. Add them in MMD Master first.</td>
              </tr>
            ) : computedRows.map((row) => (
              <tr key={row.mmd.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold">{row.mmd.name}</td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.raw.additionApplicationReceived} onChange={(e) => setCell(row.mmd.name, 'additionApplicationReceived', e.target.value)} className={inputCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.raw.additionRegisteredShips} onChange={(e) => setCell(row.mmd.name, 'additionRegisteredShips', e.target.value)} className={inputCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.additionPending} readOnly className={readCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.raw.additionTotalTonnage} onChange={(e) => setCell(row.mmd.name, 'additionTotalTonnage', e.target.value)} className={inputCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.raw.deletionApplicationReceived} onChange={(e) => setCell(row.mmd.name, 'deletionApplicationReceived', e.target.value)} className={inputCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.raw.deletionRegisteredShips} onChange={(e) => setCell(row.mmd.name, 'deletionRegisteredShips', e.target.value)} className={inputCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.deletionPending} readOnly className={readCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.raw.deletionTotalTonnage} onChange={(e) => setCell(row.mmd.name, 'deletionTotalTonnage', e.target.value)} className={inputCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.netRegistered} readOnly className={readCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.netTonnage} readOnly className={readCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.cumulativeRegistered} readOnly className={readCls} />
                </td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <input type="text" value={row.cumulativeTonnage} readOnly className={readCls} />
                </td>
              </tr>
            ))}
            {!loadingMmds && mmds.length > 0 && (
              <tr className="bg-slate-50 dark:bg-slate-800/40">
                <td className="px-3 py-2 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">Total</td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.additionApplicationReceived} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.additionRegisteredShips} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.additionPending} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.additionTotalTonnage} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.deletionApplicationReceived} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.deletionRegisteredShips} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.deletionPending} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.deletionTotalTonnage} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.netRegistered} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.netTonnage} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.cumulativeRegistered} /></td>
                <td className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700"><TotalCell value={totals.cumulativeTonnage} /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !canAdd || !year || !month || mmds.length === 0}
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
