import React, { forwardRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const CommonTable = forwardRef(({
  rowData,
  columnDefs,
  defaultColDef = { minWidth: 80, suppressSizeToFit: false },
  entriesLimit = 10,
  onPaginationChanged,
  pinnedBottomRowData,
  rowHeight = 46,
  headerHeight = 38,
  autoSize = true,
  ...props
}, ref) => {

  // Auto-resize columns to fit screen space when rowData changes
  useEffect(() => {
    if (autoSize && ref && ref.current && ref.current.api) {
      setTimeout(() => {
        if (ref.current && ref.current.api) {
          ref.current.api.sizeColumnsToFit();
        }
      }, 100);
    }
  }, [rowData, autoSize, ref]);

  return (
    <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto">
      <AgGridReact
        ref={ref}
        theme="legacy"
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={entriesLimit}
        suppressPaginationPanel={true}
        onPaginationChanged={onPaginationChanged}
        domLayout="autoHeight"
        rowHeight={rowHeight}
        headerHeight={headerHeight}
        suppressColumnVirtualisation={true}
        {...props}
      />
    </div>
  );
});

CommonTable.displayName = 'CommonTable';

export default CommonTable;
