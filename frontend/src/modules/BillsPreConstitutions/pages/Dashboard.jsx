import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { RefreshCw, TrendingUp, BarChart3, Layers, Clock, MoreVertical, FileSpreadsheet, Printer, Filter, ChevronDown } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import ChartExportMenu from '../../../components/ChartExportMenu';
import { COMMON_TOASTS } from '../../../utils/notify';
import { exportTableRows } from '../../../utils/exportTableRows';
import { fetchBillDashboard } from '../api';

// Same layout as the Cabinet Notes MoPSW dashboard: KPI cards, stage-wise heat map, current
// stage distribution, wing-wise active bills and the ten longest-pending bills.

const formatDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

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

function StageDistributionChart({ data, onRootReady }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const root = am5.Root.new(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingRight: 20 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x1e293b), fontWeight: '600', maxWidth: 280, oversizedBehavior: 'wrap', textAlign: 'end', lineHeight: 1, paddingTop: 0, paddingBottom: 0 });
    // Rows are keyed by stage id (stages 2 and 6 share a name, and the axis merges equal
    // categories); the label shows the name
    yRenderer.labels.template.adapters.add('text', (text, target) => target.dataItem?.dataContext?.stage_name ?? text);
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'stage_key', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x1e293b), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0 }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, { xAxis, yAxis, valueXField: 'bill_count', categoryYField: 'stage_key', tooltip: am5.Tooltip.new(root, { labelText: '{stage_name}: [bold]{valueX}[/]' }) }));
    series.columns.template.setAll({ fill: am5.color(0x6366f1), stroke: am5.color(0x6366f1), height: am5.percent(60), cornerRadiusTR: 3, cornerRadiusBR: 3 });
    series.bullets.push(() => am5.Bullet.new(root, { locationX: 1, sprite: am5.Label.new(root, { text: '{valueX}', fill: am5.color(0x334155), centerY: am5.p50, centerX: am5.p0, dx: 6, fontSize: 11, fontWeight: '700', populateText: true }) }));
    const sorted = data
      .map((s) => ({ ...s, stage_key: String(s.stage_id) }))
      .sort((a, b) => a.bill_count - b.bill_count);
    yAxis.data.setAll(sorted);
    series.data.setAll(sorted);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, onRootReady]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

// Active bills per wing, split by how far they have got
const WING_SERIES = [
  { field: 'in_progress', name: 'In Progress', color: 0x1e4d8c },
  { field: 'cabinet_approved', name: 'Approved by Cabinet', color: 0x3b8a4a },
  { field: 'in_parliament', name: 'In Parliament', color: 0xd97706 },
];

function WingWiseChart({ data, onRootReady }) {
  const divRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const root = am5.Root.new(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingRight: 20 }));
    // inversed: the server sends the busiest wing first, so it is drawn at the top
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10, inversed: true });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x1e293b), fontWeight: '600', maxWidth: 220, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'wing_name', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x1e293b), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, maxPrecision: 0 }));
    WING_SERIES.forEach(({ field, name, color }) => {
      const s = chart.series.push(am5xy.ColumnSeries.new(root, { name, xAxis, yAxis, valueXField: field, categoryYField: 'wing_name', stacked: true, tooltip: am5.Tooltip.new(root, { labelText: `${name}: [bold]{valueX}[/]` }) }));
      s.columns.template.setAll({ fill: am5.color(color), stroke: am5.color(color), height: am5.percent(60) });
      s.bullets.push((r, series, dataItem) => (dataItem.get('valueX')
        ? am5.Bullet.new(r, { sprite: am5.Label.new(r, { text: '{valueX}', fill: am5.color(0xffffff), centerY: am5.p50, centerX: am5.p50, fontSize: 10, fontWeight: '600', populateText: true }) })
        : undefined));
      s.data.setAll(data);
    });
    yAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, onRootReady]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

