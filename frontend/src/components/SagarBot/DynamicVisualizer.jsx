import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { BarChart2, Table2, TrendingUp, TrendingDown, Minus, Zap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PIE_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(8,26,51,0.97)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#e2e8f0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  },
  labelStyle: { color: '#94a3b8', fontWeight: 600 }
};

function StatusIcon({ status }) {
  if (status === 'positive') return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (status === 'negative') return <TrendingDown className="w-3 h-3 text-rose-400" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
}

function KeyMetricCard({ metric, idx }) {
  const colorMap = {
    positive: 'border-emerald-500/30 bg-emerald-500/10',
    negative: 'border-rose-500/30 bg-rose-500/10',
    neutral: 'border-white/15 bg-white/5'
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className={`p-2.5 rounded-xl border ${colorMap[metric.status] || colorMap.neutral} flex flex-col gap-0.5`}
    >
      <span className="text-[10px] text-slate-300 font-medium leading-tight">{metric.label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-sm font-bold text-white leading-tight">{metric.value}</span>
        {metric.trend && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
            <StatusIcon status={metric.status} />
            {metric.trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function DynamicChart({ visualizationType, chartConfig }) {
  if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) return null;

  const renderChart = () => {
    if (visualizationType === 'pie') {
      return (
        <PieChart>
          <Tooltip {...CHART_TOOLTIP_STYLE} />
          <Pie
            data={chartConfig.data}
            dataKey={chartConfig.dataKeys[0]?.key || 'value'}
            nameKey={chartConfig.xAxisKey}
            cx="50%"
            cy="50%"
            outerRadius={60}
            innerRadius={25}
            paddingAngle={3}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartConfig.data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Legend
            iconType="circle"
            iconSize={7}
            formatter={(v) => <span style={{ fontSize: '10px', color: '#94a3b8' }}>{v}</span>}
          />
        </PieChart>
      );
    }

    if (visualizationType === 'line' || visualizationType === 'area') {
      const ChartComp = visualizationType === 'area' ? AreaChart : LineChart;
      return (
        <ChartComp data={chartConfig.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey={chartConfig.xAxisKey} stroke="#64748b" tick={{ fontSize: 10 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
          <Tooltip {...CHART_TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: '10px', color: '#94a3b8' }}>{v}</span>} />
          {chartConfig.dataKeys.map((dk, i) => (
            visualizationType === 'area'
              ? <Area key={i} type="monotone" dataKey={dk.key} name={dk.label} stroke={dk.color || PIE_COLORS[i]} fill={dk.color || PIE_COLORS[i]} fillOpacity={0.15} strokeWidth={2} dot={{ r: 2.5 }} />
              : <Line key={i} type="monotone" dataKey={dk.key} name={dk.label} stroke={dk.color || PIE_COLORS[i]} strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
          ))}
        </ChartComp>
      );
    }

    // Default: Bar
    return (
      <BarChart data={chartConfig.data} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey={chartConfig.xAxisKey} stroke="#64748b" tick={{ fontSize: 10 }} />
        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: '10px', color: '#94a3b8' }}>{v}</span>} />
        {chartConfig.dataKeys.map((dk, i) => (
          <Bar key={i} dataKey={dk.key} name={dk.label} fill={dk.color || PIE_COLORS[i]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-slate-900/60 border border-white/10 p-3 mt-2.5"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart2 className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-white leading-tight">{chartConfig.title}</span>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function DynamicTable({ tableConfig }) {
  if (!tableConfig || !tableConfig.rows || tableConfig.rows.length === 0) return null;

  const statusColor = (val) => {
    const v = String(val).toLowerCase();
    if (v.includes('pending') || v.includes('overdue') || v.includes('delayed')) return 'text-rose-400 font-semibold';
    if (v.includes('compliant') || v.includes('on track') || v.includes('submitted') || v.includes('cleared')) return 'text-emerald-400 font-semibold';
    if (v.includes('at risk') || v.includes('warning')) return 'text-amber-400 font-semibold';
    return 'text-slate-200';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden mt-2.5"
    >
      {tableConfig.title && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
          <Table2 className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-white">{tableConfig.title}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[10.5px]">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {tableConfig.headers.map((h, i) => (
                <th key={i} className="px-2.5 py-1.5 text-left text-slate-300 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableConfig.rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className={`px-2.5 py-1.5 ${statusColor(cell)} whitespace-nowrap`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default function DynamicVisualizer({ data, onFollowUp }) {
  if (!data) return null;

  const { summary, keyMetrics, visualizationType, chartConfig, tableConfig, suggestedFollowUps } = data;

  return (
    <div className="space-y-0 w-full">
      {/* 1. Summary Text */}
      {summary && (
        <p className="text-[11.5px] text-slate-100/90 leading-relaxed">{summary}</p>
      )}

      {/* 2. Key Metric Cards */}
      {keyMetrics && keyMetrics.length > 0 && (
        <div className={`grid gap-2 mt-2.5 ${keyMetrics.length === 1 ? 'grid-cols-1' : keyMetrics.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {keyMetrics.map((m, i) => <KeyMetricCard key={i} metric={m} idx={i} />)}
        </div>
      )}

      {/* 3. Chart (bar, line, area, pie) */}
      {visualizationType && visualizationType !== 'none' && visualizationType !== 'table' && (
        <DynamicChart visualizationType={visualizationType} chartConfig={chartConfig} />
      )}

      {/* 4. Data Table */}
      {(visualizationType === 'table' || tableConfig) && (
        <DynamicTable tableConfig={tableConfig} />
      )}

      {/* 5. Follow-up Chips */}
      {suggestedFollowUps && suggestedFollowUps.length > 0 && onFollowUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3"
        >
          <div className="flex items-center gap-1 mb-1.5">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">Ask follow-up</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {suggestedFollowUps.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(q)}
                className="flex items-center gap-1.5 text-left text-[10.5px] text-slate-200 hover:text-white bg-white/8 hover:bg-white/15 border border-white/10 hover:border-cyan-400/30 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer group"
              >
                <ChevronRight className="w-3 h-3 text-cyan-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                <span className="leading-tight">{q}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
