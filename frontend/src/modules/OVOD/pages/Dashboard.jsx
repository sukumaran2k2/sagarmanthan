import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Star,
  Layers,
  Users,
  Filter,
  RotateCcw,
  RefreshCw,
  DollarSign,
  ChevronDown,
  AlertTriangle,
  Ban,
  XCircle,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  fetchOvdMinistryChart,
  fetchOvdMinistryChartB2,
  fetchOvdStatusCounts,
  getUserIdFromToken
} from '../api';
import {
  OVOD_VISIONS,
  OVOD_PRIORITIES,
  OVOD_WINGS,
  OVOD_VIBHAS,
  MIV_CHAPTERS,
  MAKV_THEMES
} from '../utils/constants';
import { useShallow } from 'zustand/react/shallow';
import { useOvodStore } from '../store/useOvodStore';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

/* ----------------------------------------------------------------------------
 * Progress buckets (average intervention progress). Ordinal, so one sequential
 * blue ramp (low -> high). Dark mode runs the ramp the other way so that "more
 * complete" is always the stronger mark against the surface.
 * -------------------------------------------------------------------------- */
const BUCKETS = [
  { key: '0_19', label: '0–19%' },
  { key: '20_39', label: '20–39%' },
  { key: '40_59', label: '40–59%' },
  { key: '60_79', label: '60–79%' },
  { key: '80_99', label: '80–99%' },
  { key: '100', label: '100%' }
];

const RAMP_LIGHT = ['#c3d7f1', '#93b8e4', '#5f94d3', '#3571bb', '#1c5199', '#0f2f5c'];
const RAMP_DARK = ['#243b5c', '#35588a', '#4b78b8', '#6f9bd6', '#9cbfee', '#d3e5fb'];

const THEME = {
  light: { surface: '#ffffff', bar: '#0f417a', ramp: RAMP_LIGHT },
  dark: { surface: '#0f172a', bar: '#6f9bd6', ramp: RAMP_DARK }
};

function useIsDark() {
  const read = () =>
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
  const [isDark, setIsDark] = useState(read);

  useEffect(() => {
    const update = () => setIsDark(read());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

const fmtInt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtCost = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/* Turn the API's `categories` rows into chart-ready shapes. */
function shapeLevel(payload) {
  const rows = Array.isArray(payload?.categories) ? payload.categories : [];

  const categories = rows
    .map((r) => {
      const buckets = {};
      BUCKETS.forEach((b) => {
        buckets[b.key] = Number(r[b.key] || 0);
      });
      return {
        name: String(r.category || 'Uncategorised').trim(),
        count: Number(r.intervention_count || 0),
        ...buckets
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const status = BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    value: rows.reduce((sum, r) => sum + Number(r[b.key] || 0), 0)
  }));

  const total = status.reduce((s, x) => s + x.value, 0);
  const t = payload?.total?.[0] || {};

  return {
    categories,
    status,
    total,
    totals: {
      goals: Number(t.goals || 0),
      interventions: Number(t.intervention || 0),
      actions: Number(t.action || 0),
      cost: Number(t.total_cost_a ?? t.total_cost ?? 0)
    }
  };
}

/* ------------------------------ Small pieces ------------------------------ */

function StatCard({ value, label, icon: Icon, accent, tint, iconColor, loading }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs hover:shadow-md transition-all border-l-4 ${accent}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {loading ? (
            <div className="h-7 w-20 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : (
            <span className="block text-2xl font-black text-slate-800 dark:text-slate-100 font-display truncate">
              {value}
            </span>
          )}
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
            {label}
          </p>
        </div>
        <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-xs ${tint}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, total }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => Number(p.value) > 0 || payload.length === 1);
  const sum = rows.reduce((s, p) => s + Number(p.value || 0), 0);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg px-3 py-2 text-xs max-w-xs">
      {label && <div className="font-bold text-slate-800 dark:text-slate-100 mb-1 leading-snug">{label}</div>}
      {rows.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {fmtInt(p.value)}
            {total ? <span className="font-medium text-slate-400"> · {pct(p.value, total)}%</span> : null}
          </span>
        </div>
      ))}
      {rows.length > 1 && (
        <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 font-bold text-slate-700 dark:text-slate-200">
          <span>Total</span>
          <span className="tabular-nums">{fmtInt(sum)}</span>
        </div>
      )}
    </div>
  );
}

