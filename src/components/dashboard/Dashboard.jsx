import React from 'react';

export default function Dashboard({ children, className = "" }) {
  return (
    <div className={`space-y-6 px-4 sm:px-6 md:px-8 py-6 animate-fade-in text-slate-800 bg-slate-50/50 min-h-screen ${className}`}>
      {children}
    </div>
  );
}
