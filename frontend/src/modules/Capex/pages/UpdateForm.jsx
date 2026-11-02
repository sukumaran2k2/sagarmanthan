import { useEffect, useState } from 'react';
import { calculateCapexTotal } from '../utils/capexUtils';
import { getErrorMessage } from '../../../utils/notify';
import { CAPEX_TOASTS } from '../toastMessages';

const labelClass = 'module-form-label';
const inputClass = 'module-form-input disabled:opacity-60 disabled:cursor-not-allowed';
const sectionCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40';

export default function CapexUpdateForm({
  record = null,
  onSubmit,
  onSuccess,
  onBack,
  notify,
}) {
  const [gbsValue, setGbsValue] = useState('');
  const [iebrValue, setIebrValue] = useState('');
  const [pppValue, setPppValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalValue = calculateCapexTotal(gbsValue, iebrValue, pppValue);

  useEffect(() => {
    if (!record) return;
    setGbsValue(
      record.capex_gbs_value !== undefined && record.capex_gbs_value !== null
        ? String(record.capex_gbs_value)
        : ''
    );
    setIebrValue(
      record.capex_iebr_value !== undefined && record.capex_iebr_value !== null
        ? String(record.capex_iebr_value)
        : ''
    );
    // Older records have no PPP target (NULL); treat it as 0 so they can be updated
    setPppValue(
      record.capex_ppp_value !== undefined && record.capex_ppp_value !== null
        ? String(record.capex_ppp_value)
        : '0'
    );
  }, [record]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!record?.capex_id) {
      notify?.(CAPEX_TOASTS.noRecordSelected());
      return;
    }
    if (gbsValue === '' || parseFloat(gbsValue) < 0) {
      notify?.(CAPEX_TOASTS.invalidAmount('GBS'));
      return;
    }
    if (iebrValue === '' || parseFloat(iebrValue) < 0) {
      notify?.(CAPEX_TOASTS.invalidAmount('IR / IEBR'));
      return;
    }
    if (pppValue === '' || parseFloat(pppValue) < 0) {
      notify?.(CAPEX_TOASTS.invalidAmount('PPP'));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ID: record.capex_id,
        gbsValue: parseFloat(gbsValue) || 0,
        iebrValue: parseFloat(iebrValue) || 0,
        pppValue: parseFloat(pppValue) || 0,
        totalValue,
      });
      notify?.(CAPEX_TOASTS.targetUpdated());
      onSuccess?.();
    } catch (err) {
      notify?.(CAPEX_TOASTS.saveFailed(true, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 font-semibold">
        No record selected. Open Update from the Data List.
      </div>
    );
  }

  return (
    <div className="module-form-card overflow-hidden animate-fade-in w-full">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            Update Capex Target
          </h3>
          <p className="module-form-banner-subtext">
            Ministry of Ports, Shipping and Waterways
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className={sectionCardClass}>
            <h3 className="module-form-section-title border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Target Information
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Financial Year</label>
                <input
                  type="text"
                  readOnly
                  className={inputClass}
                  value={record.capex_financial_year || '—'}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Organisation</label>
                <input
                  type="text"
                  readOnly
                  className={inputClass}
                  value={record.organisation_name || '—'}
                />
              </div>
            </div>
          </div>

          <div className={sectionCardClass}>
            <h3 className="module-form-section-title border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Budget Allocation (In Crore)
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  GBS Target<span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={inputClass}
                  value={gbsValue}
                  onChange={(e) => setGbsValue(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  IR / IEBR Target<span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={inputClass}
                  value={iebrValue}
                  onChange={(e) => setIebrValue(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  PPP Target<span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={inputClass}
                  value={pppValue}
                  onChange={(e) => setPppValue(e.target.value)}
                />
              </div>

              <div className="mt-2 p-3.5 rounded-xl border border-blue-100 bg-blue-50/80 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Total Planned Target
                  </span>
                  <span className="text-[11px] text-blue-600 font-medium">
                    GBS + IR/IEBR + PPP
                  </span>
                </div>
                <span className="text-base font-black text-[#0f417a]">
                  ₹{totalValue.toFixed(2)} Cr
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100 dark:border-slate-800">
          {typeof onBack === 'function' && (
            <button
              type="button"
              onClick={onBack}
              className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-800 text-slate-655 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Discard
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`px-5.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              submitting
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                : 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white shadow-md shadow-blue-900/10 hover:shadow-lg'
            }`}
          >
            {submitting ? 'Updating...' : 'Update Capex Target'}
          </button>
        </div>
      </form>
    </div>
  );
}
