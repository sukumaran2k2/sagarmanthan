import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Plane, CheckCircle2, PlaneLanding, XCircle, Loader2 } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import ChartExportMenu from '../../../components/ChartExportMenu';
import TableExportMenu from '../../../components/TableExportMenu';
import { newChartRoot, chartColors, useIsDark } from '../../../utils/amCharts';
import {
  fetchForeignVisitChart,
  fetchForeignVisitCounts,
  fetchForeignVisitOngoing,
  fetchOfficerNames,
} from '../api';
import { useFvStore } from '../store/useFvStore';
import { getSessionOrganisationId, getSessionClaims } from '../../../utils/authSession';
import { useNotifier } from '../../../utils/notify';
import { FV_TOASTS } from '../toastMessages';

// Same layout as the Consultant Appointment dashboard: KPI cards over numbered sections with
// an indigo header bar, an export menu in each corner, and the module's one series colour.
const SERIES_COLOR = 0x6366f1;

function KpiCard({ label, value, subtext, icon: Icon, valueColorClass, iconWrapClass, subtextColorClass }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 flex items-center justify-between shadow-sm">
      <div className="min-w-0">
        <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block truncate">{label}</span>
        <span className={`text-xl sm:text-2xl font-black block mt-1 ${valueColorClass}`}>{value ?? '—'}</span>
        {subtext && <span className={`text-[9px] sm:text-[10px] font-semibold block mt-0.5 ${subtextColorClass} truncate`}>{subtext}</span>}
      </div>
      <div className={`p-2.5 sm:p-3.5 rounded-xl border flex-shrink-0 ${iconWrapClass}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </div>
  );
}

function Section({ number, title, note, actions, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col ${className}`}>
      <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between flex-shrink-0">
        <h3 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-indigo-200">{number}.</span> {title}
          {note && <span className="text-[9px] sm:text-[10px] font-medium text-indigo-200/80 ml-1 normal-case">{note}</span>}
        </h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

const NoData = ({ text }) => (
  <div className="h-full flex items-center justify-center text-xs text-slate-600 dark:text-slate-300">{text}</div>
);

/**
 * Tour count per year.
 *
 * Vertical columns, left to right in year order -- unlike the other charts here, the categories
 * are a sequence, so sorting them by value would scramble the timeline.
 */
function YearWiseChart({ data, onRootReady, dark }) {
  const divRef = useRef(null);

  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(am5xy.XYChart.new(root, {
      panX: false, panY: false, wheelX: 'none', wheelY: 'none',
      layout: root.verticalLayout, paddingTop: 20, paddingRight: 20,
    }));

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
    xRenderer.labels.template.setAll({ fontSize: 11, fill: am5.color(c.text), fontWeight: '700' });
    xRenderer.grid.template.set('visible', false);
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'year', renderer: xRenderer }));

    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600' });
    yRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, maxPrecision: 0, extraMax: 0.1 }));

    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
      xAxis, yAxis, valueYField: 'total', categoryXField: 'year',
      tooltip: am5.Tooltip.new(root, { labelText: '{categoryX}: [bold]{valueY}[/]' }),
    }));
    series.columns.template.setAll({
      fill: am5.color(SERIES_COLOR), stroke: am5.color(SERIES_COLOR),
      width: am5.percent(45), cornerRadiusTL: 4, cornerRadiusTR: 4,
    });
    series.bullets.push(() => am5.Bullet.new(root, {
      locationY: 1,
      sprite: am5.Label.new(root, {
        text: '{valueY}', fill: am5.color(c.value), centerX: am5.p50, centerY: am5.p100,
        dy: -6, fontSize: 11, fontWeight: '700', populateText: true,
      }),
    }));

    xAxis.data.setAll(data);
    series.data.setAll(data);
    chart.appear(600, 100);

    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, dark]);

  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

