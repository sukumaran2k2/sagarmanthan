import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Coins, IndianRupee, Wallet, Activity, Filter, RefreshCw, X, AlertCircle, Building2 } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchCsrDashboardData } from '../api';
import { CSR_FOCUS_AREAS, FINANCIAL_YEARS } from '../utils/constants';
import { formatCrore, lakhToCrore } from '../utils/amounts';
import { useCsrStore } from '../store/useCsrStore';
import ChartExportMenu from '../../../components/ChartExportMenu';
import TableExportMenu from '../../../components/TableExportMenu';
import { newChartRoot, chartColors, useIsDark } from '../../../utils/amCharts';
import { COMMON_TOASTS } from '../../../utils/notify';

// Amounts arrive in lakh (as stored) and are shown in crore, as everywhere in CSR Projects.
const cr = (lakh) => `₹ ${formatCrore(lakh)} Cr`;
const count = (v) => (Number(v) || 0).toLocaleString('en-IN');

// Status rows of the project status table, in the order the reference shows them
const STATUSES = [
  { key: 'Completed', label: 'Completed', color: '#10b981' },
  { key: 'Project Under implementation', label: 'Under Implementation', color: '#3b82f6' },
  { key: 'Project yet to start', label: 'Yet to Start', color: '#f59e0b' },
  { key: 'Approved by Board', label: 'Approved by Board', color: '#94a3b8' },
  { key: 'Not set', label: 'Status not set', color: '#cbd5e1' },
];

// Trend series: checked for colour-blind separation and contrast in light and dark mode
const TREND_SERIES = [
  { field: 'allottedCr', label: 'Fund Allotted', color: '#6366f1' },
  { field: 'expenditureCr', label: 'Expenditure', color: '#d97706' },
];
const DISTRIBUTION_COLOR = '#6366f1';

const selectClass = 'text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer';

const CARD_THEME = {
  indigo: 'bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
  amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900',
  sky: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900',
};

