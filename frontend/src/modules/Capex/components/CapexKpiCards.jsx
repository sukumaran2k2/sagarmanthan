import React from "react";
import { DollarSign, TrendingUp, Building2, PieChart, CheckCircle2 } from "lucide-react";
import { formatCurrencyINR } from "../utils/capexUtils";

export default function CapexKpiCards({ data = [] }) {
  const totalTarget = data.reduce((acc, r) => acc + (parseFloat(r.capex_total_value) || 0), 0);
  const totalGBS = data.reduce((acc, r) => acc + (parseFloat(r.capex_gbs_value) || 0), 0);
  const totalIEBR = data.reduce((acc, r) => acc + (parseFloat(r.capex_iebr_value) || 0), 0);
  const totalPPP = data.reduce((acc, r) => acc + (parseFloat(r.capex_ppp_value) || 0), 0);
  const totalExp = data.reduce((acc, r) => acc + (parseFloat(r.total_capex_expenditure) || 0), 0);
  const overallPercentage = totalTarget > 0 ? ((totalExp / totalTarget) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      title: "Total Capex Target",
      value: formatCurrencyINR(totalTarget),
      subtitle: `${data.length} Participating Schemes / Orgs`,
      icon: DollarSign,
      bgColor: "bg-blue-50/80",
      borderColor: "border-blue-200",
      iconColor: "text-[#0f417a]",
    },
    {
      title: "GBS Allocation",
      value: formatCurrencyINR(totalGBS),
      subtitle: "Gross Budgetary Support",
      icon: Building2,
      bgColor: "bg-indigo-50/80",
      borderColor: "border-indigo-200",
      iconColor: "text-indigo-700",
    },
    {
      title: "Internal Resources (IR)",
      value: formatCurrencyINR(totalIEBR),
      subtitle: "Internal & Extra Budgetary",
      icon: PieChart,
      bgColor: "bg-amber-50/80",
      borderColor: "border-amber-200",
      iconColor: "text-amber-700",
    },
    {
      title: "PPP Allocation",
      value: formatCurrencyINR(totalPPP),
      subtitle: "Public-Private Partnership",
      icon: TrendingUp,
      bgColor: "bg-purple-50/80",
      borderColor: "border-purple-200",
      iconColor: "text-purple-700",
    },
    {
      title: "Expenditure Achieved",
      value: formatCurrencyINR(totalExp),
      subtitle: `${overallPercentage}% Target Utilization`,
      icon: CheckCircle2,
      bgColor: "bg-emerald-50/80",
      borderColor: "border-emerald-200",
      iconColor: "text-emerald-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl border ${card.borderColor} ${card.bgColor} shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl bg-white/80 shadow-xs ${card.iconColor}`}>
                <IconComponent className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-black text-slate-800 tracking-tight">
                {card.value}
              </div>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
