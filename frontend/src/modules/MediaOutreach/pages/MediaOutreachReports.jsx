import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { ChevronLeft, FileSpreadsheet, Download, Search, LayoutGrid, Loader2, RefreshCw, X, TrendingUp, Copy } from 'lucide-react';
import axios from 'axios';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MONTHS = ['ALL', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const FINANCIAL_YEARS = (() => {
  const years = ['ALL'];
  for (let y = 2020; y <= 2028; y++) years.push(`${y}-${y + 1}`);
  return years;
})();

const PLATFORMS = [
  { value: 'broadcast', label: 'Broadcast TV Media' },
  { value: 'print_media', label: 'Print Media' },
  { value: 'online', label: 'Online' },
  { value: 'social_media', label: 'Social Media' }
];

export default function MediaOutreachReports({ triggerNotification }) {
  const gridRef = useRef(null);
  const dropdownRef = useRef(null);

  // States
  const [financialYear, setFinancialYear] = useState('ALL');
  const [month, setMonth] = useState('ALL');
  const [platform, setPlatform] = useState('broadcast');
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [quickFilter, setQuickFilter] = useState('');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch report data based on parameters
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    const userId = (() => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.userId;
        }
      } catch (e) {}
      return 1;
    })();

    let url = '';
    if (platform === 'broadcast') {
      url = `${API}/monthly-BroadPrint-report-parameter/${userId}/broadcast/${month}/${financialYear}`;
    } else if (platform === 'print_media') {
      url = `${API}/monthly-BroadPrint-report-parameter/${userId}/print_media/${month}/${financialYear}`;
    } else if (platform === 'online') {
      url = `${API}/monthly-onlinemedia-report-parameter/${userId}/${month}/${financialYear}`;
    } else if (platform === 'social_media') {
      url = `${API}/monthly-socialmedia-report-parameter/${userId}/${month}/${financialYear}`;
    }

    try {
      const response = await axios.get(url);
      const data = response.data;
      if (data) {
        // Prepare grid columnDefs with custom styles (centered text, black color)
        let cols = data.columnDefs || [];
        
        // If columns are returned in format [{ headerName, field }], map them to center aligned
        cols = cols.map(col => {
          const base = {
            ...col,
            headerClass: 'text-center-header font-bold',
            cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }
          };
          if (col.children) {
            base.children = col.children.map(child => ({
              ...child,
              headerClass: 'text-center-header font-bold',
              cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }));
          }
          return base;
        });

        // Ensure "S No" styling
        const sNoColIdx = cols.findIndex(c => c.field === 'S No');
        if (sNoColIdx !== -1) {
          cols[sNoColIdx].cellStyle = { fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' };
        }

        setColumnDefs(cols);
        setRowData(data.rowData || []);
      } else {
        setRowData([]);
        setColumnDefs([]);
      }
    } catch (err) {
      console.error(err);
      setRowData([]);
      setColumnDefs([]);
    } finally {
      setLoading(false);
    }
  }, [platform, month, financialYear]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const onGridReady = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);

  // Export handlers
  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `Media_Outreach_${platform}_Report_export.csv`
        });
        triggerNotification?.(`Report exported to Excel (CSV) successfully!`);
      }
    } else if (type === 'PDF') {
      triggerNotification?.(`Preparing PDF document...`);
      const printWindow = window.open('', '_blank');
      const title = `Media Outreach - Monthly Abstract Report (${platform.toUpperCase()})`;

      let headersHtml = '';
      columnDefs.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid #4b2424; padding:10px 14px; text-align:center; background:#0f417a; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      rowData.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
        rowsHtml += `<tr style="background:${bg}">`;
        columnDefs.forEach(col => {
          if (col.headerName) {
            let val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#000000; text-align:center;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; color: #000; padding: 24px; }
              h1 { font-size: 18px; margin-bottom: 4px; color: #0f417a; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <p style="font-size:11px; color:#657386; margin:0 0 20px; text-align:center;">Generated on: ${new Date().toLocaleDateString()} | Filter: Year - ${financialYear}, Month - ${month}</p>
            <table>
              <thead><tr>${headersHtml}</tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <script>window.onload=function(){window.print();window.close()}</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleCopy = () => {
    if (!gridRef.current?.api) return;
    let tsv = '';
    const headers = columnDefs.map(c => c.headerName).filter(Boolean);
    tsv += headers.join('\t') + '\n';
    
    gridRef.current.api.forEachNodeAfterFilterAndSort((node) => {
      const row = node.data;
      if (!row) return;
      const rowTsv = columnDefs.map(col => {
        let val = row[col.field] !== undefined ? row[col.field] : '';
        return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join('\t');
      tsv += rowTsv + '\n';
    });
    
    navigator.clipboard.writeText(tsv).then(() => {
      triggerNotification?.('Report copied to clipboard!');
    }).catch(err => {
      console.error('Copy failed', err);
    });
  };

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  return (
    <div className="font-sans text-black dark:text-slate-200 space-y-5">
      
      {/* ─ Filters row exactly like YP ─ */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-5 select-none dark:bg-slate-950 dark:border-slate-800">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer"
          >
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Financial Year</label>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer"
          >
            {FINANCIAL_YEARS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer"
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* ─ Header & Toolbar ─ */}
      <div className="bg-gradient-to-r from-[#fdfcfc] to-[#f7f3f3] dark:from-slate-900 dark:to-slate-950 px-6 py-4.5 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-blue-800" strokeWidth={2.5} />
            <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
              Media Outreach Report
            </span>
          </div>
          <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wide font-display">
            Monthly Abstract Report — {platform.toUpperCase()}
          </h3>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search box */}
          <div className="relative w-60">
            <Search className="h-4.5 w-4.5 text-blue-800 dark:text-blue-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search data..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-800 font-semibold bg-white text-black dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            />
            {quickFilter && (
              <button
                onClick={() => setQuickFilter('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-655"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-250 text-slate-700 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 transition cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Copy className="h-4 w-4 text-slate-500" />
            <span>Copy</span>
          </button>

          {/* Export dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-blue-900/10"
            >
              <span>Export</span>
              <span className="text-[10px]">▼</span>
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <button
                  onClick={() => {
                    handleExport('Excel');
                    setExportDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer border-none bg-none text-left dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>CSV (Excel)</span>
                </button>
                <button
                  onClick={() => {
                    handleExport('PDF');
                    setExportDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer border-none bg-none text-left dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="h-4 w-4 text-rose-600" />
                  <span>Print / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchReportData}
            className="flex items-center justify-center w-9 h-9 border border-slate-200 rounded-xl text-slate-500 hover:text-[#0f417a] hover:border-[#0f417a] bg-white cursor-pointer transition dark:bg-slate-900 dark:border-slate-855 dark:text-slate-300 dark:hover:border-[#0f417a]"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="ag-theme-quartz" style={{ height: 480, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={10}
          domLayout="normal"
          quickFilterText={quickFilter}
          animateRows={true}
          sideBar={false}
          onGridReady={onGridReady}
          loading={loading}
          overlayNoRowsTemplate='<div class="text-sm text-slate-500 font-semibold py-8">No report data found.</div>'
        />
      </div>

      {/* Global CSS injection to match the table headers and cell text */}
      <style dangerouslySetInnerHTML={{ __html: `
        .text-center-header .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
          font-weight: 800 !important;
          color: white !important;
        }
        .ag-header-row {
          background-color: #0f417a !important;
        }
        .ag-header-cell {
          background-color: #0f417a !important;
          border-right: 1px solid #1a5ba3 !important;
        }
        .ag-header-cell-text {
          color: white !important;
          font-weight: bold !important;
        }
        .ag-cell {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 500 !important;
        }
        .dark .ag-cell {
          color: #f1f5f9 !important;
        }
        .ag-row {
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .dark .ag-row {
          border-bottom: 1px solid #374151 !important;
        }
        .ag-row-odd {
          background-color: #f8fafc !important;
        }
        .dark .ag-row-odd {
          background-color: #111827 !important;
        }
      ` }} />
    </div>
  );
}
