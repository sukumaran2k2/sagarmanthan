import React, { useRef, useMemo, useState, useEffect, forwardRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { FileSpreadsheet } from 'lucide-react';
import TablePagination from './TablePagination';

ModuleRegistry.registerModules([AllCommunityModule]);

const Table = forwardRef(({
  rowData = [],
  columnDefs = [],
  loading = false,
  loadingMessage = 'Fetching records from database...',
  pagination = true,
  paginationPageSize = 10,
  enableExport = false,
  exportFileName = 'export',
  exportLabel = 'Export CSV',
  exportColor,
  defaultColDef = {},
  autoSizeStrategy,
  onGridSizeChanged,
  onFirstDataRendered,
  onGridReady,
  onPaginationChanged,
  domLayout = 'autoHeight',
  color = '#28408f',
  ...props
}, ref) => {
  const localGridRef = useRef();
  const activeRef = ref || localGridRef;
  const [gridApi, setGridApi] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [pageSize, setPageSize] = useState(paginationPageSize);

  useEffect(() => {
    setPageSize(paginationPageSize);
  }, [paginationPageSize]);

  useEffect(() => {
    const api = gridApi || activeRef.current?.api;
    if (api) {
      const timer = setTimeout(() => {
        try {
          api.resetRowHeights();
        } catch (_) {}
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [rowData, columnDefs, gridApi]);

  const onBtnExport = () => {
    const api = gridApi || activeRef.current?.api;
    if (api) {
      api.exportDataAsCsv({
        fileName: exportFileName,
      });
    }
  };


  const handleGridSizeChanged = (params) => {
    if (params?.api) {
      try {
        params.api.sizeColumnsToFit();
        params.api.resetRowHeights();
      } catch (_) {}
    }
    if (onGridSizeChanged) {
      onGridSizeChanged(params);
    }
  };

  const handleFirstDataRendered = (params) => {
    if (params?.api) {
      try {
        params.api.sizeColumnsToFit();
        params.api.resetRowHeights();
      } catch (_) {}
    }
    if (onFirstDataRendered) {
      onFirstDataRendered(params);
    }
  };

  const handleGridReady = (params) => {
    if (params.api) {
      setGridApi(params.api);
      setCurrentPage(params.api.paginationGetCurrentPage());
      setTotalPages(params.api.paginationGetTotalPages());
      setTotalRows(params.api.paginationGetRowCount());
      setPageSize(params.api.paginationGetPageSize());
      try {
        params.api.sizeColumnsToFit();
        params.api.resetRowHeights();
      } catch (_) {}
    }
    if (onGridReady) {
      onGridReady(params);
    }
  };

  const handlePaginationChanged = (params) => {
    if (params.api) {
      if (!gridApi) {
        setGridApi(params.api);
      }
      setCurrentPage(params.api.paginationGetCurrentPage());
      setTotalPages(params.api.paginationGetTotalPages());
      setTotalRows(params.api.paginationGetRowCount());
      setPageSize(params.api.paginationGetPageSize());
    }
    if (onPaginationChanged) {
      onPaginationChanged(params);
    }
  };

  const handlePageClick = (pageIndex) => {
    const api = gridApi || activeRef.current?.api;
    if (api) {
      api.paginationGoToPage(pageIndex);
    }
  };

  const handlePrevPage = () => {
    const api = gridApi || activeRef.current?.api;
    if (api) {
      api.paginationGoToPreviousPage();
    }
  };

  const handleNextPage = () => {
    const api = gridApi || activeRef.current?.api;
    if (api) {
      api.paginationGoToNextPage();
    }
  };

  const processedColumnDefs = useMemo(() => {
    const processCol = (col) => {
      if (col.width || col.minWidth) {
        return col;
      }
      const headerText = col.headerName || col.field || '';
      const estimatedWidth = (headerText.length + 5) * 12;
      const updatedCol = {
        ...col,
        minWidth: col.minWidth !== undefined ? col.minWidth : estimatedWidth
      };
      if (updatedCol.children) {
        updatedCol.children = updatedCol.children.map(processCol);
      }
      return updatedCol;
    };
    return columnDefs.map(processCol);
  }, [columnDefs]);

  useEffect(() => {
    const api = gridApi || activeRef.current?.api;
    if (api) {
      const timer = setTimeout(() => {
        try {
          api.sizeColumnsToFit();
        } catch {
          // ignore
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [processedColumnDefs, rowData, gridApi]);

  const activeAutoSizeStrategy = autoSizeStrategy !== undefined ? autoSizeStrategy : {
    type: 'fitGridWidth',
    defaultMinWidth: 100
  };

  const colorClass = `custom-table-container-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="space-y-2 w-full relative">
      <style>{`
        .${colorClass} .ag-header,
        .${colorClass} .ag-header-row,
        .${colorClass} .ag-header-cell,
        .${colorClass} .ag-header-group-cell {
          background-color: ${color} !important;
          background: ${color} !important;
          color: #ffffff !important;
        }
        .${colorClass} .ag-header-cell-text,
        .${colorClass} .ag-header-group-cell-label {
          white-space: normal !important;
          word-break: break-word !important;
          text-align: center !important;
          justify-content: center !important;
          line-height: 1.25 !important;
          color: #ffffff !important;
        }
        .dark .${colorClass} .ag-row {
          background-color: #0f172a !important;
          color: #f8fafc !important;
          border-bottom-color: #1e293b !important;
        }
        .dark .${colorClass} .ag-row-even {
          background-color: #090d16 !important;
        }
        .dark .${colorClass} .ag-row-odd {
          background-color: #0f172a !important;
        }
        .dark .${colorClass} .ag-row:hover {
          background-color: #1e293b !important;
        .dark .${colorClass} .ag-cell {
          color: #f8fafc !important;
          border-right-color: #1e293b !important;
        }
        .${colorClass} .ag-cell.mopsw-wrap-cell,
        .${colorClass} .ag-cell.mopsw-wrap-cell .ag-cell-value,
        .${colorClass} .ag-cell.mopsw-wrap-cell .ag-cell-wrapper,
        .${colorClass} .ag-cell-wrap-text,
        .${colorClass} .ag-cell-wrap-text .ag-cell-value,
        .${colorClass} .ag-cell-wrap-text .ag-cell-wrapper {
          white-space: normal !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          line-height: 1.35 !important;
        }
        @keyframes indeterminateProgress {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(0%) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(1); }
        }
        .animate-indeterminate-progress {
          animation: indeterminateProgress 1.4s infinite ease-in-out;
          transform-origin: left;
        }
      `}</style>

      {enableExport && (
        <div className="flex justify-end">
          <button
            onClick={onBtnExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            style={exportColor ? { backgroundColor: exportColor } : undefined}
            onMouseEnter={(e) => { if (exportColor) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { if (exportColor) e.currentTarget.style.opacity = '1'; }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{exportLabel}</span>
          </button>
        </div>
      )}

      <div className={`ag-theme-quartz ${colorClass} rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-sm bg-white dark:bg-slate-900 transition-all ${loading ? 'min-h-[260px]' : ''}`}>
        {loading && (
          <div className="absolute inset-0 bg-white/85 dark:bg-slate-950/85 z-30 flex flex-col items-center justify-center p-6 space-y-4 backdrop-blur-[3px] animate-fade-in">
            <div className="w-full absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full animate-indeterminate-progress"
                style={{
                  background: `linear-gradient(to right, ${color}, #38bdf8, ${color})`
                }}
              ></div>
            </div>
            <div className="px-5 py-3.5 bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 flex items-center space-x-3.5 shadow-xl">
              <div className="relative flex items-center justify-center">
                <div
                  className="animate-spin rounded-full h-6 w-6 border-2.5 border-t-transparent"
                  style={{ borderColor: `${color} transparent ${color} ${color}` }}
                ></div>
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-25"
                  style={{ backgroundColor: color }}
                ></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-wide text-slate-800 dark:text-slate-100">
                  {loadingMessage}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Please wait a moment...
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <AgGridReact
            ref={activeRef}
            theme="legacy"
            rowData={rowData}
            columnDefs={processedColumnDefs}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
              wrapHeaderText: true,
              autoHeaderHeight: true,
              cellStyle: { textAlign: 'center' },
              ...defaultColDef
            }}
            pagination={pagination}
            paginationPageSize={paginationPageSize}
            suppressPaginationPanel={true}
            domLayout={domLayout}
            suppressColumnVirtualisation={true}
            autoSizeStrategy={activeAutoSizeStrategy}
            onGridSizeChanged={handleGridSizeChanged}
            onFirstDataRendered={handleFirstDataRendered}
            onGridReady={handleGridReady}
            onPaginationChanged={handlePaginationChanged}
            {...props}
          />
        </div>

        {pagination && totalPages > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageChange={handlePageClick}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            color={color}
          />
        )}
      </div>
    </div>
  );
});

export default Table;
