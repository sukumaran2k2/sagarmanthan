import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { RefreshCw, Plane, CheckCircle2, PlaneLanding, XCircle, Loader2 } from 'lucide-react';
import Table from '../../../components/Table';
import { chartColors, useIsDark } from '../../../utils/amCharts';
import {
  fetchForeignVisitChart,
  fetchForeignVisitCounts,
  fetchForeignVisitOngoing,
} from '../api';
import { useFvStore } from '../store/useFvStore';
import { getSessionOrganisationId, getSessionClaims } from '../../../utils/authSession';
import { useNotifier } from '../../../utils/notify';
import { FV_TOASTS } from '../toastMessages';

// One hue for a single-series chart: the bars carry magnitude, not identity, so a categorical
// palette would imply a distinction that is not in the data.
const SERIES_COLOR = 0x0f417a;

export default function Dashboard({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const designations = useFvStore((s) => s.designations);

  const claims = getSessionClaims();
  const roleId = Number(claims?.roleId ?? claims?.role_id ?? 0);
  const sessionOrgId = getSessionOrganisationId() || 0;

  // Filters above the charts, as in the 2.0 dashboard.
  const [officerName, setOfficerName] = useState('0');
  const [organisationId, setOrganisationId] = useState(0);
  const [designationId, setDesignationId] = useState(0);

  const [counts, setCounts] = useState(null);
  const [visitTypeSplit, setVisitTypeSplit] = useState([]);
  const [yearSplit, setYearSplit] = useState([]);
  const [ongoing, setOngoing] = useState([]);
  const [loading, setLoading] = useState(true);

  const organisations = useFvStore((s) => s.organisations);

  const scope = useMemo(
    () => ({
      orgId: organisationId || sessionOrgId || 0,
      roleId: roleId || 0,
      designationId: designationId || 0,
      officerName: officerName || '0',
    }),
    [organisationId, sessionOrgId, roleId, designationId, officerName]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chartRes, countRes, ongoingRes] = await Promise.allSettled([
        fetchForeignVisitChart(scope),
        fetchForeignVisitCounts({
          year: 0,
          orgID: scope.orgId,
          roleId: scope.roleId,
          desigID: scope.designationId,
          officerName: scope.officerName,
        }),
        fetchForeignVisitOngoing(scope),
      ]);

      if (chartRes.status === 'fulfilled') {
        const total = chartRes.value.data?.total || [];
        setYearSplit(
          [...total]
            .filter((r) => r.year != null)
            .sort((a, b) => a.year - b.year)
            .map((r) => ({ year: String(r.year), total: Number(r.Total) || 0 }))
        );
      }

      if (countRes.status === 'fulfilled') {
        setCounts(countRes.value.data?.count?.[0] || null);
        setVisitTypeSplit(
          (countRes.value.data?.type || [])
            .filter((r) => r.visit_type_name)
            .map((r) => ({ type: String(r.visit_type_name).trim(), total: Number(r.Total) || 0 }))
            .sort((a, b) => a.total - b.total)
        );
      }

      if (ongoingRes.status === 'fulfilled') {
        setOngoing(Array.isArray(ongoingRes.value.data) ? ongoingRes.value.data : []);
      }

      const failed = [chartRes, countRes, ongoingRes].find((r) => r.status === 'rejected');
      if (failed) {
        console.error('Foreign Visit: dashboard load failed', failed.reason);
        notify(FV_TOASTS.loadFailed('dashboard', failed.reason));
      }
    } finally {
      setLoading(false);
    }
  }, [scope, notify]);

  useEffect(() => { load(); }, [load]);

  const ongoingCols = useMemo(() => [
    {
      headerName: 'S.No', valueGetter: 'node.rowIndex + 1',
      width: 80, minWidth: 80, maxWidth: 80, pinned: 'left',
      cellClass: 'text-center flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 font-mono border-r border-slate-100 dark:border-slate-800',
    },
    {
      headerName: 'Foreign Visit ID', field: 'fv_id', width: 190, minWidth: 160,
      cellClass: 'text-center flex items-center justify-center font-bold text-[#0f417a] dark:text-blue-400 font-mono border-r border-slate-100 dark:border-slate-800',
    },
    {
      headerName: 'Name', field: 'name', width: 220, minWidth: 180, wrapText: true, autoHeight: true,
      cellClass: 'flex items-center font-semibold text-slate-800 dark:text-slate-100 py-2 border-r border-slate-100 dark:border-slate-800 whitespace-normal',
    },
    {
      headerName: 'Organisation', field: 'Organisation', width: 250, minWidth: 200, wrapText: true, autoHeight: true,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 py-2 border-r border-slate-100 dark:border-slate-800 whitespace-normal',
      valueFormatter: (p) => p.value || '--',
    },
    {
      headerName: 'Designation', colId: 'designation', width: 200, minWidth: 170, wrapText: true, autoHeight: true,
      valueGetter: (p) => p.data?.goi_designation || p.data?.designation || '--',
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 py-2 border-r border-slate-100 dark:border-slate-800 whitespace-normal',
    },
    {
      headerName: 'Type of visit', field: 'visit_type_name', width: 190, minWidth: 160,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
      valueFormatter: (p) => p.value || '--',
    },
  ], []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="module-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Officer</label>
            <input type="text" value={officerName === '0' ? '' : officerName}
              onChange={(e) => setOfficerName(e.target.value.trim() === '' ? '0' : e.target.value)}
              placeholder="Show All"
              className="module-form-input" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Organisation</label>
            <select value={organisationId} onChange={(e) => setOrganisationId(Number(e.target.value))}
              className="module-form-select cursor-pointer">
              <option value={0}>Show All</option>
              {organisations.map((o) => (
                <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Designation</label>
            <select value={designationId} onChange={(e) => setDesignationId(Number(e.target.value))}
              className="module-form-select cursor-pointer">
              <option value={0}>Show All</option>
              {designations.map((d) => <option key={d.id} value={d.id}>{d.designation}</option>)}
            </select>
          </div>

          <button type="button" onClick={load} disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#0f417a] hover:bg-[#1e3a8a] text-white transition cursor-pointer disabled:opacity-60">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span>{loading ? 'Loading…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Stage counts ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Proposed Tours" value={counts?.proposed} icon={Plane}
          valueClass="text-[#0f417a] dark:text-blue-400"
          iconClass="bg-blue-50 border-blue-100 text-[#0f417a] dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-400" />
        <KpiCard label="Sanctioned Tours" value={counts?.sanctioned} icon={CheckCircle2}
          valueClass="text-cyan-700 dark:text-cyan-400"
          iconClass="bg-cyan-50 border-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-900 dark:text-cyan-400" />
        <KpiCard label="Visited Tours" value={counts?.tour_visited} icon={PlaneLanding}
          valueClass="text-emerald-700 dark:text-emerald-400"
          iconClass="bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400" />
        <KpiCard label="Not Visited Tours" value={counts?.tour_notvisited} icon={XCircle}
          valueClass="text-rose-700 dark:text-rose-400"
          iconClass="bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400" />
      </div>

      {/* ── Charts ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Year Wise Tour Count" empty={yearSplit.length === 0} loading={loading}>
          <YearWiseChart data={yearSplit} />
        </ChartCard>

        <ChartCard title="Visit Type" empty={visitTypeSplit.length === 0} loading={loading}>
          <VisitTypeChart data={visitTypeSplit} />
        </ChartCard>
      </div>

      {/* ── Sanctioned but not completed ──────────────────────── */}
      <div className="module-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Sanctioned but Not Completed</h3>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            Total: {ongoing.length}
          </span>
        </div>
        <Table
          rowData={ongoing}
          columnDefs={ongoingCols}
          loading={loading}
          loadingMessage="Fetching sanctioned visits…"
          paginationPageSize={10}
          className="module-datalist-grid"
        />
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, valueClass, iconClass }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
      <div className="min-w-0">
        <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block truncate">
          {label}
        </span>
        <span className={`text-2xl font-black block mt-1 ${valueClass}`}>{value ?? '—'}</span>
      </div>
      <div className={`p-3 rounded-xl border flex-shrink-0 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function ChartCard({ title, children, empty, loading }) {
  return (
    <div className="module-card">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-3">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div style={{ height: 320 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : empty ? (
          <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
            No visits match the selected filters.
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * Tour count by year.
 *
 * A column chart rather than the 2.0 donut: years are an ordered sequence and the question is
 * how the counts compare, which a shared baseline answers and angles do not.
 */
function YearWiseChart({ data }) {
  const divRef = useRef(null);
  const rootRef = useRef(null);
  const dark = useIsDark();

  useLayoutEffect(() => {
    const c = chartColors();
    if (!divRef.current || !data?.length) return undefined;
    if (rootRef.current) rootRef.current.dispose();

    const root = am5.Root.new(divRef.current);
    rootRef.current = root;
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false, panY: false, wheelX: 'none', wheelY: 'none',
        layout: root.verticalLayout, paddingTop: 20, paddingRight: 20,
      })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
    xRenderer.labels.template.setAll({ fontSize: 11, fill: am5.color(c.text), fontWeight: '700' });
    xRenderer.grid.template.set('visible', false);
    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, { categoryField: 'year', renderer: xRenderer })
    );

    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.muted), fontWeight: '600' });
    yRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0 }));

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis, yAxis,
        valueYField: 'total', categoryXField: 'year',
        tooltip: am5.Tooltip.new(root, { labelText: '{categoryX}: [bold]{valueY}[/] visits' }),
      })
    );
    series.columns.template.setAll({
      fill: am5.color(SERIES_COLOR), stroke: am5.color(SERIES_COLOR),
      width: am5.percent(45), cornerRadiusTL: 4, cornerRadiusTR: 4,
    });
    // Direct labels: one series, few bars, so every value can be read without the tooltip.
    series.bullets.push(() =>
      am5.Bullet.new(root, {
        locationY: 1,
        sprite: am5.Label.new(root, {
          text: '{valueY}', fill: am5.color(c.value), centerX: am5.p50, centerY: am5.p100,
          dy: -6, fontSize: 11, fontWeight: '700', populateText: true,
        }),
      })
    );

    xAxis.data.setAll(data);
    series.data.setAll(data);
    chart.appear(600, 100);

    return () => { root.dispose(); rootRef.current = null; };
  }, [data, dark]);

  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

/**
 * Visits by type. Horizontal bars because the type names are long -- on a vertical axis they
 * would have to be rotated to fit.
 */
function VisitTypeChart({ data }) {
  const divRef = useRef(null);
  const rootRef = useRef(null);
  const dark = useIsDark();

  useLayoutEffect(() => {
    const c = chartColors();
    if (!divRef.current || !data?.length) return undefined;
    if (rootRef.current) rootRef.current.dispose();

    const root = am5.Root.new(divRef.current);
    rootRef.current = root;
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false, panY: false, wheelX: 'none', wheelY: 'none',
        layout: root.verticalLayout, paddingRight: 28,
      })
    );

    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10 });
    yRenderer.labels.template.setAll({
      fontSize: 10, fill: am5.color(c.text), fontWeight: '600',
      maxWidth: 190, oversizedBehavior: 'wrap', textAlign: 'end',
    });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, { categoryField: 'type', renderer: yRenderer })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.muted), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0 }));

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis, yAxis,
        valueXField: 'total', categoryYField: 'type',
        tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}: [bold]{valueX}[/] visits' }),
      })
    );
    series.columns.template.setAll({
      fill: am5.color(SERIES_COLOR), stroke: am5.color(SERIES_COLOR),
      height: am5.percent(62), cornerRadiusTR: 4, cornerRadiusBR: 4,
    });
    series.bullets.push(() =>
      am5.Bullet.new(root, {
        locationX: 1,
        sprite: am5.Label.new(root, {
          text: '{valueX}', fill: am5.color(c.value), centerY: am5.p50, centerX: am5.p0,
          dx: 6, fontSize: 11, fontWeight: '700', populateText: true,
        }),
      })
    );

    yAxis.data.setAll(data);
    series.data.setAll(data);
    chart.appear(600, 100);

    return () => { root.dispose(); rootRef.current = null; };
  }, [data, dark]);

  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}
