import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Coins, CheckCircle2, Clock, 
  TrendingUp, Filter, RefreshCw, X, ChevronRight 
} from 'lucide-react';
import { 
  fetchCsrDashboard, 
  fetchCsrFundAllocated, 
  fetchCsrProjectStageWise, 
  fetchCsrProjectCountWise,
  fetchDetailedCsrProjects,
  fetchOrganisations,
  fetchClusters
} from '../api';
import { CSR_FOCUS_AREAS, FINANCIAL_YEARS, STATUS_COLORS } from '../utils/constants';
import { isOrganisationUser, getSessionOrganisationId } from '../../../utils/authSession';

export default function Dashboard({ triggerNotification }) {
  const isOrgUser = useMemo(() => isOrganisationUser(), []);
  const userOrgId = getSessionOrganisationId();

  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [organisations, setOrganisations] = useState([]);

  // Filters
  const [selectedCluster, setSelectedCluster] = useState(0);
  const [selectedOrg, setSelectedOrg] = useState(0);
  const [selectedFY, setSelectedFY] = useState('all');
  const [selectedFocus, setSelectedFocus] = useState(0);

  // Data states
  const [summaryData, setSummaryData] = useState([]);
  const [stageWiseData, setStageWiseData] = useState([]);
  const [fundData, setFundData] = useState([]);
  const [countWiseData, setCountWiseData] = useState([]);

  // Drilldown detailed projects
  const [selectedDrilldownStage, setSelectedDrilldownStage] = useState('all');
  const [detailedProjects, setDetailedProjects] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [orgs, cls] = await Promise.all([fetchOrganisations(), fetchClusters()]);
        setOrganisations(Array.isArray(orgs) ? orgs : []);
        setClusters(Array.isArray(cls) ? cls : []);
      } catch (err) {
        console.error("Error loading masters", err);
      }
    };
    loadMasters();
  }, []);

  const effectiveOrgId = isOrgUser ? (userOrgId || 0) : selectedOrg;
  const effectiveClusterId = isOrgUser ? 0 : selectedCluster;

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [summary, stageWise, fund, countWise] = await Promise.all([
        fetchCsrDashboard(effectiveClusterId, effectiveOrgId, selectedFY, selectedFocus),
        fetchCsrProjectStageWise(effectiveClusterId, effectiveOrgId, selectedFY, selectedFocus),
        fetchCsrFundAllocated(effectiveClusterId, effectiveOrgId, selectedFY, selectedFocus),
        fetchCsrProjectCountWise(effectiveClusterId, effectiveOrgId, selectedFY, selectedFocus),
      ]);
      setSummaryData(summary || {});
      setStageWiseData(Array.isArray(stageWise) ? stageWise : []);
      setFundData(Array.isArray(fund) ? fund : []);
      setCountWiseData(Array.isArray(countWise) ? countWise : []);
    } catch (err) {
      console.error("Error loading CSR dashboard data", err);
      triggerNotification?.("Failed to load dashboard metrics.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [effectiveClusterId, effectiveOrgId, selectedFY, selectedFocus]);

  const loadDrilldown = async (stage = 'all') => {
    setSelectedDrilldownStage(stage);
    setLoadingDetails(true);
    try {
      const res = await fetchDetailedCsrProjects(
        effectiveClusterId, 
        effectiveOrgId, 
        selectedFY, 
        stage, 
        selectedFocus
      );
      setDetailedProjects(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Error loading detailed projects", err);
      triggerNotification?.("Failed to fetch detailed project list.", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadDrilldown('all');
  }, [effectiveClusterId, effectiveOrgId, selectedFY, selectedFocus]);

  // Aggregate KPI Calculations
  const totalProjects = useMemo(() => {
    if (summaryData?.combinedTotals?.total_csr_projects != null) {
      return Number(summaryData.combinedTotals.total_csr_projects) || 0;
    }
    return stageWiseData.reduce((acc, curr) => acc + (Number(curr.stage_wise_count || curr.total_projects) || 0), 0);
  }, [summaryData, stageWiseData]);

  const totalValue = useMemo(() => {
    if (summaryData?.combinedTotals?.total_project_value != null) {
      return Number(summaryData.combinedTotals.total_project_value) || 0;
    }
    return stageWiseData.reduce((acc, curr) => acc + (Number(curr.stage_wise_cost || curr.total_value) || 0), 0);
  }, [summaryData, stageWiseData]);

  const completedCount = useMemo(() => {
    const completed = stageWiseData.find(s => s.project_status === 'Completed');
    return completed ? Number(completed.stage_wise_count || completed.total_projects) || 0 : 0;
  }, [stageWiseData]);

  const ongoingCount = useMemo(() => {
    const ongoing = stageWiseData.find(s => s.project_status === 'Project Under implementation');
    return ongoing ? Number(ongoing.stage_wise_count || ongoing.total_projects) || 0 : 0;
  }, [stageWiseData]);

  const resetFilters = () => {
    setSelectedCluster(0);
    setSelectedOrg(0);
    setSelectedFY('all');
    setSelectedFocus(0);
  };

  const hasActiveFilters = (!isOrgUser && selectedCluster !== 0) || (!isOrgUser && selectedOrg !== 0) || selectedFY !== 'all' || selectedFocus !== 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <span>Dashboard Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cluster Filter */}
            {!isOrgUser && clusters.length > 0 && (
              <select
                value={selectedCluster}
                onChange={e => setSelectedCluster(Number(e.target.value))}
                className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
              >
                <option value={0}>All Clusters</option>
                {clusters.map(c => (
                  <option key={c.hr_cluster_id} value={c.hr_cluster_id}>{c.hr_cluster_name}</option>
                ))}
              </select>
            )}

            {/* Organisation Filter */}
            {!isOrgUser && (
              <select
                value={selectedOrg}
                onChange={e => setSelectedOrg(Number(e.target.value))}
                className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
              >
                <option value={0}>All Organisations</option>
                {organisations.map(o => (
                  <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                ))}
              </select>
            )}

            {/* Financial Year Filter */}
            <select
              value={selectedFY}
              onChange={e => setSelectedFY(e.target.value)}
              className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
            >
              <option value="all">All Financial Years</option>
              {FINANCIAL_YEARS.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>

            {/* Focus Area Filter */}
            <select
              value={selectedFocus}
              onChange={e => setSelectedFocus(Number(e.target.value))}
              className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer max-w-[200px]"
            >
              <option value={0}>All Focus Areas</option>
              {CSR_FOCUS_AREAS.map(fa => (
                <option key={fa.id} value={fa.id}>{fa.name}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              onClick={loadDashboardData}
              title="Refresh"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total CSR Projects */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total CSR Projects</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{totalProjects}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#0f417a] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <Heart className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="text-blue-600 dark:text-blue-400 font-bold">₹{totalValue.toFixed(2)} Cr</span> Total Committed Value
          </div>
        </div>

        {/* Completed Projects */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-slate-500">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {totalProjects > 0 ? ((completedCount / totalProjects) * 100).toFixed(1) : 0}%
            </span> Completion Rate
          </div>
        </div>

        {/* Under Implementation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Progress</p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{ongoingCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-slate-500">
            Under active execution
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Value</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">₹{totalValue.toFixed(2)}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              <Coins className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-slate-500">
            Across all reporting organisations
          </div>
        </div>

      </div>

      {/* Stage-wise Distribution Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider mb-4 flex items-center justify-between">
          <span>Project Status Breakdown & Filter</span>
          <span className="text-[10px] font-bold text-slate-400">Click a card to filter table</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { key: 'all', label: 'All Projects', count: totalProjects, color: 'border-[#0f417a] text-[#0f417a]' },
            { key: 'Approved by Board', label: 'Approved by Board', count: stageWiseData.find(s => s.project_status === 'Approved by Board')?.stage_wise_count || stageWiseData.find(s => s.project_status === 'Approved by Board')?.total_projects || 0, color: 'border-blue-500 text-blue-600' },
            { key: 'Project yet to start', label: 'Project Yet to Start', count: stageWiseData.find(s => s.project_status === 'Project yet to start')?.stage_wise_count || stageWiseData.find(s => s.project_status === 'Project yet to start')?.total_projects || 0, color: 'border-amber-500 text-amber-600' },
            { key: 'Project Under implementation', label: 'Under Implementation', count: ongoingCount, color: 'border-indigo-500 text-indigo-600' },
            { key: 'Completed', label: 'Completed', count: completedCount, color: 'border-emerald-500 text-emerald-600' },
          ].map(stage => {
            const isSelected = selectedDrilldownStage === stage.key;
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => loadDrilldown(stage.key)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#0f417a] dark:border-blue-500 ring-2 ring-[#0f417a]/20' 
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{stage.label}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stage.count}</p>
                </div>
                <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Drilldown Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
              {selectedDrilldownStage === 'all' ? 'All CSR Projects' : `CSR Projects: ${selectedDrilldownStage}`}
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Showing {detailedProjects.length} project(s) matching active criteria
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Organisation</th>
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
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                    No CSR projects found matching selected filters.
                  </td>
                </tr>
              ) : (
                detailedProjects.map((p, idx) => {
                  const statusStyle = STATUS_COLORS[p.project_status] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-600',
                    border: 'border-slate-200'
                  };

                  return (
                    <tr key={p.csr_project_id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 max-w-[200px] truncate" title={p.organisation_name}>
                        {p.organisation_name || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100 max-w-[280px]">
                        <p className="line-clamp-2" title={p.project_name}>{p.project_name}</p>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">
                        {p.financial_year || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-100">
                        {p.project_value ? Number(p.project_value).toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {p.project_status || 'Yet to start'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {p.physical_progress !== null ? `${p.physical_progress}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                        {p.financial_progress !== null ? `${p.financial_progress}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">
                        {p.completed_on ? String(p.completed_on).split('T')[0] : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
