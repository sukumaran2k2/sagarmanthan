import { useState, useEffect, useRef, useMemo } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Layers,
  Sliders,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  LayoutDashboard,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  FolderSync,
  FilePieChart,
  Search,
  Copy
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const PHYSICAL_PROGRESS_DATA = [
  { range: '0%-20%', chpa: 15, copa: 17, dpa: 61, jnpa: 22, kpl: 15, mbpa: 24, mgpa: 3, nmpa: 5, ppa: 16, smpaHdc: 11, smpaKds: 17, vocpa: 43, vpa: 29, total: 278 },
  { range: '20%-40%', chpa: 2, copa: 0, dpa: 9, jnpa: 5, kpl: 1, mbpa: 0, mgpa: 0, nmpa: 1, ppa: 2, smpaHdc: 0, smpaKds: 4, vocpa: 5, vpa: 5, total: 34 },
  { range: '40%-60%', chpa: 1, copa: 1, dpa: 5, jnpa: 3, kpl: 2, mbpa: 3, mgpa: 0, nmpa: 1, ppa: 0, smpaHdc: 3, smpaKds: 2, vocpa: 5, vpa: 6, total: 32 },
  { range: '60%-80%', chpa: 1, copa: 1, dpa: 6, jnpa: 6, kpl: 0, mbpa: 2, mgpa: 0, nmpa: 0, ppa: 6, smpaHdc: 2, smpaKds: 2, vocpa: 4, vpa: 4, total: 34 },
  { range: '80%-100%', chpa: 18, copa: 3, dpa: 56, jnpa: 28, kpl: 17, mbpa: 19, mgpa: 15, nmpa: 13, ppa: 25, smpaHdc: 25, smpaKds: 17, vocpa: 28, vpa: 31, total: 295 }
];

