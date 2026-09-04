import { useState } from 'react';

export default function ProjectCompletionStage({ canSubmit, readOnly, onSubmitStage }) {
  const [actualCompletionDate, setActualCompletionDate] = useState('');
  const [closureCost, setClosureCost] = useState('');

  const disabled = !canSubmit || readOnly;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl bg-white p-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Actual Date of Completion <span className="text-rose-600">*</span>
          </label>
          <input
            type="date"
            value={actualCompletionDate}
            onChange={(e) => setActualCompletionDate(e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
          />
        </div>

        <div className="border border-slate-200 rounded-xl bg-white p-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Closure Cost (In Crore) <span className="text-rose-600">*</span>
          </label>
          <input
            type="number"
            value={closureCost}
            onChange={(e) => setClosureCost(e.target.value)}
            disabled={disabled}
            className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmitStage?.('completion', { actualCompletionDate, closureCost })}
          className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
        >
          Submit Completion
        </button>
      </div>
    </div>
  );
}
