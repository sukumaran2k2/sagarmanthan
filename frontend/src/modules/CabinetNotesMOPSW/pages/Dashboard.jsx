import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { RefreshCw, TrendingUp, BarChart3, Layers, Clock } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchCabinetMopswDashboard } from '../api';

function SlaBadge({ status }) {
  if (!status) return <span className="text-slate-400 text-[10px]">—</span>;
  const map = {
    Good:     'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    'At Risk':'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    Critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${map[status] || ''}`}>{status}</span>;
}

function KpiCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function StageDistributionChart({ data }) {
  const divRef = useRef(null);
  const rootRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return;
    if (rootRef.current) rootRef.current.dispose();
    const root = am5.Root.new(divRef.current);
    rootRef.current = root;
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x64748b), maxWidth: 180, oversizedBehavior: 'truncate' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'stage_name', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x64748b) });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0 }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, { xAxis, yAxis, valueXField: 'note_count', categoryYField: 'stage_name', tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}: [bold]{valueX}[/]' }) }));
    series.columns.template.setAll({ fill: am5.color(0x0f417a), stroke: am5.color(0x0f417a), height: am5.percent(60), cornerRadiusTR: 3, cornerRadiusBR: 3 });
    series.bullets.push(() => am5.Bullet.new(root, { sprite: am5.Label.new(root, { text: '{valueX}', fill: am5.color(0x0f417a), centerY: am5.p50, centerX: am5.p0, dx: 4, fontSize: 10, fontWeight: '600', populateText: true }) }));
    const sorted = [...data].sort((a, b) => a.note_count - b.note_count);
    yAxis.data.setAll(sorted);
    series.data.setAll(sorted);
    chart.appear(600, 100);
    return () => root.dispose();
  }, [data]);
  return <div ref={divRef} style={{ width: '100%', height: 280 }} />;
}

function WingWiseChart({ data }) {
  const divRef = useRef(null);
  const rootRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return;
    if (rootRef.current) rootRef.current.dispose();
    const root = am5.Root.new(divRef.current);
    rootRef.current = root;
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x64748b), maxWidth: 120, oversizedBehavior: 'truncate' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'wing_name', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x64748b) });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0 }));
    const makeSeries = (field, name, color) => {
      const s = chart.series.push(am5xy.ColumnSeries.new(root, { name, xAxis, yAxis, valueXField: field, categoryYField: 'wing_name', stacked: true, tooltip: am5.Tooltip.new(root, { labelText: `${name}: [bold]{valueX}[/]` }) }));
      s.columns.template.setAll({ fill: am5.color(color), stroke: am5.color(color), height: am5.percent(60) });
      s.bullets.push(() => am5.Bullet.new(root, { sprite: am5.Label.new(root, { text: '{valueX}', fill: am5.color(0xffffff), centerY: am5.p50, centerX: am5.p50, fontSize: 10, fontWeight: '600', populateText: true }) }));
      s.data.setAll(data);
      return s;
    };
    const s1 = makeSeries('in_progress', 'In Progress', 0x1e4d8c);
    const s2 = makeSeries('cabinet_approved', 'Cabinet Approved', 0x3b8a4a);
    const s3 = makeSeries('on_hold', 'On Hold', 0xb0bec5);
    yAxis.data.setAll(data);
    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50, marginTop: 8 }));
    legend.labels.template.setAll({ fontSize: 11, fill: am5.color(0x475569) });
    legend.data.setAll([s1, s2, s3]);
    chart.appear(600, 100);
    return () => root.dispose();
  }, [data]);
  return <div ref={divRef} style={{ width: '100%', height: 260 }} />;
}

function PendingDays({ days }) {
  const cls = days >= 180 ? 'text-red-600 dark:text-red-400' : days >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return <span className={`font-bold text-xs ${cls}`}>{days}</span>;
}

export default function CabinetNotesMopswDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchCabinetMopswDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard...
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={load} className="text-xs font-semibold text-[#0f417a] underline cursor-pointer">Retry</button>
    </div>
  );

  const { kpi, heatMap = [], wingWise = [], longPending = [] } = data || {};
  // Exclude On Hold (9), Completed (10), DCM Been Approved (11 — unconfirmed stage, not in reference)
  const distData = heatMap.filter((s) => ![9, 10, 11].includes(s.stage_id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Last updated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <button onClick={load} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0f417a] dark:hover:text-blue-400 transition cursor-pointer">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total cabinet notes"            value={kpi?.total}      icon={Layers}    colorClass="bg-blue-50 dark:bg-blue-950/40 text-[#0f417a] dark:text-blue-400" />
        <KpiCard label="Active cabinet notes"           value={kpi?.active}     icon={TrendingUp} colorClass="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" />
        <KpiCard label="Completed"                      value={kpi?.completed}  icon={BarChart3} colorClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="Avg age of active notes (days)" value={kpi?.avgAgeDays} icon={Clock}     colorClass="bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="text-[#0f417a] dark:text-blue-400">1.</span> Stage-wise heat map
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#0f417a] text-white">
                  {['Stage','Count','Avg days','Max days','SLA status'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatMap.filter((row) => row.stage_id !== 11).map((row, i) => (
                  <tr key={row.stage_id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200 font-medium">{row.stage_name}</td>
                    <td className="px-3 py-2 text-center font-bold text-[#0f417a] dark:text-blue-400">{row.note_count}</td>
                    <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{row.note_count ? row.avg_days : '—'}</td>
                    <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{row.note_count ? row.max_days : '—'}</td>
                    <td className="px-3 py-2"><SlaBadge status={row.sla_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="text-[#0f417a] dark:text-blue-400">2.</span> Current stage distribution
          </h3>
          <StageDistributionChart data={distData} />
          <p className="text-[9px] text-slate-400 text-right mt-1">Number of notes →</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="text-[#0f417a] dark:text-blue-400">3.</span> Wing-wise pending cabinet notes (active)
          </h3>
          <WingWiseChart data={wingWise} />
          <p className="text-[9px] text-slate-400 text-right mt-1">Number of notes →</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="text-[#0f417a] dark:text-blue-400">4.</span> Long pending cabinet notes
            <span className="text-[10px] font-medium text-slate-400 ml-1">(Top 10)</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#0f417a] text-white">
                  {['Subject','Wing','Current stage','Days'].map((h) => (
                    <th key={h} className="px-2.5 py-2 text-left font-semibold tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {longPending.map((row, i) => (
                  <tr key={row.cabinet_notes_mopsw_id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="px-2.5 py-2 text-slate-700 dark:text-slate-200 max-w-[180px] truncate" title={row.subject}>{row.subject}</td>
                    <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.wing_name}</td>
                    <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.current_stage}</td>
                    <td className="px-2.5 py-2 text-right"><PendingDays days={row.pending_days} /></td>
                  </tr>
                ))}
                {!longPending.length && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 dark:text-slate-500">No long-pending notes</td></tr>
                )}
              </tbody>
            </table>
            <p className="text-[9px] text-slate-400 mt-2">Days calculated from date of entry into current stage till today.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
