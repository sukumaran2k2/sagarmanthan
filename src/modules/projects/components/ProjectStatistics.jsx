import { BarChart2, Layers, CheckCircle2 } from 'lucide-react';

export default function ProjectStatistics() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card 1: Total Projects */}
      <div className="bg-gradient-to-b from-[#1b4380] to-[#0f2e5a] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">Total Projects</span>
            <span className="text-3xl font-extrabold font-display tracking-tight block">673</span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <BarChart2 className="h-5 w-5 text-white" />
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span className="text-blue-200 font-semibold">TOTAL COST</span>
            <span className="font-bold text-white text-xs">₹ 17,126,959.31 Cr</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-blue-200 font-semibold">CAPACITY (MTPA)</span>
            <span className="font-bold text-white text-xs">1,121.08</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center pt-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">603</div>
              <div className="text-[9px] text-blue-200 font-medium mt-0.5">EPC</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹17M Cr</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">70</div>
              <div className="text-[9px] text-blue-200 font-medium mt-0.5">PPP</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹68.9K Cr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Planning & Sanctioning */}
      <div className="bg-gradient-to-b from-[#009cb3] to-[#007b8f] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-100 block">Planning & Sanctioning</span>
            <span className="text-3xl font-extrabold font-display tracking-tight block">129</span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <Layers className="h-5 w-5 text-white" />
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span className="text-cyan-100 font-semibold">TOTAL COST</span>
            <span className="font-bold text-white text-xs">₹ 29,985.39 Cr</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-cyan-100 font-semibold">CAPACITY (MTPA)</span>
            <span className="font-bold text-white text-xs">213.10</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center pt-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">119</div>
              <div className="text-[9px] text-cyan-100 font-medium mt-0.5">EPC</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹10.9K Cr</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">10</div>
              <div className="text-[9px] text-cyan-100 font-medium mt-0.5">PPP</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹19K Cr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Under Tendering */}
      <div className="bg-gradient-to-b from-[#f09633] to-[#cc771d] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100 block">Under Tendering</span>
            <span className="text-3xl font-extrabold font-display tracking-tight block">78</span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <BarChart2 className="h-5 w-5 text-white" />
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span className="text-orange-100 font-semibold">TOTAL COST</span>
            <span className="font-bold text-white text-xs">₹ 1,483.29 Cr</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-orange-100 font-semibold">CAPACITY (MTPA)</span>
            <span className="font-bold text-white text-xs">661.03</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center pt-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">53</div>
              <div className="text-[9px] text-orange-100 font-medium mt-0.5">EPC</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹631 Cr</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">25</div>
              <div className="text-[9px] text-orange-100 font-medium mt-0.5">PPP</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹852 Cr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Under Implementation */}
      <div className="bg-gradient-to-b from-[#d2ab28] to-[#ab8714] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">Under Implementation</span>
            <span className="text-3xl font-extrabold font-display tracking-tight block">215</span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <BarChart2 className="h-5 w-5 text-white" />
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span className="text-amber-100 font-semibold">TOTAL COST</span>
            <span className="font-bold text-white text-xs">₹ 23,053.39 Cr</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-amber-100 font-semibold">CAPACITY (MTPA)</span>
            <span className="font-bold text-white text-xs">167.56</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center pt-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">192</div>
              <div className="text-[9px] text-amber-100 font-medium mt-0.5">EPC</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹7,136 Cr</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">23</div>
              <div className="text-[9px] text-amber-100 font-medium mt-0.5">PPP</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹15.9K Cr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 5: Completed Projects */}
      <div className="bg-gradient-to-b from-[#10b981] to-[#059669] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">Completed Projects</span>
            <span className="text-3xl font-extrabold font-display tracking-tight block">251</span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span className="text-emerald-100 font-semibold">TOTAL COST</span>
            <span className="font-bold text-white text-xs">₹ 15,589.66 Cr</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-emerald-100 font-semibold">CAPACITY (MTPA)</span>
            <span className="font-bold text-white text-xs">79.39</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center pt-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">239</div>
              <div className="text-[9px] text-emerald-100 font-medium mt-0.5">EPC</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹9,080 Cr</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
              <div className="font-bold text-[12px]">12</div>
              <div className="text-[9px] text-emerald-100 font-medium mt-0.5">PPP</div>
              <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹6,509 Cr</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
