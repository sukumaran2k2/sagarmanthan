import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createKpi2_6_2,
  fetchKpi2_6_2_EditData,
  updateKpi2_6_2,
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

// Ship types listed on the legacy K-2.6.2 form.
const SHIP_TYPES = [
  'Bulk Carrier',
  'Chemical Tanker',
  'Container Ship',
  'Gas Carrier',
  'General Cargo/Multi-Purpose Ship',
  'Oil Tanker',
  'MODU or FPSO',
  'Offshore Service Vessel',
  'Other Types of Ships',
  'Passenger Ship',
  'Tug Boat',
  'Special Purpose Ship',
  'High Speed Passenger Craft',
  'Oil Chemical Tanker',
  'High Speed Cargo Craft',
  'Heavy loaded Carrier',
  'NLS Tanker',
];

// Four age bands, each with the same four metrics. `payloadKey` is what the backend expects on
// req.body.flagStateInspectionTab; `dbField` is the snake_case column returned by getedit.
const AGE_BANDS = [
  {
    label: '<= 5 Years',
    metrics: {
      inspection: { payloadKey: 'upto5YrsInspection', dbField: 'upto_5_years_inspection' },
      detentions: { payloadKey: 'upto5YrsDetentions', dbField: 'upto_5_years_detentions' },
      deficiencies: { payloadKey: 'upto5YrsDeficiencies', dbField: 'upto_5_years_deficiencies' },
      nilDeficiencies: { payloadKey: 'upto5YrsNilDeficiencies', dbField: 'upto_5_years_nil_deficiencies' },
    },
  },
  {
    label: '5-15 Years',
    metrics: {
      inspection: { payloadKey: 'upto5to15YrsInspection', dbField: 'above_5to15_years_inspection' },
      detentions: { payloadKey: 'upto5to15YrsDetentions', dbField: 'above_5to15_years_detentions' },
      deficiencies: { payloadKey: 'upto5to15YrsDeficiencies', dbField: 'above_5to15_years_deficiencies' },
      nilDeficiencies: { payloadKey: 'upto5to15YrsNilDeficiencies', dbField: 'above_5to15_years_nil_deficiencies' },
    },
  },
  {
    label: '16-25 Years',
    metrics: {
      inspection: { payloadKey: 'upto16to25YrsInspection', dbField: 'above_16to25_years_inspection' },
      detentions: { payloadKey: 'upto16to25YrsDetentions', dbField: 'above_16to25_years_detentions' },
      deficiencies: { payloadKey: 'upto16to25YrsDeficiencies', dbField: 'above_16to25_years_deficiencies' },
      nilDeficiencies: { payloadKey: 'upto16to25YrsNilDeficiencies', dbField: 'above_16to25_years_nil_deficiencies' },
    },
  },
  {
    label: '> 25 Years',
    metrics: {
      inspection: { payloadKey: 'above25YrsInspection', dbField: 'above_25_years_inspection' },
      detentions: { payloadKey: 'above25YrsDetentions', dbField: 'above_25_years_detentions' },
      deficiencies: { payloadKey: 'above25YrsDeficiencies', dbField: 'above_25_years_deficiencies' },
      nilDeficiencies: { payloadKey: 'above25YrsNilDeficiencies', dbField: 'above_25_years_nil_deficiencies' },
    },
  },
];

const METRIC_HEADERS = [
  { key: 'inspection', label: 'No. of Inspections' },
  { key: 'detentions', label: 'No. of Detentions' },
  { key: 'deficiencies', label: 'Total no. of deficiencies' },
  { key: 'nilDeficiencies', label: 'Total no. of vessels with NIL deficiencies' },
];

function makeBlankRow() {
  const row = {};
  AGE_BANDS.forEach(({ metrics }) => {
    Object.values(metrics).forEach((m) => { row[m.payloadKey] = ''; });
  });
  return row;
}

