import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FolderKanban, ClipboardList, Gavel, HardHat, CheckCircle2, IndianRupee, Wallet, CalendarRange,
  Activity, Gauge, CalendarClock, Landmark, Flag, Timer, MousePointerClick, BadgeCheck, Handshake, Hourglass,
  Clock, AlertTriangle, AlertOctagon, HelpCircle, Target,
} from 'lucide-react';
import DashboardPieChart from '../components/dashboard/DashboardPieChart';
import ChartExportMenu from '../../../components/ChartExportMenu';
import { useIsDark } from '../../../utils/amCharts';
import { fetchProjectsDashboardFilters, fetchProjectsDashboardSummary } from '../api';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import DashboardChart from '../components/dashboard/DashboardChart';
import { ProjectDetailDrill, ProjectListDrill } from '../components/dashboard/ProjectsDrillDown';
import {
  DataTable, KpiCard, Legend, Loading, NoData, Section, SectionDivider, SectionTabs, TableSection,
} from '../components/dashboard/DashboardParts';
import TableExportMenu from '../../../components/TableExportMenu';
import { PANEL_KEYS } from '../components/dashboard/dashboardConfig';
import {
  ALL, CARD_THEME, DELAY_COLORS, DELAY_THEME, FY_MILESTONE_SERIES, FY_PROGRESS_SERIES, PRIMARY_COLOR, SECONDARY_COLOR, STAGE_COLORS, STAGE_THEME,
  formatAmount, formatCount, formatCrore, formatDays, formatNumber, formatPercent, rowsHeight, tableExport,
} from '../components/dashboard/dashboardTheme';

// Projects dashboard, built on the "Major Port Projects - Monitoring & Review Dashboard"
// workbook and the earlier portal's project dashboard: filters, stage cards, portfolio
// figures, stage / organisation / category / financial-year / parameter analysis and the
// largest projects. Every figure opens the projects behind it (drill-down), and each
// project opens its full dashboard record.

const MAJOR_PORTS_TYPE_ID = '1';

const BASE_FILTERS = {
  organisationTypeId: ALL,
  organisationId: ALL,
  stageGroup: ALL,
  stageId: ALL,
  mode: ALL,
  broadCategory: ALL,
  ...Object.fromEntries(PANEL_KEYS.map((k) => [k, ''])),
};

const STAGE_ICONS = { planning: ClipboardList, tendering: Gavel, implementation: HardHat, completed: CheckCircle2 };
const DELAY_ICONS = { 'On time': Clock, Delayed: AlertTriangle, 'Badly delayed': AlertOctagon, 'Not available': HelpCircle };
const DELAY_CAPTIONS = {
  'On time': 'Due date not passed, or done by it',
  Delayed: 'Up to 6 months past the due date',
  'Badly delayed': 'More than 6 months past the due date',
  'Not available': 'Dates needed for the check are not entered',
};
const ONGOING_STAGES = [
  { id: 'planning', name: 'Planning & Sanctioning' },
  { id: 'tendering', name: 'Under Tendering' },
  { id: 'implementation', name: 'Under Implementation' },
];
const DELAY_TABS = [{ id: 'all', label: 'All ongoing' }, ...ONGOING_STAGES.map((s) => ({ id: s.id, label: s.name }))];
const DELAY_RULE_NOTE = 'Planning & Sanctioning: time from the Project Initiated date to approval (or to today) - on time up to 12 months, delayed 12 to 24 months, badly delayed beyond. Under Tendering: due date = the revised Work Awarded / LOA date if entered, else the planned date. Under Implementation: due date = the current target completion date (latest revised date if entered, else the target date). On time = the due date has not passed (or the step was done by it); delayed = up to 6 months past the due date; badly delayed = more than 6 months past it. Completed projects are not classified.';

// Chart series (module constants so the charts are not rebuilt on every render).
const STAGE_SERIES = [{ field: 'projects', name: 'Projects', color: PRIMARY_COLOR, colorField: 'color' }];
const ORG_STATUS_SERIES = [
  { field: 'completed', name: 'Completed', color: STAGE_COLORS.completed },
  { field: 'ongoing', name: 'Ongoing', color: STAGE_COLORS.implementation },
];
const COST_SERIES = [
  { field: 'estimatedCost', name: 'Estimated cost (₹ Cr)', color: PRIMARY_COLOR },
  { field: 'expenditure', name: 'Expenditure (₹ Cr)', color: SECONDARY_COLOR },
];
const PROJECTS_SERIES = [{ field: 'projects', name: 'Projects', color: PRIMARY_COLOR }];
const COST_ONLY_SERIES = [{ field: 'estimatedCost', name: 'Estimated cost (₹ Cr)', color: PRIMARY_COLOR }];

const PARAMETER_TABS = [
  { id: 'broadCategory', label: 'Broad Category' },
  { id: 'mode', label: 'Mode of Implementation' },
  { id: 'approvalRoute', label: 'Approval Route' },
  { id: 'state', label: 'State' },
  { id: 'scheme', label: 'Scheme' },
  { id: 'funding', label: 'Source of Funding' },
  { id: 'costBand', label: 'Cost Band' },
  { id: 'capacityBand', label: 'Capacity Band' },
  { id: 'progressBand', label: 'Implementation Milestone' },
];

