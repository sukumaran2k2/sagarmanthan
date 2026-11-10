import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { RefreshCw, FileWarning, CheckCircle2, Layers, Clock, MoreVertical, FileSpreadsheet, Printer, Filter, ChevronDown } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import ChartExportMenu from '../../../components/ChartExportMenu';
import { newChartRoot, chartColors, useIsDark } from '../../../utils/amCharts';
import { COMMON_TOASTS } from '../../../utils/notify';
import { exportTableRows } from '../../../utils/exportTableRows';
import { fetchAuditParaDashboard } from '../api';
import { STATUS_STEPS, OPEN_STATUS } from '../constants';

// Same layout and theme as the other module dashboards: KPI cards; 1. open paras per stage with how
// long they have waited; 2. paras per wing (per division once a wing is picked), open and dropped,
// by category; 3. the ten longest-pending paras; 4. paras received and dropped each year. Open = every stage before "Dropped". Rows, bars and pending paras open the
// Data List with the matching filters.

const formatDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

// Category colours, shared by the charts (open: navy / orange; dropped: green / light green)
const AUDIT = 0x1e4d8c;
const DRAFT = 0xd97706;

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

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-3">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: hex(item.color) }} />
          <span className="text-[11px] text-slate-600 dark:text-slate-300">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

// A stacked or clustered bar chart. horizontal: categories down the side. series: [{ field, name,
// color, label }] (label: colour of the count on the bar, for stacked bars). onPick(row, field)
// runs when a bar is clicked.
function BarChart({ data, categoryField, series, horizontal = false, stacked = true, onPick, onRootReady }) {
  const divRef = useRef(null);
  const dark = useIsDark();
  // The latest click handler, so a new one doesn't redraw the chart
  const pickRef = useRef(onPick);
  useEffect(() => { pickRef.current = onPick; }, [onPick]);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingRight: 20 }));
    const catRenderer = horizontal
      ? am5xy.AxisRendererY.new(root, { minGridDistance: 10, inversed: true })
      // Side-by-side bars share the middle of each category, so each pair reads as one group
      : am5xy.AxisRendererX.new(root, { minGridDistance: 20, ...(stacked ? {} : { cellStartLocation: 0.2, cellEndLocation: 0.8 }) });
    catRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: horizontal ? 200 : 110, oversizedBehavior: 'wrap', textAlign: horizontal ? 'end' : 'center' });
    catRenderer.grid.template.set('visible', false);
    const valRenderer = horizontal ? am5xy.AxisRendererX.new(root, {}) : am5xy.AxisRendererY.new(root, {});
    valRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.text), fontWeight: '600' });
    valRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });
    const catAxis = am5xy.CategoryAxis.new(root, { categoryField, renderer: catRenderer });
    const valAxis = am5xy.ValueAxis.new(root, { renderer: valRenderer, min: 0, maxPrecision: 0 });
    if (horizontal) { chart.yAxes.push(catAxis); chart.xAxes.push(valAxis); } else { chart.xAxes.push(catAxis); chart.yAxes.push(valAxis); }
    series.forEach(({ field, name, color, label = 0xffffff }) => {
      const s = chart.series.push(am5xy.ColumnSeries.new(root, {
        name, stacked, xAxis: horizontal ? valAxis : catAxis, yAxis: horizontal ? catAxis : valAxis,
        ...(horizontal ? { valueXField: field, categoryYField: categoryField } : { valueYField: field, categoryXField: categoryField }),
        tooltip: am5.Tooltip.new(root, { labelText: `${name}: [bold]{${horizontal ? 'valueX' : 'valueY'}}[/]` }),
      }));
      s.columns.template.setAll({ fill: am5.color(color), stroke: am5.color(color), ...(horizontal ? { height: am5.percent(60) } : { width: am5.percent(stacked ? 55 : 92) }) });
      if (onPick) {
        s.columns.template.set('cursorOverride', 'pointer');
        s.columns.template.events.on('click', (ev) => pickRef.current?.(ev.target.dataItem?.dataContext, field));
      }
      const valueKey = horizontal ? 'valueX' : 'valueY';
      s.bullets.push((r, ser, dataItem) => (dataItem.get(valueKey)
        ? am5.Bullet.new(r, {
          locationX: horizontal && !stacked ? 1 : 0.5, locationY: !horizontal && !stacked ? 1 : 0.5,
          sprite: am5.Label.new(r, {
            text: `{${valueKey}}`, populateText: true, fontSize: 10, fontWeight: '600',
            fill: am5.color(stacked ? label : c.value), centerX: am5.p50, centerY: stacked ? am5.p50 : am5.p100, dy: stacked ? 0 : -2,
          }),
        })
        : undefined));
      // A zero is left out, so it isn't drawn as a thin sliver
      s.data.setAll(data.map((row) => ({ ...row, [field]: Number(row[field]) || null })));
    });
    catAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data, categoryField, series, horizontal, stacked, onRootReady, dark, onPick ? 1 : 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

