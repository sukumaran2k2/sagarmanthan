import React from 'react';

export default function DelayStatusChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-650"></span>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Delay Status - Under Implementation Projects</h3>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-around py-6 gap-6">
          
          {/* SVG Pie Chart */}
          <div className="relative flex items-center justify-center">
            <svg className="w-64 h-64 transform -rotate-90">
              {/* Outer circle backdrop */}
              <circle cx="128" cy="128" r="90" stroke="#f1f5f9" strokeWidth="32" fill="transparent" />
              
              {/* Slice 1: On Time (138 projects -> 64.2% -> strokeDasharray="565.5" strokeDashoffset="202.5") */}
              <circle 
                cx="128" 
                cy="128" 
                r="90" 
                stroke="#0ea5e9" 
                strokeWidth="32" 
                fill="transparent" 
                strokeDasharray="565.5" 
                strokeDashoffset="202.5"
                strokeLinecap="butt" 
              />

              {/* Slice 2: Delayed (77 projects -> 35.8% -> strokeDasharray="202.5 565.5" strokeDashoffset="-363.0") */}
              <circle 
                cx="128" 
                cy="128" 
                r="90" 
                stroke="#6366f1" 
                strokeWidth="32" 
                fill="transparent" 
                strokeDasharray="202.5 565.5" 
                strokeDashoffset="-363.0"
                strokeLinecap="butt" 
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-slate-850">215</span>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Total Under</span>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest leading-tight">Implementation</span>
            </div>
          </div>

          {/* Legends & Metrics */}
          <div className="space-y-4 min-w-48">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center space-x-2.5">
                <span className="h-3 w-3 rounded-full bg-[#6366f1] inline-block"></span>
                <span className="text-xs font-bold text-slate-600">Delayed</span>
              </div>
              <span className="text-sm font-extrabold text-slate-800">77</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center space-x-2.5">
                <span className="h-3 w-3 rounded-full bg-[#0ea5e9] inline-block"></span>
                <span className="text-xs font-bold text-slate-600">On Time</span>
              </div>
              <span className="text-sm font-extrabold text-slate-800">138</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
