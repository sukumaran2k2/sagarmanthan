import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { TrendingUp, Search, X } from 'lucide-react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { fetchPartnershipReport } from '../../api';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';
import ChartExportMenu from '../../../../components/ChartExportMenu';

// Confirmed from the legacy site: two separate charts -- Academic
// Domestic/International on one, Industry Domestic/International on
// another -- both sourced from the same single report endpoint (unlike
// K-5.1, which needed two separate API calls for its two charts).
export default function PartnershipReports() {
  const gridRef = useRef(null);
  const academicChartDivRef = useRef(null);
  const academicChartRootRef = useRef(null);
  const industryChartDivRef = useRef(null);
  const industryChartRootRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [academicChartData, setAcademicChartData] = useState([]);
  const [industryChartData, setIndustryChartData] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chartRoot, setChartRoot] = useState(null);

  const title = 'Form No. IMU K-5.4 - Abstract - Partnerships/MoUs - Academic';

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchPartnershipReport()
      .then((res) => {
        const data = res.data?.rowData || [];
        const cols = res.data?.columnDefs || [];
        if (!data.length) { setRowData([]); setColumnDefs([]); setAcademicChartData([]); setIndustryChartData([]); return; }

        const yearCols = cols.length
          ? cols.filter((c) => c.field !== 'Metric').map((c) => c.field)
          : Object.keys(data[0]).filter((k) => k !== 'Metric');

        const acadDomRow = data.find((r) => r.Metric === 'Number of Academic Partnerships/MoUs- Domestic') || {};
        const acadIntlRow = data.find((r) => r.Metric === 'Number of Academic Partnerships/MoUs- International') || {};
        const indDomRow = data.find((r) => r.Metric === 'Number of Industry Partnerships/MoUs- Domestic') || {};
        const indIntlRow = data.find((r) => r.Metric === 'Number of Industry Partnerships/MoUs- International') || {};

        setAcademicChartData(yearCols.map((yr) => ({
          year: yr,
          domestic: Number(acadDomRow[yr] || 0),
          international: Number(acadIntlRow[yr] || 0),
        })));
        setIndustryChartData(yearCols.map((yr) => ({
          year: yr,
          domestic: Number(indDomRow[yr] || 0),
          international: Number(indIntlRow[yr] || 0),
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
        console.error('Error loading Partnership report:', err);
        setError('Failed to load report data.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const buildLineChart = (divRef, rootRef, data, seriesConfig, isPrimary) => {
    if (!divRef.current || !data.length) return null;
    if (rootRef.current) rootRef.current.dispose();

    const root = am5.Root.new(divRef.current);
    rootRef.current = root;
    if (isPrimary) setChartRoot(root);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingTop: 20, paddingBottom: 10, paddingRight: 20, paddingLeft: 10 })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 40, cellStartLocation: 0.1, cellEndLocation: 0.9 });
    xRenderer.labels.template.setAll({ rotation: 0, centerY: am5.p0, centerX: am5.p50, fontSize: 11, fill: am5.color(0x64748b), paddingTop: 8 });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1 });

    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'year', renderer: xRenderer }));
    xAxis.data.setAll(data);

    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.setAll({ fontSize: 11, fill: am5.color(0x64748b) });
    yRenderer.grid.template.setAll({ stroke: am5.color(0xe2e8f0), strokeWidth: 1, strokeDasharray: [4, 4] });
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, extraMax: 0.2 }));

    seriesConfig.forEach(({ name, field, color }) => {
      const series = chart.series.push(
        am5xy.LineSeries.new(root, {
          name, xAxis, yAxis,
          valueYField: field, categoryXField: 'year',
          stroke: am5.color(color), fill: am5.color(color),
          tooltip: am5.Tooltip.new(root, { labelText: `${name}: [bold]{valueY}[/]`, pointerOrientation: 'horizontal', centerY: am5.percent(100) }),
        })
      );
      series.strokes.template.setAll({ strokeWidth: 2, stroke: am5.color(color) });
      series.bullets.push(() => am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(color), stroke: am5.color(0xffffff), strokeWidth: 2 })
      }));
      series.data.setAll(data);
    });

    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50, marginTop: 12 }));
    legend.labels.template.setAll({ fontSize: 12, fontWeight: '500', fill: am5.color(0x475569) });
    legend.data.setAll(chart.series.values);

    chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none', xAxis }));
    chart.appear(800, 100);

    return root;
  };

  useLayoutEffect(() => {
    const root = buildLineChart(
      academicChartDivRef, academicChartRootRef, academicChartData,
      [
        { name: 'Number of Academic Partnerships/MoUs - Domestic', field: 'domestic', color: 0xff5733 },
        { name: 'Number of Academic Partnerships/MoUs - International', field: 'international', color: 0x20b2aa },
      ],
      true
    );
    return () => { if (root) { root.dispose(); setChartRoot(null); } };
  }, [academicChartData]);

  useLayoutEffect(() => {
    const root = buildLineChart(
      industryChartDivRef, industryChartRootRef, industryChartData,
      [
        { name: 'Number of Industry Partnerships/MoUs - Domestic', field: 'domestic', color: 0xd4a017 },
        { name: 'Number of Industry Partnerships/MoUs - International', field: 'international', color: 0x87cefa },
      ],
      false
    );
    return () => { if (root) root.dispose(); };
  }, [industryChartData]);

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
    if (type === 'Excel' && gridRef.current?.api) gridRef.current.api.exportDataAsCsv({ fileName: 'imu_partnership_report.csv' });
    else if (type === 'PDF') {
      exportReportToPdf({
        title,
        chartRoots: [chartRoot, industryChartRootRef.current],
        columnDefs,
        rowData: filteredRowData,
        fileName: 'imu_partnership_report',
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
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">IMU - Partnerships/MoUs Report</span>
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
          <ChartExportMenu chartRoot={chartRoot} fileName="imu_partnership_chart" color="#4b2424" />
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm font-semibold text-red-500 dark:text-red-400">{error}</div>
      ) : (
        <>
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Academic Partnerships/MoUs</p>
            <div ref={academicChartDivRef} style={{ width: '100%', height: '360px' }} />
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Industry Partnerships/MoUs</p>
            <div ref={industryChartDivRef} style={{ width: '100%', height: '360px' }} />
          </div>
          <div className="ag-theme-quartz imu-partnership-report-grid mt-4" style={{ width: '100%' }}>
            <Table ref={gridRef} theme="legacy" rowData={filteredRowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" rowHeight={48} headerHeight={42} suppressColumnVirtualisation={true} animateRows={true} enableExport={false} color="#4b2424" />
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .imu-partnership-report-grid.ag-theme-quartz { --ag-font-family: 'Inter', system-ui, sans-serif; --ag-row-height: 48px; --ag-active-color: #4b2424; }
        .imu-partnership-report-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
        .imu-partnership-report-grid .ag-header { background: #4b2424 !important; border-bottom: 2px solid #3a1a1a !important; }
        .imu-partnership-report-grid .ag-header-cell { color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border-right: 1px solid rgba(255,255,255,0.15) !important; }
        .imu-partnership-report-grid .ag-header-cell-label { justify-content: center !important; }
        .imu-partnership-report-grid .ag-row-even { background: #ffffff !important; }
        .imu-partnership-report-grid .ag-row-odd { background: #f8faf6 !important; }
        .imu-partnership-report-grid .ag-cell { border-right: 1px solid #D3D6D9 !important; }
        .dark .imu-partnership-report-grid .ag-header { background: #0f172a !important; }
        .dark .imu-partnership-report-grid .ag-row-even { background: #090d16 !important; }
        .dark .imu-partnership-report-grid .ag-row-odd { background: #0f172a !important; }
        .dark .imu-partnership-report-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
      `}} />
      </div>
    </div>
  );
}
