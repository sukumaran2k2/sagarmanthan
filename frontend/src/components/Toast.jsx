import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-emerald-400 dark:border-emerald-600',
    iconBg: 'bg-emerald-500',
    title: 'Success',
    bar: 'bg-emerald-500',
    titleColor: 'text-emerald-700 dark:text-emerald-400',
  },
  error: {
    icon: XCircle,
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-red-400 dark:border-red-600',
    iconBg: 'bg-red-500',
    title: 'Error',
    bar: 'bg-red-500',
    titleColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-amber-400 dark:border-amber-500',
    iconBg: 'bg-amber-500',
    title: 'Warning',
    bar: 'bg-amber-500',
    titleColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-blue-400 dark:border-blue-500',
    iconBg: 'bg-blue-500',
    title: 'Info',
    bar: 'bg-blue-500',
    titleColor: 'text-blue-600 dark:text-blue-400',
  },
};

const DURATION = 4000;

function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);

  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.success;
  const Icon = config.icon;

  // Slide-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Shrink progress bar
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={`relative w-80 rounded-xl border-l-4 shadow-xl overflow-hidden transition-all duration-300 ease-out
        ${config.bg} ${config.border}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
    >
      {/* Main content */}
      <div className="flex items-start gap-3 px-4 py-3.5 pr-10">
        <div className={`mt-0.5 p-1.5 rounded-lg ${config.iconBg} flex-shrink-0`}>
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-wider ${config.titleColor}`}>
            {toast.title || config.title}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug font-medium">
            {toast.message}
          </p>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full ${config.bar} transition-none`}
          style={{ width: `${progress}%`, transition: 'width 30ms linear' }}
        />
      </div>
    </div>
  );
}

export default function Toast({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