// K-2.6.2 Flag State Inspection & GI Performance - Vessel Wise (Input Form).
// Add:  POST /add-kpi2-6-2-data  { year, month, flagStateInspectionTab (JSON string) }.
// Edit: PUT  /edit-2-6-2-data    { year, month, flagStateInspectionTab (JSON string) }.
export default function FlagStateInspectionVesselWise({ triggerNotification }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editYear = searchParams.get('year');
  const editMonth = searchParams.get('month');
  const isEdit = !!(editYear && editMonth);

  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit } = useKPIDGSPermissions();

  const [year, setYear] = useState(isEdit ? String(editYear) : '');
  const [month, setMonth] = useState(isEdit ? String(editMonth) : '');
  const [rows, setRows] = useState(() => {
    const init = {};
    SHIP_TYPES.forEach((s) => { init[s] = makeBlankRow(); });
    return init;
  });
  const [saving, setSaving] = useState(false);

  // Hydrate the grid from the saved row set when opened in edit mode.
  useEffect(() => {
    if (!isEdit) return;
    fetchKpi2_6_2_EditData(editYear, editMonth)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (!list.length) {
          notify(COMMON_TOASTS.loadFailed('Flag State Inspection record'));
          return;
        }
        setRows((prev) => {
          const next = { ...prev };
          for (const dbRow of list) {
            const shipType = dbRow.ship_type;
            if (!shipType || !next[shipType]) continue;
            const populated = { ...next[shipType] };
            AGE_BANDS.forEach(({ metrics }) => {
              Object.values(metrics).forEach((m) => {
                const v = dbRow[m.dbField];
                populated[m.payloadKey] = v == null ? '' : String(v);
              });
            });
            next[shipType] = populated;
          }
          return next;
        });
      })
      .catch(() => notify(COMMON_TOASTS.loadFailed('Flag State Inspection record')));
  }, [isEdit, editYear, editMonth, notify]);

  const setCell = useCallback((shipType, field, raw) => {
    const v = raw === '' ? '' : raw.replace(/[^\d]/g, '');
    setRows((prev) => ({ ...prev, [shipType]: { ...prev[shipType], [field]: v } }));
  }, []);

  const payloadRows = useMemo(() => SHIP_TYPES.map((shipType) => {
    const r = rows[shipType] || {};
    const out = { shipType };
    AGE_BANDS.forEach(({ metrics }) => {
      Object.values(metrics).forEach((m) => {
        out[m.payloadKey] = r[m.payloadKey] === '' || r[m.payloadKey] == null ? 0 : Number(r[m.payloadKey]);
      });
    });
    return out;
  }), [rows]);

  const handleSubmit = useCallback(async () => {
    if (!year || !month) {
      notify(COMMON_TOASTS.requiredFields?.('Year and Month') || DGS_TOASTS.mmdNameRequired());
      return;
    }
    setSaving(true);
    try {
      const payload = {
        year: Number(year),
        month: Number(month),
        flagStateInspectionTab: JSON.stringify(payloadRows),
      };
      if (isEdit) {
        await updateKpi2_6_2(payload);
        notify(DGS_TOASTS.updated('Flag State Inspection & GI Performance - Vessel Wise'));
        navigate('/kpi/dgs/data-list/flag-state-inspection-vessel-wise');
      } else {
        await createKpi2_6_2(payload);
        notify(DGS_TOASTS.added('Flag State Inspection & GI Performance - Vessel Wise'));
        navigate('/kpi/dgs/input-forms');
      }
    } catch (err) {
      console.error('Error saving K-2.6.2:', err);
      if (err?.response?.status === 400) {
        notify(DGS_TOASTS.duplicate('year/month combination'));
      } else {
        notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
      }
    } finally {
      setSaving(false);
    }
  }, [year, month, payloadRows, isEdit, notify, navigate]);

  const selectCls =
    'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200';
  const readOnlyCls = `${selectCls} !bg-slate-200 dark:!bg-slate-700 text-slate-500 dark:text-slate-300 cursor-not-allowed select-none pointer-events-none`;
  const inputCls =
    'w-full h-8 px-2 text-xs text-center border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200';
  const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';

  const exitTo = isEdit ? '/kpi/dgs/data-list/flag-state-inspection-vessel-wise' : '/kpi/dgs/input-forms';
  const canSubmit = isEdit ? canEdit : canAdd;

  return (
    <div className="module-card space-y-5">
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-700">
        {isEdit
          ? 'Update Flag State Inspection & GI Performance - Vessel Wise List'
          : 'Add Flag State Inspection & GI Performance - Vessel Wise List'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Year<span className="text-red-500">*</span></label>
          <select value={year} onChange={(e) => setYear(e.target.value)}
            disabled={isEdit} className={isEdit ? readOnlyCls : selectCls}>
            <option value="">--Select Year--</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            {isEdit && !YEARS.includes(Number(year)) && year
              ? <option value={year}>{year}</option> : null}
          </select>
        </div>
        <div>
          <label className={labelCls}>Month<span className="text-red-500">*</span></label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            disabled={isEdit} className={isEdit ? readOnlyCls : selectCls}>
            <option value="">--Select Month--</option>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#0f417a] text-white">
              <th rowSpan={2} className="px-3 py-2 border border-[#0f417a] font-bold text-center w-40">Ship Type</th>
              {AGE_BANDS.map((band) => (
                <th key={band.label} colSpan={4} className="px-3 py-2 border border-[#0f417a] font-bold text-center">
                  {band.label}
                </th>
              ))}
            </tr>
            <tr className="bg-[#0f417a] text-white text-[10px]">
              {AGE_BANDS.flatMap((band) => METRIC_HEADERS.map((h) => (
                <th key={`${band.label}-${h.key}`} className="px-2 py-2 border border-[#0f417a] font-bold text-center">
                  {h.label}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {SHIP_TYPES.map((shipType) => (
              <tr key={shipType} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold">
                  {shipType}
                </td>
                {AGE_BANDS.flatMap((band) => METRIC_HEADERS.map((h) => {
                  const fieldKey = band.metrics[h.key].payloadKey;
                  return (
                    <td key={`${shipType}-${fieldKey}`} className="px-1.5 py-1.5 border border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={rows[shipType]?.[fieldKey] ?? ''}
                        onChange={(e) => setCell(shipType, fieldKey, e.target.value)}
                        className={inputCls}
                      />
                    </td>
                  );
                }))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !canSubmit || !year || !month}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-bold rounded transition cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? (isEdit ? 'Updating...' : 'Submitting...') : (isEdit ? 'Update' : 'Submit')}
        </button>
        <button
          type="button"
          onClick={() => navigate(exitTo)}
          disabled={saving}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition cursor-pointer"
        >
          {isEdit ? 'Cancel' : 'Exit'}
        </button>
      </div>
    </div>
  );
}
