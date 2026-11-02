import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { RefreshCw, TrendingUp, BarChart3, Layers, Clock } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchConsultantAppointmentDashboard } from '../api';
import ChartExportMenu from '../../../components/ChartExportMenu';
import TableExportMenu from '../../../components/TableExportMenu';
import { newChartRoot, chartColors, useIsDark } from '../../../utils/amCharts';

// Same layout as the VIP Reference dashboard: KPI cards, stage-wise heat map,
// current stage distribution, wing-wise pending and the longest-pending appointments.

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// "Full Time · 2 resources · ABC Consultants"
function appointmentLabel(row) {
  const resources = row.number_of_resources ? `${row.number_of_resources} resource${row.number_of_resources === 1 ? '' : 's'}` : null;
  return [row.appointment_type, resources, row.consulting_firm].filter(Boolean).join(' · ') || '—';
}

function KpiCard({ label, value, subtext, icon: Icon, valueColorClass, iconWrapClass, subtextColorClass }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
      <div>
        <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block">{label}</span>
        <span className={`text-2xl font-black block mt-1 ${valueColorClass}`}>{value ?? '—'}</span>
        {subtext && <span className={`text-[10px] font-semibold block mt-0.5 ${subtextColorClass}`}>{subtext}</span>}
      </div>
      <div className={`p-3.5 rounded-xl border flex-shrink-0 ${iconWrapClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

// Horizontal bars, smallest at the bottom (as on the VIP Reference dashboard)
function HorizontalBarChart({ data, categoryField, valueField, onRootReady, dark }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingRight: 20 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 220, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField, renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    // Whole numbers only (counts)
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, maxPrecision: 0, extraMax: 0.1 }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
      xAxis, yAxis, valueXField: valueField, categoryYField: categoryField,
      tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}: [bold]{valueX}[/]' }),
    }));
    series.columns.template.setAll({ fill: am5.color(0x6366f1), stroke: am5.color(0x6366f1), height: am5.percent(60), cornerRadiusTR: 3, cornerRadiusBR: 3 });
    series.bullets.push(() => am5.Bullet.new(root, { locationX: 1, sprite: am5.Label.new(root, { text: '{valueX}', fill: am5.color(c.value), centerY: am5.p50, centerX: am5.p0, dx: 6, fontSize: 11, fontWeight: '700', populateText: true }) }));
    const sorted = [...data].sort((a, b) => a[valueField] - b[valueField]);
    yAxis.data.setAll(sorted);
    series.data.setAll(sorted);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, categoryField, valueField, dark]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

function PendingDays({ days }) {
  const cls = days >= 30 ? 'text-red-600 dark:text-red-400' : days >= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return <span className={`font-bold text-xs ${cls}`}>{days}</span>;
}

function Section({ number, title, note, actions, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[460px] flex flex-col">
      <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-indigo-200">{number}.</span> {title}
          {note && <span className="text-[10px] font-medium text-indigo-200/80 ml-1 normal-case">{note}</span>}
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

export default function ConsultantAppointmentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [distChartRoot, setDistChartRoot] = useState(null);
  const [wingChartRoot, setWingChartRoot] = useState(null);
  const dark = useIsDark();

  // Loading starts in the Retry handler; the effect only fetches
  useEffect(() => {
    let current = true;
    fetchConsultantAppointmentDashboard()
      .then((res) => { if (current) setData(res.data); })
      .catch(() => { if (current) setError('Failed to load dashboard data.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [reloadKey]);

  // Memoised so the charts get the same array until the data reloads; a new array on every
  // render would redraw the chart, whose onRootReady state update renders again (endless loop)
  // Every active stage, including those with no appointments (as on the VIP Reference dashboard)
  const distData = useMemo(() => data?.heatMap || [], [data]);
  const wingWise = useMemo(() => data?.wingWise || [], [data]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  if (loading) return (
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

  const { kpi, lastDataUpdate, heatMap = [], longPending = [] } = data || {};

  const heatHeaders = ['Stage', 'Count', 'Avg days', 'Max days'];
  const heatRows = heatMap.map((row) => [row.stage_name, row.note_count, row.note_count ? row.avg_days : '—', row.note_count ? row.max_days : '—']);
  const pendingHeaders = ['S.No', 'Wing / Division', 'Appointment', 'Current stage', 'Last Updated', 'Days'];
  const pendingRows = longPending.map((row, i) => [
    i + 1,
    [row.wing_name, row.division_name].filter(Boolean).join(' / '),
    appointmentLabel(row),
    row.current_stage,
    formatDate(row.updated_date),
    row.pending_days,
  ]);

  return (
    <div className="space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-3xl p-6">
      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
        Last updated date: {formatDate(lastDataUpdate)}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total consultant appointments"
          value={kpi?.total}
          subtext="Across all wings"
          icon={Layers}
          valueColorClass="text-[#6366f1] dark:text-indigo-400"
          subtextColorClass="text-indigo-600 dark:text-indigo-400"
          iconWrapClass="bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900"
        />
        <KpiCard
          label="Active appointments"
          value={kpi?.active}
          subtext="Contract not yet signed"
          icon={TrendingUp}
          valueColorClass="text-amber-700 dark:text-amber-400"
          subtextColorClass="text-amber-600 dark:text-amber-400"
          iconWrapClass="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900"
        />
        <KpiCard
          label="Contract signed"
          value={kpi?.completed}
          subtext="Completed appointments"
          icon={BarChart3}
          valueColorClass="text-emerald-700 dark:text-emerald-400"
          subtextColorClass="text-emerald-600 dark:text-emerald-400"
          iconWrapClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900"
        />
        <KpiCard
          label="Avg age of active (days)"
          value={kpi?.avgAgeDays}
          subtext="For appointments still active"
          icon={Clock}
          valueColorClass="text-teal-700 dark:text-teal-400"
          subtextColorClass="text-teal-600 dark:text-teal-400"
          iconWrapClass="bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Section
          number={1}
          title="Stage-wise heat map"
          actions={<TableExportMenu headers={heatHeaders} rows={heatRows} fileName="consultant_appointment_stage_heat_map" title="Consultant Appointment Stage-wise Heat Map" />}
        >
          <div className="overflow-auto flex-1 p-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#4f46e5] text-white">
                    {heatHeaders.map((h) => <th key={h} className="px-3 py-2 text-center font-semibold tracking-wide whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatMap.map((row, i) => (
                    <tr key={row.stage_id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-100 font-semibold">{row.stage_name}</td>
                      <td className="px-3 py-2 text-center font-bold text-[#6366f1] dark:text-indigo-400">{row.note_count}</td>
                      <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-100 font-semibold">{row.note_count ? row.avg_days : '—'}</td>
                      <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-100 font-semibold">{row.note_count ? row.max_days : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 dark:text-slate-300 px-5 pb-2 flex-shrink-0">Active appointments only; days since each entered its current stage.</p>
        </Section>

        <Section
          number={2}
          title="Current stage distribution"
          actions={<ChartExportMenu chartRoot={distChartRoot} fileName="consultant_appointment_stage_distribution_chart" color="#6366f1" variant="plain" />}
        >
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              {kpi?.active
                ? <HorizontalBarChart data={distData} categoryField="stage_name" valueField="note_count" onRootReady={setDistChartRoot} dark={dark} />
                : <NoData text="No active appointments" />}
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Number of appointments →</p>
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Section
          number={3}
          title="Wing-wise pending appointments (active)"
          actions={<ChartExportMenu chartRoot={wingChartRoot} fileName="consultant_appointment_wing_wise_pending_chart" color="#6366f1" variant="plain" />}
        >
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              {wingWise.length
                ? <HorizontalBarChart data={wingWise} categoryField="wing_name" valueField="pending_count" onRootReady={setWingChartRoot} dark={dark} />
                : <NoData text="No active appointments" />}
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Number of appointments →</p>
          </div>
        </Section>

        <Section
          number={4}
          title="Long pending appointments"
          note="(Top 10)"
          actions={<TableExportMenu headers={pendingHeaders} rows={pendingRows} fileName="long_pending_consultant_appointments" title="Long Pending Consultant Appointments (Top 10)" />}
        >
          <div className="flex-1 p-3 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-[11px] border-separate border-spacing-0 [&_thead_tr:first-child_th:first-child]:rounded-tl-xl [&_thead_tr:first-child_th:last-child]:rounded-tr-xl [&_tbody_tr:last-child_td:first-child]:rounded-bl-xl [&_tbody_tr:last-child_td:last-child]:rounded-br-xl">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-[#4f46e5] text-white">
                      {pendingHeaders.map((h) => <th key={h} className="px-2.5 py-2 text-center font-semibold tracking-wide">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {longPending.map((row, i) => (
                      <tr key={row.consultant_appointment_id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                        <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 text-center font-mono">{i + 1}</td>
                        <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">
                          {row.wing_name}
                          {row.division_name && <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">{row.division_name}</span>}
                        </td>
                        <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{appointmentLabel(row)}</td>
                        <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.current_stage}</td>
                        <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">{formatDate(row.updated_date)}</td>
                        <td className="px-2.5 py-2 text-right"><PendingDays days={row.pending_days} /></td>
                      </tr>
                    ))}
                    {!longPending.length && (
                      <tr><td colSpan={pendingHeaders.length} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">No long-pending appointments</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 dark:text-slate-300 px-5 py-2 flex-shrink-0">Days calculated from date of entry into current stage till today.</p>
        </Section>
      </div>
    </div>
  );
}
