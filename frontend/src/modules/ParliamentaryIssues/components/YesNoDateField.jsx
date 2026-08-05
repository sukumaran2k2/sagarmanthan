export default function YesNoDateField({
  label,
  name,
  value,
  date,
  onChange,
  onDateChange,
  disabled = false,
  readOnly = false,
}) {
  const locked = disabled || readOnly;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 py-2 ${locked ? 'opacity-60' : ''}`}>
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">{label}</p>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="radio"
              name={name}
              value="Yes"
              checked={value === 'Yes'}
              disabled={locked}
              onChange={() => onChange('Yes')}
            />
            Yes
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="radio"
              name={name}
              value="No"
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
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
          <input
            type="date"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={date || ''}
            disabled={locked}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
