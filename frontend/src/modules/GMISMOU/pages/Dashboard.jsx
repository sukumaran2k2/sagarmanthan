import React, { useState, useEffect } from 'react';
import { 
  Building2, TrendingUp, DollarSign, CheckCircle2, 
  Clock, AlertTriangle, Layers, ArrowRight, PlusCircle, 
  FilePieChart, Sparkles, Filter, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { fetchGmisMouPaginated, fetchGmisMouChartData, fetchStatusWiseCount } from '../api';

const EVENT_TABS = [
  { id: 'all', label: 'All Summits & MoUs' },
  { id: 'GMIS 2025', label: 'GMIS 2025' },
  { id: 'GMIS 2023', label: 'GMIS 2023' },
  { id: 'GMIS 2021', label: 'GMIS 2021' },
  { id: 'GMIS 2016', label: 'GMIS 2016' },
  { id: 'IMW 2025', label: 'IMW 2025' },
];

const STATUS_COLORS = {
  'Under Implementation': '#0284c7',
  'Completed': '#10b981',
  'Yet to be Started': '#f59e0b',
  'Dropped': '#ef4444',
};

export default function GMISDashboard({ onNavigateToTab }) {
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    totalAmount: 0,
    underImplementation: 0,
    completed: 0,
    yetToStart: 0,
    dropped: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [orgData, setOrgData] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetchGmisMouPaginated({
        page: 1,
        pageSize: 100,
        eventName: selectedEvent === 'all' ? '' : selectedEvent,
      });

      const counts = res.data?.counts || {};
      setMetrics({
        totalCount: counts.all || 0,
        totalAmount: counts.totalAmount || 0,
        underImplementation: counts.underImplementation || 0,
        completed: counts.completed || 0,
        yetToStart: counts.yetToStart || 0,
        dropped: counts.dropped || 0,
      });

      // Prepare status distribution
      setChartData([
        { name: 'Under Implementation', count: counts.underImplementation || 0, fill: '#0284c7' },
        { name: 'Completed', count: counts.completed || 0, fill: '#10b981' },
        { name: 'Yet to Start', count: counts.yetToStart || 0, fill: '#f59e0b' },
        { name: 'Dropped', count: counts.dropped || 0, fill: '#ef4444' },
      ]);

      // Aggregate top organisations from data
      const items = res.data?.data || [];
      const orgMap = {};
      items.forEach(item => {
        const org = item.organisation_name || 'Other';
        if (!orgMap[org]) {
          orgMap[org] = { org, count: 0, amount: 0 };
        }
        orgMap[org].count += 1;
        orgMap[org].amount += parseFloat(item.amount) || 0;
      });

      const sortedOrgs = Object.values(orgMap)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 7);
      setOrgData(sortedOrgs);

    } catch (err) {
      console.error('Error loading GMIS dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedEvent]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Event Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2 select-none">
          {EVENT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedEvent(tab.id)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                selectedEvent === tab.id
                  ? 'bg-[#0f417a] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition cursor-pointer"
          title="Refresh Dashboard"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Top 4 Primary KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total MoUs Signed</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {metrics.totalCount}
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
              {selectedEvent === 'all' ? 'Across all summits' : selectedEvent}
            </span>
          </div>
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total MoU Value</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹ {Math.round(metrics.totalAmount).toLocaleString()} Cr
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
              Cumulated investment value
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Under Implementation</span>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
              {metrics.underImplementation}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
              {metrics.totalCount > 0 ? Math.round((metrics.underImplementation / metrics.totalCount) * 100) : 0}% of all MoUs
            </span>
          </div>
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed MoUs</span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {metrics.completed}
            </div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-0.5">
              {metrics.totalCount > 0 ? Math.round((metrics.completed / metrics.totalCount) * 100) : 0}% delivery rate
            </span>
          </div>
          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-100 dark:border-purple-900">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status Distribution Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>MoUs Status Distribution</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Real-Time</span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Organisations by Investment Value */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <span>Top Organisations by Investment Value</span>
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold uppercase">₹ in Crores</span>
          </div>

          <div className="space-y-3">
            {orgData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                No organisation data available for this summit filter.
              </div>
            ) : (
              orgData.map((o, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{o.org}</span>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                      {o.count} MoUs
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                    ₹ {Math.round(o.amount).toLocaleString()} Cr
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Quick Action Navigation Strip */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-5 rounded-2xl border border-blue-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#0f417a] dark:text-blue-300">
            Global Maritime India Summit & India Maritime Week MoUs
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Monitor deliverables, physical and financial percentages, milestone dates, and partner agreements.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onNavigateToTab('list')}
            className="px-4 py-2 bg-[#0f417a] hover:bg-[#164e8d] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
          >
            <span>View All MoUs</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => onNavigateToTab('add')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add New MoU</span>
          </button>
        </div>
      </div>

    </div>
  );
}
