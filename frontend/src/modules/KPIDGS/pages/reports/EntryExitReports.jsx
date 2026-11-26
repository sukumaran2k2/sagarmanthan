import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import TableWithToolbar from '../../../../components/TableWithToolbar';
import { newChartRoot, chartColors, useIsDark } from '../../../../utils/amCharts';
import { keepValueLabelsApart } from '../../../../utils/chartValueLabels';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';
import { exportGridToExcel, exportGridToPdf } from '../../../../utils/exportGridReport';
import { useNotifier, COMMON_TOASTS } from '../../../../utils/notify';
import { fetchReportKpi2_4_1, fetchReportKpi2_4_2, fetchReportKpi2_4_3 } from '../../api';
import { MONTHS } from '../../data/periodOptions';

// K-2.4.1 / 2.4.2 / 2.4.3 - DGS Entry and Exit of Candidates reports, laid out like the other
// K-2.x reports (FlaggingReport): centred title, As On date and period, then the brown table with
// search, copy and export. 2.4.2 / 2.4.3 also chart each type (as the old portal), above the table.
// Every figure is worked out by the backend from the saved entries.

// Brown theme shared by every DGS report (see FlaggingReport / GenericReportPage)
const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';
const ENTERED = 'No. of Candidates Entered the System i.e. Assessments done';
const EXITED = 'No. of Candidates Exited the System i.e. CoC Issued';
const MEANING = 'Entered = candidates who entered the system (assessments done); Exited = candidates who exited the system (CoC issued)';
const COLORS = { entered: 0x2f6fb5, exited: 0xe07b24 };
const num = (v) => Number(v || 0);
const fmt = (v) => num(v).toLocaleString('en-IN');
const today = () => new Date().toLocaleDateString('en-GB');

const centre = { headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center' };
const bold = (p) => (p.node?.rowPinned ? { fontWeight: 700 } : null);
// Report columns aren't filtered or sorted one by one (search covers it), so no header icons
const REPORT_COL_DEF = { sortable: false, filter: false, suppressHeaderMenuButton: true, suppressHeaderFilterButton: true, resizable: true };
const pickerCls = 'text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#4b2424] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer';

// Rows matching the search, numbered (sNo) in the order shown. Same rule as TableWithToolbar's own
// search (fields named like ids and sNo are skipped), so the totals follow exactly the rows shown.
function useSearch(rows) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = q
      ? rows.filter((r) => Object.entries(r).some(([k, v]) => !k.includes('id') && k !== 'sNo' && String(v ?? '').toLowerCase().includes(q)))
      : rows;
    return found.map((r, i) => ({ ...r, sNo: i + 1 }));
  }, [rows, query]);
  return [query, setQuery, shown];
}

// Leaf columns in order, for Copy
const leafColumns = (cols) => cols.flatMap((c) => (c.children ? leafColumns(c.children) : [c]));

function copyRows(columns, rows, notify, title) {
  if (!rows.length) { notify(COMMON_TOASTS.nothingToCopy()); return; }
  const leaves = leafColumns(columns);
  const tsv = [leaves.map((c) => c.headerName), ...rows.map((r) => leaves.map((c) => r?.[c.field] ?? ''))]
    .map((line) => line.join('\t')).join('\n');
  navigator.clipboard.writeText(tsv).then(
    () => notify(COMMON_TOASTS.copySuccess(rows.length, title)),
    () => notify(COMMON_TOASTS.copyFailed()),
  );
}

