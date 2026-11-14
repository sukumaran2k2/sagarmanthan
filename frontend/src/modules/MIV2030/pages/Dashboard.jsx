import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import {
  RefreshCw, Layers, CheckCircle2, Clock, AlertTriangle, PlayCircle, XCircle,
  Filter, ChevronDown, ChevronRight,
} from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchMivDashboardSummary } from '../api';
import ChartExportMenu from '../../../components/ChartExportMenu';
import TableExportMenu from '../../../components/TableExportMenu';
import { newChartRoot, chartColors, useIsDark } from '../../../utils/amCharts';

// MIV 2030 dashboard, in the same style as the GMIS MoU and Capex dashboards. Every number is a
// count (or cost) of reported initiatives, so the cards, charts and tables add up to the same
// total. The server applies the organisation scope.

// Status colours, shared by the cards, the theme chart and the organisation table.
const STATUS_STYLE = {
  completed: { color: '#10b981', icon: CheckCircle2, card: 'emerald' },
  onTime: { color: '#0ea5e9', icon: Clock, card: 'sky' },
  delayed: { color: '#f59e0b', icon: AlertTriangle, card: 'amber' },
  yetToStart: { color: '#8b5cf6', icon: PlayCircle, card: 'violet' },
  dropped: { color: '#f43f5e', icon: XCircle, card: 'rose' },
  notApplicable: { color: '#94a3b8' },
};

