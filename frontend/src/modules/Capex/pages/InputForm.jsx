import { useEffect, useState } from 'react';
import { calculateCapexTotal } from '../utils/capexUtils';

const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed';
const selectClass = `${inputClass} cursor-pointer dark:[color-scheme:dark]`;
const sectionCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40';

export default function CapexInputForm({
  organisations = [],
  onSubmit,
  onSuccess,
  onBack,
  notify,
}) {
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [organisationId, setOrganisationId] = useState('');
  const [gbsValue, setGbsValue] = useState('');
  const [iebrValue, setIebrValue] = useState('');
  const [pppValue, setPppValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalValue = calculateCapexTotal(gbsValue, iebrValue, pppValue);

  useEffect(() => {
    if (organisations.length > 0 && !organisationId) {
      setOrganisationId(String(organisations[0].organisation_id || organisations[0].id || ''));
    }
  }, [organisations, organisationId]);

  const resetForm = () => {
    setFinancialYear('2026-2027');
    setGbsValue('');
    setIebrValue('');
    setPppValue('');
    if (organisations.length > 0) {
      setOrganisationId(String(organisations[0].organisation_id || organisations[0].id || ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!financialYear) {
      notify?.('Please select financial year.', 'error');
      return;
    }
    if (!organisationId) {
      notify?.('Please select organisation.', 'error');
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
        financialYear,
        organisationId,
        gbsValue: parseFloat(gbsValue) || 0,
        iebrValue: parseFloat(iebrValue) || 0,
        PPPValue: parseFloat(pppValue) || 0,
        totalValue,
      });
      resetForm();
      notify?.('Capex target submitted successfully.', 'success');
      onSuccess?.();
    } catch (err) {
      notify?.(err.message || 'Failed to submit Capex target data.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in w-full">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            Add Capex Target
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
                <label className={labelClass}>
                  Financial Year<span className="text-red-500">*</span>
                </label>
                <select
                  className={selectClass}
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                >
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  Organisation<span className="text-red-500">*</span>
                </label>
                <select
                  className={selectClass}
                  value={organisationId}
                  onChange={(e) => setOrganisationId(e.target.value)}
                >
                  <option value="">Select Organisation</option>
                  {organisations.map((org) => (
                    <option
                      key={org.organisation_id || org.id}
                      value={org.organisation_id || org.id}
                    >
                      {org.organisation_name || org.name}
                    </option>
                  ))}
                </select>
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
            {submitting ? 'Saving...' : 'Save Capex Target'}
          </button>
        </div>
      </form>
    </div>
  );
}
