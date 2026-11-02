import { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, Search, X } from 'lucide-react';
import { fetchSecondhandVesselProcurementReport } from '../../api';
import Table from '../../../../components/Table';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import { exportReportToPdf } from '../../../../utils/exportReportPdf';
import { COMMON_TOASTS } from '../../../../utils/notify';

export default function SecondhandVesselProcurementReports({ notify }) {
  const gridRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const title = 'Form No. K-6.2.2 - Abstract - SCI - Vessel Procurement - Secondhand';

  // Load once on open
  useEffect(() => {
    fetchSecondhandVesselProcurementReport()
      .then((res) => {
        const data = res.data?.rowData || [];
        const cols = res.data?.columnDefs || [];
        setRowData(data);
        setColumnDefs(cols.map((c) => ({
          ...c,
          pinned: c.field === 'Metric' ? 'left' : undefined,
          cellClass: c.field === 'Metric'
            ? 'font-bold text-slate-800 dark:text-slate-100 flex items-center border-r border-slate-200 dark:border-slate-700'
            : 'text-center font-semibold flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
        })));
      })
      .catch((err) => {
        console.error('Error loading report:', err);
        setError('Failed to load report data.');
        notify?.(COMMON_TOASTS.loadFailed('The report'));
      })
      .finally(() => setLoading(false));
  }, [notify]);

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
    navigator.clipboard.writeText(tsv).then(
      () => notify?.(COMMON_TOASTS.copySuccess(filteredRowData.length)),
      () => notify?.(COMMON_TOASTS.copyFailed()),
    );
  };

  const handleExport = (type) => {
    if (type === 'Excel' && gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({ fileName: 'sci_secondhand_vessel_procurement_report.csv' });
      notify?.(COMMON_TOASTS.excelExported('sci_secondhand_vessel_procurement_report.csv'));
    }
    else if (type === 'PDF') {
      exportReportToPdf({
        title,
        chartRoots: [],
        columnDefs,
        rowData: filteredRowData,
        fileName: 'sci_secondhand_vessel_procurement_report',
      });
      notify?.(COMMON_TOASTS.downloadStarted('sci_secondhand_vessel_procurement_report.pdf'));
    }
  };

  return (
    <div className="rounded-2xl shadow-lg">
      <div className="rounded-2xl overflow-hidden">
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-6 bg-gradient-to-r from-[#fdfcfc] to-slate-50 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl">
        <div className="flex-1 min-w-[300px]">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
            <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">SCI - Secondhand Vessel Procurement Report</span>
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
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm font-semibold text-red-500 dark:text-red-400">{error}</div>
      ) : (
        <div className="ag-theme-quartz kpi-report-grid mt-4" style={{ width: '100%' }}>
          <Table ref={gridRef} loading={loading} theme="legacy" rowData={filteredRowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" rowHeight={48} headerHeight={42} suppressColumnVirtualisation={true} animateRows={true} enableExport={false} color="#4b2424" />
        </div>
      )}

      </div>
    </div>
  );
}