// Tailwind classes per card colour (spelled out so Tailwind keeps them).
const CARD_THEME = {
  indigo: { value: 'text-[#6366f1] dark:text-indigo-400', icon: 'bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900', bar: 'bg-[#6366f1]' },
  emerald: { value: 'text-emerald-700 dark:text-emerald-400', icon: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900', bar: 'bg-emerald-500' },
  sky: { value: 'text-sky-700 dark:text-sky-400', icon: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900', bar: 'bg-sky-500' },
  amber: { value: 'text-amber-700 dark:text-amber-400', icon: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900', bar: 'bg-amber-500' },
  violet: { value: 'text-violet-700 dark:text-violet-400', icon: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900', bar: 'bg-violet-500' },
  rose: { value: 'text-rose-700 dark:text-rose-400', icon: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900', bar: 'bg-rose-500' },
};

// Both charts share one fixed height so the two cards line up.
const CHART_HEIGHT = 520;

const METRICS = [
  { key: 'count', label: 'Initiatives' },
  { key: 'value', label: 'Cost' },
];

// Amounts are in ₹ crore; 1 lakh crore and above is shown in lakh crore.
function formatCrore(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹ ${(n / 100000).toFixed(2)} Lakh Cr`;
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}
const formatCount = (v) => (Number(v) || 0).toLocaleString('en-IN');
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// details: [label, value, warn?] - a warning row is shown in amber
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
            <span>Share of initiatives</span><span>{share}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
            <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, share)}%` }} />
          </div>
        </div>
      )}
      <dl className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[10px]">
        {details.map(([k, v, warn]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className={`truncate ${warn ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>{k}</dt>
            <dd className={`font-bold whitespace-nowrap ${warn ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>{v}</dd>
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

// Initiatives / Cost switch, sitting in a section header.
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

// A filter chip with a drop-down list (as the GMIS summit filter)
function FilterMenu({ allLabel, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const selected = options.find((o) => String(o.id) === String(value));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer max-w-[320px] ${
          selected
            ? 'bg-indigo-50 border-indigo-200 text-[#6366f1] dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
        }`}
      >
        <Filter className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{selected ? selected.name : allLabel}</span>
        <ChevronDown className="h-3 w-3 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-80 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
          {[{ id: '', name: allLabel }, ...options].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(String(o.id)); setOpen(false); }}
              className={`flex w-full items-center px-3 py-2 text-xs font-semibold text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${String(value) === String(o.id) ? 'text-[#6366f1]' : 'text-slate-700 dark:text-slate-200'}`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 1. Theme-wise status: one stacked bar per theme, as initiatives or cost.
function ThemeChart({ data, statuses, metric, onRootReady, dark }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const isValue = metric === 'value';
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingLeft: 10, paddingRight: 30, paddingBottom: 18 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10, inversed: true, cellStartLocation: 0.15, cellEndLocation: 0.85 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 210, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'name', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 60 });
    xRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, extraMax: 0.18, numberFormat: isValue ? '₹#,###' : '#,###' }));
    const fmt = isValue ? '₹ {valueX.formatNumber("#,###.##")} Cr' : '{valueX}';
    statuses.forEach((s, i) => {
      const color = am5.color(STATUS_STYLE[s.key].color);
      const series = chart.series.push(am5xy.ColumnSeries.new(root, { name: s.label, xAxis, yAxis, stacked: true, valueXField: `${s.key}_${metric}`, categoryYField: 'name', tooltip: am5.Tooltip.new(root, { labelText: `{categoryY}\n${s.label}: [bold]${fmt}[/]` }) }));
      series.columns.template.setAll({ fill: color, stroke: color, height: am5.percent(100) });
      // The total at the end of the last segment
      if (i === statuses.length - 1) {
        series.bullets.push(() => am5.Bullet.new(root, { locationX: 1, sprite: am5.Label.new(root, {
          text: '{totalLabel}', populateText: true, fill: am5.color(c.value), centerY: am5.p50, centerX: am5.p0, dx: 5, fontSize: 9, fontWeight: '700',
        }) }));
      }
      series.data.setAll(data);
    });
    yAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, statuses, metric, dark, onRootReady]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

// 2. Initiatives by category: one bar per category, as initiatives or cost.
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
    // Largest first for the selected measure
    const rows = [...data].sort((a, b) => b[metric] - a[metric])
      .map((d) => ({ ...d, label: isValue ? `₹${Math.round(d.value).toLocaleString('en-IN')}` : formatCount(d.count) }));
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingLeft: 10, paddingRight: 25, paddingBottom: 18 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10, inversed: true, cellStartLocation: 0.2, cellEndLocation: 0.8 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 170, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'category', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 60 });
    xRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, extraMax: isValue ? 0.28 : 0.18, numberFormat: isValue ? '₹#,###' : '#,###' }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
      name: isValue ? 'Cost' : 'Initiatives', xAxis, yAxis, valueXField: metric, categoryYField: 'category',
      tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}\nInitiatives: [bold]{count}[/]\nCost: [bold]₹ {value.formatNumber("#,###.##")} Cr[/]' }),
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

export default function MIVDashboard({ onNavigateToTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeId, setThemeId] = useState('');
  const [organisationId, setOrganisationId] = useState('');
  const [themeMetric, setThemeMetric] = useState('count');
  const [categoryMetric, setCategoryMetric] = useState('count');
  const [orgMetric, setOrgMetric] = useState('count');
  const [orgGroup, setOrgGroup] = useState('major'); // 'major' | 'other'
  const [themeRoot, setThemeRoot] = useState(null);
  const [categoryRoot, setCategoryRoot] = useState(null);
  const dark = useIsDark();

  const [reloadKey, setReloadKey] = useState(0);
  // Loading starts in the handlers that change a filter or retry; the effect only fetches.
  // A response that arrives after a newer request started is ignored.
  useEffect(() => {
    let current = true;
    fetchMivDashboardSummary({ themeId: themeId || undefined, organisationId: organisationId || undefined })
      .then((res) => { if (current) setData(res.data); })
      .catch(() => { if (current) setError('Failed to load dashboard data.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [themeId, organisationId, reloadKey]);
  const startLoading = () => { setLoading(true); setError(null); };
  const changeTheme = (v) => { if (v !== themeId) { startLoading(); setThemeId(v); } };
  const changeOrganisation = (v) => { if (v !== organisationId) { startLoading(); setOrganisationId(v); } };
  const retry = () => { startLoading(); setReloadKey((k) => k + 1); };

  const statuses = useMemo(() => data?.statuses || [], [data]);
  // Memoized so the charts (whose effects call back into state) don't re-render in a loop.
  const themeData = useMemo(() => (data?.byTheme || []).map((t) => {
    const row = { name: t.name, total_count: t.count, total_value: t.value };
    Object.entries(t.statuses).forEach(([k, v]) => { row[`${k}_count`] = v.count; row[`${k}_value`] = v.value; });
    return row;
  }), [data]);
  const themeChartData = useMemo(() => themeData.map((r) => ({
    ...r, totalLabel: themeMetric === 'value' ? `₹${Math.round(r.total_value).toLocaleString('en-IN')}` : formatCount(r.total_count),
  })), [themeData, themeMetric]);
  const categoryData = useMemo(() => data?.byCategory || [], [data]);

  if (loading && !data) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard...
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={retry} className="text-xs font-semibold text-[#6366f1] underline cursor-pointer">Retry</button>
    </div>
  );

  const { kpis, byOrganisation = [], overdue = [], filters = {}, lastUpdated } = data;
  // Organisation users get their own organisation's view (no organisation filter or table).
  // The backend decides this, so it always matches the data it returned.
  const isOrgView = data.view?.level === 'organisation';
  const total = kpis.total;
  const card = (key) => kpis.statuses.find((s) => s.key === key);
  const notApplicable = card('notApplicable');
  const avg = (count, value) => (count ? formatCrore(value / count) : '—');
  const statusCards = ['completed', 'onTime', 'delayed', 'yetToStart', 'dropped'].map(card).filter(Boolean);
  const statusDetails = (s) => {
    const rows = [['Share of cost', `${s.valueShare}%`]];
    if (s.key === 'completed') rows.push(['Completed after target date', formatCount(s.completedLate), s.completedLate > 0]);
    else if (s.key === 'dropped') rows.push(['Avg. cost', avg(s.count, s.value)]);
    else rows.push(['Target date passed', formatCount(s.targetPassed), s.targetPassed > 0]);
    return rows;
  };

  // Major ports vs other organisations, each with its own tab.
  const majorOrgs = byOrganisation.filter((o) => o.isMajorPort);
  const otherOrgs = byOrganisation.filter((o) => !o.isMajorPort);
  const orgList = orgGroup === 'major' ? majorOrgs : otherOrgs;
  const orgGroupLabel = orgGroup === 'major' ? 'Major Ports' : 'Other Organisations';
  const orgMax = Math.max(1, ...orgList.map((o) => (orgMetric === 'count' ? o.count : o.value)));
  const orgHeaders = ['S.No', 'Organisation', ...statuses.map((s) => s.label), 'Total Initiatives', 'Cost (₹ Cr)', 'MVIC Meetings'];
  const orgRows = orgList.map((o, i) => [
    i + 1, o.name, ...statuses.map((s) => o.statuses[s.key][orgMetric]), o.count, o.value, o.meetings,
  ]);
  const statusLegend = statuses.map((s) => ({ label: s.label, color: STATUS_STYLE[s.key].color }));
  const overdueHeaders = ['S.No', 'No.', 'Initiative', ...(isOrgView ? [] : ['Organisation']), 'Theme', 'Current Status', 'Target Date', 'Days Overdue'];
  const overdueRows = overdue.map((o, i) => [i + 1, o.number, o.name, ...(isOrgView ? [] : [o.organisation]), o.theme, o.status, formatDate(o.targetDate), o.daysOverdue]);

  return (
    <div className="space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-3xl p-6">
      {/* Filters + last updated */}
      <div className="flex flex-wrap items-center gap-3">
        {isOrgView && data.view.organisationName && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-100 text-[#4f46e5] dark:bg-indigo-900/40 dark:text-indigo-300">
            {data.view.organisationName}
          </span>
        )}
        <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
          Last updated date: {formatDate(lastUpdated)}
        </p>
        <FilterMenu allLabel="All Themes" options={filters.themes || []} value={themeId} onChange={changeTheme} />
        {!isOrgView && <FilterMenu allLabel="All Organisations" options={filters.organisations || []} value={organisationId} onChange={changeOrganisation} />}
        {loading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Total Initiatives"
          count={total.count}
          value={total.value}
          theme="indigo"
          icon={Layers}
          details={[
            ...(isOrgView || organisationId ? [] : [['Organisations', formatCount(total.organisations)]]),
            ['MIV initiative numbers', formatCount(total.initiativeNumbers)],
            // Meetings have no theme: with a theme chosen they are still all the meetings
            [themeId ? 'MVIC meetings (all themes)' : 'MVIC meetings', formatCount(total.meetings)],
            ...(notApplicable?.count ? [['Not applicable', formatCount(notApplicable.count)]] : []),
            ...(total.notRecorded ? [['Status not recorded', formatCount(total.notRecorded)]] : []),
          ]}
        />
        {statusCards.map((s) => (
          <KpiCard
            key={s.key}
            label={s.label.replace('Under Implementation - ', 'In Progress - ')}
            count={s.count}
            value={s.value}
            theme={STATUS_STYLE[s.key].card}
            icon={STATUS_STYLE[s.key].icon}
            share={s.countShare}
            details={statusDetails(s)}
          />
        ))}
      </div>

      {total.sharedCostRows > 0 && (
        <p className="text-[10px] text-slate-600 dark:text-slate-400 -mt-2">
          Cost: a project cost entered on several activities of the same MIV initiative is counted once and shared across them
          ({formatCount(total.sharedCostRows)} activities; {formatCrore(total.enteredValue)} if every entry is added as entered).
        </p>
      )}

      {/* Theme + category, side by side across the full width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          number={1}
          title="Theme-wise Status"
          actions={<>
            <MetricTabs metric={themeMetric} onChange={setThemeMetric} />
            <ChartExportMenu chartRoot={themeRoot} fileName={`miv_theme_status_${themeMetric}`} color="#6366f1" variant="plain" />
          </>}
        >
          {/* Fixed pixel height: a percentage height inside flex can leave the chart taller
              than its box, clipping the axis labels. */}
          <div className="p-4">
            <div style={{ height: CHART_HEIGHT }}>
              {themeChartData.length
                ? <ThemeChart data={themeChartData} statuses={statuses} metric={themeMetric} onRootReady={setThemeRoot} dark={dark} />
                : <p className="text-center text-xs text-slate-500 pt-20">No initiatives for this selection</p>}
            </div>
            <div className="pt-2"><Legend items={statusLegend} /></div>
          </div>
        </Section>

        <Section
          number={2}
          title="Initiatives by Category"
          actions={<>
            <MetricTabs metric={categoryMetric} onChange={setCategoryMetric} />
            <ChartExportMenu chartRoot={categoryRoot} fileName={`miv_initiatives_by_category_${categoryMetric}`} color="#6366f1" variant="plain" />
          </>}
        >
          <div className="p-4">
            <div style={{ height: CHART_HEIGHT }}>
              {categoryData.length
                ? <CategoryChart data={categoryData} metric={categoryMetric} onRootReady={setCategoryRoot} dark={dark} />
                : <p className="text-center text-xs text-slate-500 pt-20">No initiatives for this selection</p>}
            </div>
            <div className="pt-2">
              <Legend items={[categoryMetric === 'value' ? { label: 'Cost (₹ Cr)', color: '#10b981' } : { label: 'Initiatives', color: '#6366f1' }]} />
            </div>
          </div>
        </Section>
      </div>

      {/* Organisation-wise status-wise initiatives, full width (not in the organisation view) */}
      {!isOrgView && (
        <Section
          number={3}
          title="Organisation-wise Status-wise Initiatives"
          actions={<>
            <MetricTabs metric={orgMetric} onChange={setOrgMetric} />
            <TableExportMenu headers={orgHeaders} rows={orgRows} fileName={`miv_${orgGroup === 'major' ? 'major_ports' : 'other_organisations'}_status_${orgMetric}`} title={`Organisation-wise Status-wise Initiatives - ${orgGroupLabel} (${orgMetric === 'count' ? 'Initiatives' : 'Cost, ₹ Cr'})`} />
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
                    <th className="px-3 py-2 text-left font-semibold w-[28%]">{orgMetric === 'count' ? 'Initiatives by status' : 'Cost by status (₹ Cr)'}</th>
                    {statuses.map((s) => (
                      <th key={s.key} className="px-2 py-2 text-center font-semibold">{s.label.replace('Under Implementation - ', 'In Progress - ')}</th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">Total</th>
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">Cost</th>
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">MVIC Meetings</th>
                  </tr>
                </thead>
                <tbody>
                  {orgList.map((o, i) => {
                    const rowTotal = orgMetric === 'count' ? o.count : o.value;
                    return (
                      <tr key={o.id ?? o.name} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 font-mono">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100 font-semibold">{o.name}</td>
                        <td className="px-3 py-2">
                          {/* Stacked bar, scaled to the largest organisation */}
                          <div className="flex h-5 rounded overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ width: `${Math.max(2, (rowTotal / orgMax) * 100)}%` }}>
                            {statuses.map((s) => {
                              const v = o.statuses[s.key][orgMetric];
                              if (!v || !rowTotal) return null;
                              return (
                                <div
                                  key={s.key}
                                  title={`${s.label}: ${orgMetric === 'count' ? formatCount(v) : formatCrore(v)}`}
                                  className="h-full flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
                                  style={{ width: `${(v / rowTotal) * 100}%`, backgroundColor: STATUS_STYLE[s.key].color }}
                                >
                                  {orgMetric === 'count' && (v / rowTotal) * (rowTotal / orgMax) > 0.06 ? v : ''}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        {statuses.map((s) => (
                          <td key={s.key} className="px-2 py-2 text-center text-slate-700 dark:text-slate-200 font-semibold">
                            {orgMetric === 'count' ? (o.statuses[s.key].count || '—') : (o.statuses[s.key].value ? o.statuses[s.key].value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—')}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-black text-[#4f46e5] dark:text-indigo-400">{formatCount(o.count)}</td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{formatCrore(o.value)}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-200">{o.meetings || '—'}</td>
                      </tr>
                    );
                  })}
                  {!orgList.length && (
                    <tr><td colSpan={6 + statuses.length} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">No initiatives for this selection</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pt-3"><Legend items={statusLegend} /></div>
          </div>
        </Section>
      )}

      {/* Overdue initiatives: not finished and past their target date, longest first */}
      <Section
        number={isOrgView ? 3 : 4}
        title={<>Overdue Initiatives <span className="text-indigo-200 font-semibold normal-case tracking-normal">(top 10 of {formatCount(total.overdue)})</span></>}
        actions={<TableExportMenu headers={overdueHeaders} rows={overdueRows} fileName="miv_overdue_initiatives" title="Overdue MIV Initiatives (top 10)" />}
      >
        <div className="p-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto">
            <table className="w-full text-[11px] border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#4f46e5] text-white">
                  {overdueHeaders.map((h) => (
                    <th key={h} className={`px-3 py-2 font-semibold ${h === 'Initiative' || h === 'Organisation' || h === 'Theme' ? 'text-left' : 'text-center'} whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdue.map((o, i) => (
                  <tr key={o.id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 font-mono">{o.number}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100 font-semibold min-w-[260px]">{o.name}</td>
                    {!isOrgView && <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{o.organisation}</td>}
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200 min-w-[180px]">{o.theme}</td>
                    <td className="px-3 py-2 text-center text-slate-700 dark:text-slate-200">{o.status.replace('Under Implementation - ', 'In Progress - ')}</td>
                    <td className="px-3 py-2 text-center text-slate-700 dark:text-slate-200 font-mono whitespace-nowrap">{formatDate(o.targetDate)}</td>
                    <td className="px-3 py-2 text-center font-black text-rose-600 dark:text-rose-400">{formatCount(o.daysOverdue)}</td>
                  </tr>
                ))}
                {!overdue.length && (
                  <tr><td colSpan={overdueHeaders.length} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">No overdue initiatives for this selection</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Days from the target date of completion till today, for initiatives not completed or dropped.</p>
            {onNavigateToTab && (
              <button type="button" onClick={() => onNavigateToTab('list')} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6366f1] hover:underline cursor-pointer">
                All initiatives <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
