import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Copy
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const WINGS_LIST = [
  'Administration',
  'Development',
  'IWT',
  'Ports',
  'Sagarmala',
  'Shipping',
  'Special Initiatives & Projects'
];

export default function CabinetNotesReports({ notes = [] }) {
  const gridRef = useRef();
  const [selectedWing, setSelectedWing] = useState('All');
  const [notification, setNotification] = useState(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Derive REPORT_ROWS dynamically from the notes database
  const dynamicReportRows = useMemo(() => {
    return WINGS_LIST.map((wing, index) => {
      const wingNotes = notes.filter(n => n.wing === wing);
      const prep = wingNotes.filter(n => n.status === 'Preliminary DCN Prepared').length;
      const appMin = wingNotes.filter(n => n.status === 'Preliminary DCN Approved by Minister').length;
      const circIMC = wingNotes.filter(n => n.status === 'Circulated for IMC').length;
      const imcRec = wingNotes.filter(n => n.status === 'IMC Comments Received').length;
      const prepFinal = wingNotes.filter(n => n.status === 'Final DCN to be Prepared').length;
      const appFinal = wingNotes.filter(n => n.status === 'Final DCN Approved by Minister').length;
      const advPMO = wingNotes.filter(n => n.status === 'Advance Copy Sent to PMO & Cab').length;
      const appCab = wingNotes.filter(n => n.status === 'Approved by Cabinet').length;
      const hold = wingNotes.filter(n => n.status === 'On Hold').length;
      const comp = wingNotes.filter(n => n.status === 'Completed').length;
      const total = wingNotes.length;

      return {
        id: index + 1,
        wing,
        total,
        prep,
        appMin,
        circIMC,
        imcRec,
        prepFinal,
        appFinal,
        advPMO,
        appCab,
        hold,
        comp
      };
    });
  }, [notes]);

  // Filter rows based on selected wing
  const filteredRows = useMemo(() => {
    if (selectedWing === 'All') return dynamicReportRows;
    return dynamicReportRows.filter(r => r.wing === selectedWing);
  }, [dynamicReportRows, selectedWing]);

  // Aggregate totals
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => {
      acc.total += r.total;
      acc.prep += r.prep;
      acc.appMin += r.appMin;
      acc.circIMC += r.circIMC;
      acc.imcRec += r.imcRec;
      acc.prepFinal += r.prepFinal;
      acc.appFinal += r.appFinal;
      acc.advPMO += r.advPMO;
      acc.appCab += r.appCab;
      acc.hold += r.hold;
      acc.comp += r.comp;
      return acc;
    }, {
      total: 0, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0
    });
  }, [filteredRows]);

  // Calculate dynamic Donut segments percentages
  const donutPercentages = useMemo(() => {
    const total = totals.total || 1;
    const approvedPct = Math.round((totals.appCab / total) * 100);
    const pmoPct = Math.round((totals.advPMO / total) * 100);
    const draftPct = 100 - approvedPct - pmoPct;

    return {
      approved: approvedPct,
      pmo: pmoPct,
      draft: Math.max(0, draftPct)
    };
  }, [totals]);

  // Sync entriesLimit with AG Grid Pagination Page Size
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('paginationPageSize', entriesLimit);
    }
  }, [entriesLimit]);

  // Apply Quick Search to AG Grid
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('quickFilterText', searchQuery);
    }
  }, [searchQuery]);

  const handlePageChange = (page) => {
    if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
    }
  };

  // Handle AG Grid page change labels
  const onPaginationChanged = () => {
    if (gridRef.current && gridRef.current.api) {
      const page = gridRef.current.api.paginationGetCurrentPage() + 1;
      const total = gridRef.current.api.paginationGetTotalPages();
      setCurrentPage(page);
      setTotalPages(total || 1);
    }
  };

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

  // Define column definitions
  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-550 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center'
    },
    {
      headerName: 'Wing',
      field: 'wing',
      minWidth: 200,
      pinned: 'left',
      cellClass: 'text-slate-800 font-extrabold flex items-center border-r border-slate-100 hover:underline cursor-pointer'
    },
    {
      headerName: 'No. of Cabinet Notes',
      field: 'total',
      minWidth: 160,
      cellClass: 'text-center font-bold text-slate-800 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Preliminary DCN Prepared',
      field: 'prep',
      minWidth: 190,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Preliminary DCN Approved by Minister',
      field: 'appMin',
      minWidth: 270,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Circulated for IMC',
      field: 'circIMC',
      minWidth: 155,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'IMC Comments Received',
      field: 'imcRec',
      minWidth: 175,
      cellClass: 'text-center font-semibold text-slate-755 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Final DCN to be Prepared',
      field: 'prepFinal',
      minWidth: 195,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Final DCN Approved by Minister',
      field: 'appFinal',
      minWidth: 240,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Advance Copy Sent to PMO & Cab',
      field: 'advPMO',
      minWidth: 240,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Approved by Cabinet',
      field: 'appCab',
      minWidth: 165,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'On Hold',
      field: 'hold',
      minWidth: 100,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
      valueFormatter: (params) => params.value || ''
    },
    {
      headerName: 'Completed',
      field: 'comp',
      minWidth: 110,
      cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center',
      valueFormatter: (params) => params.value || ''
    }
  ], []);

  // Pinned bottom totals row
  const pinnedBottomRowData = useMemo(() => {
    return [{
      wing: 'Total',
      total: totals.total,
      prep: totals.prep,
      appMin: totals.appMin,
      circIMC: totals.circIMC,
      imcRec: totals.imcRec,
      prepFinal: totals.prepFinal,
      appFinal: totals.appFinal,
      advPMO: totals.advPMO,
      appCab: totals.appCab,
      hold: totals.hold,
      comp: totals.comp
    }];
  }, [totals]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in animate-pulse">
          <div className="p-1 bg-emerald-50 rounded-lg">
            <Check className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Notification</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{notification}</p>
          </div>
        </div>
      )}

      {/* Header Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Report No.: 6.1A - Abstract ( Wing Wise ) - Cabinet Notes MoPSW
          </h2>
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-bold mt-1">
            <span>As On date: 30-6-2026</span>
            <span>•</span>
            <span className="text-[#b33c56]">(Report for the Month - June 2026)</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isReportExpanded ? (
            <>
              {/* Wing Select Box */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wing:</span>
                <div className="relative min-w-[160px]">
                  <select 
                    value={selectedWing}
                    onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="All">--Show All--</option>
                    {dynamicReportRows.map(r => <option key={r.id} value={r.wing}>{r.wing}</option>)}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Export Action Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => triggerNotification('Abstract Excel generated.')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Export to Excel</span>
                </button>
                <button 
                  onClick={() => triggerNotification('Abstract PDF generated.')}
                  className="px-3.5 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Export to PDF</span>
                </button>
              </div>

              <button 
                onClick={() => setIsReportExpanded(false)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-250 shadow-sm transition cursor-pointer"
              >
                <span>Collapse</span>
                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsReportExpanded(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
            >
              <span>View Detailed Report</span>
            </button>
          )}
        </div>
      </div>

      {isReportExpanded ? (
        /* Table Container (Visible only when Expanded) */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-1.5">
              <button onClick={() => triggerNotification('Copied to clipboard.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"><Copy className="h-3.5 w-3.5" /> Copy</button>
              <button onClick={() => triggerNotification('Excel export initiated.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
              <button onClick={() => triggerNotification('PDF export initiated.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-655 flex items-center gap-1.5 cursor-pointer"><FileText className="h-3.5 w-3.5" /> PDF</button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">Show</span>
                <select 
                  value={entriesLimit} 
                  onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); }}
                  className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">entries</span>
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold w-56 text-slate-750"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Main Responsive Table */}
          <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
            <AgGridReact 
              ref={gridRef}
              theme="legacy"
              rowData={filteredRows}
              columnDefs={colDefs}
              pinnedBottomRowData={pinnedBottomRowData}
              pagination={true}
              paginationPageSize={entriesLimit}
              suppressPaginationPanel={true}
              onPaginationChanged={onPaginationChanged}
              domLayout="autoHeight"
              rowHeight={46}
              headerHeight={38}
              suppressColumnVirtualisation={true}
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

            {/* Custom Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
              <span className="text-slate-500 font-medium text-center sm:text-left">
                Showing <span className="font-bold text-slate-800">{filteredRows.length > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
                <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, filteredRows.length)}</span> of{' '}
                <span className="font-bold text-slate-800">{filteredRows.length}</span> entries
              </span>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                  if (totalPages > 6 && Math.abs(currentPage - p) > 1 && p !== 1 && p !== totalPages) {
                    if (p === 2 || p === totalPages - 1) {
                      return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        currentPage === p
                          ? 'bg-[#0f417a] text-white shadow-sm'
                          : 'border border-slate-200 text-slate-655 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Charts Visualization Row (Visible only when Collapsed) */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in pt-4">
          
          {/* Left SVG Bar Chart (Wing-wise distribution) */}
          <div className="lg:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cabinet Notes by Wing</h3>
            <div className="space-y-3.5 pt-2">
              {dynamicReportRows.filter(r => r.total > 0).map((row, idx) => {
                const percent = (row.total / (totals.total || 1)) * 100;
                const gradientClass = 
                  idx === 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                  idx === 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                  idx === 2 ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                  'bg-gradient-to-r from-rose-500 to-pink-500';
                return (
                  <div key={row.id} className="space-y-1 font-semibold">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{row.wing}</span>
                      <span>{row.total} Notes ({Math.round(percent)}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${gradientClass} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Donut Chart (Status breakdown) */}
          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Workflow Status Breakdown</h3>
            
            <div className="flex items-center justify-around py-3">
              {/* SVG circular progress representation */}
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <circle className="text-slate-200" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  
                  {/* Circle Segment 1: Approved */}
                  <circle className="text-emerald-500" strokeWidth="3.5" strokeDasharray={`${donutPercentages.approved} 100`} strokeDashoffset="0" strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  
                  {/* Circle Segment 2: PMO copy */}
                  <circle className="text-blue-600" strokeWidth="3.5" strokeDasharray={`${donutPercentages.pmo} 100`} strokeDashoffset={`-${donutPercentages.approved}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  
                  {/* Circle Segment 3: Draft */}
                  <circle className="text-amber-500" strokeWidth="3.5" strokeDasharray={`${donutPercentages.draft} 100`} strokeDashoffset={`-${donutPercentages.approved + donutPercentages.pmo}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                </svg>
                
                {/* Central Text inside donut */}
                <div className="absolute text-center">
                  <p className="text-lg font-black text-slate-900 leading-none">{totals.total}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total DCN</p>
                </div>
              </div>

              {/* Legend list */}
              <div className="space-y-2 font-semibold text-xs text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  <span>Approved: <strong>{totals.appCab}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                  <span>PMO Review: <strong>{totals.advPMO}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span>Draft & IMC: <strong>{totals.prep + totals.imcRec}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-center text-slate-400 font-semibold border-t border-slate-200/60 pt-2.5 mt-2">
              Real-time tracking of Cabinet note clearance stages
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
