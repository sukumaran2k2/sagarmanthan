import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // EDIT
import {
  submitVesselSurvey,
  updateVesselSurvey,        // EDIT
  fetchVesselSurveyList,     // EDIT
  fetchMmdList,
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
const VESSELS_PER_SURVEYOR = 10;

export default function VesselPortSurvey({ triggerNotification }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();                 // EDIT
  const editId = searchParams.get('id');                    // EDIT
  const notify = useNotifier(triggerNotification);
  const { canAdd } = useKPIDGSPermissions();

  const [form, setForm] = useState({
    year: '', month: '', mmd: '', noOfSurveyorsPosted: '', actualVesselsSurveyed: '',
  });
  const [mmds, setMmds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState(null);   
            // EDIT

  const targetVessels = form.noOfSurveyorsPosted === ''
    ? ''
    : Number(form.noOfSurveyorsPosted) * VESSELS_PER_SURVEYOR;

  const percentAchieved = (form.actualVesselsSurveyed === '' || !targetVessels)
    ? ''
    : ((Number(form.actualVesselsSurveyed) / targetVessels) * 100).toFixed(2);

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

  // EDIT: load the record when opened with ?id=
  useEffect(() => {
    if (!editId) { setEditRow(null); return; }
    fetchVesselSurveyList()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const row = list.find((r) => String(r.id) === String(editId));
        if (!row) { notify(COMMON_TOASTS.loadFailed('Vessel survey record')); return; }
        console.log('editing row:', row); // check the keys below match
        setEditRow(row);
        setForm((prev) => ({
          ...prev,
          year: String(row.year ?? ''),
          month: String(row.month ?? ''),
          mmd: row.mmd_id != null ? String(row.mmd_id) : prev.mmd,
          noOfSurveyorsPosted: String(row.no_of_surveyors_posted ?? ''),
          actualVesselsSurveyed: String(row.actual_no_of_vessels ?? ''),
        }));
      })
      .catch(() => notify(COMMON_TOASTS.loadFailed('Vessel survey record')));
  }, [editId]); // eslint-disable-line

  // EDIT: if the list only returns mmd_name, match the id from the MMD list
  useEffect(() => {
    if (!editRow || form.mmd || !mmds.length || !editRow.mmd_name) return;
    const match = mmds.find((m) => m.mmd_name === editRow.mmd_name);
    if (match) setForm((prev) => ({ ...prev, mmd: String(match.mmd_id) }));
  }, [editRow, mmds, form.mmd]);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setNumber = useCallback((field, raw) => {
    const v = raw === '' ? '' : raw.replace(/[^\d]/g, '');
    setForm((prev) => ({ ...prev, [field]: v }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const { year, month, mmd, noOfSurveyorsPosted, actualVesselsSurveyed } = form;
    if (!year || !month || !mmd || noOfSurveyorsPosted === '' || actualVesselsSurveyed === '') {
      notify(COMMON_TOASTS.requiredFields?.('All fields') || DGS_TOASTS.mmdNameRequired());
      return;
    }
    setSaving(true);
    try {
      const payload = {
        year: Number(year),
        month: Number(month),
        mmdId: Number(mmd),
        surveyorsPosted: Number(noOfSurveyorsPosted),
        targetVessels: Number(noOfSurveyorsPosted) * VESSELS_PER_SURVEYOR,
        actualVessels: Number(actualVesselsSurveyed),
        percentageAchieved: percentAchieved === '' ? 0 : Number(percentAchieved),
        userId: getCurrentUserId() || 1,
      };
      if (editId) await updateVesselSurvey({ vesselSurveyId: Number(editId), ...payload });
     else await submitVesselSurvey(payload);
      notify(editId ? DGS_TOASTS.updated?.('Vessel Survey') ?? DGS_TOASTS.added('Vessel Survey')
                    : DGS_TOASTS.added('Vessel Survey'));
      navigate(editId ? '/kpi/dgs/data-list/vessel-port-survey' : '/kpi/dgs/input-forms');
    } catch (err) {
      console.error('Error saving:', err);
      if (err?.response?.status === 400) notify(DGS_TOASTS.duplicate('year/month/MMD combination'));
      else notify(DGS_TOASTS.saveFailed(false, getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  }, [form, percentAchieved, notify, navigate, editId]);

  const selectCls =
    'w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200';
  const inputCls = selectCls;
  const readOnlyCls = `${inputCls} !bg-slate-200 dark:!bg-slate-700 text-slate-500 dark:text-slate-300 cursor-not-allowed select-none pointer-events-none`;
  const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1';

  return (
    <div className="module-card space-y-5">
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-700">
        {editId ? 'DGS-Vessel Survey (Update)' : 'DGS-Vessel Survey'}
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
          <label className={labelCls}>MMD Name<span className="text-red-500">*</span></label>
          <select value={form.mmd} onChange={(e) => setField('mmd', e.target.value)} className={selectCls}>
            <option value="">--Select MMD--</option>
            {mmds.map((m) => <option key={m.mmd_id} value={m.mmd_id}>{m.mmd_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>No. of Surveyors Posted<span className="text-red-500">*</span></label>
          <input type="text" inputMode="numeric" value={form.noOfSurveyorsPosted}
            onChange={(e) => setNumber('noOfSurveyorsPosted', e.target.value)} className={inputCls} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>Target No. of Vessels to be Surveyed</label>
          <input type="text" value={targetVessels} disabled readOnly tabIndex={-1}
            aria-readonly="true" className={readOnlyCls} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>Actual No. of Vessels Surveyed<span className="text-red-500">*</span></label>
          <input type="text" inputMode="numeric" value={form.actualVesselsSurveyed}
            onChange={(e) => setNumber('actualVesselsSurveyed', e.target.value)} className={inputCls} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>% Vessel Surveys Achieved</label>
          <input type="text" value={percentAchieved} disabled readOnly tabIndex={-1}
            aria-readonly="true" className={readOnlyCls} placeholder="0.00" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={handleSubmit} disabled={saving || !canAdd}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-bold rounded transition cursor-pointer disabled:cursor-not-allowed">
          {saving ? 'Submitting...' : editId ? 'Update' : 'Submit'}
        </button>
        <button type="button"
          onClick={() => navigate(editId ? '/kpi/dgs/data-list/vessel-port-survey' : '/kpi/dgs/input-forms')}
          disabled={saving}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition cursor-pointer">
          {editId ? 'Cancel' : 'Exit'}
        </button>
      </div>
    </div>
  );
}