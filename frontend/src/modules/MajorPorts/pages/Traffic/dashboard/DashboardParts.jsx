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

// Content area beside the sidebar: the soft indigo gradient of the other modules' dashboards
export const DASHBOARD_CONTENT_CLASS = 'flex-1 min-w-0 p-4 md:p-6 space-y-5 rounded-3xl lg:rounded-l-none border border-slate-200 dark:border-slate-800 lg:border-l-0 shadow-sm bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20';

/** Card YoY:▲ green / ▼ red (reversed for lower-is-better KPIs), grey at zero, "0%" when unknown. */
export function YoyText({ value, reverse = false, size = 'card' }) {
  const n = Number(value);
  const neutral = size === 'card'
    ? 'text-xs font-bold px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
    : 'text-slate-500';
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) {
    return <span className={`tabular-nums ${neutral}`}>0%</span>;
  }
  const text = `${Math.abs(n).toFixed(2)}%`;
  if (n === 0) return <span className={`tabular-nums ${neutral}`}>{n.toFixed(2)}%</span>;
  const good = reverse ? n < 0 : n > 0;
  const pill = size === 'card'
    ? `text-xs font-bold px-2 py-0.5 rounded-full border ${good
      ? 'bg-green-50 border-green-100 dark:bg-green-950/40 dark:border-green-900'
      : 'bg-red-50 border-red-100 dark:bg-red-950/40 dark:border-red-900'}`
    : 'font-semibold';
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

/** Panel title bar in the shared dashboard theme (indigo gradient, white caps title). */
export function PanelHeading({ icon, title, sub }) {
  const Icon = ICONS[icon] || Ship;
  return (
    <div className="mb-4 rounded-2xl overflow-hidden bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center gap-3 shadow-sm">
      <Icon className="h-4 w-4 flex-shrink-0 text-indigo-200" aria-hidden="true" />
      <div className="min-w-0">
        <h2 className="text-xs font-black text-white uppercase tracking-wider">{title}</h2>
        {sub ? <p className="text-[10px] font-medium text-indigo-200/90 mt-0.5">{sub}</p> : null}
      </div>
    </div>
  );
}

/** Section divider between card groups, as on the CAPEX dashboard. */
export function SectionDivider({ title }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3">
      <span className="flex-1 h-px bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">{title}</h4>
      <span className="flex-1 h-px bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
    </div>
  );
}

/** Small group caption inside a section. */
export function SubSectionTitle({ title }) {
  return <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#4f46e5] dark:text-indigo-300 mb-2.5">{title}</h4>;
}

/** KPI card in the shared dashboard theme: caps label and icon tile; current FY, last FY and YoY. */
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
      className="group text-left flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:focus-visible:ring-indigo-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h5 className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-snug">{config.title}</h5>
        <div className="p-2.5 rounded-xl border flex-shrink-0 bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900 transition group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-black block tabular-nums text-[#6366f1] dark:text-indigo-400">{formatValue(current, config.format)}</span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{labels.current} (YTD)</span>
      </div>
      <dl className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-2 pt-1">
          <dt className="text-slate-500 dark:text-slate-400 truncate">{labels.last} (YTD)</dt>
          <dd className="font-bold tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatValue(last, config.format)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500 dark:text-slate-400">YoY</dt>
          <dd><YoyText value={yoy} reverse={config.reverse} /></dd>
        </div>
      </dl>
    </button>
  );
}

/** Four cards per row (two on tablets, one on phones), as in the earlier page. */
export function CardGrid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-2.5">{children}</div>;
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
    <div ref={ref}>
      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5">Month</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Month"
          className="w-full flex items-center justify-between gap-2 text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 cursor-pointer"
        >
          <span className="truncate">{caption}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open ? (
          <div className="absolute z-30 mt-1.5 w-full min-w-[240px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1">
            <ul role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto text-xs font-semibold">
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

/** Plain select styled like the other dashboards' filters. */
export function DashboardSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
