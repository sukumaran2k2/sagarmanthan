import React, { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, Save, RefreshCw, Info } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
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

export default function CapexActualExpenditurePage({ capexRecord, onBack, showToast, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(capexRecord?.capex_financial_year || "2026-2027");
  const [allMonthsData, setAllMonthsData] = useState(createInitialMonthsData());

  useEffect(() => {
    if (capexRecord) {
      fetchMonthlyData();
    }
  }, [capexRecord]);

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
      if (showToast) showToast("❌ Failed to load monthly actual expenditure data", "#EF4444");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (month, weekNum, field, value) => {
    const val = value === "" ? 0 : parseFloat(value) || 0;
    setAllMonthsData((prev) => ({
      ...prev,
      [month]: {
        ...prev[month],
        [`${field}Week${weekNum}`]: val,
      },
    }));
  };

  const calculateWeekTotal = (monthData, weekNum) => {
    if (!monthData) return 0;
    const gbs = Number(monthData[`gbsWeek${weekNum}`]) || 0;
    const iebr = Number(monthData[`iebrWeek${weekNum}`]) || 0;
    const ppp = Number(monthData[`pppWeek${weekNum}`]) || 0;
    return gbs + iebr + ppp;
  };

  const calculateMonthTotal = (monthData) => {
    if (!monthData) return { gbs: 0, iebr: 0, ppp: 0, total: 0 };
    let gbs = 0, iebr = 0, ppp = 0;
    for (let w = 1; w <= 4; w++) {
      gbs += Number(monthData[`gbsWeek${w}`]) || 0;
      iebr += Number(monthData[`iebrWeek${w}`]) || 0;
      ppp += Number(monthData[`pppWeek${w}`]) || 0;
    }
    return { gbs, iebr, ppp, total: gbs + iebr + ppp };
  };

  const handleSave = async () => {
    if (!capexRecord) return;
    setSaving(true);

    const payload = { capexID: capexRecord.capex_id };
    MONTHS.forEach((m) => {
      const data = allMonthsData[m] || {};
      for (let w = 1; w <= 4; w++) {
        payload[`capexGBSWeek${w}${m}`] = data[`gbsWeek${w}`] || 0;
        payload[`capexIEBRWeek${w}${m}`] = data[`iebrWeek${w}`] || 0;
        payload[`capexPPPWeek${w}${m}`] = data[`pppWeek${w}`] || 0;
      }
      const mTotals = calculateMonthTotal(data);
      payload[`capexTotalMonth${m}`] = mTotals.total;
    });

    try {
      await axios.post(`${API_BASE_URL}/capex-monthly-data`, payload);
      if (showToast) showToast("✅ Actual Expenditure data saved successfully!", "#10B981");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Save monthly Capex error:", err);
      if (showToast) showToast("❌ Failed to save Actual Expenditure data", "#EF4444");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left select-none pb-12">
      {/* Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8d5c8] pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-[#4b2424] hover:bg-[#381b1b] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center space-x-2"
            title="Back to Capex Data List"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div>
            <h2 className="text-xl font-black text-[#4b2424] tracking-tight uppercase font-display flex items-center gap-2">
              <span>Actual Expenditure</span>
            </h2>
            <p className="text-xs text-[#6e3939] font-semibold">
              {capexRecord?.organisation_name || "Port / Organisation"} • Financial Year: {capexRecord?.capex_financial_year || "2026-2027"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchMonthlyData}
            className="p-2.5 bg-[#f4ebe6] hover:bg-[#e8dcd5] border border-[#d7c4b7] rounded-xl text-[#4b2424] transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#4b2424] hover:bg-[#381b1b] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{saving ? "Saving..." : "Save Expenditure"}</span>
          </button>
        </div>
      </div>

      {/* Financial Year Selector Filter Card */}
      <div className="bg-[#fcf9f7] border border-[#e8d5c8] rounded-2xl p-4 shadow-2xs space-y-2">
        <label className="block text-xs font-extrabold text-[#4b2424] uppercase tracking-wider">
          Financial Year
        </label>
        <div className="max-w-xs">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#d7c4b7] rounded-xl font-bold text-[#4b2424] focus:outline-none focus:ring-2 focus:ring-[#8c5757]/30 cursor-pointer shadow-2xs"
          >
            <option value="2026-2027">2026-2027</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </select>
        </div>
      </div>

      {/* Actual Expenditure Full Year Table in YP Brown Theme */}
      <div className="bg-white rounded-2xl border border-[#d7c4b7] shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] min-h-[450px] relative w-full">
          <table className="w-full text-xs text-slate-800 border-collapse table-fixed">
            <thead className="sticky top-0 z-20 bg-[#4b2424] text-white shadow-xs">
              <tr className="bg-[#4b2424] text-white font-extrabold text-center uppercase tracking-wider text-[11px] border-b border-[#381b1b]">
                <th className="p-3 border border-[#5c2d2d] w-[12%] text-left">Months</th>
                <th className="p-3 border border-[#5c2d2d] w-[12%]">Week (in Cr)</th>
                <th className="p-3 border border-[#5c2d2d] w-[20%]">GBS (in Cr)</th>
                <th className="p-3 border border-[#5c2d2d] w-[20%]">IR (in Cr)</th>
                <th className="p-3 border border-[#5c2d2d] w-[20%]">PPP (in Cr)</th>
                <th className="p-3 border border-[#5c2d2d] w-[16%]">Total (in Cr)</th>
              </tr>
            </thead>

            <tbody>
              {MONTHS.map((month) => {
                const monthData = allMonthsData[month] || {};
                const mTotals = calculateMonthTotal(monthData);
                const hasMonthEntries = mTotals.total > 0;

                return (
                  <React.Fragment key={month}>
                    {[1, 2, 3, 4].map((weekNum) => {
                      const weekTotal = calculateWeekTotal(monthData, weekNum);
                      const gbsVal = monthData[`gbsWeek${weekNum}`];
                      const iebrVal = monthData[`iebrWeek${weekNum}`];
                      const pppVal = monthData[`pppWeek${weekNum}`];

                      return (
                        <tr
                          key={`${month}-w${weekNum}`}
                          className="hover:bg-[#fbf4ee] transition border-b border-[#e8d5c8] text-center"
                        >
                          {/* Rowspan Month Name Column on Week 1 */}
                          {weekNum === 1 && (
                            <td
                              rowSpan={5}
                              className="p-3 border border-[#d8c7bc] font-black text-[#4b2424] text-sm bg-[#f5eeea] align-top text-left"
                            >
                              {month}
                            </td>
                          )}

                          {/* Week Label */}
                          <td className="p-2.5 border border-[#e8d5c8] font-bold text-[#5c3a3a] bg-[#fcf9f7]">
                            Week {weekNum}
                          </td>

                          {/* GBS Input */}
                          <td className="p-2 border border-[#e8d5c8]">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={gbsVal || ""}
                              onChange={(e) => handleInputChange(month, weekNum, "gbs", e.target.value)}
                              className={`w-full px-3 py-1.5 bg-[#fcf9f7] border rounded-xl text-xs font-bold text-[#4b2424] text-center outline-none transition focus:ring-2 focus:ring-[#8c5757]/30 ${
                                Number(gbsVal) > 0 ? "border-emerald-600 bg-emerald-50/60 font-black" : "border-[#d7c4b7]"
                              }`}
                            />
                          </td>

                          {/* IR Input */}
                          <td className="p-2 border border-[#e8d5c8]">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={iebrVal || ""}
                              onChange={(e) => handleInputChange(month, weekNum, "iebr", e.target.value)}
                              className={`w-full px-3 py-1.5 bg-[#fcf9f7] border rounded-xl text-xs font-bold text-[#4b2424] text-center outline-none transition focus:ring-2 focus:ring-[#8c5757]/30 ${
                                Number(iebrVal) > 0 ? "border-emerald-600 bg-emerald-50/60 font-black" : "border-[#d7c4b7]"
                              }`}
                            />
                          </td>

                          {/* PPP Input */}
                          <td className="p-2 border border-[#e8d5c8]">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={pppVal || ""}
                              onChange={(e) => handleInputChange(month, weekNum, "ppp", e.target.value)}
                              className={`w-full px-3 py-1.5 bg-[#fcf9f7] border rounded-xl text-xs font-bold text-[#4b2424] text-center outline-none transition focus:ring-2 focus:ring-[#8c5757]/30 ${
                                Number(pppVal) > 0 ? "border-emerald-600 bg-emerald-50/60 font-black" : "border-[#d7c4b7]"
                              }`}
                            />
                          </td>

                          {/* Weekly Total */}
                          <td className="p-2 border border-[#e8d5c8] font-extrabold text-[#4b2424]">
                            {weekTotal > 0 ? (
                              <span className="px-3 py-1 bg-[#f4ebe6] rounded-lg text-[#4b2424] font-black border border-[#d7c4b7]">
                                {weekTotal.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[#a08585]">0.00</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Row 5: Monthly Summary Row */}
                    <tr className="bg-[#e8dcd5] font-black border-b-2 border-[#c8b5a8] text-center text-[#4b2424]">
                      <td className="p-2.5 border border-[#c8b5a8] text-[#4b2424] text-xs font-black uppercase tracking-wider">
                        Total {month}
                      </td>
                      <td className="p-2.5 border border-[#c8b5a8] text-[#4b2424]">
                        {mTotals.gbs.toFixed(2)}
                      </td>
                      <td className="p-2.5 border border-[#c8b5a8] text-[#4b2424]">
                        {mTotals.iebr.toFixed(2)}
                      </td>
                      <td className="p-2.5 border border-[#c8b5a8] text-[#4b2424]">
                        {mTotals.ppp.toFixed(2)}
                      </td>
                      <td className="p-2.5 border border-[#c8b5a8]">
                        <div className="flex items-center justify-center space-x-1.5 bg-emerald-100/90 text-emerald-900 border border-emerald-400 px-3 py-1 rounded-xl text-xs font-black w-fit mx-auto shadow-2xs">
                          <span>{mTotals.total.toFixed(2)}</span>
                          {hasMonthEntries && <CheckCircle2 size={14} className="text-emerald-700 flex-shrink-0" />}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
