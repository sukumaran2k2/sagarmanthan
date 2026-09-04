import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ChevronLeft, FileSpreadsheet, Download, Search, Loader2, RefreshCw, X, TrendingUp, Copy } from 'lucide-react';
import TablePagination from './TablePagination';
import { useAICopilot } from '../context/AICopilotContext';

export default function ReportTable({
  title,
  subtitle,
  eyebrow,
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
  themeClass = 'mopsw-pro-grid',
  brandColor = '#0f417a',
  brandColorHover = '#1e3a8a',
  accentColor = '#f1f5f9',
  oddRowColor = '#f8fafc',
  totalLabel = 'Total',
  pinnedBottomRowData = undefined,
  toolbarExtra = null,
  filterPanel = null,
  autoHeaderHeight = false,
  showColumnVisibility = true,
}) {
  const { registerReport, clearReport } = useAICopilot();

  // Detail titles with "|" keep the full string in the eyebrow (legacy Form 8.2).
  // Summary titles use the segment before " - ".
  const eyebrowText =
    eyebrow ||
    (String(title || '').includes('|')
      ? title
      : String(title || '').split(/\s[-–—]\s/)[0] || title || 'Report');
  const gridRef = useRef(null);
  const dropdownRef = useRef(null);
  const visibilityDropdownRef = useRef(null);
  const [quickFilter, setQuickFilter] = useState('');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [visibilityDropdownOpen, setVisibilityDropdownOpen] = useState(false);
  const [hiddenColKeys, setHiddenColKeys] = useState(new Set());

  // Helper to extract leaf columns from columns tree (supporting grouped columns)
  const leafColumns = useMemo(() => {
    const extract = (cols) => {
      const list = [];
      (cols || []).forEach(col => {
        if (col.children && Array.isArray(col.children) && col.children.length > 0) {
          list.push(...extract(col.children));
        } else {
          const key = col.colId || col.field || col.headerName;
          if (key) {
            list.push({
              key,
              label: col.headerName || col.field || key,
              pinned: col.pinned
            });
          }
        }
      });
      return list;
    };
    return extract(columns);
  }, [columns]);

  // Compute effective columns applying hide flag
  const effectiveColumns = useMemo(() => {
    const applyVisibility = (cols) => {
      return (cols || []).map(col => {
        if (col.children && Array.isArray(col.children) && col.children.length > 0) {
          return {
            ...col,
            children: applyVisibility(col.children)
          };
        }
        const key = col.colId || col.field || col.headerName;
        return {
          ...col,
          hide: hiddenColKeys.has(key)
        };
      });
    };
    return applyVisibility(columns);
  }, [columns, hiddenColKeys]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    if (title && (viewData.length > 0 || rawData.length > 0)) {
      registerReport({
        reportTitle: title,
        eyebrow: eyebrowText,
        columns: columns,
        data: viewData.length > 0 ? viewData : rawData,
        rowCount: viewData.length || rawData.length,
        pinnedBottom: pinnedBottomRowData,
        autoOpen: true
      });
    }
    return () => {
      clearReport();
    };
  }, [title, viewData, rawData, columns, registerReport, clearReport, eyebrowText, pinnedBottomRowData]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
      if (visibilityDropdownRef.current && !visibilityDropdownRef.current.contains(event.target)) {
        setVisibilityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure full width auto-fit whenever columns, data, or drilldown view changes
  useEffect(() => {
    if (gridRef.current?.api) {
      const timer = setTimeout(() => {
        try {
          gridRef.current.api.sizeColumnsToFit();
          requestAnimationFrame(() => {
            if (gridRef.current?.api) gridRef.current.api.resetRowHeights();
          });
        } catch (_) {}
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [effectiveColumns, viewData, title]);

  const handlePaginationChanged = (params) => {
    if (params.api) {
      setCurrentPage(params.api.paginationGetCurrentPage());
      setTotalPages(params.api.paginationGetTotalPages());
      setTotalRows(params.api.paginationGetRowCount());
      setPageSize(params.api.paginationGetPageSize());
    }
  };

  const handlePageClick = (pageIndex) => {
    if (gridRef.current?.api) {
      gridRef.current.api.paginationGoToPage(pageIndex);
    }
  };

  const handlePrevPage = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.paginationGoToPreviousPage();
    }
  };

  const handleNextPage = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.paginationGoToNextPage();
    }
  };

  const formatExportFileName = (type) => {
    const cleanTitle = (title || 'Report')
      .replace(/[:\/\\?%*|"<>]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    
    return `${cleanTitle}_${dateStr}_${timeStr}.${type === 'Excel' ? 'csv' : 'pdf'}`;
  };

  const getLeafColumns = (cols) => {
    let result = [];
    (cols || []).forEach((col) => {
      if (col.children && Array.isArray(col.children)) {
        result = result.concat(getLeafColumns(col.children));
      } else if (col.field || col.headerName) {
        result.push(col);
      }
    });
    return result;
  };

  const handleExport = (type) => {
    try {
      const fileName = formatExportFileName(type);
      if (type === 'Excel') {
        if (gridRef.current?.api) {
          gridRef.current.api.exportDataAsCsv({
            fileName: fileName
          });
          if (triggerNotification && typeof triggerNotification === 'function') {
            triggerNotification(`Report exported to Excel successfully! (${fileName})`);
          }
        }
      } else if (type === 'PDF') {
        const leafCols = getLeafColumns(columns).filter(c => c.field !== 'Ministry Id' && c.field !== 'Ministry ID');
        const docTitle = title || 'Report';

        let headersHtml = '';
        leafCols.forEach(col => {
          const hName = col.headerName || col.field || '';
          headersHtml += `<th style="border:1px solid ${brandColor}; padding:10px 14px; text-align:center; background:${brandColor}; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${hName}</th>`;
        });

        let rowsHtml = '';
        (viewData || []).forEach((row, i) => {
          const bg = i % 2 === 0 ? '#fff' : oddRowColor;
          rowsHtml += `<tr style="background:${bg}">`;
          leafCols.forEach(col => {
            let val = '';
            if (col.field === 'S No' || col.field === 'S.No' || col.headerName === 'S No' || col.headerName === 'S.No') {
              val = i + 1;
            } else if (col.valueFormatter && typeof col.valueFormatter === 'function') {
              try { val = col.valueFormatter({ value: row[col.field], data: row }); } catch (_) { val = row[col.field]; }
            } else {
              val = row[col.field] !== undefined && row[col.field] !== null ? row[col.field] : '';
            }
            if (typeof val === 'object') val = '';
            rowsHtml += `<td style="border:1px solid #e2e8f0; padding:8px 14px; font-size:12px; color:#334155; text-align:center;">${val}</td>`;
          });
          rowsHtml += '</tr>';
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          if (triggerNotification && typeof triggerNotification === 'function') {
            triggerNotification('Popup blocker prevented opening PDF print preview window.');
          }
          return;
        }

        printWindow.document.write(`<html><head><title>${docTitle}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#334155;padding:24px}h1{font-size:18px;margin-bottom:4px;color:${brandColor}}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${docTitle}</h1><p style="font-size:11px;color:#64748b;margin:0 0 20px">Generated on: ${new Date().toLocaleString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
        printWindow.document.close();

        if (triggerNotification && typeof triggerNotification === 'function') {
          triggerNotification('PDF document generated successfully!');
        }
      }
    } catch (err) {
      console.error("Export error caught safely:", err);
      if (triggerNotification && typeof triggerNotification === 'function') {
        triggerNotification('An error occurred during export.');
      }
    }
  };

  const handleCopy = () => {
    if (!gridRef.current?.api) {
      triggerNotification?.('Grid is not ready for copy yet.', 'warning');
      return;
    }
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

    navigator.clipboard.writeText(tsv)
      .then(() => {
        triggerNotification?.('Report copied to clipboard!', 'success');
      })
      .catch((err) => {
        console.error('Copy failed', err);
        triggerNotification?.('Failed to copy report data.', 'error');
      });
  };

  const iconBtnClass =
    'inline-flex items-center justify-center w-9 h-9 rounded-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-[color:var(--theme-primary-color)] hover:border-[color:var(--theme-primary-color)] transition cursor-pointer';
  const ghostBtnClass =
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-[color:var(--theme-primary-color)] dark:text-slate-200 hover:bg-[color:var(--theme-accent-color)] dark:hover:bg-slate-800 transition cursor-pointer';

  return (
    <div
      style={{
        '--theme-primary-color': brandColor,
        '--theme-primary-hover': brandColorHover,
        '--theme-accent-color': accentColor,
        '--theme-row-odd-bg': oddRowColor,
      }}
    >
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-[26px] py-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#fdfcfc] to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          {showBackButton && (
            <button type="button" onClick={onBack} className={iconBtnClass} style={{ color: brandColor }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-[color:var(--theme-primary-color)] dark:text-slate-200" strokeWidth={2.5} />
              <span className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold text-[color:var(--theme-primary-color)] dark:text-slate-200">
                {eyebrowText}
              </span>
            </div>
            <h3 className="m-0 text-xl font-bold tracking-wide text-[color:var(--theme-primary-color)] dark:text-slate-100">
              {title}
            </h3>
            {subtitle && (
              <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative w-60">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--theme-primary-color)] dark:text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search reports..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-[13.5px] font-medium rounded-[9px] outline-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-[color:var(--theme-primary-color)] focus:ring-[3px] focus:ring-[color:var(--theme-primary-color)]/10 transition"
            />
            {quickFilter && (
              <button
                type="button"
                onClick={() => setQuickFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer bg-transparent border-0 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {toolbarExtra}

          {/* Column Visibility Dropdown */}
          {showColumnVisibility && leafColumns.length > 0 && (
            <div ref={visibilityDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setVisibilityDropdownOpen(!visibilityDropdownOpen)}
                className={ghostBtnClass}
              >
                <span>Visibility</span>
                <span className="text-[10px]">▾</span>
              </button>

              {visibilityDropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-56 max-h-80 overflow-y-auto rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-2 flex flex-col space-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
                    <button
                      type="button"
                      onClick={() => setHiddenColKeys(new Set())}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                  {leafColumns.map(({ key, label }) => {
                    const isVisible = !hiddenColKeys.has(key);
                    return (
                      <label
                        key={key}
                        className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {
                            setHiddenColKeys(prev => {
                              const next = new Set(prev);
                              if (next.has(key)) {
                                next.delete(key);
                              } else {
                                next.add(key);
                              }
                              return next;
                            });
                          }}
                          className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="truncate max-w-[200px]">{label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={handleCopy} className={ghostBtnClass}>
            <Copy size={15} />
            <span>Copy</span>
          </button>

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-white text-[13px] font-semibold border-0 cursor-pointer transition hover:bg-[color:var(--theme-primary-hover)]"
              style={{ background: brandColor }}
            >
              <span>Export</span>
              <span className="text-[10px]">▾</span>
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-40 overflow-hidden rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    handleExport('Excel');
                    setExportDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border-0 bg-transparent cursor-pointer font-medium"
                >
                  <FileSpreadsheet size={14} className="text-emerald-500" />
                  <span>CSV (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('PDF');
                    setExportDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border-0 bg-transparent cursor-pointer font-medium"
                >
                  <Download size={14} className="text-rose-500" />
                  <span>Print / PDF</span>
                </button>
              </div>
            )}
          </div>

          {onRefresh && (
            <button type="button" onClick={onRefresh} className={iconBtnClass}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {filterPanel && (
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-900/60 animate-fade-in">
          {filterPanel}
        </div>
      )}

      <div className={`relative ${loading ? 'min-h-[260px]' : ''}`}>
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 space-y-4 bg-white/85 dark:bg-slate-900/85 backdrop-blur-[3px] animate-fade-in">
            <div className="w-full absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full animate-indeterminate-progress"
                style={{
                  background: `linear-gradient(to right, ${brandColor}, #38bdf8, ${brandColor})`
                }}
              ></div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-700 shadow-xl">
              <div className="relative flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-[#0f417a] dark:text-blue-400" />
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-25"
                  style={{ backgroundColor: brandColor }}
                ></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-wide text-slate-800 dark:text-slate-100">
                  Loading report data...
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Please wait a moment...
                </span>
              </div>
            </div>
          </div>
        )}

        <div className={`ag-theme-quartz ${themeClass} w-full`}>
          <AgGridReact
            ref={gridRef}
            theme="legacy"
            rowData={viewData}
            pinnedBottomRowData={pinnedBottomRowData}
            columnDefs={effectiveColumns}
            defaultColDef={defaultColDef}
            pagination={pagination}
            paginationPageSize={pageSize}
            suppressPaginationPanel={true}
            onPaginationChanged={handlePaginationChanged}
            domLayout="autoHeight"
            suppressColumnVirtualisation={true}
            quickFilterText={quickFilter}
            animateRows={true}
            headerHeight={autoHeaderHeight ? undefined : 46}
            autoHeaderHeight={autoHeaderHeight}
            onGridReady={(params) => {
              if (gridRef.current) gridRef.current.api = params.api;
              params.api.sizeColumnsToFit();
              requestAnimationFrame(() => params.api.resetRowHeights());
            }}
            onFirstDataRendered={(params) => {
              params.api.sizeColumnsToFit();
              requestAnimationFrame(() => params.api.resetRowHeights());
            }}
            onGridSizeChanged={(params) => {
              params.api.sizeColumnsToFit();
            }}
            onDisplayedColumnsChanged={(params) => {
              params.api.sizeColumnsToFit();
            }}
            autoSizeStrategy={{
              type: 'fitGridWidth',
              defaultMinWidth: 80
            }}
          />
        </div>
      </div>

      {pagination && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRows={totalRows}
          pageSize={pageSize}
          onPageChange={handlePageClick}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          color={brandColor}
        />
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .${themeClass}.ag-theme-quartz {
          --ag-font-family: 'Inter', system-ui, -apple-system, sans-serif;
          --ag-font-size: 13px;
          --ag-border-color: #cbd5e1;
          --ag-row-border-color: #e2e8f0;
          --ag-row-height: 40px;
          --ag-cell-horizontal-padding: 12px;
          --ag-active-color: var(--theme-primary-color);
          --ag-checkbox-checked-color: var(--theme-primary-color);
          --ag-input-focus-border-color: var(--theme-primary-color);
          --ag-range-selection-border-color: var(--theme-primary-color);
          --ag-selected-row-background-color: var(--theme-row-odd-bg);
          --ag-control-panel-background-color: var(--theme-primary-color);
          --ag-side-button-background-color: var(--theme-primary-color);
          --ag-side-bar-panel-background-color: var(--theme-primary-color);
          font-size: 13px;
        }

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

        .${themeClass} .ag-header {
          background-color: var(--theme-primary-color) !important;
          border-bottom: 2px solid rgba(0,0,0,0.08) !important;
        }
        .${themeClass} .ag-header-row {
          color: #ffffff !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          font-size: 11.5px !important;
        }
        .${themeClass} .ag-header-cell {
          border-right: 1px solid rgba(255,255,255,0.18) !important;
          padding-left: 12px !important;
          padding-right: 12px !important;
        }
        .${themeClass} .ag-header-cell:last-child {
          border-right: none !important;
        }
        .${themeClass} .ag-header-cell-text {
          color: #ffffff !important;
          font-weight: 800 !important;
          white-space: normal !important;
          text-align: center !important;
          line-height: 1.25 !important;
        }
        .${themeClass} .ag-header-cell .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
        }
        .${themeClass} .ag-header-group-cell {
          background-color: var(--theme-primary-color) !important;
          color: #ffffff !important;
          font-weight: 800 !important;
          border-right: 1px solid rgba(255,255,255,0.18) !important;
          border-bottom: 1px solid rgba(255,255,255,0.18) !important;
          text-align: center !important;
          justify-content: center !important;
        }
        .${themeClass} .ag-header-group-cell-label {
          justify-content: center !important;
          text-align: center !important;
          color: #ffffff !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          font-size: 12px !important;
        }
        .${themeClass} .ag-header-cell .ag-sort-indicator-icon .ag-icon {
          color: #ffffff !important;
        }

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

        .${themeClass} .ag-cell {
          display: flex;
          align-items: center;
          padding-left: 12px !important;
          padding-right: 12px !important;
          padding-top: 2px !important;
          padding-bottom: 2px !important;
          border-right: 1px solid #e2e8f0 !important;
        }
        .${themeClass} .ag-cell-wrap-text,
        .${themeClass} .ag-cell.mopsw-wrap-cell,
        .${themeClass} .ag-cell.yp-wrap-cell {
          white-space: normal !important;
          word-break: break-word !important;
          display: block !important;
          height: auto !important;
          min-height: 100% !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        .${themeClass} .ag-cell-wrap-text .ag-cell-value,
        .${themeClass} .ag-cell-wrap-text .ag-cell-wrapper,
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
        .${themeClass} .ag-pinned-left-header {
          border-right: 2px solid var(--theme-primary-color) !important;
        }
        .${themeClass} .ag-pinned-left-cols-container {
          box-shadow: 4px 0 12px rgba(0,0,0,0.04) !important;
        }
        .${themeClass} .ag-paging-panel {
          border-top: 1px solid #D3D6D9 !important;
          background: var(--theme-row-odd-bg, #f8faf6) !important;
          padding: 10px 20px !important;
          font-size: 12.5px !important;
          font-weight: 700 !important;
          color: var(--theme-primary-color, #4b2424) !important;
        }
        .${themeClass} .ag-paging-button {
          cursor: pointer !important;
          border-radius: 6px !important;
          transition: background 0.15s !important;
          color: var(--theme-primary-color, #4b2424) !important;
          opacity: 1 !important;
        }
        .${themeClass} .ag-paging-button:hover {
          background: var(--theme-accent-color, #f6f8f5) !important;
        }

        .${themeClass} .ag-paging-panel .ag-icon {
          color: var(--theme-primary-color, #4b2424) !important;
          opacity: 1 !important;
        }

        .${themeClass} .ag-paging-page-size-select select,
        .${themeClass} .ag-paging-row-summary-panel select {
          color: var(--theme-primary-color, #4b2424) !important;
          background-color: #ffffff !important;
          font-weight: 700 !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 2px 6px !important;
        }

        .${themeClass} .ag-paging-number,
        .${themeClass} .ag-paging-row-summary-panel {
          color: var(--theme-primary-color, #4b2424) !important;
          font-weight: 700 !important;
        }
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
        /* ── PINNED BOTTOM TOTAL ROW ── */
        .${themeClass} .ag-floating-bottom {
          background-color: #f1f5f9 !important;
          font-weight: 800 !important;
          border-top: 2px solid var(--theme-primary-color) !important;
        }
        .${themeClass} .ag-floating-bottom .ag-row {
          background-color: #f1f5f9 !important;
          font-weight: 800 !important;
          color: var(--theme-primary-color) !important;
        }
        .${themeClass} .ag-floating-bottom .ag-cell {
          font-weight: 800 !important;
          color: var(--theme-primary-color) !important;
        }
        .${themeClass} .ag-floating-bottom .ag-cell.text-center {
          text-align: center !important;
          justify-content: center !important;
          display: flex !important;
          align-items: center !important;
        }

        /* ── CENTER ALIGNMENT RULES FOR ALL NUMBERS ── */
        .${themeClass} .ag-cell.text-center,
        .${themeClass} .ag-cell-value.text-center,
        .${themeClass} .text-center {
          text-align: center !important;
          justify-content: center !important;
          display: flex !important;
          align-items: center !important;
        }
        .${themeClass} .ag-header-cell.text-center .ag-header-cell-label,
        .${themeClass} .ag-header-group-cell.text-center .ag-header-group-cell-label,
        .${themeClass} .headercenter .ag-header-cell-label,
        .${themeClass} .headercenter .ag-header-group-cell-label,
        .${themeClass} .text-center .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
        }

        /* ── NO-DATA OVERLAY ── */
        .${themeClass} .ag-overlay-no-rows-center {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #94a3b8 !important;
        }

        .dark .${themeClass}.ag-theme-quartz {
          --ag-border-color: #374151;
          --ag-row-border-color: #374151;
          --ag-background-color: #111827;
          --ag-foreground-color: #f1f5f9;
          --ag-data-color: #f1f5f9;
        }
        .dark .${themeClass} .ag-row {
          border-bottom-color: #374151 !important;
          color: #f1f5f9 !important;
        }
        .dark .${themeClass} .ag-row-even {
          background: #111827 !important;
        }
        .dark .${themeClass} .ag-row-odd {
          background: #1f2937 !important;
        }
        .dark .${themeClass} .ag-row:hover {
          background: #374151 !important;
        }
        .dark .${themeClass} .ag-cell {
          border-right-color: #374151 !important;
          color: #f1f5f9 !important;
        }
        .dark .${themeClass} .ag-paging-panel {
          border-top-color: #374151 !important;
          background: #0b0f19 !important;
          color: #9ca3af !important;
        }
        .dark .${themeClass} .ag-side-bar,
        .dark .${themeClass} .ag-tool-panel-wrapper,
        .dark .${themeClass} .ag-side-buttons,
        .dark .${themeClass} .ag-side-button-button,
        .dark .${themeClass} .ag-column-select-column,
        .dark .${themeClass} .ag-column-select-header,
        .dark .${themeClass} .ag-filter-toolpanel-header,
        .dark .${themeClass} .ag-filter-toolpanel-body {
          background-color: #111827 !important;
          color: #e2e8f0 !important;
        }
        .dark .${themeClass} .ag-text-field-input {
          background: #1f2937 !important;
          color: #f1f5f9 !important;
        }
        .dark .${themeClass} ::-webkit-scrollbar-track {
          background: #1f2937;
        }
      `}} />
    </div>
  );
}
