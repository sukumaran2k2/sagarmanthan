import React from 'react';
import { Users, UserCheck, LogOut, Clock } from 'lucide-react';

export default function AttendanceKpiHeader({ totalEmployeesStat, avgWorkingHoursFormatted, punctualArrivalRate, earlyCheckoutRate }) {
  return (
    <div className="px-4 md:px-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Employees Monitored */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Employees Monitored</span>
            <span className="text-2xl font-black text-amber-700 block mt-1">
              {typeof totalEmployeesStat === 'object' ? totalEmployeesStat.empCount : totalEmployeesStat}
            </span>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
              {typeof totalEmployeesStat === 'object' ? totalEmployeesStat.wingCount : 'Across all wings'}
            </span>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2: Average Working Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Working Time</span>
            <span className="text-2xl font-black text-violet-700 block mt-1">{avgWorkingHoursFormatted}</span>
            <span className="text-[10px] text-violet-600 font-semibold block mt-0.5">Daily average work duration</span>
          </div>
          <div className="p-3.5 bg-violet-50 text-violet-600 rounded-xl border border-violet-100">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3: Punctual Arrival Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Punctual Arrival Rate</span>
            <span className="text-2xl font-black text-emerald-700 block mt-1">{punctualArrivalRate}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Check-in before 09:30 AM</span>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4: Early Checkout Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Early Checkout Rate</span>
            <span className="text-2xl font-black text-[#0f417a] block mt-1">{earlyCheckoutRate}</span>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Check-out before 05:30 PM</span>
          </div>
          <div className="p-3.5 bg-blue-50 text-[#0f417a] rounded-xl border border-blue-100">
            <LogOut className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
