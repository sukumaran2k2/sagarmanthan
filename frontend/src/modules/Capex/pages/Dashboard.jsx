import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { RefreshCw, Target, Wallet, Percent, X } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchCapexDashboardFilters, fetchCapexDashboardSummary, fetchCapexDashboardFySummary, fetchCapexDashboardYoy } from '../api';
import ChartExportMenu from '../../../components/ChartExportMenu';
import { newChartRoot, chartColors, useIsDark } from '../../../utils/amCharts';

const ALL = 'all';
const FUNDING = [
  { key: 'gbs', label: 'GBS' },
  { key: 'iebr', label: 'IEBR' },
  { key: 'ppp', label: 'PPP' },
];
// Planned / actual series colours (checked for colour-blind separation in light and dark).
const PLANNED_COLOR = '#6366f1';
const ACTUAL_COLOR = '#059669';
// Chart height grows with the number of organisations (one row each).
const chartHeight = (rows) => Math.max(260, rows * 48 + 60);

// Tailwind classes per card colour (spelled out so Tailwind keeps them).
const CARD_THEME = {
  indigo: { value: 'text-[#6366f1] dark:text-indigo-400', icon: 'bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900' },
  emerald: { value: 'text-emerald-700 dark:text-emerald-400', icon: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900' },
  amber: { value: 'text-amber-700 dark:text-amber-400', icon: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900' },
};

// Amounts are in ₹ crore.
function formatCrore(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 100000) return `₹ ${(n / 100000).toFixed(2)} Lakh Cr`;
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}
const percent = (actual, planned) => (planned > 0 ? (actual / planned) * 100 : null);
const formatPercent = (p) => `${p.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;

// Financial year (April–March) that today falls in, e.g. "2026-2027".
function currentFinancialYear() {
  const d = new Date();
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

function KpiCard({ label, value, caption, theme, icon: Icon, progress, details }) {
  const t = CARD_THEME[theme];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block">{label}</span>
          <span className={`text-2xl font-black block mt-1 ${t.value}`}>{value}</span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{caption}</span>
        </div>
        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {progress !== undefined && (
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-3 overflow-hidden">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      <dl className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
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

function FilterSelect({ label, value, onChange, options, disabled = false, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.line ? (
            <span className="relative w-5 h-3 flex items-center">
              <span className="absolute inset-x-0 h-0.5" style={{ backgroundColor: item.color }} />
              <span className="relative mx-auto w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            </span>
          ) : (
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
          )}
          <span className="text-[11px] text-slate-600 dark:text-slate-300">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Planned vs actual per organisation as paired horizontal bars, largest target at the top,
// laid out like the GMIS category chart. Each bar carries its value at its end.
// Clicking a bar selects that organisation (onSelect); the others are dimmed.
function PlannedActualChart({ data, onRootReady, dark, selectedId, onSelect }) {
  const divRef = useRef(null);
  const seriesRef = useRef([]);
  // Refs so a new selection / handler doesn't rebuild (and re-animate) the chart.
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  const barOpacity = (dataItem) => {
    const sel = selectedRef.current;
    return sel == null || dataItem?.dataContext?.id === sel ? 1 : 0.3;
  };
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingLeft: 10, paddingRight: 25, paddingBottom: 18 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10, inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 150, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'name', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 60 });
    xRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    // Headroom past the longest bar for the value labels.
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, extraMax: 0.16, numberFormat: "₹#,###' Cr'" }));
    const tooltipText = '[bold]{name}[/]\nPlanned: [bold]₹ {planned.formatNumber("#,###.##")} Cr[/]\nActual: [bold]₹ {actual.formatNumber("#,###.##")} Cr[/]\nExpenditure: [bold]{percentLabel}[/]';

    // Planned on top, actual below it within each organisation's row.
    seriesRef.current = [['planned', 'Planned Expenditure', PLANNED_COLOR], ['actual', 'Actual Expenditure', ACTUAL_COLOR]].map(([field, name, hex]) => {
      const color = am5.color(hex);
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name, xAxis, yAxis, valueXField: field, categoryYField: 'name',
        tooltip: am5.Tooltip.new(root, { labelText: tooltipText }),
      }));
      // Bars slightly thinner than their slot leave a gap between the pair.
      series.columns.template.setAll({ fill: color, stroke: color, height: am5.percent(80), cornerRadiusTR: 4, cornerRadiusBR: 4, cursorOverStyle: 'pointer' });
      series.columns.template.adapters.add('fillOpacity', (v, target) => barOpacity(target.dataItem));
      series.columns.template.adapters.add('strokeOpacity', (v, target) => barOpacity(target.dataItem));
      series.columns.template.events.on('click', (ev) => onSelectRef.current?.(ev.target.dataItem?.dataContext?.id));
      series.bullets.push(() => am5.Bullet.new(root, {
        locationX: 1,
        sprite: am5.Label.new(root, { text: '{valueX.formatNumber("#,##0.##")} Cr', populateText: true, fontSize: 9, fontWeight: '700', fill: am5.color(c.value), centerX: am5.p0, centerY: am5.p50, dx: 5 }),
      }));
      series.data.setAll(data);
      return series;
    });
    yAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); seriesRef.current = []; onRootReady?.(null); };
  }, [data, dark]);
  // Re-dim the bars when the selection changes.
  useEffect(() => {
    selectedRef.current = selectedId;
    seriesRef.current.forEach((series) => series.columns.each((col) => {
      col.set('fillOpacity', barOpacity(col.dataItem));
      col.set('strokeOpacity', barOpacity(col.dataItem));
    }));
  }, [selectedId]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

const formatAmount = (v) => (v ? `${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` : '—');

// Actual expenditure by month (or by year) for the chart selection, with the planned
// totals and % spent per funding type underneath (the 2.0 "Financial Year Summary").
function FySummaryTable({ summary }) {
  const { rows, planned, period } = summary;
  const totals = rows.reduce(
    (acc, r) => ({ gbs: acc.gbs + r.gbs, iebr: acc.iebr + r.iebr, ppp: acc.ppp + r.ppp, total: acc.total + r.total }),
    { gbs: 0, iebr: 0, ppp: 0, total: 0 },
  );
  const cols = [...FUNDING, { key: 'total', label: 'Total' }];
  const spent = (key) => {
    const p = percent(totals[key], planned[key]);
    return p === null ? '—' : formatPercent(p);
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto">
      <table className="w-full text-[11px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#4f46e5] text-white">
            <th className="px-3 py-2 text-left font-semibold">{period === 'month' ? 'Month' : 'Financial Year'}</th>
            {cols.map((c) => <th key={c.key} className="px-3 py-2 text-right font-semibold">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
              <td className="px-3 py-1.5 text-slate-800 dark:text-slate-100 font-semibold">{r.label}</td>
              {cols.map((c) => (
                <td key={c.key} className={`px-3 py-1.5 text-right tabular-nums ${c.key === 'total' ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>{formatAmount(r[c.key])}</td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={cols.length + 1} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">No expenditure recorded</td></tr>
          )}
        </tbody>
        <tfoot className="font-bold text-slate-800 dark:text-slate-100">
          <tr className="bg-emerald-50 dark:bg-emerald-950/30">
            <td className="px-3 py-2 border-t border-slate-200 dark:border-slate-700">Total Actual</td>
            {cols.map((c) => <td key={c.key} className="px-3 py-2 text-right tabular-nums border-t border-slate-200 dark:border-slate-700">{formatAmount(totals[c.key])}</td>)}
          </tr>
          <tr className="bg-indigo-50 dark:bg-indigo-950/30">
            <td className="px-3 py-2">Planned</td>
            {cols.map((c) => <td key={c.key} className="px-3 py-2 text-right tabular-nums">{formatAmount(planned[c.key])}</td>)}
          </tr>
          <tr className="bg-amber-50 dark:bg-amber-950/30">
            <td className="px-3 py-2">% Spent</td>
            {cols.map((c) => <td key={c.key} className="px-3 py-2 text-right tabular-nums">{spent(c.key)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Year-on-year trend: planned (columns) vs actual (line) per financial year, oldest first.
// Value labels are centred: planned above its column, actual above its point. When the two
// values are close the labels would collide, so the actual label drops below a point just
// under the column top, or the planned label moves inside the column under a point just above it.
function YoyTrendChart({ data, onRootReady, dark }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingTop: 20, paddingLeft: 10, paddingRight: 20, paddingBottom: 10 }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 20, cellStartLocation: 0.2, cellEndLocation: 0.8 });
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600' });
    xRenderer.grid.template.set('visible', false);
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'financialYear', renderer: xRenderer }));
    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    yRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    // Headroom above the tallest column / point for the value labels.
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: 0.12, numberFormat: "₹#,###' Cr'" }));
    const tooltipText = '[bold]FY {financialYear}[/]\nPlanned: [bold]₹ {planned.formatNumber("#,###.##")} Cr[/]\nActual: [bold]₹ {actual.formatNumber("#,###.##")} Cr[/]\nExpenditure: [bold]{percentLabel}[/]';
    const valueText = '{valueY.formatNumber("#,##0.##")} Cr';
    // "Close" = within 8% of the largest value, about two label heights at this chart size.
    const maxValue = Math.max(1, ...data.map((d) => Math.max(d.planned, d.actual)));
    const isClose = (d) => Math.abs(d.actual - d.planned) < maxValue * 0.08;

    const planned = chart.series.push(am5xy.ColumnSeries.new(root, {
      name: 'Planned Expenditure', xAxis, yAxis, valueYField: 'planned', categoryXField: 'financialYear',
      tooltip: am5.Tooltip.new(root, { labelText: tooltipText }),
    }));
    planned.columns.template.setAll({ fill: am5.color(PLANNED_COLOR), stroke: am5.color(PLANNED_COLOR), width: am5.percent(60), cornerRadiusTL: 4, cornerRadiusTR: 4, tooltipY: 0 });
    planned.bullets.push((_root, _series, dataItem) => {
      const d = dataItem.dataContext;
      const inside = isClose(d) && d.actual >= d.planned;
      return am5.Bullet.new(root, {
        locationY: 1,
        sprite: am5.Label.new(root, {
          text: valueText, populateText: true, fontSize: 10, fontWeight: '700', centerX: am5.p50,
          ...(inside ? { centerY: am5.p0, dy: 4, fill: am5.color(0xffffff) } : { centerY: am5.p100, dy: -3, fill: am5.color(c.value) }),
        }),
      });
    });
    planned.data.setAll(data);

    const actualColor = am5.color(ACTUAL_COLOR);
    const actual = chart.series.push(am5xy.LineSeries.new(root, {
      name: 'Actual Expenditure', xAxis, yAxis, valueYField: 'actual', categoryXField: 'financialYear', stroke: actualColor,
      tooltip: am5.Tooltip.new(root, { labelText: tooltipText }),
    }));
    actual.strokes.template.setAll({ strokeWidth: 2 });
    actual.bullets.push(() => am5.Bullet.new(root, {
      sprite: am5.Circle.new(root, { radius: 5, fill: actualColor, stroke: am5.color(c.totalBullet), strokeWidth: 2, tooltipText }),
    }));
    actual.bullets.push((_root, _series, dataItem) => {
      const d = dataItem.dataContext;
      const below = isClose(d) && d.actual < d.planned;
      return am5.Bullet.new(root, {
        sprite: am5.Label.new(root, {
          text: valueText, populateText: true, fontSize: 10, fontWeight: '700', fill: am5.color(c.value), centerX: am5.p50,
          ...(below ? { centerY: am5.p0, dy: 9 } : { centerY: am5.p100, dy: -9 }),
          paddingTop: 1, paddingBottom: 1, paddingLeft: 4, paddingRight: 4,
          background: am5.RoundedRectangle.new(root, { fill: am5.color(c.totalBullet), stroke: actualColor, strokeWidth: 1, cornerRadiusTL: 3, cornerRadiusTR: 3, cornerRadiusBL: 3, cornerRadiusBR: 3 }),
        }),
      });
    });
    actual.data.setAll(data);
    xAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, dark]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

