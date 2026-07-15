import { useState, useMemo } from 'react';
import { FileSpreadsheet, Copy, FileText, ClipboardList, AlertTriangle } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function VIPReferenceReports({ vipReferences }) {
  const [reportType, setReportType] = useState('pendency'); // 'pendency' or 'abstract'
  const wingsList = ['Shipping', 'Ports', 'Sagarmala', 'Special Initiatives & Projects', 'IWT', 'Administration', 'Development', 'Finance'];

  // Helper to calculate pending days
  const getPendingDays = (ref) => {
    if (ref.statusSteps[6] === 'Yes') return 0; // Disposed, not pending
    const receivedDateStr = ref.statusDates[1];
    if (!receivedDateStr) return 0;
    const receivedDate = new Date(receivedDateStr);
    const currentDate = new Date('2026-07-01'); // Fixed current date from metadata/As on date
    const diffTime = Math.abs(currentDate - receivedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 1. Pendency Report Data
  const pendencyRows = useMemo(() => {
    return wingsList.map((wing) => {
      const wingRefs = vipReferences.filter(
        (p) => p.wing.toLowerCase() === wing.toLowerCase()
      );

      const pendingRefs = wingRefs.filter((p) => p.statusSteps[6] !== 'Yes');

      const counts = {
        total: pendingRefs.length,
        under15: pendingRefs.filter((p) => getPendingDays(p) < 15).length,
        between15And30: pendingRefs.filter((p) => {
          const days = getPendingDays(p);
          return days >= 15 && days <= 30;
        }).length,
        over30: pendingRefs.filter((p) => getPendingDays(p) > 30).length,
      };

      return {
        wing,
        ...counts,
      };
    });
  }, [vipReferences]);

  const pendencyPinnedBottom = useMemo(() => {
    const totals = {
      wing: 'Total',
      total: pendencyRows.reduce((sum, r) => sum + r.total, 0),
      under15: pendencyRows.reduce((sum, r) => sum + r.under15, 0),
      between15And30: pendencyRows.reduce((sum, r) => sum + r.between15And30, 0),
      over30: pendencyRows.reduce((sum, r) => sum + r.over30, 0),
    };
    return [totals];
  }, [pendencyRows]);

  // 2. Abstract Report Data
  const abstractRows = useMemo(() => {
    return wingsList.map((wing) => {
      const wingRefs = vipReferences.filter(
        (p) => p.wing.toLowerCase() === wing.toLowerCase()
      );

      const counts = {
        total: wingRefs.length,
        received: wingRefs.filter((p) => p.statusSteps[1] === 'Yes').length,
        submitted: wingRefs.filter((p) => p.statusSteps[2] === 'Yes').length,
        sought: wingRefs.filter((p) => p.statusSteps[3] === 'Yes').length,
        receivedComments: wingRefs.filter((p) => p.statusSteps[4] === 'Yes').length,
        furnished: wingRefs.filter((p) => p.statusSteps[5] === 'Yes').length,
        disposed: wingRefs.filter((p) => p.statusSteps[6] === 'Yes').length,
      };

      return {
        wing,
        ...counts,
      };
    });
  }, [vipReferences]);

  const abstractPinnedBottom = useMemo(() => {
    const totals = {
      wing: 'Total',
      total: abstractRows.reduce((sum, r) => sum + r.total, 0),
      received: abstractRows.reduce((sum, r) => sum + r.received, 0),
      submitted: abstractRows.reduce((sum, r) => sum + r.submitted, 0),
      sought: abstractRows.reduce((sum, r) => sum + r.sought, 0),
      receivedComments: abstractRows.reduce((sum, r) => sum + r.receivedComments, 0),
      furnished: abstractRows.reduce((sum, r) => sum + r.furnished, 0),
      disposed: abstractRows.reduce((sum, r) => sum + r.disposed, 0),
    };
    return [totals];
  }, [abstractRows]);

  const pendencyColDefs = useMemo(() => [
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
        `font-extrabold flex items-center border-r border-slate-100 ${params.node.rowPinned ? 'text-blue-900 bg-blue-50/30' : 'text-slate-800'
        }`
    },
    {
      headerName: 'Total Pending',
      field: 'total',
      minWidth: 150,
      cellClass: 'text-center font-bold text-slate-800 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Pending < 15 Days',
      field: 'under15',
      minWidth: 160,
      cellClass: 'text-center font-semibold text-emerald-600 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Pending 15-30 Days',
      field: 'between15And30',
      minWidth: 170,
      cellClass: 'text-center font-semibold text-amber-600 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Pending > 30 Days',
      field: 'over30',
      minWidth: 160,
      cellClass: 'text-center font-semibold text-red-500 flex items-center justify-center border-r border-slate-100',
    }
  ], []);

  const abstractColDefs = useMemo(() => [
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
        `font-extrabold flex items-center border-r border-slate-100 ${params.node.rowPinned ? 'text-blue-900 bg-blue-50/30' : 'text-slate-800'
        }`
    },
    {
      headerName: 'Total VIP References',
      field: 'total',
      minWidth: 180,
      cellClass: 'text-center font-bold text-slate-800 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Received at Ministry',
      field: 'received',
      minWidth: 180,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Submitted for Approval',
      field: 'submitted',
      minWidth: 200,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Comments Sought',
      field: 'sought',
      minWidth: 180,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Comments Received',
      field: 'receivedComments',
      minWidth: 180,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Reply Furnished',
      field: 'furnished',
      minWidth: 160,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
    },
    {
      headerName: 'Disposed',
      field: 'disposed',
      minWidth: 140,
      cellClass: 'text-center font-semibold text-emerald-600 flex items-center justify-center border-r border-slate-100',
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

  const secondaryTabs = [
    { id: 'pendency', label: 'Pendency Report', icon: AlertTriangle },
    { id: 'abstract', label: 'Abstract & Detailed Report', icon: ClipboardList }
  ];

  const currentRows = reportType === 'pendency' ? pendencyRows : abstractRows;
  const currentPinnedBottom = reportType === 'pendency' ? pendencyPinnedBottom : abstractPinnedBottom;
  const currentColDefs = reportType === 'pendency' ? pendencyColDefs : abstractColDefs;

  return (
    <div className="space-y-6">

      {/* Secondary Internal Navigation */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Report Type</span>
        <InternalNavigation
          tabs={secondaryTabs}
          currentTab={reportType}
          onTabChange={(tabId) => setReportType(tabId)}
        />
      </div>

      {/* Report Summary Card Header */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 font-display flex items-center gap-1.5 uppercase">
            {reportType === 'pendency'
              ? 'Report No.: 5.1A - Pendency ( Wing Wise ) - VIP References'
              : 'Report No.: 5.1A - Abstract ( Wing Wise ) - VIP References'
            }
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
          <span>Total Rows: <strong className="text-slate-800">{currentRows.length}</strong></span>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        <AgGridReact
          key={reportType}
          theme="legacy"
          rowData={currentRows}
          columnDefs={currentColDefs}
          pinnedBottomRowData={currentPinnedBottom}
          domLayout="autoHeight"
          rowHeight={46}
          headerHeight={38}
          suppressColumnVirtualisation={true}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          autoSizeStrategy={
            reportType === 'pendency'
              ? { type: 'fitGridWidth' }
              : { type: 'fitCellContents' }
          }
          onFirstDataRendered={(params) => {
            if (reportType === 'pendency') return;
            const allCols = params.api.getAllGridColumns();
            params.api.autoSizeColumns(allCols);
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const gridRoot = document.querySelector(`.ag-root-wrapper[grid-id="${params.api.getGridId()}"]`);
            const containerWidth = gridRoot?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) {
              params.api.sizeColumnsToFit();
            }
          }}
          onGridSizeChanged={(params) => {
            if (reportType === 'pendency') {
              params.api.sizeColumnsToFit();
              return;
            }
            const allCols = params.api.getAllGridColumns();
            params.api.autoSizeColumns(allCols);
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const gridRoot = document.querySelector(`.ag-root-wrapper[grid-id="${params.api.getGridId()}"]`);
            const containerWidth = gridRoot?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) {
              params.api.sizeColumnsToFit();
            }
          }}
        />
      </div>

    </div>
  );
}
