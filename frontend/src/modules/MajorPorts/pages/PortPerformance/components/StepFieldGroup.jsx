import { AlertTriangle } from 'lucide-react';
import { sumGroupParts } from '../portPerformanceConfig';
import { formatQuantity } from '../../Traffic/trafficFormat';

// Same look as the Traffic commodity grid / GeM monthly-data entry table
const TH = 'p-2.5 border border-white/40 font-extrabold uppercase tracking-wider text-[11px] text-center whitespace-nowrap';
const errorTextClass = 'text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1';

const cellInputClass = (hasError, filled) =>
  `w-full min-w-[5.5rem] px-2 py-1.5 border rounded-xl text-xs font-bold text-[#0f417a] dark:text-blue-200 text-center outline-none transition focus:ring-2 focus:ring-blue-100 focus:bg-white dark:focus:bg-slate-950 disabled:opacity-60 disabled:cursor-not-allowed ${
    hasError
      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 focus:ring-rose-100'
      : filled
        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 font-black'
        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
  }`;

const inputProps = (fieldDef) => ({
  type: 'number',
  min: '0',
  max: fieldDef.kind === 'percent' ? '100' : undefined,
  step: fieldDef.kind === 'count' ? '1' : 'any',
  inputMode: fieldDef.kind === 'count' ? 'numeric' : 'decimal',
});

const isFilled = (value) => String(value ?? '').trim() !== '';

/** Hint under a group's total: the sum of its parts, flagged when the entered total differs. */
function TotalHint({ group, values }) {
  const sum = sumGroupParts(group, values);
  if (sum === null) return null;
  const total = values[group.sumOf.total];
  const differs = isFilled(total) && Math.abs(Number(total) - sum) > 0.01;
  return (
    <p className={`flex items-center gap-1 text-[10px] font-semibold mt-1 ${differs ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
      {differs ? <AlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden="true" /> : null}
      Sum of the above: {formatQuantity(sum)}{differs ? ' (differs from the total)' : ''}
    </p>
  );
}

/**
 * One group of an input step.
 * layout 'cargo': labelled inputs in a grid; 'callSize': one table row of the 10 call sizes.
 */
export default function StepFieldGroup({ group, values, fieldErrors = {}, onChange, disabled }) {
  const unit = group.unit ? ` (${group.unit})` : '';

  if (group.layout === 'callSize') {
    return (
      <section className="space-y-2" aria-label={group.title}>
        <h4 className="module-form-section-title !mt-0">{group.title}{unit}</h4>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-max w-full border-collapse text-xs text-slate-800 dark:text-slate-100">
              <thead className="bg-[#0f417a] text-white">
                <tr>
                  <th className={`${TH} text-left`}>Call Size (TEUs)</th>
                  {group.fields.map((f) => <th key={f.key} className={TH}>{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-slate-900">
                  <th scope="row" className="p-2.5 border border-slate-200 dark:border-slate-700 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    Value
                  </th>
                  {group.fields.map((f) => (
                    <td key={f.key} className="p-1.5 border border-slate-200 dark:border-slate-700 align-top">
                      <input
                        {...inputProps(f)}
                        aria-label={f.fullLabel}
                        aria-invalid={Boolean(fieldErrors[f.key])}
                        title={fieldErrors[f.key] || f.fullLabel}
                        className={cellInputClass(Boolean(fieldErrors[f.key]), isFilled(values[f.key]))}
                        value={values[f.key] ?? ''}
                        disabled={disabled}
                        onChange={(e) => onChange(f.key, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {group.fields.some((f) => fieldErrors[f.key]) ? (
          <p className={errorTextClass}>Every call size needs a valid value (enter 0 where nothing applies).</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-2" aria-label={group.title}>
      <h4 className="module-form-section-title !mt-0">{group.title}{unit}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {group.fields.map((f) => {
          const isTotal = group.sumOf?.total === f.key;
          const id = `pp-${f.key}`;
          // The group title carries the unit; only a field with a different unit shows its own
          const ownUnit = f.unit && f.unit !== group.unit && !/\(/.test(f.label) ? ` (${f.unit})` : '';
          return (
            <div key={f.key} className={isTotal ? 'rounded-xl bg-blue-50/60 dark:bg-slate-800/50 p-2 -m-2' : ''}>
              <label htmlFor={id} className="module-form-label">
                {f.label}{ownUnit} <span className="text-red-500">*</span>
              </label>
              <input
                id={id}
                {...inputProps(f)}
                aria-invalid={Boolean(fieldErrors[f.key])}
                aria-describedby={fieldErrors[f.key] ? `${id}-error` : undefined}
                title={f.fullLabel}
                className={`module-form-input ${fieldErrors[f.key] ? '!border-rose-400' : ''} ${isTotal ? 'font-black' : ''}`}
                value={values[f.key] ?? ''}
                disabled={disabled}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
              {fieldErrors[f.key] ? <p id={`${id}-error`} className={errorTextClass}>{fieldErrors[f.key]}</p> : null}
              {isTotal ? <TotalHint group={group} values={values} /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
