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
import InternalNavigation from '../../../components/navigation/InternalNavigation';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

import { CATEGORIES } from '../constants';
import { 
  getProjectGridColumns, 
  ProjectGridToolbar, 
  ProjectGridPagination, 
  ProjectListFilters, 
  ProjectListActions 
} from '../components/ProjectGrid';

export default function ProjectTable({ 
  projects, 
  onAddProjectClick, 
  onAddSubProjectClick,
  onExportTrigger,
  headerNav
}) {
  const gridRef = useRef();
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isPinned, setIsPinned] = useState(window.innerWidth < 1024);
  const [activeSubTab, setActiveSubTab] = useState('all');

  useEffect(() => {
    const handleResize = () => {
      setIsPinned(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



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

  const colDefs = useMemo(() => getProjectGridColumns(isPinned), [isPinned]);

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
        {headerNav}
      </div>

      {/* Combined Project Categories Selection & Filters */}
      <ProjectListFilters
        isFiltersExpanded={isFiltersExpanded}
        setIsFiltersExpanded={setIsFiltersExpanded}
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        setCurrentPage={setCurrentPage}
      />

      {/* Button Row & Quick Actions */}
      <ProjectListActions 
        onExportTrigger={onExportTrigger}
        onAddProjectClick={onAddProjectClick}
        onAddSubProjectClick={onAddSubProjectClick}
      />

      {/* Grid Controls */}
      <ProjectGridToolbar 
        onExportTrigger={onExportTrigger}
        entriesLimit={entriesLimit}
        setEntriesLimit={setEntriesLimit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Responsive Table */}
      <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-md">
        <AgGridReact 
          ref={gridRef}
          theme="legacy"
          rowData={filteredProjects}
          columnDefs={colDefs}
          pagination={true}
          paginationPageSize={entriesLimit}
          suppressPaginationPanel={true}
          onPaginationChanged={onPaginationChanged}
          domLayout="autoHeight"
          rowHeight={64}
          headerHeight={48}
          autoSizeStrategy={{
            type: 'fitGridWidth',
            defaultMinWidth: 80
          }}
        />

        <ProjectGridPagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalEntries}
          entriesLimit={entriesLimit}
          onPageChange={handlePageChange}
        />
      </div>
      
    </div>
  );
}

