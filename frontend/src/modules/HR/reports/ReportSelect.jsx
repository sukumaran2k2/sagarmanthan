import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { REPORT_THEME as T } from './theme';

/**
 * Single-select dropdown rendered in the page instead of a native <select>.
 * The app sets `zoom` on #root, and Chrome places native <select> popups at the unzoomed
 * position (further off the lower the field sits), so the report filters use this list,
 * which always opens directly below its field. '' is the placeholder ("Show All") value.
 */
export default function ReportSelect({ value, onChange, options = [], placeholder = 'Show All', disabled }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const items = [{ value: '', label: placeholder }, ...options];
  const selected = items.find((o) => String(o.value) === String(value ?? '')) || items[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted option in view while moving with the keyboard.
  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    if (disabled) return;
    setActive(Math.max(0, items.indexOf(selected)));
    setOpen(true);
  };

  const choose = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (items[active]) choose(items[active]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-left text-xs font-bold outline-none transition focus:ring-[3px] focus:ring-[#4b2424]/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        style={{ background: T.surface, border: `1px solid ${open ? T.brand : T.inputBorder}`, color: T.brand }}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown size={15} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-[10px] bg-white py-1 shadow-xl animate-fade-in dark:bg-slate-900"
          style={{ border: `1px solid ${T.inputBorder}` }}
        >
          {items.map((opt, i) => {
            const isSelected = opt === selected;
            return (
              <li
                key={`${opt.value}-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(opt)}
                onMouseEnter={() => setActive(i)}
                className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs font-semibold"
                style={{
                  background: i === active ? T.accent : undefined,
                  color: isSelected ? T.brand : '#334155',
                  fontWeight: isSelected ? 800 : undefined,
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={13} className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
