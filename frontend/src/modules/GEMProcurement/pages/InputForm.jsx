import { useState } from 'react';
import {
  GEM_FY_OPTIONS,
  getElapsedFinancialMonths,
  proportionalTarget,
} from '../utils/gemUtils';

const labelClass =
  'block text-[11px] font-bold text-slate-700 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed';
const selectClass = `${inputClass} cursor-pointer`;
const sectionCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm';

export default function GEMInputForm({
  organisations = [],
  categoryTitle = 'Goods',
  existingData = [],
  onSubmit,
  onSuccess,
  onBack,
  notify,
}) {
  const [financialYear, setFinancialYear] = useState(GEM_FY_OPTIONS[0]);
  const [organisationId, setOrganisationId] = useState('');
  const [plannedPotential, setPlannedPotential] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const elapsedMonths = getElapsedFinancialMonths();
  const targetValue = proportionalTarget(plannedPotential, elapsedMonths);

  const resetForm = () => {
    setFinancialYear(GEM_FY_OPTIONS[0]);
    setOrganisationId('');
    setPlannedPotential('');
  };

  const isDuplicate = () =>
    existingData.some((item) => {
      const itemFY = String(
        item.common_financial_year ||
          item.financial_year ||
          item.goods_financial_year ||
          item.service_financial_year ||
          item.works_financial_year ||
          ''
      ).trim();
      const itemOrgId = String(
        item.common_organisation_id ||
          item.organisation_id ||
          item.goods_organisation_id ||
          item.service_organisation_id ||
          item.works_organisation_id ||
          ''
      ).trim();
      return (
        itemFY === String(financialYear).trim() &&
        itemOrgId === String(organisationId).trim()
      );
    });

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
    if (plannedPotential === '' || parseFloat(plannedPotential) < 0) {
      notify?.('Please enter a valid non-negative planned procurement value.', 'error');
      return;
    }
    if (isDuplicate()) {
      const org = organisations.find(
        (o) => String(o.organisation_id || o.id) === String(organisationId)
      );
      const orgName = org?.organisation_name || org?.name || 'selected organisation';
      notify?.(
        `A ${categoryTitle} target for "${orgName}" already exists for ${financialYear}.`,
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        financialYear,
        organisationId,
        plannedPotential: parseFloat(plannedPotential) || 0,
      });
      resetForm();
      notify?.(`${categoryTitle} planned procurement added successfully.`, 'success');
      onSuccess?.();
    } catch (err) {
      notify?.(err.message || 'Failed to save planned procurement data.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in w-full text-left">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            Add Planned Procurement
          </h3>
          <p className="text-[10px] text-[#eadede] font-semibold tracking-wide mt-0.5">
            Ministry of Ports, Shipping and Waterways
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className={sectionCardClass}>
            <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">
              Basic Information
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
                  {GEM_FY_OPTIONS.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  Organisation (Actual)<span className="text-red-500">*</span>
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
            <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">
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
              className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
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
            {submitting ? 'Saving...' : 'Save Planned Procurement'}
          </button>
        </div>
      </form>
    </div>
  );
}