// Year-on-year trend section with its own organisation type / organisation filters
// (independent of the filters at the top of the dashboard).
function YoyTrendSection({ filters, orgScoped, dark, className = 'pt-4' }) {
  const [groupId, setGroupId] = useState(ALL);
  const [organisationId, setOrganisationId] = useState(ALL);
  const [result, setResult] = useState(null);
  const [chartRoot, setChartRoot] = useState(null);
  // Tagged with its request so a stale chart shows as loading until the new data arrives.
  const key = JSON.stringify({ groupId, organisationId });
  useEffect(() => {
    let current = true;
    fetchCapexDashboardYoy(JSON.parse(key))
      .then((res) => { if (current) setResult({ key, data: Array.isArray(res.data) ? res.data : [] }); })
      .catch(() => { if (current) setResult({ key, error: true }); });
    return () => { current = false; };
  }, [key]);

  const organisationOptions = (filters?.organisations || []).filter((o) => groupId === ALL || String(o.groupId) === groupId);
  const chartData = useMemo(() => (result?.data || []).map((r) => {
    const p = percent(r.actual.total, r.planned.total);
    return { financialYear: r.financialYear, planned: r.planned.total, actual: r.actual.total, percentLabel: p === null ? 'No target' : formatPercent(p) };
  }), [result]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters sit directly above the chart card, like the dashboard filters at the top. */}
      {!orgScoped && (
        <div className="flex flex-wrap gap-4">
          <FilterSelect
            className="w-full sm:w-48"
            label="Organisation Type"
            value={groupId}
            onChange={(v) => { setGroupId(v); setOrganisationId(ALL); }}
            options={[{ value: ALL, label: 'All Organisation Types' }, ...(filters?.groups || []).map((g) => ({ value: String(g.id), label: g.name }))]}
          />
          <FilterSelect
            className="w-full sm:w-48"
            label="Organisation"
            value={organisationId}
            onChange={setOrganisationId}
            disabled={groupId === ALL}
            options={groupId === ALL
              ? [{ value: ALL, label: 'Select a type first' }]
              : [{ value: ALL, label: 'All Organisations' }, ...organisationOptions.map((o) => ({ value: String(o.id), label: o.name }))]}
          />
        </div>
      )}
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">Year-on-Year Trend: Planned vs Actual Expenditure (₹ Cr)</h3>
        <ChartExportMenu chartRoot={chartRoot} fileName="capex_year_on_year_trend" color="#6366f1" variant="plain" />
      </div>
      <div className="p-4 space-y-4">
        {result?.key !== key ? (
          <div className="h-80 flex items-center justify-center text-slate-400 text-xs"><RefreshCw size={14} className="animate-spin mr-2" /> Loading trend...</div>
        ) : result.error ? (
          <div className="h-80 flex items-center justify-center text-xs text-red-500">Failed to load the trend.</div>
        ) : chartData.length ? (
          <>
            <div style={{ height: 420 }}><YoyTrendChart data={chartData} onRootReady={setChartRoot} dark={dark} /></div>
            <Legend items={[{ label: 'Planned Expenditure', color: PLANNED_COLOR }, { label: 'Actual Expenditure', color: ACTUAL_COLOR, line: true }]} />
          </>
        ) : (
          <div className="h-60 flex items-center justify-center text-sm text-slate-600 dark:text-slate-300">No CAPEX targets for this selection</div>
        )}
      </div>
    </div>
    </div>
  );
}

