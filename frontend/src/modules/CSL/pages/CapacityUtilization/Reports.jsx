import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchCapacityUtilizationReport } from '../../api';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import ChartExportMenu from '../../../../components/ChartExportMenu';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';

export default function CapacityUtilizationReports() {
  const gridRef = useRef(null);
  const chartDivRef = useRef(null);
  const chartRootRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const [chartRoot, setChartRoot] = useState(null);

  const title = 'Form No. K-4.4 - Abstract - CSL Capacity Utilization';

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchCapacityUtilizationReport()
      .then((res) => {
        const data = res.data?.rowData || res.data || [];
        const cols = res.data?.columnDefs || [];
        if (!data.length) { setRowData([]); setColumnDefs([]); setChartData([]); return; }

        const yearCols = cols.length
          ? cols.filter((c) => c.field !== 'Metric').map((c) => c.field)
          : Object.keys(data[0]).filter((k) => k !== 'Metric');

        const capacityRow = data.find((r) => r.Metric === 'Total Shipbuilding Capacity(GT/year)') || {};
        const tonnageRow = data.find((r) => r.Metric === 'Tonnage of vessels(GT)') || {};

        setChartData(yearCols.map((yr) => ({
          year: yr,
          capacity: Number(capacityRow[yr] || 0),
          tonnage: Number(tonnageRow[yr] || 0),
        })));

        const gridCols = cols.length ? cols.map((c) => ({
          ...c,
          cellClass: c.field === 'Metric'
            ? 'font-bold text-slate-800 dark:text-slate-100 flex items-center border-r border-slate-200 dark:border-slate-700'
            : 'text-center font-semibold flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
        })) : [
          { field: 'Metric', headerName: 'Metric', pinned: 'left', minWidth: 320, cellClass: 'font-bold text-slate-800 dark:text-slate-100 flex items-center border-r border-slate-200 dark:border-slate-700' },
          ...yearCols.map((yr) => ({
            field: yr, headerName: yr, minWidth: 110,
            cellClass: 'text-center font-semibold flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
          })),
        ];
        setColumnDefs(gridCols);
        setRowData(data);
      })
      .catch((err) => {
        console.error('Error loading Capacity Utilization report:', err);
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
      am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingTop: 10, paddingBottom: 0, paddingRight: 45, paddingLeft: 10 })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30, cellStartLocation: 0.1, cellEndLocation: 0.9 });
    xRenderer.labels.template.setAll({ rotation: -45, centerY: am5.p50, centerX: am5.p100, fontSize: 11, fill: am5.color(0x64748b) });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1 });

    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'year', renderer: xRenderer }));
    xAxis.data.setAll(chartData);

    const yRendererLeft = am5xy.AxisRendererY.new(root, {});
    yRendererLeft.labels.template.setAll({ fontSize: 11, fill: am5.color(0x64748b) });
    yRendererLeft.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1, strokeDasharray: [4, 4] });
    const yAxisLeft = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRendererLeft, min: 0, extraMax: 0.2 }));

    const yRendererRight = am5xy.AxisRendererY.new(root, { opposite: true });
    yRendererRight.labels.template.setAll({ fontSize: 11, fill: am5.color(0xe85d04), paddingRight: 8 });
    const yAxisRight = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRendererRight, min: 0, extraMax: 0.4 }));

    // TOTAL SHIPBUILDING CAPACITY -- bars, left axis
    const capacitySeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Total Shipbuilding Capacity (GT/Year)', xAxis, yAxis: yAxisLeft,
        valueYField: 'capacity', categoryXField: 'year',
        tooltip: am5.Tooltip.new(root, { labelText: 'Total Shipbuilding Capacity (GT/Year): [bold]{valueY}[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    capacitySeries.columns.template.setAll({ fill: am5.color(0x87ceeb), stroke: am5.color(0x87ceeb), cornerRadiusTL: 3, cornerRadiusTR: 3, width: am5.percent(70) });
    capacitySeries.columns.template.states.create('hover', { fill: am5.color(0x5ba3d0) });
    capacitySeries.bullets.push((root) => {
      const label = am5.Label.new(root, { fill: am5.color(0x1e293b), centerX: am5.p50, centerY: am5.p100, dy: -8, fontSize: 10, fontWeight: '700', populateText: true, text: '{valueY}' });
      return am5.Bullet.new(root, { sprite: label });
    });
    capacitySeries.data.setAll(chartData);

    // TONNAGE OF VESSELS -- line, right axis (different scale than capacity)
    const tonnageSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Tonnage Of Vessels Built (GT)', xAxis, yAxis: yAxisRight,
        valueYField: 'tonnage', categoryXField: 'year',
        stroke: am5.color(0xe85d04), fill: am5.color(0xe85d04),
        tooltip: am5.Tooltip.new(root, { labelText: 'Tonnage Of Vessels Built (GT): [bold]{valueY}[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    tonnageSeries.strokes.template.setAll({ strokeWidth: 2, stroke: am5.color(0xe85d04) });
    tonnageSeries.bullets.push(() => am5.Bullet.new(root, {
      sprite: am5.Circle.new(root, { radius: 5, fill: am5.color(0xe85d04), stroke: am5.color(0xffffff), strokeWidth: 2 })
    }));
    tonnageSeries.bullets.push((root) => {
      const label = am5.Label.new(root, { fill: am5.color(0xe85d04), centerX: am5.p50, centerY: am5.p0, dy: -26, fontSize: 10, fontWeight: '700', populateText: true, text: '{valueY}' });
      return am5.Bullet.new(root, { sprite: label });
    });
    tonnageSeries.data.setAll(chartData);

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
    if (type === 'Excel' && gridRef.current?.api) gridRef.current.api.exportDataAsCsv({ fileName: 'csl_capacity_utilization_report.csv' });
    else if (type === 'PDF') {
      exportReportToPdf({
        title,
        chartRoots: [chartRoot],
        columnDefs,
        rowData,
        fileName: 'csl_capacity_utilization_report',
      });
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 rounded-t-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">CSL - Capacity Utilization Report</span>
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
          <ChartExportMenu chartRoot={chartRoot} fileName="csl_capacity_utilization_chart" />
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm font-semibold text-red-500 dark:text-red-400">{error}</div>
      ) : (
        <>
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div ref={chartDivRef} style={{ width: '100%', height: '380px' }} />
          </div>
          <div className="ag-theme-quartz csl-capacityutilization-report-grid mt-4" style={{ width: '100%' }}>
            <Table ref={gridRef} theme="legacy" rowData={rowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" rowHeight={48} headerHeight={42} suppressColumnVirtualisation={true} animateRows={true} enableExport={false} color="#4b2424" />
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .csl-capacityutilization-report-grid.ag-theme-quartz { --ag-font-family: 'Inter', system-ui, sans-serif; --ag-row-height: 48px; --ag-active-color: #4b2424; }
        .csl-capacityutilization-report-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
        .csl-capacityutilization-report-grid .ag-header { background: #4b2424 !important; border-bottom: 2px solid #3a1a1a !important; }
        .csl-capacityutilization-report-grid .ag-header-cell { color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border-right: 1px solid rgba(255,255,255,0.15) !important; }
        .csl-capacityutilization-report-grid .ag-header-cell-label { justify-content: center !important; }
        .csl-capacityutilization-report-grid .ag-row-even { background: #ffffff !important; }
        .csl-capacityutilization-report-grid .ag-row-odd { background: #f8faf6 !important; }
        .csl-capacityutilization-report-grid .ag-cell { border-right: 1px solid #D3D6D9 !important; }
        .dark .csl-capacityutilization-report-grid .ag-header { background: #0f172a !important; }
        .dark .csl-capacityutilization-report-grid .ag-row-even { background: #090d16 !important; }
        .dark .csl-capacityutilization-report-grid .ag-row-odd { background: #0f172a !important; }
        .dark .csl-capacityutilization-report-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
      `}} />
    </div>
  );
}
