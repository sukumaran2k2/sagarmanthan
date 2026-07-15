import { useState, useMemo } from 'react';
import { 
  FileCheck, 
  ChevronDown, 
  FileSpreadsheet, 
  Search,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const cpgramsData = [
  { sno: 1, id: 'PMO-2026-00342', name: 'Alok Sharma', category: 'Port Infrastructure Delays', dateReceived: '05-06-2026', status: 'Under Process', targetDate: '25-06-2026', wing: 'Ports' },
  { sno: 2, id: 'PMO-2026-00348', name: 'Nisha Verma', category: 'Inland Waterways Grievance', dateReceived: '08-06-2026', status: 'Under Process', targetDate: '28-06-2026', wing: 'IWT' },
  { sno: 3, id: 'MOP-2026-01290', name: 'Rajesh Gupta', category: 'Contractor Payment Dispute', dateReceived: '10-06-2026', status: 'Resolved', targetDate: '30-06-2026', wing: 'Administration' },
  { sno: 4, id: 'MOP-2026-01302', name: 'Sanjay Rawat', category: 'Employee Service Matters', dateReceived: '12-06-2026', status: 'Under Process', targetDate: '02-07-2026', wing: 'Administration' },
  { sno: 5, id: 'PMO-2026-00361', name: 'Preeti Singh', category: 'Dredging Operations Quality', dateReceived: '14-06-2026', status: 'Under Process', targetDate: '04-07-2026', wing: 'Ports' },
  { sno: 6, id: 'MOP-2026-01322', name: 'Anil Deshmukh', category: 'Vessel Clearance Grievance', dateReceived: '15-06-2026', status: 'Resolved', targetDate: '05-07-2026', wing: 'Shipping' },
  { sno: 7, id: 'PMO-2026-00372', name: 'Megha Nair', category: 'Land Acquisition Appeal', dateReceived: '18-06-2026', status: 'Under Process', targetDate: '08-07-2026', wing: 'Ports' },
  { sno: 8, id: 'MOP-2026-01340', name: 'Vikram Seth', category: 'Vigilance Clearance Appeal', dateReceived: '20-06-2026', status: 'Under Process', targetDate: '10-07-2026', wing: 'Vigilance' }
];

export default function CPGRAMSView() {
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    return cpgramsData.filter(row => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        row.id.toLowerCase().includes(term) ||
        row.name.toLowerCase().includes(term) ||
        row.category.toLowerCase().includes(term) ||
        row.wing.toLowerCase().includes(term)
      );
    });
  }, [searchTerm]);

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

  const colDefs = useMemo(() => [
    { field: 'sno', headerName: 'S.No', width: 70, pinned: 'left', cellClass: 'text-center font-bold text-slate-500' },
    { field: 'id', headerName: 'Grievance ID', minWidth: 150, pinned: 'left', cellClass: 'font-mono font-bold text-[#0d417a]' },
    { field: 'name', headerName: 'Name of Complainant', minWidth: 180, cellClass: 'font-extrabold text-slate-905' },
    { field: 'category', headerName: 'Grievance Category', minWidth: 200 },
    { field: 'dateReceived', headerName: 'Date Received', minWidth: 130, cellClass: 'text-center' },
    { 
      field: 'status', 
      headerName: 'Status', 
      minWidth: 140, 
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => {
        const val = params.value;
        if (val === 'Resolved') {
          return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">Resolved</span>;
        }
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-250">Under Process</span>;
      }
    },
    { field: 'targetDate', headerName: 'Target Date', minWidth: 130, cellClass: 'text-center' },
    { field: 'wing', headerName: 'Wing', minWidth: 120 }
  ], []);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* 3 CPGRAMS KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Active Cases */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Active Cases</span>
            <span className="text-2xl font-black text-amber-700 block">6 Pending</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Under investigation / review</span>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Resolved Cases */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Resolved Cases</span>
            <span className="text-2xl font-black text-emerald-755 block">382 Resolved</span>
            <span className="text-[10px] text-emerald-600 font-semibold block">98.4% Resolution Rate</span>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Average Resolution Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Avg. Resolution Time</span>
            <span className="text-2xl font-black text-blue-700 block">12.4 Days</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Well below target limit of 30 days</span>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Clock className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            CPGRAMS Grievances Registry
          </h1>
          <p className="text-xs text-slate-500 font-bold tracking-wide">
            (Report for {month} {year})
          </p>
        </div>

        {/* Filters */}
        <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-grow">
            
            {/* Month Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</label>
              <div className="relative">
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-bold text-slate-700"
                >
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Year Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Year</label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-bold text-slate-700"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

          </div>

          <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5 justify-center flex-shrink-0 self-stretch sm:self-auto">
            <span>Fetch Data</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export to Excel</span>
            </button>
            <button className="px-3.5 py-2 bg-blue-650 hover:bg-blue-705 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer">
              <FileCheck className="h-3.5 w-3.5" />
              <span>Export to PDF</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search grievances registry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-450" />
          </div>
        </div>

        {/* AG Grid */}
        <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
          <AgGridReact 
            theme="legacy"
            rowData={filteredData}
            columnDefs={colDefs}
            domLayout="autoHeight"
            rowHeight={48}
            headerHeight={48}
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
        </div>

      </div>
    </div>
  );
}
