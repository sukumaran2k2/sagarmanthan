import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';

/**
 * Accessible multi-select dropdown (no external dependency).
 *
 * options:     [{ value, label }]
 * value:       array of selected values
 * onChange:    (nextValues) => void   (values keep the order of `options`)
 * minSelected: values that must stay selected (e.g. 1 keeps at least one)
 * defaultValue: values restored by "Reset" (omit to hide the Reset action)
 */
export default function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select',
  minSelected = 0,
  defaultValue,
  maxChips = 2,
  disabled = false,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const panelRef = useRef(null);
  const listId = useId();
  const [panelPos, setPanelPos] = useState(null);

  const selected = useMemo(() => new Set(value.map(String)), [value]);
  const orderedSelection = options.filter((o) => selected.has(String(o.value)));
  const allSelected = options.length > 0 && orderedSelection.length === options.length;

  const emit = (nextSet) => {
    if (nextSet.size < minSelected) return;
    onChange(options.filter((o) => nextSet.has(String(o.value))).map((o) => o.value));
  };

  const toggle = (optionValue) => {
    const next = new Set(selected);
    const key = String(optionValue);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    emit(next);
  };

  const selectAll = () => emit(new Set(options.map((o) => String(o.value))));
  const clear = () => {
    if (minSelected > 0) return;
    emit(new Set());
  };

  // Close on outside click (the panel is portalled, so check both elements).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // The panel is rendered in <body> so tables or animated containers can't cover or clip it.
  // Position it under the button (or above when there is no room) and follow scroll/resize.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const PANEL_MAX = 280;
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom;
      const up = below < PANEL_MAX && r.top > below;
      setPanelPos({
        left: r.left,
        width: r.width,
        top: up ? undefined : r.bottom + 4,
        bottom: up ? window.innerHeight - r.top + 4 : undefined,
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  // Keep the active option in view and focused.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelectorAll('[role="option"]')[activeIndex]?.focus();
  }, [open, activeIndex]);

  const openList = () => {
    if (disabled) return;
    const firstSelected = options.findIndex((o) => selected.has(String(o.value)));
    setActiveIndex(firstSelected >= 0 ? firstSelected : 0);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onButtonKeyDown = (e) => {
    if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) toggle(opt.value);
    }
  };

  const summary =
    orderedSelection.length === 0 ? (
      <span className="text-slate-400">{placeholder}</span>
    ) : allSelected && options.length > maxChips ? (
      <span className="truncate">All ({options.length})</span>
    ) : (
      <span className="flex min-w-0 items-center gap-1">
        {orderedSelection.slice(0, maxChips).map((o) => (
          <span
            key={o.value}
            className="inline-flex shrink-0 items-center rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-[#0f417a] dark:bg-blue-950/60 dark:text-blue-300"
          >
            {o.label}
          </span>
        ))}
        {orderedSelection.length > maxChips && (
          <span className="shrink-0 text-[11px] font-semibold text-slate-500">+{orderedSelection.length - maxChips} more</span>
        )}
      </span>
    );

  const canClear = minSelected === 0 && orderedSelection.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white py-2 pl-2.5 pr-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0f417a] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer min-h-[38px]"
      >
        <span className="min-w-0 flex-1 overflow-hidden">{summary}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', left: panelPos.left, width: panelPos.width, top: panelPos.top, bottom: panelPos.bottom }}
          className="z-[100000] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-1.5 text-[11px] dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              {orderedSelection.length} of {options.length} selected
            </span>
            <span className="flex items-center gap-2 font-semibold">
              {!allSelected && (
                <button type="button" onClick={selectAll} className="text-[#0f417a] hover:underline dark:text-blue-300 cursor-pointer">
                  Select all
                </button>
              )}
              {defaultValue && (
                <button type="button" onClick={() => onChange(defaultValue)} className="text-slate-500 hover:underline cursor-pointer">
                  Reset
                </button>
              )}
              {canClear && (
                <button type="button" onClick={clear} className="inline-flex items-center gap-0.5 text-slate-500 hover:underline cursor-pointer">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </span>
          </div>

          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            onKeyDown={onListKeyDown}
            className="max-h-56 overflow-y-auto py-1"
          >
            {options.map((o, i) => {
              const isSelected = selected.has(String(o.value));
              const locked = isSelected && orderedSelection.length <= minSelected;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={locked || undefined}
                  tabIndex={i === activeIndex ? 0 : -1}
                  onClick={() => toggle(o.value)}
                  onMouseEnter={() => setActiveIndex(i)}
                  title={locked ? 'At least one must stay selected' : undefined}
                  className={`flex cursor-pointer select-none items-center gap-2 px-2.5 py-1.5 text-xs outline-none ${
                    i === activeIndex ? 'bg-slate-100 dark:bg-slate-800' : ''
                  } ${isSelected ? 'font-semibold text-[#0f417a] dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-[#0f417a] bg-[#0f417a] text-white dark:border-blue-500 dark:bg-blue-500'
                        : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {o.label}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
