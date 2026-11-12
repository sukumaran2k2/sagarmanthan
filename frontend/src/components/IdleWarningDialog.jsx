import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

const formatLeft = (ms) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

// Shown before an idle sign-out; deadline is when the sign-out happens (ms)
export default function IdleWarningDialog({ deadline, onStay, onSignOut }) {
  const [now, setNow] = useState(Date.now);
  const stayRef = useRef(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    stayRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onStay();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStay]);

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-warning-title"
        aria-describedby="idle-warning-message"
        className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-scale-up"
      >
        <div className="px-5 py-5 flex flex-col items-center text-center">
          <div className="h-11 w-11 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-3">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <h3 id="idle-warning-title" className="text-sm font-black text-slate-800 dark:text-slate-100">
            Are you still there?
          </h3>
          <p id="idle-warning-message" className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            You have been inactive for a while. For your security you will be signed out in
          </p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2 tabular-nums">
            {formatLeft(deadline - now)}
          </p>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 transition cursor-pointer"
          >
            Sign out now
          </button>
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-[#0f417a] text-white hover:bg-[#1d5594] transition shadow-sm cursor-pointer"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
