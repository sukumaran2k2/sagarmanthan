import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Target, Clock, CheckCircle, AlertCircle, 
  DollarSign, Filter, RefreshCw, Calendar, Building2, 
  BarChart3, PieChart as PieIcon, ChevronRight, Layers, Award
} from 'lucide-react';
import StatCard from '../../../components/StatCard';
import Loader from '../../../components/Loader';
import api, { 
  fetchMIVDashboard, 
  fetchMIVActivityStatusWise, 
  fetchMIVActivityCurrentStatusPortWise, 
  fetchMIVCategoryCountWise, 
  fetchOrganisations 
} from '../api';

export default function MIVDashboard({ onNavigateToTab }) {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    initiative_count: 0,
    ontime_projects: 0,
    delayed_projects: 0,
    totalInitiativeCost: 0,
    totalOntimeCost: 0,
    totalDelayCost: 0,
    meeting_document_count: 0,
  });

  const [stageWiseData, setStageWiseData] = useState([]);
  const [portWiseData, setPortWiseData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [clusters, setClusters] = useState([]);

  // Filters
  const [selectedCluster, setSelectedCluster] = useState('0');
  const [selectedOrg, setSelectedOrg] = useState('0');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Load dropdown lists
  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(res.data || []))
      .catch(err => console.error("Error loading organisations:", err));

    api.get('/mmt-dropdown/mmt_hr_cluster')
      .then(res => setClusters(res.data || []))
      .catch(err => console.error("Error loading clusters:", err));
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    const params = {
      clusterID: selectedCluster,
      orgID: selectedOrg,
      currentStatus: selectedStatus || undefined,
      startDate: startDate || undefined,
      targetDate: targetDate || undefined
    };

    Promise.allSettled([
      fetchMIVDashboard(params),
      fetchMIVActivityStatusWise(params),
      fetchMIVActivityCurrentStatusPortWise(params),
      fetchMIVCategoryCountWise(params)
    ]).then(([totalsRes, stageRes, portRes, catRes]) => {
      if (totalsRes.status === 'fulfilled' && totalsRes.value.data?.combinedTotals) {
        setTotals(totalsRes.value.data.combinedTotals);
      }
      if (stageRes.status === 'fulfilled' && Array.isArray(stageRes.value.data)) {
        setStageWiseData(stageRes.value.data);
      }
      if (portRes.status === 'fulfilled' && Array.isArray(portRes.value.data)) {
        setPortWiseData(portRes.value.data);
      }
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data)) {
        setCategoryData(catRes.value.data);
      }
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCluster, selectedOrg, selectedStatus, startDate, targetDate]);

  const handleResetFilters = () => {
    setSelectedCluster('0');
    setSelectedOrg('0');
    setSelectedStatus('');
    setStartDate('');
    setTargetDate('');
  };

  const totalInitiativesCount = Number(totals.initiative_count || totals.totalInitiatives || 0);
  const onTimePercent = totalInitiativesCount > 0 
    ? Math.round(((totals.ontime_projects || 0) / totalInitiativesCount) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Filter Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Dashboard Filters & Date Range
            </span>
          </div>
          <button
            onClick={handleResetFilters}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors self-end lg:self-auto cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cluster</label>
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="0">All Clusters</option>
              {clusters.map((c) => (
                <option key={c.hr_cluster_id || c.cluster_id} value={c.hr_cluster_id || c.cluster_id}>
                  {c.cluster_name || c.hr_cluster_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Organisation</label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="0">All Organisations</option>
              {organisations.map((org) => (
                <option key={org.organisation_id} value={org.organisation_id}>
                  {org.organisation_name || org.organisation_label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Current Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Under Implementation - On Time">Under Implementation - On Time</option>
              <option value="Under Implementation - Delayed">Under Implementation - Delayed</option>
              <option value="Completed">Completed</option>
              <option value="Yet to be Started">Yet to be Started</option>
              <option value="Dropped">Dropped</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Initiatives"
          value={totals.initiative_count ?? 0}
          icon={Target}
          color="blue"
          subItems={[
            { label: 'On Time', value: totals.ontime_projects ?? 0 },
            { label: 'Delayed', value: totals.delayed_projects ?? 0 }
          ]}
        />
        <StatCard
          title="Total Initiative Cost"
          value={`₹ ${Number(totals.totalInitiativeCost || 0).toLocaleString()} Cr`}
          icon={DollarSign}
          color="emerald"
          subItems={[
            { label: 'On Time Cost', value: `₹${Number(totals.totalOntimeCost || 0).toLocaleString()} Cr` },
            { label: 'Delay Cost', value: `₹${Number(totals.totalDelayCost || 0).toLocaleString()} Cr` }
          ]}
        />
        <StatCard
          title="On-Time Rate"
          value={`${onTimePercent}%`}
          icon={CheckCircle}
          color="cyan"
          subItems={[
            { label: 'Completed / On-Track', value: totals.ontime_projects ?? 0 },
            { label: 'Total Tracked', value: totalInitiativesCount }
          ]}
        />
        <StatCard
          title="MVIC Meetings Conducted"
          value={totals.meeting_document_count ?? 0}
          icon={Award}
          color="amber"
          subItems={[
            { label: 'Status', value: 'Active Reviews' },
            { label: 'Action Taken', value: 'Documented' }
          ]}
        />
      </div>

      {/* Analytics Visuals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stage Wise Initiatives Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4.5 w-4.5 text-[#0f417a] dark:text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Initiatives Current Status Breakdown
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {stageWiseData.length} Stages Tracked
            </span>
          </div>

          {loading ? (
            <div className="py-12">
              <Loader message="Loading stage telemetry..." fullPage={false} />
            </div>
          ) : stageWiseData.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 font-medium">
              No status records match the selected filter criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {stageWiseData.map((item, idx) => {
                const count = Number(item.stage_wise_count || 0);
                const pct = totalInitiativesCount > 0 ? Math.round((count / totalInitiativesCount) * 100) : 0;
                
                let barColor = 'bg-blue-600';
                if (item.project_status?.includes('Completed')) barColor = 'bg-emerald-500';
                else if (item.project_status?.includes('Delayed')) barColor = 'bg-amber-500';
                else if (item.project_status?.includes('Dropped')) barColor = 'bg-rose-500';
                else if (item.project_status?.includes('Yet to be')) barColor = 'bg-purple-500';

                return (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {item.project_status || 'Unknown Stage'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 dark:text-white">{count}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${barColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Categories Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <PieIcon className="h-4.5 w-4.5 text-[#0f417a] dark:text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Key Focus Categories
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {categoryData.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 font-medium">
                No category records available.
              </div>
            ) : (
              categoryData.map((cat, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs hover:border-blue-200 transition-colors"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">
                    {cat.category || 'General'}
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-black rounded-lg text-[11px]">
                    {cat.category_count || cat.count || 0}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Organisation Summary Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4.5 w-4.5 text-[#0f417a] dark:text-blue-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Port / Organisation Progress Overview
            </h3>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('org-report')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>View Full Org Report</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Organisation</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Initiatives Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {portWiseData.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-slate-400">No organisation telemetry data found.</td>
                </tr>
              ) : (
                portWiseData.slice(0, 8).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#0f417a] dark:text-blue-300">
                      {row.organisation_label || row.organisation_name || `Org ID ${row.organisation_id}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {row.project_status || 'Under Review'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {row.stage_wise_count || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