/** Horizontal bars, smallest at the bottom -- the same chart the CA dashboard uses. */
function HorizontalBarChart({ data, categoryField, valueField, onRootReady, dark }) {
  const divRef = useRef(null);

  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(am5xy.XYChart.new(root, {
      panX: false, panY: false, wheelX: 'none', wheelY: 'none',
      layout: root.verticalLayout, paddingRight: 20,
    }));

    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 220, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField, renderer: yRenderer }));

    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, maxPrecision: 0, extraMax: 0.1 }));

    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
      xAxis, yAxis, valueXField: valueField, categoryYField: categoryField,
      tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}: [bold]{valueX}[/]' }),
    }));
    series.columns.template.setAll({
      fill: am5.color(SERIES_COLOR), stroke: am5.color(SERIES_COLOR),
      height: am5.percent(60), cornerRadiusTR: 3, cornerRadiusBR: 3,
    });
    series.bullets.push(() => am5.Bullet.new(root, {
      locationX: 1,
      sprite: am5.Label.new(root, {
        text: '{valueX}', fill: am5.color(c.value), centerY: am5.p50, centerX: am5.p0,
        dx: 6, fontSize: 11, fontWeight: '700', populateText: true,
      }),
    }));

    const sorted = [...data].sort((a, b) => a[valueField] - b[valueField]);
    yAxis.data.setAll(sorted);
    series.data.setAll(sorted);
    chart.appear(600, 100);

    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, categoryField, valueField, dark]);

  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