// 2. Paras per wing / division: open, then dropped, each by category
const SPLIT_SERIES = [
  { field: 'audit_para', name: 'Audit Para (open)', color: AUDIT },
  { field: 'draft_para', name: 'Draft Para (open)', color: DRAFT },
  { field: 'dropped_audit', name: 'Audit Para (dropped)', color: 0x3b8a4a },
  { field: 'dropped_draft', name: 'Draft Para (dropped)', color: 0xa7d7a8, label: 0x14532d },
];
// 4. Received and dropped each year, side by side
const YEAR_SERIES = [
  { field: 'received', name: 'Received', color: 0x6366f1 },
  { field: 'dropped', name: 'Dropped', color: 0x3b8a4a },
];

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
      <button type="button" onClick={() => setIsOpen((v) => !v)} title="Export options" aria-label="Export options" className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-white/90 hover:bg-white/10 transition cursor-pointer">
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

const STAGE_COLUMNS = [
  { key: 'stage', label: 'Stage', value: (r) => r.stage_name },
  { key: 'count', label: 'Open paras', value: (r) => r.para_count },
  { key: 'avg', label: 'Avg days', value: (r) => (r.para_count ? r.avg_days : '—') },
  { key: 'max', label: 'Max days', value: (r) => (r.para_count ? r.max_days : '—') },
];
const LONG_COLUMNS = [
  { key: 'para', label: 'Para No.', value: (r) => r.para_number },
  { key: 'subject', label: 'Subject', value: (r) => r.subject },
  { key: 'wing', label: 'Wing', value: (r) => r.wing_name },
  { key: 'stage', label: 'Current stage', value: (r) => r.current_stage || 'No Status' },
  { key: 'since', label: 'In stage since', value: (r) => formatDate(r.stage_since) },
  { key: 'days', label: 'Days', value: (r) => r.pending_days },
];

const panel = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[460px] flex flex-col';
const panelHeader = 'bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between flex-shrink-0';
const panelTitle = 'text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5';
const tableHead = 'bg-[#4f46e5] text-white';
const hint = 'text-[9px] text-slate-600 dark:text-slate-300 px-5 py-2 flex-shrink-0';
const clickableRow = 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';

