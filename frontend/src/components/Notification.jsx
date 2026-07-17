import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function Notification({ message }) {
  if (!message) return null;
  return (
    <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in">
      <div className="p-1 bg-emerald-500 rounded-lg">
        <CheckCircle2 className="h-4.5 w-4.5 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold font-display leading-tight">Notification</p>
        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{message}</p>
      </div>
    </div>
  );
}
