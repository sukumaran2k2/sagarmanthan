import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FolderOpen, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Copy, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from 'lucide-react';

export default function ProjectTable({ 
  projects, 
  onAddProjectClick, 
  onAddSubProjectClick,
  onExportTrigger 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showFilters, setShowFilters] = useState(false);

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

  // Sorting Handler
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Filtered & Sorted Projects
  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    // Filter by Category
    if (selectedCategory !== 'All Categories') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter by Stage
    if (selectedStage !== 'All') {
      result = result.filter(p => p.stage === selectedStage);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.projectId.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.agency.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Parse numeric values
        if (sortConfig.key === 'cost') {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [projects, searchQuery, selectedStage, selectedCategory, sortConfig]);

  // Pagination calculations
  const totalEntries = filteredAndSortedProjects.length;
  const totalPages = Math.ceil(totalEntries / entriesLimit);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * entriesLimit;
    return filteredAndSortedProjects.slice(start, start + entriesLimit);
  }, [filteredAndSortedProjects, currentPage, entriesLimit]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Stage CSS Resolver
  const getStageStyle = (stage) => {
    switch(stage) {
      case 'Under Implementation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Project Initiated':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Under Tendering':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      
      {/* Title & User Manual */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display">Project List</h2>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
            <span>Home</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">Project List</span>
          </div>
        </div>
        <button 
          onClick={() => onExportTrigger('User Manual PDF download')}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-xs rounded-lg shadow hover:shadow-lg transition cursor-pointer"
        >
          <FileText className="h-4.5 w-4.5" />
          <span>User Manual</span>
        </button>
      </div>

      {/* Horizontal Category Navigation Bar with Background Images */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Project Categories Selection</span>
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

      {/* Collapsible Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/50 text-slate-700 font-bold text-xs border-b border-slate-200 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span>Project Filters</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">Click to {showFilters ? 'collapse' : 'expand'}</span>
        </button>
        {showFilters && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stage Selection</label>
              <select 
                value={selectedStage}
                onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Stages</option>
                <option value="Project Initiated">Project Initiated</option>
                <option value="Under Implementation">Under Implementation</option>
                <option value="Under Tendering">Under Tendering</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Button Row & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
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
              onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span className="text-xs text-slate-500 whitespace-nowrap">entries</span>
          </div>

          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input 
              type="text" 
              placeholder="Search project..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f417a] text-white text-xs font-bold uppercase tracking-wider border-b border-blue-900">
                <th className="px-4 py-3.5 text-center w-14">S.No</th>
                
                <th 
                  onClick={() => handleSort('projectId')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-[#0c3666] transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Project ID</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                
                <th className="px-4 py-3.5 text-center">Sub Project ID</th>
                
                <th 
                  onClick={() => handleSort('projectName')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-[#0c3666] transition-colors w-72"
                >
                  <div className="flex items-center space-x-1">
                    <span>Project Name</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                
                <th className="px-4 py-3.5">Category</th>
                
                <th 
                  onClick={() => handleSort('cost')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:bg-[#0c3666] transition-colors"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Sanctioned Cost (In Cr.)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                
                <th className="px-4 py-3.5">Primary Implementing Agency</th>
                <th className="px-4 py-3.5 text-center">Current Stage</th>
                <th className="px-4 py-3.5 text-center">Physical (%)</th>
                <th className="px-4 py-3.5 text-center">Financial (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedProjects.length > 0 ? (
                paginatedProjects.map((project, index) => (
                  <tr 
                    key={project.id} 
                    className="hover:bg-slate-50/60 transition-colors duration-150"
                  >
                    <td className="px-4 py-4 text-center font-semibold text-slate-500">
                      {(currentPage - 1) * entriesLimit + index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer hover:underline flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 inline-block"></span>
                        {project.projectId}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-400 font-medium">{project.subProjectId || '-'}</td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-slate-800 block text-xs hover:text-blue-600 cursor-pointer transition-colors leading-relaxed">
                        {project.projectName}
                      </span>
                      {project.subProjectName && project.subProjectName !== '-' && (
                        <span className="text-[10px] text-slate-500 font-bold block mt-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded w-fit">
                          Sub-Project: {project.subProjectName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        {project.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-extrabold text-slate-700">
                      {project.cost ? parseFloat(project.cost).toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-4 text-slate-600 font-medium">{project.agency}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full border ${getStageStyle(project.stage)}`}>
                        {project.stage}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="font-bold text-slate-700">{project.physicalProgress}%</span>
                        {/* Progress mini indicator */}
                        <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${project.physicalProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="font-bold text-slate-700">{project.financialProgress}%</span>
                        <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${project.financialProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-slate-400 font-medium">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Controls */}
        <div className="bg-slate-50 px-4 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-700">{totalEntries > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * entriesLimit, totalEntries)}</span> of <span className="font-bold text-slate-700">{totalEntries}</span> entries
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg cursor-pointer transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-1 font-semibold rounded-lg cursor-pointer transition ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg cursor-pointer transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
