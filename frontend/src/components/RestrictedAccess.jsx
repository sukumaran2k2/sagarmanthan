import { ShieldOff, Home } from 'lucide-react';

export default function RestrictedAccess({ moduleName, onGoHome }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mt-6 max-w-xl mx-auto">
      <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-900">
        <ShieldOff className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Access Restricted</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
        You do not have permission to open
        {moduleName ? (
          <>
            {' '}
            <strong className="text-slate-700 dark:text-slate-200">{moduleName}</strong>
          </>
        ) : (
          ' this module'
        )}
        . Contact your administrator if you need access.
      </p>
      {onGoHome && (
        <button
          type="button"
          onClick={onGoHome}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow transition cursor-pointer"
        >
          <Home className="h-3.5 w-3.5" />
          Back to Home
        </button>
      )}
    </div>
  );
}
