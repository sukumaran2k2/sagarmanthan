const labelClass =
  'block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider';
const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed dark:[color-scheme:dark]';

export default function StageDateField({
  stageNumber,
  label,
  dateLabel = 'Date',
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
    <div
      className={`rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-4 shadow-sm shadow-emerald-100/30 dark:border-emerald-900/40 dark:bg-emerald-950/10 ${
        locked ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="pr-2">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {stageNumber ? `${stageNumber}. ` : ''}
            {label}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 md:min-w-[300px] md:max-w-[340px] md:w-full">
          <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-end">
            <label className={`${labelClass} md:text-right md:mb-0 whitespace-nowrap`}>
              {dateLabel}
            </label>
            <input
              type="date"
              className={`${inputClass} md:max-w-[170px]`}
              value={date || ''}
              min={minDate || undefined}
              max={maxDate || undefined}
              disabled={locked}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
        </div>
      </div>
      {showRemark && onRemarkChange && (
        <div className="mt-3 space-y-1.5 border-t border-emerald-100/80 pt-3 dark:border-emerald-900/30">
          <label className={labelClass}>Remarks</label>
          <textarea
            className={inputClass}
            value={remark || ''}
            disabled={locked}
            placeholder="Add remarks here..."
            rows={2}
            onChange={(e) => onRemarkChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
