import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

// Overlay-panel confirm dialog used before any destructive DGS action, matching the look of
// the Projects module's drop-request Accept/Reject overlay. Click the backdrop or press Cancel
// to dismiss; click Delete to call `onConfirm`.
export default function ConfirmDeleteModal({
  open,
  title = 'Delete entry',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-hidden flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div
        className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 animate-scale-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/40 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            {message && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
