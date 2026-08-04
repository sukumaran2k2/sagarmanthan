import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Edit, Info } from "lucide-react";
import { calculateCapexTotal } from "../utils/capexUtils";

export default function CapexEditTargetModal({ isOpen, onClose, onUpdate, initialRecord }) {
  const [gbsValue, setGbsValue] = useState("");
  const [iebrValue, setIebrValue] = useState("");
  const [pppValue, setPppValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialRecord) {
      setGbsValue(initialRecord.capex_gbs_value ?? "");
      setIebrValue(initialRecord.capex_iebr_value ?? "");
      setPppValue(initialRecord.capex_ppp_value ?? "");
    }
  }, [initialRecord]);

  if (!isOpen || !initialRecord) return null;

  const totalValue = calculateCapexTotal(gbsValue, iebrValue, pppValue);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (gbsValue === "" || parseFloat(gbsValue) < 0) {
      setErrorMsg("Please enter a valid non-negative GBS value.");
      return;
    }
    if (iebrValue === "" || parseFloat(iebrValue) < 0) {
      setErrorMsg("Please enter a valid non-negative IR / IEBR value.");
      return;
    }
    if (pppValue === "" || parseFloat(pppValue) < 0) {
      setErrorMsg("Please enter a valid non-negative PPP value.");
      return;
    }

    setSubmitting(true);
    try {
      await onUpdate({
        capexID: initialRecord.capex_id,
        financialYear: initialRecord.capex_financial_year,
        organisationId: initialRecord.capex_organisation_id,
        gbsValue: parseFloat(gbsValue) || 0,
        iebrValue: parseFloat(iebrValue) || 0,
        PPPValue: parseFloat(pppValue) || 0,
        totalValue,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update Capex target allocation.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl mx-auto my-auto overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5fa7] p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <Edit size={20} className="text-blue-300" />
            <div>
              <h3 className="text-base font-black tracking-wide uppercase font-display">
                Update Planned Expense
              </h3>
              <p className="text-xs text-blue-200 font-semibold mt-0.5">
                {initialRecord.organisation_name || "Organisation"} • Financial Year: {initialRecord.capex_financial_year || "2026-2027"}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-shake">
              {errorMsg}
            </div>
          )}

          {/* Form Fields Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-[#0f417a] uppercase tracking-wider">
              Budget Allocation Components (In Crore)
            </h4>

            {/* 2x2 Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GBS */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  GBS <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={gbsValue}
                  onChange={(e) => setGbsValue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* IR */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  IR <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={iebrValue}
                  onChange={(e) => setIebrValue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* PPP */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  PPP <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={pppValue}
                  onChange={(e) => setPppValue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Total(GBS+IR+PPP) - ReadOnly */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Total (GBS + IR + PPP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={totalValue}
                  className="w-full px-4 py-2.5 bg-slate-200/70 border border-slate-300 rounded-xl text-xs font-black text-[#0f417a] outline-none select-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Auto Calculated Total Preview */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Calculated Total Planned Expense:
              </span>
              <span className="text-xs text-blue-600 font-medium">
                Auto-calculated formula: GBS + IR + PPP
              </span>
            </div>
            <span className="text-lg font-black text-[#0f417a]">
              ₹{Number(totalValue).toFixed(2)} Cr
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold italic flex items-center space-x-1">
              <Info size={14} className="text-blue-600 flex-shrink-0" />
              <span>Fields marked with * are mandatory</span>
            </span>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
              >
                <X size={15} />
                <span>Exit</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                <span>{submitting ? "Updating..." : "Update"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
