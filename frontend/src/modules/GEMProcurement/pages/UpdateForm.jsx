import { useEffect, useState } from 'react';
import {
  getGemFinancialYear,
  getGemOrganisationId,
  getGemPotential,
  proportionalTarget,
  getElapsedFinancialMonths,
} from '../utils/gemUtils';
import { getErrorMessage } from '../../../utils/notify';
import { GEM_TOASTS } from '../toastMessages';

const labelClass = 'module-form-label';
const inputClass = 'module-form-input disabled:opacity-60 disabled:cursor-not-allowed';
const sectionCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm';

export default function GEMUpdateForm({
  record = null,
  category = 'goods',
  categoryTitle = 'Goods',
  onSubmit,
  onSuccess,
  onBack,
  notify,
}) {
  const [plannedPotential, setPlannedPotential] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const elapsedMonths = getElapsedFinancialMonths();
  const targetValue = proportionalTarget(plannedPotential, elapsedMonths);

  useEffect(() => {
    if (!record) return;
    const potential = getGemPotential(record, category);
    setPlannedPotential(
      potential === undefined || potential === null ? '' : String(potential)
    );
  }, [record, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (plannedPotential === '' || parseFloat(plannedPotential) < 0) {
      notify?.(GEM_TOASTS.invalidPlannedValue());
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        financialYear: getGemFinancialYear(record),
        organisationId: getGemOrganisationId(record),
        plannedPotential: parseFloat(plannedPotential) || 0,
      });
      notify?.(GEM_TOASTS.targetUpdated(categoryTitle));
      onSuccess?.();
    } catch (err) {
      notify?.(GEM_TOASTS.saveFailed(true, getErrorMessage(err)));
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
    <div className="module-form-card overflow-hidden animate-fade-in w-full text-left">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            Update Target
          </h3>
          <p className="module-form-banner-subtext">
            GeM Procurement — {categoryTitle}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className={sectionCardClass}>
            <h3 className="module-form-section-title border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Basic Information
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Financial Year</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className={inputClass}
                  value={getGemFinancialYear(record) || '—'}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Organisation (Actual)</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className={inputClass}
                  value={record.organisation_name || '—'}
                />
              </div>
            </div>
          </div>

          <div className={sectionCardClass}>
            <h3 className="module-form-section-title border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Planned Procurement (In Crore)
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  {categoryTitle} - Planned Procurement Target
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={inputClass}
                  value={plannedPotential}
                  onChange={(e) => setPlannedPotential(e.target.value)}
                />
              </div>

              <div className="mt-2 p-3.5 rounded-xl border border-blue-100 bg-blue-50/80 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    {elapsedMonths} Months Proportional Target
                  </span>
                  <span className="text-[11px] text-blue-600 font-medium">
                    (Planned Total / 12) × {elapsedMonths}
                  </span>
                </div>
                <span className="text-base font-black text-[#0f417a]">
                  ₹{targetValue.toFixed(2)} Cr
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
          {typeof onBack === 'function' && (
            <button
              type="button"
              onClick={onBack}
              className="px-4.5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
            >
              Discard
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`px-5.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              submitting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-200'
                : 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white shadow-md shadow-blue-900/10 hover:shadow-lg'
            }`}
          >
            {submitting ? 'Updating...' : 'Update Target'}
          </button>
        </div>
      </form>
    </div>
  );
}
