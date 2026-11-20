import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

// Shown by each K-2.x leaf input form until its dedicated form UI is wired up.
// Explains to the user that the backend endpoints exist but the form fields are
// still being built, and points them back to the Input Form index.
export default function PlaceholderInputForm({ code, title, backendNote, showBack = false }) {
  const navigate = useNavigate();

  return (
    <div className="module-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{code}</span>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        {showBack && (
          <button
            type="button"
            onClick={() => navigate('/kpi/dgs/input-forms')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Input Forms
          </button>
        )}
      </div>

      <div className="border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-6 text-center">
        <Construction className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
          Input form for {code} is being built.
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          The backend endpoints for this section are already available. The data-entry fields and
          validation are being finalised and will be enabled here shortly.
        </p>
        {backendNote && (
          <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-3 italic">
            {backendNote}
          </p>
        )}
      </div>
    </div>
  );
}
