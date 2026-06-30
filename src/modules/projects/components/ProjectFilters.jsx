import { useState } from 'react';
import { ChevronDown, CheckCircle2, Calendar } from 'lucide-react';
import DashboardFilterPanel from '../../../components/dashboard/DashboardFilterPanel';

export default function ProjectFilters({ isFiltersExpanded, setIsFiltersExpanded }) {
  const [openFilters, setOpenFilters] = useState({
    orgCategory: false,
    orgWise: false,
    foundation: false,
    inauguration: false,
    workAwarded: false,
    actualCompletion: false,
    sanctioned: false
  });

  const toggleFilter = (key) => {
    setOpenFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <DashboardFilterPanel 
      title="Dashboard Filters" 
      isExpanded={isFiltersExpanded} 
      onToggle={() => setIsFiltersExpanded(prev => !prev)}
    >
      {/* Dropdown 1 */}
      <div className={`p-3.5 rounded-xl border transition-all ${openFilters.orgCategory ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
        <button
          onClick={() => toggleFilter('orgCategory')}
          className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <span className="text-[11px] uppercase tracking-wider">Organisation Category</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.orgCategory ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
        {openFilters.orgCategory && (
          <div className="relative mt-3 animate-fade-in">
            <select className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-medium text-slate-800">
              <option>Major Ports</option>
            </select>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 fill-emerald-100" />
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Dropdown 2 */}
      <div className={`p-3.5 rounded-xl border transition-all ${openFilters.orgWise ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
        <button
          onClick={() => toggleFilter('orgWise')}
          className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <span className="text-[11px] uppercase tracking-wider">Organisation Wise</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.orgWise ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
        {openFilters.orgWise && (
          <div className="relative mt-3 animate-fade-in">
            <select className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-medium text-slate-800">
              <option>--Organisation--</option>
            </select>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 fill-emerald-100" />
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Date Range 1 */}
      <div className={`p-3.5 rounded-xl border transition-all ${openFilters.foundation ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
        <button
          onClick={() => toggleFilter('foundation')}
          className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <span className="text-[11px] uppercase tracking-wider">Tentative Foundation Date</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.foundation ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
        {openFilters.foundation && (
          <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
            <div className="relative">
              <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Date Range 2 */}
      <div className={`p-3.5 rounded-xl border transition-all ${openFilters.inauguration ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
        <button
          onClick={() => toggleFilter('inauguration')}
          className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <span className="text-[11px] uppercase tracking-wider">Tentative Inauguration Date</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.inauguration ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
        {openFilters.inauguration && (
          <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
            <div className="relative">
              <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Date Range 3 */}
      <div className={`p-3.5 rounded-xl border transition-all ${openFilters.workAwarded ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
        <button
          onClick={() => toggleFilter('workAwarded')}
          className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <span className="text-[11px] uppercase tracking-wider">Work Awarded Date</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.workAwarded ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
        {openFilters.workAwarded && (
          <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
            <div className="relative">
              <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Date Range 4 */}
      <div className={`p-3.5 rounded-xl border transition-all ${openFilters.actualCompletion ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
        <button
          onClick={() => toggleFilter('actualCompletion')}
          className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <span className="text-[11px] uppercase tracking-wider">Actual Completion Date</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.actualCompletion ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
        {openFilters.actualCompletion && (
          <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
            <div className="relative">
              <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Date Range 5 */}
      <div className={`p-3.5 rounded-xl border transition-all ${openFilters.sanctioned ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
        <button
          onClick={() => toggleFilter('sanctioned')}
          className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
        >
          <span className="text-[11px] uppercase tracking-wider">Sanctioned Date</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.sanctioned ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
        {openFilters.sanctioned && (
          <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
            <div className="relative">
              <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>
    </DashboardFilterPanel>
  );
}