function WingWiseLegend() {
  return (
    <div className="flex items-center justify-center gap-5 mt-3">
      {WING_SERIES.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: `#${item.color.toString(16).padStart(6, '0')}` }} />
          <span className="text-[11px] text-slate-600 dark:text-slate-300">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

function PendingDays({ days }) {
  const cls = days >= 180 ? 'text-red-600 dark:text-red-400' : days >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return <span className={`font-bold text-xs ${cls}`}>{days}</span>;
}

// Kebab menu in a panel header: CSV or print of that panel's table
function TableExportMenu({ onExport }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const pick = (type) => { setIsOpen(false); onExport(type); };
  const item = 'flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-transparent text-left';
  return (
    <div className="relative inline-block" ref={menuRef}>
      <button type="button" onClick={() => setIsOpen((v) => !v)} title="Export options" className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-white/90 hover:bg-white/10 transition cursor-pointer">
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <button type="button" onClick={() => pick('excel')} className={item}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>CSV (Excel)</span>
          </button>
          <button type="button" onClick={() => pick('pdf')} className={`${item} border-t border-slate-100 dark:border-slate-800`}>
            <Printer className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span>Print / PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

const HEAT_COLUMNS = [
  { key: 'stage', label: 'Stage', value: (r) => r.stage_name },
  { key: 'count', label: 'Count', value: (r) => r.bill_count },
  { key: 'avg', label: 'Avg days', value: (r) => (r.bill_count ? r.avg_days : '—') },
  { key: 'max', label: 'Max days', value: (r) => (r.bill_count ? r.max_days : '—') },
];
const LONG_COLUMNS = [
  { key: 'subject', label: 'Subject', value: (r) => r.subject },
  { key: 'wing', label: 'Wing', value: (r) => r.wing_name },
  { key: 'stage', label: 'Current stage', value: (r) => r.current_stage || 'No Status' },
  { key: 'updated', label: 'Last Updated', value: (r) => formatDate(r.updated_date) },
  { key: 'days', label: 'Days', value: (r) => r.pending_days },
];

const panel = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[460px] flex flex-col';
const panelHeader = 'bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between flex-shrink-0';
const panelTitle = 'text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5';

export default function BillsDashboard({ notify, wings = [] }) {
  const [selectedWing, setSelectedWing] = useState('');
  const [wingDropdownOpen, setWingDropdownOpen] = useState(false);
  const [distChartRoot, setDistChartRoot] = useState(null);
  const [wingChartRoot, setWingChartRoot] = useState(null);

  // Dashboard figures, tagged with the request they answer
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${selectedWing}:${reloadKey}`;
  const [result, setResult] = useState(null); // { key, data, failed }
  useEffect(() => {
    let cancelled = false;
    fetchBillDashboard(selectedWing)
      .then((res) => { if (!cancelled) setResult({ key: requestKey, data: res.data }); })
      .catch((err) => {
        if (cancelled) return;
        console.error('Bills dashboard could not be loaded:', err);
        setResult({ key: requestKey, data: null, failed: true });
        notify(COMMON_TOASTS.loadFailed('The Bills dashboard'));
      });
    return () => { cancelled = true; };
  }, [requestKey, selectedWing, notify]);
  const loading = result?.key !== requestKey;

  const wingDropdownRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (wingDropdownRef.current && !wingDropdownRef.current.contains(e.target)) setWingDropdownOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const data = loading ? null : result.data;
  const { kpi, lastDataUpdate } = data || {};
  const heatMap = useMemo(() => data?.heatMap || [], [data]);
  const wingWise = useMemo(() => data?.wingWise || [], [data]);
  const longPending = useMemo(() => data?.longPending || [], [data]);
  // "No Status" only shows when some bill has no stage yet
  const stageRows = useMemo(() => heatMap.filter((s) => s.stage_id !== 0 || s.bill_count > 0), [heatMap]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard...
    </div>
  );

  if (result.failed) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-500">The dashboard could not be loaded.</p>
      <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="text-xs font-semibold text-[#6366f1] underline cursor-pointer">Retry</button>
    </div>
  );

  const exportRows = (type, columns, rows, fileName, title) => exportTableRows(type, { columns, rows, fileName, title, notify });
  const selectedWingName = wings.find((w) => String(w.wing_id) === String(selectedWing))?.wing_name;
  const chooseWing = (id) => { setSelectedWing(id); setWingDropdownOpen(false); };

  return (
    <div className="space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">Last updated date: {formatDate(lastDataUpdate)}</p>
        <div className="relative" ref={wingDropdownRef}>
          <button
            type="button"
            onClick={() => setWingDropdownOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
              selectedWing
                ? 'bg-indigo-50 border-indigo-200 text-[#6366f1] dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <Filter className="h-3 w-3" />
            {selectedWing ? (selectedWingName || 'Wing') : 'All Wings'}
            <ChevronDown className="h-3 w-3" />
          </button>
          {wingDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-48 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
              {[{ wing_id: '', wing_name: 'All Wings' }, ...wings].map((w) => (
                <button
                  key={w.wing_id}
                  type="button"
                  onClick={() => chooseWing(w.wing_id)}
                  className={`flex w-full items-center px-3 py-2 text-xs font-semibold text-left cursor-pointer border-none bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 ${String(selectedWing) === String(w.wing_id) ? 'text-[#6366f1]' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  {w.wing_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total bills" value={kpi?.total} subtext={selectedWing ? selectedWingName : 'Across all wings'} icon={Layers}
          valueColorClass="text-[#6366f1] dark:text-indigo-400" subtextColorClass="text-indigo-600 dark:text-indigo-400"
          iconWrapClass="bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900" />
        <KpiCard label="Active bills" value={kpi?.active} subtext="Currently in progress" icon={TrendingUp}
          valueColorClass="text-amber-700 dark:text-amber-400" subtextColorClass="text-amber-600 dark:text-amber-400"
          iconWrapClass="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900" />
        <KpiCard label="Completed" value={kpi?.completed} subtext="Finalized bills" icon={BarChart3}
          valueColorClass="text-emerald-700 dark:text-emerald-400" subtextColorClass="text-emerald-600 dark:text-emerald-400"
          iconWrapClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" />
        <KpiCard label="Avg age of active bills (days)" value={kpi?.avgAgeDays} subtext="For bills still active" icon={Clock}
          valueColorClass="text-teal-700 dark:text-teal-400" subtextColorClass="text-teal-600 dark:text-teal-400"
          iconWrapClass="bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className={panel}>
          <div className={panelHeader}>
            <h3 className={panelTitle}><span className="text-indigo-200">1.</span> Stage-wise heat map</h3>
            <TableExportMenu onExport={(type) => exportRows(type, HEAT_COLUMNS, stageRows, 'bills_stage_wise_heat_map', 'Bills - Stage-wise Heat Map')} />
          </div>
          <div className="flex-1 min-h-0 p-3 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#4f46e5] text-white">
                    {HEAT_COLUMNS.map((c) => <th key={c.key} className="px-3 py-2 text-center font-semibold tracking-wide whitespace-nowrap">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {stageRows.map((row, i) => (
                    <tr key={row.stage_id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                      <td className="px-3 py-1.5 text-slate-800 dark:text-slate-100 font-semibold">{row.stage_name}</td>
                      <td className="px-3 py-1.5 text-center font-bold text-[#6366f1] dark:text-indigo-400">{row.bill_count}</td>
                      <td className="px-3 py-1.5 text-center text-slate-800 dark:text-slate-100 font-semibold">{row.bill_count ? row.avg_days : '—'}</td>
                      <td className="px-3 py-1.5 text-center text-slate-800 dark:text-slate-100 font-semibold">{row.bill_count ? row.max_days : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={panel}>
          <div className={panelHeader}>
            <h3 className={panelTitle}><span className="text-indigo-200">2.</span> Current stage distribution</h3>
            <ChartExportMenu chartRoot={distChartRoot} fileName="bills_stage_distribution_chart" color="#6366f1" variant="plain" />
          </div>
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              <StageDistributionChart data={stageRows} onRootReady={setDistChartRoot} />
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Number of bills →</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className={panel}>
          <div className={panelHeader}>
            <h3 className={panelTitle}><span className="text-indigo-200">3.</span> Wing-wise pending bills (active)</h3>
            <ChartExportMenu chartRoot={wingChartRoot} fileName="bills_wing_wise_pending_chart" color="#6366f1" variant="plain" />
          </div>
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              {wingWise.length
                ? <WingWiseChart data={wingWise} onRootReady={setWingChartRoot} />
                : <p className="text-xs text-center text-slate-500 py-10">No active bills</p>}
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Number of bills →</p>
            <div className="flex-shrink-0"><WingWiseLegend /></div>
          </div>
        </div>

        <div className={panel}>
          <div className={panelHeader}>
            <h3 className={panelTitle}>
              <span className="text-indigo-200">4.</span> Long pending bills
              <span className="text-[10px] font-medium text-indigo-200/80 ml-1">(Top 10)</span>
            </h3>
            <TableExportMenu onExport={(type) => exportRows(type, LONG_COLUMNS, longPending, 'long_pending_bills', 'Long Pending Bills (Top 10)')} />
          </div>
          <div className="flex-1 min-h-0 p-3 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#4f46e5] text-white">
                    {['S.No', ...LONG_COLUMNS.map((c) => c.label)].map((h) => <th key={h} className="px-2.5 py-2 text-center font-semibold tracking-wide">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {longPending.map((row, i) => (
                    <tr key={row.bill_id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                      <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 text-center font-mono">{i + 1}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold max-w-[220px] whitespace-normal break-words align-top">{row.subject}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.wing_name}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.current_stage || 'No Status'}</td>
                      <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">{formatDate(row.updated_date)}</td>
                      <td className="px-2.5 py-2 text-right"><PendingDays days={row.pending_days} /></td>
                    </tr>
                  ))}
                  {!longPending.length && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">No pending bills</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 dark:text-slate-300 px-5 py-2 flex-shrink-0">Days calculated from date of entry into current stage till today.</p>
        </div>
      </div>
    </div>
  );
}
