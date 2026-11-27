import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import TableWithToolbar from '../../../components/TableWithToolbar';
import RestrictedAccess from '../../../components/RestrictedAccess';
import { useKPIDGSPermissions } from '../hooks/useKPIDGSPermissions';
import ChartExportMenu from '../../../components/ChartExportMenu';
import { newChartRoot } from '../../../utils/amCharts';
import { exportGridToExcel, exportGridToPdf } from '../../../utils/exportGridReport';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';
import {
  currentFinancialYear, examAsOnDate, monthlyTrendChartData, yearlyTrendChartData,
} from '../utils/examReport';

const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';

// Chart titles, series names and colours as on the earlier portal pages
const KINDS = {
  monthly: {
    chartTitle: 'Monthly Trend Analysis – Exams Conducted',
    series: ['Total Exams Conducted - Nautical', 'Total Exams Conducted - Engineering'],
    toChartData: monthlyTrendChartData,
    showYear: true,
  },
  yearly: {
    chartTitle: 'Yearly Trend Analysis – Exams Conducted (Nautical vs Engineering)',
    series: ['Nautical Exams', 'Engineering Exams'],
    toChartData: yearlyTrendChartData,
    showYear: false,
  },
};
const NAUTICAL_COLOR = 0x4fcd58;
const ENGINEERING_COLOR = 0x5ba3d5;

const style = (d) => ({
  ...d,
  headerClass: 'text-center',
  minWidth: d.field === 'Category' ? 260 : 120,
  cellClass: d.field === 'Category'
    ? 'font-semibold flex items-center'
    : 'text-center flex items-center justify-center',
  wrapText: true,
  autoHeight: true,
});

