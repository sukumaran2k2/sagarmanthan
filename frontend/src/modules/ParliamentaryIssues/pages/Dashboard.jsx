import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { RefreshCw, TrendingUp, BarChart3, Layers, Clock } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchParliamentaryIssueDashboard } from '../api';
import ChartExportMenu from '../../../components/ChartExportMenu';
import { MoreVertical, FileSpreadsheet, Printer } from 'lucide-react';

const COMPLETED_STAGE_NAMES = ['Matter Disposed', 'Replay sent'];

function SlaBadge({ status }) {
  if (!status) return <span className="text-slate-600 dark:text-slate-300 text-[10px]">—</span>;
  const map = {
    Good:     'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    'At Risk':'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    Critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${map[status] || ''}`}>{status}</span>;
}

function KpiCard({ label, value, subtext, icon: Icon, valueColorClass, iconWrapClass, subtextColorClass }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
      <div>
        <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest block">{label}</span>
        <span className={`text-2xl font-black block mt-1 ${valueColorClass}`}>{value ?? '—'}</span>
        {subtext && (
          <span className={`text-[10px] font-semibold block mt-0.5 ${subtextColorClass}`}>{subtext}</span>
        )}
      </div>
      <div className={`p-3.5 rounded-xl border flex-shrink-0 ${iconWrapClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function StageDistributionChart({ data, onRootReady }) {
  const divRef = useRef(null);
  const rootRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return;
    if (rootRef.current) rootRef.current.dispose();
    const root = am5.Root.new(divRef.current);
    rootRef.current = root;
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingRight: 20 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x1e293b), fontWeight: '600', maxWidth: 220, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'stage_name', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x1e293b), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0 }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, { xAxis, yAxis, valueXField: 'note_count', categoryYField: 'stage_name', tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}: [bold]{valueX}[/]' }) }));
    series.columns.template.setAll({ fill: am5.color(0x6366f1), stroke: am5.color(0x6366f1), height: am5.percent(60), cornerRadiusTR: 3, cornerRadiusBR: 3 });
    series.bullets.push(() => am5.Bullet.new(root, { locationX: 1, sprite: am5.Label.new(root, { text: '{valueX}', fill: am5.color(0x334155), centerY: am5.p50, centerX: am5.p0, dx: 6, fontSize: 11, fontWeight: '700', populateText: true }) }));
    const sorted = [...data].sort((a, b) => a.note_count - b.note_count);
    yAxis.data.setAll(sorted);
    series.data.setAll(sorted);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

function WingWiseChart({ data, onRootReady }) {
  const divRef = useRef(null);
  const rootRef = useRef(null);
  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return;
    if (rootRef.current) rootRef.current.dispose();
    const root = am5.Root.new(divRef.current);
    rootRef.current = root;
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingRight: 20 }));
    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 10 });
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x1e293b), fontWeight: '600', maxWidth: 220, oversizedBehavior: 'wrap', textAlign: 'end' });
    yRenderer.grid.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'wing_name', renderer: yRenderer }));
    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(0x1e293b), fontWeight: '600' });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeDasharray: [3, 3] });
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0 }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, { xAxis, yAxis, valueXField: 'pending_count', categoryYField: 'wing_name', tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}: [bold]{valueX}[/]' }) }));
    series.columns.template.setAll({ fill: am5.color(0x6366f1), stroke: am5.color(0x6366f1), height: am5.percent(60), cornerRadiusTR: 3, cornerRadiusBR: 3 });
    series.bullets.push(() => am5.Bullet.new(root, { locationX: 1, sprite: am5.Label.new(root, { text: '{valueX}', fill: am5.color(0x334155), centerY: am5.p50, centerX: am5.p0, dx: 6, fontSize: 11, fontWeight: '700', populateText: true }) }));
    const sorted = [...data].sort((a, b) => a.pending_count - b.pending_count);
    yAxis.data.setAll(sorted);
    series.data.setAll(sorted);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
  }, [data]);
  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}

function PendingDays({ days }) {
  const cls = days >= 30 ? 'text-red-600 dark:text-red-400' : days >= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return <span className={`font-bold text-xs ${cls}`}>{days}</span>;
}

