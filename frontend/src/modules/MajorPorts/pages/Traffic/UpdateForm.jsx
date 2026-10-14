import { ArrowLeft } from 'lucide-react';
import TrafficWizardForm from './components/TrafficWizardForm';

export default function TrafficUpdateForm({
  record,
  onBack,
  onSuccess,
  triggerNotification,
}) {
  if (!record) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-500">
          No period selected. Open Update from the Data List.
        </p>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-[#0f417a] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Data List
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0f417a] transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Data List
        </button>
      ) : null}
      <TrafficWizardForm
        mode="update"
        record={record}
        onBack={onBack}
        onSuccess={onSuccess}
        triggerNotification={triggerNotification}
      />
    </div>
  );
}
