import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function PageBanner({ title, description, badge, info, icon: Icon = HelpCircle }) {
  return (
    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 p-6 sm:p-8 rounded-2xl border border-blue-800 dark:border-slate-800 text-white shadow-lg relative overflow-hidden">
      <div className="absolute right-0 top-0 opacity-10">
        <Icon className="h-48 w-48 -mr-10 -mt-10" />
      </div>
      <div className="relative z-10 space-y-2">
        {badge && (
          <div className="inline-block bg-white/10 dark:bg-slate-800/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/15 mb-1">
            {badge}
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight uppercase">
          {title}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-blue-100 dark:text-slate-300 max-w-xl font-medium leading-relaxed">
            {description}
          </p>
        )}
        {info && (
          <div className="inline-flex items-center space-x-2 bg-white/10 dark:bg-slate-800/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold mt-2 border border-white/15">
            {info}
          </div>
        )}
      </div>
    </div>
  );
}
