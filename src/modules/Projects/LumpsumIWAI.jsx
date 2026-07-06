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
  ArrowLeft,
  Calendar,
  Trash
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';

ModuleRegistry.registerModules([AllCommunityModule]);

const INITIAL_PROJECTS = [
  { id: 1, projectId: 'PR0694', projectName: 'Comprehensive Development of NW-16', cost: 10.00 },
  { id: 2, projectId: 'PR0695', projectName: 'Comprehensive Development of NW-2', cost: 41.91 },
  { id: 3, projectId: 'PR0700', projectName: 'JMVP 1', cost: 776.96 }
];

const INITIAL_ACTIVITIES = [
  { id: 1, projectId: 'PR0694', projectName: 'Comprehensive Development of NW-16', activityName: 'Dredging works at Barak river', cost: 2.50, date: '2026-07-01' },
  { id: 2, projectId: 'PR0694', projectName: 'Comprehensive Development of NW-16', activityName: 'Terminal construction at Badarpur', cost: 4.50, date: '2026-07-02' },
  { id: 3, projectId: 'PR0694', projectName: 'Comprehensive Development of NW-16', activityName: 'Consultancy services', cost: 3.00, date: '2026-07-03' },
  { id: 4, projectId: 'PR0695', projectName: 'Comprehensive Development of NW-2', activityName: 'Slipway at Pandu', cost: 12.00, date: '2026-07-01' },
  { id: 5, projectId: 'PR0695', projectName: 'Comprehensive Development of NW-2', activityName: 'O&M of terminal at Pandu', cost: 8.50, date: '2026-07-02' },
  { id: 6, projectId: 'PR0695', projectName: 'Comprehensive Development of NW-2', activityName: 'Development of Jogighopa terminal', cost: 21.41, date: '2026-07-03' },
  { id: 7, projectId: 'PR0700', projectName: 'JMVP 1', activityName: 'Multimodal Terminal Sahibganj', cost: 250.00, date: '2026-07-01' },
  { id: 8, projectId: 'PR0700', projectName: 'JMVP 1', activityName: 'Multimodal Terminal Haldia', cost: 300.00, date: '2026-07-02' },
  { id: 9, projectId: 'PR0700', projectName: 'JMVP 1', activityName: 'Navigation Lock Farakka', cost: 226.96, date: '2026-07-03' },
  { id: 10, projectId: 'PR0694', projectName: 'Comprehensive Development of NW-16', activityName: 'Barak channel survey', cost: 0.80, date: '2026-07-04' },
  { id: 11, projectId: 'PR0694', projectName: 'Comprehensive Development of NW-16', activityName: 'Aids to navigation installation', cost: 1.20, date: '2026-07-05' },
  { id: 12, projectId: 'PR0695', projectName: 'Comprehensive Development of NW-2', activityName: 'Dredging in Brahmaputra', cost: 15.00, date: '2026-07-04' },
  { id: 13, projectId: 'PR0695', projectName: 'Comprehensive Development of NW-2', activityName: 'Terminal maintenance at Silghat', cost: 5.20, date: '2026-07-05' },
  { id: 14, projectId: 'PR0700', projectName: 'JMVP 1', activityName: 'River Information System Phase 2', cost: 45.00, date: '2026-07-04' },
  { id: 15, projectId: 'PR0700', projectName: 'JMVP 1', activityName: 'Consultancy services for JMVP', cost: 22.50, date: '2026-07-05' },
  { id: 16, projectId: 'PR0700', projectName: 'JMVP 1', activityName: 'Social impact mitigation plans', cost: 18.00, date: '2026-07-06' },
  { id: 17, projectId: 'PR0700', projectName: 'JMVP 1', activityName: 'Environmental monitoring system', cost: 12.40, date: '2026-07-07' },
  { id: 18, projectId: 'PR0700', projectName: 'JMVP 1', activityName: 'JMVP PMU office expenditure', cost: 9.06, date: '2026-07-08' }
];

