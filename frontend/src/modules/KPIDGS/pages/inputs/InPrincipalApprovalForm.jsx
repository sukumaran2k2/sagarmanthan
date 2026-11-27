import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';

import { DGS_TOASTS } from '../../toastMessages';
import {
  fetchShipyardList, checkKpi2_2_Data, createKpi2_2_1, updateKpi2_2_1, getUpdateMmd_2_2Data,
} from '../../api';

// K-2.2.A  In-Principle Approval Application (slug: sbfap-inprincipal-approval)
// Add mode: opened from the Input Form list.
// Edit mode: opened from the Data List edit icon (row arrives in route state as `item`).

const APPROVED = 'Approved In-Principle';
const REJECTED = 'Rejected In-Principle';

const STATUS_OPTIONS = ['Pending In-Principle', APPROVED, REJECTED];

// Financial year as the earlier portal showed it: Apr-Mar, "2025-2026"
const fyOf = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${start + 1}`;
};

const EMPTY = {
  applicationNumber: '',
  shipyardName: '',
  noOfVessels: '',
  contractualValue: '',
  contractDate: '',
  applicablicFinAssistance: '',
  estFinAssistance: '',
  expDateOfDelivery: '',
  applicationDate: '',
  status: '',
  approvalDate: '',
  rejectionDate: '',
  rejectionRemarks: '',
  generalRemarks: '',
};

// Backend record -> form values. Each field tries a few key spellings because the exact
// keys of the edit endpoint are not known yet: check the console log and trim these lists.
const pick = (row, ...keys) => {
  for (const k of keys) if (row?.[k] != null) return row[k];
  return '';
};
const dateOnly = (v) => (v ? String(v).slice(0, 10) : ''); // 2017-02-12T00:00:00.000Z -> 2017-02-12

const fromRow = (r) => ({
  applicationNumber: String(pick(r, 'unique_application_no', 'application_number', 'applicationNumber')),
  shipyardName: pick(r, 'shipyard_name', 'shipyardName'),
  noOfVessels: pick(r, 'no_of_vessels', 'noOfVessels'),
  contractualValue: pick(r, 'contractual_value_inr', 'contractual_value', 'contractualValue'),
  contractDate: dateOnly(pick(r, 'contract_date', 'contractDate')),
  applicablicFinAssistance: pick(r, 'applicable_rate_of_financial_assistance', 'applicablic_fin_assistance', 'applicablicFinAssistance'),
  estFinAssistance: pick(r, 'estimated_financial_assistance', 'est_fin_assistance', 'estFinAssistance'),
  expDateOfDelivery: dateOnly(pick(r, 'exp_date_of_delivery', 'expected_date_of_delivery', 'expDateOfDelivery')),
  applicationDate: dateOnly(pick(r, 'application_date', 'applicationDate')),
  status: pick(r, 'status'),
  approvalDate: dateOnly(pick(r, 'approval_date', 'approvalDate')),
  rejectionDate: dateOnly(pick(r, 'rejection_date', 'rejectionDate')),
  rejectionRemarks: pick(r, 'remarks_for_rejections', 'rejectionRemarks'),
  generalRemarks: pick(r, 'general_remarks', 'generalRemarks'),
});

// Endpoint may return an object, an array, or { data: ... }
const unwrap = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d[0];
  if (Array.isArray(d?.data)) return d.data[0];
  if (d?.data && typeof d.data === 'object') return d.data;
  return d;
};

const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded focus:outline-none focus:border-[#0f417a] disabled:bg-slate-100 dark:disabled:bg-slate-700';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function InPrincipalApprovalForm({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const navigate = useNavigate();
  const { canAdd, canEdit } = useKPIDGSPermissions();

  const item = useLocation().state?.item || null; // set by the Data List edit icon
  const isEdit = !!item;
  // The value /getedit-2-2-data/:uniqueAppId expects. If the backend wants the application
  // number instead of the serial number, put item.unique_application_no first.
  const editId = item ? (item.sr_no ?? item.id ?? item.unique_application_no) : null;

  const [form, setForm] = useState(EMPTY);
  const [loadingRecord, setLoadingRecord] = useState(isEdit);
  const [shipyards, setShipyards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [appNoTaken, setAppNoTaken] = useState(false);

  useEffect(() => {
    fetchShipyardList()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        // Hide shipyards switched off in MMD Shipyard
        setShipyards(list.filter((s) => s.status === undefined || Number(s.status) === 1));
      })
      .catch((err) => {
        console.error('Error loading shipyards:', err);
        notify(COMMON_TOASTS.loadFailed('Shipyard list'));
      });
  }, [notify]);

  // Edit mode: load the record by id, falling back to the list row if the call fails
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    setLoadingRecord(true);
    getUpdateMmd_2_2Data(editId)
      .then((res) => {
        if (cancelled) return;
        const record = unwrap(res);
        console.log('edit-2-2 record:', record); // remove once the key mapping is confirmed
        setForm(fromRow(record || item));
      })
      .catch((err) => {
        console.error('Error loading application:', err);
        if (cancelled) return;
        notify(COMMON_TOASTS.loadFailed('Application'));
        setForm(fromRow(item));
      })
      .finally(() => { if (!cancelled) setLoadingRecord(false); });
    return () => { cancelled = true; };
  }, [isEdit, editId]); // eslint-disable-line

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Changing the status clears the fields that belong to the other statuses
  const onStatusChange = (e) => {
    const status = e.target.value;
    setForm((f) => ({
      ...f,
      status,
      approvalDate: status === APPROVED ? f.approvalDate : '',
      rejectionDate: status === REJECTED ? f.rejectionDate : '',
      rejectionRemarks: status === REJECTED ? f.rejectionRemarks : '',
    }));
  };

  const contractDateFy = fyOf(form.contractDate);
  const expDateOfDeliveryFy = fyOf(form.expDateOfDelivery);
  const applicationDateFy = fyOf(form.applicationDate);

  const checkAppNo = async () => {
    const no = form.applicationNumber.trim();
    if (!no || isEdit) return; // the number is not changed while editing
    try {
      const res = await checkKpi2_2_Data(no);
      setAppNoTaken(res.status === 205); // 205 = number already exists
    } catch (err) {
      console.error('Application number check failed:', err);
    }
  };

  const validate = () => {
    const required = [
      ['applicationNumber', 'Application Number'],
      ['shipyardName', 'Shipyard Name'],
      ['noOfVessels', 'No. of Vessels'],
      ['contractualValue', 'Contractual Value (INR)'],
      ['contractDate', 'Contract date'],
      ['applicablicFinAssistance', 'Applicable Rate of Financial Assistance (%)'],
      ['estFinAssistance', 'Estimated Financial Assistance (Rs. Cr.)'],
      ['expDateOfDelivery', 'Expected Date of Delivery'],
      ['applicationDate', 'Application Date'],
      ['status', 'Status'],
    ];
    if (form.status === APPROVED) required.push(['approvalDate', 'Approval Date']);
    if (form.status === REJECTED) {
      required.push(['rejectionDate', 'Rejection Date'], ['rejectionRemarks', 'Remarks for rejection']);
    }

    const missing = required.find(([k]) => !String(form[k]).trim());
    if (missing) return `${missing[1]} is required`;

    const numeric = ['noOfVessels', 'contractualValue', 'applicablicFinAssistance', 'estFinAssistance'];
    if (numeric.some((k) => Number(form[k]) < 0)) return 'Numbers cannot be negative';

    if (appNoTaken && !isEdit) return 'This application number already exists.';
    return null;
  };

  const handleSubmit = async (e) => {
    
    e.preventDefault();
    if (saving) return;

    const problem = validate();
    if (problem) {
      notify({ type: 'error', message: problem });
      return;
    }

    // Same keys the earlier portal posted; empty optional values go as null
    const orNull = (v) => (String(v).trim() === '' ? null : v);
    const payload = {
      applicationNumber: form.applicationNumber.trim(),
      shipyardName: form.shipyardName,
      noOfVessels: Number(form.noOfVessels),
      contractualValue: Number(form.contractualValue),
      contractDate: form.contractDate,
      contractDateFy,
      applicablicFinAssistance: Number(form.applicablicFinAssistance),
      estFinAssistance: Number(form.estFinAssistance),
      expDateOfDelivery: form.expDateOfDelivery,
      expDateOfDeliveryFy,
      applicationDate: form.applicationDate,
      applicationDateFy,
      status: form.status,
      approvalDate: orNull(form.approvalDate),
      rejectionDate: orNull(form.rejectionDate),
      rejectionRemarks: orNull(form.rejectionRemarks),
      generalRemarks: orNull(form.generalRemarks),
    };

    setSaving(true);
    try {
      if (isEdit) {
        const body = {
            ...payload,
            id: editId,
            // snake_case copies, in case the edit controller reads those names
            approval_date: payload.approvalDate,
            rejection_date: payload.rejectionDate,
            rejection_remarks: payload.rejectionRemarks,
            general_remarks: payload.generalRemarks,
        };
        console.log('edit-2-2 payload:', body); // check this in the Network tab, then remove
        const res = await updateKpi2_2_1(body);
        if (res.status === 200 || res.status === 201) {
          notify(DGS_TOASTS.updated('In-Principle Approval Application'));
          navigate('/kpi/dgs/data-list/sbfap-inprincipal-approval');
        } else {
          notify(DGS_TOASTS.saveFailed(true, 'Unexpected response from server'));
        }
      } else {
        const res = await createKpi2_2_1(payload);
        if (res.status === 200 || res.status === 201) {
          notify(DGS_TOASTS.added('In-Principle Approval Application'));
          setForm(EMPTY);
          setAppNoTaken(false);
        } else {
          notify(DGS_TOASTS.saveFailed(false, 'Unexpected response from server'));
        }
      }
    } catch (err) {
      console.error('Error saving application:', err);
      notify(DGS_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit ? !canEdit : !canAdd) return null; // outer wrapper handles RestrictedAccess

  if (loadingRecord) {
    return <div className="module-card text-sm text-slate-500">Loading application…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="module-card space-y-5">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
        {isEdit ? 'Edit In-Principal Approval Application' : 'Add In-Principal Approval Application'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Application Number" required>
          <input
            type="text"
            className={inputCls}
            value={form.applicationNumber}
            onChange={(e) => { setAppNoTaken(false); set('applicationNumber')(e); }}
            onBlur={checkAppNo}
            maxLength={100}
            disabled={saving || isEdit}
          />
          {appNoTaken && <p className="text-xs text-red-600 mt-1">This application number already exists.</p>}
        </Field>

        <Field label="Shipyard Name" required>
          <select className={inputCls} value={form.shipyardName} onChange={set('shipyardName')} disabled={saving}>
            <option value="">--Select Shipyard Name--</option>
            {shipyards.map((s) => (
              <option key={s.shipyard_id} value={s.shipyard_name}>{s.shipyard_name}</option>
            ))}
          </select>
        </Field>

        <Field label="No. of Vessels" required>
          <input type="number" min="0" step="1" className={inputCls} value={form.noOfVessels} onChange={set('noOfVessels')} disabled={saving} />
        </Field>

        <Field label="Contractual Value (INR)" required>
          <input type="number" min="0" step="any" className={inputCls} value={form.contractualValue} onChange={set('contractualValue')} disabled={saving} />
        </Field>

        <Field label="Contract date" required>
          <input type="date" className={inputCls} value={form.contractDate} onChange={set('contractDate')} disabled={saving} />
        </Field>

        <Field label="Contract date FY" required>
          <input type="text" className={inputCls} value={contractDateFy} placeholder="Financial Year" readOnly disabled />
        </Field>

        <Field label="Applicable Rate of Financial Assistance (%)" required>
          <input type="number" min="0" step="any" className={inputCls} value={form.applicablicFinAssistance} onChange={set('applicablicFinAssistance')} disabled={saving} />
        </Field>

        <Field label="Estimated Financial Assistance (Rs. Cr.)" required>
          <input type="number" min="0" step="any" className={inputCls} value={form.estFinAssistance} onChange={set('estFinAssistance')} disabled={saving} />
        </Field>

        <Field label="Expected Date of Delivery" required>
          <input type="date" className={inputCls} value={form.expDateOfDelivery} onChange={set('expDateOfDelivery')} disabled={saving} />
        </Field>

        <Field label="Expected Date of Delivery FY" required>
          <input type="text" className={inputCls} value={expDateOfDeliveryFy} placeholder="Financial Year" readOnly disabled />
        </Field>

        <Field label="Application Date" required>
          <input type="date" className={inputCls} value={form.applicationDate} onChange={set('applicationDate')} disabled={saving} />
        </Field>

        <Field label="Application Date FY" required>
          <input type="text" className={inputCls} value={applicationDateFy} placeholder="Financial Year" readOnly disabled />
        </Field>

        <Field label="Status" required>
          <select className={inputCls} value={form.status} onChange={onStatusChange} disabled={saving}>
            <option value="">--Select Status--</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        {form.status === APPROVED && (
          <Field label="Approval Date" required>
            <input type="date" className={inputCls} value={form.approvalDate} onChange={set('approvalDate')} disabled={saving} />
          </Field>
        )}

        {form.status === REJECTED && (
          <>
            <Field label="Rejection Date" required>
              <input type="date" className={inputCls} value={form.rejectionDate} onChange={set('rejectionDate')} disabled={saving} />
            </Field>
            <Field label="Remarks for rejection" required>
              <input type="text" className={inputCls} value={form.rejectionRemarks} onChange={set('rejectionRemarks')} maxLength={500} disabled={saving} />
            </Field>
          </>
        )}

        <div className="md:col-span-2">
          <Field label="General Remarks">
            <input type="text" className={inputCls} value={form.generalRemarks} onChange={set('generalRemarks')} maxLength={500} disabled={saving} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => (isEdit ? navigate('/kpi/dgs/data-list/sbfap-inprincipal-approval') : (setForm(EMPTY), setAppNoTaken(false)))}
          disabled={saving}
          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 transition cursor-pointer"
        >
          {isEdit ? 'Cancel' : 'Reset'}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-xs font-bold text-white bg-[#0f417a] rounded hover:bg-[#1d5594] transition cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Submit'}
        </button>
      </div>
    </form>
  );
}