import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Edit } from "lucide-react";
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
      await onUpdate({
        capexID: initialRecord.capex_id,
        gbsValue: parseFloat(gbsValue) || 0,
        iebrValue: parseFloat(iebrValue) || 0,
        pppValue: parseFloat(pppValue) || 0,
        totalValue,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update Capex target allocation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0f417a] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Edit size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide uppercase font-display">
                Update Planned Expense Target
              </h3>
              <p className="text-[11px] text-blue-100 font-medium">
                {initialRecord.organisation_name || "Organisation"} ({initialRecord.capex_financial_year})
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GBS <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={gbsValue}
                onChange={(e) => setGbsValue(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                IR <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={iebrValue}
                onChange={(e) => setIebrValue(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PPP <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pppValue}
                onChange={(e) => setPppValue(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold uppercase text-blue-900 tracking-wide">
                Updated Total Allocation
              </span>
              <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                (GBS + IR + PPP)
              </p>
            </div>
            <div className="text-base font-black text-[#0f417a]">
              ₹ {totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr
            </div>
          </div>

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
                <span>Updating...</span>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Update Target</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
