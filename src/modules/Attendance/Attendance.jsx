import { useState, useMemo } from 'react';
import { 
  UserCheck, 
  ChevronDown, 
  FileSpreadsheet, 
  FileCheck, 
  Search,
  Calendar
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const attendanceData = [
  { sno: 1, empId: 'DS11', empName: 'Devendra Kumar', designation: 'Deputy Secretary', wing: 'Administration', totalDays: 30, presentDays: 28, absentDays: 0, leaves: 2, pct: '93.33%' },
  { sno: 2, empId: 'US20', empName: 'Sumit Nandan', designation: 'UNDER SECRETARY', wing: 'Administration', totalDays: 30, presentDays: 29, absentDays: 0, leaves: 1, pct: '96.67%' },
  { sno: 3, empId: 'DD02', empName: 'RAMJI SINGH', designation: 'DIRECTOR', wing: 'Development', totalDays: 30, presentDays: 27, absentDays: 1, leaves: 2, pct: '90.00%' },
  { sno: 4, empId: 'US22', empName: 'UTTAM KUMAR MISHRA', designation: 'UNDER SECRETARY', wing: 'IWT', totalDays: 30, presentDays: 30, absentDays: 0, leaves: 0, pct: '100.00%' },
  { sno: 5, empId: 'DIR04', empName: 'Samarth Verma', designation: 'DIRECTOR', wing: 'Ports', totalDays: 30, presentDays: 26, absentDays: 0, leaves: 4, pct: '86.67%' },
  { sno: 6, empId: 'DIR14', empName: 'Dinesh Kumar', designation: 'Director', wing: 'Ports', totalDays: 30, presentDays: 28, absentDays: 0, leaves: 2, pct: '93.33%' },
  { sno: 7, empId: 'US25', empName: 'PAUSIANMUNG HAUZEL', designation: 'Under Secretary', wing: 'Ports', totalDays: 30, presentDays: 25, absentDays: 2, leaves: 3, pct: '83.33%' },
  { sno: 8, empId: 'DS09', empName: 'Devendra Kumar', designation: 'Deputy Secretary', wing: 'Ports', totalDays: 30, presentDays: 29, absentDays: 0, leaves: 1, pct: '96.67%' },
  { sno: 9, empId: 'US27', empName: 'Ashish Bhattacharya', designation: 'Under Secretary', wing: 'Ports', totalDays: 30, presentDays: 28, absentDays: 0, leaves: 2, pct: '93.33%' }
];

export default function AttendanceView() {
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    return attendanceData.filter(row => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        row.empName.toLowerCase().includes(term) ||
        row.designation.toLowerCase().includes(term) ||
        row.wing.toLowerCase().includes(term)
      );
    });
  }, [searchTerm]);

  const colDefs = useMemo(() => [
    { field: 'sno', headerName: 'S.No', width: 70, pinned: 'left', cellClass: 'text-center font-bold text-slate-500' },
    { field: 'empId', headerName: 'Emp ID', minWidth: 110, pinned: 'left', cellClass: 'font-mono font-bold text-slate-800' },
    { field: 'empName', headerName: 'Employee Name', minWidth: 160, cellClass: 'font-extrabold text-slate-900' },
    { field: 'designation', headerName: 'Designation', minWidth: 160 },
    { field: 'wing', headerName: 'Wing', minWidth: 120 },
    { field: 'totalDays', headerName: 'Working Days', minWidth: 120, type: 'numericColumn', cellClass: 'text-center' },
    { field: 'presentDays', headerName: 'Present', minWidth: 100, type: 'numericColumn', cellClass: 'text-center font-bold text-emerald-600' },
    { field: 'absentDays', headerName: 'Absent', minWidth: 100, type: 'numericColumn', cellClass: 'text-center font-bold text-red-500' },
    { field: 'leaves', headerName: 'Leaves', minWidth: 100, type: 'numericColumn', cellClass: 'text-center font-semibold text-amber-600' },
    { field: 'pct', headerName: 'Percentage (%)', minWidth: 130, type: 'numericColumn', cellClass: 'text-center font-black text-blue-700' }
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

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Attendance</span>
            <span className="text-2xl font-black text-blue-700 block mt-1">92.96%</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Across all departments</span>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Employees</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">142</span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">138 Present today</span>
          </div>
          <div className="p-3.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-100">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Leaves</span>
            <span className="text-2xl font-black text-amber-700 block mt-1">1.8 Days</span>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Approved month-wise</span>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Employee Attendance Report
          </h1>
          <p className="text-xs text-slate-500 font-bold tracking-wide">
            (Report for {month} {year})
          </p>
        </div>

        {/* Dropdown Filters Panel */}
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
              placeholder="Search employee attendance..."
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
              const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
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
