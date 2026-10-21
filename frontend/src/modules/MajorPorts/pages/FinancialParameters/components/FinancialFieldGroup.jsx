import { Calculator, Info } from 'lucide-react';
import { fieldLabel } from '../financialParametersConfig';

const errorTextClass = 'text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1';

const formatComputed = (value) => (value === null || value === undefined
  ? ''
  : Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/**
 * One titled group of the Financial Parameters forms. Computed fields are shown read-only
 * from `derived`; every other field is a number input bound to `values`.
 */
export default function FinancialFieldGroup({
  title,
  note,
  fields,
  values,
  derived = {},
  errors = {},
  onChange,
  disabled,
  idPrefix,
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div>
        <h4 className="module-form-section-title !mt-0">{title}</h4>
        {note ? (
          <p className="flex items-center gap-1.5 -mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Info className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
            {note}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {fields.map((f) => {
          const id = `${idPrefix}-${f.key}`;
          if (f.computed) {
            return (
              <div key={f.key} className="rounded-xl bg-blue-50/60 dark:bg-slate-800/50 p-2 -m-2">
                <label htmlFor={id} className="module-form-label flex items-center gap-1.5">
                  <Calculator className="h-3 w-3 text-[#0f417a] dark:text-blue-400" aria-hidden="true" />
                  {fieldLabel(f)}
                </label>
                <input
                  id={id}
                  className="module-form-input font-black tabular-nums"
                  value={formatComputed(derived[f.key])}
                  placeholder="Calculated automatically"
                  readOnly
                  disabled
                />
              </div>
            );
          }
          const error = errors[f.key];
          return (
            <div key={f.key}>
              <label htmlFor={id} className="module-form-label">
                {fieldLabel(f)} {f.required ? <span className="text-red-500">*</span> : null}
              </label>
              <input
                id={id}
                type="number"
                step="any"
                min={f.kind === 'amount' ? '0' : undefined}
                inputMode="decimal"
                className={`module-form-input tabular-nums ${error ? '!border-rose-400' : ''}`}
                value={values[f.key] ?? ''}
                disabled={disabled}
                onChange={(e) => onChange(f.key, e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
              />
              {error ? <p id={`${id}-error`} className={errorTextClass}>{error}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
