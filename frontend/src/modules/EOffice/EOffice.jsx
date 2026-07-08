import { useState, useMemo } from 'react';
import {
  FileText,
  Inbox,
  CheckSquare,
  ChevronDown,
  FileSpreadsheet,
  FileCheck,
  Search
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function EOfficeView({ initialKpi }) {
  const [selectedKpi, setSelectedKpi] = useState(initialKpi || 'file-pendency'); // 'file-pendency', 'receipt-pendency', 'file-disposal'
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');
  const [week, setWeek] = useState('Week 3');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('Report'); // 'Report', 'Upload', 'History'

  // File Pendency Data
  const filePendencyData = [
    { sno: 1, empId: 'DS11', empName: 'Devendra Kumar', designation: 'Deputy Secretary', wing: 'Administration', division: 'Admn.', gt30: 0, d16_30: 0 },
    { sno: 2, empId: 'US20', empName: 'Sumit Nandan', designation: 'UNDER SECRETARY', wing: 'Administration', division: 'Admn.', gt30: 0, d16_30: 0 },
    { sno: 3, empId: 'DD02', empName: 'RAMJI SINGH', designation: 'DIRECTOR', wing: 'Development', division: 'Devlopment', gt30: 0, d16_30: 0 },
    { sno: 4, empId: 'US22', empName: 'UTTAM KUMAR MISHRA', designation: 'UNDER SECRETARY', wing: 'IWT', division: 'IWT-II', gt30: 0, d16_30: 0 },
    { sno: 5, empId: 'DIR04', empName: 'Samarth Verma', designation: 'DIRECTOR', wing: 'Ports', division: 'PD-II', gt30: 0, d16_30: 0 },
    { sno: 6, empId: 'DIR14', empName: 'Dinesh Kumar', designation: 'Director', wing: 'Ports', division: 'PD-IV', gt30: 0, d16_30: 0 },
    { sno: 7, empId: 'US25', empName: 'PAUSIANMUNG HAUZEL', designation: 'Under Secretary', wing: 'Ports', division: 'PD-IV', gt30: 0, d16_30: 0 },
    { sno: 8, empId: 'DS09', empName: 'Devendra Kumar', designation: 'Deputy Secretary', wing: 'Ports', division: 'PHRD', gt30: 0, d16_30: 0 },
    { sno: 9, empId: 'US27', empName: 'Ashish Bhattacharya', designation: 'Under Secretary', wing: 'Ports', division: 'PHRD', gt30: 0, d16_30: 0 }
  ];

  // Receipt Pendency Data
  const receiptPendencyData = [
    { sno: 1, empId: 'US22', empName: 'UTTAM KUMAR MISHRA', designation: 'UNDER SECRETARY', wing: 'IWT', division: 'IWT-II', gt30: 0, d16_30: 0 },
    { sno: 2, empId: 'DD03', empName: 'TARUN KUMAR', designation: 'DEPUTY DIRECTOR', wing: 'Ports', division: 'PD-I', gt30: 0, d16_30: 0 },
    { sno: 3, empId: 'DIR04', empName: 'Samarth Verma', designation: 'DIRECTOR', wing: 'Ports', division: 'PD-II', gt30: 0, d16_30: 0 },
    { sno: 4, empId: 'DIR14', empName: 'Dinesh Kumar', designation: 'Director', wing: 'Ports', division: 'PD-IV', gt30: 0, d16_30: 0 },
    { sno: 5, empId: 'US25', empName: 'PAUSIANMUNG HAUZEL', designation: 'Under Secretary', wing: 'Ports', division: 'PD-IV', gt30: 0, d16_30: 0 },
    { sno: 6, empId: 'DS09', empName: 'Devendra Kumar', designation: 'Deputy Secretary', wing: 'Ports', division: 'PHRD', gt30: 0, d16_30: 0 },
    { sno: 7, empId: 'US17', empName: 'Sachin Kumar Katiyar', designation: 'UNDER SECRETARY', wing: 'Ports', division: 'PPP', gt30: 0, d16_30: 0 },
    { sno: 8, empId: 'US18', empName: 'SANJAY KUMAR', designation: 'UNDER SECRETARY', wing: 'Sagarmala', division: 'Sagarmala -I', gt30: 0, d16_30: 0 },
    { sno: 9, empId: 'AS01', empName: 'Mukesh Mangal', designation: 'Additional Secretary', wing: 'Sagarmala', division: 'Sagarmala -I', gt30: 0, d16_30: 0 }
  ];

  // File Disposal Data
  const fileDisposalData = [
    { sno: 1, empId: 'DS11', empName: 'Devendra Kumar', designation: 'Deputy Secretary', wing: 'Administration', division: 'Admn.', gt30: 12, d16_30: 24 },
    { sno: 2, empId: 'US20', empName: 'Sumit Nandan', designation: 'UNDER SECRETARY', wing: 'Administration', division: 'Admn.', gt30: 8, d16_30: 18 },
    { sno: 3, empId: 'DD02', empName: 'RAMJI SINGH', designation: 'DIRECTOR', wing: 'Development', division: 'Devlopment', gt30: 15, d16_30: 31 },
    { sno: 4, empId: 'US22', empName: 'UTTAM KUMAR MISHRA', designation: 'UNDER SECRETARY', wing: 'IWT', division: 'IWT-II', gt30: 9, d16_30: 14 },
    { sno: 5, empId: 'DIR04', empName: 'Samarth Verma', designation: 'DIRECTOR', wing: 'Ports', division: 'PD-II', gt30: 21, d16_30: 45 },
    { sno: 6, empId: 'DIR14', empName: 'Dinesh Kumar', designation: 'Director', wing: 'Ports', division: 'PD-IV', gt30: 14, d16_30: 28 },
    { sno: 7, empId: 'US25', empName: 'PAUSIANMUNG HAUZEL', designation: 'Under Secretary', wing: 'Ports', division: 'PD-IV', gt30: 7, d16_30: 19 },
    { sno: 8, empId: 'DS09', empName: 'Devendra Kumar', designation: 'Deputy Secretary', wing: 'Ports', division: 'PHRD', gt30: 11, d16_30: 25 },
    { sno: 9, empId: 'US27', empName: 'Ashish Bhattacharya', designation: 'Under Secretary', wing: 'Ports', division: 'PHRD', gt30: 5, d16_30: 11 }
  ];

  // Helper to retrieve data
  const getSelectedData = () => {
    switch (selectedKpi) {
      case 'file-pendency':
        return filePendencyData;
      case 'receipt-pendency':
        return receiptPendencyData;
      case 'file-disposal':
        return fileDisposalData;
      default:
        return filePendencyData;
    }
  };

  const getReportTitle = () => {
    switch (selectedKpi) {
      case 'file-pendency':
        return 'File Pendency Report';
      case 'receipt-pendency':
        return 'Receipt Pendency Report';
      case 'file-disposal':
        return 'File Disposal Report';
      default:
        return 'File Pendency Report';
    }
  };

  const filteredData = getSelectedData().filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.empId.toLowerCase().includes(term) ||
      row.empName.toLowerCase().includes(term) ||
      row.designation.toLowerCase().includes(term) ||
      row.wing.toLowerCase().includes(term) ||
      row.division.toLowerCase().includes(term)
    );
  });

  // AG Grid Column Definitions
  const colDefs = useMemo(() => [
    {
      field: 'sno',
      headerName: 'S.No',
      width: 70,
      pinned: 'left',
      cellClass: 'text-slate-500 font-bold',
      sortable: true
    },
    {
      field: 'empId',
      headerName: 'Emp ID',
      minWidth: 110,
      pinned: 'left',
      cellClass: 'font-mono font-bold text-slate-800',
      sortable: true,
      filter: true
    },
    {
      field: 'empName',
      headerName: 'Employee Name',
      minWidth: 170,
      cellClass: 'font-extrabold text-slate-900',
      sortable: true,
      filter: true
    },
    {
      field: 'designation',
      headerName: 'Designation',
      minWidth: 160,
      cellClass: 'text-slate-600 font-semibold',
      sortable: true,
      filter: true
    },
    {
      field: 'wing',
      headerName: 'Wing',
      minWidth: 130,
      cellClass: 'text-slate-600 font-semibold',
      sortable: true,
      filter: true
    },
    {
      field: 'division',
      headerName: 'Division',
      minWidth: 130,
      cellClass: 'text-slate-600 font-semibold',
      sortable: true,
      filter: true
    },
    {
      field: 'gt30',
      headerName: 'Greater than 30 Days',
      minWidth: 180,
      cellClass: 'text-center font-bold text-slate-900',
      sortable: true,
      filter: true
    },
    {
      field: 'd16_30',
      headerName: '16-30 Days',
      minWidth: 130,
      cellClass: 'text-center font-bold text-slate-900',
      sortable: true,
      filter: true
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

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">

      {/* 3 KPI Card Style Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Card 1: File Pendency (Red Theme) */}
        <button
          onClick={() => setSelectedKpi('file-pendency')}
          className={`flex items-center justify-between p-5 rounded-2xl border text-left transition-all duration-250 cursor-pointer ${selectedKpi === 'file-pendency'
              ? 'bg-red-50/50 border-red-300 shadow-md ring-2 ring-red-200/40'
              : 'bg-white border-slate-200 hover:border-red-200 hover:shadow-sm'
            }`}
        >
          <div className="space-y-1">
            <span className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              File Pendency
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-red-700">9</span>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">
                Active
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">
              Pending departmental files
            </span>
          </div>
          <div className={`p-3.5 rounded-xl border transition-colors ${selectedKpi === 'file-pendency' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
            <FileText className="h-5 w-5" />
          </div>
        </button>

        {/* Card 2: Receipt Pendency */}
        <button
          onClick={() => setSelectedKpi('receipt-pendency')}
          className={`flex items-center justify-between p-5 rounded-2xl border text-left transition-all duration-250 cursor-pointer ${selectedKpi === 'receipt-pendency'
              ? 'bg-amber-50/50 border-amber-350 shadow-md ring-2 ring-amber-200/50'
              : 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-sm'
            }`}
        >
          <div className="space-y-1">
            <span className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              Receipt Pendency
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-amber-700">9</span>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                Awaiting
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">
              Receipts pending processing
            </span>
          </div>
          <div className={`p-3.5 rounded-xl border ${selectedKpi === 'receipt-pendency' ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
            <Inbox className="h-5 w-5" />
          </div>
        </button>

        {/* Card 3: File Disposal */}
        <button
          onClick={() => setSelectedKpi('file-disposal')}
          className={`flex items-center justify-between p-5 rounded-2xl border text-left transition-all duration-250 cursor-pointer ${selectedKpi === 'file-disposal'
              ? 'bg-emerald-50/50 border-emerald-350 shadow-md ring-2 ring-emerald-200/50'
              : 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-sm'
            }`}
        >
          <div className="space-y-1">
            <span className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              File Disposal
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-700">142</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                Completed
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">
              Files disposed & finalized
            </span>
          </div>
          <div className={`p-3.5 rounded-xl border ${selectedKpi === 'file-disposal' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
            <CheckSquare className="h-5 w-5" />
          </div>
        </button>

      </div>

      {/* Main E-Office Content Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">

        {/* Dynamic Title Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            {getReportTitle()}
          </h1>
          <p className="text-xs text-slate-500 font-bold tracking-wide">
            (Report For the Week({week === 'Week 3' ? '3' : week.replace('Week ', '')})-{month}-{year})
          </p>
        </div>

        {/* Tab Selection Buttons */}
        <div className="flex items-center space-x-2.5 pb-2">
          {['Report', 'Upload / View Data', 'Upload / View History'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === tab || (tab === 'Report' && activeSubTab === 'Report')
                  ? 'bg-blue-755 text-white shadow-sm dark:bg-[#0f417a]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dropdown Filters Panel */}
        <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 flex-grow">

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

            {/* Week Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Week</label>
              <div className="relative">
                <select
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-bold text-slate-700"
                >
                  <option value="Week 1">Week 1</option>
                  <option value="Week 2">Week 2</option>
                  <option value="Week 3">Week 3</option>
                  <option value="Week 4">Week 4</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

          </div>

          {/* Fetch Action Button */}
          <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5 flex-shrink-0 self-stretch sm:self-auto justify-center">
            <span>Fetch Report</span>
          </button>
        </div>

        {/* Export and Search controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export to Excel</span>
            </button>
            <button className="px-3.5 py-2 bg-[#0d417a] hover:bg-[#0b3666] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer">
              <FileCheck className="h-3.5 w-3.5" />
              <span>Export to PDF</span>
            </button>
          </div>

          {/* Search Field */}
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search employee details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-450" />
          </div>
        </div>

        {/* AG Grid Table Container */}
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
              type: 'fitGridWidth'
            }}
          />
        </div>

      </div>
    </div>
  );
}
