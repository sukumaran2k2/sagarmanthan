import { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, Search, X } from 'lucide-react';
import { fetchFinancialPerformanceReport } from '../../api';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';

// Unlike the other DGLL reports, Financial Performance is a financial
// statement (section headers, line items, computed subtotals) rather than a
// simple metric-by-year time series -- a bar/line chart wouldn't meaningfully
// represent mixed aggregation levels like "Total Revenue" alongside its own
// line items. The legacy site's equivalent report is table-only too, with no
// chart, so this follows the same structure.
export default function FinancialPerformanceReports() {
  const gridRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const title = 'Form No. DGLL K-3.6 - Abstract - Financial Performance - Overall (INR Crores)';

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchFinancialPerformanceReport()
      .then((res) => {
        const data = res.data?.rowData || res.data || [];
        const cols = res.data?.columnDefs || [];

        const gridCols = cols.length ? cols.map((c) => {
          const isDescription = c.field === 'Description';
          return {
            ...c,
            cellClass: (params) => {
              const isSectionHeader = params.data?.Description === 'Revenue' || params.data?.Description === 'Expenses';
              const isTotal = params.data?.Description === 'Total Revenue' || params.data?.Description === 'Total Expenses';
              const base = isDescription
                ? 'flex items-center border-r border-slate-200 dark:border-slate-700'
                : 'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-700';
              if (isSectionHeader) return `${base} font-black text-[#4b2424] dark:text-blue-300 uppercase text-[11px] tracking-wide`;
              if (isTotal) return `${base} font-black text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-800/60`;
              return `${base} font-semibold text-slate-700 dark:text-slate-200`;
            },
          };
        }) : [];
        setColumnDefs(gridCols);
        setRowData(data);
      })
      .catch((err) => {
        console.error('Error loading Financial Performance report:', err);
        setError('Failed to load report data.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const defaultColDef = useMemo(() => ({
    sortable: false, resizable: true,
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
    if (type === 'Excel' && gridRef.current?.api) gridRef.current.api.exportDataAsCsv({ fileName: 'financial_performance_report.csv' });
    else if (type === 'PDF') {
      exportReportToPdf({
        title,
        chartRoots: [],
        columnDefs,
        rowData: filteredRowData,
        fileName: 'dgll_financial_performance_report',
      });
    }
  };

  return (
    <div className="rounded-2xl shadow-lg">
      <div className="rounded-2xl overflow-hidden">
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl">
        <div className="flex-1 min-w-[300px]">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">DGLL - Financial Performance Report</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>As on date: <strong className="text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Report for the month — <strong className="text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong></span>
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
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm font-semibold text-red-500 dark:text-red-400">{error}</div>
      ) : (
        <div className="ag-theme-quartz financial-performance-report-grid mt-4" style={{ width: '100%' }}>
          <Table ref={gridRef} theme="legacy" rowData={filteredRowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" rowHeight={44} headerHeight={42} suppressColumnVirtualisation={true} animateRows={true} enableExport={false} color="#4b2424" />
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .financial-performance-report-grid.ag-theme-quartz { --ag-font-family: 'Inter', system-ui, sans-serif; --ag-row-height: 44px; --ag-active-color: #4b2424; }
        .financial-performance-report-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
        .financial-performance-report-grid .ag-header { background: #4b2424 !important; border-bottom: 2px solid #3a1a1a !important; }
        .financial-performance-report-grid .ag-header-cell { color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border-right: 1px solid rgba(255,255,255,0.15) !important; }
        .financial-performance-report-grid .ag-header-cell-label { justify-content: center !important; }
        .financial-performance-report-grid .ag-row-even { background: #ffffff !important; }
        .financial-performance-report-grid .ag-row-odd { background: #f8faf6 !important; }
        .financial-performance-report-grid .ag-cell { border-right: 1px solid #D3D6D9 !important; }
        .dark .financial-performance-report-grid .ag-header { background: #0f172a !important; }
        .dark .financial-performance-report-grid .ag-row-even { background: #090d16 !important; }
        .dark .financial-performance-report-grid .ag-row-odd { background: #0f172a !important; }
        .dark .financial-performance-report-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
      `}} />
      </div>
    </div>
  );
}
