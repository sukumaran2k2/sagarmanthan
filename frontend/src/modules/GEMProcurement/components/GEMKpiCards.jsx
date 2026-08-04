import React from "react";
import { ClipboardList, TrendingUp, ShieldCheck, Percent } from "lucide-react";

export default function GEMKpiCards({ data = [], activeCategory = "Goods" }) {
  let totalPlanned = 0;
  let totalTarget = 0;
  let totalGem = 0;
  let totalOutside = 0;

  data.forEach((row) => {
    totalPlanned += Number(row.planned_procurement || row.goods_procurement_potential || row.service_procurement_potential || row.works_procurement_potential || row.total_planned) || 0;
    totalTarget += Number(row.proportional_target || row.eight_months_proportional_target || row.total_target) || 0;
    totalGem += Number(row.procurement_through_gem || row.total_gem) || 0;
    totalOutside += Number(row.procurement_outside_gem || row.total_outside) || 0;
  });

  const percentGem = totalPlanned > 0 ? (totalGem * 100) / totalPlanned : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 animate-fade-in select-none">
      {/* Planned Total Procurement Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0f417a] to-[#1e5fa7] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold opacity-90 tracking-wide uppercase">
            Planned Total ({activeCategory})
          </span>
          <div className="text-2xl font-black tracking-tight">
            ₹{totalPlanned.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr
          </div>
        </div>
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xs">
          <ClipboardList className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Proportional Target Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#38bdf8] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold opacity-90 tracking-wide uppercase">
            Proportional Target (Cr.)
          </span>
          <div className="text-2xl font-black tracking-tight">
            ₹{totalTarget.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr
          </div>
        </div>
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xs">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Procurement Through GeM Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#34d399] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold opacity-90 tracking-wide uppercase">
            Procurement Through GeM
          </span>
          <div className="text-2xl font-black tracking-tight">
            ₹{totalGem.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr
          </div>
        </div>
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xs">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* % GeM Realized Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold opacity-90 tracking-wide uppercase">
            % GeM Share
          </span>
          <div className="text-2xl font-black tracking-tight">
            {percentGem.toFixed(2)}%
          </div>
        </div>
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xs">
          <Percent className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
