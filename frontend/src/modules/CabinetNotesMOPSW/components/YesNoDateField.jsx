export default function YesNoDateField({
  label,
  name,
  value,
  date,
  onChange,
  onDateChange,
  disabled = false,
  readOnly = false,
  minDate,
  maxDate,
}) {
  const locked = disabled || readOnly;

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 gap-5 py-2 ${locked ? 'opacity-60' : ''}`}
    >
      <div className="space-y-1.5">
        <p className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
          {label}
        </p>
        <div className="flex items-center gap-4 pt-1">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="radio"
              name={name}
              value="Yes"
              className="accent-[#0f417a]"
              checked={value === 'Yes'}
              disabled={locked}
              onChange={() => onChange('Yes')}
            />
            Yes
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="radio"
              name={name}
              value="No"
              className="accent-[#0f417a]"
              checked={value === 'No'}
              disabled={locked}
              onChange={() => {
                onChange('No');
                onDateChange('');
              }}
            />
            No
          </label>
        </div>
      </div>
      {value === 'Yes' && (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
            Date
          </label>
          <input
            type="date"
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed dark:[color-scheme:dark]"
            value={date || ''}
            min={minDate || undefined}
            max={maxDate || undefined}
            disabled={locked}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
