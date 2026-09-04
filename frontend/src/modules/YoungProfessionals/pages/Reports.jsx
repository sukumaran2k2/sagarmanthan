import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { ChevronLeft, Search, Loader2, RefreshCw, X, TrendingUp, Copy, FileSpreadsheet, Building2, Users } from 'lucide-react';
import api, { API_BASE, fetchYPReport, fetchYPDivisionWiseCandidates } from '../api';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { useAICopilot } from '../../../context/AICopilotContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const initials = n => n ? n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '';

export default function Reports({ triggerNotification }) {
  const { registerReport, clearReport } = useAICopilot();
  const gridRef = useRef(null);
  const [reportView, setReportView] = useState('all');

  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report No. 2.2A - Abstract ( Wing & Division Wise ) - Young Professionals' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [quickFilter, setQuickFilter] = useState('');
  const [pageSize, setPageSize] = useState(15);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(drillDownPath.slice(0, -1));
    }
  };

  /* ── Data Fetching ─────────────────────────────────────────── */
  const fetchReportData = useCallback(async () => {
    Promise.resolve().then(() => setLoading(true));
    try {
      if (currentView.type === 'summary') {
        const response = await api.get("/yp-report");
        const list = response.data?.rowData || [];
        setData(list.map((item, idx) => ({ ...item, 'S No': idx + 1 })));
      } else if (currentView.type === 'wing_drilldown') {
        const response = await api.get(`/wingwise-ypcandidate/0/${currentView.wingId}`);
        const list = response.data?.rowData || [];
        setData(list.map((item, idx) => ({ ...item, 'S No': idx + 1 })));
      } else if (currentView.type === 'drilldown') {
        const response = await api.get(`/divisionwise-ypcandidate/0/${currentView.divisionId}`);
        const list = response.data?.rowData || [];
        setData(list.map((item, idx) => ({ ...item, 'S No': idx + 1 })));
      } else if (currentView.type === 'all_drilldown') {
        const response = await api.get('/young-professional');
        const list = (response.data || []).filter(item => Number(item.is_active) === 1);
        setData(list.map((item, idx) => ({
          'S No': idx + 1,
          'Wing Name': item.wing,
          'Division Name': item.division,
          'Name': item.name,
          'Qualification': item.qualification,
          'Role': item.role,
          'Salary (per month)': item.salary,
          'Experience (Years)': item.total_experience,
          'Skills': item.skills,
          'Appointment Date': item.appointment_date,
          'Document': item.appointment_document,
          'Created At': item.created_date,
          'Created By': item.created_by,
          'Last Updated At': item.last_updated_date
        })));
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const onGridReady = (params) => {
    // optional grid ready logic
  };

  const handleCopy = () => {
    if (!gridRef.current?.api) return;
    let tsv = '';
    const activeCols = columns.filter(c => c.headerName && c.field !== 'Document');
    tsv += activeCols.map(c => c.headerName).join('\t') + '\n';

    let index = 1;
    gridRef.current.api.forEachNodeAfterFilterAndSort((node) => {
      const row = node.data;
      if (!row) return;
      const rowTsv = activeCols.map(col => {
        let val = '';
        if (col.field === 'S No' || col.headerName === 'S.No') val = index++;
        else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
        else val = row[col.field] !== undefined ? row[col.field] : '';
        val = String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
        return val;
      }).join('\t');
      tsv += rowTsv + '\n';
    });

    navigator.clipboard.writeText(tsv).then(() => {
      triggerNotification?.('Report copied to clipboard!');
    }).catch(err => {
      console.error('Copy failed', err);
    });
  };

  const handleExport = (type) => {
    const title = currentView.title;
    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `${title.replace(/\s+/g, '_')}_export.csv`
        });
        triggerNotification?.(`Report exported to Excel (CSV) successfully!`);
      }
    } else if (type === 'PDF') {
      triggerNotification?.(`Preparing PDF document...`);
      const printWindow = window.open('', '_blank');
      const docTitle = title || 'Report';
      const brandColor = '#4b2424';
      const oddRowColor = '#f8faf6';

      let headersHtml = '';
      columns.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid ${brandColor}; padding:10px 14px; text-align:left; background:${brandColor}; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      data.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : oddRowColor;
        rowsHtml += `<tr style="background:${bg}">`;
        columns.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S No' || col.headerName === 'S.No') val = i + 1;
            else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
            else val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border:1px solid #e2e8f0; padding:8px 14px; font-size:12px; color:#334155;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`<html><head><title>${docTitle}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#334155;padding:24px}h1{font-size:18px;margin-bottom:4px;color:${brandColor}}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${docTitle}</h1><p style="font-size:11px;color:#64748b;margin:0 0 20px">Generated on: ${new Date().toLocaleDateString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
      printWindow.document.close();
    }
  };

  const summaryColumns = useMemo(() => {
    const cols = [
      {
        field: 'S No',
        headerName: 'S.No',
        pinned: 'left',
        width: 60,
        suppressMovable: true,
        cellRenderer: (p) => (
          <span style={{ fontWeight: 800, fontSize: 11, fontFamily: 'monospace' }} className="text-slate-800 dark:text-white">
            {p.value}
          </span>
        )
      }
    ];

    if (reportView === 'wing' || reportView === 'all') {
      cols.push({
        field: 'Wing',
        headerName: 'Wing',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (p) => {
          if (p.data && p.data.isTotalRow) {
            return <span style={{ fontWeight: 850 }} className="text-slate-900 dark:text-white">Total</span>;
          }
          return <span style={{ fontWeight: 600 }} className="text-slate-800 dark:text-slate-200">{p.value || '—'}</span>;
        }
      });
    }

    if (reportView === 'division' || reportView === 'all') {
      cols.push({
        field: 'Division',
        headerName: 'Division',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (p) => {
          if (p.data && p.data.isTotalRow) {
            return <span style={{ fontWeight: 850 }} className="text-slate-900 dark:text-white">Total</span>;
          }
          return <span style={{ fontWeight: 600 }} className="text-slate-800 dark:text-slate-200">{p.value || '—'}</span>;
        }
      });
    }

    cols.push({
      field: 'In Position',
      headerName: 'In Post',
      width: 150,
      cellRenderer: (p) => {
        const val = p.value;
        if (p.data && p.data.isTotalRow) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <button
                onClick={() => {
                  setDrillDownPath(prev => [
                    ...prev,
                    { type: 'all_drilldown', title: 'Young Professional List - All Active Young Professionals' }
                  ]);
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: 0,
                  background: 'none',
                  fontWeight: 850, fontSize: 13,
                  textDecoration: 'underline',
                  border: 'none', cursor: 'pointer',
                  transition: 'opacity 0.15s ease'
                }}
                className="text-[#8c4242] dark:text-blue-400 font-extrabold"
              >
                {val} Total Active
              </button>
            </div>
          );
        }

        if (val > 0) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <button
                onClick={() => {
                  if (reportView === 'wing') {
                    const wingId = p.data["Wing ID"] || p.data["wing_id"];
                    const wingName = p.data["Wing"];
                    setDrillDownPath(prev => [
                      ...prev,
                      { type: 'wing_drilldown', wingId, wingName, title: `Young Professional List - Wing: ${wingName}` }
                    ]);
                  } else if (reportView === 'division') {
                    const divisionId = p.data["Division ID"] || p.data["division_id"];
                    const divisionName = p.data["Division"];
                    setDrillDownPath(prev => [
                      ...prev,
                      { type: 'drilldown', divisionId, title: `Young Professional List - Division: ${divisionName}` }
                    ]);
                  } else {
                    const divisionId = p.data["Division ID"] || p.data["division_id"];
                    const divisionName = p.data["Division"];
                    const wingName = p.data["Wing"];
                    setDrillDownPath(prev => [
                      ...prev,
                      { type: 'drilldown', divisionId, title: `Young Professional List - Wing: ${wingName} | Division: ${divisionName}` }
                    ]);
                  }
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: 0,
                  background: 'none',
                  fontWeight: 700, fontSize: 12,
                  textDecoration: 'underline',
                  border: 'none', cursor: 'pointer',
                  transition: 'opacity 0.15s ease'
                }}
                className="text-[#4b2424] dark:text-blue-400"
              >
                {val} Active
              </button>
            </div>
          );
        }
        return <span style={{ color: '#657386', fontWeight: 600, display: 'block', textAlign: 'center' }}>—</span>;
      }
    });

    return cols;
  }, [reportView]);

  /* ── Drilldown Columns ────────────────────────────────────── */
  const drilldownColumns = useMemo(() => [
    {
      field: 'S No',
      headerName: 'S.No',
      pinned: 'left',
      width: 60,
      suppressMovable: true,
      cellRenderer: (p) => (
        <span style={{ fontWeight: 800, fontSize: 11, fontFamily: 'monospace' }} className="text-slate-800 dark:text-white">
          {p.value}
        </span>
      )
    },
    {
      field: 'Name',
      headerName: 'Name',
      minWidth: 180,
      pinned: 'left',
      cellRenderer: (p) => {
        if (!p.value) return '—';
        return <span style={{ fontWeight: 600, fontSize: 13.5 }} className="text-slate-800 dark:text-white">{p.value}</span>;
      }
    },
    {
      field: 'Qualification',
      headerName: 'Qualification',
      minWidth: 180,
      cellRenderer: (p) => {
        if (!p.value) return <span className="text-slate-400 dark:text-slate-500">—</span>;
        return <span style={{ fontWeight: 600, fontSize: 13 }} className="text-slate-800 dark:text-slate-100">{p.value}</span>;
      }
    },
    {
      field: 'Experience (Years)',
      headerName: 'Experience',
      minWidth: 135,
      cellRenderer: (p) => {
        if (!p.value && p.value !== 0) return '—';
        return <span style={{ fontWeight: 600, fontSize: 13 }} className="text-slate-800 dark:text-slate-100">{p.value} Yrs</span>;
      }
    },
    {
      field: 'Skills',
      headerName: 'Skills',
      minWidth: 280,
      flex: 1.5,
      wrapText: true,
      autoHeight: true,
      cellClass: 'yp-wrap-cell text-slate-800 dark:text-slate-100',
      cellStyle: {
        fontSize: '13px',
        lineHeight: '1.6',
        paddingTop: '10px',
        paddingBottom: '10px',
        display: 'block'
      },
      valueFormatter: (p) => p.value ? p.value : '—'
    },
    {
      field: 'Role',
      headerName: 'Role',
      minWidth: 155,
      cellRenderer: (p) => {
        if (!p.value) return <span className="text-slate-400 dark:text-slate-500">—</span>;
        return <span style={{ fontWeight: 600, fontSize: 13 }} className="text-slate-800 dark:text-white">{p.value}</span>;
      }
    },
    {
      field: 'Salary (per month)',
      headerName: 'Salary',
      minWidth: 135,
      cellRenderer: (p) => {
        if (!p.value) return <span className="text-slate-400 dark:text-slate-500">—</span>;
        return (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 650,
              fontSize: 13.5
            }}
            className="text-emerald-700 dark:text-emerald-400"
          >
            ₹{Number(p.value).toLocaleString('en-IN')}
          </span>
        );
      }
    },
    {
      field: 'Appointment Date',
      headerName: 'Date of Appointment',
      minWidth: 180,
      cellRenderer: (p) => {
        if (!p.value) return <span className="text-slate-400 dark:text-slate-500">—</span>;
        return (
          <span style={{ fontWeight: 600, fontSize: 12.5, textAlign: 'center', width: '100%', display: 'block' }} className="text-slate-800 dark:text-slate-100">
            {p.value}
          </span>
        );
      }
    },
    {
      field: 'Document',
      headerName: 'Appointment Order',
      minWidth: 185,
      cellRenderer: (p) => {
        const fileName = p.value;
        if (fileName) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <a
                href={`${API_BASE}/download-yp-document?fileName=${encodeURIComponent(fileName)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontWeight: 600, fontSize: 13,
                  textDecoration: 'underline',
                }}
                className="text-blue-600 dark:text-blue-400"
              >
                Download Order
              </a>
            </div>
          );
        }
        return <span style={{ color: '#cbd5e1', display: 'block', textAlign: 'center' }}>—</span>;
      }
    },
    {
      field: 'Created At',
      headerName: 'Created At',
      minWidth: 165,
      cellRenderer: (p) => (
        <span style={{ fontSize: 11, fontWeight: 550, color: '#94a3b8', textAlign: 'center', width: '100%', display: 'block' }}>
          {p.value || '—'}
        </span>
      )
    },
    {
      field: 'Created By',
      headerName: 'Created By',
      minWidth: 145,
      cellRenderer: (p) => (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
          {p.value || '—'}
        </span>
      )
    },
    {
      field: 'Last Updated At',
      headerName: 'Last Updated At',
      minWidth: 170,
      cellRenderer: (p) => (
        <span style={{ fontSize: 11, fontWeight: 550, color: '#94a3b8', textAlign: 'center', width: '100%', display: 'block' }}>
          {p.value || '—'}
        </span>
      )
    }
  ], []);

  const columns = currentView.type === 'summary' ? summaryColumns : drilldownColumns;

  const aggregatedData = useMemo(() => {
    if (currentView.type !== 'summary') return data;

    if (reportView === 'wing') {
      const wingMap = {};
      data.forEach(item => {
        const wingId = item['Wing ID'] || item.wing_id;
        const wingName = item['Wing'] || item.wing;
        const inPost = Number(item['In Position'] || item.in_position || 0);
        if (wingId) {
          if (!wingMap[wingId]) {
            wingMap[wingId] = {
              'Wing ID': wingId,
              'Wing': wingName,
              'In Position': 0
            };
          }
          wingMap[wingId]['In Position'] += inPost;
        }
      });
      return Object.values(wingMap).map((item, idx) => ({ ...item, 'S No': idx + 1 }));
    }

    if (reportView === 'division') {
      const divisionMap = {};
      data.forEach(item => {
        const divId = item['Division ID'] || item.division_id;
        const divName = item['Division'] || item.division;
        const inPost = Number(item['In Position'] || item.in_position || 0);
        if (divId) {
          if (!divisionMap[divId]) {
            divisionMap[divId] = {
              'Division ID': divId,
              'Division': divName,
              'In Position': 0
            };
          }
          divisionMap[divId]['In Position'] += inPost;
        }
      });
      return Object.values(divisionMap).map((item, idx) => ({ ...item, 'S No': idx + 1 }));
    }

    return data;
  }, [data, reportView, currentView.type]);

  const pinnedBottomRowData = useMemo(() => {
    if (currentView.type !== 'summary') return undefined;
    const total = aggregatedData.reduce((sum, item) => sum + Number(item['In Position'] || 0), 0);
    return [
      {
        'S No': '',
        'Wing': 'Total',
        'Division': 'Total',
        'In Position': total,
        isTotalRow: true
      }
    ];
  }, [aggregatedData, currentView.type]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  useEffect(() => {
    if (aggregatedData && aggregatedData.length > 0) {
      registerReport({
        moduleName: 'Young Professionals',
        reportTitle: currentView.title,
        activeView: currentView.type === 'summary' ? `Summary (${reportView})` : 'Drilldown List',
        columns: columns,
        data: aggregatedData,
        rowCount: aggregatedData.length,
        pinnedBottom: pinnedBottomRowData,
        autoOpen: true
      });
    }
    return () => {
      clearReport();
    };
  }, [aggregatedData, currentView, columns, reportView, registerReport, clearReport, pinnedBottomRowData]);

  /* ── JSX ───────────────────────────────────────────────────── */
  return (
    <div>

      {/* ─ Header & Toolbar (Unified) ─ */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 relative rounded-t-2xl">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-3 min-w-[260px]">
          {drillDownPath.length > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
              <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">
                Young Professionals Report
              </span>
            </div>
            <h3 className="m-0 text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {currentView.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>As on date: <strong className="text-slate-800 dark:text-slate-200">15-07-2026</strong></span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Report for the month — <strong className="text-slate-800 dark:text-slate-200">July 2026</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Search, Wing View, Division View, Rows, Total & Refresh */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap w-full">
          {/* Filter controls group (Left-aligned within toolbar) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Box */}
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={currentView.type === 'summary' ? 'Search wing, division...' : 'Search name, role, skill...'}
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                className="w-full py-2 pl-9 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {quickFilter && (
                <button
                  onClick={() => setQuickFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Report View Selector */}
            {currentView.type === 'summary' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border-2 border-indigo-400/60 dark:border-indigo-500/60 text-xs shadow-sm">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-800 dark:text-indigo-300 whitespace-nowrap">
                    Report View:
                  </span>
                </div>
                <select
                  value={reportView}
                  onChange={(e) => setReportView(e.target.value)}
                  className="bg-transparent border-none text-xs font-extrabold text-indigo-950 dark:text-indigo-100 outline-none cursor-pointer pr-1 max-w-[200px]"
                >
                  <option value="wing" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">Wing</option>
                  <option value="division" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">Division</option>
                  <option value="all" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">Wing and Division</option>
                </select>
              </div>
            )}
          </div>

          {/* Action buttons group (Right-aligned within toolbar) */}
          <div className="flex items-center gap-2.5">
            {/* Copy button */}
            <CopyButton
              onCopy={handleCopy}
              className="!rounded-xl !py-2 !px-4"
            />

            {/* Export button */}
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
            />

            {/* Reset / Refresh */}
            <button
              onClick={fetchReportData}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ─ Grid ─ */}
      <div style={{ position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 24px', borderRadius: 14,
              background: '#fff', border: '1px solid #E4E6E2',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
            }}>
              <Loader2 size={18} color="#4b2424" className="animate-spin" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4b2424' }}>Loading report data…</span>
            </div>
          </div>
        )}

        <div className="ag-theme-quartz yp-pro-grid" style={{ width: '100%' }}>
          <Table
             ref={gridRef}
             theme="legacy"
             rowData={aggregatedData}
             columnDefs={columns}
             defaultColDef={defaultColDef}
             pagination={true}
             paginationPageSize={pageSize}
             domLayout="autoHeight"
             suppressColumnVirtualisation={true}
             quickFilterText={quickFilter}
             animateRows={true}
             headerHeight={46}
             onGridReady={onGridReady}
             autoSizeStrategy={{
               type: 'fitCellContents',
               skipHeader: false,
               scaleUpToFitGridWidth: true
             }}
             pinnedBottomRowData={pinnedBottomRowData}
             enableExport={false}
             color="#4b2424"
          />
        </div>
      </div>

      {/* ─ AG Grid Theme ─ */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .yp-pro-grid.ag-theme-quartz {
          --ag-font-family: 'Inter', system-ui, -apple-system, sans-serif;
          --ag-font-size: 13.5px;
          --ag-border-color: #B9BDC2;
          --ag-row-border-color: #D3D6D9;
          --ag-row-height: 52px;
          --ag-active-color: #4b2424;
          --ag-checkbox-checked-color: #4b2424;
          --ag-input-focus-border-color: #4b2424;
          --ag-range-selection-border-color: #4b2424;
          --ag-selected-row-background-color: #f7f3f3;
          --ag-control-panel-background-color: #4b2424;
          --ag-side-button-background-color: #4b2424;
          --ag-side-bar-panel-background-color: #4b2424;
          font-size: 13.5px;
        }

        /* ── SIDEBAR OVERRIDES ── */
        .yp-pro-grid .ag-side-bar,
        .yp-pro-grid .ag-tool-panel-wrapper,
        .yp-pro-grid .ag-side-buttons {
          background-color: #e9e9e9ff !important;
        }
        .yp-pro-grid .ag-side-button-button,
        .yp-pro-grid .ag-column-select-column,
        .yp-pro-grid .ag-column-select-header,
        .yp-pro-grid .ag-filter-toolpanel-header,
        .yp-pro-grid .ag-filter-toolpanel-body {
          color: #6b3535 !important;
          background-color: #e9e9e9ff !important;
        }
        .yp-pro-grid .ag-side-button-button {
          border-bottom: 1px solid #6b3535 !important;
        }
        .yp-pro-grid .ag-icon {
          color: #6b3535 !important;
        }
        .yp-pro-grid .ag-checkbox-input-wrapper {
          border-color: rgba(255, 255, 255, 0.5) !important;
        }
        .yp-pro-grid .ag-checkbox-input-wrapper.ag-checked {
          background-color: #fff !important;
        }
        .yp-pro-grid .ag-checkbox-input-wrapper.ag-checked::after {
          color: #4b2424 !important;
        }
        .yp-pro-grid .ag-text-field-input {
          background: #fff !important;
          color: #4b2424 !important;
          border-radius: 4px;
        }

        .yp-pro-grid .ag-root-wrapper {
          border: none !important;
          border-radius: 0 !important;
        }

        /* ── HEADER — Custom theme from user ── */
        .yp-pro-grid .ag-header {
          background: #4b2424ff !important;
          border-bottom: 2px solid !important;
        }

        .yp-pro-grid .ag-header-row {
          background: transparent !important;
        }

        .yp-pro-grid .ag-header-cell {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-right: 1px solid #4b2424ff !important;
          transition: background 0.15s !important;
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        .yp-pro-grid .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
          width: 100% !important;
        }

        .yp-pro-grid .ag-header-cell:hover {
          background: #6b3535ff !important;
        }

        .yp-pro-grid .ag-header-cell-label .ag-header-cell-text {
          color: #ffffff !important;
        }

        .yp-pro-grid .ag-header-cell .ag-icon {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .yp-pro-grid .ag-header-cell .ag-sort-indicator-icon .ag-icon {
          color: #ffffff !important;
        }

        .yp-pro-grid .ag-header-cell-menu-button {
          opacity: 0.6 !important;
          transition: opacity 0.15s !important;
        }

        .yp-pro-grid .ag-header-cell:hover .ag-header-cell-menu-button {
          opacity: 1 !important;
        }

        /* ── DUAL TONE ROWS ── */
        .yp-pro-grid .ag-row {
          border-bottom: 1px solid #D3D6D9 !important;
          transition: all 0.1s ease !important;
        }

        /* Tone 1: Clean white */
        .yp-pro-grid .ag-row-even {
          background: #ffffff !important;
        }

        /* Tone 2: Soft sand tint */
        .yp-pro-grid .ag-row-odd {
          background: #f8faf6 !important;
        }

        .yp-pro-grid .ag-row:hover {
          background: #f6f8f5 !important;
        }

         /* ── CELLS ── */
        .yp-pro-grid .ag-cell {
          display: flex;
          align-items: center;
          padding-left: 14px !important;
          padding-right: 14px !important;
          border-right: 1px solid #D3D6D9 !important;
        }

        /* Force wrapping for columns with wrapText: true */
        .yp-pro-grid .ag-cell-wrap-text {
          white-space: normal !important;
          word-break: break-word !important;
          display: block !important;
          height: auto !important;
          min-height: 100% !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        .yp-pro-grid .ag-cell-wrap-text .ag-cell-value,
        .yp-pro-grid .ag-cell-wrap-text .ag-cell-wrapper {
          white-space: normal !important;
          word-break: break-word !important;
          overflow: visible !important;
          text-overflow: clip !important;
          display: block !important;
          height: auto !important;
        }

        /* Explicit class overrides for skills cell wrapping */
        .yp-pro-grid .ag-cell.yp-wrap-cell {
          white-space: normal !important;
          word-break: break-word !important;
          display: block !important;
          height: auto !important;
          min-height: 100% !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        .yp-pro-grid .ag-cell.yp-wrap-cell .ag-cell-value,
        .yp-pro-grid .ag-cell.yp-wrap-cell .ag-cell-wrapper {
          white-space: normal !important;
          word-break: break-word !important;
          overflow: visible !important;
          text-overflow: clip !important;
          display: block !important;
          height: auto !important;
        }

        .yp-pro-grid .ag-cell-focus {
          border: 1px solid #000000ff !important;
          border-radius: 4px !important;
        }

        /* ── PINNED COLUMNS ── */
        .yp-pro-grid .ag-pinned-left-header {
          border-right: 2px solid #4b2424ff !important;
        }

        .yp-pro-grid .ag-pinned-left-cols-container {
          box-shadow: 4px 0 12px rgba(0,0,0,0.04) !important;
        }

        /* ── PAGINATION ── */
        .yp-pro-grid .ag-paging-panel {
          border-top: 1px solid #D3D6D9 !important;
          background: #f8faf6 !important;
          padding: 10px 20px !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          color: #657386 !important;
        }

        .yp-pro-grid .ag-paging-button {
          cursor: pointer !important;
          border-radius: 6px !important;
          transition: background 0.15s !important;
        }

        .yp-pro-grid .ag-paging-button:hover {
          background: #f6f8f5 !important;
        }

        /* ── SCROLLBAR ── */
        .yp-pro-grid ::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .yp-pro-grid ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .yp-pro-grid ::-webkit-scrollbar-thumb {
          background: #4b2424ff;
          border-radius: 3px;
        }
        .yp-pro-grid ::-webkit-scrollbar-thumb:hover {
          background: #4b2424ff ;
        }

        /* ── DARK MODE OVERRIDES ── */
        .dark .yp-pro-grid.ag-theme-quartz {
          --ag-background-color: #090d16;
          --ag-foreground-color: #f1f5f9;
          --ag-border-color: #1e293b;
          --ag-row-border-color: #1e293b;
          --ag-active-color: #60a5fa;
          --ag-selected-row-background-color: #1e293b;
        }

        .dark .yp-pro-grid .ag-root-wrapper {
          background-color: #090d16 !important;
        }

        .dark .yp-pro-grid .ag-header {
          background: #0f172a !important;
          border-bottom: 2px solid #1e293b !important;
        }

        .dark .yp-pro-grid .ag-header-cell {
          color: #f1f5f9 !important;
          border-right: 1px solid #1e293b !important;
        }

        .dark .yp-pro-grid .ag-header-cell:hover {
          background: #1e293b !important;
        }

        .dark .yp-pro-grid .ag-header-cell-label .ag-header-cell-text {
          color: #f1f5f9 !important;
        }

        .dark .yp-pro-grid .ag-row {
          border-bottom: 1px solid #1e293b !important;
          color: #e2e8f0 !important;
        }

        .dark .yp-pro-grid .ag-row-even {
          background: #090d16 !important;
        }

        .dark .yp-pro-grid .ag-row-odd {
          background: #0f172a !important;
        }

        .dark .yp-pro-grid .ag-row:hover {
          background: #1e293b !important;
        }

        .dark .yp-pro-grid .ag-cell {
          border-right: 1px solid #1e293b !important;
          color: #e2e8f0 !important;
        }

        .dark .yp-pro-grid .ag-paging-panel {
          border-top: 1px solid #1e293b !important;
          background: #0f172a !important;
          color: #94a3b8 !important;
        }

        .dark .yp-pro-grid .ag-paging-button:hover {
          background: #1e293b !important;
        }

        .dark .yp-pro-grid .ag-floating-bottom {
          background: #0f172a !important;
          color: #f8fafc !important;
          border-top: 2px solid #334155 !important;
        }

        .dark .yp-pro-grid .ag-floating-bottom .ag-row {
          background: #0f172a !important;
        }
      `}} />
    </div>
  );
}
