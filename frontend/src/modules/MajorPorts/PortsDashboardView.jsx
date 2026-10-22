import { useSearchParams } from 'react-router-dom';
import TrafficDashboard from './pages/Traffic/dashboard/TrafficDashboard';
import FinancialDashboard from './pages/FinancialParameters/dashboard/FinancialDashboard';

// ?view= value per dashboard; Traffic & Port Performance is the default, as in the earlier portal
const DASHBOARDS = [
  { id: 'traffic', label: 'Traffic & Port Performance Dashboard', title: 'KPI Traffic & Port Performance Dashboard' },
  { id: 'financial', label: 'Financial Dashboard', title: 'KPI Financial Dashboard' },
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
    <div className="space-y-5 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-50 tracking-wide font-display uppercase">
          {active.title}
        </h1>

        <div role="tablist" aria-label="Dashboards" className="flex flex-wrap gap-1 border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-white dark:bg-slate-900 shadow-sm self-start md:self-auto">
          {DASHBOARDS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={d.id === active.id}
              onClick={() => setSearchParams(d.id === DASHBOARDS[0].id ? {} : { view: d.id }, { replace: true })}
              className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                d.id === active.id
                  ? 'bg-[#0f417a] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
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
