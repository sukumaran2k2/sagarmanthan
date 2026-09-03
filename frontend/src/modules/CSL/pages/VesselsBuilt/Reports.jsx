import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { TrendingUp, Search, X, BarChart3, List } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchVesselsBuiltReport } from '../../api';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import ChartExportMenu from '../../../../components/ChartExportMenu';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';

// Mirrors the legacy site's Form K-4.1 report chart exactly: Tonnage is
// plotted as the real bar series, but its bullet label shows the Vessel
// Count value instead of tonnage; a second, invisible "dummy" bar series
// exists purely so the legend shows "No. of Vessels Built" as its own
// entry. Value of Vessels (INR Cr.) is a line on a secondary right axis,
// since it's a different unit/scale than tonnage.
export default function VesselsBuiltReports() {
  const gridRef = useRef(null);
  const chartDivRef = useRef(null);
  const chartRootRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('chart');
  const [chartRoot, setChartRoot] = useState(null);

  const title = 'Form No. K-4.1 - Abstract - CSL Vessels Built';

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchVesselsBuiltReport()
      .then((res) => {
        const data = res.data?.rowData || res.data || [];
        const cols = res.data?.columnDefs || [];
        if (!data.length) { setRowData([]); setColumnDefs([]); setChartData([]); return; }

        const yearCols = cols.length
          ? cols.filter((c) => c.field !== 'Metric').map((c) => c.field)
          : Object.keys(data[0]).filter((k) => k !== 'Metric');

        const countRow = data.find((r) => r.Metric === 'No. of vessels built') || {};
        const tonnageRow = data.find((r) => r.Metric === 'Tonnage of vessels built(GT)') || {};
        const valueRow = data.find((r) => r.Metric === 'Value of vessels built(INR Cr.)') || {};

        setChartData(yearCols.map((yr) => ({
          year: yr,
          count: Number(countRow[yr] || 0),
          tonnage: Number(tonnageRow[yr] || 0),
          value: Number(valueRow[yr] || 0),
        })));

        const gridCols = cols.length ? cols.map((c) => ({
          ...c,
          cellClass: c.field === 'Metric'
            ? 'font-bold text-slate-800 dark:text-slate-100 flex items-center border-r border-slate-200 dark:border-slate-700'
            : 'text-center font-semibold flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
        })) : [
          { field: 'Metric', headerName: 'Metric', pinned: 'left', minWidth: 340, cellClass: 'font-bold text-slate-800 dark:text-slate-100 flex items-center border-r border-slate-200 dark:border-slate-700' },
          ...yearCols.map((yr) => ({
            field: yr, headerName: yr, minWidth: 110,
            cellClass: 'text-center font-semibold flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
          })),
        ];
        setColumnDefs(gridCols);
        setRowData(data);
      })
      .catch((err) => {
        console.error('Error loading Vessels Built report:', err);
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
    const yAxisLeft = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRendererLeft, extraMin: 0.05, extraMax: 0.15 }));

    const yRendererRight = am5xy.AxisRendererY.new(root, { opposite: true });
    yRendererRight.labels.template.setAll({ fontSize: 11, fill: am5.color(0xe85d04), paddingRight: 8 });
    const yAxisRight = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRendererRight, min: 0, max: 9600, strictMinMax: true }));

    // TONNAGE -- real bars, but the bullet label shows the vessel count
    const tonnageSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Tonnage of vessels built (GT)', xAxis, yAxis: yAxisLeft,
        valueYField: 'tonnage', categoryXField: 'year',
        tooltip: am5.Tooltip.new(root, { labelText: 'Tonnage of vessels built (GT): [bold]{valueY}[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    tonnageSeries.columns.template.setAll({ fill: am5.color(0x87ceeb), stroke: am5.color(0x87ceeb), cornerRadiusTL: 3, cornerRadiusTR: 3, width: am5.percent(80) });
    tonnageSeries.columns.template.states.create('hover', { fill: am5.color(0x5ba3d0) });
    tonnageSeries.bullets.push((root, series, dataItem) => {
      const label = am5.Label.new(root, {
        fill: am5.color(0x1e293b), centerX: am5.p50, centerY: am5.p100, dy: -8, fontSize: 11, fontWeight: '700',
        background: am5.RoundedRectangle.new(root, { fill: am5.color(0xffdb58), cornerRadiusTL: 5, cornerRadiusTR: 5, cornerRadiusBL: 5, cornerRadiusBR: 5, paddingLeft: 5, paddingRight: 5, paddingTop: 2, paddingBottom: 2 }),
        text: `${dataItem?.dataContext?.count ?? ''}`,
      });
      return am5.Bullet.new(root, { sprite: label, locationY: 1 });
    });
    tonnageSeries.data.setAll(chartData);

    // VALUE OF VESSELS -- line on the secondary (right) axis
    const valueSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Value of Vessels Built (INR Cr.)', xAxis, yAxis: yAxisRight,
        valueYField: 'value', categoryXField: 'year',
        stroke: am5.color(0xff4433), fill: am5.color(0xff4433),
        tooltip: am5.Tooltip.new(root, { labelText: 'Value of Vessels Built (INR Cr.): [bold]{valueY}[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    valueSeries.strokes.template.setAll({ strokeWidth: 2, stroke: am5.color(0xff4433) });
    valueSeries.bullets.push(() => am5.Bullet.new(root, {
      sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(0xff4433), stroke: am5.color(0xffffff), strokeWidth: 2 })
    }));
    valueSeries.bullets.push((root, series, dataItem) => {
      const label = am5.Label.new(root, { fill: am5.color(0xff4433), centerX: am5.p50, centerY: am5.p100, dy: -26, fontSize: 11, fontWeight: '700', populateText: true, text: '{valueY}' });
      return am5.Bullet.new(root, { sprite: label });
    });
    valueSeries.data.setAll(chartData);

    // Dummy series purely so "No. of Vessels Built" appears as its own
    // legend entry -- matches the legacy site's approach exactly, since
    // vessel count is shown as a label on the tonnage bars, not its own
    // plotted series.
    const dummyCountSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'No. of Vessels Built', xAxis, yAxis: yAxisLeft,
        valueYField: 'count', categoryXField: 'year',
        fill: am5.color(0xffd700), stroke: am5.color(0xffd700),
        visible: false,
      })
    );
    dummyCountSeries.data.setAll(chartData);

    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50, marginTop: 12 }));
    legend.labels.template.setAll({ fontSize: 12, fontWeight: '500', fill: am5.color(0x475569) });
    legend.data.setAll(chart.series.values);

    chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none', xAxis }));
    chart.appear(800, 100);

    return () => { root.dispose(); setChartRoot(null); };
  }, [chartData, viewMode]);

  const defaultColDef = useMemo(() => ({
    sortable: true, resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  const filteredRowData = useMemo(() => {
    if (!searchQuery.trim()) return rowData;
    const q = searchQuery.toLowerCase();
    return rowData.filter((row) => Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q)));
  }, [rowData, searchQuery]);

  const handleCopy = () => {
    if (!filteredRowData.length) return;
    let tsv = columnDefs.map((c) => c.headerName).join('\t') + '\n';
    filteredRowData.forEach((row) => { tsv += columnDefs.map((c) => row[c.field] ?? '').join('\t') + '\n'; });
    navigator.clipboard.writeText(tsv);
  };

  const handleExport = (type) => {
    if (type === 'Excel' && gridRef.current?.api) gridRef.current.api.exportDataAsCsv({ fileName: 'csl_vessels_built_report.csv' });
    else if (type === 'PDF') {
      exportReportToPdf({
        title,
        chartRoots: [chartRoot],
        columnDefs,
        rowData: filteredRowData,
        fileName: 'csl_vessels_built_report',
      });
    }
  };

  return (
    <div className="rounded-2xl shadow-lg">
      <div className="rounded-2xl overflow-hidden">
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-6 bg-gradient-to-r from-[#fdfcfc] to-slate-50 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl">
        <div className="flex-1 min-w-[300px]">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">CSL - Vessels Built Report</span>
          </div>
          <h3 className="text-xl font-bold text-[#4b2424] dark:text-blue-400 tracking-wide">{title}</h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>As on date: <strong className="text-[#4b2424] dark:text-blue-400">{new Date().toISOString().split('T')[0]}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Report for the month — <strong className="text-[#4b2424] dark:text-blue-400">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong></span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 flex-wrap">
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b2424] dark:text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-[13.5px] font-medium rounded-[9px] outline-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-[#4b2424] focus:ring-[3px] focus:ring-[#4b2424]/10 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer bg-transparent border-0 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <CopyButton onCopy={handleCopy} color="#4b2424" className="!rounded-xl !py-2 !px-4" />
          <ExportDropdown onExportExcel={() => handleExport('Excel')} onExportPdf={() => handleExport('PDF')} color="#4b2424" hoverColor="#6b3535" />
          <ChartExportMenu chartRoot={chartRoot} fileName="csl_vessels_built_chart" color="#4b2424" />
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${viewMode === 'chart' ? 'bg-white dark:bg-slate-800 shadow text-[#4b2424] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
              title="Chart View"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Chart</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow text-[#4b2424] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm font-semibold text-red-500 dark:text-red-400">{error}</div>
      ) : viewMode === 'chart' ? (
        <div className="p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div ref={chartDivRef} style={{ width: '100%', height: '380px' }} />
        </div>
      ) : (
        <div className="ag-theme-quartz csl-vessels-built-report-grid mt-4" style={{ width: '100%' }}>
          <Table ref={gridRef} theme="legacy" rowData={filteredRowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" rowHeight={48} headerHeight={42} suppressColumnVirtualisation={true} animateRows={true} enableExport={false} color="#4b2424" />
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .csl-vessels-built-report-grid.ag-theme-quartz { --ag-font-family: 'Inter', system-ui, sans-serif; --ag-row-height: 48px; --ag-active-color: #4b2424; }
        .csl-vessels-built-report-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
        .csl-vessels-built-report-grid .ag-header { background: #4b2424 !important; border-bottom: 2px solid #3a1a1a !important; }
        .csl-vessels-built-report-grid .ag-header-cell { color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border-right: 1px solid rgba(255,255,255,0.15) !important; }
        .csl-vessels-built-report-grid .ag-header-cell-label { justify-content: center !important; }
        .csl-vessels-built-report-grid .ag-row-even { background: #ffffff !important; }
        .csl-vessels-built-report-grid .ag-row-odd { background: #f8faf6 !important; }
        .csl-vessels-built-report-grid .ag-cell { border-right: 1px solid #D3D6D9 !important; }
        .dark .csl-vessels-built-report-grid .ag-header { background: #0f172a !important; }
        .dark .csl-vessels-built-report-grid .ag-row-even { background: #090d16 !important; }
        .dark .csl-vessels-built-report-grid .ag-row-odd { background: #0f172a !important; }
        .dark .csl-vessels-built-report-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
      `}} />
      </div>
    </div>
  );
}
