import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Copy
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const WINGS_LIST = [
  'Ministry of Finance',
  'Ministry of Culture',
  'Ministry of Commerce and Industry',
  'Ministry of Mines',
  'Ministry of Housing and Urban Affairs',
  'Ministry of Labour and Employment',
  'Ministry of Defence',
  'Ministry of Road Transport and Highways',
  'Ministry of Communications',
  'Ministry of Micro, Small and Medium Enterprises',
  'Ministry of Environment, Forest and Climate Change',
  'Ministry of Fisheries, Animal Husbandry and Dairying',
  'Ministry of Skill Development and Entrepreneurship',
  'Ministry of Steel',
  'Ministry of Earth Sciences'
];

function ActionStagesPieChart({ totals }) {
  useEffect(() => {
    let root = am5.Root.new("stages-pie-chart-cab-other");
    root.setThemes([am5themes_Animated.new(root)]);
    let chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        innerRadius: am5.percent(50)
      })
    );
    let series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "category"
      })
    );
    series.labels.template.set("forceHidden", true);
    series.ticks.template.set("forceHidden", true);
    
    series.data.setAll([
      { category: "Comments Received", value: totals.commentsReceived || 0 },
      { category: "Reply Furnished", value: totals.replyFurnished || 0 },
      { category: "Pending <50 Days", value: totals.age0_50 || 0 },
      { category: "Pending 51-80 Days", value: totals.age51_80 || 0 },
      { category: "Pending >80 Days", value: totals.ageOver80 || 0 }
    ]);
    series.appear(1000, 100);

    let legend = chart.children.push(am5.Legend.new(root, {
      centerX: am5.percent(50),
      x: am5.percent(50),
      layout: root.gridLayout
    }));
    legend.data.setAll(series.dataItems);

    return () => {
      root.dispose();
    };
  }, [totals]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[340px]">
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Cabinet Notes (Other Ministries) Status Distribution</h3>
      <div id="stages-pie-chart-cab-other" className="w-full h-[260px]"></div>
    </div>
  );
}