// K-2.3.2 Exam Performance Monthly Trends (current FY) and K-2.3.3 Yearly Trends.
// Backend sends two rows (Nautical / Engineering) with one column per month or per FY; the page
// shows them as a column chart and as a table, like the earlier portal.
function ExamTrendReportContent({
  code, title, fetchFn, triggerNotification, flat = false, kind = 'monthly', filenameSuffix = 'Exam_Trends',
}) {
  const cfg = KINDS[kind] || KINDS.monthly;
  const notify = useNotifier(triggerNotification);
  const [rows, setRows] = useState([]);
  const [serverCols, setServerCols] = useState([]);
  // Each report mounts afresh when opened, so it starts out loading
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState('');
  const chartDivRef = useRef(null);
  const [chartRoot, setChartRoot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchFn()
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data?.rowData) ? res.data.rowData : []);
        setServerCols(Array.isArray(res?.data?.columnDefs) ? res.data.columnDefs : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setServerCols([]);
        // 404 = nothing entered yet; the backend says so in `error`
        if (err?.response?.status === 404) {
          setEmptyMessage(err.response.data?.error || 'No data available');
          return;
        }
        console.error(`Error loading report ${code}:`, err);
        notify(COMMON_TOASTS.loadFailed(title));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchFn, code, title, notify]);

  const chartData = useMemo(() => cfg.toChartData(rows), [cfg, rows]);

  useLayoutEffect(() => {
    if (!chartDivRef.current || !rows.length) return undefined;
    const root = newChartRoot(chartDivRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(am5xy.XYChart.new(root, {
      panX: false, panY: false, wheelX: 'none', wheelY: 'none',
      layout: root.verticalLayout, paddingTop: 10, paddingRight: 10, paddingLeft: 0,
    }));

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 20, cellStartLocation: 0.15, cellEndLocation: 0.85 });
    xRenderer.labels.template.setAll({ rotation: -45, centerY: am5.p50, centerX: am5.p100, fontSize: 11, fill: am5.color(0x64748b) });
    xRenderer.grid.template.setAll({ strokeOpacity: 0.3 });
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'category', renderer: xRenderer }));
    xAxis.data.setAll(chartData);

    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 11, fill: am5.color(0x64748b) });
    yRenderer.grid.template.setAll({ strokeOpacity: 0.3, strokeDasharray: [4, 4] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: 0.15 }));

    const addSeries = (name, field, color) => {
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name, xAxis, yAxis, valueYField: field, categoryXField: 'category',
        tooltip: am5.Tooltip.new(root, { pointerOrientation: 'horizontal', labelText: '{name}: [bold]{valueY}[/]' }),
      }));
      series.columns.template.setAll({
        width: am5.percent(90), fill: am5.color(color), stroke: am5.color(color),
        cornerRadiusTL: 3, cornerRadiusTR: 3, tooltipY: am5.percent(10),
      });
      // Value on top of the column, only when above 0 (as before)
      series.bullets.push((r, s, dataItem) => (dataItem.get('valueY') > 0
        ? am5.Bullet.new(r, {
          locationY: 1,
          sprite: am5.Label.new(r, {
            text: '{valueY}', populateText: true, centerX: am5.p50, centerY: am5.p100,
            dy: -2, fontSize: 10, fontWeight: '700', fill: am5.color(0x1e293b),
          }),
        })
        : undefined));
      series.data.setAll(chartData);
      series.appear(800);
    };
    addSeries(cfg.series[0], 'nautical', NAUTICAL_COLOR);
    addSeries(cfg.series[1], 'engineering', ENGINEERING_COLOR);

    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50, marginTop: 10 }));
    legend.labels.template.setAll({ fontSize: 12, fontWeight: '500', fill: am5.color(0x475569) });
    legend.data.setAll(chart.series.values);

    chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none', xAxis }));
    chart.appear(800, 100);
    setChartRoot(root);

    return () => { root.dispose(); setChartRoot(null); };
  }, [chartData, rows.length, cfg]);

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      minWidth: 70, maxWidth: 90, pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
    },
    ...serverCols.map(style),
  ], [serverCols]);

  const fileBase = `DGS_${code.replace(/\./g, '_')}_${filenameSuffix}`;
  const fullTitle = `Form No. ${code} - ${title}`;
  const asOn = examAsOnDate();
  const fy = currentFinancialYear();
  const subtitle = cfg.showYear
    ? `As on date: ${asOn} | Report for the Year - ${fy}`
    : `As on date: ${asOn}`;

  const exportColumns = useMemo(
    () => [{ headerName: 'S.No', field: '_sno' }, ...serverCols],
    [serverCols],
  );
  const exportRows = () => rows.map((r, i) => ({ ...r, _sno: i + 1 }));

  const handleCopy = () => {
    if (!rows.length) { notify(COMMON_TOASTS.nothingToCopy()); return; }
    const lines = exportRows().map((r) => exportColumns.map((c) => r[c.field] ?? '').join('\t'));
    navigator.clipboard.writeText([exportColumns.map((c) => c.headerName).join('\t'), ...lines].join('\n'))
      .then(() => notify(COMMON_TOASTS.copySuccess(rows.length, 'from the report')))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };

  const download = (type) => {
    if (!rows.length) { notify(COMMON_TOASTS.nothingToExport()); return; }
    try {
      const options = { title: fullTitle, subtitle, columns: exportColumns, rows: exportRows(), fileName: fileBase };
      const file = type === 'pdf'
        ? exportGridToPdf({ ...options, brand: BROWN })
        : exportGridToExcel(options);
      notify(COMMON_TOASTS.excelExported(file, 'The report'));
    } catch (err) {
      console.error(`Error exporting ${code}:`, err);
      notify(COMMON_TOASTS.exportFailed());
    }
  };

  return (
    <div className={flat ? 'flex flex-col space-y-3' : 'module-card space-y-4'}>
      <div className="flex flex-col items-center text-center pt-2 flex-shrink-0">
        <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{fullTitle}</h2>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>
            As on date: <strong className="text-[#4b2424] dark:text-blue-400">{asOn}</strong>
          </span>
          {cfg.showYear && (
            <>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>
                Report for the year — <strong className="text-[#4b2424] dark:text-blue-400">{fy}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-[#4b2424] dark:text-blue-400">{cfg.chartTitle}</h3>
          <ChartExportMenu chartRoot={chartRoot} fileName={`${fileBase}_chart`} color={BROWN} />
        </div>
        {rows.length ? (
          <div ref={chartDivRef} className="px-2 py-3" style={{ width: '100%', height: 420 }} />
        ) : (
          <div className="py-16 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {loading ? 'Loading chart…' : (emptyMessage || 'No data available')}
          </div>
        )}
      </div>

      <TableWithToolbar
        rowData={rows}
        columnDefs={colDefs}
        loading={loading}
        color={BROWN}
        hoverColor={BROWN_HOVER}
        searchPlaceholder="Search records..."
        exportFileName={fileBase}
        pagination={false}
        onCopy={handleCopy}
        onExportExcel={() => download('excel')}
        onExportPdf={() => download('pdf')}
        headerHeight={46}
        triggerNotification={triggerNotification}
      />
    </div>
  );
}

// K-2.3 reports need KPI_DGS read (the backend checks the same); without it nothing is fetched
export default function ExamTrendReport(props) {
  const { canView } = useKPIDGSPermissions();
  if (!canView) return <RestrictedAccess moduleName={`Form No. ${props.code}`} />;
  return <ExamTrendReportContent {...props} />;
}
