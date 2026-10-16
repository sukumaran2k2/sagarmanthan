import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Unlock, X } from 'lucide-react';
import { createTrafficAccessGrant } from '../../../api';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../../utils/notify';
import { TRAFFIC_TOASTS } from '../../../toastMessages';
import { FY_MONTHS, buildFinancialYearOptions, currentFinancialYear } from '../trafficConstants';

const FY_OPTIONS = buildFinancialYearOptions({ back: 3 });

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Toggle chip used for years and months. */
function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
        selected
          ? 'bg-[#0f417a] border-[#0f417a] text-white dark:bg-blue-600 dark:border-blue-600'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

const toggle = (set, value) => (set.includes(value) ? set.filter((v) => v !== value) : [...set, value]);

/**
 * Ministry unlock: lets organisations change traffic for the chosen periods
 * after the monthly entry window has closed.
 */
export default function GrantAccessModal({ organisations = [], onClose, onSaved, triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const [organisationIds, setOrganisationIds] = useState([]);
  const [financialYears, setFinancialYears] = useState([currentFinancialYear()]);
  const [months, setMonths] = useState([]);
  const [expiryDate, setExpiryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, onClose]);

  const allOrgIds = organisations.map((o) => o.organisation_id);
  const allOrgsSelected = organisationIds.length > 0 && organisationIds.length === allOrgIds.length;
  const allMonthsSelected = months.length === FY_MONTHS.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!organisationIds.length) nextErrors.organisations = 'Select at least one organisation';
    if (!financialYears.length) nextErrors.financialYears = 'Select at least one financial year';
    if (!months.length) nextErrors.months = 'Select at least one month';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }

    setSubmitting(true);
    try {
      const res = await createTrafficAccessGrant({
        organisationIds,
        financialYears,
        months: allMonthsSelected ? 'ALL' : months,
        expiryDate: expiryDate || undefined,
        remarks: remarks.trim() || undefined,
      });
      notify(TRAFFIC_TOASTS.accessGranted(res.data?.granted ?? organisationIds.length * financialYears.length));
      onSaved?.();
      onClose();
    } catch (err) {
      notify(TRAFFIC_TOASTS.accessGrantFailed(getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const errorText = (key) => (errors[key]
    ? <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1">{errors[key]}</p>
    : null);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grant-access-title"
        className="module-form-card w-full max-w-2xl shadow-2xl animate-scale-up my-auto"
      >
        <div className="module-form-banner">
          <div>
            <h3 id="grant-access-title" className="module-form-banner-title">Unlock Data Entry</h3>
            <p className="module-form-banner-subtext">Allow organisations to change traffic after the monthly entry window</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="module-form-label">
                Organisations <span className="text-red-500">*</span>
              </span>
              <button
                type="button"
                onClick={() => setOrganisationIds(allOrgsSelected ? [] : allOrgIds)}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {allOrgsSelected ? 'Clear All' : 'Select All'}
              </button>
            </div>
            <div className={`max-h-44 overflow-y-auto rounded-xl border p-2 grid grid-cols-1 sm:grid-cols-2 gap-0.5 ${
              errors.organisations ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
            }`}>
              {organisations.map((org) => (
                <label
                  key={org.organisation_id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={organisationIds.includes(org.organisation_id)}
                    onChange={() => {
                      setOrganisationIds((prev) => toggle(prev, org.organisation_id));
                      setErrors((prev) => ({ ...prev, organisations: undefined }));
                    }}
                    className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="truncate">{org.organisation_name}</span>
                </label>
              ))}
            </div>
            {errorText('organisations')}
          </div>

          <div>
            <span className="module-form-label">
              Financial Years <span className="text-red-500">*</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FY_OPTIONS.map((fy) => (
                <Chip
                  key={fy}
                  selected={financialYears.includes(fy)}
                  onClick={() => {
                    setFinancialYears((prev) => toggle(prev, fy));
                    setErrors((prev) => ({ ...prev, financialYears: undefined }));
                  }}
                >
                  {fy}
                </Chip>
              ))}
            </div>
            {errorText('financialYears')}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="module-form-label">
                Months <span className="text-red-500">*</span>
              </span>
              <button
                type="button"
                onClick={() => setMonths(allMonthsSelected ? [] : FY_MONTHS.map((m) => m.value))}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {allMonthsSelected ? 'Clear All' : 'All Months'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FY_MONTHS.map((m) => (
                <Chip
                  key={m.value}
                  selected={months.includes(m.value)}
                  onClick={() => {
                    setMonths((prev) => toggle(prev, m.value));
                    setErrors((prev) => ({ ...prev, months: undefined }));
                  }}
                >
                  {m.label}
                </Chip>
              ))}
            </div>
            {errorText('months')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="grant-expiry" className="module-form-label">Valid Until</label>
              <input
                id="grant-expiry"
                type="date"
                min={todayIso()}
                className="module-form-input"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <p className="text-[10px] font-semibold text-slate-400 mt-1">Leave blank to keep it open until revoked.</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="grant-remarks" className="module-form-label">Email / Remarks</label>
              <textarea
                id="grant-remarks"
                rows={2}
                maxLength={500}
                className="module-form-input resize-none"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Reference of the request, e.g. email dated 12 Oct"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
              {submitting ? 'Unlocking…' : 'Unlock Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
