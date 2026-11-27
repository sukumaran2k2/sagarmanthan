import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  checkKpi2_7_1_Data,
  createKpi2_7_1,
  fetchKpi2_7_1_EditData,
  fetchMmdList,
  updateKpi2_7_1,
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

// K-2.7.1 Port State Inspection - MMD Wise (Input Form).
// Add:  POST /add-kpi2-7-1    { year, month, mmdName (mmd_id), shipsInspected }.
// Edit: PUT  /edit-2-7-1-data { year, month, mmdName (mmd_id), shipsInspected }.
export default function PortStateInspectionMmdWise({ triggerNotification }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editYear = searchParams.get('year');
  const editMonth = searchParams.get('month');
  const editMmdId = searchParams.get('mmdId');
  const isEdit = !!(editYear && editMonth && editMmdId);

  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit } = useKPIDGSPermissions();

  const [form, setForm] = useState({
    year: isEdit ? String(editYear) : '',
    month: isEdit ? String(editMonth) : '',
    mmd: isEdit ? String(editMmdId) : '',
    shipsInspected: '',
  });
  const [mmds, setMmds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMmdList()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setMmds(list.filter((m) => m.status === 1 || m.status === true));
      })
      .catch((err) => {
        console.error('Error loading MMD list:', err);
        notify(COMMON_TOASTS.loadFailed('MMD list'));
      });
  }, [notify]);

  // Hydrate shipsInspected when opened in edit mode
  useEffect(() => {
    if (!isEdit) return;
    fetchKpi2_7_1_EditData(editYear, editMonth, editMmdId)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        const first = rows[0];
        if (!first) {
          notify(COMMON_TOASTS.loadFailed('Port State Inspection record'));
          return;
        }
        setForm((prev) => ({
          ...prev,
          shipsInspected: String(first.mmd_ship_inspected ?? ''),
        }));
      })
      .catch(() => notify(COMMON_TOASTS.loadFailed('Port State Inspection record')));
  }, [isEdit, editYear, editMonth, editMmdId, notify]);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setNumber = useCallback((field, raw) => {
    const v = raw === '' ? '' : raw.replace(/[^\d]/g, '');
    setForm((prev) => ({ ...prev, [field]: v }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const { year, month, mmd, shipsInspected } = form;
    if (!year || !month || !mmd || shipsInspected === '') {
      notify(COMMON_TOASTS.requiredFields?.('All fields') || DGS_TOASTS.mmdNameRequired());
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateKpi2_7_1({
          year: Number(year),
          month: Number(month),
          mmdName: Number(mmd),
          shipsInspected: Number(shipsInspected),
        });
        notify(DGS_TOASTS.updated('Port State Inspection - MMD Wise'));
        navigate('/kpi/dgs/data-list/port-state-inspection-mmd-wise');
        return;
      }
      try {
        const check = await checkKpi2_7_1_Data(year, month, mmd);
        if (check?.status === 205) {
          notify(DGS_TOASTS.duplicate('year/month/MMD combination'));
          setSaving(false);
          return;
        }
      } catch (_) {
        // Let the create call surface the server error.
      }
      await createKpi2_7_1({
        year: Number(year),
        month: Number(month),
        mmdName: Number(mmd),
        shipsInspected: Number(shipsInspected),
      });
      notify(DGS_TOASTS.added('Port State Inspection - MMD Wise'));
      navigate('/kpi/dgs/input-forms');
    } catch (err) {
      console.error('Error saving K-2.7.1:', err);
      if (err?.response?.status === 400) {
        notify(DGS_TOASTS.duplicate('year/month/MMD combination'));
      } else {
        notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
      }
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, notify, navigate]);

  const selectCls =
    'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200';
  const inputCls = selectCls;
  const readOnlyCls = `${selectCls} !bg-slate-200 dark:!bg-slate-700 text-slate-500 dark:text-slate-300 cursor-not-allowed select-none pointer-events-none`;
  const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';

  const exitTo = isEdit ? '/kpi/dgs/data-list/port-state-inspection-mmd-wise' : '/kpi/dgs/input-forms';
  const canSubmit = isEdit ? canEdit : canAdd;

  return (
    <div className="module-card space-y-5">
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-700">
        {isEdit ? 'Update Port State Inspection - MMD Wise' : 'Add Port State Inspection - MMD Wise'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Year<span className="text-red-500">*</span></label>
          <select value={form.year} onChange={(e) => setField('year', e.target.value)}
            disabled={isEdit} className={isEdit ? readOnlyCls : selectCls}>
            <option value="">--Select Year--</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            {isEdit && !YEARS.includes(Number(form.year)) && form.year
              ? <option value={form.year}>{form.year}</option> : null}
          </select>
        </div>
        <div>
          <label className={labelCls}>Month<span className="text-red-500">*</span></label>
          <select value={form.month} onChange={(e) => setField('month', e.target.value)}
            disabled={isEdit} className={isEdit ? readOnlyCls : selectCls}>
            <option value="">--Select Month--</option>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>MMD Name<span className="text-red-500">*</span></label>
          <select value={form.mmd} onChange={(e) => setField('mmd', e.target.value)}
            disabled={isEdit} className={isEdit ? readOnlyCls : selectCls}>
            <option value="">--Select MMD Name--</option>
            {mmds.map((m) => <option key={m.mmd_id} value={m.mmd_id}>{m.mmd_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>
            Number of Ships Inspected<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form.shipsInspected}
            onChange={(e) => setNumber('shipsInspected', e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !canSubmit}
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
