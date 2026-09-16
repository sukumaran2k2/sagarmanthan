import { useEffect, useState } from 'react';
import { calculateCapexTotal } from '../utils/capexUtils';

const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed';
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
    setPppValue(
      record.capex_ppp_value !== undefined && record.capex_ppp_value !== null
        ? String(record.capex_ppp_value)
        : ''
    );
  }, [record]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!record?.capex_id) {
      notify?.('No Capex record selected for update.', 'error');
      return;
    }
    if (gbsValue === '' || parseFloat(gbsValue) < 0) {
      notify?.('Please enter valid non-negative GBS value.', 'error');
      return;
    }
    if (iebrValue === '' || parseFloat(iebrValue) < 0) {
      notify?.('Please enter valid non-negative IR / IEBR value.', 'error');
      return;
    }
    if (pppValue === '' || parseFloat(pppValue) < 0) {
      notify?.('Please enter valid non-negative PPP value.', 'error');
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
      notify?.('Capex target updated successfully.', 'success');
      onSuccess?.();
    } catch (err) {
      notify?.(err.message || 'Failed to update Capex target data.', 'error');
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in w-full">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            Update Capex Target
          </h3>
          <p className="text-[10px] text-[#eadede] font-semibold tracking-wide mt-0.5">
            Ministry of Ports, Shipping and Waterways
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className={sectionCardClass}>
            <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
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
            <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
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