// Title, As On date and period, centred as in the other K-2.x reports
function ReportHeading({ title, period }) {
  return (
    <div className="flex flex-col items-center text-center space-y-1 pt-2 flex-shrink-0">
      <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{title}</h2>
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        As On date: <span className="underline">{today()}</span>
      </div>
      {period && <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">({period})</div>}
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{MEANING}.</div>
    </div>
  );
}

// Clustered columns, Entered vs Exited, one chart per type
function EntryExitChart({ title, data, categoryField, onRoot, sideways = false }) {
  const divRef = useRef(null);
  const dark = useIsDark();
  useLayoutEffect(() => {
    if (!divRef.current || !data.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    root.setThemes([am5themes_Animated.new(root)]);
    root.container.children.push(am5.Label.new(root, {
      text: title, fontSize: 13, fontWeight: '700', fill: am5.color(c.text), x: am5.p50, centerX: am5.p50, paddingBottom: 6,
    }));
    const chart = root.container.children.push(am5xy.XYChart.new(root, {
      panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingTop: 30, paddingRight: 10,
    }));
    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 10, cellStartLocation: 0.1, cellEndLocation: 0.9 });
    xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.muted), ...(sideways ? { rotation: -45, centerY: am5.p50, centerX: am5.p100 } : {}) });
    xRenderer.grid.template.setAll({ stroke: am5.color(c.grid) });
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField, renderer: xRenderer }));
    xAxis.data.setAll(data);
    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color(c.muted) });
    yRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [4, 4] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: sideways ? 0.3 : 0.15 }));

    [['entered', 'Candidates Entered (Assessments done)'], ['exited', 'Candidates Exited (CoC Issued)']].forEach(([field, name]) => {
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name, xAxis, yAxis, valueYField: field, categoryXField: categoryField,
        tooltip: am5.Tooltip.new(root, { labelText: `${name}: [bold]{valueY}[/]` }),
      }));
      series.columns.template.setAll({ fill: am5.color(COLORS[field]), stroke: am5.color(COLORS[field]), cornerRadiusTL: 3, cornerRadiusTR: 3, width: am5.percent(90) });
      // The number above each bar; turned on its side where the bars are narrow
      series.bullets.push(() => am5.Bullet.new(root, {
        locationY: 1,
        sprite: am5.Label.new(root, sideways
          ? { text: '{valueY}', populateText: true, fontSize: 9, fontWeight: '700', fill: am5.color(c.value), rotation: -90, centerX: am5.p0, centerY: am5.p50, dy: -4 }
          : { text: '{valueY}', populateText: true, fontSize: 10, fontWeight: '700', fill: am5.color(c.value), centerX: am5.p50, centerY: am5.p100, dy: -3 }),
      }));
      series.data.setAll(data);
    });

    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50, marginTop: 10 }));
    legend.labels.template.setAll({ fontSize: 11, fill: am5.color(c.muted) });
    legend.data.setAll(chart.series.values);
    chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none', xAxis }));
    // Numbers that would land on one another are moved apart
    keepValueLabelsApart(root, chart);
    chart.appear(600, 100);
    onRoot(root);
    return () => { onRoot(null); root.dispose(); };
  }, [title, data, categoryField, sideways, dark, onRoot]);
  return <div ref={divRef} style={{ width: '100%', height: 360 }} />;
}

// Chart roots by key, for the PDF
function useChartRoots() {
  const [roots, setRoots] = useState({});
  const setters = useMemo(() => {
    const make = (key) => (root) => setRoots((prev) => (prev[key] === root ? prev : { ...prev, [key]: root }));
    return { a: make('a'), b: make('b') };
  }, []);
  return [roots, setters];
}

// Flat (merged layout): the right pane has a fixed height; the abstract's table fills it and
// scrolls inside, the trend reports (charts + table) scroll as a whole.
const outerClass = (flat, scrollAll) => {
  if (!flat) return 'module-card space-y-4';
  return scrollAll ? 'flex-1 min-h-0 h-full overflow-y-auto space-y-3 pr-1' : 'flex flex-col flex-1 min-h-0 h-full space-y-3';
};

