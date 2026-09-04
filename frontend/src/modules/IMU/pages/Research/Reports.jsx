import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchResearchReport } from '../../api';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import ChartExportMenu from '../../../../components/ChartExportMenu';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';

// Confirmed from the legacy site: all 6 metrics plotted as column series
// on one shared axis (unlike K-5.1/K-5.4, which split across two charts) --
// all 6 here are similar-magnitude simple counts, so one chart works.
export default function ResearchReports() {
  const gridRef = useRef(null);
  const chartDivRef = useRef(null);
  const chartRootRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const [chartRoot, setChartRoot] = useState(null);

  const title = 'Form No. IMU K-5.5 - Abstract - Research, Innovation & Startups';

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchResearchReport()
      .then((res) => {
        const data = res.data?.rowData || [];
        const cols = res.data?.columnDefs || [];
        if (!data.length) { setRowData([]); setColumnDefs([]); setChartData([]); return; }

        const yearCols = cols.length
          ? cols.filter((c) => c.field !== 'Metric').map((c) => c.field)
          : Object.keys(data[0]).filter((k) => k !== 'Metric');

        const domRow = data.find((r) => r.Metric === 'Number of Research Papers Published- Domestic Journals') || {};
        const intlRow = data.find((r) => r.Metric === 'Number of Research Papers Published- International Journals') || {};
        const phdRow = data.find((r) => r.Metric === 'Number of Phds Awarded') || {};
        const patentsRow = data.find((r) => r.Metric === 'Number of Patents/IP Filed') || {};
        const startupsRow = data.find((r) => r.Metric === 'Number of Startups Funded/Incubated') || {};
        const msRow = data.find((r) => r.Metric === 'Number of Research MS Awarded') || {};

        setChartData(yearCols.map((yr) => ({
          year: yr,
          domestic: Number(domRow[yr] || 0),
          international: Number(intlRow[yr] || 0),
          phd: Number(phdRow[yr] || 0),
          patents: Number(patentsRow[yr] || 0),
          startups: Number(startupsRow[yr] || 0),
          ms: Number(msRow[yr] || 0),
        })));

        const gridCols = cols.length ? cols.map((c) => ({
          ...c,
          cellClass: c.field === 'Metric'
            ? 'font-bold text-slate-800 dark:text-slate-100 flex items-center border-r border-slate-200 dark:border-slate-700'
            : 'text-center font-semibold flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
        })) : [];
        setColumnDefs(gridCols);
        setRowData(data);
      })
      .catch((err) => {
        console.error('Error loading Research report:', err);
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

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 50, cellStartLocation: 0.1, cellEndLocation: 0.9 });
    xRenderer.labels.template.setAll({ rotation: 0, centerY: am5.p0, centerX: am5.p50, fontSize: 11, fill: am5.color(0x64748b), paddingTop: 8 });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1 });

    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'year', renderer: xRenderer }));
    xAxis.data.setAll(chartData);

    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 11, fill: am5.color(0x64748b) });
    yRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1, strokeDasharray: [4, 4] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: 0.2 }));

    const seriesConfig = [
      { name: 'Number of Research Papers Published- Domestic Journals', field: 'domestic', color: 0xff5733 },
      { name: 'Number of Research Papers Published- International Journals', field: 'international', color: 0xcd5c5c },
      { name: 'Number of Phds Awarded', field: 'phd', color: 0x20b2aa },
      { name: 'Number of Patents/IP Filed', field: 'patents', color: 0xd4a017 },
      { name: 'Number of Startups Funded/Incubated', field: 'startups', color: 0x87cefa },
      { name: 'Number of Research MS Awarded', field: 'ms', color: 0x9370db },
    ];

    seriesConfig.forEach(({ name, field, color }) => {
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name, xAxis, yAxis,
          valueYField: field, categoryXField: 'year',
          clustered: true,
          tooltip: am5.Tooltip.new(root, { labelText: `${name}: [bold]{valueY}[/]`, pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
        })
      );
      series.columns.template.setAll({ fill: am5.color(color), stroke: am5.color(color), width: am5.percent(80) });
      series.data.setAll(chartData);
    });

    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50, marginTop: 12 }));
    legend.labels.template.setAll({ fontSize: 11, fontWeight: '500', fill: am5.color(0x475569) });
    legend.data.setAll(chart.series.values);

    const scrollbarX = chart.set('scrollbarX', am5xy.XYChartScrollbar.new(root, { orientation: 'horizontal', height: 40 }));
    const sbxAxis = scrollbarX.chart.xAxes.push(am5xy.CategoryAxis.new(root, {
      categoryField: 'year',
      renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 }),
    }));
    sbxAxis.get('renderer').labels.template.set('forceHidden', true);
    sbxAxis.data.setAll(chartData);
    const sbyAxis = scrollbarX.chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}) }));
    const sbSeries = scrollbarX.chart.series.push(am5xy.LineSeries.new(root, {
      xAxis: sbxAxis, yAxis: sbyAxis, valueYField: 'international', categoryXField: 'year',
      fill: am5.color(0x0f417a), stroke: am5.color(0x0f417a),
    }));
    sbSeries.fills.template.setAll({ visible: false });
    sbSeries.data.setAll(chartData);
    root.container.children.moveValue(chart.get('scrollbarX'), 0);

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
    if (type === 'Excel' && gridRef.current?.api) gridRef.current.api.exportDataAsCsv({ fileName: 'imu_research_report.csv' });
    else if (type === 'PDF') {
      exportReportToPdf({
        title,
        chartRoots: [chartRoot],
        columnDefs,
        rowData,
        fileName: 'imu_research_report',
      });
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 rounded-t-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">IMU - Research, Innovation & Startups Report</span>
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
          <ChartExportMenu chartRoot={chartRoot} fileName="imu_research_chart" />
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm font-semibold text-red-500 dark:text-red-400">{error}</div>
      ) : (
        <>
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div ref={chartDivRef} style={{ width: '100%', height: '440px' }} />
          </div>
          <div className="ag-theme-quartz imu-research-report-grid mt-4" style={{ width: '100%' }}>
            <Table ref={gridRef} theme="legacy" rowData={rowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" rowHeight={48} headerHeight={42} suppressColumnVirtualisation={true} animateRows={true} enableExport={false} color="#4b2424" />
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .imu-research-report-grid.ag-theme-quartz { --ag-font-family: 'Inter', system-ui, sans-serif; --ag-row-height: 48px; --ag-active-color: #4b2424; }
        .imu-research-report-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
        .imu-research-report-grid .ag-header { background: #4b2424 !important; border-bottom: 2px solid #3a1a1a !important; }
        .imu-research-report-grid .ag-header-cell { color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border-right: 1px solid rgba(255,255,255,0.15) !important; }
        .imu-research-report-grid .ag-header-cell-label { justify-content: center !important; }
        .imu-research-report-grid .ag-row-even { background: #ffffff !important; }
        .imu-research-report-grid .ag-row-odd { background: #f8faf6 !important; }
        .imu-research-report-grid .ag-cell { border-right: 1px solid #D3D6D9 !important; }
        .dark .imu-research-report-grid .ag-header { background: #0f172a !important; }
        .dark .imu-research-report-grid .ag-row-even { background: #090d16 !important; }
        .dark .imu-research-report-grid .ag-row-odd { background: #0f172a !important; }
        .dark .imu-research-report-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
      `}} />
    </div>
  );
}