function Insight({ label, value, sub, tone = 'text-slate-800 dark:text-slate-100' }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-sm font-black truncate ${tone}`} title={String(value)}>{value}</div>
      {sub && <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, actions, children }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function EmptyChart({ loading, error }) {
  return (
    <div className="h-56 flex items-center justify-center text-xs font-semibold text-slate-400">
      {loading ? 'Loading…' : error ? 'Unable to load this chart. Use Refresh to retry.' : 'No interventions for the selected filters'}
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-bold">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
            value === o.id
              ? 'bg-white dark:bg-slate-700 text-[#0f417a] dark:text-blue-300 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* Horizontal bar: split of interventions across categories (or progress mix per category) */
function CategoryBarChart({ data, mode, theme, total, selectedCategory, onBarClick }) {
  const truncate = (s) => (s.length > 26 ? `${s.slice(0, 25)}…` : s);
  const height = Math.max(220, data.length * 34 + 30);

  const handleBarClick = (barData) => {
    const name = barData?.name ?? barData?.payload?.name;
    if (name) onBarClick?.(name === selectedCategory ? null : name);
  };

  return (
    <div className="text-slate-500 dark:text-slate-400" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 28, left: 0, bottom: 4 }}
          barCategoryGap={6}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.12} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            tickFormatter={truncate}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} content={<ChartTooltip total={mode === 'count' ? total : null} />} />
          {mode === 'count' ? (
            <Bar
              dataKey="count"
              name="Interventions"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              label={{ position: 'right', fontSize: 11, fill: 'currentColor', formatter: (v) => fmtInt(v) }}
              onClick={handleBarClick}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={theme.bar}
                  fillOpacity={!selectedCategory || selectedCategory === entry.name ? 1 : 0.3}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          ) : (
            BUCKETS.map((b, i) => (
              <Bar
                key={b.key}
                dataKey={b.key}
                name={b.label}
                stackId="progress"
                fill={theme.ramp[i]}
                stroke={theme.surface}
                strokeWidth={2}
                maxBarSize={20}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
              />
            ))
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Donut: interventions by overall progress bucket, with a legend that doubles as a data table */
function StatusDonut({ status, total, theme }) {
  const [active, setActive] = useState(null);
  const data = status.filter((s) => s.value > 0);
  const colorOf = (key) => theme.ramp[BUCKETS.findIndex((b) => b.key === key)];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative h-56 w-56 shrink-0 text-slate-500 dark:text-slate-400">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip total={total} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={66}
              outerRadius={104}
              paddingAngle={0}
              startAngle={90}
              endAngle={-270}
              stroke={theme.surface}
              strokeWidth={2}
              onMouseEnter={(_, i) => setActive(data[i]?.key)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={colorOf(d.key)} fillOpacity={active && active !== d.key ? 0.35 : 1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display tabular-nums">{fmtInt(total)}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interventions</span>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-400">
            <th className="text-left font-bold pb-1">Progress</th>
            <th className="text-right font-bold pb-1">Count</th>
            <th className="text-right font-bold pb-1">Share</th>
          </tr>
        </thead>
        <tbody>
          {status.map((s) => (
            <tr
              key={s.key}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
              className={`border-t border-slate-100 dark:border-slate-800 transition-opacity ${
                active && active !== s.key ? 'opacity-50' : ''
              }`}
            >
              <td className="py-1.5">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(s.key) }} />
                  {s.label}
                  {s.key === '100' && <span className="text-[10px] font-medium text-slate-400">completed</span>}
                </span>
              </td>
              <td className="py-1.5 text-right font-bold tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(s.value)}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{pct(s.value, total)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* One analytics level (A2 or B2): insight strip + category chart + progress donut */
function LevelAnalytics({ code, title, description, level, loading, error, theme }) {
  const [mode, setMode] = useState('count');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { categories, status, total } = level;
  const hasData = total > 0 || categories.length > 0;
  const catTotal = categories.reduce((s, c) => s + c.count, 0);

  // Derive pie data: if a bar is clicked, use that category's bucket breakdown
  const filteredStatus = useMemo(() => {
    if (!selectedCategory) return status;
    const cat = categories.find((c) => c.name === selectedCategory);
    if (!cat) return status;
    return BUCKETS.map((b) => ({ key: b.key, label: b.label, value: Number(cat[b.key] || 0) }));
  }, [selectedCategory, categories, status]);
  const filteredTotal = filteredStatus.reduce((s, x) => s + x.value, 0);

  const top = categories[0];
  const completed = status.find((s) => s.key === '100')?.value || 0;
  const lagging = (status.find((s) => s.key === '0_19')?.value || 0) + (status.find((s) => s.key === '20_39')?.value || 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-7 min-w-7 px-2 items-center justify-center rounded-lg bg-[#0f417a] text-white text-[11px] font-black">
          {code}
        </span>
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{title}</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>

      {hasData && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Insight label="Interventions" value={fmtInt(total)} sub={`across ${categories.length} categories`} />
          <Insight
            label="Largest category"
            value={top ? top.name : '—'}
            sub={top ? `${fmtInt(top.count)} · ${pct(top.count, catTotal)}% of interventions` : undefined}
          />
          <Insight
            label="Completed (100%)"
            value={`${fmtInt(completed)} · ${pct(completed, total)}%`}
            sub="interventions fully delivered"
            tone="text-emerald-600 dark:text-emerald-400"
          />
          <Insight
            label="Below 40% progress"
            value={`${fmtInt(lagging)} · ${pct(lagging, total)}%`}
            sub="may need follow-up"
            tone={pct(lagging, total) >= 50 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title={`${code} Level – Split of Interventions across Categories`}
          subtitle={mode === 'count' ? 'Number of interventions per category' : 'Progress mix within each category'}
          actions={
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { id: 'count', label: 'Count' },
                { id: 'progress', label: 'By progress' }
              ]}
            />
          }
        >
          {hasData && !loading ? (
            <>
              <CategoryBarChart
                data={categories}
                mode={mode}
                theme={theme}
                total={catTotal}
                selectedCategory={selectedCategory}
                onBarClick={setSelectedCategory}
              />
              {mode === 'progress' && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {BUCKETS.map((b, i) => (
                    <span key={b.key} className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: theme.ramp[i] }} />
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyChart loading={loading} error={error} />
          )}
        </ChartCard>

        <ChartCard
          title={`${code} Level – Intervention Level Overall Status`}
          subtitle={selectedCategory ? `Filtered: ${selectedCategory}` : 'Interventions grouped by average completion'}
          actions={selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition cursor-pointer"
            >
              <X size={11} /> Clear
            </button>
          )}
        >
          {hasData && !loading ? (
            <StatusDonut status={filteredStatus} total={filteredTotal} theme={theme} />
          ) : (
            <EmptyChart loading={loading} error={error} />
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

const EMPTY_LEVEL = shapeLevel(null);

export default function Dashboard({ triggerNotification }) {
  const isDark = useIsDark();
  const theme = isDark ? THEME.dark : THEME.light;

  const notify = useNotifier(triggerNotification);

  // Filters and panel state live in the OVOD store so they survive switching tabs
  const { filters, showFilterPanel } = useOvodStore(useShallow((s) => s.dashboard));
  const { setDashboardFilter, setDashboardFilterPanel, resetDashboardFilters, loadOrganisations } = useOvodStore(
    useShallow((s) => ({
      setDashboardFilter: s.setDashboardFilter,
      setDashboardFilterPanel: s.setDashboardFilterPanel,
      resetDashboardFilters: s.resetDashboardFilters,
      loadOrganisations: s.loadOrganisations
    }))
  );
  const organisations = useOvodStore((s) => s.organisations);

  const {
    vision: selectedVision,
    wing: selectedWing,
    org: selectedOrg,
    vibhas: selectedVibhas,
    priority: selectedPriority,
    mivChapter: selectedMivChapter,
    makvTheme: selectedMakvTheme
  } = filters;

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState({ a: false, b: false });
  const [levelA, setLevelA] = useState(EMPTY_LEVEL);
  const [levelB, setLevelB] = useState(EMPTY_LEVEL);
  const [statusCounts, setStatusCounts] = useState({ notApplicable: 0, dropped: 0 });

  useEffect(() => {
    loadOrganisations();
  }, [loadOrganisations]);

  // Only the latest request may update state (filters can change faster than the API answers)
  const latestRequestRef = useRef(0);
  const load = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setLoading(true);
    const params = {
      wingID: selectedWing,
      orgID: selectedOrg,
      vision: selectedVision,
      priority: selectedPriority,
      vibhasID: selectedVibhas,
      mivChapterSelect: selectedMivChapter,
      makvThemeSelect: selectedMakvTheme
    };

    const [a, b, s] = await Promise.allSettled([
      fetchOvdMinistryChart(params),
      fetchOvdMinistryChartB2(params),
      fetchOvdStatusCounts({ ...params, userID: getUserIdFromToken() })
    ]);
    if (requestId !== latestRequestRef.current) return;

    setLevelA(a.status === 'fulfilled' ? shapeLevel(a.value) : EMPTY_LEVEL);
    setLevelB(b.status === 'fulfilled' ? shapeLevel(b.value) : EMPTY_LEVEL);
    const sc = s.status === 'fulfilled' && Array.isArray(s.value) ? s.value[0] : null;
    setStatusCounts({
      notApplicable: Number(sc?.Not_Applicable_Count || 0),
      dropped: Number(sc?.Dropped_Count || 0)
    });
    setFailed({ a: a.status === 'rejected', b: b.status === 'rejected' });

    if (a.status === 'rejected' && b.status === 'rejected') {
      notify(COMMON_TOASTS.loadFailed('The dashboard analytics'));
    }
    setLoading(false);
  }, [selectedWing, selectedOrg, selectedVision, selectedPriority, selectedVibhas, selectedMivChapter, selectedMakvTheme, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const filterDefs = useMemo(() => [
    { id: 'vision', label: 'Vision', value: selectedVision, set: (v) => setDashboardFilter('vision', v), options: OVOD_VISIONS },
    { id: 'wing', label: 'Wing', value: selectedWing, set: (v) => setDashboardFilter('wing', v), options: OVOD_WINGS },
    {
      id: 'org',
      label: 'Organisation',
      value: selectedOrg,
      set: (v) => setDashboardFilter('org', v),
      options: [{ id: '0', label: 'Show All' }, ...organisations.map((o) => ({ id: String(o.ia_id), label: o.ia_name }))]
    },
    { id: 'vibhas', label: 'VIBHAS / NAVIC Cell', value: selectedVibhas, set: (v) => setDashboardFilter('vibhas', v), options: OVOD_VIBHAS },
    { id: 'priority', label: 'Priority', value: selectedPriority, set: (v) => setDashboardFilter('priority', v), options: OVOD_PRIORITIES },
    { id: 'miv', label: 'MIV Chapter', value: selectedMivChapter, set: (v) => setDashboardFilter('mivChapter', v), options: MIV_CHAPTERS },
    { id: 'makv', label: 'MAKV Theme', value: selectedMakvTheme, set: (v) => setDashboardFilter('makvTheme', v), options: MAKV_THEMES }
  ], [selectedVision, selectedWing, selectedOrg, selectedVibhas, selectedPriority, selectedMivChapter, selectedMakvTheme, organisations, setDashboardFilter]);

  const activeFilters = filterDefs.filter((f) => f.value !== '0');

  const handleResetFilters = () => resetDashboardFilters();

  const labelOf = (f) => f.options.find((o) => String(o.id) === String(f.value))?.label || f.value;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDashboardFilterPanel((p) => !p)}
            className={`module-filter-btn ${showFilterPanel || activeFilters.length > 0 ? 'active' : ''}`}
          >
            <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
            <span>Filters</span>
            {activeFilters.length > 0 && (
              <span className="bg-[#0f417a] text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                {activeFilters.length}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
          </button>

          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filterDefs.map((f) => (
              <FilterSelect key={f.id} label={f.label} value={f.value} onChange={f.set} options={f.options} />
            ))}
          </div>
        </div>
      )}

      {/* Active filter chips when the panel is collapsed */}
      {!showFilterPanel && activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-[11px] font-semibold text-[#0f417a] dark:text-blue-300"
            >
              <span className="text-slate-500 dark:text-slate-400">{f.label}:</span> {labelOf(f)}
              <button type="button" onClick={() => f.set('0')} className="hover:text-rose-600 cursor-pointer" aria-label={`Clear ${f.label}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Stat cards: A row then B row */}
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard loading={loading} value={fmtInt(levelA.totals.goals)} label="Total Goals [A1]" icon={Star} accent="border-l-rose-500" tint="bg-rose-50 dark:bg-rose-950/50" iconColor="text-rose-500" />
          <StatCard loading={loading} value={fmtInt(levelA.totals.interventions)} label="Total Interventions [A2]" icon={Layers} accent="border-l-purple-500" tint="bg-purple-50 dark:bg-purple-950/50" iconColor="text-purple-500" />
          <StatCard loading={loading} value={fmtInt(levelA.totals.actions)} label="Total Action Items [A3]" icon={Users} accent="border-l-emerald-500" tint="bg-emerald-50 dark:bg-emerald-950/50" iconColor="text-emerald-600" />
          <StatCard loading={loading} value={`₹ ${fmtCost(levelA.totals.cost)}`} label="Total Cost [A] (In Cr.)" icon={DollarSign} accent="border-l-yellow-500" tint="bg-yellow-50 dark:bg-yellow-950/50" iconColor="text-yellow-600" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard loading={loading} value={fmtInt(levelB.totals.goals)} label="Total Goals [B1]" icon={Star} accent="border-l-orange-500" tint="bg-orange-50 dark:bg-orange-950/50" iconColor="text-orange-500" />
          <StatCard loading={loading} value={fmtInt(levelB.totals.interventions)} label="Total Interventions [B2]" icon={Layers} accent="border-l-indigo-500" tint="bg-indigo-50 dark:bg-indigo-950/50" iconColor="text-indigo-500" />
          <StatCard loading={loading} value={fmtInt(levelB.totals.actions)} label="Total Action Items [B3]" icon={Users} accent="border-l-teal-500" tint="bg-teal-50 dark:bg-teal-950/50" iconColor="text-teal-600" />
          <StatCard loading={loading} value={`₹ ${fmtCost(levelB.totals.cost)}`} label="Total Cost [B] (In Cr.)" icon={DollarSign} accent="border-l-yellow-500" tint="bg-yellow-50 dark:bg-yellow-950/50" iconColor="text-yellow-600" />
        </div>
      </div>

      {/* Not Applicable / Dropped */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 dark:border-slate-800 py-3">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-black text-rose-600">Note!</span> Not Applicable and Dropped counts represent A3(s) and B3(s).
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Ban size={13} className="text-slate-500" />
            Not Applicable: <span className="tabular-nums">{fmtInt(statusCounts.notApplicable)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-700 dark:text-rose-300">
            <XCircle size={13} />
            Dropped: <span className="tabular-nums">{fmtInt(statusCounts.dropped)}</span>
          </span>
        </div>
      </div>

      {(failed.a || failed.b) && !loading && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle size={14} />
          {failed.a && failed.b ? 'Analytics could not be loaded.' : `${failed.a ? 'A-level' : 'B-level'} analytics could not be loaded.`} Use Refresh to retry.
        </div>
      )}

      <p className="text-[11px] text-right text-slate-500 dark:text-slate-400 -mb-3">
        <span className="font-black text-rose-600">Note!</span> An intervention may fall into multiple categories, which may result in varying total counts.
      </p>

      {/* Analytics */}
      <LevelAnalytics
        code="A2"
        title="Ministry Interventions (A2)"
        description="Distribution and delivery progress of Ministry-level interventions"
        level={levelA}
        loading={loading}
        error={failed.a}
        theme={theme}
      />
      <LevelAnalytics
        code="B2"
        title="Organisation Interventions (B2)"
        description="Distribution and delivery progress of organisation-level interventions"
        level={levelB}
        loading={loading}
        error={failed.b}
        theme={theme}
      />
    </div>
  );
}
