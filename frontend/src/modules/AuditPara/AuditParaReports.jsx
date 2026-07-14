import { useMemo } from 'react';
import { FileSpreadsheet, Copy, FileText } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function AuditParaReports({ auditParas }) {
  const wingsList = ['Shipping', 'Ports', 'Sagarmala', 'Special Initiatives & Projects', 'IWT', 'Administration', 'Development', 'Finance'];

  const rows = useMemo(() => {
    return wingsList.map((wing) => {
      const wingParas = auditParas.filter(
        (p) => p.wing.toLowerCase() === wing.toLowerCase()
      );
      
      const counts = {
        total: wingParas.length,
        received: wingParas.filter((p) => p.statusSteps[1] === 'Yes').length,
        sought: wingParas.filter((p) => p.statusSteps[2] === 'Yes').length,
        receivedOrg: wingParas.filter((p) => p.statusSteps[3] === 'Yes').length,
        clarification: wingParas.filter((p) => p.statusSteps[4] === 'Yes').length,
        cag: wingParas.filter((p) => p.statusSteps[5] === 'Yes').length,
        accepted: wingParas.filter((p) => p.statusSteps[6] === 'Yes').length,
        dropped: wingParas.filter((p) => p.statusSteps[7] === 'Yes').length,
      };

      return {
        wing,
        ...counts,
      };
    });
  }, [auditParas]);

  const pinnedBottomRowData = useMemo(() => {
    const totals = {
      wing: 'Total',
      total: rows.reduce((sum, r) => sum + r.total, 0),
      received: rows.reduce((sum, r) => sum + r.received, 0),
      sought: rows.reduce((sum, r) => sum + r.sought, 0),
      receivedOrg: rows.reduce((sum, r) => sum + r.receivedOrg, 0),
      clarification: rows.reduce((sum, r) => sum + r.clarification, 0),
      cag: rows.reduce((sum, r) => sum + r.cag, 0),
      accepted: rows.reduce((sum, r) => sum + r.accepted, 0),
      dropped: rows.reduce((sum, r) => sum + r.dropped, 0),
    };
    return [totals];
  }, [rows]);

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowPinned ? '' : params.node.rowIndex + 1,
      width: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center'
    },
    {
      headerName: 'Wing',
      field: 'wing',
      minWidth: 200,
      pinned: 'left',
      cellClass: (params) => 
        `font-extrabold flex items-center border-r border-slate-100 ${
          params.node.rowPinned ? 'text-blue-900 bg-blue-50/30' : 'text-slate-800'
        }`
    },
    {
      headerName: 'No. of Audit Paras',
      field: 'total',
      minWidth: 160,
      cellClass: 'text-center font-bold text-slate-800 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Received at Ministry',
      field: 'received',
      minWidth: 180,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Comments Sought from Organisation',
      field: 'sought',
      minWidth: 280,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Comments Received from organisation',
      field: 'receivedOrg',
      minWidth: 290,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Under Clarification',
      field: 'clarification',
      minWidth: 175,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Comments Furnished to CAG',
      field: 'cag',
      minWidth: 220,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Accepted by CAG',
      field: 'accepted',
      minWidth: 165,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Dropped',
      field: 'dropped',
      minWidth: 120,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    }
  ], []);

  const handleGridWheel = (e) => {
    const container = e.currentTarget;
    if (container) {
      const gridBodyViewport = container.querySelector('.ag-body-viewport');
      if (gridBodyViewport && gridBodyViewport.scrollWidth > gridBodyViewport.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          gridBodyViewport.scrollLeft += e.deltaY;
          const isAtStart = gridBodyViewport.scrollLeft <= 0 && e.deltaY < 0;
          const isAtEnd = gridBodyViewport.scrollLeft + gridBodyViewport.clientWidth >= gridBodyViewport.scrollWidth && e.deltaY > 0;
          if (!isAtStart && !isAtEnd) {
            e.preventDefault();
          }
        }
      }
    }
  };

  const handleExport = (type) => {
    console.log(`${type} exported.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Report Summary Card Header */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 font-display flex items-center gap-1.5 uppercase">
            Report No.: 4.2A - Abstract ( Wing Wise ) - Audit Paras
          </h2>
          <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-wider">
            As On date: 1-7-2026 <span className="mx-2 text-slate-300">|</span> (Report for the Month - July 2026)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExport('Excel')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-100/50 transition cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export to Excel</span>
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100/50 transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Export to PDF</span>
          </button>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handleExport('Clipboard')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy</span>
          </button>
          <button
            onClick={() => handleExport('Excel')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
          <span>Total Rows: <strong className="text-slate-800">{rows.length}</strong></span>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        <AgGridReact
          theme="legacy"
          rowData={rows}
          columnDefs={colDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          domLayout="autoHeight"
          rowHeight={46}
          headerHeight={38}
          suppressColumnVirtualisation={true}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          autoSizeStrategy={{
            type: 'fitCellContents'
          }}
          onFirstDataRendered={(params) => {
            const allCols = params.api.getAllGridColumns();
            params.api.autoSizeColumns(allCols);
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) {
              params.api.sizeColumnsToFit();
            }
          }}
          onGridSizeChanged={(params) => {
            const allCols = params.api.getAllGridColumns();
            params.api.autoSizeColumns(allCols);
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) {
              params.api.sizeColumnsToFit();
            }
          }}
        />
      </div>

    </div>
  );
}
