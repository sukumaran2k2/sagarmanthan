import { useEffect, useRef, useState } from 'react';
import {
  Anchor, ArrowDown, ArrowUp, Boxes, ChartBar, ChartLine, ChevronDown, Clock, Cog, Coins, Droplet, Factory,
  Hourglass, Info, Ship, ShipWheel, Truck,
} from 'lucide-react';
import { FY_MONTHS } from '../trafficConstants';
import { allMonthsFor, formatValue, readPath, sortFiscalMonths } from './dashboardConfig';

// Font Awesome icons of the earlier page → nearest lucide icon
const ICONS = {
  ship: Ship, up: ArrowUp, down: ArrowDown, clock: Clock, line: ChartLine, industry: Factory, anchor: Anchor,
  boxes: Boxes, gears: Cog, droplet: Droplet, truck: Truck, hourglass: Hourglass, ferry: ShipWheel,
  bars: ChartBar, info: Info, coins: Coins,
};

/** Card YoY: ▲ green / ▼ red (reversed for lower-is-better KPIs), grey at zero, "0%" when unknown. */
export function YoyText({ value, reverse = false, size = 'card' }) {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) {
    return <span className="tabular-nums">0%</span>;
  }
  const text = `${Math.abs(n).toFixed(2)}%`;
  if (n === 0) return <span className="tabular-nums text-slate-500">{n.toFixed(2)}%</span>;
  const good = reverse ? n < 0 : n > 0;
  const pill = size === 'card' ? 'text-[16px] font-medium px-2 py-0.5' : 'font-semibold';
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${pill} ${good ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      <span aria-hidden="true">{n > 0 ? '▲' : '▼'}</span>
      <span className="sr-only">{n > 0 ? 'up' : 'down'}</span>
      {text}
    </span>
  );
}

/** Left navigation of the earlier dashboard (navy bar, icon above a small label). */
export function DashboardSidebar({ panels, active, onSelect }) {
  return (
    <nav
      aria-label="Dashboard panels"
      className="flex lg:flex-col items-center gap-2 lg:w-[120px] flex-shrink-0 bg-[#020c6a] py-2.5 px-2 lg:px-0 overflow-x-auto lg:overflow-visible lg:self-stretch rounded-xl lg:rounded-none lg:rounded-l-xl"
    >
      {panels.map((panel, index) => {
        const Icon = ICONS[panel.icon] || Info;
        const isActive = panel.id === active;
        return (
          <div key={panel.id} className="flex lg:flex-col items-center gap-2">
            {index > 0 ? <div className="hidden lg:block w-[54px] h-px bg-white/10 my-1" aria-hidden="true" /> : null}
            <button
              type="button"
              onClick={() => onSelect(panel.id)}
              aria-current={isActive ? 'page' : undefined}
              title={panel.label}
              className={`relative flex flex-col items-center justify-center gap-[3px] w-[72px] min-h-[64px] px-1 py-2 rounded-[10px] transition cursor-pointer ${
                isActive ? 'bg-white/20 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white/90'
              }`}
            >
              {isActive ? <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[5px] rounded-r bg-sky-400" aria-hidden="true" /> : null}
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="text-[9px] font-medium leading-tight tracking-wide text-center max-w-[65px] break-words">{panel.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

export function PanelHeading({ icon, title, sub }) {
  const Icon = ICONS[icon] || Ship;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5 pb-2 border-b-2 border-[#e8edf5] dark:border-slate-800">
        <Icon className="h-5 w-5 text-[#020c6a] dark:text-blue-300" aria-hidden="true" />
        <h2 className="text-lg font-bold text-[#020c6a] dark:text-blue-200">{title}</h2>
      </div>
      {sub ? <p className="text-xs text-[#888] dark:text-slate-400 mt-1 ml-[30px]">{sub}</p> : null}
    </div>
  );
}

/** The earlier KPI card: gradient header; current FY and last FY with dots; YoY row below a rule. */
export function KpiCard({ config, data, labels, onOpen }) {
  const Icon = ICONS[config.icon] || Ship;
  const source = data?.[config.source];
  const current = readPath(source, config.fields.current);
  const last = readPath(source, config.fields.last);
  const yoy = readPath(source, config.fields.yoy);
  return (
    <button
      type="button"
      onClick={() => onOpen(config)}
      className="group text-left flex flex-col justify-between min-h-[200px] rounded-[10px] overflow-hidden bg-white dark:bg-slate-900 border border-black/5 dark:border-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.1)] transition duration-200 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#207fdf]"
    >
      <div className="flex items-center gap-2.5 px-3 py-[9px] text-white bg-gradient-to-br from-[#207fdf] to-[#093d72]">
        <Icon className="h-4 w-4 flex-shrink-0 opacity-90" aria-hidden="true" />
        <h5 className="text-[15px] font-medium leading-[1.6]">{config.title}</h5>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[16px] text-[#3b3b3b] dark:text-slate-300">
            <span className="h-[7px] w-[7px] rounded-full bg-current opacity-70" aria-hidden="true" />
            {labels.current} (YTD)
          </span>
          <span className="text-[26px] font-bold tabular-nums text-[#1f2d3d] dark:text-slate-50">{formatValue(current, config.format)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[16px] text-[#3b3b3b] dark:text-slate-300">
            <span className="h-[7px] w-[7px] rounded-full bg-[#bbb]" aria-hidden="true" />
            {labels.last} (YTD)
          </span>
          <span className="text-[26px] font-bold tabular-nums text-[#1f2d3d] dark:text-slate-50">{formatValue(last, config.format)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-black/[0.07] dark:border-slate-800">
          <span className="text-[25px] font-medium text-[#555] dark:text-slate-300">YoY</span>
          <span className="text-[25px] font-medium text-[#555]"><YoyText value={yoy} reverse={config.reverse} /></span>
        </div>
      </div>
    </button>
  );
}

/** Four cards per row (two on tablets, one on phones), as in the earlier page. */
export function CardGrid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[15px] mb-2.5">{children}</div>;
}

/** Month multi-select with the earlier "All Months (FY April-March)" and "Clear All Months" choices. */
export function MonthPicker({ value, onChange, fiscalYear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (month) => {
    onChange(sortFiscalMonths(value.includes(month) ? value.filter((m) => m !== month) : [...value, month]));
  };
  const caption = value.length
    ? sortFiscalMonths(value).map((m) => FY_MONTHS.find((f) => f.value === m)?.label).join(', ')
    : '--Select month--';

  return (
    <div className="space-y-1" ref={ref}>
      <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Month</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Month"
          className="w-full flex items-center justify-between gap-2 text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-[#ccc] dark:border-slate-700 rounded-md font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <span className="truncate">{caption}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open ? (
          <div className="absolute z-30 mt-1 w-full min-w-[240px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1">
            <ul role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(allMonthsFor(fiscalYear)); setOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  All Months (FY April-March)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { onChange([]); setOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Clear All Months
                </button>
              </li>
              {FY_MONTHS.map((m) => (
                <li key={m.value}>
                  <label className="flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value.includes(m.value)}
                      onChange={() => toggle(m.value)}
                      className="h-3.5 w-3.5 rounded cursor-pointer"
                    />
                    {m.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Plain select styled like the earlier filter bar. */
export function DashboardSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-[#ccc] dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
