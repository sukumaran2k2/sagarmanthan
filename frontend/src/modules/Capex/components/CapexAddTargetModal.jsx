import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, DollarSign, Building2 } from "lucide-react";
import { calculateCapexTotal } from "../utils/capexUtils";

export default function CapexAddTargetModal({ isOpen, onClose, onSubmit, organisations = [], existingData = [] }) {
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setErrorMsg("");
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

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

    // Check for duplicate entry for same organisation and financial year
    const isDuplicate = existingData.some((item) => {
      const itemFY = String(item.capex_financial_year || item.financial_year || item.financialYear || "").trim();
      const itemOrgID = String(item.capex_organisation_id || item.organisation_id || item.organisationId || "").trim();
      return itemFY === String(financialYear).trim() && itemOrgID === String(organisationId).trim();
    });

    if (isDuplicate) {
      const selectedOrg = organisations.find(
        (o) => String(o.organisation_id || o.id) === String(organisationId)
      );
      const orgName = selectedOrg ? selectedOrg.organisation_name || selectedOrg.name : "selected organisation";
      setErrorMsg(`⚠️ Target entry for "${orgName}" in financial year ${financialYear} already exists! Duplicate entries are not allowed.`);
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl mx-auto my-auto overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
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
                Annual budget allocation entry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition cursor-pointer text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Financial Year <span className="text-red-500">*</span>
              </label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Organisation <span className="text-red-500">*</span>
              </label>
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {organisations.map((org) => (
                  <option key={org.organisation_id || org.id} value={org.organisation_id || org.id}>
                    {org.organisation_name || org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                GBS Target (In Crore) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={gbsValue}
                onChange={(e) => setGbsValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                IR / IEBR Target (In Crore) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={iebrValue}
                onChange={(e) => setIebrValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                PPP Target (In Crore) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={pppValue}
                onChange={(e) => setPppValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Total Planned Target:
              </span>
              <span className="text-xs text-blue-600 font-medium">Sum of GBS + IR/IEBR + PPP</span>
            </div>
            <span className="text-lg font-black text-[#0f417a]">
              ₹{totalValue.toFixed(2)} Cr
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#0f417a] hover:bg-[#0b3260] text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
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
    </div>,
    document.body
  );
}
