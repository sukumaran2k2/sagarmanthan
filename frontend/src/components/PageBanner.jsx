import React from 'react';

export default function PageBanner({ title, description, icon: Icon }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 to-[#0f417a] rounded-2xl p-6 md:p-8 text-white shadow-md border border-blue-800/30">
      {/* Decorative background shapes */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        {Icon && (
          <div className="flex-shrink-0 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 w-fit shadow-inner">
            <Icon className="h-6 w-6 text-blue-200" />
          </div>
        )}
        <div className="space-y-0.5">
          <h1 className="text-lg md:text-xl font-black tracking-wide uppercase font-display text-white">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-blue-100/85 font-medium max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
