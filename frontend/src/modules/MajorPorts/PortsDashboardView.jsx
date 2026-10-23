import { useSearchParams } from 'react-router-dom';
import { Anchor } from 'lucide-react';
import TrafficDashboard from './pages/Traffic/dashboard/TrafficDashboard';
import FinancialDashboard from './pages/FinancialParameters/dashboard/FinancialDashboard';

// ?view= value per dashboard; Traffic & Port Performance is the default, as in the earlier portal
const DASHBOARDS = [
  {
    id: 'traffic',
    label: 'Traffic & Port Performance Dashboard',
    title: 'KPI Traffic & Port Performance Dashboard',
    description: 'Track cargo traffic and port performance KPIs of the Major Ports, year on year.',
  },
  {
    id: 'financial',
    label: 'Financial Dashboard',
    title: 'KPI Financial Dashboard',
    description: 'Track the financial parameters of the Major Ports, year on year.',
  },
];

/**
 * KPI Major Ports → Dashboard. The earlier portal's two dashboards behind its
 * "Traffic & Port Performance Dashboard | Financial Dashboard" switch:
 *  - Traffic & Port Performance: traffic, cargo, turnaround, OSBD, dwell, efficiency,
 *    pre-berthing, idle time, vessels, Overall table and Traffic KPI Summary;
 *  - Financial: the eight financial parameter cards.
 * Each one has its own filters and "Detail of KPI" drill-downs.
 */
export default function PortsDashboardView({ triggerNotification }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = DASHBOARDS.find((d) => d.id === searchParams.get('view')) || DASHBOARDS[0];

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display flex items-center gap-2">
            <Anchor className="h-5 w-5 text-[#0f417a] dark:text-blue-400" aria-hidden="true" />
            <span>{active.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            {active.description}
          </p>
        </div>

        <div role="tablist" aria-label="Dashboards" className="inline-flex flex-wrap items-center gap-0.5 border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-white dark:bg-slate-900 shadow-sm self-start lg:self-auto">
          {DASHBOARDS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={d.id === active.id}
              onClick={() => setSearchParams(d.id === DASHBOARDS[0].id ? {} : { view: d.id }, { replace: true })}
              className={`px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-lg whitespace-nowrap ${
                d.id === active.id
                  ? 'bg-[#0f417a] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {active.id === 'financial'
        ? <FinancialDashboard triggerNotification={triggerNotification} />
        : <TrafficDashboard triggerNotification={triggerNotification} />}
    </div>
  );
}
