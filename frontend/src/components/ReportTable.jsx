import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ChevronLeft, FileSpreadsheet, Download, Search, Users, Loader2, RefreshCw, X, TrendingUp, Copy } from 'lucide-react';

export default function ReportTable({
  title,
  subtitle,
  onBack,
  showBackButton = false,
  rawData = [],
  viewData = [],
  columns = [],
  defaultColDef = {},
  loading = false,
  onRefresh,
  triggerNotification,
  pagination = false,
  themeClass = 'mopsw-pro-grid', // or 'yp-pro-grid'
  brandColor = '#0f417a', // primary brand color (e.g. blue for MoPSW, maroon for YP)
  brandColorHover = '#1e3a8a',
  accentColor = '#f1f5f9', // background accents
  oddRowColor = '#f8fafc',
  totalLabel = 'Total'
}) {
  const gridRef = useRef(null);
  const dropdownRef = useRef(null);
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

  const handleExport = (type) => {
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

      let headersHtml = '';
      columns.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid ${brandColor}; padding:10px 14px; text-align:left; background:${brandColor}; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      viewData.forEach((row, i) => {
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

  return (
    <div style={{
      '--theme-primary-color': brandColor,
      '--theme-primary-hover': brandColorHover,
      '--theme-accent-color': accentColor,
      '--theme-row-odd-bg': oddRowColor
    }}>
      {/* ─ Header & Toolbar (Unified) ─ */}
      <div style={{
        background: `linear-gradient(to right, #fdfcfc, ${oddRowColor})`,
        padding: '20px 26px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        position: 'relative'
      }}>
        {/* Left: Back Button & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 300 }}>
          {showBackButton && (
            <button
              onClick={onBack}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 9,
                background: '#fff', border: '1px solid #e2e8f0',
                color: brandColor, cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = accentColor}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <TrendingUp size={14} color={brandColor} strokeWidth={2.5} />
              <span style={{ fontSize: 10.5, color: brandColor, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>
                {title.split(' - ')[0] || 'Report'}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: brandColor, letterSpacing: '0.01em' }}>
              {title}
            </h3>
            {subtitle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12, fontWeight: 600, color: '#475569' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Right: Search, Total, Export & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} color={brandColor} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search reports..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              style={{
                width: '100%', padding: '8px 34px 8px 36px',
                border: '1px solid #e2e8f0', borderRadius: 9,
                fontSize: 13.5, fontWeight: 500, color: '#1e293b',
                outline: 'none', background: '#fff',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}1a`; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
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
          {/* <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 9,
            background: '#fff', border: '1px solid #e2e8f0',
          }}>
            <Users size={14} color={brandColor} />
            <span style={{ fontSize: 13, color: '#475569' }}>
              {totalLabel} <strong style={{ color: brandColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5 }}>{viewData.length}</strong>
            </span>
          </div> */}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 9,
              background: '#fff',
              color: brandColor, fontWeight: 600, fontSize: 13,
              border: '1px solid #e2e8f0', cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accentColor; }}
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
                background: brandColor,
                color: '#fff', fontWeight: 600, fontSize: 13,
                border: 'none', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = brandColorHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = brandColor; }}
            >
              <span>Export</span>
              <span style={{ fontSize: 10 }}>▾</span>
            </button>

            {exportDropdownOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10,
                boxShadow: `0 14px 34px -18px rgba(15,65,122,.15)`,
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
                    color: brandColor, fontSize: 13,
                    textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = accentColor}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <FileSpreadsheet size={14} color="#10b981" />
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
                    color: brandColor, fontSize: 13,
                    textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = accentColor}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Download size={14} color="#f43f5e" />
                  <span>Print / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Reset / Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 9,
                background: '#fff', border: '1px solid #e2e8f0',
                cursor: 'pointer', color: '#64748b',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = brandColor; e.currentTarget.style.borderColor = brandColor; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
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
              background: '#fff', border: '1px solid #e2e8f0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
            }}>
              <Loader2 size={18} color={brandColor} className="animate-spin" />
              <span style={{ fontSize: 13, fontWeight: 700, color: brandColor }}>Loading report data…</span>
            </div>
          </div>
        )}

        <div className={`ag-theme-quartz ${themeClass}`} style={{ width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            theme="legacy"
            rowData={viewData}
            columnDefs={columns}
            defaultColDef={defaultColDef}
            pagination={pagination}
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
            onGridReady={(params) => {
              if (gridRef.current) gridRef.current.api = params.api;
              params.api.sizeColumnsToFit();
            }}
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
        background: '#f8fafc', borderTop: '1px solid #e2e8f0'
      }}>
        {/* <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <FileSpreadsheet size={14} color="#cbd5e1" />
          <span>Showing {viewData.length} records</span>
        </div> */}
      </div>

      {/* ─ AG Grid Custom Styles Stylesheet Injection ─ */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .${themeClass}.ag-theme-quartz {
          --ag-font-family: 'Inter', system-ui, -apple-system, sans-serif;
          --ag-font-size: 13.5px;
          --ag-border-color: #cbd5e1;
          --ag-row-border-color: #e2e8f0;
          --ag-row-height: 52px;
          --ag-active-color: var(--theme-primary-color);
          --ag-checkbox-checked-color: var(--theme-primary-color);
          --ag-input-focus-border-color: var(--theme-primary-color);
          --ag-range-selection-border-color: var(--theme-primary-color);
          --ag-selected-row-background-color: var(--theme-row-odd-bg);
          --ag-control-panel-background-color: var(--theme-primary-color);
          --ag-side-button-background-color: var(--theme-primary-color);
          --ag-side-bar-panel-background-color: var(--theme-primary-color);
          font-size: 13.5px;
        }

        /* ── SIDEBAR OVERRIDES ── */
        .${themeClass} .ag-side-bar,
        .${themeClass} .ag-tool-panel-wrapper,
        .${themeClass} .ag-side-buttons {
          background-color: #f8fafc !important;
        }
        .${themeClass} .ag-side-button-button,
        .${themeClass} .ag-column-select-column,
        .${themeClass} .ag-column-select-header,
        .${themeClass} .ag-filter-toolpanel-header,
        .${themeClass} .ag-filter-toolpanel-body {
          color: var(--theme-primary-color) !important;
          background-color: #f8fafc !important;
        }
        .${themeClass} .ag-side-button-button {
          border-bottom: 1px solid var(--theme-primary-color) !important;
        }
        .${themeClass} .ag-icon {
          color: var(--theme-primary-color) !important;
        }
        .${themeClass} .ag-checkbox-input-wrapper {
          border-color: rgba(15, 65, 122, 0.5) !important;
        }
        .${themeClass} .ag-checkbox-input-wrapper.ag-checked {
          background-color: var(--theme-primary-color) !important;
        }
        .${themeClass} .ag-checkbox-input-wrapper.ag-checked::after {
          color: #fff !important;
        }
        .${themeClass} .ag-text-field-input {
          background: #fff !important;
          color: var(--theme-primary-color) !important;
          border-radius: 4px;
        }

        .${themeClass} .ag-root-wrapper {
          border: none !important;
          border-radius: 0 !important;
        }

        /* ── HEADER ── */
        .${themeClass} .ag-header {
          background: var(--theme-primary-color) !important;
          border-bottom: 2px solid var(--theme-primary-hover) !important;
        }

        .${themeClass} .ag-header-row {
          background: transparent !important;
        }

        .${themeClass} .ag-header-cell {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-right: 1px solid var(--theme-primary-color) !important;
          transition: background 0.15s !important;
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        .${themeClass} .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
          width: 100% !important;
        }

        .${themeClass} .ag-header-cell:hover {
          background: var(--theme-primary-hover) !important;
        }

        .${themeClass} .ag-header-cell-label .ag-header-cell-text {
          color: #ffffff !important;
        }

        .${themeClass} .ag-header-cell .ag-icon {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .${themeClass} .ag-header-cell .ag-sort-indicator-icon .ag-icon {
          color: #ffffff !important;
        }

        /* ── ROWS ── */
        .${themeClass} .ag-row {
          border-bottom: 1px solid #e2e8f0 !important;
          transition: all 0.1s ease !important;
        }

        .${themeClass} .ag-row-even {
          background: #ffffff !important;
        }

        .${themeClass} .ag-row-odd {
          background: var(--theme-row-odd-bg) !important;
        }

        .${themeClass} .ag-row:hover {
          background: var(--theme-accent-color) !important;
        }

        /* ── CELLS ── */
        .${themeClass} .ag-cell {
          display: flex;
          align-items: center;
          padding-left: 14px !important;
          padding-right: 14px !important;
          border-right: 1px solid #e2e8f0 !important;
        }

        .${themeClass} .ag-cell-wrap-text {
          white-space: normal !important;
          word-break: break-word !important;
          display: block !important;
          height: auto !important;
          min-height: 100% !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        .${themeClass} .ag-cell-wrap-text .ag-cell-value,
        .${themeClass} .ag-cell-wrap-text .ag-cell-wrapper {
          white-space: normal !important;
          word-break: break-word !important;
          overflow: visible !important;
          text-overflow: clip !important;
          display: block !important;
          height: auto !important;
        }

        .${themeClass} .ag-cell.mopsw-wrap-cell,
        .${themeClass} .ag-cell.yp-wrap-cell {
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
        .${themeClass} .ag-cell.mopsw-wrap-cell .ag-cell-value,
        .${themeClass} .ag-cell.mopsw-wrap-cell .ag-cell-wrapper,
        .${themeClass} .ag-cell.yp-wrap-cell .ag-cell-value,
        .${themeClass} .ag-cell.yp-wrap-cell .ag-cell-wrapper {
          white-space: normal !important;
          word-break: break-word !important;
          overflow: visible !important;
          text-overflow: clip !important;
          display: block !important;
          height: auto !important;
        }

        .${themeClass} .ag-cell-focus {
          border: 1px solid var(--theme-primary-color) !important;
          border-radius: 4px !important;
        }

        /* ── PINNED COLUMNS ── */
        .${themeClass} .ag-pinned-left-header {
          border-right: 2px solid var(--theme-primary-color) !important;
        }

        .${themeClass} .ag-pinned-left-cols-container {
          box-shadow: 4px 0 12px rgba(0,0,0,0.04) !important;
        }

        /* ── PAGINATION ── */
        .${themeClass} .ag-paging-panel {
          border-top: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          padding: 10px 20px !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          color: #64748b !important;
        }

        .${themeClass} .ag-paging-button {
          cursor: pointer !important;
          border-radius: 6px !important;
          transition: background 0.15s !important;
        }

        .${themeClass} .ag-paging-button:hover {
          background: var(--theme-accent-color) !important;
        }

        /* ── SCROLLBAR ── */
        .${themeClass} ::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .${themeClass} ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .${themeClass} ::-webkit-scrollbar-thumb {
          background: var(--theme-primary-color);
          border-radius: 3px;
        }

        /* ── NO-DATA OVERLAY ── */
        .${themeClass} .ag-overlay-no-rows-center {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #94a3b8 !important;
        }
      `}} />
    </div>
  );
}