// orgScoped: an organisation user, whose data the API already limits to their own
// organisation, so only the year filter is shown.
export default function CapexDashboard({ orgScoped = false }) {
  const [filters, setFilters] = useState(null);
  const [financialYear, setFinancialYear] = useState(null);
  const [groupId, setGroupId] = useState(ALL);
  const [organisationId, setOrganisationId] = useState(ALL);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [chartRoot, setChartRoot] = useState(null);
  // Organisation clicked on the chart; the summary table follows it (null = whole selection).
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [fySummary, setFySummary] = useState(null);
  const dark = useIsDark();

  // Filter options; the year defaults to the current financial year (or the latest one with data).
  useEffect(() => {
    fetchCapexDashboardFilters()
      .then((res) => {
        const f = res.data || {};
        setFilters(f);
        const years = f.financialYears || [];
        const current = currentFinancialYear();
        setFinancialYear(years.includes(current) ? current : (years[0] || ALL));
      })
      .catch(() => { setError('Failed to load dashboard filters.'); setLoading(false); });
  }, []);

  // Loading starts in the handlers that change a filter or retry; the effect only fetches.
  // A response that arrives after a newer request started is ignored.
  useEffect(() => {
    if (financialYear === null) return undefined;
    let current = true;
    fetchCapexDashboardSummary({ financialYear, groupId, organisationId })
      .then((res) => { if (current) setData(res.data); })
      .catch(() => { if (current) setError('Failed to load dashboard data.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [financialYear, groupId, organisationId, reloadKey]);

  // Financial year summary for the clicked organisation, or for the whole filter selection.
  // Tagged with its request so a stale table shows as loading until the new one arrives.
  const fyParams = { financialYear, groupId, organisationId: selectedOrg != null ? String(selectedOrg) : organisationId };
  const fyKey = JSON.stringify(fyParams);
  useEffect(() => {
    if (financialYear === null) return undefined;
    let current = true;
    fetchCapexDashboardFySummary(JSON.parse(fyKey))
      .then((res) => { if (current) setFySummary({ key: fyKey, data: res.data }); })
      .catch(() => { if (current) setFySummary({ key: fyKey, error: true }); });
    return () => { current = false; };
  }, [fyKey, reloadKey, financialYear]);

  // Organisation list follows the selected organisation type.
  const organisationOptions = useMemo(() => (filters?.organisations || [])
    .filter((o) => groupId === ALL || String(o.groupId) === groupId), [filters, groupId]);
  const chartData = useMemo(() => (data?.byOrganisation || []).map((o) => {
    const p = percent(o.actual.total, o.planned.total);
    return { id: o.id, code: o.code, name: o.name, planned: o.planned.total, actual: o.actual.total, percentLabel: p === null ? 'No target' : formatPercent(p) };
  }), [data]);

  const reload = (apply) => {
    setLoading(true);
    setError(null);
    setSelectedOrg(null);
    apply();
  };
  // Clicking the selected organisation again clears the selection.
  const selectOrg = (id) => setSelectedOrg((cur) => (id == null || cur === id ? null : id));
  const changeYear = (value) => reload(() => setFinancialYear(value));
  const changeGroup = (value) => reload(() => {
    setGroupId(value);
    setOrganisationId(ALL);
  });
  const changeOrganisation = (value) => reload(() => setOrganisationId(value));

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={() => (filters ? reload(() => setReloadKey((k) => k + 1)) : window.location.reload())} className="text-xs font-semibold text-[#6366f1] underline cursor-pointer">Retry</button>
    </div>
  );
  if (!data) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard...
    </div>
  );

  const { kpis, lastUpdated } = data;
  const { planned, actual } = kpis;
  const singleOrg = orgScoped || organisationId !== ALL;
  const yearLabel = financialYear === ALL ? 'All financial years' : `FY ${financialYear}`;
  const overall = percent(actual.total, planned.total);
  const balance = planned.total - actual.total;
  const selectedName = data.byOrganisation.find((o) => o.id === selectedOrg)?.name;
  const filteredName = organisationOptions.find((o) => String(o.id) === organisationId)?.name;
  const typeName = (filters?.groups || []).find((g) => String(g.id) === groupId)?.name;
  const summaryTitle = selectedName
    || (orgScoped ? data.byOrganisation[0]?.name : filteredName)
    || (typeName ? `All ${typeName}` : 'All Organisations');

  // Share of each funding type's target that has been spent.
  const fundingPercent = (key) => {
    const p = percent(actual[key], planned[key]);
    if (p !== null) return formatPercent(p);
    return actual[key] > 0 ? `No target (${formatCrore(actual[key])} spent)` : '—';
  };

  const summaryPanel = (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">Financial Year Summary (₹ Cr)</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{summaryTitle}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {yearLabel}{selectedOrg == null && !singleOrg ? ' · click an organisation in the chart to see its summary' : ''}
            </p>
          </div>
          {selectedOrg != null && (
            <button type="button" onClick={() => setSelectedOrg(null)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex-shrink-0">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        {fySummary?.key !== fyKey ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-xs"><RefreshCw size={14} className="animate-spin mr-2" /> Loading summary...</div>
        ) : fySummary.error ? (
          <div className="h-40 flex items-center justify-center text-xs text-red-500">Failed to load the summary.</div>
        ) : (
          <FySummaryTable summary={fySummary.data} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-3xl p-6">
      {/* Filters */}
      <div>
        <div className="flex flex-wrap gap-4">
          <FilterSelect
            className="w-full sm:w-48"
            label="Financial Year"
            value={financialYear}
            onChange={changeYear}
            options={[{ value: ALL, label: 'All Financial Years' }, ...(filters?.financialYears || []).map((y) => ({ value: y, label: y }))]}
          />
          {!orgScoped && <>
          <FilterSelect
            className="w-full sm:w-48"
            label="Organisation Type"
            value={groupId}
            onChange={changeGroup}
            options={[{ value: ALL, label: 'All Organisation Types' }, ...(filters?.groups || []).map((g) => ({ value: String(g.id), label: g.name }))]}
          />
          <FilterSelect
            className="w-full sm:w-48"
            label="Organisation"
            value={organisationId}
            onChange={changeOrganisation}
            // Organisations are picked within a type, so the list opens once a type is chosen.
            disabled={groupId === ALL}
            options={groupId === ALL
              ? [{ value: ALL, label: 'Select a type first' }]
              : [{ value: ALL, label: 'All Organisations' }, ...organisationOptions.map((o) => ({ value: String(o.id), label: o.name }))]}
          />
          </>}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
            Last updated date: {lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </p>
          {loading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Planned Expenditure"
          value={formatCrore(planned.total)}
          caption={yearLabel}
          theme="indigo"
          icon={Target}
          details={[
            ...FUNDING.map((f) => [f.label, formatCrore(planned[f.key])]),
            // A single selected organisation is already named in the filter.
            ...(singleOrg ? [] : [['Organisations', kpis.organisations.toLocaleString('en-IN')]]),
          ]}
        />
        <KpiCard
          label="Actual Expenditure"
          value={formatCrore(actual.total)}
          caption={yearLabel}
          theme="emerald"
          icon={Wallet}
          details={[
            ...FUNDING.map((f) => [f.label, formatCrore(actual[f.key])]),
            ...(singleOrg ? [] : [['Organisations reporting', `${kpis.reportingOrganisations} of ${kpis.organisations}`]]),
          ]}
        />
        <KpiCard
          label="% Expenditure"
          value={overall === null ? '—' : formatPercent(overall)}
          caption="Actual against planned"
          theme="amber"
          icon={Percent}
          progress={overall ?? 0}
          details={[
            ...FUNDING.map((f) => [`${f.label} spent`, fundingPercent(f.key)]),
            balance >= 0 ? ['Balance to spend', formatCrore(balance)] : ['Spent beyond target', formatCrore(-balance)],
          ]}
        />
      </div>

      {orgScoped ? (
        // Organisation view: the organisation's month-wise summary beside its year-on-year trend.
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {summaryPanel}
          <YoyTrendSection filters={filters} orgScoped dark={dark} className="" />
        </div>
      ) : (
      <>
      {/* Chart (left half) and the financial year summary for the clicked organisation (right half) */}
      {/* Both cards share the row height, which the summary table sets: from lg up the chart
          card is taken out of the flow (absolute) and its chart scrolls inside it. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="relative lg:min-h-[480px]">
      <div className="lg:absolute lg:inset-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Organisation-wise Planned vs Actual Expenditure (₹ Cr)</h3>
          <ChartExportMenu chartRoot={chartRoot} fileName={`capex_planned_vs_actual_${financialYear}`} color="#6366f1" variant="plain" />
        </div>
        {chartData.length ? (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4">
              <div style={{ height: chartHeight(chartData.length) }}><PlannedActualChart data={chartData} onRootReady={setChartRoot} dark={dark} selectedId={selectedOrg} onSelect={selectOrg} /></div>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
              <Legend items={[{ label: 'Planned Expenditure', color: PLANNED_COLOR }, { label: 'Actual Expenditure', color: ACTUAL_COLOR }]} />
            </div>
          </>
        ) : (
          <div className="h-60 flex items-center justify-center text-sm text-slate-600 dark:text-slate-300">No CAPEX targets for this selection</div>
        )}
      </div>
      </div>

      {summaryPanel}
      </div>

      <YoyTrendSection filters={filters} orgScoped={false} dark={dark} />
      </>
      )}
    </div>
  );
}