// onOpenList({ wing, division, category, status, search }) opens the Data List with those filters
export default function AuditParaDashboard({ notify, wings = [], onOpenList }) {
  const [selectedWing, setSelectedWing] = useState('');
  const [wingDropdownOpen, setWingDropdownOpen] = useState(false);
  const [splitChartRoot, setSplitChartRoot] = useState(null);
  const [yearChartRoot, setYearChartRoot] = useState(null);

  // Dashboard figures, tagged with the request they answer
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${selectedWing}:${reloadKey}`;
  const [result, setResult] = useState(null); // { key, data, failed }
  useEffect(() => {
    let cancelled = false;
    fetchAuditParaDashboard(selectedWing)
      .then((res) => { if (!cancelled) setResult({ key: requestKey, data: res.data }); })
      .catch((err) => {
        if (cancelled) return;
        console.error('Audit Para dashboard could not be loaded:', err);
        setResult({ key: requestKey, data: null, failed: true });
        notify(COMMON_TOASTS.loadFailed('The Audit Para dashboard'));
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
  // "No Status" only shows when some para has no stage yet
  const stageRows = useMemo(() => (data?.stages || []).filter((s) => s.stage_id !== 0 || s.para_count > 0), [data]);
  const breakdown = useMemo(() => data?.breakdown || { by: 'wing', rows: [] }, [data]);
  const yearly = useMemo(() => (data?.yearly || []).map((y) => ({ ...y, year: String(y.year) })), [data]);
  const longPending = useMemo(() => data?.longPending || [], [data]);
  const selectedWingName = wings.find((w) => String(w.wing_id) === String(selectedWing))?.wing_name;

  // Bar of the wing / division chart -> the Data List for that wing (and division), category and
  // open / dropped. "Audit Para" bars stand for every category but Draft Para.
  const pickSplit = useMemo(() => (row, field) => {
    if (!row || !onOpenList) return;
    const isDraft = field === 'draft_para' || field === 'dropped_draft';
    const isDropped = field.startsWith('dropped');
    onOpenList(breakdown.by === 'division'
      ? { wing: selectedWingName, division: row.name, category: isDraft ? 'Draft Para' : 'Audit Para', status: isDropped ? STATUS_STEPS[7] : OPEN_STATUS }
      : { wing: row.name, category: isDraft ? 'Draft Para' : 'Audit Para', status: isDropped ? STATUS_STEPS[7] : OPEN_STATUS });
  }, [breakdown.by, selectedWingName, onOpenList]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard...
    </div>
  );

  if (result.failed) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-600">The dashboard could not be loaded.</p>
      <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="text-xs font-semibold text-[#6366f1] underline cursor-pointer">Retry</button>
    </div>
  );

  const exportRows = (type, columns, rows, fileName, title) => exportTableRows(type, { columns, rows, fileName, title, notify });
  const chooseWing = (id) => { setSelectedWing(id); setWingDropdownOpen(false); };
  const openDraft = kpi?.openDraft || 0;
  const wingFilter = selectedWingName ? { wing: selectedWingName } : {};
  const openStage = (row) => onOpenList?.({ ...wingFilter, status: STATUS_STEPS[row.stage_id] });
  const openPara = (row) => onOpenList?.({ search: row.para_number });
  const rowKeys = (open) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  const byDivision = breakdown.by === 'division';
  const undated = data?.droppedWithoutDate || 0;

  return (
    <div className="space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-3xl p-6">
      <div className="flex flex-wrap items-center gap-3">
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
        {onOpenList && <p className="text-[10px] text-slate-600 dark:text-slate-400">Click a stage, bar or pending para to see those paras in the Data List.</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total paras" value={kpi?.total} subtext={selectedWing ? selectedWingName : 'Across all wings'} icon={Layers}
          valueColorClass="text-[#6366f1] dark:text-indigo-400" subtextColorClass="text-indigo-600 dark:text-indigo-400"
          iconWrapClass="bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900" />
        <KpiCard label="Open paras" value={kpi?.open} subtext={`${openDraft} draft ${openDraft === 1 ? 'para' : 'paras'}`} icon={FileWarning}
          valueColorClass="text-amber-700 dark:text-amber-400" subtextColorClass="text-amber-700 dark:text-amber-400"
          iconWrapClass="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900" />
        <KpiCard label="Dropped" value={kpi?.dropped} subtext="Settled and dropped by CAG" icon={CheckCircle2}
          valueColorClass="text-emerald-700 dark:text-emerald-400" subtextColorClass="text-emerald-700 dark:text-emerald-400"
          iconWrapClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" />
        <KpiCard label="Avg age of open paras (days)" value={kpi?.avgAgeDays} subtext="Since received at the Ministry" icon={Clock}
          valueColorClass="text-teal-700 dark:text-teal-400" subtextColorClass="text-teal-700 dark:text-teal-400"
          iconWrapClass="bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className={panel}>
          <div className={panelHeader}>
            <h3 className={panelTitle}><span className="text-indigo-200">1.</span> Open paras by stage</h3>
            <TableExportMenu onExport={(type) => exportRows(type, STAGE_COLUMNS, stageRows, 'audit_paras_by_stage', 'Audit Paras - Open Paras by Stage')} />
          </div>
          <div className="flex-1 min-h-0 p-3 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className={tableHead}>
                    {STAGE_COLUMNS.map((c) => <th key={c.key} className="px-3 py-2 text-center font-semibold tracking-wide whitespace-nowrap">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {stageRows.map((row, i) => {
                    const canOpen = onOpenList && row.para_count > 0 && STATUS_STEPS[row.stage_id];
                    return (
                      <tr
                        key={row.stage_id}
                        className={`${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'} ${canOpen ? clickableRow : ''}`}
                        {...(canOpen ? { onClick: () => openStage(row), onKeyDown: rowKeys(() => openStage(row)), tabIndex: 0, title: 'Show these paras in the Data List' } : {})}
                      >
                        <td className="px-3 py-1.5 text-slate-800 dark:text-slate-100 font-semibold">{row.stage_name}</td>
                        <td className="px-3 py-1.5 text-center font-bold text-[#6366f1] dark:text-indigo-400">{row.para_count}</td>
                        <td className="px-3 py-1.5 text-center text-slate-800 dark:text-slate-100 font-semibold">{row.para_count ? row.avg_days : '—'}</td>
                        <td className="px-3 py-1.5 text-center text-slate-800 dark:text-slate-100 font-semibold">{row.para_count ? row.max_days : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className={hint}>Days in the current stage, from that stage&apos;s date till today.</p>
        </div>

        <div className={panel}>
          <div className={panelHeader}>
            <h3 className={panelTitle}>
              <span className="text-indigo-200">2.</span> {byDivision ? 'Division-wise paras' : 'Wing-wise paras'}
              {byDivision && <span className="text-[10px] font-medium text-indigo-200/80 ml-1 normal-case">({selectedWingName})</span>}
            </h3>
            <ChartExportMenu chartRoot={splitChartRoot} fileName={byDivision ? 'audit_paras_division_wise' : 'audit_paras_wing_wise'} color="#6366f1" variant="plain" />
          </div>
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              {breakdown.rows.length
                ? <BarChart data={breakdown.rows} categoryField="name" series={SPLIT_SERIES} horizontal onPick={onOpenList ? pickSplit : undefined} onRootReady={setSplitChartRoot} />
                : <p className="text-xs text-center text-slate-600 dark:text-slate-300 py-10">No paras</p>}
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Number of paras →</p>
            <div className="flex-shrink-0"><Legend items={SPLIT_SERIES} /></div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className={panel}>
          <div className={panelHeader}>
            <h3 className={panelTitle}>
              <span className="text-indigo-200">3.</span> Long pending paras
              <span className="text-[10px] font-medium text-indigo-200/80 ml-1">(Top 10)</span>
            </h3>
            <TableExportMenu onExport={(type) => exportRows(type, LONG_COLUMNS, longPending, 'long_pending_audit_paras', 'Long Pending Audit Paras (Top 10)')} />
          </div>
          <div className="flex-1 min-h-0 p-3 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className={tableHead}>
                    {['S.No', ...LONG_COLUMNS.map((c) => c.label)].map((h) => <th key={h} className="px-2.5 py-2 text-center font-semibold tracking-wide">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {longPending.map((row, i) => (
                    <tr
                      key={row.audit_para_id}
                      className={`${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'} ${onOpenList ? clickableRow : ''}`}
                      {...(onOpenList ? { onClick: () => openPara(row), onKeyDown: rowKeys(() => openPara(row)), tabIndex: 0, title: 'Show this para in the Data List' } : {})}
                    >
                      <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 text-center font-mono">{i + 1}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words align-top">
                        {row.para_number}
                        {row.category === 'Draft Para' && <span className="block text-[9px] font-bold text-amber-700 dark:text-amber-400">Draft Para</span>}
                      </td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold max-w-[200px] whitespace-normal break-words align-top">{row.subject}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.wing_name}</td>
                      <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.current_stage || 'No Status'}</td>
                      <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">{formatDate(row.stage_since)}</td>
                      <td className="px-2.5 py-2 text-right"><PendingDays days={row.pending_days} /></td>
                    </tr>
                  ))}
                  {!longPending.length && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">No pending paras</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className={hint}>Days from the date of the current stage till today. &quot;Under Clarification&quot; has no date, so its last update is used.</p>
        </div>

        <div className={panel}>
        <div className={panelHeader}>
          <h3 className={panelTitle}><span className="text-indigo-200">4.</span> Paras received and dropped each year</h3>
          <ChartExportMenu chartRoot={yearChartRoot} fileName="audit_paras_year_wise" color="#6366f1" variant="plain" />
        </div>
        <div className="p-5 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0">
            {yearly.length
              ? <BarChart data={yearly} categoryField="year" series={YEAR_SERIES} stacked={false} onRootReady={setYearChartRoot} />
              : <p className="text-xs text-center text-slate-600 dark:text-slate-300 py-10">No paras</p>}
          </div>
          <div className="flex-shrink-0"><Legend items={YEAR_SERIES} /></div>
        </div>
        <p className={hint}>
          Received: year the para reached the Ministry (the entry date when that is missing). Dropped: year of the dropped date.
          {undated > 0 && ` ${undated} dropped ${undated === 1 ? 'para has' : 'paras have'} no dropped date and ${undated === 1 ? 'is' : 'are'} not shown.`}
        </p>
      </div>
      </div>
    </div>
  );
}
