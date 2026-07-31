import React, { useState, useEffect } from "react";
import { X, CheckCircle2, DollarSign, Building2 } from "lucide-react";
import { calculateCapexTotal } from "../utils/capexUtils";

export default function CapexAddTargetModal({ isOpen, onClose, onSubmit, organisations = [] }) {
  const [financialYear, setFinancialYear] = useState("2026-2027");
  const [organisationId, setOrganisationId] = useState("");
  const [gbsValue, setGbsValue] = useState("");
  const [iebrValue, setIebrValue] = useState("");
  const [pppValue, setPppValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalValue = calculateCapexTotal(gbsValue, iebrValue, pppValue);

  useEffect(() => {
    if (organisations.length > 0 && !organisationId) {
      setOrganisationId(organisations[0].organisation_id || organisations[0].id || "");
    }
  }, [organisations]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!financialYear) {
      setErrorMsg("Please select financial year.");
      return;
    }
    if (!organisationId) {
      setErrorMsg("Please select organisation.");
      return;
    }
    if (gbsValue === "" || parseFloat(gbsValue) < 0) {
      setErrorMsg("Please enter valid non-negative GBS value.");
      return;
    }
    if (iebrValue === "" || parseFloat(iebrValue) < 0) {
      setErrorMsg("Please enter valid non-negative IR / IEBR value.");
      return;
    }
    if (pppValue === "" || parseFloat(pppValue) < 0) {
      setErrorMsg("Please enter valid non-negative PPP value.");
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
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit Capex target data.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0f417a] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide uppercase font-display">
                Add New Capex Target
              </h3>
              <p className="text-[11px] text-blue-100 font-medium">
                Set capital expenditure allocations (GBS, IR, PPP) in Cr
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Financial Year */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Financial Year <span className="text-rose-500">*</span>
              </label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer"
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2023-2024">2023-2024</option>
                <option value="2022-2023">2022-2023</option>
              </select>
            </div>

            {/* Organisation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Organisation / Scheme <span className="text-rose-500">*</span>
              </label>
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer"
              >
                <option value="">--Select Organisation--</option>
                {organisations.map((org) => (
                  <option key={org.organisation_id || org.id} value={org.organisation_id || org.id}>
                    {org.organisation_name || org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* GBS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GBS (Gross Budgetary) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={gbsValue}
                onChange={(e) => setGbsValue(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
              />
            </div>

            {/* IR / IEBR */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                IR (Internal Resources) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={iebrValue}
                onChange={(e) => setIebrValue(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
              />
            </div>

            {/* PPP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PPP Allocation <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={pppValue}
                onChange={(e) => setPppValue(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
              />
            </div>
          </div>

          {/* Auto-Calculated Total Card */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between mt-3">
            <div>
              <span className="text-[11px] font-extrabold uppercase text-blue-900 tracking-wide">
                Total Target Allocation (GBS + IR + PPP)
              </span>
              <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                Automatically calculated sum in Crores (₹)
              </p>
            </div>
            <div className="text-base font-black text-[#0f417a]">
              ₹ {totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#0f417a] hover:bg-[#0b3260] text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Submit Capex Target</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