export default function LumpsumIWAI({ activeTab, setActiveTab }) {
  const gridRef = useRef();
  const reportGridRef = useRef();
  const [currentSubTab, setCurrentSubTab] = useState('Input Form');

  const [projectsList, setProjectsList] = useState(INITIAL_PROJECTS);
  const [activitiesList, setActivitiesList] = useState(INITIAL_ACTIVITIES);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Add / Edit Lumpsum states
  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Form states
  const [selectedParentProjectId, setSelectedParentProjectId] = useState(INITIAL_PROJECTS[0].projectId);
  const [activitiesRows, setActivitiesRows] = useState([
    { sn: 1, activityName: '', cost: '', date: '' }
  ]);
  const [editCost, setEditCost] = useState('');

  const [errors, setErrors] = useState({});

  // Sub-tabs configuration
  const SUB_TABS = [
    { id: 'Input Form', label: 'Input Form', icon: ClipboardList },
    { id: 'Report', label: 'Report', icon: FilePieChart }
  ];

  // Helper to calculate total cost for a project ID dynamically
  const getProjectTotalCost = (projId) => {
    return activitiesList
      .filter(act => act.projectId === projId)
      .reduce((sum, act) => sum + parseFloat(act.cost || 0), 0);
  };

  // Synchronize projects total cost with sum of activities
  const processedProjects = useMemo(() => {
    return projectsList.map(proj => ({
      ...proj,
      cost: getProjectTotalCost(proj.projectId)
    }));
  }, [projectsList, activitiesList]);

  const filteredProjects = useMemo(() => {
    return processedProjects.filter(p => {
      const q = searchQuery.toLowerCase();
      return !searchQuery.trim() || 
        p.projectId.toLowerCase().includes(q) || 
        p.projectName.toLowerCase().includes(q);
    });
  }, [processedProjects, searchQuery]);

  const totalEntries = filteredProjects.length;

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

  // Activities helper functions
  const addActivityRow = () => {
    setActivitiesRows(prev => [
      ...prev,
      { sn: prev.length + 1, activityName: '', cost: '', date: '' }
    ]);
  };

  const removeActivityRow = (index) => {
    setActivitiesRows(prev => {
      let list = prev.filter((_, idx) => idx !== index);
      return list.map((item, idx) => ({ ...item, sn: idx + 1 }));
    });
  };

  const handleActivityRowChange = (index, field, value) => {
    setActivitiesRows(prev => {
      const list = [...prev];
      list[index] = { ...list[index], [field]: value };
      return list;
    });
  };

  const handleSaveLumpsum = (e) => {
    e.preventDefault();
    const parent = processedProjects.find(p => p.projectId === selectedParentProjectId);
    if (!parent) return;

    const rowErrors = [];
    activitiesRows.forEach((row, i) => {
      if (!row.activityName.trim()) rowErrors.push(`Row ${i + 1}: Activity Name is required`);
      if (!row.cost || parseFloat(row.cost) <= 0) rowErrors.push(`Row ${i + 1}: Activity Cost must be greater than 0`);
      if (!row.date) rowErrors.push(`Row ${i + 1}: Date is required`);
    });

    if (rowErrors.length > 0) {
      alert(rowErrors.join('\n'));
      return;
    }

    // Append new activities
    const newActivities = activitiesRows.map((row, index) => ({
      id: Date.now() + index,
      projectId: parent.projectId,
      projectName: parent.projectName,
      activityName: row.activityName,
      cost: parseFloat(row.cost),
      date: row.date
    }));

    setActivitiesList(prev => [...prev, ...newActivities]);
    setIsAdding(false);
    setActivitiesRows([{ sn: 1, activityName: '', cost: '', date: '' }]);
  };

  const handleOpenEdit = (project) => {
    setEditingProject(project);
    setEditCost(project.cost.toString());
    setErrors({});
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editCost || parseFloat(editCost) <= 0) {
      setErrors({ editCost: 'Valid lumpsum cost is required' });
      return;
    }

    // Since total cost is calculated, we can modify the first activity's cost or scale accordingly, 
    // or simply update the display cost for mock purposes.
    // For direct consistency, let's adjust or add a delta activity to set the sum exactly to editCost
    const currentSum = getProjectTotalCost(editingProject.projectId);
    const diff = parseFloat(editCost) - currentSum;
    
    if (diff !== 0) {
      const adjustmentActivity = {
        id: Date.now(),
        projectId: editingProject.projectId,
        projectName: editingProject.projectName,
        activityName: 'Budget Adjustment / Update',
        cost: diff,
        date: new Date().toISOString().split('T')[0]
      };
      setActivitiesList(prev => [...prev, adjustmentActivity]);
    }

    setEditingProject(null);
  };

  // Main table column definitions (configured with generous/explicit widths to prevent minimization/shrinking)
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
      headerName: 'Project ID',
      field: 'projectId',
      width: 150,
      minWidth: 150,
      pinned: 'left',
      cellClass: 'font-bold text-orange-600 flex items-center'
    },
    {
      headerName: 'Project Name',
      field: 'projectName',
      width: 350,
      minWidth: 350,
      cellClass: 'font-bold text-slate-800 flex items-center'
    },
    {
      headerName: 'Total Lumpsum Cost (In Cr.)',
      field: 'cost',
      width: 280,
      minWidth: 280,
      cellClass: 'text-right font-extrabold text-[#0f417a] flex items-center justify-end',
      valueFormatter: (params) => params.value !== undefined ? parseFloat(params.value).toFixed(2) : '0.00'
    },
    {
      headerName: 'Update',
      width: 100,
      minWidth: 100,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => {
        const project = params.data;
        return (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => handleOpenEdit(project)}
              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
              title="Update Cost Details"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }
  ], []);

  // Lumpsum Report column definitions
  const reportColDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 70,
      minWidth: 70,
      pinned: 'left',
      cellClass: 'text-center font-semibold text-slate-500 flex items-center justify-center'
    },
    {
      headerName: 'Project ID',
      field: 'projectId',
      width: 140,
      minWidth: 140,
      pinned: 'left',
      cellClass: 'font-bold text-slate-700 flex items-center'
    },
    {
      headerName: 'Project Name',
      field: 'projectName',
      width: 320,
      minWidth: 320,
      cellClass: 'font-bold text-slate-850 flex items-center'
    },
    {
      headerName: 'Activity Name',
      field: 'activityName',
      width: 250,
      minWidth: 250,
      cellClass: 'text-slate-600 font-semibold flex items-center'
    },
    {
      headerName: 'Activity Cost (In Cr.)',
      field: 'cost',
      width: 240,
      minWidth: 240,
      cellClass: 'text-right font-extrabold text-[#0f417a] flex items-center justify-end',
      valueFormatter: (params) => params.value !== undefined ? parseFloat(params.value).toFixed(2) : '0.00'
    },
    {
      headerName: 'Date of Expenditure',
      field: 'date',
      width: 180,
      minWidth: 180,
      cellClass: 'text-slate-600 font-semibold text-center flex items-center justify-center'
    }
  ], []);

  return (
    <div className="p-6 space-y-6 animate-fade-in text-slate-855">
      
      {/* Primary Module Navigation header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-slate-800 font-display">Lumpsum - IWAI</h2>
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

      {/* Secondary internal navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setCurrentSubTab('Input Form')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            currentSubTab === 'Input Form'
              ? 'bg-[#0f417a] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Input Form
        </button>
        <button
          onClick={() => setCurrentSubTab('Report')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            currentSubTab === 'Report'
              ? 'bg-[#0f417a] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Report
        </button>
      </div>

      {currentSubTab === 'Input Form' && (
        <div className="space-y-6">
          
          {isAdding ? (
            /* Add LumpSum form card layout inline */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
              <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-display">
                    Add LumpSum
                  </h3>
                  <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Inland Waterways Authority of India</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to List</span>
                </button>
              </div>

              <form onSubmit={handleSaveLumpsum} className="p-6 space-y-6">
                
                <div className="space-y-2 max-w-md">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Project List</label>
                  <select
                    value={selectedParentProjectId}
                    onChange={(e) => setSelectedParentProjectId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  >
                    {processedProjects.map(proj => (
                      <option key={proj.id} value={proj.projectId}>
                        {proj.projectId} - {proj.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Activities Grid</h4>
                    <button
                      type="button"
                      onClick={addActivityRow}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Row</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="px-4 py-2.5 w-16">SI No</th>
                          <th className="px-4 py-2.5">Project Name *</th>
                          <th className="px-4 py-2.5">Activity Name *</th>
                          <th className="px-4 py-2.5">Activity Cost (In Cr.) *</th>
                          <th className="px-4 py-2.5">Date of Expenditure *</th>
                          <th className="px-4 py-2.5 w-20 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activitiesRows.map((row, idx) => {
                          const matchedProj = processedProjects.find(p => p.projectId === selectedParentProjectId);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-semibold text-slate-550">{row.sn}</td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={matchedProj ? matchedProj.projectName : ''}
                                  disabled
                                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs bg-slate-50 font-medium text-slate-400"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  placeholder="Enter activity description"
                                  value={row.activityName}
                                  onChange={(e) => handleActivityRowChange(idx, 'activityName', e.target.value)}
                                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-transparent text-slate-800"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={row.cost}
                                  onChange={(e) => handleActivityRowChange(idx, 'cost', e.target.value)}
                                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-transparent text-slate-800"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="date"
                                  value={row.date}
                                  onChange={(e) => handleActivityRowChange(idx, 'date', e.target.value)}
                                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-transparent text-slate-800"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeActivityRow(idx)}
                                  disabled={activitiesRows.length === 1}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded transition disabled:opacity-40"
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
                  >
                    Save LumpSum
                  </button>
                </div>

              </form>
            </div>
          ) : editingProject ? (
            /* Inline Update Project Form card layout */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
              <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-display">
                    Update Lumpsum Cost Details
                  </h3>
                  <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">{editingProject.projectId} - {editingProject.projectName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to List</span>
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
                <div className="max-w-md space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Total Lumpsum Cost (In Cr.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.editCost ? 'border-red-400' : 'border-slate-250'} rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800`}
                  />
                  {errors.editCost && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.editCost}</p>}
                </div>

                <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Lumpsum list container card */
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 font-display">LumpSum List</h3>
                  <p className="text-xs text-slate-500 font-medium font-sans">Register and track cost estimates of lumpsum initiatives.</p>
                </div>
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add LumpSum</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
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

                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Search project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-205 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-700"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <AgGridReact
                  ref={gridRef}
                  theme="legacy"
                  rowData={filteredProjects}
                  columnDefs={colDefs}
                  defaultColDef={{ resizable: true, suppressSizeToFit: true, minWidth: 100 }}
                  domLayout="autoHeight"
                  rowHeight={52}
                  headerHeight={45}
                  autoSizeStrategy={{
                    type: 'fitGridWidth',
                    defaultMinWidth: 90
                  }}
                  pagination={true}
                  paginationPageSize={entriesLimit}
                  suppressPaginationPanel={true}
                  onPaginationChanged={onPaginationChanged}
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
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-660 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
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
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-660 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {currentSubTab === 'Report' && (
        /* Report Page View showing 18 Activity rows */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          
          <div className="text-center space-y-1 py-2 border-b border-slate-100">
            <h3 className="text-base md:text-lg font-black text-slate-800 font-display uppercase tracking-wide">
              Lumpsum Report
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              As On date: <strong className="text-slate-700">5-7-2026</strong> | (Report for the Month - July 2026)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="text-xs font-bold text-[#0f417a] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 w-fit">
              Total Rows: <span className="font-black font-mono text-sm ml-1">{activitiesList.length}</span>
            </div>
            
            <div className="flex gap-2">
              <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>
              <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100/50 transition cursor-pointer">
                <FileText className="h-3.5 w-3.5 text-rose-600" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <AgGridReact
              ref={reportGridRef}
              theme="legacy"
              rowData={activitiesList}
              columnDefs={reportColDefs}
              defaultColDef={{ resizable: true, suppressSizeToFit: true, minWidth: 100 }}
              domLayout="autoHeight"
              rowHeight={48}
              headerHeight={45}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 20, 50]}
            />
          </div>

        </div>
      )}

    </div>
  );
}
