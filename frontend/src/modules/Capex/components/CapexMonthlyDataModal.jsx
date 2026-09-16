import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import {
  FY_MONTHS,
  createEmptyMonthsData,
  rowsToMonthsData,
  monthsDataToEntries,
} from "../utils/capexUtils";
import { fetchCapexMonthlyData, saveCapexMonthlyData } from "../api";
import { getCurrentUserId } from "../../../utils/authSession";

export default function CapexMonthlyDataModal({ isOpen, onClose, capexRecord, showToast }) {
  const [selectedMonth, setSelectedMonth] = useState("January");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allMonthsData, setAllMonthsData] = useState(createEmptyMonthsData());

  useEffect(() => {
    if (isOpen && capexRecord) {
      fetchMonthlyData();
    }
  }, [isOpen, capexRecord]);

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

  const fetchMonthlyData = async () => {
    if (!capexRecord) return;
    setLoading(true);
    try {
      const res = await fetchCapexMonthlyData(capexRecord.capex_id);
      const rows = Array.isArray(res.data) ? res.data : [];
      setAllMonthsData(rowsToMonthsData(rows));
    } catch (err) {
      console.error("Failed to fetch monthly Capex data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (weekNum, field, value) => {
    const val = value === "" ? 0 : parseFloat(value) || 0;
    setAllMonthsData((prev) => ({
      ...prev,
      [selectedMonth]: {
        ...prev[selectedMonth],
        [`${field}Week${weekNum}`]: val,
      },
    }));
  };

  const handleSave = async () => {
    if (!capexRecord) return;
    setSaving(true);
    try {
      await saveCapexMonthlyData({
        capexID: capexRecord.capex_id,
        userID: getCurrentUserId(),
        entries: monthsDataToEntries(allMonthsData),
      });
      if (showToast) showToast("✅ All monthly expenditures saved successfully!", "#10B981");
      onClose();
    } catch (err) {
      console.error("Save monthly capex error:", err);
      if (showToast) showToast("❌ Failed to save monthly expenditures", "#EF4444");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !capexRecord) return null;

  const currentMonthData = allMonthsData[selectedMonth] || {};

  const totalMonthExp =
    (parseFloat(currentMonthData.gbsWeek1) || 0) +
    (parseFloat(currentMonthData.iebrWeek1) || 0) +
    (parseFloat(currentMonthData.pppWeek1) || 0) +
    (parseFloat(currentMonthData.gbsWeek2) || 0) +
    (parseFloat(currentMonthData.iebrWeek2) || 0) +
    (parseFloat(currentMonthData.pppWeek2) || 0) +
    (parseFloat(currentMonthData.gbsWeek3) || 0) +
    (parseFloat(currentMonthData.iebrWeek3) || 0) +
    (parseFloat(currentMonthData.pppWeek3) || 0) +
    (parseFloat(currentMonthData.gbsWeek4) || 0) +
    (parseFloat(currentMonthData.iebrWeek4) || 0) +
    (parseFloat(currentMonthData.pppWeek4) || 0);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl mx-auto my-auto overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        <div className="px-6 py-4 bg-[#0f417a] text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide uppercase font-display">
                Monthly Capex Expenditure Breakdown
              </h3>
              <p className="text-[11px] text-blue-100 font-medium">
                {capexRecord.organisation_name || "Organisation"} ({capexRecord.capex_financial_year})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} /> Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs font-bold text-slate-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-center font-bold">
                    <th className="p-2.5 border border-slate-200">Week</th>
                    <th className="p-2.5 border border-slate-200">GBS</th>
                    <th className="p-2.5 border border-slate-200">IR</th>
                    <th className="p-2.5 border border-slate-200">PPP</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((w) => (
                    <tr key={w} className="text-center">
                      <td className="p-2 border border-slate-200 font-bold text-slate-700">
                        Week {w}
                      </td>
                      {["gbs", "iebr", "ppp"].map((field) => (
                        <td key={field} className="p-2 border border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={currentMonthData[`${field}Week${w}`] || ""}
                            onChange={(e) => handleWeekChange(w, field, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-center font-semibold"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              {selectedMonth} Total
            </span>
            <span className="text-sm font-black text-[#0f417a]">
              {totalMonthExp.toFixed(2)} Cr
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-white flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f417a] text-white hover:bg-[#0c3563] cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle2 size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
