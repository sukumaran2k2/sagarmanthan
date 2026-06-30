import React from 'react';

export default function DashboardCard({ 
  title, 
  titleColor = "text-blue-200", 
  value, 
  icon: Icon, 
  gradientFrom = "#1b4380", 
  gradientTo = "#0f2e5a",
  children 
}) {
  return (
    <div 
      className="text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300"
      style={{ backgroundImage: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${titleColor}`}>{title}</span>
          <span className="text-3xl font-extrabold font-display tracking-tight block">{value}</span>
        </div>
        {Icon && (
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
      
      {children && (
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
          {children}
        </div>
      )}
    </div>
  );
}
