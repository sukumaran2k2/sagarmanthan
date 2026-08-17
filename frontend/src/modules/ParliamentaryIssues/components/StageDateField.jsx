const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed dark:[color-scheme:dark]';

export default function StageDateField({
  label,
  date,
  remark = '',
  onDateChange,
  onRemarkChange,
  disabled = false,
  readOnly = false,
  minDate,
  maxDate,
}) {
  const locked = disabled || readOnly;
  const showRemark = Boolean(String(date || '').trim());

  return (
    <div className={`space-y-2 py-2 ${locked ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className={labelClass}>{label}</label>
          <input
            type="date"
            className={inputClass}
            value={date || ''}
            min={minDate || undefined}
            max={maxDate || undefined}
            disabled={locked}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      </div>
      {showRemark && onRemarkChange && (
        <div className="space-y-1.5">
          <label className={labelClass}>Stage remarks</label>
          <input
            type="text"
            className={inputClass}
            value={remark || ''}
            disabled={locked}
            placeholder="Optional"
            onChange={(e) => onRemarkChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
