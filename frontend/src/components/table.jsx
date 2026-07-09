import React, { forwardRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const Table = forwardRef(({
  rowData = [],
  columnDefs,
  colDefs,
  defaultColDef = { minWidth: 80, suppressSizeToFit: false },
  pagination = true,
  paginationPageSize = 10,
  suppressPaginationPanel = false,
  rowHeight = 46,
  headerHeight = 44,
  onRowClicked,
  onPaginationChanged,
  enableExport = false,
  exportFileName = 'ExportData',
  exportPdfTitle = 'Data Report',
  ...props
}, ref) => {

  const finalColDefs = columnDefs || colDefs || [];

  const handleExportExcel = () => {
    if (!rowData.length) return;
    const cleanData = rowData.map(({ sno, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!rowData.length) return;
    const printWindow = window.open('', '_blank');
    const headers = Object.keys(rowData[0]);
    let tableHTML = `<table style="width:100%; border-collapse: collapse; font-family: Inter, sans-serif; font-size: 11px; margin-top: 15px;">`;
    tableHTML += `<tr style="background-color: #0f417a; color: white;"><th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">S.No</th>`;
    headers.filter(h => h !== 'sno' && h !== 'module' && h !== 'moduleName').forEach(h => {
      tableHTML += `<th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-weight: 700; text-transform: uppercase;">${h}</th>`;
    });
    tableHTML += `</tr>`;
    
    rowData.forEach((row) => {
      tableHTML += `<tr><td style="border: 1px solid #e2e8f0; padding: 8px;">${row.sno || '-'}</td>`;
      headers.filter(h => h !== 'sno' && h !== 'module' && h !== 'moduleName').forEach(h => {
        tableHTML += `<td style="border: 1px solid #e2e8f0; padding: 8px; color: #334155;">${row[h] || '-'}</td>`;
      });
      tableHTML += `</tr>`;
    });
    tableHTML += `</table>`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${exportPdfTitle}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 25px; color: #1e293b; }
            h1 { font-size: 20px; color: #0f417a; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <h1>${exportPdfTitle}</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          ${tableHTML}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 w-full">
      <div className="ag-theme-quartz rounded-2xl overflow-x-auto">
        <AgGridReact
          ref={ref}
          theme="legacy"
          rowData={rowData}
          columnDefs={finalColDefs}
          defaultColDef={defaultColDef}
          domLayout="autoHeight"
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          onRowClicked={onRowClicked}
          pagination={pagination}
          paginationPageSize={paginationPageSize}
          suppressPaginationPanel={suppressPaginationPanel}
          onPaginationChanged={onPaginationChanged}
          suppressColumnVirtualisation={true}
          autoSizeStrategy={{ type: 'fitCellContents' }}
          {...props}
        />
      </div>

      {enableExport && (
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 select-none pt-2">
          <span>Export as:</span>
          <button onClick={handleExportPDF} className="p-1.5 hover:bg-slate-100 rounded-lg text-rose-600 cursor-pointer transition">
            <FileText className="h-4.5 w-4.5" />
          </button>
          <button onClick={handleExportExcel} className="p-1.5 hover:bg-slate-100 rounded-lg text-emerald-600 cursor-pointer transition">
            <FileSpreadsheet className="h-4.5 w-4.5" />
          </button>
        </div>
      )}
    </div>
  );
});

Table.displayName = 'Table';

export default Table;
