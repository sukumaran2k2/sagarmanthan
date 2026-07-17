import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllEnterpriseModule, ModuleRegistry } from 'ag-grid-enterprise';
import { ChevronLeft, FileSpreadsheet, Download, Search, Users, Loader2, RefreshCw, X, TrendingUp, Copy } from 'lucide-react';
import axios from 'axios';

ModuleRegistry.registerModules([AllEnterpriseModule]);

const initials = n => n ? n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '';

export default function Reports({ triggerNotification }) {
  const gridRef = useRef(null);
  const dropdownRef = useRef(null);
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report No. 2.2A - Abstract ( Wing & Division Wise ) - Young Professionals' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
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

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
      setQuickFilter('');
    }
  };

  /* ── Summary Columns ──────────────────────────────────────── */
  const summaryColumns = useMemo(() => [
    {
      field: 'S No',
      headerName: 'S.No',
      pinned: 'left',
      suppressMovable: true,
      headerClass: 'yp-h-sno',
      cellRenderer: (p) => (
        <span style={{ fontWeight: 800, color: '#000000', fontSize: 11, fontFamily: 'monospace' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'Wing',
      headerName: 'Wing',
      flex: 1.5,
      minWidth: 200,
      headerClass: 'yp-header-left yp-h-wing',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13.5 }}>{p.value}</span>;
      }
    },
    {
      field: 'Division',
      headerName: 'Division',
      flex: 1.5,
      minWidth: 200,
      headerClass: 'yp-header-left yp-h-division',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13.5 }}>{p.value}</span>;
      }
    },
    {
      field: 'In Position',
      headerName: 'In Post',
      width: 150,
      headerClass: 'yp-h-position',
      cellRenderer: (p) => {
        const val = p.value;
        const divisionId = p.data["Division ID"];
        const divisionName = p.data["Division"];
        const wingName = p.data["Wing"];
        if (val > 0) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <button
                onClick={() => {
                  setDrillDownPath(prev => [
                    ...prev,
                    { type: 'drilldown', divisionId, title: `Candidates List - Wing: ${wingName} | Division: ${divisionName}` }
                  ]);
                  setQuickFilter('');
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: 0,
                  background: 'none',
                  color: '#000000', fontWeight: 700, fontSize: 12,
                  textDecoration: 'underline',
                  border: 'none', cursor: 'pointer',
                  transition: 'opacity 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {val} Active
              </button>
            </div>
          );
        }
        return <span style={{ color: '#657386', fontWeight: 600, display: 'block', textAlign: 'center' }}>—</span>;
      }
    }
  ], []);

  /* ── Drilldown Columns ────────────────────────────────────── */
  const drilldownColumns = useMemo(() => [
    {
      field: 'S No',
      headerName: 'S.No',
      pinned: 'left',
      suppressMovable: true,
      headerClass: 'yp-h-sno',
      cellRenderer: (p) => (
        <span style={{ fontWeight: 800, color: '#000000', fontSize: 11, fontFamily: 'monospace' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'Name',
      headerName: 'Name',
      minWidth: 200,
      pinned: 'left',
      headerClass: 'yp-h-name',
      cellRenderer: (p) => {
        if (!p.value) return '—';
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13.5 }}>{p.value}</span>;
      }
    },
    {
      field: 'Qualification',
      headerName: 'Qualification',
      minWidth: 180,
      headerClass: 'yp-h-qual',
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13 }}>{p.value}</span>;
      }
    },
    {
      field: 'Experience (Years)',
      headerName: 'Experience',
      minWidth: 135,
      headerClass: 'yp-h-exp',
      cellRenderer: (p) => {
        if (!p.value && p.value !== 0) return '—';
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13 }}>{p.value} Yrs</span>;
      }
    },
    {
      field: 'Skills',
      headerName: 'Skills',
      minWidth: 280,
      flex: 1.5,
      wrapText: true,
      autoHeight: true,
      headerClass: 'yp-h-skill',
      cellClass: 'yp-wrap-cell',
      cellStyle: {
        color: '#000000',
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
      headerClass: 'yp-h-role',
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13 }}>{p.value}</span>;
      }
    },
    {
      field: 'Salary (per month)',
      headerName: 'Salary',
      minWidth: 135,
      headerClass: 'yp-h-salary',
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            color: '#0F6E56',
            fontSize: 13.5
          }}>
            ₹{Number(p.value).toLocaleString('en-IN')}
          </span>
        );
      }
    },
    {
      field: 'Appointment Date',
      headerName: 'Date of Appointment',
      minWidth: 180,
      headerClass: 'yp-h-date',
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return (
          <span style={{ fontWeight: 600, color: '#000000', fontSize: 12.5, textAlign: 'center', width: '100%', display: 'block' }}>
            {p.value}
          </span>
        );
      }
    },
    {
      field: 'Document',
      headerName: 'Appointment Order',
      minWidth: 185,
      headerClass: 'yp-h-doc',
      cellRenderer: (p) => {
        const fileName = p.value;
        if (fileName) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <a
                href={`http://localhost:3000/download-yp-document?fileName=${encodeURIComponent(fileName)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#000000', fontWeight: 600, fontSize: 13,
                  textDecoration: 'underline',
                }}
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
      headerClass: 'yp-h-meta',
      cellRenderer: (p) => (
        <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textAlign: 'center', width: '100%', display: 'block' }}>
          {p.value || '—'}
        </span>
      )
    },
    {
      field: 'Created By',
      headerName: 'Created By',
      minWidth: 145,
      headerClass: 'yp-h-meta',
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
      headerClass: 'yp-h-meta',
      cellRenderer: (p) => (
        <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textAlign: 'center', width: '100%', display: 'block' }}>
          {p.value || '—'}
        </span>
      )
    }
  ], []);

  const columns = currentView.type === 'summary' ? summaryColumns : drilldownColumns;

  /* ── Data ──────────────────────────────────────────────────── */
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentView.type === 'summary') {
        const response = await axios.get("http://localhost:3000/yp-report");
        setData(response.data.rowData || []);
      } else if (currentView.type === 'drilldown') {
        const response = await axios.get(`http://localhost:3000/divisionwise-ypcandidate/0/${currentView.divisionId}`);
        setData(response.data.rowData || []);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  const onGridReady = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);

  /* ── Export ────────────────────────────────────────────────── */
  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `${currentView.title.replace(/\s+/g, '_')}_export.csv`
        });
        triggerNotification?.(`Report exported to Excel (CSV) successfully!`);
      }
    } else if (type === 'PDF') {
      triggerNotification?.(`Preparing PDF document...`);
      const printWindow = window.open('', '_blank');
      const title = currentView.title || 'Report';

      let headersHtml = '';
      columns.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid #4b2424; padding:10px 14px; text-align:left; background:#4b2424; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      data.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8faf6';
        rowsHtml += `<tr style="background:${bg}">`;
        columns.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S No') val = i + 1;
            else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
            else val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`<html><head><title>${title}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#4b2424;padding:24px}h1{font-size:18px;margin-bottom:4px;color:#4b2424}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${title}</h1><p style="font-size:11px;color:#657386;margin:0 0 20px">Generated on: ${new Date().toLocaleDateString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
      printWindow.document.close();
    }
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
        if (col.field === 'S No') val = index++;
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

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  /* ── JSX ───────────────────────────────────────────────────── */
  return (
    <div>

      {/* ─ Header & Toolbar (Unified) ─ */}
      <div style={{
        background: 'linear-gradient(to right, #fdfcfc, #f7f3f3)',
        padding: '20px 26px',
        borderBottom: '1px solid #eadede',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        position: 'relative'
      }}>
        {/* Left: Back Button & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 300 }}>
          {drillDownPath.length > 1 && (
            <button
              onClick={handleBack}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 9,
                background: '#fff', border: '1px solid #eadede',
                color: '#4b2424', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f7f3f3'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <TrendingUp size={14} color="#8c4242" strokeWidth={2.5} />
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#8c4242', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Young Professionals Report
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#4b2424', letterSpacing: '0.01em' }}>
              {currentView.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12, fontWeight: 600, color: '#8c4242' }}>
              <span>As on date: <strong style={{ color: '#4b2424' }}>15-07-2026</strong></span>
              <span style={{ color: '#eadede' }}>•</span>
              <span>Report for the month — <strong style={{ color: '#4b2424' }}>July 2026</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Search, Total, Export & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} color="#8c4242" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={currentView.type === 'summary' ? 'Search wing, division...' : 'Search name, role, skill...'}
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              style={{
                width: '100%', padding: '8px 34px 8px 36px',
                border: '1px solid #eadede', borderRadius: 9,
                fontSize: 13.5, fontWeight: 500, color: '#4b2424',
                outline: 'none', background: '#fff',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={e => { e.target.style.borderColor = '#4b2424'; e.target.style.boxShadow = '0 0 0 3px rgba(75,36,36,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#eadede'; e.target.style.boxShadow = 'none'; }}
            />
            {quickFilter && (
              <button
                onClick={() => setQuickFilter('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Total Pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 9,
            background: '#fff', border: '1px solid #eadede',
          }}>
            <Users size={14} color="#4b2424" /> 
            <span style={{ fontSize: 13, color: '#8c4242' }}>
              Total <strong style={{ color: '#4b2424', fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5 }}>{data.length}</strong>
            </span>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 9,
              background: '#fff',
              color: '#4b2424', fontWeight: 600, fontSize: 13,
              border: '1px solid #eadede', cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f7f3f3'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <Copy size={15} />
            <span>Copy</span>
          </button>

          {/* Export button */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 9,
                background: '#4b2424',
                color: '#fff', fontWeight: 600, fontSize: 13,
                border: 'none', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#6b3535'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4b2424'; }}
            >
              <span>Export</span>
              <span style={{ fontSize: 10 }}>▾</span>
            </button>

            {exportDropdownOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: '#ffffff', border: '1px solid #E4E6E2', borderRadius: 10,
                boxShadow: '0 14px 34px -18px rgba(11,37,69,.35)',
                zIndex: 50, minWidth: 160, overflow: 'hidden', padding: '0'
              }}>
                <button
                  onClick={() => {
                    handleExport('Excel');
                    setExportDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 14px', border: 'none', background: 'none',
                    color: '#4b2424', fontSize: 13,
                    textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F4F1'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <FileSpreadsheet size={14} color="#0F6E56" />
                  <span>CSV (Excel)</span>
                </button>
                <button
                  onClick={() => {
                    handleExport('PDF');
                    setExportDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 14px', border: 'none', background: 'none',
                    color: '#4b2424', fontSize: 13,
                    textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F4F1'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Download size={14} color="#D8572A" />
                  <span>Print / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Reset / Refresh */}
          <button
            onClick={fetchReportData}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 9,
              background: '#fff', border: '1px solid #E4E6E2',
              cursor: 'pointer', color: '#657386',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#4b2424'; e.currentTarget.style.borderColor = '#4b2424'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#657386'; e.currentTarget.style.borderColor = '#E4E6E2'; }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
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
          <AgGridReact
             ref={gridRef}
             theme="legacy"
             rowData={data}
             columnDefs={columns}
             defaultColDef={defaultColDef}
             pagination={true}
             paginationPageSize={15}
             paginationPageSizeSelector={[10, 15, 25, 50]}
             domLayout="autoHeight"
             suppressColumnVirtualisation={true}
             quickFilterText={quickFilter}
             animateRows={true}
             headerHeight={46}
             sideBar={{
               toolPanels: ['columns', 'filters'],
               defaultToolPanel: ''
             }}
             onGridReady={onGridReady}
             autoSizeStrategy={{
               type: 'fitCellContents',
               skipHeader: false,
               scaleUpToFitGridWidth: true
             }}
          />
        </div>
      </div>

      {/* ─ Footer ─ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '12px 20px',
        background: '#f8faf6', borderTop: '1px solid #D3D6D9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#657386', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <FileSpreadsheet size={14} color="#cbd5e1" />
          <span>Showing {data.length} records</span>
        </div>
      </div>

      {/* ─ AG Grid Theme ─ */}
      <style dangerouslySetInnerHTML={{ __html: `
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

        /* ── NO-DATA OVERLAY ── */
        .yp-pro-grid .ag-overlay-no-rows-center {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #94a3b8 !important;
        }
      `}} />
    </div>
  );
}