/* ---------------- K-2.4.1 Abstract ---------------- */
export function EntryExitAbstractReport({ code = 'K-2.4.1', triggerNotification, flat = false }) {
  const notify = useNotifier(triggerNotification);
  const [period, setPeriod] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState(null); // { year, month } chosen by the user; null = latest month
  const [query, setQuery, shown] = useSearch(rows);

  useEffect(() => {
    let cancelled = false;
    fetchReportKpi2_4_1(pick || {})
      .then((res) => { if (!cancelled) { setPeriod(res.data?.period || null); setRows(res.data?.rowData || []); } })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading K-2.4.1 report:', err);
        notify(COMMON_TOASTS.loadFailed('Entry and Exit of Candidates'));
        setRows([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pick, notify]);

  const title = `Form No. ${code} - Abstract - Entry and Exit of Candidates`;
  const periodText = period ? `Report for the Month - ${period.monthLabel}` : '';

  const columns = useMemo(() => {
    const pair = (prefix) => [
      { headerName: 'Entered', headerTooltip: ENTERED, field: `${prefix}_entered`, minWidth: 100, flex: 1, ...centre, valueFormatter: (p) => fmt(p.value), cellStyle: bold },
      { headerName: 'Exited', headerTooltip: EXITED, field: `${prefix}_exited`, minWidth: 100, flex: 1, ...centre, valueFormatter: (p) => fmt(p.value), cellStyle: bold },
    ];
    const p = period || {};
    return [
      { headerName: 'S.No', field: 'sNo', cellDataType: false, minWidth: 70, maxWidth: 90, pinned: 'left', ...centre },
      { headerName: 'Grade', field: 'grade_name', minWidth: 190, pinned: 'left', wrapText: true, autoHeight: true, ...centre, cellStyle: bold },
      { headerName: 'Type', field: 'type_name', minWidth: 110, ...centre },
      { headerName: `During the Previous FY (${p.previousFy ?? '-'})`, headerClass: 'text-center', children: pair('prev') },
      { headerName: p.uptoLabel ? `During the Current FY-upto ${p.uptoLabel}` : `During the Current FY (${p.currentFy ?? '-'}) - before ${p.monthLabel ?? '-'}`, headerClass: 'text-center', children: pair('upto') },
      { headerName: `During the Month (${p.monthLabel ?? '-'})`, headerClass: 'text-center', children: pair('month') },
      { headerName: `Total for the Current FY upto ${p.totalLabel ?? '-'}`, headerClass: 'text-center', children: pair('total') },
    ];
  }, [period]);

  // Totals of the rows shown: per type, then all
  const pinned = useMemo(() => {
    const fields = ['prev', 'upto', 'month', 'total'].flatMap((k) => [`${k}_entered`, `${k}_exited`]);
    const sum = (list, label) => fields.reduce((acc, f) => ({ ...acc, [f]: list.reduce((s, r) => s + num(r[f]), 0) }), { sNo: '', type_name: '', grade_name: label });
    const typeNames = [...new Set(shown.map((r) => r.type_name))];
    return [...typeNames.map((t) => sum(shown.filter((r) => r.type_name === t), `${t} Total`)), ...(typeNames.length > 1 ? [sum(shown, 'Grand Total')] : [])];
  }, [shown]);

  // The months the picker offers: the current one back to January 2010
  const monthChoices = useMemo(() => {
    const now = new Date();
    const out = [];
    for (let y = now.getFullYear(); y >= 2010; y--) {
      for (let m = (y === now.getFullYear() ? now.getMonth() + 1 : 12); m >= 1; m--) out.push({ value: `${y}-${m}`, label: `${MONTHS[m - 1].label} ${y}` });
    }
    return out;
  }, []);

  const fileName = `DGS_${code.replace(/\./g, '_')}_Entry_Exit_Abstract`;
  const fileSubtitle = `${periodText}. ${MEANING}.`;
  const exportable = (fn) => () => (shown.length ? fn() : notify(COMMON_TOASTS.nothingToExport()));
  return (
    <div className={outerClass(flat, false)}>
      <ReportHeading title={title} period={periodText} />
      <div className={flat ? 'flex-1 min-h-0 flex flex-col' : ''}>
        <TableWithToolbar
          rowData={shown}
          columnDefs={columns}
          loading={loading}
          color={BROWN}
          hoverColor={BROWN_HOVER}
          searchPlaceholder="Search grade or type..."
          searchTerm={query}
          onSearchChange={setQuery}
          exportFileName={fileName}
          pagination={false}
          defaultColDef={REPORT_COL_DEF}
          pinnedBottomRowData={pinned}
          headerHeight={46}
          fillHeight={flat}
          triggerNotification={triggerNotification}
          extraLeftToolbarContent={(
            <select
              className={pickerCls} aria-label="Report month"
              value={period ? `${period.year}-${period.month}` : ''}
              onChange={(e) => { const [year, month] = e.target.value.split('-').map(Number); setPick({ year, month }); }}
            >
              {monthChoices.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          )}
          onCopy={() => copyRows(columns, [...shown, ...pinned], notify, title)}
          onExportExcel={exportable(() => notify(COMMON_TOASTS.excelExported(exportGridToExcel({ title, subtitle: fileSubtitle, columns, rows: shown, pinnedRows: pinned, fileName }), 'The report')))}
          onExportPdf={exportable(() => notify(COMMON_TOASTS.excelExported(exportGridToPdf({ title, subtitle: fileSubtitle, columns, rows: shown, pinnedRows: pinned, fileName, brand: BROWN }), 'The report')))}
        />
      </div>
    </div>
  );
}

// One chart per type for the trend reports: each period's entered and exited
function useTypeCharts(rows, periods, categoryKey) {
  return useMemo(() => {
    const typeNames = [...new Set(rows.map((r) => r.type_name))];
    return typeNames.map((t) => {
      const en = rows.find((r) => r.type_name === t && r.measure === 'entered') || {};
      const ex = rows.find((r) => r.type_name === t && r.measure === 'exited') || {};
      return { type: t, data: periods.map((p) => ({ [categoryKey]: p.label, entered: num(en[p.field]), exited: num(ex[p.field]) })) };
    });
  }, [rows, periods, categoryKey]);
}

const NO_COLUMNS = [];

function TrendReport({ title, period, data, loading, periods, extraColumns = NO_COLUMNS, categoryKey, sideways, controls, fileName, triggerNotification, flat }) {
  const notify = useNotifier(triggerNotification);
  const [roots, setRoot] = useChartRoots();
  const reportRows = useMemo(() => data?.rowData || [], [data]);
  const [query, setQuery, shown] = useSearch(reportRows);
  const charts = useTypeCharts(reportRows, periods, categoryKey);

  const columns = useMemo(() => [
    { headerName: 'S.No', field: 'sNo', cellDataType: false, minWidth: 70, maxWidth: 90, pinned: 'left', ...centre },
    { headerName: 'Type', field: 'type_name', minWidth: 100, pinned: 'left', ...centre },
    { headerName: 'Category', field: 'category', minWidth: 190, pinned: 'left', wrapText: true, autoHeight: true, ...centre },
    ...periods.map((p) => ({ headerName: p.label, field: p.field, minWidth: 108, flex: 1, ...centre, valueFormatter: (x) => fmt(x.value) })),
    ...extraColumns,
  ], [periods, extraColumns]);

  const exportable = (fn) => () => (shown.length ? fn() : notify(COMMON_TOASTS.nothingToExport()));
  return (
    <div className={outerClass(flat, true)}>
      <ReportHeading title={title} period={period} />
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {charts.map((c, i) => (
          <EntryExitChart key={c.type} title={`${title.includes('Monthly') ? 'Monthly' : 'Yearly'} Trend - ${c.type} Candidates Entered vs Exited`}
            data={c.data} categoryField={categoryKey} sideways={sideways} onRoot={i === 0 ? setRoot.a : setRoot.b} />
        ))}
      </div>
      <TableWithToolbar
        rowData={shown}
        columnDefs={columns}
        loading={loading}
        color={BROWN}
        hoverColor={BROWN_HOVER}
        searchPlaceholder="Search type or category..."
        searchTerm={query}
        onSearchChange={setQuery}
        exportFileName={fileName}
        pagination={false}
        defaultColDef={REPORT_COL_DEF}
        domLayout="autoHeight"
        headerHeight={46}
        triggerNotification={triggerNotification}
        extraLeftToolbarContent={controls}
        onCopy={() => copyRows(columns, shown, notify, title)}
        onExportExcel={exportable(() => notify(COMMON_TOASTS.excelExported(exportGridToExcel({ title, subtitle: period, columns, rows: shown, fileName }), 'The report')))}
        onExportPdf={exportable(() => exportReportToPdf({ title: period ? `${title} (${period})` : title, chartRoots: [roots.a, roots.b], columnDefs: leafColumns(columns), rowData: shown, fileName })
          .then((file) => notify(COMMON_TOASTS.excelExported(file, 'The report')))
          .catch(() => notify(COMMON_TOASTS.exportFailed())))}
      />
    </div>
  );
}

/* ---------------- K-2.4.2 Monthly trends ---------------- */
const TOTAL_COLUMN = [{ headerName: 'Total', field: 'total', minWidth: 100, ...centre, valueFormatter: (p) => fmt(p.value), cellStyle: { fontWeight: 700 } }];

export function EntryExitMonthlyReport({ code = 'K-2.4.2', triggerNotification, flat = false }) {
  const notify = useNotifier(triggerNotification);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fy, setFy] = useState(null); // start year chosen by the user; null = latest

  useEffect(() => {
    let cancelled = false;
    fetchReportKpi2_4_2(fy ? { fy } : {})
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading K-2.4.2 report:', err);
        notify(COMMON_TOASTS.loadFailed('Entry and Exit Monthly Trends'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fy, notify]);

  const months = useMemo(() => data?.months || [], [data]);
  const period = data?.period;
  return (
    <TrendReport
      title={`Form No. ${code} - Entry and Exit Monthly Trends`}
      period={period ? `Financial Year ${period.fy}` : ''}
      data={data}
      loading={loading}
      periods={months}
      extraColumns={TOTAL_COLUMN}
      categoryKey="month"
      sideways
      fileName={`DGS_${code.replace(/\./g, '_')}_Entry_Exit_Monthly_Trends`}
      triggerNotification={triggerNotification}
      flat={flat}
      controls={(
        <select className={pickerCls} aria-label="Financial year" value={period?.fyStart ?? ''} onChange={(e) => setFy(Number(e.target.value))}>
          {(period?.financialYears || []).slice().reverse().map((y) => <option key={y.value} value={y.value}>FY {y.label}</option>)}
          {period && !period.financialYears.some((y) => y.value === period.fyStart) && <option value={period.fyStart}>FY {period.fy}</option>}
        </select>
      )}
    />
  );
}

/* ---------------- K-2.4.3 Yearly trends ---------------- */
export function EntryExitYearlyReport({ code = 'K-2.4.3', triggerNotification, flat = false }) {
  const notify = useNotifier(triggerNotification);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchReportKpi2_4_3()
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading K-2.4.3 report:', err);
        notify(COMMON_TOASTS.loadFailed('Entry and Exit Yearly Trends'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notify]);

  const years = useMemo(() => data?.columns || [], [data]);
  return (
    <TrendReport
      title={`Form No. ${code} - Abstract - Entry and Exit Yearly Trends`}
      period={years.length ? `${years[0].label} to ${years[years.length - 1].label}` : ''}
      data={data}
      loading={loading}
      periods={years}
      categoryKey="year"
      fileName={`DGS_${code.replace(/\./g, '_')}_Entry_Exit_Yearly_Trends`}
      triggerNotification={triggerNotification}
      flat={flat}
    />
  );
}
