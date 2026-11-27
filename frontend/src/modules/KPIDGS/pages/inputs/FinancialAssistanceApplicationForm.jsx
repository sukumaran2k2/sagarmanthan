import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKPIDGSPermissions } from '../../hooks/useKPIDGSPermissions';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGS_TOASTS } from '../../toastMessages';
import {
  fetchShipyardList,
  checkKpi2_2_Fa_Data,
  createKpi2_2_Fa,
  updateKpi2_2_Fa,
  getUpdateMmd_2_2Fa_Data,
} from '../../api';

// K-2.2.B  Financial Assistance Application (slug: sbfap-financial-assistance)
// Add mode: opened from the Input Form list.
// Edit mode: opened from the Data List edit icon (row arrives in route state as `item`).

const LIST_PATH = '/kpi/dgs/data-list/sbfap-financial-assistance';

const PENDING = 'Pending Fund Release';
const APPROVED = 'Approved Fund Release';
const REJECTED = 'Rejected Fund Release';

const STATUS_OPTIONS = [PENDING, APPROVED, REJECTED];

// Financial year (Apr-Mar): 2026-11-01 -> "2026-2027"
const fyOf = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${start + 1}`;
};

const EMPTY = {
  fundApplicationNumber: '',
  shipyardName: '',
  fundApplicationDate: '',
  actualDeliveryDate: '',
  actualContractPrice: '',
  noOfVessels: '',
  grossTonnage: '',
  status: '',
  // Approved Fund Release
  amountApprovedForRelease: '',
  approvalDate: '',
  amountReleased90: '',
  releaseDate90: '',
  amountReleased10: '',
  releaseDate10: '',
  // Rejected Fund Release
  rejectedDate: '',
  remarksForRejection: '',
};

const pick = (row, ...keys) => {
  for (const k of keys) if (row?.[k] != null) return row[k];
  return '';
};
const dateOnly = (v) => (v ? String(v).slice(0, 10) : ''); // 2017-02-12T00:00:00.000Z -> 2017-02-12

// Maps whatever the backend sends onto the three exact option labels
const normalizeStatus = (s) => {
  const v = String(s ?? '').toLowerCase();
  if (v.includes('approv')) return APPROVED;
  if (v.includes('reject')) return REJECTED;
  if (v.includes('pend')) return PENDING;
  return s ?? '';
};

// Backend record (DB column names) -> form values
const fromRow = (r) => ({
  fundApplicationNumber: String(pick(r, 'fund_application_no', 'fund_application_number', 'fundApplicationNumber')),
  shipyardName: pick(r, 'shipyard_name', 'shipyardName'),
  fundApplicationDate: dateOnly(pick(r, 'fund_application_date', 'fundApplicationDate')),
  actualDeliveryDate: dateOnly(pick(r, 'actual_delivery_date', 'actualDeliveryDate')),
  actualContractPrice: pick(r, 'actual_contract_price', 'actualContractPrice'),
  noOfVessels: pick(r, 'no_of_vessels', 'noOfVessels'),
  grossTonnage: pick(r, 'gross_tonnage', 'grossTonnage'),
  status: normalizeStatus(pick(r, 'status')),
  amountApprovedForRelease: pick(r, 'amount_approved_for_release', 'amountApprovedForRelease'),
  approvalDate: dateOnly(pick(r, 'approval_date', 'approvalDate')),
  amountReleased90: pick(r, 'amount_released_90', 'amountReleased90'),
  releaseDate90: dateOnly(pick(r, 'release_date_90', 'releaseDate90')),
  amountReleased10: pick(r, 'amount_released_10', 'amountReleased10'),
  releaseDate10: dateOnly(pick(r, 'release_date_10', 'releaseDate10')),
  rejectedDate: dateOnly(pick(r, 'rejected_date', 'rejectedDate')),
  remarksForRejection: pick(r, 'remarks_for_rejection', 'remarks_for_rejections', 'remarksForRejection'),
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

export default function FinancialAssistanceApplicationForm({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const navigate = useNavigate();
  const { canAdd, canEdit } = useKPIDGSPermissions();

  const item = useLocation().state?.item || null; // set by the Data List edit icon
  const isEdit = !!item;
  const fundAppId = item
    ? (item.S_NO ?? item.s_no ?? item.sr_no ?? item.fund_app_id ?? item.fundAppId ?? item.id)
    : null;

  const [form, setForm] = useState(EMPTY);
  const [loadingRecord, setLoadingRecord] = useState(isEdit);
  const [shipyards, setShipyards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [appNoTaken, setAppNoTaken] = useState(false);
  const [statusLocked, setStatusLocked] = useState(false); // true when the saved record is already Approved

  // Shipyard dropdown
  useEffect(() => {
    fetchShipyardList()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
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
    console.log('FA item:', item, 'fundAppId:', fundAppId); // remove once confirmed
    getUpdateMmd_2_2Fa_Data(fundAppId)
      .then((res) => {
        if (cancelled) return;
        const record = unwrap(res);
        console.log('edit-2-2-fa record:', record); // remove once confirmed
        const loaded = fromRow(record || item);
        setForm(loaded);
        setStatusLocked(loaded.status === APPROVED);
      })
      .catch((err) => {
        console.error('Error loading FA application:', err);
        if (cancelled) return;
        notify(COMMON_TOASTS.loadFailed('Fund application'));
        const loaded = fromRow(item);
        setForm(loaded);
        setStatusLocked(loaded.status === APPROVED);
      })
      .finally(() => { if (!cancelled) setLoadingRecord(false); });
    return () => { cancelled = true; };
  }, [isEdit, fundAppId]); // eslint-disable-line

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Changing the status clears the fields that belong to the other statuses
  const onStatusChange = (e) => {
    if (statusLocked) return;
    const status = e.target.value;
    setForm((f) => ({
      ...f,
      status,
      ...(status === APPROVED ? {} : {
        amountApprovedForRelease: '', approvalDate: '',
        amountReleased90: '', releaseDate90: '',
        amountReleased10: '', releaseDate10: '',
      }),
      ...(status === REJECTED ? {} : { rejectedDate: '', remarksForRejection: '' }),
    }));
  };

  const fundApplicationFY = fyOf(form.fundApplicationDate);
  const actualDeliveryFY = fyOf(form.actualDeliveryDate);
  const approvalDateFY = fyOf(form.approvalDate);
  const releaseDate90FY = fyOf(form.releaseDate90);
  const releaseDate10FY = fyOf(form.releaseDate10);

  // Returns true when the number already exists (205). Skipped in edit mode (number is locked).
  const checkAppNo = async () => {
    const no = form.fundApplicationNumber.trim();
    if (!no || isEdit) return false;
    try {
      const res = await checkKpi2_2_Fa_Data(no);
      const taken = res.status === 205; // 205 = already exists, 201 = free
      setAppNoTaken(taken);
      if (taken) notify({ type: 'error', message: 'This application number already exists.' });
      return taken;
    } catch (err) {
      console.error('Fund application number check failed:', err);
      return false;
    }
  };

  const validate = () => {
    const required = [
      ['fundApplicationNumber', 'Fund Application Number'],
      ['shipyardName', 'Shipyard Name'],
      ['fundApplicationDate', 'Fund Application Date'],
      ['actualDeliveryDate', 'Actual Delivery Date'],
      ['actualContractPrice', 'Actual Contract Price'],
      ['noOfVessels', 'No. of Vessels'],
      ['grossTonnage', 'Gross Tonnage'],
      ['status', 'Status'],
    ];
    if (form.status === APPROVED) {
      required.push(['amountApprovedForRelease', 'Amount approved for release'], ['approvalDate', 'Approval Date']);
    }
    if (form.status === REJECTED) {
      required.push(['rejectedDate', 'Rejected Date'], ['remarksForRejection', 'Remarks for rejection']);
    }
    const missing = required.find(([k]) => !String(form[k]).trim());
    if (missing) return `${missing[1]} is required`;

    const numeric = ['actualContractPrice', 'noOfVessels', 'grossTonnage',
      'amountApprovedForRelease', 'amountReleased90', 'amountReleased10'];
    if (numeric.some((k) => form[k] !== '' && Number(form[k]) < 0)) return 'Numbers cannot be negative';

    if (appNoTaken && !isEdit) return 'Fund Application Number already exists';
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
    if (await checkAppNo()) return; // number already used: stop before saving

    const orNull = (v) => (String(v).trim() === '' ? null : v);
    const numOrNull = (v) => (String(v).trim() === '' ? null : Number(v));

    const amountApproved = numOrNull(form.amountApprovedForRelease);
    const amount90 = numOrNull(form.amountReleased90);
    const amount10 = numOrNull(form.amountReleased10);
    const remarks = orNull(form.remarksForRejection);

    const payload = {
      fundApplicationNumber: form.fundApplicationNumber.trim(),
      shipyardName: form.shipyardName,
      fundApplicationDate: form.fundApplicationDate,
      fundApplicationDateFy: fundApplicationFY,
      actualDeliveryDate: form.actualDeliveryDate,
      actualDeliveryDateFy: actualDeliveryFY,
      actualContractPrice: Number(form.actualContractPrice),
      noOfVessels: Number(form.noOfVessels),
      grossTonnage: Number(form.grossTonnage),
      status: form.status,
      // Approved Fund Release
      amountApprovedForRelease: amountApproved,
      approvalDate: orNull(form.approvalDate),
      approvalDateFy: orNull(approvalDateFY),
      amountReleased90: amount90,
      releaseDate90: orNull(form.releaseDate90),
      releaseDate90Fy: orNull(releaseDate90FY),
      amountReleased10: amount10,
      releaseDate10: orNull(form.releaseDate10),
      releaseDate10Fy: orNull(releaseDate10FY),
      // Rejected Fund Release
      rejectedDate: orNull(form.rejectedDate),
      remarksForRejection: remarks,
      // Older key names the current controllers read. Remove once the backend reads the names above.
      amntApprovedForRelease: amountApproved,
      amntRelease90: amount90,
      amntRelease10: amount10,
      rejectionRemarks: remarks,
    };

    setSaving(true);
    try {
      if (isEdit) {
        const res = await updateKpi2_2_Fa(payload);
        if (res.status === 200 || res.status === 201) {
          notify(DGS_TOASTS.updated('Financial Assistance Application'));
          navigate(LIST_PATH);
        } else {
          notify(DGS_TOASTS.saveFailed(true, 'Unexpected response from server'));
        }
      } else {
        const res = await createKpi2_2_Fa(payload);
        if (res.status === 200 || res.status === 201) {
          notify(DGS_TOASTS.added('Financial Assistance Application'));
          setForm(EMPTY);
          setAppNoTaken(false);
          navigate(LIST_PATH);
        } else {
          notify(DGS_TOASTS.saveFailed(false, 'Unexpected response from server'));
        }
      }
    } catch (err) {
      console.error('Error saving financial assistance application:', err);
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
        {isEdit ? 'Edit Financial Assistance Application' : 'Add Financial Assistance Application'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Fund Application Number" required>
          <input
            type="text"
            className={inputCls}
            value={form.fundApplicationNumber}
            onChange={(e) => { setAppNoTaken(false); set('fundApplicationNumber')(e); }}
            onBlur={checkAppNo}
            maxLength={50}
            disabled={saving || isEdit}
          />
          {appNoTaken && <p className="text-xs text-red-600 mt-1">This fund application number already exists.</p>}
        </Field>

        <Field label="Shipyard Name" required>
          <select className={inputCls} value={form.shipyardName} onChange={set('shipyardName')} disabled={saving}>
            <option value="">--Select Shipyard Name--</option>
            {shipyards.map((s) => (
              <option key={s.shipyard_id} value={s.shipyard_name}>{s.shipyard_name}</option>
            ))}
          </select>
        </Field>

        <Field label="Fund Application Date" required>
          <input type="date" className={inputCls} value={form.fundApplicationDate} onChange={set('fundApplicationDate')} disabled={saving} />
        </Field>

        <Field label="Fund Application Date FY" required>
          <input type="text" className={inputCls} value={fundApplicationFY} placeholder="Financial Year" readOnly disabled />
        </Field>

        <Field label="Actual Delivery Date" required>
          <input type="date" className={inputCls} value={form.actualDeliveryDate} onChange={set('actualDeliveryDate')} disabled={saving} />
        </Field>

        <Field label="Actual Delivery Date FY" required>
          <input type="text" className={inputCls} value={actualDeliveryFY} placeholder="Financial Year" readOnly disabled />
        </Field>

        <Field label="Actual Contract Price" required>
          <input type="number" min="0" step="any" className={inputCls} value={form.actualContractPrice} onChange={set('actualContractPrice')} disabled={saving} />
        </Field>

        <Field label="No. of Vessels" required>
          <input type="number" min="1" step="1" className={inputCls} value={form.noOfVessels} onChange={set('noOfVessels')} disabled={saving} />
        </Field>

        <Field label="Gross Tonnage" required>
          <input type="number" min="0" step="any" className={inputCls} value={form.grossTonnage} onChange={set('grossTonnage')} disabled={saving} />
        </Field>

        <Field label="Status" required>
          <select
            className={inputCls}
            value={form.status}
            onChange={onStatusChange}
            disabled={saving || statusLocked}
          >
            <option value="">--Select Status--</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Approved Fund Release */}
      {form.status === APPROVED && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Amount approved for release" required>
            <input type="number" min="0" step="any" className={inputCls} value={form.amountApprovedForRelease} onChange={set('amountApprovedForRelease')} disabled={saving} />
          </Field>
          <Field label="Approval Date" required>
            <input type="date" className={inputCls} value={form.approvalDate} onChange={set('approvalDate')} disabled={saving} />
          </Field>
          <Field label="Approval Date FY" required>
            <input type="text" className={inputCls} value={approvalDateFY} placeholder="Financial Year" readOnly disabled />
          </Field>

          <Field label="Amount Released - 90">
            <input type="number" min="0" step="any" className={inputCls} value={form.amountReleased90} onChange={set('amountReleased90')} disabled={saving} />
          </Field>
          <Field label="Release Date - 90">
            <input type="date" className={inputCls} value={form.releaseDate90} onChange={set('releaseDate90')} disabled={saving} />
          </Field>
          <Field label="Release Date - 90 FY">
            <input type="text" className={inputCls} value={releaseDate90FY} placeholder="Financial Year" readOnly disabled />
          </Field>

          <Field label="Amount Released - 10">
            <input type="number" min="0" step="any" className={inputCls} value={form.amountReleased10} onChange={set('amountReleased10')} disabled={saving} />
          </Field>
          <Field label="Release Date - 10">
            <input type="date" className={inputCls} value={form.releaseDate10} onChange={set('releaseDate10')} disabled={saving} />
          </Field>
          <Field label="Release Date - 10 FY">
            <input type="text" className={inputCls} value={releaseDate10FY} placeholder="Financial Year" readOnly disabled />
          </Field>
        </div>
      )}

      {/* Rejected Fund Release */}
      {form.status === REJECTED && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Rejected Date" required>
            <input type="date" className={inputCls} value={form.rejectedDate} onChange={set('rejectedDate')} disabled={saving} />
          </Field>
          <Field label="Remarks for rejection" required>
            <input type="text" className={inputCls} value={form.remarksForRejection} onChange={set('remarksForRejection')} maxLength={500} disabled={saving} />
          </Field>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => (isEdit ? navigate(LIST_PATH) : (setForm(EMPTY), setAppNoTaken(false)))}
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