function KpiCard({ label, icon: Icon, theme, children, foot }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block">{label}</span>
          <div className="mt-1">{children}</div>
        </div>
        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${CARD_THEME[theme]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {foot && <p className="mt-auto pt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{foot}</p>}
    </div>
  );
}

// Section card in the shared dashboard theme: indigo gradient header, numbered title.
function Section({ number, title, note, actions, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col ${className}`}>
      <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-indigo-200">{number}.</span> {title}
          {note && <span className="text-[10px] font-semibold normal-case tracking-normal text-indigo-200 ml-1">{note}</span>}
        </h3>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
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

// 3. Projects by organisation (2.0's distribution chart): one bar per organisation, most first.
function OrganisationChart({ data, onRootReady, dark }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingLeft: 10, paddingRight: 25, paddingBottom: 18 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10, inversed: true, cellStartLocation: 0.15, cellEndLocation: 0.85 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 220, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'organisationName', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 60 });
    xRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, extraMax: 0.12, maxPrecision: 0, numberFormat: '#,###' }));
    const color = am5.color(DISTRIBUTION_COLOR);
    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
      name: 'Projects', xAxis, yAxis, valueXField: 'projects', categoryYField: 'organisationName',
      tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}\nProjects: [bold]{projects}[/]\nProject value: [bold]{valueText}[/]\nExpenditure: [bold]{spentText}[/]' }),
    }));
    series.columns.template.setAll({ fill: color, stroke: color, height: am5.percent(100), cornerRadiusTR: 4, cornerRadiusBR: 4 });
    series.bullets.push(() => am5.Bullet.new(root, { locationX: 1, sprite: am5.Label.new(root, {
      text: '{projects}', populateText: true, fill: am5.color(c.value), centerY: am5.p50, centerX: am5.p0, dx: 5, fontSize: 9, fontWeight: '700',
    }) }));
    series.data.setAll(data);
    yAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, dark, onRootReady]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

// 4. Year on year: fund allotted and expenditure side by side per financial year (one ₹ Cr axis).
function TrendChart({ data, onRootReady, dark }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingTop: 16, paddingLeft: 10, paddingRight: 20, paddingBottom: 20 }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 20, cellStartLocation: 0.15, cellEndLocation: 0.85 });
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600' });
    xRenderer.grid.template.set('visible', false);
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'financialYear', renderer: xRenderer }));
    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    yRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: 0.08, numberFormat: '₹#,###' }));
    TREND_SERIES.forEach((s) => {
      const color = am5.color(s.color);
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name: s.label, xAxis, yAxis, valueYField: s.field, categoryXField: 'financialYear',
        tooltip: am5.Tooltip.new(root, { labelText: `{categoryX} – ${s.label}: [bold]₹ {valueY.formatNumber("#,###.##")} Cr[/]` }),
      }));
      series.columns.template.setAll({ fill: color, stroke: color, width: am5.percent(90), cornerRadiusTL: 4, cornerRadiusTR: 4 });
      series.data.setAll(data);
    });
    xAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, dark, onRootReady]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

const thClass = 'px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800';
const tdClass = 'px-4 py-2.5 text-xs border-b border-slate-100 dark:border-slate-800/70';

export default function Dashboard({ notify, isOrgUser }) {
  const { filters, organisations, clusters } = useCsrStore(useShallow((state) => ({
    filters: state.dashboardFilters,
    organisations: state.organisations,
    clusters: state.clusters,
  })));
  const { setDashboardFilters, resetDashboardFilters } = useCsrStore(useShallow((state) => ({
    setDashboardFilters: state.setDashboardFilters,
    resetDashboardFilters: state.resetDashboardFilters,
  })));
  const dark = useIsDark();

  // Organisation users always get their own organisation (the server applies it)
  const params = useMemo(() => ({
    clusterId: isOrgUser ? 0 : filters.cluster,
    organisationId: isOrgUser ? 0 : filters.organisation,
    fy: filters.financialYear,
    focusId: filters.focus,
  }), [isOrgUser, filters]);

  // Every figure in one request, tagged with the request it answers; Refresh bumps reloadKey
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = JSON.stringify([params, reloadKey]);
  const [result, setResult] = useState(null); // { key, data, failed }
  useEffect(() => {
    let cancelled = false;
    fetchCsrDashboardData(params)
      .then((data) => { if (!cancelled) setResult({ key: requestKey, data }); })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading CSR dashboard data', err);
        setResult({ key: requestKey, data: null, failed: true });
        notify(COMMON_TOASTS.loadFailed('The CSR dashboard'));
      });
    return () => { cancelled = true; };
  }, [requestKey, params, notify]);
  const loading = result?.key !== requestKey;
  // Keep the last figures on show while the next filter loads
  const data = (loading ? result?.data : result.data) || null;
  const failed = !loading && result.failed;

  const [orgRoot, setOrgRoot] = useState(null);
  const [trendRoot, setTrendRoot] = useState(null);

  const kpi = data?.kpi || {};
  const fund = data?.fundSummary || {};
  const isOrgView = data?.view?.level === 'organisation';
  const allYears = filters.financialYear === 'all';
  const yearLabel = allYears ? 'All Financial Years' : `FY ${filters.financialYear}`;

  const statusRows = useMemo(() => {
    const rows = data?.statuses || [];
    return STATUSES
      .map((s) => ({ ...s, ...(rows.find((r) => r.status === s.key) || { projects: 0, projectValue: 0 }) }))
      .filter((s) => s.key !== 'Not set' || s.projects > 0);
  }, [data]);
  const totalProjects = statusRows.reduce((sum, s) => sum + s.projects, 0);
  const totalStatusValue = statusRows.reduce((sum, s) => sum + s.projectValue, 0);
  const share = (n) => (totalProjects ? `${((n / totalProjects) * 100).toFixed(1)}%` : '0%');

  const fundRows = [
    { label: 'Net Profit', value: fund.netProfit },
    { label: allYears ? 'Opening Balance under CSR Fund (first year)' : 'Opening Balance under CSR Fund', value: fund.openingBalance },
    { label: allYears ? 'CSR Fund Allotted' : 'CSR Fund Allotted for the Year', value: fund.allotted, strong: true },
    { label: 'Total Project Value', value: fund.projectValue },
    { label: 'CSR Expenditure (as reported)', value: fund.expenditure },
  ];
  const balance = Number(fund.balance) || 0;

  const organisationData = useMemo(() => (data?.byOrganisation || []).map((o) => ({
    ...o, valueText: cr(o.projectValue), spentText: cr(o.expenditure),
  })), [data]);
  const trendData = useMemo(() => (data?.trend || []).map((t) => ({
    ...t, allottedCr: lakhToCrore(t.allotted), expenditureCr: lakhToCrore(t.expenditure),
  })), [data]);
  const orgChartHeight = Math.max(260, organisationData.length * 34 + 60);

  const hasActiveFilters = (!isOrgUser && (filters.cluster !== 0 || filters.organisation !== 0))
    || filters.financialYear !== 'all' || filters.focus !== 0;
  const asOn = data?.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const show = (v) => (data ? v : '…');

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="module-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>Dashboard Filters</span>
            </span>
            {isOrgView && data.view.organisationName && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#0f417a] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-lg px-2.5 py-1">
                <Building2 className="h-3.5 w-3.5" /> {data.view.organisationName}
              </span>
            )}
            {asOn && <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Data as on {asOn}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isOrgUser && clusters.length > 0 && (
              <select value={filters.cluster} onChange={(e) => setDashboardFilters({ cluster: Number(e.target.value) })} className={selectClass} aria-label="Cluster">
                <option value={0}>All Clusters</option>
                {clusters.map((c) => <option key={c.hr_cluster_id} value={c.hr_cluster_id}>{c.hr_cluster_name}</option>)}
              </select>
            )}
            {!isOrgUser && (
              <select value={filters.organisation} onChange={(e) => setDashboardFilters({ organisation: Number(e.target.value) })} className={selectClass} aria-label="Organisation">
                <option value={0}>All Organisations</option>
                {organisations.map((o) => <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>)}
              </select>
            )}
            <select value={filters.financialYear} onChange={(e) => setDashboardFilters({ financialYear: e.target.value })} className={selectClass} aria-label="Financial year">
              <option value="all">All Financial Years</option>
              {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
            </select>
            <select value={filters.focus} onChange={(e) => setDashboardFilters({ focus: Number(e.target.value) })} className={`${selectClass} max-w-[200px]`} aria-label="Focus area">
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

      {failed && !data && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
          <span className="flex items-center gap-2 text-xs font-semibold"><AlertCircle className="h-5 w-5 text-rose-600" /> The CSR dashboard could not be loaded.</span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer">Retry</button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="CSR Fund Allotted" icon={Coins} theme="indigo" foot={allYears ? 'All financial years' : `For ${yearLabel}`}>
          <span className="text-2xl font-black text-[#4f46e5] dark:text-indigo-400">{show(cr(kpi.fundAllotted))}</span>
        </KpiCard>
        <KpiCard label="Total Project Value" icon={IndianRupee} theme="sky" foot={<>Across <span className="font-black text-slate-700 dark:text-slate-200">{show(count(kpi.projects))}</span> projects</>}>
          <span className="text-2xl font-black text-sky-700 dark:text-sky-400">{show(cr(kpi.projectValue))}</span>
        </KpiCard>
        <KpiCard label="CSR Expenditure" icon={Wallet} theme="amber" foot={allYears ? 'Booked across all years' : `Booked in ${yearLabel}`}>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{show(cr(kpi.expenditure))}</span>
        </KpiCard>
        <KpiCard label="Project Progress" icon={Activity} theme="emerald">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block">{show(count(kpi.underImplementation))}</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Under Implementation</span>
            </div>
            <div>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{show(count(kpi.completed))}</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Completed</span>
            </div>
          </div>
        </KpiCard>
      </div>

      {/* 1 & 2: fund summary and project status, side by side */}
      {/* Both cards stretch to the taller one; the status rows spread to fill the extra height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          number={1}
          title={`CSR Fund Summary (${yearLabel})`}
          note="₹ in Cr"
          actions={(
            <TableExportMenu
              headers={['Particulars', 'Amount (₹ Cr)']}
              rows={[...fundRows.map((r) => [r.label, formatCrore(r.value)]), ['Balance Available', formatCrore(balance)]]}
              fileName="csr_fund_summary"
              title={`CSR Fund Summary (${yearLabel}, ₹ Cr)`}
            />
          )}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${thClass} text-left`}>Particulars</th>
                <th className={`${thClass} text-right`}>Amount (₹ Cr)</th>
              </tr>
            </thead>
            <tbody>
              {fundRows.map((r) => (
                <tr key={r.label} className={r.strong ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : ''}>
                  <td className={`${tdClass} ${r.strong ? 'font-black text-[#1e1b4b] dark:text-indigo-200' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>{r.label}</td>
                  <td className={`${tdClass} text-right ${r.strong ? 'font-black text-[#1e1b4b] dark:text-indigo-200' : 'font-semibold text-slate-800 dark:text-slate-100'}`}>{show(formatCrore(r.value ?? 0))}</td>
                </tr>
              ))}
              <tr className={balance < 0 ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}>
                <td className={`px-4 py-3 text-sm font-black ${balance < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>Balance Available</td>
                <td className={`px-4 py-3 text-sm text-right font-black ${balance < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{show(formatCrore(balance))}</td>
              </tr>
            </tbody>
          </table>
          <p className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Balance = opening balance + fund allotted − expenditure.
            {allYears && ' For all years the opening balance is each organisation\'s first year.'}
            {filters.focus !== 0 && ' Funds have no focus area, so this table covers every focus area.'}
          </p>
        </Section>

        <Section
          number={2}
          title={`CSR Project Status (${yearLabel})`}
          actions={(
            <TableExportMenu
              headers={['Status', 'No. of Projects', 'Project Value (₹ Cr)', '% of Total Projects']}
              rows={[...statusRows.map((s) => [s.label, s.projects, formatCrore(s.projectValue), share(s.projects)]), ['Total', totalProjects, formatCrore(totalStatusValue), totalProjects ? '100%' : '0%']]}
              fileName="csr_project_status"
              title={`CSR Project Status (${yearLabel})`}
            />
          )}
        >
          <div className="flex-1">
          <table className="w-full h-full border-collapse">
            <thead>
              <tr>
                <th className={`${thClass} text-left`}>Status</th>
                <th className={`${thClass} text-center`}>No. of Projects</th>
                <th className={`${thClass} text-right`}>Project Value (₹ Cr)</th>
                <th className={`${thClass} text-right`}>% of Total Projects</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map((s) => (
                <tr key={s.key}>
                  <td className={`${tdClass} font-semibold text-slate-700 dark:text-slate-200`}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                  </td>
                  <td className={`${tdClass} text-center font-bold text-slate-800 dark:text-slate-100`}>{show(count(s.projects))}</td>
                  <td className={`${tdClass} text-right font-semibold text-slate-800 dark:text-slate-100`}>{show(formatCrore(s.projectValue))}</td>
                  <td className={`${tdClass} text-right font-semibold text-slate-600 dark:text-slate-300`}>{show(share(s.projects))}</td>
                </tr>
              ))}
              <tr className="bg-indigo-50/70 dark:bg-indigo-950/30">
                <td className="px-4 py-3 text-sm font-black text-[#1e1b4b] dark:text-indigo-200">Total</td>
                <td className="px-4 py-3 text-sm text-center font-black text-[#1e1b4b] dark:text-indigo-200">{show(count(totalProjects))}</td>
                <td className="px-4 py-3 text-sm text-right font-black text-[#1e1b4b] dark:text-indigo-200">{show(formatCrore(totalStatusValue))}</td>
                <td className="px-4 py-3 text-sm text-right font-black text-[#1e1b4b] dark:text-indigo-200">{totalProjects ? '100%' : '0%'}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </Section>
      </div>

      {/* 3. Projects by organisation (not in the organisation view: it is one organisation) */}
      {!isOrgView && (
        <Section
          number={3}
          title={`CSR Projects Distribution by Organisation (${yearLabel})`}
          actions={<ChartExportMenu chartRoot={orgRoot} fileName="csr_projects_by_organisation" color="#6366f1" variant="plain" />}
        >
          <div className="p-4">
            {organisationData.length ? (
              <div style={{ height: orgChartHeight }}>
                <OrganisationChart data={organisationData} onRootReady={setOrgRoot} dark={dark} />
              </div>
            ) : (
              <p className="py-12 text-center text-xs font-semibold text-slate-500">{data ? 'No CSR projects match the filters.' : 'Loading…'}</p>
            )}
            <p className="text-[10px] text-center font-semibold text-slate-500 dark:text-slate-400 mt-1">Number of projects → (hover a bar for project value and expenditure)</p>
          </div>
        </Section>
      )}

      {/* 4. Fund allotted and expenditure, year on year */}
      <Section
        number={isOrgView ? 3 : 4}
        title="CSR Expenditure & Fund Allocation – Year on Year"
        note="₹ in Cr"
        actions={<ChartExportMenu chartRoot={trendRoot} fileName="csr_fund_expenditure_trend" color="#6366f1" variant="plain" />}
      >
        <div className="p-4 space-y-2">
          {trendData.length ? (
            <div style={{ height: 380 }}>
              <TrendChart data={trendData} onRootReady={setTrendRoot} dark={dark} />
            </div>
          ) : (
            <p className="py-12 text-center text-xs font-semibold text-slate-500">{data ? 'No fund or expenditure has been recorded.' : 'Loading…'}</p>
          )}
          <Legend items={TREND_SERIES} />
          <p className="text-[10px] text-center font-semibold text-slate-500 dark:text-slate-400">
            Every financial year, for the selected cluster, organisation and focus area. Expenditure is shown in the year it was booked.
          </p>
        </div>
      </Section>
    </div>
  );
}
