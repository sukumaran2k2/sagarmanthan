import { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Heart, Coins, CheckCircle2, TrendingUp, Filter, RefreshCw, X, ChevronRight } from 'lucide-react';
import { fetchCsrDashboard, fetchCsrProjectStageWise, fetchDetailedCsrProjects } from '../api';
import { CSR_FOCUS_AREAS, FINANCIAL_YEARS, STATUS_COLORS } from '../utils/constants';
import { formatDate } from '../utils/listExport';
import { formatCrore } from '../utils/amounts';
import { useCsrStore } from '../store/useCsrStore';
import { COMMON_TOASTS } from '../../../utils/notify';

const STATUS_CARDS = [
  { key: 'Approved by Board', label: 'Approved by Board' },
  { key: 'Project yet to start', label: 'Project Yet to Start' },
  { key: 'Project Under implementation', label: 'Under Implementation' },
  { key: 'Completed', label: 'Completed' },
];

const selectClass = 'text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer';

export default function Dashboard({ notify, isOrgUser }) {
  const { filters, drilldownStage, organisations, clusters } = useCsrStore(useShallow((state) => ({
    filters: state.dashboardFilters,
    drilldownStage: state.drilldownStage,
    organisations: state.organisations,
    clusters: state.clusters,
  })));
  const { setDashboardFilters, resetDashboardFilters, setDrilldownStage } = useCsrStore(useShallow((state) => ({
    setDashboardFilters: state.setDashboardFilters,
    resetDashboardFilters: state.resetDashboardFilters,
    setDrilldownStage: state.setDrilldownStage,
  })));

  // Organisation users always get their own organisation (the server applies it)
  const clusterId = isOrgUser ? 0 : filters.cluster;
  const organisationId = isOrgUser ? 0 : filters.organisation;
  const [reloadKey, setReloadKey] = useState(0);

  // Totals and status counts, tagged with the request they answer
  const requestKey = JSON.stringify([clusterId, organisationId, filters.financialYear, filters.focus, reloadKey]);
  const [result, setResult] = useState(null); // { key, summary, stageWise }
  useEffect(() => {
    let cancelled = false;
    const args = [clusterId, organisationId, filters.financialYear, filters.focus];
    Promise.all([fetchCsrDashboard(...args), fetchCsrProjectStageWise(...args)])
      .then(([summary, stageWise]) => {
        if (!cancelled) setResult({ key: requestKey, summary: summary?.combinedTotals || {}, stageWise: Array.isArray(stageWise) ? stageWise : [] });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading CSR dashboard data', err);
        setResult({ key: requestKey, summary: {}, stageWise: [] });
        notify(COMMON_TOASTS.loadFailed('The CSR dashboard'));
      });
    return () => { cancelled = true; };
  }, [requestKey, clusterId, organisationId, filters.financialYear, filters.focus, notify]);
  const loading = result?.key !== requestKey;

  // Projects for the selected status card
  const detailKey = JSON.stringify([requestKey, drilldownStage]);
  const [detail, setDetail] = useState(null); // { key, rows }
  useEffect(() => {
    let cancelled = false;
    fetchDetailedCsrProjects(clusterId, organisationId, filters.financialYear, drilldownStage, filters.focus)
      .then((res) => {
        if (!cancelled) setDetail({ key: detailKey, rows: Array.isArray(res) ? res : [] });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading detailed projects', err);
        setDetail({ key: detailKey, rows: [] });
        notify(COMMON_TOASTS.loadFailed('The CSR project list'));
      });
    return () => { cancelled = true; };
  }, [detailKey, clusterId, organisationId, filters.financialYear, filters.focus, drilldownStage, notify]);
  const loadingDetails = detail?.key !== detailKey;
  const detailedProjects = loadingDetails ? [] : detail.rows;

  const summary = loading ? {} : result.summary;
  const countFor = useMemo(() => {
    const rows = loading ? [] : result.stageWise;
    return (status) => Number(rows.find((s) => s.project_status === status)?.stage_wise_count) || 0;
  }, [loading, result]);

  const totalProjects = Number(summary.total_csr_projects) || 0;
  const totalValueCr = Number(summary.total_project_value) || 0; // the server returns crore
  const completedCount = countFor('Completed');
  const ongoingCount = countFor('Project Under implementation');

  const hasActiveFilters = (!isOrgUser && (filters.cluster !== 0 || filters.organisation !== 0))
    || filters.financialYear !== 'all' || filters.focus !== 0;

  const kpis = [
    {
      label: 'Total CSR Projects', value: totalProjects, valueClass: 'text-slate-800 dark:text-slate-100', icon: Heart, tone: 'blue',
      foot: <><span className="text-blue-600 dark:text-blue-400 font-bold">₹{totalValueCr.toFixed(2)} Cr</span> total project value</>,
    },
    {
      label: 'Completed', value: completedCount, valueClass: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2, tone: 'emerald',
      foot: <><span className="text-emerald-600 dark:text-emerald-400 font-bold">{totalProjects > 0 ? ((completedCount / totalProjects) * 100).toFixed(1) : 0}%</span> completion rate</>,
    },
    {
      label: 'In Progress', value: ongoingCount, valueClass: 'text-indigo-600 dark:text-indigo-400', icon: TrendingUp, tone: 'indigo',
      foot: 'Under active execution',
    },
    {
      label: 'Total Value', value: `₹${totalValueCr.toFixed(2)} Cr`, valueClass: 'text-amber-600 dark:text-amber-400', icon: Coins, tone: 'amber',
      foot: isOrgUser ? 'Your organisation' : 'Across the selected organisations',
    },
  ];
  const TONES = {
    blue: 'bg-blue-50 dark:bg-blue-950/50 text-[#0f417a] dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
    amber: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="module-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <span>Dashboard Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isOrgUser && clusters.length > 0 && (
              <select value={filters.cluster} onChange={(e) => setDashboardFilters({ cluster: Number(e.target.value) })} className={selectClass}>
                <option value={0}>All Clusters</option>
                {clusters.map((c) => <option key={c.hr_cluster_id} value={c.hr_cluster_id}>{c.hr_cluster_name}</option>)}
              </select>
            )}
            {!isOrgUser && (
              <select value={filters.organisation} onChange={(e) => setDashboardFilters({ organisation: Number(e.target.value) })} className={selectClass}>
                <option value={0}>All Organisations</option>
                {organisations.map((o) => <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>)}
              </select>
            )}
            <select value={filters.financialYear} onChange={(e) => setDashboardFilters({ financialYear: e.target.value })} className={selectClass}>
              <option value="all">All Financial Years</option>
              {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
            </select>
            <select value={filters.focus} onChange={(e) => setDashboardFilters({ focus: Number(e.target.value) })} className={`${selectClass} max-w-[200px]`}>
              <option value={0}>All Focus Areas</option>
              {CSR_FOCUS_AREAS.map((fa) => <option key={fa.id} value={fa.id}>{fa.name}</option>)}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { resetDashboardFilters(); notify(COMMON_TOASTS.filtersReset()); }}
                className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              title="Refresh"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="module-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{k.label}</p>
                  <h3 className={`text-2xl font-black mt-1 ${k.valueClass}`}>{loading ? '…' : k.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${TONES[k.tone]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-slate-500">{k.foot}</div>
            </div>
          );
        })}
      </div>

      {/* Status cards: pick one to list its projects */}
      <div className="module-card">
        <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider mb-4 flex items-center justify-between">
          <span>Project Status Breakdown</span>
          <span className="text-[10px] font-bold text-slate-400">Choose a card to list its projects</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[{ key: 'all', label: 'All Projects', count: totalProjects }, ...STATUS_CARDS.map((s) => ({ ...s, count: countFor(s.key) }))].map((card) => {
            const isSelected = drilldownStage === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setDrilldownStage(card.key)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#0f417a] dark:border-blue-500 ring-2 ring-[#0f417a]/20'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{card.label}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{loading ? '…' : card.count}</p>
                </div>
                <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects for the selected card */}
      <div className="module-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
            {drilldownStage === 'all' ? 'All CSR Projects' : `CSR Projects: ${drilldownStage}`}
          </h4>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            {loadingDetails ? 'Loading…' : `Showing ${detailedProjects.length} project(s) matching the filters`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 w-12 text-center">#</th>
                {!isOrgUser && <th className="py-3 px-4">Organisation</th>}
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Financial Year</th>
                <th className="py-3 px-4 text-right">Value (₹ Cr)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Physical %</th>
                <th className="py-3 px-4 text-center">Financial %</th>
                <th className="py-3 px-4">Completed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loadingDetails ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-[#0f417a] mb-2" />
                    Loading project records...
                  </td>
                </tr>
              ) : detailedProjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">No CSR projects match the selected filters.</td>
                </tr>
              ) : detailedProjects.map((p, idx) => {
                const statusStyle = STATUS_COLORS[p.project_status] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
                return (
                  <tr key={p.csr_project_id ?? idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    {!isOrgUser && (
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 max-w-[200px] truncate" title={p.organisation_name}>{p.organisation_name || '-'}</td>
                    )}
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100 max-w-[280px]">
                      <p className="line-clamp-2" title={p.project_name}>{p.project_name}</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">{p.financial_year || '-'}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-100">{formatCrore(p.project_value)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                        {p.project_status || 'Yet to start'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{p.physical_progress != null ? `${p.physical_progress}%` : '-'}</td>
                    <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">{p.financial_progress != null ? `${p.financial_progress}%` : '-'}</td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">{formatDate(p.completed_on)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
