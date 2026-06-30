import React from 'react';

export default function DashboardHeader({ title, description, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">{title}</h1>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
      {children && (
        <div className="flex flex-col items-start space-y-2 md:items-end">
          {children}
        </div>
      )}
    </div>
  );
}
