import React, { useRef, useMemo, useState, useEffect, forwardRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { FileSpreadsheet, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

const Table = forwardRef(({
  rowData = [],
  columnDefs = [],
  loading = false,
  pagination = true,
  paginationPageSize = 10,
  enableExport = false,
  exportFileName = 'export',
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [pageSize, setPageSize] = useState(paginationPageSize);

  // Sync pageSize state with paginationPageSize prop when changed dynamically from parent toolbar
  useEffect(() => {
    setPageSize(paginationPageSize);
  }, [paginationPageSize]);

  const onBtnExport = () => {
    const api = gridApi || activeRef.current?.api;
    if (api) {
      api.exportDataAsCsv({
        fileName: exportFileName,
      });
    }
  };

  const handleGridSizeChanged = (params) => {
    if (onGridSizeChanged) {
      onGridSizeChanged(params);
    }
  };

  const handleFirstDataRendered = (params) => {
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

  const activeAutoSizeStrategy = autoSizeStrategy !== undefined ? autoSizeStrategy : {
    type: 'fitGridWidth',
    defaultMinWidth: 100
  };

  // Pagination Ellipses Generator
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(0);

      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);

      if (currentPage <= 2) {
        end = maxVisiblePages - 1;
      } else if (currentPage >= totalPages - 3) {
        start = totalPages - maxVisiblePages;
      }

      if (start > 1) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages - 1);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="space-y-4 w-full relative">
      {enableExport && (
        <div className="flex justify-end">
          <button
            onClick={onBtnExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      )}

      {/* Main card box enclosing both the grid and custom pagination controls */}
      <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden relative shadow-sm bg-white">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl shadow-md">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-xs font-bold text-slate-700">Loading records...</span>
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

        {/* Custom Pagination inside the same card border-wrapper */}
        {pagination && totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-150 select-none bg-slate-50/50">
            <div className="text-[12.5px] font-semibold text-slate-550">
              Showing {totalRows === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRows)} of {totalRows} entries
            </div>

            <div className="flex items-center space-x-1 font-sans">
              {/* Previous page */}
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className={`flex items-center justify-center px-3 py-1.5 rounded border text-xs font-bold transition cursor-pointer select-none ${currentPage === 0
                    ? 'bg-white text-slate-350 border-slate-150 cursor-not-allowed'
                    : 'bg-white border-slate-250 hover:bg-slate-50'
                }`}
                style={currentPage !== 0 ? { color: color } : {}}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                <span>Previous</span>
              </button>

              {/* Page numbers */}
              {pageNumbers.map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs font-bold select-none">
                      ...
                    </span>
                  );
                }

                const isActive = currentPage === p;
                return (
                  <button
                    type="button"
                    key={`page-${p}`}
                    onClick={() => handlePageClick(p)}
                    className={`px-3 py-1.5 rounded text-xs font-extrabold transition cursor-pointer select-none ${
                      isActive
                        ? 'text-white border shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-250 hover:bg-slate-50'
                    }`}
                    style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    {p + 1}
                  </button>
                );
              })}

              {/* Next page */}
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className={`flex items-center justify-center px-3 py-1.5 rounded border text-xs font-bold transition cursor-pointer select-none ${currentPage === totalPages - 1
                    ? 'bg-white text-slate-355 border-slate-150 cursor-not-allowed'
                    : 'bg-white border-slate-250 hover:bg-slate-50'
                }`}
                style={currentPage !== totalPages - 1 ? { color: color } : {}}
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default Table;