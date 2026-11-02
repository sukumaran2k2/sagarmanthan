import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import {
  RefreshCw, Layers, CheckCircle2, Clock, ClipboardList, PlayCircle, XCircle,
  Filter, ChevronDown,
} from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchGmisMouDashboard, fetchGmisMouSummits } from '../api';
import ChartExportMenu from '../../../components/ChartExportMenu';
import TableExportMenu from '../../../components/TableExportMenu';
import { newChartRoot, chartColors, useIsDark } from '../../../utils/amCharts';

// Stage colours, shared by the KPI cards, the summit trend and the organisation table.
const STAGE_STYLE = {
  completed: { color: '#10b981', icon: CheckCircle2, card: 'emerald' },
  underImplementation: { color: '#f59e0b', icon: Clock, card: 'amber' },
  preImplementation: { color: '#0ea5e9', icon: ClipboardList, card: 'sky' },
  toBeStarted: { color: '#8b5cf6', icon: PlayCircle, card: 'violet' },
  dropped: { color: '#f43f5e', icon: XCircle, card: 'rose' },
};

// Tailwind classes per card colour (spelled out so Tailwind keeps them).
const CARD_THEME = {
  indigo: { value: 'text-[#6366f1] dark:text-indigo-400', icon: 'bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900', bar: 'bg-[#6366f1]' },
  emerald: { value: 'text-emerald-700 dark:text-emerald-400', icon: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900', bar: 'bg-emerald-500' },
  amber: { value: 'text-amber-700 dark:text-amber-400', icon: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900', bar: 'bg-amber-500' },
  sky: { value: 'text-sky-700 dark:text-sky-400', icon: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900', bar: 'bg-sky-500' },
  violet: { value: 'text-violet-700 dark:text-violet-400', icon: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900', bar: 'bg-violet-500' },
  rose: { value: 'text-rose-700 dark:text-rose-400', icon: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900', bar: 'bg-rose-500' },
};

// Both charts share one fixed height so the two cards line up.
const CHART_HEIGHT = 540;

const METRICS = [
  { key: 'count', label: 'MoU Count' },
  { key: 'value', label: 'MoU Cost' },
];

// Amounts are in ₹ crore; 1 lakh crore and above is shown in lakh crore, as in the reference.
function formatCrore(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹ ${(n / 100000).toFixed(2)} Lakh Cr`;
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}
const formatCount = (v) => (Number(v) || 0).toLocaleString('en-IN');

function KpiCard({ label, count, value, theme, icon: Icon, share, details }) {
  const t = CARD_THEME[theme];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block">{label}</span>
          <span className={`text-2xl font-black block mt-1 ${t.value}`}>{formatCount(count)}</span>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">{formatCrore(value)}</span>
        </div>
        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {share !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Share of MoUs</span><span>{share}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
            <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, share)}%` }} />
          </div>
        </div>
      )}
      <dl className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[10px]">
        {details.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-slate-500 dark:text-slate-400 truncate">{k}</dt>
            <dd className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Section card in the shared dashboard theme: indigo gradient header, numbered title.
function Section({ number, title, actions, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col ${className}`}>
      <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-indigo-200">{number}.</span> {title}
        </h3>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

// MoU Count / MoU Cost switch, sitting in a section header.
function MetricTabs({ metric, onChange }) {
  return (
    <div className="flex items-center bg-white/10 rounded-lg p-0.5">
      {METRICS.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition cursor-pointer ${
            metric === m.key ? 'bg-white text-[#4f46e5] shadow' : 'text-indigo-100 hover:text-white'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="text-[11px] text-slate-600 dark:text-slate-300">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// 1. MoUs by category: one bar per category, as MoU count or MoU cost (tabs).
function CategoryChart({ data, metric, onRootReady, dark }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const isValue = metric === 'value';
    const color = am5.color(isValue ? 0x10b981 : 0x6366f1);
    // Largest first for the selected measure; cost labels rounded, with Indian digit grouping.
    const rows = [...data].sort((a, b) => b[metric] - a[metric])
      .map((d) => ({ ...d, label: isValue ? `₹${Math.round(d.value).toLocaleString('en-IN')}` : formatCount(d.count) }));
    // Side padding + axis headroom keep the end-of-bar labels inside the chart area.
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingLeft: 10, paddingRight: 25, paddingBottom: 18 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10, inversed: true, cellStartLocation: 0.2, cellEndLocation: 0.8 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 170, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'category', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 60 });
    xRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, extraMax: isValue ? 0.28 : 0.18, numberFormat: isValue ? "₹#,###" : "#,###" }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
      name: isValue ? 'MoU Cost' : 'MoU Count', xAxis, yAxis, valueXField: metric, categoryYField: 'category',
      tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}\nMoU Count: [bold]{count}[/]\nMoU Cost: [bold]₹ {value.formatNumber("#,###.##")} Cr[/]' }),
    }));
    series.columns.template.setAll({ fill: color, stroke: color, height: am5.percent(100), cornerRadiusTR: 4, cornerRadiusBR: 4 });
    series.bullets.push(() => am5.Bullet.new(root, { locationX: 1, sprite: am5.Label.new(root, {
      text: '{label}', populateText: true,
      fill: am5.color(c.value), centerY: am5.p50, centerX: am5.p0, dx: 5, fontSize: 9, fontWeight: '700',
    }) }));
    series.data.setAll(rows);
    yAxis.data.setAll(rows);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, metric, dark, onRootReady]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

// 2. Summit-wise trend: stacked stages per summit plus the total, as count or value.
function SummitTrendChart({ data, stages, metric, onRootReady, dark }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const isValue = metric === 'value';
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingTop: 20, paddingLeft: 10, paddingRight: 20, paddingBottom: 26 }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 20, cellStartLocation: 0.2, cellEndLocation: 0.8 });
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600' });
    xRenderer.grid.template.set('visible', false);
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'name', renderer: xRenderer }));
    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    yRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    // Headroom above the tallest column for the total labels.
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: 0.15, numberFormat: isValue ? "₹#,###" : "#,###" }));
    const fmt = isValue ? '₹ {valueY.formatNumber("#,###.##")} Cr' : '{valueY}';
    stages.forEach((s) => {
      const color = am5.color(STAGE_STYLE[s.key].color);
      const series = chart.series.push(am5xy.ColumnSeries.new(root, { name: s.label, xAxis, yAxis, stacked: true, valueYField: `${s.key}_${metric}`, categoryXField: 'name', tooltip: am5.Tooltip.new(root, { labelText: `{categoryX} – ${s.label}: [bold]${fmt}[/]` }) }));
      series.columns.template.setAll({ fill: color, stroke: color, width: am5.percent(70) });
      series.data.setAll(data);
    });
    const total = chart.series.push(am5xy.LineSeries.new(root, { name: 'Total', xAxis, yAxis, valueYField: `total_${metric}`, categoryXField: 'name', stroke: am5.color(c.total), tooltip: am5.Tooltip.new(root, { labelText: `{categoryX} – Total: [bold]${fmt}[/]` }) }));
    total.strokes.template.setAll({ strokeWidth: 2 });
    total.bullets.push(() => am5.Bullet.new(root, { sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(c.totalBullet), stroke: am5.color(c.total), strokeWidth: 2 }) }));
    total.bullets.push(() => am5.Bullet.new(root, { sprite: am5.Label.new(root, { text: isValue ? '₹{valueY.formatNumber("#,###")}' : '{valueY}', centerX: am5.p50, centerY: am5.p100, dy: -8, fontSize: 10, fontWeight: '700', fill: am5.color(c.total), populateText: true }) }));
    total.data.setAll(data);
    xAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, stages, metric, dark, onRootReady]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

export default function GMISDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summits, setSummits] = useState([]);
  const [summit, setSummit] = useState('all');
  const [summitOpen, setSummitOpen] = useState(false);
  const [categoryMetric, setCategoryMetric] = useState('count');
  const [trendMetric, setTrendMetric] = useState('count');
  const [orgMetric, setOrgMetric] = useState('count');
  const [orgGroup, setOrgGroup] = useState('major'); // 'major' | 'other'
  const [categoryRoot, setCategoryRoot] = useState(null);
  const [trendRoot, setTrendRoot] = useState(null);
  const summitRef = useRef(null);
  const dark = useIsDark();

  const [reloadKey, setReloadKey] = useState(0);
  // Loading starts in the handlers that change the summit or retry; the effect only fetches.
  // A response that arrives after a newer request started is ignored.
  useEffect(() => {
    let current = true;
    fetchGmisMouDashboard(summit === 'all' ? '' : summit)
      .then((res) => { if (current) setData(res.data); })
      .catch(() => { if (current) setError('Failed to load dashboard data.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [summit, reloadKey]);
  const reload = (nextSummit) => {
    setLoading(true);
    setError(null);
    if (nextSummit === undefined) setReloadKey((k) => k + 1);
    else setSummit(nextSummit);
  };
  useEffect(() => {
    fetchGmisMouSummits().then((res) => setSummits(Array.isArray(res.data) ? res.data : [])).catch(() => setSummits([]));
  }, []);
  useEffect(() => {
    const close = (e) => { if (summitRef.current && !summitRef.current.contains(e.target)) setSummitOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const stages = useMemo(() => data?.stages || [], [data]);
  // Memoized so the charts (whose effects call back into state) don't re-render in a loop.
  const categoryData = useMemo(() => data?.byCategory || [], [data]);
  // Only real summits (GMIS / IMW <year>); entries such as "MoU Signing" stay out of the
  // trend but still count everywhere else on the dashboard.
  const summitData = useMemo(() => (data?.bySummit || []).filter((s) => /\b(19|20)\d{2}\b/.test(s.name)).map((s) => {
    const row = { name: s.name, total_count: s.count, total_value: s.value };
    Object.entries(s.stages).forEach(([k, v]) => { row[`${k}_count`] = v.count; row[`${k}_value`] = v.value; });
    return row;
  }), [data]);

  if (loading && !data) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard...
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={() => reload()} className="text-xs font-semibold text-[#6366f1] underline cursor-pointer">Retry</button>
    </div>
  );

  const { kpis, byOrganisation = [], lastUpdated } = data;
  // Organisation users get their own organisation's view: KPI cards and the two charts only.
  // The backend decides this, so it always matches the data it returned.
  const isOrgView = data.view?.level === 'organisation';
  const stageKpis = kpis.stages.filter((s) => STAGE_STYLE[s.key]);
  const notSpecified = kpis.stages.find((s) => s.key === 'notSpecified');
  const total = kpis.total;
  const avg = (count, value) => (count ? formatCrore(value / count) : '—');

  const stageDetails = (s) => {
    // Several raw statuses grouped into this stage (e.g. Pre-implementation): list them.
    if (s.breakdown.length > 1) {
      return [
        ...s.breakdown.map((b) => [b.status, formatCount(b.count)]),
        ['Share of MoU cost', `${s.valueShare}%`],
      ];
    }
    return [
      ['Share of MoU cost', `${s.valueShare}%`],
      ['Avg. per MoU', avg(s.count, s.value)],
    ];
  };

  // Major ports vs other organisations, each with its own tab.
  const majorOrgs = byOrganisation.filter((o) => o.isMajorPort);
  const otherOrgs = byOrganisation.filter((o) => !o.isMajorPort);
  const orgList = orgGroup === 'major' ? majorOrgs : otherOrgs;
  const orgGroupLabel = orgGroup === 'major' ? 'Major Ports' : 'Other Organisations';
  const orgMax = Math.max(1, ...orgList.map((o) => (orgMetric === 'count' ? o.count : o.value)));
  const orgHeaders = ['S.No', 'Organisation', ...stages.map((s) => s.label), 'Total MoUs', 'MoU Cost (₹ Cr)'];
  const orgRows = orgList.map((o, i) => [
    i + 1, o.name, ...stages.map((s) => o.stages[s.key][orgMetric]), o.count, o.value,
  ]);
  const stageLegend = stages.map((s) => ({ label: s.label, color: STAGE_STYLE[s.key].color }));

  return (
    <div className="space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-3xl p-6">
      {/* Filter + last updated */}
      <div className="flex flex-wrap items-center gap-3">
        {isOrgView && data.view.organisationName && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-100 text-[#4f46e5] dark:bg-indigo-900/40 dark:text-indigo-300">
            {data.view.organisationName}
          </span>
        )}
        <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
          Last updated date: {lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </p>
        <div className="relative" ref={summitRef}>
          <button
            type="button"
            onClick={() => setSummitOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
              summit !== 'all'
                ? 'bg-indigo-50 border-indigo-200 text-[#6366f1] dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <Filter className="h-3 w-3" />
            {summit === 'all' ? 'All Summits' : summit}
            <ChevronDown className="h-3 w-3" />
          </button>
          {summitOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-48 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
              {['all', ...summits].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { if (s !== summit) reload(s); setSummitOpen(false); }}
                  className={`flex w-full items-center px-3 py-2 text-xs font-semibold text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${summit === s ? 'text-[#6366f1]' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  {s === 'all' ? 'All Summits' : s}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Total MoUs"
          count={total.count}
          value={total.value}
          theme="indigo"
          icon={Layers}
          details={[
            ...(isOrgView ? [] : [['Organisations', formatCount(total.organisations)]]),
            // A single summit is already named in the filter, so its count of 1 adds nothing.
            ...(summit === 'all' ? [['Summits', formatCount(total.summits)]] : []),
            ['Avg. per MoU', avg(total.count, total.value)],
            ...(notSpecified?.count ? [['Stage not recorded', formatCount(notSpecified.count)]] : []),
          ]}
        />
        {stageKpis.map((s) => (
          <KpiCard
            key={s.key}
            label={s.label}
            count={s.count}
            value={s.value}
            theme={STAGE_STYLE[s.key].card}
            icon={STAGE_STYLE[s.key].icon}
            share={s.countShare}
            details={stageDetails(s)}
          />
        ))}
      </div>

      {/* Category + summit trend, side by side across the full width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          number={1}
          title="MoUs by Category"
          actions={<>
            <MetricTabs metric={categoryMetric} onChange={setCategoryMetric} />
            <ChartExportMenu chartRoot={categoryRoot} fileName={`gmis_mous_by_category_${categoryMetric}`} color="#6366f1" variant="plain" />
          </>}
        >
          {/* Fixed pixel height: a percentage height inside flex can leave the chart taller
              than its box, clipping the axis labels. */}
          <div className="p-4">
            <div style={{ height: CHART_HEIGHT }}><CategoryChart data={categoryData} metric={categoryMetric} onRootReady={setCategoryRoot} dark={dark} /></div>
            <div className="pt-2">
              <Legend items={[categoryMetric === 'value' ? { label: 'MoU Cost (₹ Cr)', color: '#10b981' } : { label: 'MoU Count', color: '#6366f1' }]} />
            </div>
          </div>
        </Section>

        <Section
          number={2}
          title="Summit-wise Trend"
          actions={<>
            <MetricTabs metric={trendMetric} onChange={setTrendMetric} />
            <ChartExportMenu chartRoot={trendRoot} fileName={`gmis_summit_trend_${trendMetric}`} color="#6366f1" variant="plain" />
          </>}
        >
          <div className="p-4">
            <div style={{ height: CHART_HEIGHT }}>
              <SummitTrendChart data={summitData} stages={stages} metric={trendMetric} onRootReady={setTrendRoot} dark={dark} />
            </div>
            <div className="pt-2">
              <Legend items={[...stageLegend, { label: `Total ${trendMetric === 'value' ? 'MoU cost (₹ Cr)' : 'MoUs'}`, color: dark ? '#c7d2fe' : '#1e1b4b' }]} />
            </div>
          </div>
        </Section>
      </div>

      {/* Organisation-wise stage-wise MoUs, full width (not in the organisation view) */}
      {!isOrgView && (
        <Section
          number={3}
          title="Organisation-wise Stage-wise MoUs"
          actions={<>
            <MetricTabs metric={orgMetric} onChange={setOrgMetric} />
            <TableExportMenu headers={orgHeaders} rows={orgRows} fileName={`gmis_${orgGroup === 'major' ? 'major_ports' : 'other_organisations'}_stage_${orgMetric}`} title={`Organisation-wise Stage-wise MoUs - ${orgGroupLabel} (${orgMetric === 'count' ? 'MoU Count' : 'MoU Cost, ₹ Cr'})`} />
          </>}
        >
          <div className="p-3">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-3 select-none px-1">
              {[['major', 'Major Ports', majorOrgs.length], ['other', 'Other Organisations', otherOrgs.length]].map(([key, label, n]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOrgGroup(key)}
                  className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    orgGroup === key
                      ? 'border-[#4f46e5] text-[#4f46e5] bg-indigo-100/70 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-400 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {label} ({n})
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 max-h-[620px] overflow-auto">
              <table className="w-full text-[11px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#4f46e5] text-white">
                    <th className="px-3 py-2 text-center font-semibold w-12">S.No</th>
                    <th className="px-3 py-2 text-left font-semibold">Organisation</th>
                    <th className="px-3 py-2 text-left font-semibold w-[34%]">{orgMetric === 'count' ? 'MoUs by stage' : 'MoU cost by stage (₹ Cr)'}</th>
                    {stages.map((s) => (
                      <th key={s.key} className="px-2 py-2 text-center font-semibold whitespace-nowrap">{s.label}</th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">Total MoUs</th>
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">MoU Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {orgList.map((o, i) => {
                    const rowTotal = orgMetric === 'count' ? o.count : o.value;
                    return (
                      <tr key={o.name} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 font-mono">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100 font-semibold">{o.name}</td>
                        <td className="px-3 py-2">
                          {/* Stacked bar, scaled to the largest organisation */}
                          <div className="flex h-5 rounded overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ width: `${Math.max(2, (rowTotal / orgMax) * 100)}%` }}>
                            {stages.map((s) => {
                              const v = o.stages[s.key][orgMetric];
                              if (!v) return null;
                              return (
                                <div
                                  key={s.key}
                                  title={`${s.label}: ${orgMetric === 'count' ? formatCount(v) : formatCrore(v)}`}
                                  className="h-full flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
                                  style={{ width: `${(v / rowTotal) * 100}%`, backgroundColor: STAGE_STYLE[s.key].color }}
                                >
                                  {orgMetric === 'count' && (v / rowTotal) * (rowTotal / orgMax) > 0.06 ? v : ''}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        {stages.map((s) => (
                          <td key={s.key} className="px-2 py-2 text-center text-slate-700 dark:text-slate-200 font-semibold">
                            {orgMetric === 'count' ? (o.stages[s.key].count || '—') : (o.stages[s.key].value ? o.stages[s.key].value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—')}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-black text-[#4f46e5] dark:text-indigo-400">{formatCount(o.count)}</td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{formatCrore(o.value)}</td>
                      </tr>
                    );
                  })}
                  {!orgList.length && (
                    <tr><td colSpan={5 + stages.length} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">No MoUs for this selection</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pt-3"><Legend items={stageLegend} /></div>
          </div>
        </Section>
      )}
    </div>
  );
}
