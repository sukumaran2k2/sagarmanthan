import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FolderOpen, 
  Plus, 
  Search, 
  Copy, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  CheckCircle2,
  BarChart2,
  DollarSign,
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
  FilePieChart
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function ProjectTable({ 
  projects, 
  onAddProjectClick, 
  onAddSubProjectClick,
  onExportTrigger,
  activeTab,
  setActiveTab
}) {
  const gridRef = useRef();
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('all');

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

  const CATEGORIES = [
    'All Categories',
    'Capacity Enhancement',
    'Connectivity Enhancement',
    'Digital Infrastructure',
    'Dredging Projects',
    'Green Initiatives',
    'Coastal Berth',
    'Port Modernization',
    'Inland Waterways',
    'Shipyard Development',
    'Security & Surveillance',
    'Smart Port Solutions',
    'Renewable Energy',
    'Liquid Cargo Handling',
    'Dry Bulk Handling',
    'Logistics & Warehousing'
  ];

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter by Category
    if (selectedCategory !== 'All Categories') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter by Stage
    if (selectedStage !== 'All') {
      result = result.filter(p => p.stage === selectedStage);
    }
      // Filter by Internal Navigation tab
      if (activeSubTab && activeSubTab !== 'all') {
        if (activeSubTab === 'ongoing') {
          // Exclude projects that are not ongoing (e.g., Project Initiated)
          result = result.filter(p => p.stage !== 'Project Initiated');
        }
      }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.projectId && p.projectId.toLowerCase().includes(q)) ||
        (p.projectName && p.projectName.toLowerCase().includes(q)) ||
        (p.agency && p.agency.toLowerCase().includes(q))
      );
    }

    return result;
  }, [projects, searchQuery, selectedStage, selectedCategory]);

  // Total entries calculation
  const totalEntries = filteredProjects.length;

  // Sync entriesLimit with AG Grid Pagination Page Size
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

  // Define Grid Columns
  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 60,
      pinned: 'left',
      cellClass: 'text-center font-semibold text-slate-500 flex items-center justify-center'
    },
    {
      headerName: 'Project ID',
      field: 'projectId',
      minWidth: 110,
      pinned: 'left',
      cellRenderer: (params) => (
        <span className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer hover:underline flex items-center gap-1.5 h-full">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 inline-block"></span>
          {params.value}
        </span>
      )
    },
    {
      headerName: 'Sub Project ID',
      field: 'subProjectId',
      minWidth: 105,
      flex: 0.8,
      cellClass: 'text-center text-slate-400 font-medium flex items-center justify-center',
      valueFormatter: (params) => params.value && params.value !== '-' ? params.value : '-'
    },
    {
      headerName: 'Project Name',
      field: 'projectName',
      minWidth: 180,
      flex: 2,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params) => {
        const project = params.data;
        if (!project) return null;
        return (
          <div className="flex flex-col justify-center py-2 h-full">
            <span className="font-bold text-slate-800 block text-xs hover:text-blue-600 cursor-pointer transition-colors leading-relaxed whitespace-normal">
              {project.projectName}
            </span>
            {project.subProjectName && project.subProjectName !== '-' && (
              <span className="text-[10px] text-slate-500 font-bold block mt-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded w-fit">
                Sub-Project: {project.subProjectName}
              </span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Category',
      field: 'category',
      minWidth: 110,
      flex: 1,
      cellRenderer: (params) => (
        <div className="flex items-center h-full">
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-100">
            {params.value || 'Uncategorized'}
          </span>
        </div>
      )
    },
    {
      headerName: 'Sanctioned Cost (In Cr.)',
      field: 'cost',
      minWidth: 110,
      flex: 1,
      cellClass: 'text-right font-extrabold text-slate-700 flex items-center justify-end',
      valueFormatter: (params) => params.value ? parseFloat(params.value).toFixed(2) : '-'
    },
    {
      headerName: 'Implementing Agency',
      field: 'agency',
      minWidth: 130,
      flex: 1.2,
      cellClass: 'text-slate-600 font-medium flex items-center'
    },
    {
      headerName: 'Stage',
      field: 'stage',
      minWidth: 120,
      flex: 1,
      cellRenderer: (params) => {
        const stage = params.value;
        let style = 'bg-slate-50 text-slate-700 border-slate-200';
        if (stage === 'Under Implementation') {
          style = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (stage === 'Project Initiated') {
          style = 'bg-amber-50 text-amber-700 border-amber-200';
        } else if (stage === 'Under Tendering') {
          style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${style}`}>
              {stage}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Physical (%)',
      field: 'physicalProgress',
      minWidth: 80,
      flex: 0.6,
      cellRenderer: (params) => {
        const pct = params.value || 0;
        return (
          <div className="flex items-center space-x-1.5 h-full">
            <span className="font-bold text-slate-700 min-w-8">{pct}%</span>
          </div>
        );
      }
    },
    {
      headerName: 'Financial (%)',
      field: 'financialProgress',
      minWidth: 80,
      flex: 0.6,
      cellRenderer: (params) => {
        const pct = params.value || 0;
        return (
          <div className="flex items-center space-x-1.5 h-full">
            <span className="font-bold text-slate-700 min-w-8">{pct}%</span>
          </div>
        );
      }
    }
  ], []);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Cross-page module navigation (Projects tabs) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title & User Manual */}
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-slate-800 font-display">Project List</h2>
          {/* <button onClick={() => onExportTrigger('User Manual PDF download')} className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-xs rounded-lg shadow hover:shadow-lg transition cursor-pointer">
            <FileText className="h-4.5 w-4.5" />
            <span>User Manual</span>
          </button> */}
        </div>
        {/* Navigation */}
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

      {/* Combined Project Categories Selection & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <button 
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className={`w-full flex items-center justify-between text-left transition cursor-pointer ${
            isFiltersExpanded ? 'pb-3 border-b border-slate-100 mb-4' : ''
          }`}
        >
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 font-display">Project Categories & Filters</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-400">
            <span className="text-[10px] font-normal">Click to {isFiltersExpanded ? 'collapse' : 'expand'}</span>
            {isFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        
        {isFiltersExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
            {/* Stage Selection */}
            <div className="space-y-1.5 lg:border-r lg:border-slate-150 lg:pr-6 flex flex-col justify-center">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stage Selection</label>
              <select 
                value={selectedStage}
                onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                <option value="All">All Stages</option>
                <option value="Project Initiated">Project Initiated</option>
                <option value="Under Implementation">Under Implementation</option>
                <option value="Under Tendering">Under Tendering</option>
              </select>
            </div>

            {/* Project Categories Selection */}
            <div className="lg:col-span-3 space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project Categories Selection</span>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                {CATEGORIES.map((cat, i) => {
                  const isActive = selectedCategory === cat;
                  const imageUrl = {
                    'All Categories': 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=300&q=80',
                    'Capacity Enhancement': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=300&q=80',
                    'Connectivity Enhancement': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80',
                    'Digital Infrastructure': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80',
                    'Dredging Projects': 'https://images.unsplash.com/photo-1505705694340-019e1e335916?auto=format&fit=crop&w=300&q=80',
                    'Green Initiatives': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=300&q=80',
                    'Coastal Berth': 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=300&q=80',
                    'Port Modernization': 'https://images.unsplash.com/photo-1520262454473-a1a82276a574?auto=format&fit=crop&w=300&q=80',
                    'Inland Waterways': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=300&q=80',
                    'Shipyard Development': 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=300&q=80',
                    'Security & Surveillance': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=300&q=80',
                    'Smart Port Solutions': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80',
                    'Renewable Energy': 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=300&q=80',
                    'Liquid Cargo Handling': 'https://images.unsplash.com/photo-1542362567-b07eac790abc?auto=format&fit=crop&w=300&q=80',
                    'Dry Bulk Handling': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80',
                    'Logistics & Warehousing': 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=300&q=80'
                  }[cat];

                  return (
                    <button
                      key={i}
                      onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                      className={`relative w-44 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow border transition-all duration-300 ${
                        isActive 
                          ? 'ring-4 ring-[#0f417a] scale-95 shadow-md font-bold' 
                          : 'border-slate-200 opacity-80 hover:opacity-100 hover:scale-[1.02]'
                      }`}
                    >
                      {/* Background Image */}
                      <img 
                        src={imageUrl} 
                        alt={cat} 
                        className="w-full h-full object-cover"
                      />
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-slate-950/45 transition-colors"></div>
                      {/* Centered Category Text */}
                      <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">
                          {cat}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Button Row & Quick Actions */}
      <div className="flex flex-row items-center justify-between gap-4 w-full">
        {/* Left Side: Data exports logs */}
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => onExportTrigger('All Data Excel')}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>All Data</span>
          </button>
          <button 
            onClick={() => onExportTrigger('Expenditure Logs')}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Expenditure Logs</span>
          </button>
          <button 
            onClick={() => onExportTrigger('Media Files folder view')}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100/50 transition cursor-pointer"
          >
            <FolderOpen className="h-4 w-4 text-blue-600" />
            <span>Media Files</span>
          </button>
        </div>

        {/* Right Side: Operations / Add Button */}
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={onAddProjectClick}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Project</span>
          </button>
          <button 
            onClick={onAddSubProjectClick}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Sub Project</span>
          </button>
        </div>
      </div>

      {/* Grid Controls (Show Entries & Search) */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Copy, Excel, PDF export options */}
        <div className="flex items-center space-x-1.5 border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
          <button 
            onClick={() => onExportTrigger('Clipboard Copied')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button 
            onClick={() => onExportTrigger('Excel report')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button 
            onClick={() => onExportTrigger('PDF download')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
        </div>

        {/* Entries select & Search Input */}
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

      {/* Main Responsive Table */}
      <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        <AgGridReact 
          ref={gridRef}
          theme="legacy"
          rowData={filteredProjects}
          columnDefs={colDefs}
          defaultColDef={{ minWidth: 80, suppressSizeToFit: false }}
          pagination={true}
          paginationPageSize={entriesLimit}
          suppressPaginationPanel={true}
          onPaginationChanged={onPaginationChanged}
          domLayout="autoHeight"
          rowHeight={64}
          headerHeight={48}
          suppressColumnVirtualisation={true}
          autoSizeStrategy={{
            type: 'fitCellContents'
          }}
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
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    currentPage === p
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
      
    </div>
  );
}

