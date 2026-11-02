import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, SquarePen, Trash2, Loader2 } from 'lucide-react';

// Form building blocks for HR popups (vacancy activity, HR Administration).
// Deliberately plain: one navy accent, neutral borders, no gradients, glows or icon tiles.

const NAVY = '#1b3a6b';

export function HrModal({ isOpen, title, subtitle, onClose, busy = false, maxWidth = 'max-w-[720px]', children, footer }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white dark:bg-slate-900 rounded-md shadow-xl border border-slate-300 dark:border-slate-700 w-full ${maxWidth} max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden my-auto`}
      >
        <div className="shrink-0 flex items-start justify-between gap-4 px-5 py-3 text-white" style={{ backgroundColor: NAVY }}>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-6 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-blue-100/90 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="mt-0.5 p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Label/value pairs that describe what the popup is acting on. */
export function ContextStrip({ items }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mb-3 px-3 py-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
          <dd className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate" title={value || ''}>
            {value || '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children }) {
  return (
    <h4 className="mt-3 mb-1 pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {children}
    </h4>
  );
}

export function FormRow({ label, required, error, hint, children }) {
  return (
    <div className="py-1.5 grid grid-cols-12 gap-x-4 gap-y-1 items-start">
      <label className="col-span-12 sm:col-span-5 sm:pt-2 text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-5">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      <div className="col-span-12 sm:col-span-7">
        {children}
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

function inputClass({ disabled, error }) {
  const base =
    'w-full h-9 text-sm px-2.5 rounded border outline-none transition-colors dark:[color-scheme:dark]';
  if (disabled) {
    return `${base} bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed`;
  }
  if (error) {
    return `${base} bg-white dark:bg-slate-950 border-red-500 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20`;
  }
  return `${base} bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15 dark:focus:border-blue-400`;
}

export function DateInput({ value, onChange, disabled, min, max, error }) {
  return (
    <input
      type="date"
      value={value || ''}
      min={min || undefined}
      max={max || undefined}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass({ disabled, error })}
    />
  );
}

export function TextInput({ value, onChange, disabled, readOnly, type = 'text', min, maxLength, placeholder, error }) {
  return (
    <input
      type={type}
      min={min}
      maxLength={maxLength}
      value={value ?? ''}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={inputClass({ disabled: disabled || readOnly, error })}
    />
  );
}

export function TextArea({ value, onChange, disabled, placeholder, error, rows = 2 }) {
  return (
    <textarea
      rows={rows}
      value={value ?? ''}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass({ disabled, error }).replace('h-9', '')} py-2 resize-y`}
    />
  );
}

export function SelectInput({ value, onChange, disabled, options = [], placeholder = 'Select', error }) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass({ disabled, error })} appearance-none pr-8 cursor-pointer`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  );
}

export function RadioGroup({ name, value, onChange, options, disabled, vertical = false }) {
  return (
    <div className={`flex ${vertical ? 'flex-col gap-1.5' : 'items-center gap-5'} min-h-9 justify-center`}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`inline-flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200 select-none ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={String(value) === String(opt.value)}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
            className="h-4 w-4 accent-[#1b3a6b]"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export function Note({ children }) {
  return (
    <p className="my-2 pl-3 py-1.5 border-l-2 border-slate-400 dark:border-slate-600 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
      {children}
    </p>
  );
}

/**
 * A sequential process shown as numbered steps. Each step is { key, label, required, done, children }.
 */
