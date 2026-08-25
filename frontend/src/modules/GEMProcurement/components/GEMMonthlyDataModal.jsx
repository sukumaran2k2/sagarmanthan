import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save } from "lucide-react";
import { fetchGemMonthlyData, saveGemMonthlyData } from "../api";
import { getGemRecordId, getGemFinancialYear } from "../utils/gemUtils";

const MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March",
];

function normalizeCategory(categoryType) {
  const key = String(categoryType || "goods").toLowerCase();
  if (key.startsWith("service")) return "services";
  if (key.startsWith("work")) return "works";
  return "goods";
}

export default function GEMMonthlyDataModal({
  isOpen,
  onClose,
  record,
  categoryType = "goods",
  showToast,
}) {
  const category = normalizeCategory(categoryType);
  const [activeMonth, setActiveMonth] = useState("April");
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState({});

  useEffect(() => {
    if (!isOpen || !record) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const recordID = getGemRecordId(record, category);
        if (!recordID) {
          if (!cancelled) setMonthlyData({});
          return;
        }
        const res = await fetchGemMonthlyData(category, recordID);
        const fetched = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : {};
        if (!cancelled) setMonthlyData(fetched || {});
      } catch (err) {
        console.warn("Fetch GeM monthly data error:", err.message);
        if (!cancelled) setMonthlyData({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, record, category]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const shortMonth = activeMonth.toLowerCase();
  const monthCap = activeMonth.charAt(0).toUpperCase() + activeMonth.slice(1).toLowerCase();

  const handleInputChange = (fieldSnake, fieldCamel, val) => {
    setMonthlyData((prev) => ({
      ...prev,
      [fieldSnake]: val,
      [fieldCamel]: val,
    }));
  };

  const handleSaveMonth = async () => {
    setLoading(true);
    try {
      const recordID = getGemRecordId(record, category);
      const payload = {};
      for (const m of [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
      ]) {
        const cap = m.charAt(0).toUpperCase() + m.slice(1);
        payload[`procurementThroughGem${cap}`] =
          monthlyData[`procurement_through_gem_${m}`] ??
          monthlyData[`procurementThroughGem${cap}`] ??
          null;
        payload[`procurementOutsideGem${cap}`] =
          monthlyData[`procurement_outside_gem_${m}`] ??
          monthlyData[`procurementOutsideGem${cap}`] ??
          null;
        payload[`reasonForNonProcurement${cap}`] =
          monthlyData[`reason_for_non_procurement_${m}`] ??
          monthlyData[`reasonForNonProcurement${cap}`] ??
          "";
      }

      await saveGemMonthlyData(category, recordID, payload);
      showToast?.(`✅ GeM ${category} expenditure saved for ${activeMonth}!`, "#10B981");
      onClose();
    } catch (err) {
      console.error("Save GeM monthly error:", err);
      showToast?.(`❌ Failed to save GeM ${category} data`, "#EF4444");
    } finally {
      setLoading(false);
    }
  };

  const gemVal =
    monthlyData[`procurement_through_gem_${shortMonth}`] ??
    monthlyData[`procurementThroughGem${monthCap}`] ??
    "";
  const outsideVal =
    monthlyData[`procurement_outside_gem_${shortMonth}`] ??
    monthlyData[`procurementOutsideGem${monthCap}`] ??
    "";
  const reasonVal =
    monthlyData[`reason_for_non_procurement_${shortMonth}`] ??
    monthlyData[`reasonForNonProcurement${monthCap}`] ??
    "";

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full mx-auto my-auto overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5fa7] p-5 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-black tracking-wide uppercase font-display">
              GeM {category.toUpperCase()} Expenditure — {record.organisation_name || "Organisation"}
            </h3>
            <p className="text-xs text-blue-200 font-semibold mt-0.5">
              Financial Year: {getGemFinancialYear(record) || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition cursor-pointer text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Select Reporting Month
            </label>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActiveMonth(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    activeMonth === m
                      ? "bg-[#0f417a] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Procurement Through GEM (₹ Cr)
              </label>
              <input
                type="number"
                step="0.01"
                value={gemVal}
                onChange={(e) =>
                  handleInputChange(
                    `procurement_through_gem_${shortMonth}`,
                    `procurementThroughGem${monthCap}`,
                    e.target.value
                  )
                }
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Procurement Outside GEM (₹ Cr)
              </label>
              <input
                type="number"
                step="0.01"
                value={outsideVal}
                onChange={(e) =>
                  handleInputChange(
                    `procurement_outside_gem_${shortMonth}`,
                    `procurementOutsideGem${monthCap}`,
                    e.target.value
                  )
                }
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason for Non-Procurement (if any)
            </label>
            <textarea
              rows={3}
              value={reasonVal}
              onChange={(e) =>
                handleInputChange(
                  `reason_for_non_procurement_${shortMonth}`,
                  `reasonForNonProcurement${monthCap}`,
                  e.target.value
                )
              }
              className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSaveMonth}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f417a] hover:bg-[#0b3260] disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Save size={14} />
            {loading ? "Saving..." : "Save Month Data"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
