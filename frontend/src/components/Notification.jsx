import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertCircle, AlertTriangle, Info, X 
} from 'lucide-react';

export default function Notification({ message, onDismiss }) {
  const [progress, setProgress] = useState(100);

  const toastObj = typeof message === 'object' && message !== null ? message : { message };

  useEffect(() => {
    if (!toastObj.message) return;

    setProgress(100);
    const duration = toastObj.duration || 3500;
    const intervalTime = 25;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [message]);

  if (!toastObj.message) return null;

  // Auto-detect type if not specified
  let type = toastObj.type || 'info';
  const msgLower = String(toastObj.message).toLowerCase();

  if (!toastObj.type) {
    if (
      msgLower.includes('fail') || 
      msgLower.includes('error') || 
      msgLower.includes('invalid') || 
      msgLower.includes('unauthorized')
    ) {
      type = 'error';
    } else if (
      msgLower.includes('success') || 
      msgLower.includes('copied') || 
      msgLower.includes('saved') || 
      msgLower.includes('created') || 
      msgLower.includes('updated') || 
      msgLower.includes('deleted') || 
      msgLower.includes('uploaded') ||
      msgLower.includes('relieved')
    ) {
      type = 'success';
    } else if (
      msgLower.includes('warn') || 
      msgLower.includes('please') || 
      msgLower.includes('select') || 
      msgLower.includes('require') ||
      msgLower.includes('attention')
    ) {
      type = 'warning';
    } else {
      type = 'info';
    }
  }

  const configs = {
    success: {
      bg: 'bg-slate-900/95 dark:bg-slate-950/95',
      border: 'border-emerald-500/40 shadow-emerald-950/30',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      defaultTitle: 'Success',
    },
    error: {
      bg: 'bg-slate-900/95 dark:bg-slate-950/95',
      border: 'border-rose-500/40 shadow-rose-950/30',
      badgeBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      icon: AlertCircle,
      iconColor: 'text-rose-400',
      barColor: 'bg-gradient-to-r from-rose-500 to-red-400',
      defaultTitle: 'Action Failed',
    },
    warning: {
      bg: 'bg-slate-900/95 dark:bg-slate-950/95',
      border: 'border-amber-500/40 shadow-amber-950/30',
      badgeBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      barColor: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      defaultTitle: 'Attention',
    },
    info: {
      bg: 'bg-slate-900/95 dark:bg-slate-950/95',
      border: 'border-blue-500/40 shadow-blue-950/30',
      badgeBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      icon: Info,
      iconColor: 'text-blue-400',
      barColor: 'bg-gradient-to-r from-blue-500 to-[#0f417a]',
      defaultTitle: 'Notification',
    },
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;
  const title = toastObj.title || config.defaultTitle;

  return (
    <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full transition-all duration-300 transform animate-scale-up">
      <div 
        className={`${config.bg} ${config.border} backdrop-blur-xl border text-white rounded-2xl shadow-2xl overflow-hidden p-4 relative ring-1 ring-white/10`}
      >
        {/* Glow Accent */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start space-x-3.5">
          {/* Icon Badge */}
          <div className={`p-2 rounded-xl shrink-0 ${config.badgeBg} shadow-inner mt-0.5`}>
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-xs font-black uppercase tracking-wider font-display text-white">
              {title}
            </h4>
            <p className="text-xs text-slate-300 font-medium leading-snug mt-1 break-words">
              {toastObj.message}
            </p>
          </div>

          {/* Dismiss Button */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
          <div 
            className={`h-full ${config.barColor} transition-all ease-linear`} 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
