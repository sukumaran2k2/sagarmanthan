import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const createInitialMonthsData = () => {
  const initial = {};
  MONTHS.forEach((m) => {
    initial[m] = {
      gbsWeek1: 0, iebrWeek1: 0, pppWeek1: 0,
      gbsWeek2: 0, iebrWeek2: 0, pppWeek2: 0,
      gbsWeek3: 0, iebrWeek3: 0, pppWeek3: 0,
      gbsWeek4: 0, iebrWeek4: 0, pppWeek4: 0,
    };
  });
  return initial;
};

export default function CapexMonthlyDataModal({ isOpen, onClose, capexRecord, showToast }) {
  const [selectedMonth, setSelectedMonth] = useState("January");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allMonthsData, setAllMonthsData] = useState(createInitialMonthsData());

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
      const res = await axios.get(`${API_BASE_URL}/capex-monthly-data/${capexRecord.capex_id}`);
      const dataObj = res.data && res.data.length > 0 ? res.data[0] : {};

      const loadedMonths = createInitialMonthsData();
      MONTHS.forEach((m) => {
        loadedMonths[m] = {
          gbsWeek1: dataObj[`capex_GBS_Week1_${m}`] ?? 0,
          iebrWeek1: dataObj[`capex_IEBR_Week1_${m}`] ?? 0,
          pppWeek1: dataObj[`capex_PPP_Week1_${m}`] ?? 0,

          gbsWeek2: dataObj[`capex_GBS_Week2_${m}`] ?? 0,
          iebrWeek2: dataObj[`capex_IEBR_Week2_${m}`] ?? 0,
          pppWeek2: dataObj[`capex_PPP_Week2_${m}`] ?? 0,

          gbsWeek3: dataObj[`capex_GBS_Week3_${m}`] ?? 0,
          iebrWeek3: dataObj[`capex_IEBR_Week3_${m}`] ?? 0,
          pppWeek3: dataObj[`capex_PPP_Week3_${m}`] ?? 0,

          gbsWeek4: dataObj[`capex_GBS_Week4_${m}`] ?? 0,
          iebrWeek4: dataObj[`capex_IEBR_Week4_${m}`] ?? 0,
          pppWeek4: dataObj[`capex_PPP_Week4_${m}`] ?? 0,
        };
      });

      setAllMonthsData(loadedMonths);
    } catch (err) {
      console.error("Failed to fetch monthly Capex data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (weekNum, field, value) => {
    const val = value === "" ? "" : parseFloat(value);
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

    const payload = { capexID: capexRecord.capex_id };

    MONTHS.forEach((m) => {
      const mData = allMonthsData[m] || {};
      const g1 = parseFloat(mData.gbsWeek1) || 0;
      const i1 = parseFloat(mData.iebrWeek1) || 0;
      const p1 = parseFloat(mData.pppWeek1) || 0;

      const g2 = parseFloat(mData.gbsWeek2) || 0;
      const i2 = parseFloat(mData.iebrWeek2) || 0;
      const p2 = parseFloat(mData.pppWeek2) || 0;

      const g3 = parseFloat(mData.gbsWeek3) || 0;
      const i3 = parseFloat(mData.iebrWeek3) || 0;
      const p3 = parseFloat(mData.pppWeek3) || 0;

      const g4 = parseFloat(mData.gbsWeek4) || 0;
      const i4 = parseFloat(mData.iebrWeek4) || 0;
      const p4 = parseFloat(mData.pppWeek4) || 0;

      payload[`capexGBSWeek1${m}`] = g1;
      payload[`capexIEBRWeek1${m}`] = i1;
      payload[`capexPPPWeek1${m}`] = p1;

      payload[`capexGBSWeek2${m}`] = g2;
      payload[`capexIEBRWeek2${m}`] = i2;
      payload[`capexPPPWeek2${m}`] = p2;

      payload[`capexGBSWeek3${m}`] = g3;
      payload[`capexIEBRWeek3${m}`] = i3;
      payload[`capexPPPWeek3${m}`] = p3;

      payload[`capexGBSWeek4${m}`] = g4;
      payload[`capexIEBRWeek4${m}`] = i4;
      payload[`capexPPPWeek4${m}`] = p4;

      const totalM = g1 + i1 + p1 + g2 + i2 + p2 + g3 + i3 + p3 + g4 + i4 + p4;
      payload[`capexTotalMonth${m}`] = totalM;
    });

    try {
      await axios.post(`${API_BASE_URL}/capex-monthly-data`, payload);
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
    (parseFloat(currentMonthData.gbsWeek1) || 0) + (parseFloat(currentMonthData.iebrWeek1) || 0) + (parseFloat(currentMonthData.pppWeek1) || 0) +
    (parseFloat(currentMonthData.gbsWeek2) || 0) + (parseFloat(currentMonthData.iebrWeek2) || 0) + (parseFloat(currentMonthData.pppWeek2) || 0) +
    (parseFloat(currentMonthData.gbsWeek3) || 0) + (parseFloat(currentMonthData.iebrWeek3) || 0) + (parseFloat(currentMonthData.pppWeek3) || 0) +
    (parseFloat(currentMonthData.gbsWeek4) || 0) + (parseFloat(currentMonthData.iebrWeek4) || 0) + (parseFloat(currentMonthData.pppWeek4) || 0);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl mx-auto my-auto overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
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
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition cursor-pointer text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {/* Month Selector Pills */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Select Reporting Month
            </label>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    selectedMonth === m
                      ? "bg-[#0f417a] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Entry Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
              <Calendar size={14} className="text-[#0f417a]" />
              <span>Weekly Actual Expenditure for {selectedMonth} (₹ Cr)</span>
            </h4>

            <div className="grid grid-cols-4 gap-3 text-center text-xs font-extrabold text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
              <div>Week</div>
              <div>GBS (Cr)</div>
              <div>IR (Cr)</div>
              <div>PPP (Cr)</div>
            </div>

            {[1, 2, 3, 4].map((w) => (
              <div key={w} className="grid grid-cols-4 gap-3 items-center bg-slate-50/70 p-2.5 rounded-xl border border-slate-200">
                <div className="text-xs font-extrabold text-slate-700 text-center">
                  Week {w}
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={currentMonthData[`gbsWeek${w}`] ?? 0}
                    onChange={(e) => handleInputChange(w, "gbs", e.target.value)}
                    className="w-full text-xs text-center px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={currentMonthData[`iebrWeek${w}`] ?? 0}
                    onChange={(e) => handleInputChange(w, "iebr", e.target.value)}
                    className="w-full text-xs text-center px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={currentMonthData[`pppWeek${w}`] ?? 0}
                    onChange={(e) => handleInputChange(w, "ppp", e.target.value)}
                    className="w-full text-xs text-center px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-800"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Month Total Card */}
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold uppercase text-blue-900 tracking-wide">
                Total {selectedMonth} Expenditure
              </span>
              <p className="text-[10px] text-blue-700 font-medium mt-0.5">
                Sum of Weeks 1-4 across GBS, IR, and PPP
              </p>
            </div>
            <div className="text-base font-black text-[#0f417a]">
              ₹ {totalMonthExp.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#0f417a] hover:bg-[#0b3260] text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <span>Saving All Months...</span> : <> <CheckCircle2 size={14} /> <span>Save Expenditure</span> </>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
