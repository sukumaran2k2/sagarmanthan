import React, { useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function Table({
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
  ...props
}) {
  const gridRef = useRef();

  const onBtnExport = () => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.exportDataAsCsv({
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

  const processedColumnDefs = useMemo(() => {
    return columnDefs.map(col => {
      const headerText = col.headerName || col.field || '';
      // User Algorithm: (columnHeaderText.length() + 5)
      // Since AG Grid width values are in pixels, we multiply the character count by 12px (approximate char width + cell margins)
      const estimatedWidth = (headerText.length + 5) * 12;
      return {
        ...col,
        minWidth: col.minWidth ? Math.max(col.minWidth, estimatedWidth) : estimatedWidth
      };
    });
  }, [columnDefs]);

  const activeAutoSizeStrategy = autoSizeStrategy || {
    type: 'fitCellContents',
    skipHeader: false,
    scaleUpToFitGridWidth: true
  };

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

      <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden relative shadow-sm">
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
            ref={gridRef}
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
            domLayout="autoHeight"
            suppressColumnVirtualisation={true}
            autoSizeStrategy={activeAutoSizeStrategy}
            onGridSizeChanged={handleGridSizeChanged}
            onFirstDataRendered={handleFirstDataRendered}
            {...props}
          />
        </div>
      </div>
    </div>
  );
}