import { useState, useEffect } from "react";
import { ClipboardList, TrendingUp, Percent } from "lucide-react";
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
import {
  fetchCapexDashboard,
  fetchCapexDashboardBarGraph,
} from "../api";

export default function CapexDashboardView({ showToast }) {
  const [clusterID, setClusterID] = useState("1");
  const [financialYear, setFinancialYear] = useState("2026-2027");
  const [loading, setLoading] = useState(false);

  const [totals, setTotals] = useState({
    totalPlannedExpenditure: 0,
    totalActualExpenditure: 0,
    expenditurePercentage: 0,
  });

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchDashboardData(clusterID, financialYear);
  }, [clusterID, financialYear]);

  const fetchDashboardData = async (cid, fy) => {
    setLoading(true);
    try {
      const yearParam = fy || "all";
      const totalsRes = await fetchCapexDashboard(cid, yearParam);
      if (totalsRes.data?.combinedTotals) {
        setTotals({
          totalPlannedExpenditure: Number(totalsRes.data.combinedTotals.totalPlannedExpenditure) || 0,
          totalActualExpenditure: Number(totalsRes.data.combinedTotals.totalActualExpenditure) || 0,
          expenditurePercentage: Number(totalsRes.data.combinedTotals.expenditurePercentage) || 0,
        });
      } else {
        setTotals({ totalPlannedExpenditure: 0, totalActualExpenditure: 0, expenditurePercentage: 0 });
      }

      const chartRes = await fetchCapexDashboardBarGraph(cid, yearParam);
      if (
        chartRes.data?.labels &&
        chartRes.data?.datasets &&
        chartRes.data.datasets.length >= 2
      ) {
        const labels = chartRes.data.labels;
        const plannedArr = chartRes.data.datasets[0].data || [];
        const actualArr = chartRes.data.datasets[1].data || [];
        setChartData(
          labels.map((lbl, idx) => ({
            name: lbl,
            planned: plannedArr[idx] !== undefined ? Number(plannedArr[idx]) : 0,
            actual: actualArr[idx] !== undefined ? Number(actualArr[idx]) : 0,
          }))
        );
      } else {
        setChartData([]);
      }
    } catch (err) {
      console.error("Capex Dashboard fetch error:", err);
      if (showToast) showToast("❌ Failed to load Capex Dashboard metrics", "#EF4444");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* Light Blue Banner Header */}
      <div className="bg-gradient-to-r from-[#0f417a] via-[#163a66] to-[#1d5594] py-4 px-6 rounded-2xl text-center border border-[#0c3563] shadow-xs">
        <h2 className="text-xl font-black text-white tracking-wide uppercase font-display">
          Capex Dashboard
        </h2>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Organization Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Organization Type
            </label>
            <select
              value={clusterID}
              onChange={(e) => setClusterID(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="1">Major Ports</option>
              <option value="3">Shipping Sector & Others</option>
              <option value="6">Other Organisations</option>
            </select>
          </div>

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

      {/* Bar & Line Chart Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#13206b] text-center tracking-wide font-display">
          Distribution by Organization (in ₹ Crores)
        </h3>

        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-slate-400 font-bold text-sm">
            No Distribution Data Available
          </div>
        ) : (
          <div className="h-96 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                  interval={0}
                />
                <YAxis
                  tickFormatter={(val) => `₹${val}`}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                />
                <Tooltip
                  formatter={(val) => [`₹${val} Cr`, ""]}
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
                  name="Planned Expenditure (in Cr.)"
                  fill="#134a84"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Expenditure (in Cr.)"
                  stroke="#06B6D4"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#06B6D4", stroke: "#FFFFFF", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