export function StageList({ steps }) {
  return (
    <ol className="relative my-1 ml-2.5 border-l border-slate-300 dark:border-slate-700">
      {steps.map((step, i) => (
        <li key={step.key} className="relative pl-6 -ml-px">
          <span
            className={`absolute -left-[10px] top-3 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
              step.done
                ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            {i + 1}
          </span>
          <FormRow label={step.label} required={step.required} error={step.error}>
            {step.children}
          </FormRow>
        </li>
      ))}
    </ol>
  );
}

// Buttons follow the shared module design (as Young Professionals): primary = brand blue,
// secondary = outlined, danger = rose for destructive actions; busy shows a spinner.
const BUTTON_STYLES = {
  primary: 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white border-[#0f417a] shadow-md shadow-blue-900/10 dark:hover:bg-[#0a2d55]',
  secondary:
    'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-md shadow-rose-900/10',
};

export function Button({ variant = 'secondary', busy = false, children, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl border text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${BUTTON_STYLES[variant] || BUTTON_STYLES.secondary} ${className}`}
      {...props}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/**
 * Footer of a popup: Cancel (outlined) and the action. submitType="submit" for a popup that is a form;
 * submitVariant="danger" for a destructive action such as Delete.
 */
export function ModalButtons({
  onCancel, onSubmit, busy, submitLabel = 'Save', busyLabel = 'Saving…', submitDisabled, cancelLabel = 'Cancel',
  submitVariant = 'primary', submitType = 'button',
}) {
  return (
    <div className="flex items-center gap-2 ml-auto">
      <Button onClick={onCancel} disabled={busy}>
        {cancelLabel}
      </Button>
      <Button variant={submitVariant} type={submitType} onClick={onSubmit} busy={busy} disabled={busy || submitDisabled}>
        {busy ? busyLabel : submitLabel}
      </Button>
    </div>
  );
}

/**
 * Footer of an input form (as Young Professionals): the mandatory note on the left, Exit (outlined)
 * and Submit / Update (primary, with a spinner while saving) on the right. The submit button submits the form.
 */
export function FormActions({
  onExit, exitLabel = 'Exit', submitLabel = 'Submit', busyLabel = 'Saving...', busy = false, submitDisabled = false,
  submitTitle, extra = null, showMandatoryNote = true,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-2 border-t border-slate-100 dark:border-slate-800">
      {showMandatoryNote ? (
        <span className="text-xs text-rose-500 font-bold italic">* Fields marked with a red asterisk are mandatory</span>
      ) : <span />}
      <div className="flex items-center gap-3">
        {extra}
        <Button onClick={onExit} disabled={busy} className="h-10 px-5">{exitLabel}</Button>
        <Button variant="primary" type="submit" busy={busy} disabled={busy || submitDisabled} title={submitTitle} className="h-10 px-6">
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function MandatoryHint() {
  return (
    <span className="text-xs text-slate-500 dark:text-slate-400">
      <span className="text-red-600">*</span> Mandatory
    </span>
  );
}

/**
 * Delete action used in table rows across HR: rose bin icon, no fill (pairs with EditActionButton).
 * solid: a filled red button, for a table whose only action is delete.
 */
export function DeleteActionButton({ label, onClick, disabled, solid = false }) {
  const look = solid
    ? 'p-2 bg-rose-600 text-white hover:bg-rose-700 shadow-sm disabled:hover:bg-rose-600'
    : 'p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 disabled:hover:bg-transparent';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400/40 disabled:opacity-40 disabled:cursor-not-allowed ${look}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

/** Edit / update action used in table rows across HR: amber pen icon, no fill. */
export function EditActionButton({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      <SquarePen className="h-4 w-4" />
    </button>
  );
}

// Identifiers share one font treatment; only post codes also get the yellow tag.
const CODE_FONT = 'font-bold text-xs tracking-tight';

/** Post ID, reference / personnel no., employee ID: same font as a post code, no tag. */
export function CodeText({ children }) {
  if (children === null || children === undefined || children === '') {
    return <span className="text-slate-400">—</span>;
  }
  return <span className={`${CODE_FONT} text-slate-800 dark:text-slate-100`}>{children}</span>;
}

/** Post code: yellow tag. */
export function PostCodeTag({ children }) {
  if (children === null || children === undefined || children === '') {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <span
      className={`inline-flex items-center justify-center pl-2.5 pr-4 py-0.5 bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 dark:from-yellow-800/80 dark:via-yellow-700/70 dark:to-amber-800/60 text-amber-950 dark:text-yellow-100 select-all ${CODE_FONT}`}
      style={{ clipPath: 'polygon(0% 0%, 100% 0%, calc(100% - 8px) 50%, 100% 100%, 0% 100%)' }}
    >
      {children}
    </span>
  );
}

/**
 * Icon + label tabs for an HR page's sub-pages. variant 'strip': underlined strip with a filled
 * navy active tab (Input Forms); 'pill': bordered pill buttons (Non Port Monthly Upload).
 */
export function HrIconTabs({ tabs, current, onChange, label, variant = 'strip' }) {
  const pill = variant === 'pill';
  return (
    <div
      role="tablist"
      aria-label={label}
      className={pill
        ? 'flex flex-wrap items-center gap-2'
        : 'flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2'}
    >
      {tabs.map(({ id, label: tabLabel, icon: Icon }) => {
        const active = current === id;
        const look = pill
          ? (active
            ? 'border-[#0f417a] bg-[#0f417a] text-white shadow-sm'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-[#0f417a]')
          : (active
            ? 'border-[#0f417a] bg-[#0f417a] text-white shadow-sm'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-[#0f417a] hover:bg-slate-100 dark:hover:bg-slate-800');
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${pill ? 'font-semibold' : 'font-bold uppercase tracking-wide'} ${look}`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />}
            <span>{tabLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
