import React from 'react';

export default function DashboardSection({ title, children, className = "" }) {
  return (
    <section className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pl-2 border-l-4 border-blue-600">
          {title}
        </h2>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {children}
      </div>
    </section>
  );
}
