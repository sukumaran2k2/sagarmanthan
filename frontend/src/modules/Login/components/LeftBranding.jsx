import React from 'react';

export default function LeftBranding() {
  return (
    <div className="text-left max-w-xl text-white space-y-6 animate-fade-in select-none">
      {/* Government of India Emblem & Ministry Info (Top) */}
      <div className="flex items-center space-x-3.5 pb-4 border-b border-white/10 max-w-md">
        <img
          src="/emblem.svg"
          alt="Emblem of India"
          className="h-12 w-auto object-contain brightness-0 invert"
        />
        <div className="text-left leading-tight">
          <p className="text-xs uppercase tracking-wider text-slate-300 font-extrabold">
            Government of India
          </p>
          <p className="text-sm font-black text-white tracking-tight mt-0.5 leading-snug">
            Ministry of Ports, Shipping and Waterways
          </p>
        </div>
      </div>

      {/* Welcome to Sagarmanthan Info */}
      <div className="space-y-3 pt-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white select-text">
          Welcome to Sagarmanthan
        </h1>
        <h2 className="text-base sm:text-lg font-bold text-cyan-300 tracking-wide select-text leading-snug">
          Unified Governance Monitoring & Decision Support Platform
        </h2>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium max-w-md select-text">
          An integrated digital platform enabling data-driven governance, performance monitoring and informed decision-making across the Ministry of Ports, Shipping and Waterways.
        </p>
      </div>

      {/* Tagline */}
      <div className="pt-2">
        <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs text-cyan-250 font-black select-text tracking-wide shadow-sm">
          <span>One Platform</span>
          <span className="text-cyan-400 font-black">•</span>
          <span>One Source of Truth</span>
          <span className="text-cyan-400 font-black">•</span>
          <span>Better Governance</span>
        </div>
      </div>
    </div>
  );
}
