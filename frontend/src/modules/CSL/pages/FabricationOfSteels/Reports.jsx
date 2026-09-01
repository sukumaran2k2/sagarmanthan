import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchFabricationOfSteelsReport } from '../../api';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import ChartExportMenu from '../../../../components/ChartExportMenu';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';

// The backend groups by (Financial Year, Month) and the legacy site's own
// chart uses Month alone as the x-axis category (confirmed from
// cslreports4_5.html) -- replicated faithfully here, even though rows from
// different years sharing the same month will share a category on the axis.
export default function FabricationOfSteelsReports() {
  const gridRef = useRef(null);
  const chartDivRef = useRef(null);
  const chartRootRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const [chartRoot, setChartRoot] = useState(null);

  const title = 'Form No. K-4.5 - Abstract - CSL Fabrication of Steels';

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchFabricationOfSteelsReport()
      .then((res) => {
        const data = res.data?.rowData || [];
        const cols = res.data?.columnDefs || [];
        if (!data.length) { setRowData([]); setColumnDefs([]); setChartData([]); return; }

        // Financial year runs April -> March; month values include the
        // legacy site's own typos ("Febraury", "Jully", "Auguet") since
        // that's what's actually stored. Ordered here to sort chart
        // categories chronologically within each financial year.
        const MONTH_ORDER = {
          April: 1, May: 2, June: 3, Jully: 4, Auguet: 5, September: 6,
          October: 7, November: 8, December: 9, January: 10, Febraury: 11, March: 12,
        };

        const transformed = data.map((item) => {
          const startYear = String(item['Financial Year']).split('-')[0];
          const shortYear = String(item['Financial Year']).split('-')[1]?.slice(-2) || '';
          return {
            month: `${item['Month'] || '—'} FY ${startYear}-${shortYear}`,
            target: Number(item['Fabrication of steels Target'] || 0),
            actual: Number(item['Fabrication of steels Actual'] || 0),
            sortKey: `${item['Financial Year']}-${String(MONTH_ORDER[item['Month']] ?? 99).padStart(2, '0')}`,
          };
        });
        transformed.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        setChartData(transformed);

        const gridCols = cols.length ? cols.map((c) => ({
          ...c,
          cellClass: 'text-center font-semibold flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
        })) : [];
        setColumnDefs(gridCols);
        setRowData(data);
      })
      .catch((err) => {
        console.error('Error loading Fabrication of Steels report:', err);
        setError('Failed to load report data.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useLayoutEffect(() => {
    if (!chartDivRef.current || !chartData.length) return;
    if (chartRootRef.current) chartRootRef.current.dispose();

    const root = am5.Root.new(chartDivRef.current);
    chartRootRef.current = root;
    setChartRoot(root);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingTop: 10, paddingBottom: 0, paddingRight: 20, paddingLeft: 10 })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 50, cellStartLocation: 0.1, cellEndLocation: 0.9 });
    xRenderer.labels.template.setAll({ rotation: -45, centerY: am5.p50, centerX: am5.p100, fontSize: 10, fill: am5.color(0x64748b) });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1 });

    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'month', renderer: xRenderer }));
    xAxis.data.setAll(chartData);

    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 11, fill: am5.color(0x64748b) });
    yRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1, strokeDasharray: [4, 4] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: 0.35 }));

    const targetSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Fabrication of Steel (In Tons) - Target', xAxis, yAxis,
        valueYField: 'target', categoryXField: 'month',
        tooltip: am5.Tooltip.new(root, { labelText: 'Target: [bold]{valueY}[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    targetSeries.columns.template.setAll({ fill: am5.color(0x87ceeb), stroke: am5.color(0x87ceeb), cornerRadiusTL: 3, cornerRadiusTR: 3, width: am5.percent(70) });
    targetSeries.columns.template.states.create('hover', { fill: am5.color(0x5ba3d0) });
    targetSeries.bullets.push((root) => {
      const label = am5.Label.new(root, { fill: am5.color(0x1e293b), centerX: am5.p50, centerY: am5.p100, dy: -8, fontSize: 10, fontWeight: '700', populateText: true, text: '{valueY}' });
      return am5.Bullet.new(root, { sprite: label });
    });
    targetSeries.data.setAll(chartData);

    const actualSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Fabrication of Steel (In Tons) - Actual', xAxis, yAxis,
        valueYField: 'actual', categoryXField: 'month',
        stroke: am5.color(0x22c55e), fill: am5.color(0x22c55e),
        tooltip: am5.Tooltip.new(root, { labelText: 'Actual: [bold]{valueY}[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    actualSeries.strokes.template.setAll({ strokeWidth: 2, stroke: am5.color(0x22c55e) });
    actualSeries.bullets.push(() => am5.Bullet.new(root, {
      sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(0x22c55e), stroke: am5.color(0xffffff), strokeWidth: 2 })
    }));
    actualSeries.bullets.push((root) => {
      const label = am5.Label.new(root, { fill: am5.color(0x22c55e), centerX: am5.p50, centerY: am5.p0, dy: -26, fontSize: 10, fontWeight: '700', populateText: true, text: '{valueY}' });
      return am5.Bullet.new(root, { sprite: label });
    });
    actualSeries.data.setAll(chartData);

    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50, marginTop: 12 }));
    legend.labels.template.setAll({ fontSize: 12, fontWeight: '500', fill: am5.color(0x475569) });
    legend.data.setAll(chart.series.values);

    chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none', xAxis }));
    chart.appear(800, 100);

    return () => { root.dispose(); setChartRoot(null); };
  }, [chartData]);

  const defaultColDef = useMemo(() => ({
    sortable: true, resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  const handleCopy = () => {
    if (!rowData.length) return;
    let tsv = columnDefs.map((c) => c.headerName).join('\t') + '\n';
    rowData.forEach((row) => { tsv += columnDefs.map((c) => row[c.field] ?? '').join('\t') + '\n'; });
    navigator.clipboard.writeText(tsv);
  };

  const handleExport = (type) => {
    if (type === 'Excel' && gridRef.current?.api) gridRef.current.api.exportDataAsCsv({ fileName: 'csl_fabrication_of_steels_report.csv' });
    else if (type === 'PDF') {
      exportReportToPdf({
        title,
        chartRoots: [chartRoot],
        columnDefs,
        rowData,
        fileName: 'csl_fabrication_of_steels_report',
      });
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 rounded-t-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">CSL - Fabrication of Steels Report</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>As on date: <strong className="text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Report for the month — <strong className="text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong></span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 flex-wrap">
          <CopyButton onCopy={handleCopy} color="#4b2424" className="!rounded-xl !py-2 !px-4" />
          <ExportDropdown onExportExcel={() => handleExport('Excel')} onExportPdf={() => handleExport('PDF')} />
          <ChartExportMenu chartRoot={chartRoot} fileName="csl_fabrication_of_steels_chart" />
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm font-semibold text-red-500 dark:text-red-400">{error}</div>
      ) : (
        <>
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div ref={chartDivRef} style={{ width: '100%', height: '420px' }} />
          </div>
          <div className="ag-theme-quartz csl-fabrication-report-grid mt-4" style={{ width: '100%' }}>
            <Table ref={gridRef} theme="legacy" rowData={rowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" rowHeight={48} headerHeight={42} suppressColumnVirtualisation={true} animateRows={true} enableExport={false} color="#4b2424" />
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .csl-fabrication-report-grid.ag-theme-quartz { --ag-font-family: 'Inter', system-ui, sans-serif; --ag-row-height: 48px; --ag-active-color: #4b2424; }
        .csl-fabrication-report-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
        .csl-fabrication-report-grid .ag-header { background: #4b2424 !important; border-bottom: 2px solid #3a1a1a !important; }
        .csl-fabrication-report-grid .ag-header-cell { color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border-right: 1px solid rgba(255,255,255,0.15) !important; }
        .csl-fabrication-report-grid .ag-header-cell-label { justify-content: center !important; }
        .csl-fabrication-report-grid .ag-row-even { background: #ffffff !important; }
        .csl-fabrication-report-grid .ag-row-odd { background: #f8faf6 !important; }
        .csl-fabrication-report-grid .ag-cell { border-right: 1px solid #D3D6D9 !important; }
        .dark .csl-fabrication-report-grid .ag-header { background: #0f172a !important; }
        .dark .csl-fabrication-report-grid .ag-row-even { background: #090d16 !important; }
        .dark .csl-fabrication-report-grid .ag-row-odd { background: #0f172a !important; }
        .dark .csl-fabrication-report-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
      `}} />
    </div>
  );
}