const FY_EVENT_LABELS = {
  initiated: 'Projects initiated',
  sanctioned: 'Sanctioned (board / admin approval)',
  awarded: 'Contracts awarded (LOA issued)',
  completed: 'Actual completions',
  foundation: 'Foundations laid or expected',
  inauguration: 'Inaugurations held or expected',
};

const amountCol = (key, label, extra = {}) => ({ key, label, format: (v) => formatAmount(v), ...extra });
const countCol = (key, label, extra = {}) => ({ key, label, format: (v) => formatCount(v), ...extra });

// Column totals of a table: sum of the given keys.
const totalsOf = (rows, keys) => Object.fromEntries(keys.map((k) => [k, rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0)]));

// Two side-by-side figures (EPC / PPP) under one heading.
function SplitCard({ label, caption, icon: Icon, theme = 'indigo', items }) {
  const t = CARD_THEME[theme];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block">{label}</span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{caption}</span>
        </div>
        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${t.icon}`}><Icon className="h-5 w-5" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block">{item.label}</span>
            <span className={`text-xl font-black ${t.value}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Section holding one chart, with the chart export menu in its header.
function ChartSection({ title, fileName, height, note, hint, legend, tabs, children }) {
  const [chartRoot, setChartRoot] = useState(null);
  return (
    <Section title={title} note={note} actions={<ChartExportMenu chartRoot={chartRoot} fileName={fileName} color={PRIMARY_COLOR} variant="plain" />}>
      {tabs}
      {hint ? (
        <p className="flex items-center gap-1.5 pb-2 text-[11px] text-slate-500 dark:text-slate-400">
          <MousePointerClick className="h-3.5 w-3.5 flex-shrink-0" /> {hint}
        </p>
      ) : null}
      <div style={{ height }}>{children(setChartRoot)}</div>
      {legend ? <div className="pt-3"><Legend items={legend} /></div> : null}
    </Section>
  );
}

export default function ProjectDashboardPage({ triggerNotification }) {
  const permissions = useProjectsPermissions();
  const orgScoped = Boolean(permissions.isOrgScope);
  const dark = useIsDark();
  const topRef = useRef(null);

  const [meta, setMeta] = useState(null);
  const [defaults, setDefaults] = useState(BASE_FILTERS);
  const [filters, setFilters] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Drill-down stack: { type: 'list', title, params } or { type: 'project', project }.
  const [drills, setDrills] = useState([]);
  const [categoryMetric, setCategoryMetric] = useState('projects');
  const [parameterTab, setParameterTab] = useState('broadCategory');
  const [delayTab, setDelayTab] = useState('all');

  // Filter options. Ministry users start on Major Ports, as the workbook and the earlier portal did.
  useEffect(() => {
    fetchProjectsDashboardFilters()
      .then((res) => {
        const m = res.data || {};
        const start = !orgScoped && (m.organisationTypes || []).some((t) => String(t.id) === MAJOR_PORTS_TYPE_ID)
          ? { ...BASE_FILTERS, organisationTypeId: MAJOR_PORTS_TYPE_ID }
          : BASE_FILTERS;
        setMeta(m);
        setDefaults(start);
        setFilters(start);
      })
      .catch(() => setError('Failed to load dashboard filters.'));
  }, [orgScoped]);

  // Tagged with its request so a stale summary shows as loading until the new one arrives.
  const key = filters ? JSON.stringify(filters) : null;
  useEffect(() => {
    if (!key) return undefined;
    let current = true;
    fetchProjectsDashboardSummary(JSON.parse(key))
      .then((res) => { if (current) { setResult({ key, data: res.data }); setError(null); } })
      .catch(() => { if (current) setError('Failed to load dashboard data.'); });
    return () => { current = false; };
  }, [key, reloadKey]);

  const changeFilters = useCallback((patch) => setFilters((f) => ({ ...f, ...patch })), []);
  const resetFilters = useCallback(() => setFilters(defaults), [defaults]);

  // Short description of the filters for drill-down headers.
  const filterSummary = useMemo(() => {
    if (!filters || !meta) return '';
    const parts = [];
    const type = (meta.organisationTypes || []).find((t) => String(t.id) === filters.organisationTypeId);
    const org = (meta.organisations || []).find((o) => String(o.id) === filters.organisationId);
    if (org) parts.push(org.name);
    else if (type) parts.push(type.name);
    else if (!orgScoped) parts.push('All organisations');
    const group = (meta.stageGroups || []).find((g) => g.id === filters.stageGroup);
    const stage = (meta.stages || []).find((s) => String(s.id) === filters.stageId);
    if (stage || group) parts.push((stage || group).name);
    if (filters.mode !== ALL) parts.push(filters.mode);
    if (filters.broadCategory !== ALL) parts.push(filters.broadCategory);
    const more = PANEL_KEYS.filter((k) => filters[k] !== '').length;
    if (more) parts.push(`${more} more filter${more === 1 ? '' : 's'}`);
    return parts.join(' · ');
  }, [filters, meta, orgScoped]);

  const openDrill = useCallback((item) => setDrills((d) => [...d, item]), []);
  // Opening or closing a drill-down brings the top of the dashboard into view.
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [drills.length]);
  const openList = useCallback((title, params = {}) => openDrill({ type: 'list', title, params }), [openDrill]);
  const openProject = useCallback((project) => openDrill({ type: 'project', project }), [openDrill]);
  const closeDrill = useCallback(() => setDrills((d) => d.slice(0, -1)), []);

  const data = result?.data;
  const loading = result?.key !== key;

  // Chart data (memoised: a new array rebuilds the chart).
  const stageChart = useMemo(() => (data?.byStage || []).map((s) => ({ ...s, color: STAGE_COLORS[s.group] })), [data]);
  const orgChart = useMemo(() => (data?.byOrganisation || [])
    .map((o) => ({ id: o.id, name: o.code, fullName: o.name, completed: o.completed, ongoing: o.ongoing, estimatedCost: o.estimatedCost, expenditure: o.expenditure }))
    .sort((a, b) => (b.completed + b.ongoing) - (a.completed + a.ongoing)), [data]);
  const costChart = useMemo(() => [...orgChart].sort((a, b) => b.estimatedCost - a.estimatedCost), [orgChart]);
  const categoryChart = useMemo(() => [...(data?.byCategory || [])]
    .sort((a, b) => (categoryMetric === 'projects' ? b.projects - a.projects : b.estimatedCost - a.estimatedCost))
    .slice(0, 15)
    .map((c) => ({ name: c.key, projects: c.projects, estimatedCost: c.estimatedCost })), [data, categoryMetric]);
  const fyChart = useMemo(() => data?.byFinancialYear || [], [data]);
  const delayChart = useMemo(() => {
    if (!data?.delay) return [];
    const counts = delayTab === 'all' ? data.delay.total : data.delay.byStage[delayTab];
    return data.delay.statuses
      .map((s) => ({ name: s, value: counts?.[s] || 0, color: DELAY_COLORS[s] }))
      .filter((d) => d.value > 0);
  }, [data, delayTab]);
  const parameterChart = useMemo(() => (data?.parameters?.[parameterTab] || []).map((p) => ({ name: p.key, projects: p.projects })), [data, parameterTab]);

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => (meta ? (setError(null), setReloadKey((k) => k + 1)) : window.location.reload())}
          className="text-xs font-semibold text-[#6366f1] underline cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!data) return <Loading />;

  const drill = drills[drills.length - 1];
  const { kpis, stageCards, financialYear } = data;
  const fyLabel = `FY ${financialYear}`;
  const showOrganisations = !orgScoped && data.byOrganisation.length > 1;

  // ---- Tables ----------------------------------------------------------------------------
  const orgDrill = (row, title, dim2, value2) => () => openList(`${row.name} - ${title}`, { dim: 'organisation', value: String(row.id), ...(dim2 ? { dim2, value2 } : {}) });
  const portColumns = [
    { key: 'name', label: 'Port / Organisation', align: 'left' },
    countCol('projects', 'Projects', { drill: (r) => orgDrill(r, 'All projects'), totalDrill: () => () => openList('All projects') }),
    countCol('completed', 'Completed', { drill: (r) => orgDrill(r, 'Completed', 'completion', 'completed'), totalDrill: () => () => openList('Completed projects', { dim: 'completion', value: 'completed' }) }),
    countCol('ongoing', 'Ongoing', { drill: (r) => orgDrill(r, 'Ongoing', 'completion', 'ongoing'), totalDrill: () => () => openList('Ongoing projects', { dim: 'completion', value: 'ongoing' }) }),
    amountCol('estimatedCost', 'Estimated Cost (₹ Cr)'),
    amountCol('sanctionedCost', 'Sanctioned Cost (₹ Cr)'),
    amountCol('awardedCost', 'Awarded Cost (₹ Cr)'),
    amountCol('expenditure', 'Expenditure (₹ Cr)'),
    amountCol('currentFyTarget', `Current-year Target ${financialYear} (₹ Cr)`),
    amountCol('currentFySpendImplementation', 'Current-year Spend, Under Implementation (₹ Cr)'),
    { key: 'avgProgress', label: 'Avg Physical Progress', format: (v) => formatPercent(v) },
    { key: 'capacity', label: 'Capacity (MTPA)', format: (v) => formatNumber(v) },
  ];
  // Average progress has no meaningful column total, so it is left out of the totals row.
  const portTotals = totalsOf(data.byOrganisation, ['projects', 'completed', 'ongoing', 'estimatedCost', 'sanctionedCost', 'awardedCost', 'expenditure', 'currentFyTarget', 'currentFySpendImplementation', 'capacity']);

  const stageColumns = [
    { key: 'name', label: 'Current Stage', align: 'left' },
    countCol('projects', 'Projects', { drill: (r) => () => openList(r.name, { dim: 'stage', value: String(r.key) }), totalDrill: () => () => openList('All projects') }),
    amountCol('estimatedCost', 'Estimated Cost (₹ Cr)'),
  ];

  const orgStageColumns = [
    { key: 'name', label: 'Port / Organisation', align: 'left' },
    ...data.stages.map((s) => countCol(`stage_${s.id}`, s.name, {
      drill: (r) => orgDrill(r, s.name, 'stage', String(s.id)),
      totalDrill: () => () => openList(s.name, { dim: 'stage', value: String(s.id) }),
    })),
    countCol('projects', 'Total', { drill: (r) => orgDrill(r, 'All projects'), totalDrill: () => () => openList('All projects') }),
  ];
  const orgStageRows = data.byOrganisation.map((o) => ({
    key: o.id, id: o.id, name: o.name, projects: o.projects,
    ...Object.fromEntries(data.stages.map((s) => [`stage_${s.id}`, o.byStage[s.id] || 0])),
  }));

  const progressColumns = [
    { key: 'name', label: 'Port / Organisation', align: 'left' },
    ...data.progressBands.map((b, i) => countCol(`band_${i}`, b, {
      drill: (r) => orgDrill(r, b, 'progressBand', b),
      totalDrill: () => () => openList(`Physical progress - ${b}`, { dim: 'progressBand', value: b }),
    })),
    countCol('projects', 'Total', { drill: (r) => orgDrill(r, 'All projects'), totalDrill: () => () => openList('All projects') }),
  ];
  const progressRows = data.byOrganisation.map((o) => ({
    key: o.id, id: o.id, name: o.name, projects: o.projects,
    ...Object.fromEntries(data.progressBands.map((b, i) => [`band_${i}`, o.byProgressBand[b] || 0])),
  }));

  const categoryDrill = (r, title, dim2, value2) => () => openList(`${r.key} - ${title}`, { dim: 'category', value: r.key, ...(dim2 ? { dim2, value2 } : {}) });
  const categoryColumns = [
    { key: 'key', label: 'Project Category', align: 'left', wrap: true },
    countCol('projects', 'Projects', { drill: (r) => categoryDrill(r, 'All projects') }),
    countCol('completed', 'Completed', { drill: (r) => categoryDrill(r, 'Completed', 'completion', 'completed') }),
    countCol('ongoing', 'Ongoing', { drill: (r) => categoryDrill(r, 'Ongoing', 'completion', 'ongoing') }),
    amountCol('estimatedCost', 'Estimated Cost (₹ Cr)'),
    amountCol('awardedCost', 'Awarded Cost (₹ Cr)'),
    amountCol('expenditure', 'Expenditure (₹ Cr)'),
    { key: 'capacity', label: 'Capacity (MTPA)', format: (v) => formatNumber(v) },
  ];

  const broadDrill = (r, title, dim2, value2) => () => openList(`${r.key} - ${title}`, { dim: 'broadCategory', value: r.key, ...(dim2 ? { dim2, value2 } : {}) });
  const broadColumns = [
    { key: 'key', label: 'Broad Category', align: 'left', wrap: true },
    countCol('ongoingEpc', 'Ongoing EPC', {
      drill: (r) => broadDrill(r, 'Ongoing EPC', 'ongoingMode', 'EPC'),
      totalDrill: () => () => openList('Ongoing EPC projects', { dim: 'ongoingMode', value: 'EPC' }),
    }),
    countCol('ongoingPpp', 'Ongoing PPP', {
      drill: (r) => broadDrill(r, 'Ongoing PPP', 'ongoingMode', 'PPP'),
      totalDrill: () => () => openList('Ongoing PPP projects', { dim: 'ongoingMode', value: 'PPP' }),
    }),
    countCol('ongoing', 'Total Ongoing', {
      drill: (r) => broadDrill(r, 'Ongoing', 'completion', 'ongoing'),
      totalDrill: () => () => openList('Ongoing projects', { dim: 'completion', value: 'ongoing' }),
    }),
    { key: 'share', label: 'Share of Ongoing', format: (v) => formatPercent(v) },
    amountCol('ongoingEstimatedCost', 'Ongoing Estimated Cost (₹ Cr)'),
  ];
  const ongoingTotal = data.byBroadCategory.reduce((acc, r) => acc + r.ongoing, 0);
  const broadRows = data.byBroadCategory
    .filter((r) => r.ongoing > 0)
    .map((r) => ({ ...r, share: ongoingTotal ? Math.round((r.ongoing / ongoingTotal) * 1000) / 10 : null }));

  const fyColumns = [
    { key: 'financialYear', label: 'Financial Year', align: 'left' },
    ...Object.entries(FY_EVENT_LABELS).map(([event, text]) => countCol(event, text, {
      drill: (r) => () => openList(`${text} - FY ${r.financialYear}`, { dim: `fy-${event}`, value: r.financialYear }),
    })),
  ];

  const parameterLabel = PARAMETER_TABS.find((t) => t.id === parameterTab)?.label;
  const parameterColumns = [
    { key: 'key', label: parameterLabel, align: 'left', wrap: true },
    countCol('projects', 'Projects', { drill: (r) => () => openList(`${parameterLabel}: ${r.key}`, { dim: parameterTab, value: r.key }) }),
    amountCol('estimatedCost', 'Estimated Cost (₹ Cr)'),
    amountCol('expenditure', 'Expenditure (₹ Cr)'),
    { key: 'avgProgress', label: 'Avg Physical Progress', format: (v) => formatPercent(v) },
  ];
  const parameterRows = data.parameters[parameterTab] || [];

  const largestColumns = [
    { key: 'rank', label: '#', align: 'left' },
    { key: 'code', label: 'Project ID', align: 'left' },
    { key: 'name', label: 'Project Name', align: 'left', wrap: true },
    { key: 'organisationName', label: 'Port / Organisation', align: 'left' },
    { key: 'category', label: 'Category', align: 'left', wrap: true },
    { key: 'stageName', label: 'Current Stage', align: 'left' },
    amountCol('estimatedCost', 'Estimated Cost (₹ Cr)'),
    amountCol('awardedCost', 'Awarded Cost (₹ Cr)'),
    amountCol('expenditure', 'Expenditure (₹ Cr)'),
  ];
  const largestRows = data.largest.map((p, i) => ({ ...p, rank: i + 1, name: p.subProjectName ? `${p.projectName} / ${p.subProjectName}` : p.projectName }));

  const { delay } = data;
  const delayStatusColumns = (drillOf, totalDrillOf) => delay.statuses.map((s) => countCol(s, s, {
    drill: (r) => drillOf(r, s),
    totalDrill: () => totalDrillOf(s),
  }));
  const delayTotal = (counts) => delay.statuses.reduce((acc, s) => acc + (counts?.[s] || 0), 0);
  const delayStageColumns = [
    { key: 'name', label: 'Stage', align: 'left' },
    ...delayStatusColumns(
      (r, s) => () => openList(`${r.name} - ${s}`, { dim: 'delayStatus', value: s, dim2: 'stageGroup', value2: r.id }),
      (s) => () => openList(`${s} - all ongoing stages`, { dim: 'delayStatus', value: s }),
    ),
    countCol('total', 'Total', {
      drill: (r) => () => openList(r.name, { dim: 'stageGroup', value: r.id }),
      totalDrill: () => () => openList('Ongoing projects', { dim: 'completion', value: 'ongoing' }),
    }),
  ];
  const delayStageRows = ONGOING_STAGES.map((s) => ({ key: s.id, id: s.id, name: s.name, ...delay.byStage[s.id], total: delayTotal(delay.byStage[s.id]) }));
  const delayPortColumns = [
    { key: 'name', label: 'Port / Organisation', align: 'left' },
    ...delayStatusColumns(
      (r, s) => orgDrill(r, s, 'delayStatus', s),
      (s) => () => openList(`${s} - all ongoing stages`, { dim: 'delayStatus', value: s }),
    ),
    countCol('total', 'Ongoing', {
      drill: (r) => orgDrill(r, 'Ongoing', 'completion', 'ongoing'),
      totalDrill: () => () => openList('Ongoing projects', { dim: 'completion', value: 'ongoing' }),
    }),
  ];
  const delayPortRows = data.byOrganisation.map((o) => ({ key: o.id, id: o.id, name: o.name, ...o.byDelayStatus, total: delayTotal(o.byDelayStatus) }));
  const delayTabLabel = DELAY_TABS.find((t) => t.id === delayTab)?.label;

  // ---- Drill-down in place of the dashboard ---------------------------------------------
  const drillView = drill ? (
    drill.type === 'project' ? (
      <ProjectDetailDrill key={drill.project.key} project={drill.project} onBack={closeDrill} triggerNotification={triggerNotification} />
    ) : (
      <ProjectListDrill
        key={`${drill.title}-${drills.length}`}
        drill={drill}
        filters={filters}
        filterSummary={filterSummary}
        onBack={closeDrill}
        onOpenProject={openProject}
        triggerNotification={triggerNotification}
      />
    )
  ) : null;

  return (
    <div ref={topRef} className="space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-3xl p-6 scroll-mt-4">
      {drillView}

      {/* The dashboard stays mounted under a drill-down so filters, tabs and charts are kept on Back. */}
      <div className={drill ? 'hidden' : 'space-y-5'}>
        <DashboardFilters
          meta={meta}
          filters={filters}
          onChange={changeFilters}
          onReset={resetFilters}
          orgScoped={orgScoped}
          loading={loading}
          lastUpdated={data.lastUpdated}
          onBrowseProjects={() => openList('All projects in the current filter')}
        />

        {/* Stage cards (earlier portal): count, cost, capacity and EPC / PPP split */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            label="Projects in current filter"
            value={formatCount(kpis.projects)}
            caption={`Estimated cost ${formatCrore(kpis.estimatedCost)}`}
            theme="indigo"
            icon={FolderKanban}
            onOpen={() => openList('All projects in the current filter')}
            details={[
              ['Capacity (MTPA)', formatNumber(kpis.capacityAddition)],
              ['EPC', formatCount(stageCards.reduce((a, s) => a + s.epc.projects, 0))],
              ['PPP', formatCount(stageCards.reduce((a, s) => a + s.ppp.projects, 0))],
            ]}
          />
          {stageCards.map((s) => (
            <KpiCard
              key={s.id}
              label={s.name}
              value={formatCount(s.projects)}
              caption={`${s.costLabel} ${formatCrore(s.cost)}`}
              theme={STAGE_THEME[s.id]}
              icon={STAGE_ICONS[s.id]}
              progress={kpis.projects ? (s.projects / kpis.projects) * 100 : 0}
              onOpen={() => openList(s.name, { dim: 'stageGroup', value: s.id })}
              details={[
                ['Capacity (MTPA)', formatNumber(s.capacity)],
                ['EPC', `${formatCount(s.epc.projects)} · ${formatCrore(s.epc.cost)}`],
                ['PPP', `${formatCount(s.ppp.projects)} · ${formatCrore(s.ppp.cost)}`],
              ]}
            />
          ))}
        </div>

        <SectionDivider title="Portfolio at a glance" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Estimated cost"
            value={formatCrore(kpis.estimatedCost)}
            caption="All projects in the filter"
            theme="indigo"
            icon={IndianRupee}
          />
          <KpiCard
            label="Sanctioned cost"
            value={formatCrore(kpis.sanctionedCost)}
            caption="Board / administrative approval"
            theme="purple"
            icon={BadgeCheck}
          />
          <KpiCard
            label="Awarded cost"
            value={formatCrore(kpis.awardedCost)}
            caption="Work awarded (LOA issued)"
            theme="teal"
            icon={Handshake}
          />
          <KpiCard
            label="Expenditure till date"
            value={formatCrore(kpis.expenditure)}
            caption={`${formatPercent(kpis.expenditurePercent)} of estimated cost`}
            theme="emerald"
            icon={Wallet}
            progress={kpis.expenditurePercent ?? 0}
          />
          <KpiCard
            label="Current-year target"
            value={formatCrore(kpis.currentFyTarget)}
            caption={`Expenditure outlay, ${fyLabel}`}
            theme="indigo"
            icon={Target}
            onOpen={() => openList(`Projects with a ${fyLabel} target`, { dim: 'currentFyTarget', value: 'Yes' })}
          />
          <KpiCard
            label="Current-year expenditure"
            value={formatCrore(kpis.currentFyExpenditure)}
            caption={`${formatPercent(kpis.currentFySpendPercent)} of the ${fyLabel} target`}
            theme="amber"
            icon={CalendarRange}
            progress={kpis.currentFySpendPercent ?? 0}
          />
          <KpiCard
            label="Average physical progress"
            value={formatPercent(kpis.avgProgressOngoing)}
            caption="Of ongoing work"
            theme="purple"
            icon={Activity}
            progress={kpis.avgProgressOngoing ?? 0}
            onOpen={() => openList('Ongoing projects', { dim: 'completion', value: 'ongoing' })}
          />
          <KpiCard
            label="Capacity addition"
            value={`${formatNumber(kpis.capacityAddition)} MTPA`}
            caption="Projects adding capacity"
            theme="teal"
            icon={Gauge}
            onOpen={() => openList('Projects adding capacity', { dim: 'capacityAdded', value: 'Yes' })}
          />
          <KpiCard
            label="Ongoing projects"
            value={formatCount(kpis.ongoing)}
            caption={`Estimated cost ${formatCrore(kpis.ongoingEstimatedCost)}`}
            theme="indigo"
            icon={Hourglass}
            onOpen={() => openList('Ongoing projects', { dim: 'completion', value: 'ongoing' })}
          />
          <KpiCard
            label="Projects with a revised target date"
            value={formatCount(kpis.revisedTarget)}
            caption="Target completion date revised at least once"
            theme="amber"
            icon={CalendarClock}
            onOpen={() => openList('Projects with a revised target date', { dim: 'revisedTarget', value: 'Yes' })}
          />
          <KpiCard
            label="Foundation stone laid"
            value={formatCount(kpis.foundationLaid)}
            caption="Projects"
            theme="indigo"
            icon={Landmark}
            onOpen={() => openList('Foundation stone laid', { dim: 'foundationLaid', value: 'Yes' })}
          />
          <KpiCard
            label="Projects inaugurated"
            value={formatCount(kpis.inaugurated)}
            caption="Projects"
            theme="emerald"
            icon={Flag}
            onOpen={() => openList('Projects inaugurated', { dim: 'inaugurated', value: 'Yes' })}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SplitCard
            label="Average days from sanction to award"
            caption="Board / admin approval to award (LOA issued)"
            icon={Timer}
            theme="indigo"
            items={[
              { label: 'EPC', value: formatDays(kpis.avgDaysSanctionToAward.epc) },
              { label: 'PPP', value: formatDays(kpis.avgDaysSanctionToAward.ppp) },
            ]}
          />
          <SplitCard
            label="Average days from initiation to award"
            caption="Project initiated to award (LOA issued)"
            icon={Timer}
            theme="purple"
            items={[
              { label: 'EPC', value: formatDays(kpis.avgDaysInitiationToAward.epc) },
              { label: 'PPP', value: formatDays(kpis.avgDaysInitiationToAward.ppp) },
            ]}
          />
        </div>

        <SectionDivider title="Delay status of ongoing projects" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {delay.statuses.map((s) => (
            <KpiCard
              key={s}
              label={s}
              value={formatCount(delay.total[s])}
              caption={DELAY_CAPTIONS[s]}
              theme={DELAY_THEME[s]}
              icon={DELAY_ICONS[s]}
              progress={kpis.ongoing ? (delay.total[s] / kpis.ongoing) * 100 : 0}
              onOpen={() => openList(`${s} - all ongoing stages`, { dim: 'delayStatus', value: s })}
              details={ONGOING_STAGES.map((g) => [g.name, formatCount(delay.byStage[g.id][s])])}
            />
          ))}
        </div>
        {kpis.ongoing ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <ChartSection
                title={`Delay status - ${delayTabLabel}`}
                fileName={`projects_delay_status_${delayTab}`}
                height={300}
                hint="Click a slice to see its projects."
                legend={delayChart.map((d) => ({ label: `${d.name} ${formatCount(d.value)}`, color: d.color }))}
                tabs={<SectionTabs tabs={DELAY_TABS} value={delayTab} onChange={setDelayTab} />}
              >
                {(setRoot) => (delayChart.length ? (
                  <DashboardPieChart
                    data={delayChart}
                    onRootReady={setRoot}
                    dark={dark}
                    onSelect={(d) => d && openList(
                      `${d.name} - ${delayTabLabel}`,
                      delayTab === 'all' ? { dim: 'delayStatus', value: d.name } : { dim: 'delayStatus', value: d.name, dim2: 'stageGroup', value2: delayTab },
                    )}
                  />
                ) : <NoData className="h-full" text="No ongoing projects in this stage" />)}
              </ChartSection>
              <TableSection
                title="Delay status by stage"
                columns={delayStageColumns}
                rows={delayStageRows}
                totals={{ ...delay.total, total: delayTotal(delay.total) }}
                fileName="projects_delay_status_by_stage"
                note={DELAY_RULE_NOTE}
              />
            </div>
            {showOrganisations ? (
              <TableSection
                title="Delay status by port"
                columns={delayPortColumns}
                rows={delayPortRows}
                totals={{ ...delay.total, total: delayTotal(delay.total) }}
                rowKey="id"
                fileName="projects_delay_status_by_organisation"
                note="Ongoing projects only. Click a count to see its projects."
              />
            ) : null}
          </>
        ) : null}

        {!kpis.projects ? (
          <Section title="Projects"><NoData /></Section>
        ) : (
          <>
            <SectionDivider title={showOrganisations ? 'Stage and port-wise position' : 'Stage-wise position'} />
            <div className={`grid grid-cols-1 ${showOrganisations ? 'lg:grid-cols-2' : ''} gap-4 items-start`}>
              <ChartSection
                title="Projects by current stage"
                fileName="projects_by_stage"
                height={300}
                hint="Click a bar to see its projects."
                legend={[
                  { label: 'Planning & Sanctioning', color: STAGE_COLORS.planning },
                  { label: 'Under Tendering', color: STAGE_COLORS.tendering },
                  { label: 'Under Implementation', color: STAGE_COLORS.implementation },
                  { label: 'Completed', color: STAGE_COLORS.completed },
                ]}
              >
                {(setRoot) => (
                  <DashboardChart
                    data={stageChart}
                    series={STAGE_SERIES}
                    valueFormat="#,###"
                    onRootReady={setRoot}
                    dark={dark}
                    onSelect={(d) => d && openList(d.name, { dim: 'stage', value: String(d.key) })}
                  />
                )}
              </ChartSection>
              {showOrganisations ? (
                <ChartSection
                  title="Projects by port / organisation"
                  fileName="projects_by_organisation"
                  height={rowsHeight(orgChart.length, 28, 300)}
                  hint="Click a bar to see that organisation's completed or ongoing projects."
                  legend={ORG_STATUS_SERIES.map((s) => ({ label: s.name, color: s.color }))}
                >
                  {(setRoot) => (
                    <DashboardChart
                      data={orgChart}
                      series={ORG_STATUS_SERIES}
                      horizontal
                      stacked
                      showValues={false}
                      valueFormat="#,###"
                      onRootReady={setRoot}
                      dark={dark}
                      onSelect={(d, field) => d && openList(`${d.fullName} - ${field === 'completed' ? 'Completed' : 'Ongoing'}`, { dim: 'organisation', value: String(d.id), dim2: 'completion', value2: field })}
                    />
                  )}
                </ChartSection>
              ) : null}
            </div>

            <TableSection
              title="Current stage summary"
              columns={stageColumns}
              rows={data.byStage}
              totals={{ projects: kpis.projects, estimatedCost: kpis.estimatedCost }}
              fileName="projects_by_current_stage"
            />

            {showOrganisations ? (
              <>
                <TableSection
                  title="Port-wise position"
                  columns={portColumns}
                  rows={data.byOrganisation}
                  totals={portTotals}
                  rowKey="id"
                  fileName="projects_port_wise_position"
                  note="Current-year spend counts projects under implementation only. Click a count to see its projects."
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  <ChartSection
                    title="Estimated cost and expenditure by port (₹ Cr)"
                    fileName="projects_cost_and_expenditure_by_organisation"
                    height={rowsHeight(costChart.length, 40, 300)}
                    legend={COST_SERIES.map((s) => ({ label: s.name, color: s.color }))}
                  >
                    {(setRoot) => (
                      <DashboardChart
                        data={costChart}
                        series={COST_SERIES}
                        horizontal
                        valueFormat="#,###"
                        onRootReady={setRoot}
                        dark={dark}
                        onSelect={(d) => d && openList(`${d.fullName} - All projects`, { dim: 'organisation', value: String(d.id) })}
                      />
                    )}
                  </ChartSection>
                  <TableSection
                    title="Port by current stage"
                    columns={orgStageColumns}
                    rows={orgStageRows}
                    totals={totalsOf(orgStageRows, ['projects', ...data.stages.map((s) => `stage_${s.id}`)])}
                    rowKey="id"
                    fileName="projects_port_by_stage"
                  />
                </div>
                <TableSection
                  title="Physical progress by port - implementation milestones"
                  columns={progressColumns}
                  rows={progressRows}
                  totals={totalsOf(progressRows, ['projects', ...data.progressBands.map((_, i) => `band_${i}`)])}
                  rowKey="id"
                  fileName="projects_physical_progress_by_organisation"
                  note="Bands follow the implementation milestones of the input form (20% steps, Final = 100%), using the latest reported physical progress of each project."
                />
              </>
            ) : null}

            <SectionDivider title="Category-wise analysis" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <ChartSection
                title="Fifteen largest project categories"
                fileName={`projects_top_categories_${categoryMetric}`}
                height={rowsHeight(categoryChart.length, 26, 300)}
                hint="Click a bar to see the category's projects."
                tabs={(
                  <SectionTabs
                    tabs={[{ id: 'projects', label: 'By projects' }, { id: 'estimatedCost', label: 'By estimated cost (₹ Cr)' }]}
                    value={categoryMetric}
                    onChange={setCategoryMetric}
                  />
                )}
              >
                {(setRoot) => (
                  <DashboardChart
                    data={categoryChart}
                    series={categoryMetric === 'projects' ? PROJECTS_SERIES : COST_ONLY_SERIES}
                    horizontal
                    valueFormat={categoryMetric === 'projects' ? '#,###' : '#,###.##'}
                    onRootReady={setRoot}
                    dark={dark}
                    onSelect={(d) => d && openList(d.name, { dim: 'category', value: d.name })}
                  />
                )}
              </ChartSection>
              <TableSection
                title="Ongoing projects by broad category"
                columns={broadColumns}
                rows={broadRows}
                totals={{ ...totalsOf(broadRows, ['ongoingEpc', 'ongoingPpp', 'ongoing', 'ongoingEstimatedCost']), share: broadRows.length ? 100 : null }}
                fileName="projects_ongoing_by_broad_category"
                note="Broad category of the project's first category. Ongoing = not yet completed."
              />
            </div>
            <TableSection
              title="All project categories"
              columns={categoryColumns}
              rows={data.byCategory}
              totals={totalsOf(data.byCategory, ['projects', 'completed', 'ongoing', 'estimatedCost', 'awardedCost', 'expenditure', 'capacity'])}
              fileName="projects_by_category"
              note="A project with several categories is shown under their combined name, so each project is counted once."
            />

            <SectionDivider title="Financial-year timeline" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <ChartSection
                title="Initiations, sanctions, awards and completions"
                fileName="projects_fy_progress"
                height={320}
                hint="Click a point to see its projects."
                legend={FY_PROGRESS_SERIES.map((s) => ({ label: s.name, color: s.color, line: true }))}
              >
                {(setRoot) => (
                  <DashboardChart
                    data={fyChart}
                    categoryField="financialYear"
                    series={FY_PROGRESS_SERIES}
                    showValues={false}
                    valueFormat="#,###"
                    onRootReady={setRoot}
                    dark={dark}
                    onSelect={(d, field) => d && openList(`${FY_EVENT_LABELS[field]} - FY ${d.financialYear}`, { dim: `fy-${field}`, value: d.financialYear })}
                  />
                )}
              </ChartSection>
              <ChartSection
                title="Foundations and inaugurations"
                fileName="projects_fy_foundations_inaugurations"
                height={320}
                hint="Click a bar to see its projects."
                legend={FY_MILESTONE_SERIES.map((s) => ({ label: s.name, color: s.color }))}
              >
                {(setRoot) => (
                  <DashboardChart
                    data={fyChart}
                    categoryField="financialYear"
                    series={FY_MILESTONE_SERIES}
                    showValues={false}
                    valueFormat="#,###"
                    onRootReady={setRoot}
                    dark={dark}
                    onSelect={(d, field) => d && openList(`${FY_EVENT_LABELS[field]} - FY ${d.financialYear}`, { dim: `fy-${field}`, value: d.financialYear })}
                  />
                )}
              </ChartSection>
            </div>
            <TableSection
              title="Financial-year view"
              columns={fyColumns}
              rows={data.byFinancialYear}
              rowKey="financialYear"
              fileName="projects_financial_year_view"
              note="Financial year runs April to March. Sanctioned = chairman / board approval for Port Level Approval projects, administrative approval otherwise. Foundations and inaugurations use the actual date, or the expected date where none is recorded."
            />

            <SectionDivider title="Parameter-wise analysis" />
            <Section
              title={`Projects by ${parameterLabel}`}
              actions={parameterRows.length ? (
                <TableExportMenu
                  {...tableExport(parameterColumns, parameterRows)}
                  fileName={`projects_by_${parameterTab}`}
                  title={`Projects by ${parameterLabel}`}
                />
              ) : null}
            >
              <SectionTabs tabs={PARAMETER_TABS} value={parameterTab} onChange={setParameterTab} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <div style={{ height: rowsHeight(parameterChart.length, 30, 260) }}>
                  <DashboardChart
                    data={parameterChart}
                    series={PROJECTS_SERIES}
                    horizontal
                    valueFormat="#,###"
                    dark={dark}
                    onSelect={(d) => d && openList(`${parameterLabel}: ${d.name}`, { dim: parameterTab, value: d.name })}
                  />
                </div>
                <DataTable columns={parameterColumns} rows={parameterRows} totals={totalsOf(parameterRows, ['projects', 'estimatedCost', 'expenditure'])} />
              </div>
            </Section>

            <SectionDivider title="Watchlist" />
            <TableSection
              title="Largest projects by estimated cost"
              columns={largestColumns.map((c) => (c.key === 'code'
                ? { ...c, drill: (r) => () => openProject(r) }
                : c))}
              rows={largestRows}
              fileName="projects_largest_by_estimated_cost"
              note="The twenty largest projects in the current filter. Click a Project ID to see its details."
            />
          </>
        )}
      </div>
    </div>
  );
}
