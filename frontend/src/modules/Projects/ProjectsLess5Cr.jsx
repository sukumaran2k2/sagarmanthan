import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  LayoutDashboard,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  FolderSync,
  FilePieChart,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';

ModuleRegistry.registerModules([AllCommunityModule]);

const ORGANISATIONS = [
  'All Organisations',
  'Chennai Port Authority',
  'Cochin Port Authority',
  'Kamarajar Port Limited',
  'Syama Prasad Mookeerjii Port',
  'Jawaharlal Nehru Port Authority',
  'Deendayal Port Authority',
  'Mumbai Port Authority',
  'Mormugao Port Authority',
  'New Mangalore Port Authority',
  'V.O. Chidambaranar Port Authority',
  'Visakhapatnam Port Authority',
  'Paradip Port Authority'
];

const FINANCIAL_YEARS = [
  'All Years',
  '2024-2025',
  '2025-2026',
  '2026-2027'
];

const INITIAL_ENTRIES = [
  { id: 1, orgName: 'Chennai Port Authority', financialYear: '2024-2025', count: 115, plannedExp: 30.27, actualExp: 28.45 },
  { id: 2, orgName: 'Chennai Port Authority', financialYear: '2025-2026', count: 44, plannedExp: 16.97, actualExp: 22.54 },
  { id: 3, orgName: 'Chennai Port Authority', financialYear: '2026-2027', count: 32, plannedExp: 14.84, actualExp: 0.22 },
  { id: 4, orgName: 'Chennai Port Authority', financialYear: '2026-2027', count: 32, plannedExp: 14.84, actualExp: 0.22 },
  { id: 5, orgName: 'Cochin Port Authority', financialYear: '2024-2025', count: 18, plannedExp: 16.11, actualExp: 11.33 },
  { id: 6, orgName: 'Cochin Port Authority', financialYear: '2025-2026', count: 41, plannedExp: 21.06, actualExp: 9.43 },
  { id: 7, orgName: 'Cochin Port Authority', financialYear: '2026-2027', count: 18, plannedExp: 25.43, actualExp: 3.6 },
  { id: 8, orgName: 'Kamarajar Port Limited', financialYear: '2024-2025', count: 3, plannedExp: 8.22, actualExp: 8.96 },
  { id: 9, orgName: 'Kamarajar Port Limited', financialYear: '2025-2026', count: 2, plannedExp: 3.79, actualExp: 9.1 },
  { id: 10, orgName: 'Syama Prasad Mookeerjii Port', financialYear: '2024-2025', count: 60, plannedExp: 35.35, actualExp: 6.2 },
  
  // Extra mock entries to reach 45 count as in user screen
  { id: 11, orgName: 'Jawaharlal Nehru Port Authority', financialYear: '2024-2025', count: 25, plannedExp: 12.50, actualExp: 10.40 },
  { id: 12, orgName: 'Jawaharlal Nehru Port Authority', financialYear: '2025-2026', count: 19, plannedExp: 8.90, actualExp: 7.20 },
  { id: 13, orgName: 'Deendayal Port Authority', financialYear: '2024-2025', count: 50, plannedExp: 22.40, actualExp: 18.90 },
  { id: 14, orgName: 'Deendayal Port Authority', financialYear: '2025-2026', count: 35, plannedExp: 19.10, actualExp: 15.60 },
  { id: 15, orgName: 'Deendayal Port Authority', financialYear: '2026-2027', count: 20, plannedExp: 10.50, actualExp: 1.10 },
  { id: 16, orgName: 'Mumbai Port Authority', financialYear: '2024-2025', count: 15, plannedExp: 6.80, actualExp: 6.10 },
  { id: 17, orgName: 'Mumbai Port Authority', financialYear: '2025-2026', count: 12, plannedExp: 5.40, actualExp: 4.80 },
  { id: 18, orgName: 'Mormugao Port Authority', financialYear: '2024-2025', count: 8, plannedExp: 4.20, actualExp: 3.90 },
  { id: 19, orgName: 'Mormugao Port Authority', financialYear: '2025-2026', count: 10, plannedExp: 4.90, actualExp: 4.10 },
  { id: 20, orgName: 'New Mangalore Port Authority', financialYear: '2024-2025', count: 22, plannedExp: 11.20, actualExp: 9.80 },
  { id: 21, orgName: 'New Mangalore Port Authority', financialYear: '2025-2026', count: 14, plannedExp: 7.50, actualExp: 6.90 },
  { id: 22, orgName: 'V.O. Chidambaranar Port Authority', financialYear: '2024-2025', count: 30, plannedExp: 15.30, actualExp: 14.20 },
  { id: 23, orgName: 'V.O. Chidambaranar Port Authority', financialYear: '2025-2026', count: 18, plannedExp: 9.20, actualExp: 8.50 },
  { id: 24, orgName: 'Visakhapatnam Port Authority', financialYear: '2024-2025', count: 42, plannedExp: 20.80, actualExp: 17.50 },
  { id: 25, orgName: 'Visakhapatnam Port Authority', financialYear: '2025-2026', count: 28, plannedExp: 14.30, actualExp: 11.20 },
  { id: 26, orgName: 'Paradip Port Authority', financialYear: '2024-2025', count: 55, plannedExp: 28.50, actualExp: 25.10 },
  { id: 27, orgName: 'Paradip Port Authority', financialYear: '2025-2026', count: 40, plannedExp: 22.00, actualExp: 19.80 },
  { id: 28, orgName: 'Paradip Port Authority', financialYear: '2026-2027', count: 15, plannedExp: 9.80, actualExp: 0.50 },
  { id: 29, orgName: 'Chennai Port Authority', financialYear: '2024-2025', count: 10, plannedExp: 5.00, actualExp: 4.80 },
  { id: 30, orgName: 'Cochin Port Authority', financialYear: '2024-2025', count: 12, plannedExp: 4.50, actualExp: 4.00 },
  { id: 31, orgName: 'Kamarajar Port Limited', financialYear: '2026-2027', count: 5, plannedExp: 2.50, actualExp: 0.10 },
  { id: 32, orgName: 'Syama Prasad Mookeerjii Port', financialYear: '2025-2026', count: 35, plannedExp: 18.00, actualExp: 14.50 },
  { id: 33, orgName: 'Jawaharlal Nehru Port Authority', financialYear: '2026-2027', count: 8, plannedExp: 4.00, actualExp: 0.30 },
  { id: 34, orgName: 'Deendayal Port Authority', financialYear: '2026-2027', count: 12, plannedExp: 6.20, actualExp: 0.80 },
  { id: 35, orgName: 'Mumbai Port Authority', financialYear: '2026-2027', count: 5, plannedExp: 2.10, actualExp: 0.05 },
  { id: 36, orgName: 'Mormugao Port Authority', financialYear: '2026-2027', count: 4, plannedExp: 1.80, actualExp: 0.02 },
  { id: 37, orgName: 'New Mangalore Port Authority', financialYear: '2026-2027', count: 6, plannedExp: 3.00, actualExp: 0.15 },
  { id: 38, orgName: 'V.O. Chidambaranar Port Authority', financialYear: '2026-2027', count: 10, plannedExp: 5.10, actualExp: 0.40 },
  { id: 39, orgName: 'Visakhapatnam Port Authority', financialYear: '2026-2027', count: 14, plannedExp: 7.20, actualExp: 0.90 },
  { id: 40, orgName: 'Paradip Port Authority', financialYear: '2026-2027', count: 22, plannedExp: 11.50, actualExp: 1.20 },
  { id: 41, orgName: 'Chennai Port Authority', financialYear: '2025-2026', count: 15, plannedExp: 7.50, actualExp: 6.80 },
  { id: 42, orgName: 'Cochin Port Authority', financialYear: '2025-2026', count: 20, plannedExp: 9.80, actualExp: 8.20 },
  { id: 43, orgName: 'Kamarajar Port Limited', financialYear: '2024-2025', count: 4, plannedExp: 2.10, actualExp: 1.90 },
  { id: 44, orgName: 'Syama Prasad Mookeerjii Port', financialYear: '2026-2027', count: 18, plannedExp: 9.50, actualExp: 0.80 },
  { id: 45, orgName: 'Jawaharlal Nehru Port Authority', financialYear: '2025-2026', count: 12, plannedExp: 6.00, actualExp: 5.10 }
];