function TableExportMenu({ headers, data, fileName = 'export', title = 'Report' }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExcel = () => {
    setIsOpen(false);
    if (!data?.length) return;
    let csv = '\uFEFF' + headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';
    data.forEach((row) => {
      csv += Object.values(row).map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setIsOpen(false);
    if (!data?.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const headHtml = headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:left;background:#6366f1;color:#fff;font-size:11px;font-weight:bold;text-transform:uppercase;">${h}</th>`).join('');
    const rowsHtml = data.map((row, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = Object.values(row).map((v) => `<td style="border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;">${String(v ?? '')}</td>`).join('');
      return `<tr style="background:${bg};">${cells}</tr>`;
    }).join('');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:-apple-system,sans-serif;color:#1e293b;padding:24px}h1{font-size:16px;color:#6366f1;margin-bottom:4px;font-weight:800;text-transform:uppercase}p{font-size:11px;color:#64748b;margin-top:0;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-top:12px}@media print{body{padding:0}}</style>
      </head><body><h1>${title}</h1><p>Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      <table><thead><tr>${headHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        title="Export options"
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-white/90 hover:bg-white/10 transition cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <button
            type="button"
            onClick={handleExcel}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-transparent text-left"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>CSV (Excel)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-transparent text-left border-t border-slate-100 dark:border-slate-800"
          >
            <Printer className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span>Print / PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ParliamentaryIssueDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distChartRoot, setDistChartRoot] = useState(null);
  const [wingChartRoot, setWingChartRoot] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchParliamentaryIssueDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const { kpi, lastDataUpdate, heatMap = [], wingWise = [], longPending = [] } = data || {};
  const distData = useMemo(() => heatMap.filter((s) => !COMPLETED_STAGE_NAMES.includes(s.stage_name)), [heatMap]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard...
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={() => load()} className="text-xs font-semibold text-[#6366f1] underline cursor-pointer">Retry</button>
    </div>
  );

  const heatMapExportData = heatMap.map((row) => ({
    Stage: row.stage_name,
    Count: row.note_count,
    'Avg days': row.note_count ? row.avg_days : '—',
    'Max days': row.note_count ? row.max_days : '—',
    'SLA status': row.sla_status || '—',
  }));

  const longPendingExportData = longPending.map((row, i) => ({
    'S.No': i + 1,
    Subject: row.subject,
    Wing: row.wing_name,
    'Current stage': row.current_stage,
    'Last Updated': row.updated_date ? new Date(row.updated_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    Days: row.pending_days,
  }));

  return (
    <div className="space-y-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/25 dark:via-slate-950 dark:to-purple-950/20 rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
          Last updated date: {lastDataUpdate
            ? new Date(lastDataUpdate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total parliamentary issues"
          value={kpi?.total}
          subtext="Across all wings"
          icon={Layers}
          valueColorClass="text-[#6366f1] dark:text-indigo-400"
          subtextColorClass="text-indigo-600 dark:text-indigo-400"
          iconWrapClass="bg-indigo-50 dark:bg-indigo-950/40 text-[#6366f1] dark:text-indigo-400 border-indigo-100 dark:border-indigo-900"
        />
        <KpiCard
          label="Active issues"
          value={kpi?.active}
          subtext="Currently in progress"
          icon={TrendingUp}
          valueColorClass="text-amber-700 dark:text-amber-400"
          subtextColorClass="text-amber-600 dark:text-amber-400"
          iconWrapClass="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900"
        />
        <KpiCard
          label="Completed"
          value={kpi?.completed}
          subtext="Disposed / reply sent"
          icon={BarChart3}
          valueColorClass="text-emerald-700 dark:text-emerald-400"
          subtextColorClass="text-emerald-600 dark:text-emerald-400"
          iconWrapClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900"
        />
        <KpiCard
          label="Avg age of active issues (days)"
          value={kpi?.avgAgeDays}
          subtext="For issues still active"
          icon={Clock}
          valueColorClass="text-teal-700 dark:text-teal-400"
          subtextColorClass="text-teal-600 dark:text-teal-400"
          iconWrapClass="bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[460px] flex flex-col">
          <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-indigo-200">1.</span> Stage-wise heat map
            </h3>
            <TableExportMenu
              headers={['Stage', 'Count', 'Avg days', 'Max days', 'SLA status']}
              data={heatMapExportData}
              fileName="parliamentary_issue_stage_heat_map"
              title="Parliamentary Issues Stage-wise Heat Map"
            />
          </div>
          <div className="overflow-hidden flex-1 p-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#4f46e5] text-white relative z-10">
                  {['Stage','Count','Avg days','Max days','SLA status'].map((h) => (
                    <th key={h} className="px-3 py-2 text-center font-semibold tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatMap.map((row, i) => (
                  <tr key={row.stage_name} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100 font-semibold">{row.stage_name}</td>
                    <td className="px-3 py-2 text-center font-bold text-[#6366f1] dark:text-indigo-400">{row.note_count}</td>
                    <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-100 font-semibold">{row.note_count ? row.avg_days : '—'}</td>
                    <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-100 font-semibold">{row.note_count ? row.max_days : '—'}</td>
                    <td className="px-3 py-2"><SlaBadge status={row.sla_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[460px] flex flex-col">
          <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-indigo-200">2.</span> Current stage distribution
            </h3>
            <ChartExportMenu chartRoot={distChartRoot} fileName="parliamentary_issue_stage_distribution_chart" color="#6366f1" variant="plain" />
          </div>
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              <StageDistributionChart data={distData} onRootReady={setDistChartRoot} />
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Number of issues →</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[460px] flex flex-col">
          <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-indigo-200">3.</span> Wing-wise pending issues (active)
            </h3>
            <ChartExportMenu chartRoot={wingChartRoot} fileName="parliamentary_issue_wing_wise_pending_chart" color="#6366f1" variant="plain" />
          </div>
          <div className="p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
              <WingWiseChart data={wingWise} onRootReady={setWingChartRoot} />
            </div>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 text-center mt-1 flex-shrink-0">Number of issues →</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[460px] flex flex-col">
          <div className="bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-5 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-indigo-200">4.</span> Long pending issues
              <span className="text-[10px] font-medium text-indigo-200/80 ml-1">(Top 10)</span>
            </h3>
            <TableExportMenu
              headers={['S.No', 'Subject', 'Wing', 'Current stage', 'Last Updated', 'Days']}
              data={longPendingExportData}
              fileName="long_pending_parliamentary_issues"
              title="Long Pending Parliamentary Issues (Top 10)"
            />
          </div>
          <div className="flex-1 p-3 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-[11px] border-separate border-spacing-0 [&_thead_tr:first-child_th:first-child]:rounded-tl-xl [&_thead_tr:first-child_th:last-child]:rounded-tr-xl [&_tbody_tr:last-child_td:first-child]:rounded-bl-xl [&_tbody_tr:last-child_td:last-child]:rounded-br-xl">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#4f46e5] text-white relative z-10">
                  {['S.No','Subject','Wing','Current stage','Last Updated','Days'].map((h) => (
                    <th key={h} className="px-2.5 py-2 text-center font-semibold tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {longPending.map((row, i) => (
                  <tr key={row.parliamentary_issue_id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 text-center font-mono">{i + 1}</td>
                    <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold max-w-[220px] whitespace-normal break-words align-top">{row.subject}</td>
                    <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.wing_name}</td>
                    <td className="px-2.5 py-2 text-slate-800 dark:text-slate-100 font-semibold whitespace-normal break-words">{row.current_stage}</td>
                    <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">{row.updated_date ? new Date(row.updated_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-2.5 py-2 text-right"><PendingDays days={row.pending_days} /></td>
                  </tr>
                ))}
                {!longPending.length && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-600 dark:text-slate-300">No long-pending issues</td></tr>
                )}
              </tbody>
            </table>
            </div>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 dark:text-slate-300 px-5 py-2 flex-shrink-0">Days calculated from date of entry into current stage till today.</p>
        </div>
      </div>
    </div>
  );
}