export default function Dashboard({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const designations = useFvStore((s) => s.designations);
  const organisations = useFvStore((s) => s.organisations);
  const dark = useIsDark();

  const claims = getSessionClaims();
  const roleId = Number(claims?.roleId ?? claims?.role_id ?? 0);
  const sessionOrgId = getSessionOrganisationId() || 0;

  const [officerName, setOfficerName] = useState('0');
  const [organisationId, setOrganisationId] = useState(0);
  const [designationId, setDesignationId] = useState(0);

  const [counts, setCounts] = useState(null);
  const [visitTypeSplit, setVisitTypeSplit] = useState([]);
  const [yearSplit, setYearSplit] = useState([]);
  const [ongoing, setOngoing] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [yearChartRoot, setYearChartRoot] = useState(null);
  const [typeChartRoot, setTypeChartRoot] = useState(null);

  /**
   * The server filters by organisation when the role is 6 (Wing/Division level User) or 7
   * (Organisation-Senior Officers), using whatever id we send -- so those roles must be sent
   * their own organisation or they would see nothing. Every other role sees all organisations
   * until one is picked here; sending their own id unconditionally pinned them to it and made
   * "Show All" do nothing.
   */
  const pinnedToOwnOrg = roleId === 6 || roleId === 7;

  const scope = useMemo(
    () => ({
      orgId: Number(organisationId) || (pinnedToOwnOrg ? sessionOrgId : 0),
      roleId: roleId || 0,
      designationId: Number(designationId) || 0,
      officerName: officerName || '0',
    }),
    [organisationId, sessionOrgId, pinnedToOwnOrg, roleId, designationId, officerName]
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

  // Officer names already recorded against a visit, for the filter above.
  useEffect(() => {
    let cancelled = false;
    fetchOfficerNames()
      .then((res) => {
        if (cancelled) return;
        const names = (Array.isArray(res.data) ? res.data : [])
          .map((r) => String(r.name || '').trim())
          .filter(Boolean);
        setOfficers([...new Set(names)].sort());
      })
      .catch((err) => console.error('Foreign Visit: officer list failed', err));
    return () => { cancelled = true; };
  }, []);

  const ongoingHeaders = ['S.No', 'Foreign Visit ID', 'Name', 'Organisation', 'Designation', 'Type of visit'];
  const ongoingRows = ongoing.map((row, i) => [
    i + 1,
    row.fv_id || '',
    row.name || '',
    row.Organisation || '',
    row.goi_designation || row.designation || '',
    row.visit_type_name || '',
  ]);

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6">
      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/*
            A dropdown, not free text: the server matches the officer with `name = @officerName`,
            so anything but an exact spelling returns nothing. The options are the names already
            recorded against visits, so every choice matches something.
          */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Officer</label>
            <select value={officerName} onChange={(e) => setOfficerName(e.target.value)}
              className="module-form-select cursor-pointer">
              <option value="0">--Show All--</option>
              {officers.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Organisation</label>
            <select value={organisationId} onChange={(e) => setOrganisationId(Number(e.target.value))}
              className="module-form-select cursor-pointer">
              <option value={0}>--Show All--</option>
              {organisations.map((o) => (
                <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Designation</label>
            <select value={designationId} onChange={(e) => setDesignationId(Number(e.target.value))}
              className="module-form-select cursor-pointer">
              <option value={0}>--Show All--</option>
              {designations.map((d) => <option key={d.id} value={d.id}>{d.designation}</option>)}
            </select>
          </div>

          <button type="button" onClick={load} disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white transition cursor-pointer disabled:opacity-60">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span>{loading ? 'Loading…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Stage counts ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <KpiCard
          label="Proposed tours"
          value={counts?.proposed}
          subtext="Awaiting sanction"
          icon={Plane}
          valueColorClass="text-[#6366f1] dark:text-indigo-400"
          subtextColorClass="text-indigo-600 dark:text-indigo-400"
          iconWrapClass="bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900"
        />
        <KpiCard
          label="Sanctioned tours"
          value={counts?.sanctioned}
          subtext="Approved, not yet travelled"
          icon={CheckCircle2}
          valueColorClass="text-amber-700 dark:text-amber-400"
          subtextColorClass="text-amber-600 dark:text-amber-400"
          iconWrapClass="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900"
        />
        <KpiCard
          label="Visited tours"
          value={counts?.tour_visited}
          subtext="Completed visits"
          icon={PlaneLanding}
          valueColorClass="text-emerald-700 dark:text-emerald-400"
          subtextColorClass="text-emerald-600 dark:text-emerald-400"
          iconWrapClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900"
        />
        <KpiCard
          label="Not visited tours"
          value={counts?.tour_notvisited}
          subtext="Sanctioned but not travelled"
          icon={XCircle}
          valueColorClass="text-rose-700 dark:text-rose-400"
          subtextColorClass="text-rose-600 dark:text-rose-400"
          iconWrapClass="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900"
        />
      </div>

      {/* ── Charts ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-start">
        <Section
          number={1}
          title="Year wise tour count"
          className="h-auto sm:h-[360px] md:h-[400px] lg:h-[460px]"
          actions={<ChartExportMenu chartRoot={yearChartRoot} fileName="foreign_visit_year_wise_tour_count" color="#6366f1" variant="plain" />}
        >
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              {yearSplit.length
                ? <YearWiseChart data={yearSplit} onRootReady={setYearChartRoot} dark={dark} />
                : <NoData text={loading ? 'Loading…' : 'No tours match the selected filters'} />}
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Year of visit →</p>
          </div>
        </Section>

        <Section
          number={2}
          title="Visit type"
          className="h-auto sm:h-[360px] md:h-[400px] lg:h-[460px]"
          actions={<ChartExportMenu chartRoot={typeChartRoot} fileName="foreign_visit_visit_type" color="#6366f1" variant="plain" />}
        >
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              {visitTypeSplit.length
                ? <HorizontalBarChart data={visitTypeSplit} categoryField="type" valueField="total" onRootReady={setTypeChartRoot} dark={dark} />
                : <NoData text={loading ? 'Loading…' : 'No tours match the selected filters'} />}
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Number of tours →</p>
          </div>
        </Section>
      </div>

      {/* ── Sanctioned but not completed ──────────────────────── */}
      <Section
        number={3}
        title="Sanctioned but not completed"
        note={`(${ongoing.length})`}
        actions={<TableExportMenu headers={ongoingHeaders} rows={ongoingRows} fileName="foreign_visit_sanctioned_not_completed" title="Foreign Visits Sanctioned but Not Completed" />}
      >
        <div className="flex-1 p-3 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1 max-h-[420px]">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-[11px] border-separate border-spacing-0 [&_thead_tr:first-child_th:first-child]:rounded-tl-xl [&_thead_tr:first-child_th:last-child]:rounded-tr-xl [&_tbody_tr:last-child_td:first-child]:rounded-bl-xl [&_tbody_tr:last-child_td:last-child]:rounded-br-xl">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#4f46e5] text-white">
                    {ongoingHeaders.map((h) => (
                      <th key={h} className="px-2.5 py-2 text-center font-semibold tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ongoing.map((row, i) => (
                    <tr key={`${row.fv_id}-${i}`} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                      <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 text-center font-mono">{i + 1}</td>
                      <td className="px-2.5 py-2 text-center font-bold text-[#6366f1] dark:text-indigo-400 font-mono whitespace-nowrap">{row.fv_id || '—'}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.name || '—'}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.Organisation || '—'}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.goi_designation || row.designation || '—'}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.visit_type_name || '—'}</td>
                    </tr>
                  ))}
                  {!ongoing.length && (
                    <tr>
                      <td colSpan={ongoingHeaders.length} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">
                        {loading ? 'Loading…' : 'No sanctioned tours are pending completion'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-slate-600 dark:text-slate-300 px-5 py-2 flex-shrink-0">
          Tours that have been sanctioned but not yet recorded as visited or not visited.
        </p>
      </Section>
    </div>
  );
}