export default function DashboardView({ projects, activeTab, setActiveTab }) {
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [zoomScale, setZoomScale] = useState(1);
  const chartContainerRef = useRef(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [openFilters, setOpenFilters] = useState({
    orgCategory: false,
    orgWise: false,
    foundation: false,
    inauguration: false,
    workAwarded: false,
    actualCompletion: false,
    sanctioned: false
  });

  const toggleFilter = (key) => {
    setOpenFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    const handleWheel = (e) => {
      if (!chartContainerRef.current) return;
      // Only zoom if the mouse is hovering over the chart element
      if (chartContainerRef.current.contains(e.target)) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 0.08;
        setZoomScale(prev => {
          const next = prev + direction * factor;
          return Math.max(0.5, Math.min(3.0, next));
        });
      }
    };

    const container = chartContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  // Custom organizations data for the bar chart
  const orgData = [
    { name: 'JNPA', count: 42, color: 'bg-cyan-500' },
    { name: 'DePA', count: 22, color: 'bg-blue-500' },
    { name: 'VOCPA', count: 138, color: 'bg-indigo-600' },
    { name: 'CoPA', count: 68, color: 'bg-violet-500' },
    { name: 'MoPA', count: 35, color: 'bg-purple-500' },
    { name: 'KoPL', count: 52, color: 'bg-fuchsia-500' },
    { name: 'NMPA', count: 18, color: 'bg-pink-500' },
    { name: 'VPA', count: 20, color: 'bg-rose-500' },
    { name: 'ChPA', count: 54, color: 'bg-rose-600' },
    { name: 'PPT', count: 48, color: 'bg-orange-500' },
    { name: 'SMPT', count: 48, color: 'bg-amber-500' },
    { name: 'SCI', count: 85, color: 'bg-amber-400' },
    { name: 'IWAI', count: 75, color: 'bg-yellow-500' },
  ];

  // Ongoing projects table data
  const ongoingProjects = [
    { sno: 1, category: 'Capacity Enhancement Projects', epc: '128', ppp: '18', total: 146, pct: '34.60%', cost: '35,860.92' },
    { sno: 2, category: 'Community Development Projects', epc: '14', ppp: '33', total: 47, pct: '11.14%', cost: '34,245.81' },
    { sno: 3, category: 'Connectivity Enhancement Projects', epc: '32', ppp: '-', total: 32, pct: '7.58%', cost: '1,612.75' },
    { sno: 4, category: 'Digital Infrastructure Projects', epc: '10', ppp: '-', total: 10, pct: '2.37%', cost: '16,951,251.81' },
    { sno: 5, category: 'Dredging Projects', epc: '11', ppp: '-', total: 11, pct: '2.61%', cost: '913.90' },
    { sno: 6, category: 'Green Initiatives', epc: '30', ppp: '-', total: 30, pct: '7.11%', cost: '753.25' },
    { sno: 7, category: 'Other Infrastructure Projects', epc: '89', ppp: '7', total: 96, pct: '22.75%', cost: '84,848.07' },
  ];

  // AG Grid States & Definitions for Table 1 (Physical Progress)
  const physicalGridRef = useRef();
  const [physicalEntriesLimit, setPhysicalEntriesLimit] = useState(5);
  const [physicalCurrentPage, setPhysicalCurrentPage] = useState(1);
  const [physicalTotalPages, setPhysicalTotalPages] = useState(1);
  const [physicalSearchQuery, setPhysicalSearchQuery] = useState('');

  // Sync entriesLimit with AG Grid Pagination Page Size
  useEffect(() => {
    if (physicalGridRef.current && physicalGridRef.current.api) {
      physicalGridRef.current.api.setGridOption('paginationPageSize', physicalEntriesLimit);
    }
  }, [physicalEntriesLimit]);

  // Apply Quick Search to AG Grid
  useEffect(() => {
    if (physicalGridRef.current && physicalGridRef.current.api) {
      physicalGridRef.current.api.setGridOption('quickFilterText', physicalSearchQuery);
    }
  }, [physicalSearchQuery]);

  const handlePhysicalPageChange = (page) => {
    if (physicalGridRef.current && physicalGridRef.current.api && page >= 1 && page <= physicalTotalPages) {
      physicalGridRef.current.api.paginationGoToPage(page - 1);
    }
  };

  const onPhysicalPaginationChanged = () => {
    if (physicalGridRef.current && physicalGridRef.current.api) {
      const page = physicalGridRef.current.api.paginationGetCurrentPage() + 1;
      const total = physicalGridRef.current.api.paginationGetTotalPages();
      setPhysicalCurrentPage(page);
      setPhysicalTotalPages(total || 1);
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

  const physicalColDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-550 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center text-[11px]'
    },
    {
      headerName: 'Progress Range',
      field: 'range',
      width: 140,
      pinned: 'left',
      cellClass: 'text-slate-800 font-extrabold flex items-center border-r border-slate-100 justify-center text-[11px]'
    },
    { headerName: 'ChPA', field: 'chpa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'CoPA', field: 'copa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'DPA', field: 'dpa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'JNPA', field: 'jnpa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'KPL', field: 'kpl', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'MbPA', field: 'mbpa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'MgPA', field: 'mgpa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'NMPA', field: 'nmpa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'PPA', field: 'ppa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'SMPA-HDC', field: 'smpaHdc', width: 110, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'SMPA-KDS', field: 'smpaKds', width: 110, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'VOCPA', field: 'vocpa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'VPA', field: 'vpa', width: 90, cellClass: 'text-center font-semibold text-blue-600 flex items-center justify-center border-r border-slate-100 text-[11px]' },
    { headerName: 'Total', field: 'total', width: 100, cellClass: 'text-center font-extrabold text-slate-900 bg-slate-50 flex items-center justify-center text-[11px]' }
  ], []);

  // AG Grid States & Definitions for Table 2 (Ongoing Projects)
  const ongoingGridRef = useRef();
  const [ongoingEntriesLimit, setOngoingEntriesLimit] = useState(10);
  const [ongoingCurrentPage, setOngoingCurrentPage] = useState(1);
  const [ongoingTotalPages, setOngoingTotalPages] = useState(1);
  const [ongoingSearchQuery, setOngoingSearchQuery] = useState('');

  // Sync entriesLimit with AG Grid Pagination Page Size
  useEffect(() => {
    if (ongoingGridRef.current && ongoingGridRef.current.api) {
      ongoingGridRef.current.api.setGridOption('paginationPageSize', ongoingEntriesLimit);
    }
  }, [ongoingEntriesLimit]);

  // Apply Quick Search to AG Grid
  useEffect(() => {
    if (ongoingGridRef.current && ongoingGridRef.current.api) {
      ongoingGridRef.current.api.setGridOption('quickFilterText', ongoingSearchQuery);
    }
  }, [ongoingSearchQuery]);

  const handleOngoingPageChange = (page) => {
    if (ongoingGridRef.current && ongoingGridRef.current.api && page >= 1 && page <= ongoingTotalPages) {
      ongoingGridRef.current.api.paginationGoToPage(page - 1);
    }
  };

  const onOngoingPaginationChanged = () => {
    if (ongoingGridRef.current && ongoingGridRef.current.api) {
      const page = ongoingGridRef.current.api.paginationGetCurrentPage() + 1;
      const total = ongoingGridRef.current.api.paginationGetTotalPages();
      setOngoingCurrentPage(page);
      setOngoingTotalPages(total || 1);
    }
  };

  const ongoingColDefs = useMemo(() => [
    {
      headerName: 'S.No',
      field: 'sno',
      width: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-400 border-r border-slate-100 flex items-center justify-center text-[11px]'
    },
    {
      headerName: 'Broad Category Name',
      field: 'category',
      minWidth: 250,
      flex: 2,
      pinned: 'left',
      cellClass: 'text-left text-slate-800 font-bold tracking-tight border-r border-slate-100 flex items-center text-[11px]'
    },
    {
      headerName: 'EPC (B)',
      field: 'epc',
      width: 120,
      cellClass: 'text-center font-extrabold text-blue-600 border-r border-slate-100 flex items-center justify-center text-[11px]'
    },
    {
      headerName: 'PPP (C)',
      field: 'ppp',
      width: 120,
      cellClass: 'text-center font-extrabold text-blue-600 border-r border-slate-100 flex items-center justify-center text-[11px]'
    },
    {
      headerName: 'Total (D = B+C)',
      field: 'total',
      width: 150,
      cellClass: 'text-center font-extrabold text-slate-900 border-r border-slate-100 flex items-center justify-center text-[11px]'
    },
    {
      headerName: 'Percentage (E)',
      field: 'pct',
      width: 130,
      cellClass: 'text-center font-semibold text-slate-550 border-r border-slate-100 flex items-center justify-center text-[11px]'
    },
    {
      headerName: 'Estimated Cost (F)',
      field: 'cost',
      width: 160,
      cellClass: 'text-right font-extrabold text-slate-850 flex items-center justify-end text-[11px]',
      valueFormatter: (params) => params.value ? `₹ ${params.value} Cr` : '-'
    }
  ], []);

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 py-6 animate-fade-in text-slate-800 bg-slate-50/50 min-h-screen">

      {/* Header Panel — title only, no sub-nav (handled by InternalNavigation dropdown) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">Projects Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time status updates and financial tracking of key maritime category plans.</p>
        </div>
        {/* Navigation container aligned right and enlarged to hold both nav components */}
        <div className="flex flex-col items-start space-y-2">
          {/* Primary navigation tabs */}
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
          {/* Secondary navigation for Project Dashboard sub‑views */}
          {activeTab === 'dashboard' && (
            <InternalNavigation
              tabs={[
                { id: 'all', label: 'All Projects View' },
                { id: 'ongoing', label: 'Ongoing Projects – Major Ports' },
              ]}
              currentTab={activeSubTab}
              onTabChange={setActiveSubTab}
            />
          )}
        </div>
      </div>




      {activeSubTab === 'all' ? (
        <>
          {/* Filter Options Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div
              onClick={() => setIsFiltersExpanded(prev => !prev)}
              className="flex items-center justify-between border-b border-slate-100 pb-3 cursor-pointer select-none"
            >
              <div className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dashboard Filters</h3>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-blue-650 font-bold hover:text-blue-800 transition-colors">
                <span>{isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}</span>
                <ChevronDown className={`h-4 w-4 text-blue-650 transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {isFiltersExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2 animate-fade-in">

                {/* Dropdown 1 */}
                <div className={`p-3.5 rounded-xl border transition-all ${openFilters.orgCategory ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
                  <button
                    onClick={() => toggleFilter('orgCategory')}
                    className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                  >
                    <span className="text-[11px] uppercase tracking-wider">Organisation Category</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.orgCategory ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {openFilters.orgCategory && (
                    <div className="relative mt-3 animate-fade-in">
                      <select className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-medium text-slate-800">
                        <option>Major Ports</option>
                      </select>
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4 fill-emerald-100" />
                      </div>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown 2 */}
                <div className={`p-3.5 rounded-xl border transition-all ${openFilters.orgWise ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
                  <button
                    onClick={() => toggleFilter('orgWise')}
                    className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                  >
                    <span className="text-[11px] uppercase tracking-wider">Organisation Wise</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.orgWise ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {openFilters.orgWise && (
                    <div className="relative mt-3 animate-fade-in">
                      <select className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer font-medium text-slate-800">
                        <option>--Organisation--</option>
                      </select>
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4 fill-emerald-100" />
                      </div>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range 1 */}
                <div className={`p-3.5 rounded-xl border transition-all ${openFilters.foundation ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
                  <button
                    onClick={() => toggleFilter('foundation')}
                    className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                  >
                    <span className="text-[11px] uppercase tracking-wider">Tentative Foundation Date</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.foundation ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {openFilters.foundation && (
                    <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
                      <div className="relative">
                        <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range 2 */}
                <div className={`p-3.5 rounded-xl border transition-all ${openFilters.inauguration ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
                  <button
                    onClick={() => toggleFilter('inauguration')}
                    className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                  >
                    <span className="text-[11px] uppercase tracking-wider">Tentative Inauguration Date</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.inauguration ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {openFilters.inauguration && (
                    <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
                      <div className="relative">
                        <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range 3 */}
                <div className={`p-3.5 rounded-xl border transition-all ${openFilters.workAwarded ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
                  <button
                    onClick={() => toggleFilter('workAwarded')}
                    className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                  >
                    <span className="text-[11px] uppercase tracking-wider">Work Awarded Date</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.workAwarded ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {openFilters.workAwarded && (
                    <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
                      <div className="relative">
                        <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range 4 */}
                <div className={`p-3.5 rounded-xl border transition-all ${openFilters.actualCompletion ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
                  <button
                    onClick={() => toggleFilter('actualCompletion')}
                    className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                  >
                    <span className="text-[11px] uppercase tracking-wider">Actual Completion Date</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.actualCompletion ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {openFilters.actualCompletion && (
                    <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
                      <div className="relative">
                        <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range 5 */}
                <div className={`p-3.5 rounded-xl border transition-all ${openFilters.sanctioned ? 'bg-blue-50/60 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300/80'}`}>
                  <button
                    onClick={() => toggleFilter('sanctioned')}
                    className="flex items-center justify-between w-full font-bold text-left text-slate-700 hover:text-blue-700 cursor-pointer"
                  >
                    <span className="text-[11px] uppercase tracking-wider">Sanctioned Date</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openFilters.sanctioned ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {openFilters.sanctioned && (
                    <div className="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
                      <div className="relative">
                        <input type="text" placeholder="From" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="To" defaultValue="dd-mm-yyyy" className="w-full text-[11px] pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700 font-semibold" />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

            {/* Card 1: Total Projects */}
            <div className="bg-gradient-to-b from-[#1b4380] to-[#0f2e5a] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">Total Projects</span>
                  <span className="text-3xl font-extrabold font-display tracking-tight block">673</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                  <BarChart2 className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-blue-200 font-semibold">TOTAL COST</span>
                  <span className="font-bold text-white text-xs">₹ 17,126,959.31 Cr</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-blue-200 font-semibold">CAPACITY (MTPA)</span>
                  <span className="font-bold text-white text-xs">1,121.08</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">603</div>
                    <div className="text-[9px] text-blue-200 font-medium mt-0.5">EPC</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹17M Cr</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">70</div>
                    <div className="text-[9px] text-blue-200 font-medium mt-0.5">PPP</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹68.9K Cr</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Planning & Sanctioning */}
            <div className="bg-gradient-to-b from-[#009cb3] to-[#007b8f] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-100 block">Planning & Sanctioning</span>
                  <span className="text-3xl font-extrabold font-display tracking-tight block">129</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                  <Layers className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-cyan-100 font-semibold">TOTAL COST</span>
                  <span className="font-bold text-white text-xs">₹ 29,985.39 Cr</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-cyan-100 font-semibold">CAPACITY (MTPA)</span>
                  <span className="font-bold text-white text-xs">213.10</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">119</div>
                    <div className="text-[9px] text-cyan-100 font-medium mt-0.5">EPC</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹10.9K Cr</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">10</div>
                    <div className="text-[9px] text-cyan-100 font-medium mt-0.5">PPP</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹19K Cr</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Under Tendering */}
            <div className="bg-gradient-to-b from-[#f09633] to-[#cc771d] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100 block">Under Tendering</span>
                  <span className="text-3xl font-extrabold font-display tracking-tight block">78</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                  <BarChart2 className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-orange-100 font-semibold">TOTAL COST</span>
                  <span className="font-bold text-white text-xs">₹ 1,483.29 Cr</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-orange-100 font-semibold">CAPACITY (MTPA)</span>
                  <span className="font-bold text-white text-xs">661.03</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">53</div>
                    <div className="text-[9px] text-orange-100 font-medium mt-0.5">EPC</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹631 Cr</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">25</div>
                    <div className="text-[9px] text-orange-100 font-medium mt-0.5">PPP</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹852 Cr</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Under Implementation */}
            <div className="bg-gradient-to-b from-[#d2ab28] to-[#ab8714] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">Under Implementation</span>
                  <span className="text-3xl font-extrabold font-display tracking-tight block">215</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                  <BarChart2 className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-amber-100 font-semibold">TOTAL COST</span>
                  <span className="font-bold text-white text-xs">₹ 23,053.39 Cr</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-amber-100 font-semibold">CAPACITY (MTPA)</span>
                  <span className="font-bold text-white text-xs">167.56</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">192</div>
                    <div className="text-[9px] text-amber-100 font-medium mt-0.5">EPC</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹7,136 Cr</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">23</div>
                    <div className="text-[9px] text-amber-100 font-medium mt-0.5">PPP</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹15.9K Cr</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Completed Projects */}
            <div className="bg-gradient-to-b from-[#10b981] to-[#059669] text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">Completed Projects</span>
                  <span className="text-3xl font-extrabold font-display tracking-tight block">251</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-[10px]">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-emerald-100 font-semibold">TOTAL COST</span>
                  <span className="font-bold text-white text-xs">₹ 15,589.66 Cr</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-emerald-100 font-semibold">CAPACITY (MTPA)</span>
                  <span className="font-bold text-white text-xs">79.39</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">239</div>
                    <div className="text-[9px] text-emerald-100 font-medium mt-0.5">EPC</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹9,080 Cr</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-[12px]">12</div>
                    <div className="text-[9px] text-emerald-100 font-medium mt-0.5">PPP</div>
                    <div className="text-[8px] font-bold text-slate-200 mt-0.5">₹6,509 Cr</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Charts Row: Organisations Wise Project Count & Delay Status side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Organisations Wise Project Count Bar Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-150 pb-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Organisations Wise Project Count</h3>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200/60 rounded-xl p-1.5 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">Scroll to Zoom</span>
                    <div className="h-4 w-[1px] bg-slate-200"></div>
                    <button
                      onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}
                      className="p-1 hover:bg-slate-200/70 hover:text-slate-850 rounded transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] font-bold min-w-10 text-center text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-xs select-none">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomScale(prev => Math.min(3.0, prev + 0.1))}
                      className="p-1 hover:bg-slate-200/70 hover:text-slate-850 rounded transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomScale(1.0)}
                      className="p-1 hover:bg-slate-200/70 hover:text-slate-850 rounded transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Custom Interactive SVG/CSS Bar Chart wrapper for mobile scrollability */}
                <div
                  ref={chartContainerRef}
                  className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 cursor-zoom-in"
                >
                  <div
                    className="relative h-72 w-full flex items-end justify-between px-4 pb-10 border-b border-slate-150 transition-all duration-150"
                    style={{
                      minWidth: `${768 * zoomScale}px`,
                    }}
                  >

                    {/* Y-Axis Gridlines */}
                    <div className="absolute inset-x-0 top-0 h-full pointer-events-none flex flex-col justify-between text-[9px] text-slate-400">
                      <div className="w-full border-t border-slate-100 flex justify-between pt-1">
                        <span>150</span>
                      </div>
                      <div className="w-full border-t border-slate-100 flex justify-between pt-1">
                        <span>100</span>
                      </div>
                      <div className="w-full border-t border-slate-100 flex justify-between pt-1">
                        <span>50</span>
                      </div>
                      <div className="w-full flex justify-between pt-1">
                        <span>0</span>
                      </div>
                    </div>

                    {/* Bars Container */}
                    <div className="w-full h-full flex items-end justify-between relative z-10 px-6">
                      {orgData.map((org, idx) => {
                        // Scale the height: max is 150 -> map to percentage of container
                        const heightPercent = (org.count / 150) * 100;
                        return (
                          <div key={idx} className="flex flex-col justify-end items-center group relative flex-1 mx-2 h-full">
                            {/* Tooltip */}
                            <div className="absolute -top-9 bg-slate-900 text-white text-[9px] px-2.5 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap font-bold">
                              {org.name}: {org.count}
                            </div>

                            {/* Bar */}
                            <div
                              className={`w-full rounded-t-md ${org.color} shadow-md hover:brightness-90 hover:shadow-lg transition-all duration-500`}
                              style={{ height: `${heightPercent}%` }}
                            ></div>

                            {/* Label (Slanted/Rotated) */}
                            <span className="absolute top-full mt-3 text-[9px] font-bold text-slate-500 origin-center rotate-45 whitespace-nowrap">
                              {org.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Delay Status Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-650"></span>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Delay Status - Under Implementation Projects</h3>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-around py-6 gap-6">

                  {/* SVG Pie Chart */}
                  <div className="relative flex items-center justify-center">
                    <svg className="w-64 h-64 transform -rotate-90">
                      {/* Outer circle backdrop */}
                      <circle cx="128" cy="128" r="90" stroke="#f1f5f9" strokeWidth="32" fill="transparent" />

                      {/* Slice 1: On Time (138 projects -> 64.2% -> strokeDasharray="565.5" strokeDashoffset="202.5") */}
                      <circle
                        cx="128"
                        cy="128"
                        r="90"
                        stroke="#0ea5e9"
                        strokeWidth="32"
                        fill="transparent"
                        strokeDasharray="565.5"
                        strokeDashoffset="202.5"
                        strokeLinecap="butt"
                      />

                      {/* Slice 2: Delayed (77 projects -> 35.8% -> strokeDasharray="202.5 565.5" strokeDashoffset="-363.0") */}
                      <circle
                        cx="128"
                        cy="128"
                        r="90"
                        stroke="#6366f1"
                        strokeWidth="32"
                        fill="transparent"
                        strokeDasharray="202.5 565.5"
                        strokeDashoffset="-363.0"
                        strokeLinecap="butt"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-black text-slate-850">215</span>
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Total Under</span>
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest leading-tight">Implementation</span>
                    </div>
                  </div>

                  {/* Legends & Metrics */}
                  <div className="space-y-4 min-w-48">
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center space-x-2.5">
                        <span className="h-3 w-3 rounded-full bg-[#6366f1] inline-block"></span>
                        <span className="text-xs font-bold text-slate-600">Delayed</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-800">77</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center space-x-2.5">
                        <span className="h-3 w-3 rounded-full bg-[#0ea5e9] inline-block"></span>
                        <span className="text-xs font-bold text-slate-600">On Time</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-800">138</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Physical Progress (20% Buckets) Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
              <div className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Physical Progress (20% Buckets)</h3>
              </div>
            </div>

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
                    value={physicalEntriesLimit}
                    onChange={(e) => { setPhysicalEntriesLimit(parseInt(e.target.value)); }}
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
                    value={physicalSearchQuery}
                    onChange={(e) => setPhysicalSearchQuery(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold w-56 text-slate-750"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Main Responsive Table */}
            <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
              <AgGridReact
                ref={physicalGridRef}
                theme="legacy"
                rowData={PHYSICAL_PROGRESS_DATA}
                columnDefs={physicalColDefs}
                pagination={true}
                paginationPageSize={physicalEntriesLimit}
                suppressPaginationPanel={true}
                onPaginationChanged={onPhysicalPaginationChanged}
                domLayout="autoHeight"
                rowHeight={64}
                headerHeight={48}
                suppressColumnVirtualisation={true}
                autoSizeStrategy={{
                  type: 'fitGridWidth'
                }}
              />

              {/* Custom Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
                <span className="text-slate-500 font-medium text-center sm:text-left">
                  Showing <span className="font-bold text-slate-800">{PHYSICAL_PROGRESS_DATA.length > 0 ? (physicalCurrentPage - 1) * physicalEntriesLimit + 1 : 0}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(physicalCurrentPage * physicalEntriesLimit, PHYSICAL_PROGRESS_DATA.length)}</span> of{' '}
                  <span className="font-bold text-slate-800">{PHYSICAL_PROGRESS_DATA.length}</span> entries
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePhysicalPageChange(physicalCurrentPage - 1)}
                    disabled={physicalCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: physicalTotalPages }, (_, i) => i + 1).map(p => {
                    if (physicalTotalPages > 6 && Math.abs(physicalCurrentPage - p) > 1 && p !== 1 && p !== physicalTotalPages) {
                      if (p === 2 || p === physicalTotalPages - 1) {
                        return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => handlePhysicalPageChange(p)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${physicalCurrentPage === p
                            ? 'bg-[#0f417a] text-white shadow-sm'
                            : 'border border-slate-200 text-slate-655 hover:bg-slate-50'
                          }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePhysicalPageChange(physicalCurrentPage + 1)}
                    disabled={physicalCurrentPage === physicalTotalPages || physicalTotalPages === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-fade-in">

          {/* Top Row: Estimated Cost and circular Ongoing projects side-by-side inside a professional panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

            {/* Estimated Cost Card */}
            <div className="bg-gradient-to-br from-blue-50/50 via-white to-sky-50 border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center lg:col-span-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-blue-100/30 rounded-full blur-2xl pointer-events-none"></div>
              <div className="p-3 bg-blue-100/80 rounded-2xl text-blue-800 mb-3.5 shadow-sm">
                <DollarSign className="h-6 w-6" />
              </div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Estimated Cost (In INR Crore)</p>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-[#0f417a] tracking-tight mt-1.5 font-display">
                17,111,073.58
              </h2>
              <div className="mt-3 flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>Active Capital Allocation</span>
              </div>
            </div>

            {/* Modern Circular Badge Widget */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center relative">
              <div className="relative flex items-center justify-center">
                {/* SVG Progress Ring */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="54" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                  <circle cx="64" cy="64" r="54" stroke="#1b4380" strokeWidth="8" fill="transparent" strokeDasharray="339" strokeDashoffset="80" strokeLinecap="round" />
                </svg>

                {/* Text Inner Info */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-[#1b4380] tracking-tight font-display">422</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Ongoing</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Projects</span>
                </div>
              </div>
            </div>

          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm gap-4">
            <div className="text-xs text-slate-500 font-semibold">
              Selected: <strong className="text-slate-800">Ongoing Projects - Major Ports</strong> | Category Group A - F
            </div>

            {/* Export Buttons */}
            <div className="flex space-x-3 w-full sm:w-auto justify-end">
              <button className="flex items-center space-x-1.5 px-4.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] font-bold tracking-wider rounded-lg transition-all cursor-pointer shadow-md hover:shadow-lg">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export to Excel</span>
              </button>
              <button className="flex items-center space-x-1.5 px-4.5 py-2 bg-[#be123c] hover:bg-[#9f1239] text-white text-[10px] font-bold tracking-wider rounded-lg transition-all cursor-pointer shadow-md hover:shadow-lg">
                <FileText className="h-3.5 w-3.5" />
                <span>Export to PDF</span>
              </button>
            </div>
          </div>

          {/* Data Table Controls */}
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
                    value={ongoingEntriesLimit}
                    onChange={(e) => { setOngoingEntriesLimit(parseInt(e.target.value)); }}
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
                    value={ongoingSearchQuery}
                    onChange={(e) => setOngoingSearchQuery(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold w-56 text-slate-750"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Main Responsive Table */}
            <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
              <AgGridReact
                ref={ongoingGridRef}
                theme="legacy"
                rowData={ongoingProjects}
                columnDefs={ongoingColDefs}
                pagination={true}
                paginationPageSize={ongoingEntriesLimit}
                suppressPaginationPanel={true}
                onPaginationChanged={onOngoingPaginationChanged}
                domLayout="autoHeight"
                rowHeight={64}
                headerHeight={48}
                suppressColumnVirtualisation={true}
                autoSizeStrategy={{
                  type: 'fitGridWidth'
                }}
              />

              {/* Custom Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
                <span className="text-slate-500 font-medium text-center sm:text-left">
                  Showing <span className="font-bold text-slate-800">{ongoingProjects.length > 0 ? (ongoingCurrentPage - 1) * ongoingEntriesLimit + 1 : 0}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(ongoingCurrentPage * ongoingEntriesLimit, ongoingProjects.length)}</span> of{' '}
                  <span className="font-bold text-slate-800">{ongoingProjects.length}</span> entries
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOngoingPageChange(ongoingCurrentPage - 1)}
                    disabled={ongoingCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: ongoingTotalPages }, (_, i) => i + 1).map(p => {
                    if (ongoingTotalPages > 6 && Math.abs(ongoingCurrentPage - p) > 1 && p !== 1 && p !== ongoingTotalPages) {
                      if (p === 2 || p === ongoingTotalPages - 1) {
                        return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => handleOngoingPageChange(p)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${ongoingCurrentPage === p
                            ? 'bg-[#0f417a] text-white shadow-sm'
                            : 'border border-slate-200 text-slate-655 hover:bg-slate-50'
                          }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handleOngoingPageChange(ongoingCurrentPage + 1)}
                    disabled={ongoingCurrentPage === ongoingTotalPages || ongoingTotalPages === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
