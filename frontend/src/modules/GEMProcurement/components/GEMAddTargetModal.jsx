import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, Plus } from "lucide-react";

export default function GEMAddTargetModal({ isOpen, onClose, onSubmit, organisations = [], categoryTitle = "Goods", existingData = [] }) {
  const [financialYear, setFinancialYear] = useState("2026-2027");
  const [organisationId, setOrganisationId] = useState("");
  const [plannedPotential, setPlannedPotential] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFinancialYear("2026-2027");
      if (organisations.length > 0) {
        setOrganisationId(String(organisations[0].organisation_id || organisations[0].id || "1"));
      }
      setPlannedPotential("");
      setErrorText("");
    }
  }, [isOpen, organisations]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!financialYear || !organisationId || plannedPotential === "") {
      setErrorText("⚠️ Please fill in all mandatory fields.");
      return;
    }

    // Check for duplicate entry for same organisation and financial year
    const isDuplicate = existingData.some((item) => {
      const itemFY = String(item.common_financial_year || item.financial_year || item.goods_financial_year || item.service_financial_year || item.works_financial_year || "").trim();
      const itemOrgID = String(item.common_organisation_id || item.organisation_id || item.goods_organisation_id || item.service_organisation_id || item.works_organisation_id || "").trim();
      return itemFY === String(financialYear).trim() && itemOrgID === String(organisationId).trim();
    });

    if (isDuplicate) {
      const selectedOrg = organisations.find(
        (o) => String(o.organisation_id || o.id) === String(organisationId)
      );
      const orgName = selectedOrg ? selectedOrg.organisation_name || selectedOrg.name : "selected organisation";
      setErrorText(`⚠️ GeM ${categoryTitle} target for "${orgName}" in financial year ${financialYear} already exists! Duplicate entries are not allowed.`);
      return;
    }

    onSubmit({
      financialYear,
      organisationId,
      plannedPotential: Number(plannedPotential),
    });
    onClose();
  };

  const calculatedTarget = plannedPotential ? ((Number(plannedPotential) / 12) * 8).toFixed(3) : "0.000";

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full mx-auto my-auto overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5fa7] p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Plus size={20} className="text-blue-300" />
            <h3 className="text-base font-black tracking-wide uppercase font-display">
              Add {categoryTitle} Target Allocation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition cursor-pointer text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left overflow-y-auto flex-1">
          {errorText && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              {errorText}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Financial Year */}
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

            {/* Organisation */}
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

          {/* Planned Procurement Potential */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              {categoryTitle} - Planned Total Procurement (In Crore) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 50.00"
              value={plannedPotential}
              onChange={(e) => setPlannedPotential(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Auto Calculated 5-Months Target preview */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Calculated Proportional Target (8 Months):
              </span>
              <span className="text-xs text-blue-600 font-medium">
                Auto-calculated formula: (Planned Total / 12) × 5
              </span>
            </div>
            <span className="text-lg font-black text-[#0f417a]">
              ₹{calculatedTarget} Cr
            </span>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0f417a] hover:bg-[#0b3260] text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle size={15} />
                <span>Submit Target</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
