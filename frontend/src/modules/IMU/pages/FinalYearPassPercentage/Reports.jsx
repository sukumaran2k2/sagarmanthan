import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { TrendingUp, Search, X, BarChart3, List } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchFinalYearPassPercentageReport } from '../../api';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import ChartExportMenu from '../../../../components/ChartExportMenu';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';

// Confirmed from the legacy site: 3 column series (Appeared, Passed, Pass
// Percentage) on one shared axis, x-axis combining programme + batch into
// a single category label -- replicated exactly.
export default function FinalYearPassPercentageReports() {
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

  const title = 'Form No. IMU K-5.1.1 Final Year Pass Percentage - IMU Campuses';

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchFinalYearPassPercentageReport()
      .then((res) => {
        const data = res.data?.rowData || [];
        const cols = res.data?.columnDefs || [];
        if (!data.length) { setRowData([]); setColumnDefs([]); setChartData([]); return; }

        const transformed = data.map((item) => ({
          programmeBatch: `${item.programme} ${item.batch}`,
          appeared: Number(item.appeared || 0),
          passed: Number(item.passed || 0),
          passPercentage: Number(item.pass_percentage || 0),
        }));
        setChartData(transformed);

        const gridCols = cols.length ? cols.map((c) => ({
          ...c,
          cellClass: 'text-center font-semibold flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
        })) : [];
        setColumnDefs(gridCols);
        setRowData(data);
      })
      .catch((err) => {
        console.error('Error loading Final Year Pass Percentage report:', err);
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
      am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingTop: 20, paddingBottom: 10, paddingRight: 20, paddingLeft: 10 })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 60, cellStartLocation: 0.1, cellEndLocation: 0.9 });
    xRenderer.labels.template.setAll({ rotation: 0, centerY: am5.p0, centerX: am5.p50, fontSize: 11, fill: am5.color(0x64748b), paddingTop: 8 });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1 });

    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'programmeBatch', renderer: xRenderer }));
    xAxis.data.setAll(chartData);

    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 11, fill: am5.color(0x64748b) });
    yRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1, strokeDasharray: [4, 4] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: 0.2 }));

    const appearedSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Appeared', xAxis, yAxis,
        valueYField: 'appeared', categoryXField: 'programmeBatch',
        clustered: true,
        tooltip: am5.Tooltip.new(root, { labelText: 'Appeared: [bold]{valueY}[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    appearedSeries.columns.template.setAll({ fill: am5.color(0xff5733), stroke: am5.color(0xff5733), cornerRadiusTL: 0, cornerRadiusTR: 0, width: am5.percent(70) });
    appearedSeries.bullets.push((root) => {
      const label = am5.Label.new(root, { fill: am5.color(0x1e293b), centerX: am5.p50, centerY: am5.p100, dy: -14, fontSize: 10, fontWeight: '700', populateText: true, text: '{valueY}' });
      return am5.Bullet.new(root, { sprite: label, locationY: 1 });
    });
    appearedSeries.data.setAll(chartData);

    const passedSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Passed', xAxis, yAxis,
        valueYField: 'passed', categoryXField: 'programmeBatch',
        clustered: true,
        tooltip: am5.Tooltip.new(root, { labelText: 'Passed: [bold]{valueY}[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    passedSeries.columns.template.setAll({ fill: am5.color(0x20b2aa), stroke: am5.color(0x20b2aa), cornerRadiusTL: 0, cornerRadiusTR: 0, width: am5.percent(70) });
    passedSeries.bullets.push((root) => {
      const label = am5.Label.new(root, { fill: am5.color(0x1e293b), centerX: am5.p50, centerY: am5.p100, dy: -14, fontSize: 10, fontWeight: '700', populateText: true, text: '{valueY}' });
      return am5.Bullet.new(root, { sprite: label, locationY: 1 });
    });
    passedSeries.data.setAll(chartData);

    const pctSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Pass percentage', xAxis, yAxis,
        valueYField: 'passPercentage', categoryXField: 'programmeBatch',
        clustered: true,
        tooltip: am5.Tooltip.new(root, { labelText: 'Pass Percentage: [bold]{valueY}%[/]', pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
      })
    );
    pctSeries.columns.template.setAll({ fill: am5.color(0xd4e157), stroke: am5.color(0xd4e157), cornerRadiusTL: 0, cornerRadiusTR: 0, width: am5.percent(70) });
    pctSeries.bullets.push((root) => {
      const label = am5.Label.new(root, { fill: am5.color(0x1e293b), centerX: am5.p50, centerY: am5.p100, dy: -14, fontSize: 10, fontWeight: '700', populateText: true, text: '{valueY}' });
      return am5.Bullet.new(root, { sprite: label, locationY: 1 });
    });
    pctSeries.data.setAll(chartData);

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
    if (type === 'Excel' && gridRef.current?.api) gridRef.current.api.exportDataAsCsv({ fileName: 'imu_final_year_pass_percentage_report.csv' });
    else if (type === 'PDF') {
      exportReportToPdf({
        title,
        chartRoots: [chartRoot],
        columnDefs,
        rowData: filteredRowData,
        fileName: 'imu_final_year_pass_percentage_report',
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
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">IMU - Final Year Pass Percentage Report</span>
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
          <ChartExportMenu chartRoot={chartRoot} fileName="imu_final_year_pass_percentage_chart" color="#4b2424" />
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
          <div ref={chartDivRef} style={{ width: '100%', height: '440px' }} />
        </div>
      ) : (
        <div className="ag-theme-quartz imu-finalyear-report-grid mt-4" style={{ width: '100%' }}>
          <Table ref={gridRef} theme="legacy" rowData={filteredRowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" rowHeight={48} headerHeight={42} suppressColumnVirtualisation={true} animateRows={true} enableExport={false} color="#4b2424" />
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .imu-finalyear-report-grid.ag-theme-quartz { --ag-font-family: 'Inter', system-ui, sans-serif; --ag-row-height: 48px; --ag-active-color: #4b2424; }
        .imu-finalyear-report-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
        .imu-finalyear-report-grid .ag-header { background: #4b2424 !important; border-bottom: 2px solid #3a1a1a !important; }
        .imu-finalyear-report-grid .ag-header-cell { color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border-right: 1px solid rgba(255,255,255,0.15) !important; }
        .imu-finalyear-report-grid .ag-header-cell-label { justify-content: center !important; }
        .imu-finalyear-report-grid .ag-row-even { background: #ffffff !important; }
        .imu-finalyear-report-grid .ag-row-odd { background: #f8faf6 !important; }
        .imu-finalyear-report-grid .ag-cell { border-right: 1px solid #D3D6D9 !important; }
        .dark .imu-finalyear-report-grid .ag-header { background: #0f172a !important; }
        .dark .imu-finalyear-report-grid .ag-row-even { background: #090d16 !important; }
        .dark .imu-finalyear-report-grid .ag-row-odd { background: #0f172a !important; }
        .dark .imu-finalyear-report-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
      `}} />
      </div>
    </div>
  );
}
