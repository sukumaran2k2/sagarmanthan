import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

// Card surface matches the platform's own light-theme pattern (confirmed
// from Header.jsx: bg-white border border-slate-200 shadow-xl), the same
// treatment used throughout our own module cards. A left accent bar plus
// a plain colored icon (no solid badge box) reads as a status indicator
// rather than an alarm -- softer than a solid red icon chip while still
// making the type unambiguous at a glance.
const TYPE_STYLES = {
  success: {
    icon: CheckCircle2,
    accentBorder: 'border-l-[#0f417a]',
    iconColor: 'text-[#0f417a]',
    title: 'Success',
  },
  error: {
    icon: AlertCircle,
    accentBorder: 'border-l-red-500',
    iconColor: 'text-red-600',
    title: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    accentBorder: 'border-l-amber-500',
    iconColor: 'text-amber-600',
    title: 'Warning',
  },
};

export default function Notification({ message, type = 'success' }) {
  if (!message) return null;
  const { icon: Icon, accentBorder, iconColor, title } = TYPE_STYLES[type] || TYPE_STYLES.success;
  return (
    <div className={`fixed top-6 right-6 z-55 flex items-center space-x-3 bg-white border border-slate-200 border-l-[3px] ${accentBorder} px-4.5 py-3 rounded-lg shadow-xl animate-fade-in`}>
      <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${iconColor}`} />
      <div>
        <p className="text-xs font-bold font-display leading-tight text-slate-900">{title}</p>
        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{message}</p>
      </div>
    </div>
  );
}