export default function CabinetNotesReports({ notes = [], mode = 'report' }) {
  const gridRef = useRef();
  const [selectedWing, setSelectedWing] = useState('All');
  const [notification, setNotification] = useState(null);
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReport, setActiveReport] = useState('stages'); // 'stages' | 'pendency'

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Derive REPORT_ROWS dynamically from the notes database
  const dynamicReportRows = useMemo(() => {
    return WINGS_LIST.map((wing, index) => {
      const wingNotes = notes.filter(n => n.wing === wing);
      const commentsReceived = wingNotes.filter(n => n.status === 'Comments Received').length;
      const replyFurnished = wingNotes.filter(n => n.status === 'Reply Furnished').length;
      const total = wingNotes.length;

      // Mock some pendency age brackets (0-50, 51-80, 80+) based on index/id for visualization matching screenshot totals
      const age0_50 = total > 0 ? (index % 3 === 0 ? Math.ceil(total / 2) : 0) : 0;
      const age51_80 = total > 0 ? (index % 3 === 1 ? Math.ceil(total / 2) : 0) : 0;
      const ageOver80 = total - age0_50 - age51_80;

      return {
        id: index + 1,
        wing,
        total,
        commentsReceived,
        replyFurnished,
        age0_50,
        age51_80,
        ageOver80
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
      acc.commentsReceived += r.commentsReceived;
      acc.replyFurnished += r.replyFurnished;
      acc.age0_50 += r.age0_50;
      acc.age51_80 += r.age51_80;
      acc.ageOver80 += r.ageOver80;
      return acc;
    }, {
      total: 0, commentsReceived: 0, replyFurnished: 0, age0_50: 0, age51_80: 0, ageOver80: 0
    });
  }, [filteredRows]);


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
  const colDefs = useMemo(() => {
    const baseCols = [
      {
        headerName: 'S.No',
        valueGetter: (params) => params.node.rowIndex + 1,
        width: 70,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-550 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center'
      },
      {
        headerName: 'Name of the Ministry/Department Received from',
        field: 'wing',
        minWidth: 280,
        pinned: 'left',
        cellClass: 'text-slate-800 font-extrabold flex items-center border-r border-slate-100 hover:underline cursor-pointer text-[11px]'
      },
      {
        headerName: activeReport === 'stages' ? 'No. of Cabinet Notes' : 'Total Cabinet Notes/Bills',
        field: 'total',
        minWidth: 160,
        cellClass: 'text-center font-bold text-slate-800 flex items-center justify-center border-r border-slate-100',
        valueFormatter: (params) => params.value || ''
      }
    ];

    if (activeReport === 'stages') {
      return [
        ...baseCols,
        {
          headerName: 'Comments Received',
          field: 'commentsReceived',
          minWidth: 160,
          cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
          valueFormatter: (params) => params.value || ''
        },
        {
          headerName: 'Reply Furnished to other ministry',
          field: 'replyFurnished',
          minWidth: 200,
          cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center',
          valueFormatter: (params) => params.value || ''
        }
      ];
    } else {
      return [
        ...baseCols,
        {
          headerName: '0-50 Days',
          field: 'age0_50',
          minWidth: 120,
          cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
          valueFormatter: (params) => params.value || ''
        },
        {
          headerName: '51-80 Days',
          field: 'age51_80',
          minWidth: 120,
          cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center border-r border-slate-100',
          valueFormatter: (params) => params.value || ''
        },
        {
          headerName: 'More than 80 Days',
          field: 'ageOver80',
          minWidth: 150,
          cellClass: 'text-center font-semibold text-slate-700 flex items-center justify-center',
          valueFormatter: (params) => params.value || ''
        }
      ];
    }
  }, [activeReport]);

  // Pinned bottom totals row
  const pinnedBottomRowData = useMemo(() => {
    if (activeReport === 'stages') {
      return [{
        wing: 'Total',
        total: totals.total,
        commentsReceived: totals.commentsReceived,
        replyFurnished: totals.replyFurnished
      }];
    } else {
      return [{
        wing: 'Total',
        total: totals.total,
        age0_50: totals.age0_50,
        age51_80: totals.age51_80,
        ageOver80: totals.ageOver80
      }];
    }
  }, [totals, activeReport]);

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

      {/* Report Selection Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveReport('stages')}
          className={`px-6 py-2.5 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeReport === 'stages'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Report 6.2 (Stage Wise Abstract)
        </button>
        <button
          onClick={() => setActiveReport('pendency')}
          className={`px-6 py-2.5 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeReport === 'pendency'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Report 6.2 (Pendency Wise Abstract)
        </button>
      </div>

      {(() => {
  if (mode === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">
          {/* Chart 1: Ministry Wise Incoming Volume */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Incoming Notes Volume by Ministry</h3>
            <div className="space-y-3.5 pt-2">
              {dynamicReportRows
                .filter(r => r.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((row, idx) => {
                  const percent = (row.total / (totals.total || 1)) * 100;
                  const color = 
                    idx === 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                    idx === 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                    idx === 2 ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                    'bg-gradient-to-r from-rose-500 to-pink-500';
                  return (
                    <div key={row.id} className="space-y-1 font-semibold text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>{row.wing}</span>
                        <span>{row.total} Notes ({Math.round(percent)}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${color} transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Chart 2: Pendency Age Breakdown */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Pendency Age Breakdown</h3>
            
            <div className="flex items-center justify-around py-3">
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle className="text-slate-200" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  {/* Circle Segment 1: 0-50 Days */}
                  <circle className="text-blue-500" strokeWidth="3.5" strokeDasharray={`${Math.round((totals.age0_50 / (totals.total || 1)) * 100)} 100`} strokeDashoffset="0" strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  {/* Circle Segment 2: 51-80 Days */}
                  <circle className="text-amber-500" strokeWidth="3.5" strokeDasharray={`${Math.round((totals.age51_80 / (totals.total || 1)) * 100)} 100`} strokeDashoffset={`-${Math.round((totals.age0_50 / (totals.total || 1)) * 100)}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                  {/* Circle Segment 3: More than 80 Days */}
                  <circle className="text-red-500" strokeWidth="3.5" strokeDasharray={`${Math.round((totals.ageOver80 / (totals.total || 1)) * 100)} 100`} strokeDashoffset={`-${Math.round(((totals.age0_50 + totals.age51_80) / (totals.total || 1)) * 100)}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                </svg>
                <div className="absolute text-center">
                  <p className="text-lg font-black text-slate-900 leading-none">{totals.total}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Pending</p>
                </div>
              </div>
 
              <div className="space-y-2 font-semibold text-xs text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                  <span>0-50 Days: <strong>{totals.age0_50}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span>51-80 Days: <strong>{totals.age51_80}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  <span>&gt; 80 Days: <strong>{totals.ageOver80}</strong></span>
                </div>
              </div>
            </div>
 
            <div className="text-[10px] text-center text-slate-400 font-semibold border-t border-slate-200/60 pt-2.5 mt-2">
              Clearance monitoring categorized by duration in queue
            </div>
          </div>
        </div>

        {/* amCharts stages pie chart */}
        <ActionStagesPieChart totals={totals} />
      </div>
    );
  }

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
            Report No.: 6.1B - Abstract ( Ministry Wise ) - Cabinet Notes Other Ministry
          </h2>
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-bold mt-1">
            <span>As On date: 1-7-2026</span>
            <span>•</span>
            <span className="text-[#b33c56]">(Report for the Month - July 2026)</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ministry:</span>
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

          <div className="flex items-center gap-2">
            <button 
              onClick={() => triggerNotification('Abstract Excel generated.')}
              className="px-3.5 py-2 bg-[#028266] hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
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
        </div>
      </div>

      {/* Analytical Table & Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
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
              const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
              const gridRoot = document.querySelector(`.ag-root-wrapper[grid-id="${params.api.getGridId()}"]`);
              const containerWidth = gridRoot?.clientWidth || 0;
              if (containerWidth > 0 && totalColWidth < containerWidth) {
                params.api.sizeColumnsToFit();
              }
            }}
          />

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
                className="p-1.5 rounded-lg border border-slate-200 text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
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
                className="p-1.5 rounded-lg border border-slate-200 text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Diagrams underneath Analytical Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-4">
        {/* Matters Disposed by Wing Chart */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Incoming Notes Volume by Ministry</h3>
          <div className="space-y-3.5 pt-2">
            {dynamicReportRows
              .filter(r => r.total > 0)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((row, idx) => {
                const percent = (row.total / (totals.total || 1)) * 100;
                const color = 
                  idx === 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                  idx === 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                  idx === 2 ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                  'bg-gradient-to-r from-rose-500 to-pink-500';
                return (
                  <div key={row.id} className="space-y-1 font-semibold text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span>{row.wing}</span>
                      <span>{row.total} Notes ({Math.round(percent)}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Pendency Age Breakdown */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Pendency Age Breakdown</h3>
          
          <div className="flex items-center justify-around py-3">
            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle className="text-slate-200" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                {/* Circle Segment 1: 0-50 Days */}
                <circle className="text-blue-500" strokeWidth="3.5" strokeDasharray={`${Math.round((totals.age0_50 / (totals.total || 1)) * 100)} 100`} strokeDashoffset="0" strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                {/* Circle Segment 2: 51-80 Days */}
                <circle className="text-amber-500" strokeWidth="3.5" strokeDasharray={`${Math.round((totals.age51_80 / (totals.total || 1)) * 100)} 100`} strokeDashoffset={`-${Math.round((totals.age0_50 / (totals.total || 1)) * 100)}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
                {/* Circle Segment 3: More than 80 Days */}
                <circle className="text-red-500" strokeWidth="3.5" strokeDasharray={`${Math.round((totals.ageOver80 / (totals.total || 1)) * 100)} 100`} strokeDashoffset={`-${Math.round(((totals.age0_50 + totals.age51_80) / (totals.total || 1)) * 100)}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18"/>
              </svg>
              <div className="absolute text-center">
                <p className="text-lg font-black text-slate-900 leading-none">{totals.total}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Pending</p>
              </div>
            </div>

            <div className="space-y-2 font-semibold text-xs text-slate-700">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                <span>0-50 Days: <strong>{totals.age0_50}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                <span>51-80 Days: <strong>{totals.age51_80}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                <span>&gt; 80 Days: <strong>{totals.ageOver80}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-400 font-semibold border-t border-slate-200/60 pt-2.5 mt-2">
            Clearance monitoring categorized by duration in queue
          </div>
        </div>
      </div>

      {/* amCharts Pie chart */}
      <ActionStagesPieChart totals={totals} />
    </div>
  );
})()}

    </div>
  );
}