export default function ProjectsLess5Cr({ activeTab, setActiveTab }) {
  const gridRef = useRef();
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('All Organisations');
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit / Update Form State
  const [editingEntry, setEditingEntry] = useState(null);
  const [formYear, setFormYear] = useState('');
  const [formCount, setFormCount] = useState('');
  const [formPlanned, setFormPlanned] = useState('');
  const [formActual, setFormActual] = useState('');
  const [errors, setErrors] = useState({});

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    setFormYear(entry.financialYear);
    setFormCount(entry.count.toString());
    setFormPlanned(entry.plannedExp.toString());
    setFormActual(entry.actualExp.toString());
    setErrors({});
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formYear) newErrors.formYear = 'Financial Year is required';
    if (!formCount || parseInt(formCount) < 0) newErrors.formCount = 'Valid count is required';
    if (!formPlanned || parseFloat(formPlanned) < 0) newErrors.formPlanned = 'Valid planned expenditure is required';
    if (!formActual || parseFloat(formActual) < 0) newErrors.formActual = 'Valid actual expenditure is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setEntries(prev => prev.map(entry => {
      if (entry.id === editingEntry.id) {
        return {
          ...entry,
          financialYear: formYear,
          count: parseInt(formCount),
          plannedExp: parseFloat(formPlanned),
          actualExp: parseFloat(formActual)
        };
      }
      return entry;
    }));

    setEditingEntry(null);
  };

  // Filtered entries memo
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const matchOrg = selectedOrg === 'All Organisations' || item.orgName === selectedOrg;
      const matchYear = selectedYear === 'All Years' || item.financialYear === selectedYear;
      const matchSearch = !searchQuery.trim() || 
        item.orgName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.financialYear.toLowerCase().includes(searchQuery.toLowerCase());
      return matchOrg && matchYear && matchSearch;
    });
  }, [entries, selectedOrg, selectedYear, searchQuery]);

  const totalEntries = filteredEntries.length;

  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('paginationPageSize', entriesLimit);
    }
  }, [entriesLimit]);

  const onPaginationChanged = () => {
    if (gridRef.current && gridRef.current.api) {
      const page = gridRef.current.api.paginationGetCurrentPage() + 1;
      const total = gridRef.current.api.paginationGetTotalPages();
      setCurrentPage(page);
      setTotalPages(total || 1);
    }
  };

  const handlePageChange = (page) => {
    if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
    }
  };

  // Column definitions configured with generous/explicit widths to prevent minimization/shrinking
  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 70,
      minWidth: 70,
      pinned: 'left',
      cellClass: 'text-center font-semibold text-slate-500 flex items-center justify-center'
    },
    {
      headerName: 'Organisation Name',
      field: 'orgName',
      width: 260,
      minWidth: 260,
      pinned: 'left',
      cellClass: 'font-bold text-slate-800 flex items-center'
    },
    {
      headerName: 'Financial Year',
      field: 'financialYear',
      width: 150,
      minWidth: 150,
      cellClass: 'font-semibold text-slate-600 text-center flex items-center justify-center'
    },
    {
      headerName: 'No. of CAPEX Projects (Less Than 5 Cr)',
      field: 'count',
      width: 320,
      minWidth: 320,
      cellClass: 'text-center font-extrabold text-[#0f417a] flex items-center justify-center'
    },
    {
      headerName: 'Total Expenditure Planned (In Cr)',
      field: 'plannedExp',
      width: 280,
      minWidth: 280,
      cellClass: 'text-right font-extrabold text-slate-700 flex items-center justify-end',
      valueFormatter: (params) => params.value ? parseFloat(params.value).toFixed(2) : '0.00'
    },
    {
      headerName: 'Expenditure Till Date (In Cr)',
      field: 'actualExp',
      width: 260,
      minWidth: 260,
      cellClass: 'text-right font-extrabold text-emerald-600 flex items-center justify-end',
      valueFormatter: (params) => params.value !== undefined ? parseFloat(params.value).toFixed(2) : '0.00'
    },
    {
      headerName: 'Update',
      width: 100,
      minWidth: 100,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => {
        const entry = params.data;
        return (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => handleOpenEdit(entry)}
              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
              title="Update Entry Details"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }
  ], []);

  return (
    <div className="p-6 space-y-6 animate-fade-in text-slate-850">
      
      {/* Tab Navigation header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-slate-800 font-display">Projects Less Than 5 Cr</h2>
        </div>
        <InternalNavigation
          tabs={[
            { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard },
            { id: 'projects', label: 'Project List', icon: ClipboardList },
            { id: 'less5cr', label: 'Projects Less Than 5 Cr', icon: TrendingDown },
            { id: 'lumpsum', label: 'Lumpsum - IWAI', icon: TrendingUp },
            { id: 'dropRequests', label: 'View Drop Request', icon: FolderSync },
            { id: 'reports', label: 'Reports', icon: FilePieChart },
          ]}
          currentTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {editingEntry ? (
        /* Young Professionals style inline update form card layout */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
          
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                Update Project Details (Less Than 5 Cr)
              </h3>
              <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">{editingEntry.orgName}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingEntry(null)}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to List</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Financial Year *</label>
                <select
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.formYear ? 'border-red-400' : 'border-slate-250'} rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer`}
                >
                  <option value="">--Select Year--</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
                {errors.formYear && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.formYear}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Number of CAPEX Projects (Less Than 5 Cr) *</label>
                <input
                  type="number"
                  value={formCount}
                  onChange={(e) => setFormCount(e.target.value)}
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.formCount ? 'border-red-400' : 'border-slate-250'} rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800`}
                />
                {errors.formCount && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.formCount}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Total Expenditure Planned (In Cr) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formPlanned}
                  onChange={(e) => setFormPlanned(e.target.value)}
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.formPlanned ? 'border-red-400' : 'border-slate-250'} rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800`}
                />
                {errors.formPlanned && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.formPlanned}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Expenditure Till Date (In Cr) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formActual}
                  onChange={(e) => setFormActual(e.target.value)}
                  className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.formActual ? 'border-red-400' : 'border-slate-250'} rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800`}
                />
                {errors.formActual && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.formActual}</p>}
              </div>

            </div>

            <p className="text-[10px] font-bold text-slate-400 italic mt-2">
              * Fields marked with * are mandatory
            </p>

            <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
              >
                Save Details
              </button>
            </div>

          </form>

        </div>
      ) : (
        /* Filters and Table view */
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 font-display">CAPEX Projects Less Than 5 Cr Filters</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organisation Name</label>
                <select
                  value={selectedOrg}
                  onChange={(e) => { setSelectedOrg(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold cursor-pointer"
                >
                  {ORGANISATIONS.map(org => <option key={org} value={org}>{org}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold cursor-pointer"
                >
                  {FINANCIAL_YEARS.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-1.5 border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
              <button className="p-2 hover:bg-slate-100 text-slate-666 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
              <button className="p-2 hover:bg-slate-100 text-slate-666 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button className="p-2 hover:bg-slate-100 text-slate-666 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 whitespace-nowrap">Show</span>
                <select
                  value={entriesLimit}
                  onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); }}
                  className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                <span className="text-xs text-slate-500 whitespace-nowrap font-medium">entries</span>
              </div>

              <div className="relative w-full sm:w-60">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Search project..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); }}
                  className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto">
            <AgGridReact
              ref={gridRef}
              theme="legacy"
              rowData={filteredEntries}
              columnDefs={colDefs}
              defaultColDef={{ resizable: true, suppressSizeToFit: true, minWidth: 100 }}
              pagination={true}
              paginationPageSize={entriesLimit}
              suppressPaginationPanel={true}
              onPaginationChanged={onPaginationChanged}
              domLayout="autoHeight"
              rowHeight={55}
              headerHeight={48}
              suppressColumnVirtualisation={true}
            />

            {/* Custom Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
              <span className="text-slate-500 font-medium text-center sm:text-left">
                Showing <span className="font-bold text-slate-800">{totalEntries > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
                <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, totalEntries)}</span> of{' '}
                <span className="font-bold text-slate-800">{totalEntries}</span> entries
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
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${currentPage === p
                        ? 'bg-[#0f417a] text-white shadow-sm'
                        : 'border border-slate-200 text-slate-650 hover:bg-slate-50'
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
        </>
      )}

    </div>
  );
}
