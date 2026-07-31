import React, { useState, useEffect } from "react";
import axios from "axios";
import { ClipboardList, TrendingUp, Percent, Calendar, LineChart as ChartIcon } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const MONTHS_ORDER = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const FULL_MONTHS = [
  "April", "May", "June", "July", "August", "September", "October", "November", "December",
  "January", "February", "March"
];

export default function CapexOrgDashboardView({ organisations = [], selectedOrgId, setSelectedOrgId, showToast }) {
  const [financialYear, setFinancialYear] = useState("2026-2027");
  const [loading, setLoading] = useState(false);

  const [totals, setTotals] = useState({
    totalPlannedExpenditure: 0,
    totalActualExpenditure: 0,
    expenditurePercentage: 0,
  });

  const [tableData, setTableData] = useState({
    GBS: {},
    IEBR: {},
    PDP: {},
  });

  const [trendChartData, setTrendChartData] = useState([]);

  useEffect(() => {
    fetchOrgDashboardData();
  }, [selectedOrgId, financialYear]);

  const fetchOrgDashboardData = async () => {
    setLoading(true);
    try {
      const userID = 1;
      const res = await axios.get(`${API_BASE_URL}/capex/${userID}`);
      const dataList = res.data || [];

      // Filter rows for selectedOrgId
      const orgRows = dataList.filter(
        (r) => String(r.capex_organisation_id) === String(selectedOrgId)
      );

      // Current year record
      const record = orgRows.find(
        (r) => String(r.capex_financial_year).trim() === financialYear.trim()
      ) || orgRows[0];

      if (record) {
        const planned = parseFloat(record.capex_total_value) || 0;
        const actual = parseFloat(record.total_capex_expenditure) || 0;
        const pct = planned > 0 ? (actual * 100) / planned : 0;

        setTotals({
          totalPlannedExpenditure: planned,
          totalActualExpenditure: actual,
          expenditurePercentage: pct,
        });

        // Fetch monthly data for table
        if (record.capex_id) {
          const mRes = await axios.get(`${API_BASE_URL}/capex-monthly-data/${record.capex_id}`);
          const mObj = mRes.data && mRes.data.length > 0 ? mRes.data[0] : {};

          const gbsObj = {};
          const iebrObj = {};
          const pdpObj = {};

          FULL_MONTHS.forEach((m, idx) => {
            const shortM = MONTHS_ORDER[idx];
            const gbs =
              (parseFloat(mObj[`capex_GBS_Week1_${m}`]) || 0) +
              (parseFloat(mObj[`capex_GBS_Week2_${m}`]) || 0) +
              (parseFloat(mObj[`capex_GBS_Week3_${m}`]) || 0) +
              (parseFloat(mObj[`capex_GBS_Week4_${m}`]) || 0);

            const iebr =
              (parseFloat(mObj[`capex_IEBR_Week1_${m}`]) || 0) +
              (parseFloat(mObj[`capex_IEBR_Week2_${m}`]) || 0) +
              (parseFloat(mObj[`capex_IEBR_Week3_${m}`]) || 0) +
              (parseFloat(mObj[`capex_IEBR_Week4_${m}`]) || 0);

            const pdp =
              (parseFloat(mObj[`capex_PPP_Week1_${m}`]) || 0) +
              (parseFloat(mObj[`capex_PPP_Week2_${m}`]) || 0) +
              (parseFloat(mObj[`capex_PPP_Week3_${m}`]) || 0) +
              (parseFloat(mObj[`capex_PPP_Week4_${m}`]) || 0);

            gbsObj[shortM] = gbs;
            iebrObj[shortM] = iebr;
            pdpObj[shortM] = pdp;
          });

          setTableData({
            GBS: gbsObj,
            IEBR: iebrObj,
            PDP: pdpObj,
          });
        }
      } else {
        setTotals({ totalPlannedExpenditure: 0, totalActualExpenditure: 0, expenditurePercentage: 0 });
        setTableData({ GBS: {}, IEBR: {}, PDP: {} });
      }

      // Build Year Wise Trend chart data across financial years
      const yearsMap = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
      const trendData = yearsMap.map((fy) => {
        const row = orgRows.find((r) => String(r.capex_financial_year).trim() === fy);
        return {
          year: fy,
          planned: row ? parseFloat(row.capex_total_value) || 0 : 0,
          actual: row ? parseFloat(row.total_capex_expenditure) || 0 : 0,
        };
      });

      setTrendChartData(trendData);
    } catch (err) {
      console.error("Fetch Org Capex Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedOrgObj = organisations.find(
    (o) => String(o.organisation_id || o.id) === String(selectedOrgId)
  );
  const selectedOrgName = selectedOrgObj
    ? selectedOrgObj.organisation_name || selectedOrgObj.name
    : "Organization Dashboard";

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* Title Banner */}
      <div className="bg-gradient-to-r from-sky-200 via-sky-100 to-teal-100 py-4 px-6 rounded-2xl text-center border border-sky-300 shadow-xs">
        <h2 className="text-xl font-black text-[#0c3c6b] tracking-wide uppercase font-display">
          Capex Dashboard
        </h2>
      </div>

      {/* Filter Section - Financial Year Select Only */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Financial Year */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Financial Year
            </label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="">Show All</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
          </div>

          {/* Active Organisation Indicator */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Active Organisation
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-[#0f417a] focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
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

      {/* 3 Main KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Planned Expenditure Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1e5fa7] to-[#134a84] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold opacity-90 tracking-wide uppercase">
              Planned Expenditure (Cr.)
            </span>
            <div className="text-2xl font-black tracking-tight">
              ₹{totals.totalPlannedExpenditure.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-xs">
            <ClipboardList className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Actual Expenditure Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0E7490] to-[#22D3EE] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold opacity-90 tracking-wide uppercase">
              Actual Expenditure (Cr.)
            </span>
            <div className="text-2xl font-black tracking-tight">
              ₹{totals.totalActualExpenditure.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-xs">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* % Expenditure Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#f2994a] to-[#f2c94c] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold opacity-90 tracking-wide uppercase">
              % Expenditure
            </span>
            <div className="text-2xl font-black tracking-tight">
              {totals.expenditurePercentage.toFixed(2)}%
            </div>
          </div>
          <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-xs">
            <Percent className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      {/* Section 1: Financial Year Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#13206b] text-center tracking-wide font-display">
          Financial Year Summary ({financialYear})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse border border-slate-200">
            <thead>
              <tr className="bg-[#0f417a] text-white font-extrabold">
                <th className="p-2.5 border border-slate-300 min-w-[120px]">Component</th>
                {MONTHS_ORDER.map((m) => (
                  <th key={m} className="p-2.5 border border-slate-300">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["GBS", "IEBR", "PDP"].map((comp) => (
                <tr key={comp} className="hover:bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
                  <td className="p-2.5 border border-slate-200 bg-slate-100 font-black text-[#0f417a]">
                    {comp}
                  </td>
                  {MONTHS_ORDER.map((m) => {
                    const val = tableData[comp]?.[m] || 0;
                    return (
                      <td key={m} className="p-2 border border-slate-200 text-center">
                        {val > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold border border-blue-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            <span>{Number(val).toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">0</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Year Wise Trend Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#13206b] text-center tracking-wide font-display">
          Year Wise Trend
        </h3>

        <div className="h-96 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={trendChartData}
              margin={{ top: 25, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
              />
              <YAxis
                tickFormatter={(val) => `₹${val}`}
                tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
              />
              <Tooltip
                formatter={(val, name) => [`₹${val} Cr`, name]}
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "12px",
                  border: "1px solid #CBD5E1",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontWeight: "bold" }}
              />
              <Bar
                dataKey="planned"
                name="Planned Expenditure (Cr.)"
                fill="#50C878"
                radius={[5, 5, 0, 0]}
                barSize={36}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Expenditure (Cr.)"
                stroke="#800020"
                strokeWidth={3}
                dot={{ r: 5, fill: "#800020", stroke: "#FFFFFF", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
