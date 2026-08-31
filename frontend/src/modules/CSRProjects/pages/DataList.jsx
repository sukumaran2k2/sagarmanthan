import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, X, Plus, Edit, Eye, ChevronDown, 
  Building2, Calendar, FileText, Image as ImageIcon,
  Download, Filter, Layers, CheckCircle2, Clock, RotateCcw
} from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { 
  fetchCsrProjectsList, 
  fetchOrganisations, 
  fetchCsrExpenditureCost,
  fetchCsrGalleryFiles,
  downloadCsrDocument,
  getUserIdFromToken
} from '../api';
import { CSR_FOCUS_AREAS, CSR_STATUSES, FINANCIAL_YEARS } from '../utils/constants';
import { getDataScopeCode, getSessionClaims, getSessionOrganisationId, getSessionOrganisationName } from '../../../utils/authSession';

export default function DataList({
  isOrgUser: isOrgUserProp,
  onAddNew,
  onEdit,
  triggerNotification
}) {
  const isOrgUser = useMemo(() => {
    if (typeof isOrgUserProp === 'boolean') return isOrgUserProp;
    const scope = String(getDataScopeCode() || '').toUpperCase();
    if (scope === 'ORGANISATION') return true;
    if (scope === 'MINISTRY' || scope === 'MASTER') return false;
    const claims = getSessionClaims();
    const roleId = Number(claims?.roleId || claims?.role_id || claims?.role || 1);
    return roleId === 6 || roleId === 7;
  }, [isOrgUserProp]);

  const userOrgId = getSessionOrganisationId();
  const userOrgName = getSessionOrganisationName();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'completed'
  const [projects, setProjects] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dedicated Collapsible Filter Panel Toggle State (matching GMIS DataList)
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Column visibility checklist dropdown
  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    sno: true,
    org: true,
    financial_year: true,
    project_name: true,
    project_value: true,
    project_status: true,
    completed_on: true,
    remarks: true,
    actions: true,
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setColDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter states
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedFY, setSelectedFY] = useState('');
  const [selectedFocus, setSelectedFocus] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination & Grid
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [gridApi, setGridApi] = useState(null);

  // Modals
  const [selectedProjectForView, setSelectedProjectForView] = useState(null);
  const [projectExpenditures, setProjectExpenditures] = useState([]);
  const [loadingExpenditures, setLoadingExpenditures] = useState(false);

  const [selectedProjectForGallery, setSelectedProjectForGallery] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  // Load projects and master organisations
  const loadData = async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      const [projRes, orgRes] = await Promise.all([
        fetchCsrProjectsList(userId),
        fetchOrganisations()
      ]);
      setProjects(Array.isArray(projRes) ? projRes : (projRes?.rowData || []));
      setOrganisations(Array.isArray(orgRes) ? orgRes : []);
    } catch (err) {
      console.error("Error loading CSR projects:", err);
      triggerNotification?.("Failed to fetch CSR projects.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Strict organisation data scoping
  const scopedProjects = useMemo(() => {
    if (!isOrgUser) return projects;
    return projects.filter(p => {
      if (userOrgId && String(p.organisation_id) === String(userOrgId)) return true;
      if (userOrgName && String(p.organisation_name).toLowerCase() === String(userOrgName).toLowerCase()) return true;
      return !userOrgId && !userOrgName;
    });
  }, [projects, isOrgUser, userOrgId, userOrgName]);

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!isOrgUser && selectedOrg) count++;
    if (selectedFY) count++;
    if (selectedFocus) count++;
    if (selectedStatus) count++;
    return count;
  }, [isOrgUser, selectedOrg, selectedFY, selectedFocus, selectedStatus]);

  // Counts for Sub-Tabs
  const allCount = scopedProjects.length;
  const completedCount = scopedProjects.filter(p => p.project_status === 'Completed').length;
  const activeCount = allCount - completedCount;

  // Filter statuses available based on active sub-tab
  const availableStatuses = useMemo(() => {
    if (activeTab === 'active' || activeTab === 'pending') {
      return CSR_STATUSES.filter(st => st !== 'Completed');
    }
    if (activeTab === 'completed') {
      return CSR_STATUSES.filter(st => st === 'Completed');
    }
    return CSR_STATUSES;
  }, [activeTab]);

  // Tab switch handler that keeps status filter aligned
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    if ((tab === 'active' || tab === 'pending') && selectedStatus === 'Completed') {
      setSelectedStatus('');
    } else if (tab === 'completed' && selectedStatus && selectedStatus !== 'Completed') {
      setSelectedStatus('');
    }
  };

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return scopedProjects.filter(p => {
      if (activeTab === 'completed' && p.project_status !== 'Completed') return false;
      if ((activeTab === 'active' || activeTab === 'pending') && p.project_status === 'Completed') return false;

      if (!isOrgUser && selectedOrg && String(p.organisation_id) !== String(selectedOrg)) return false;
      if (selectedFY && String(p.financial_year) !== String(selectedFY)) return false;
      if (selectedFocus && String(p.csr_focus) !== String(selectedFocus)) return false;
      if (selectedStatus && String(p.project_status) !== String(selectedStatus)) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const name = (p.project_name || '').toLowerCase();
        const org = (p.organisation_name || '').toLowerCase();
        const received = (p.project_received_from || '').toLowerCase();
        const beneficiaries = (p.target_beneficiaries || '').toLowerCase();
        if (!name.includes(query) && !org.includes(query) && !received.includes(query) && !beneficiaries.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [scopedProjects, activeTab, isOrgUser, selectedOrg, selectedFY, selectedFocus, selectedStatus, searchTerm]);

  // Paginated data for Grid
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProjects.slice(startIndex, startIndex + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;

  // Reset all filters handler
  const handleResetFilters = () => {
    setSelectedOrg('');
    setSelectedFY('');
    setSelectedFocus('');
    setSelectedStatus('');
    setSearchTerm('');
    setCurrentPage(1);
    triggerNotification?.('Filters have been reset', 'info');
  };

  // Open Project Details View Modal
  const handleOpenDetailModal = async (project) => {
    setSelectedProjectForView(project);
    setLoadingExpenditures(true);
    try {
      const expRes = await fetchCsrExpenditureCost(project.csr_project_id);
      setProjectExpenditures(Array.isArray(expRes) ? expRes : []);
    } catch (err) {
      console.error("Error loading project expenditures", err);
      setProjectExpenditures([]);
    } finally {
      setLoadingExpenditures(false);
    }
  };

  // Open Gallery Preview Modal
  const handleOpenGalleryModal = async (project) => {
    setSelectedProjectForGallery(project);
    setLoadingGallery(true);
    try {
      const galRes = await fetchCsrGalleryFiles(project.csr_project_id);
      setGalleryImages(Array.isArray(galRes) ? galRes : []);
    } catch (err) {
      console.error("Error loading gallery photos", err);
      setGalleryImages([]);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleDownloadDoc = async (fileName) => {
    if (!fileName) return;
    try {
      const blob = await downloadCsrDocument(fileName);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Document download failed", err);
      triggerNotification?.("Failed to download project document.", "error");
    }
  };

  // Column definitions for AG Grid Table with Blue Header matching user image
  const columnDefs = useMemo(() => [
    {
      headerName: "S.No",
      field: "sno",
      width: 70,
      minWidth: 60,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
      hide: !visibleCols.sno,
      valueGetter: (params) => (currentPage - 1) * pageSize + params.node.rowIndex + 1,
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center text-center font-bold">
          {params.value}
        </div>
      )
    },
    ...(!isOrgUser ? [{
      headerName: "Organization Name",
      field: "organisation_name",
      minWidth: 200,
      flex: 2,
      cellStyle: { fontWeight: 700, color: '#0f417a' },
      hide: !visibleCols.org,
      valueGetter: (params) => params.data?.organisation_name || `Org ID: ${params.data?.organisation_id}`
    }] : []),
    {
      headerName: "Financial Year",
      field: "financial_year",
      width: 140,
      minWidth: 120,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 600, justifyContent: 'center' },
      hide: !visibleCols.financial_year,
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center text-center font-semibold">
          {params.value || '-'}
        </div>
      )
    },
    {
      headerName: "Name of the Project",
      field: "project_name",
      minWidth: 300,
      flex: 3,
      wrapText: true,
      autoHeight: true,
      cellClass: 'mopsw-wrap-cell text-left font-semibold text-slate-800 dark:text-slate-100 flex items-center py-2.5',
      cellStyle: {
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        lineHeight: '1.4',
        textAlign: 'left'
      },
      hide: !visibleCols.project_name,
      valueGetter: (params) => params.data?.project_name || '-'
    },
    {
      headerName: "Project Value(Rs. In Lakhs)",
      field: "project_value",
      width: 175,
      minWidth: 150,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', fontWeight: 800, color: '#0f417a', justifyContent: 'center' },
      hide: !visibleCols.project_value,
      valueFormatter: (params) => params.value != null && params.value !== '' ? Number(params.value).toLocaleString() : '-',
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center text-center font-extrabold text-[#0f417a] dark:text-blue-400">
          {params.value != null && params.value !== '' ? Number(params.value).toLocaleString() : '-'}
        </div>
      )
    },
    {
      headerName: "Project Status",
      field: "project_status",
      width: 200,
      minWidth: 170,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', justifyContent: 'center' },
      hide: !visibleCols.project_status,
      cellRenderer: (params) => {
        const status = params.value || 'Project yet to start';
        return (
          <div className="w-full flex items-center justify-center text-center">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {status}
            </span>
          </div>
        );
      }
    },
    {
      headerName: "Completed On",
      field: "completed_on",
      width: 140,
      minWidth: 120,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: { textAlign: 'center', justifyContent: 'center' },
      hide: !visibleCols.completed_on,
      cellRenderer: (params) => {
        const val = params.value;
        const formatted = val ? String(val).split('T')[0] : '-';
        return (
          <div className="w-full flex items-center justify-center text-center text-slate-600 dark:text-slate-400">
            {formatted}
          </div>
        );
      }
    },
    {
      headerName: "Remarks",
      field: "remarks",
      minWidth: 240,
      flex: 2,
      wrapText: true,
      autoHeight: true,
      cellClass: 'mopsw-wrap-cell',
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35', color: '#475569' },
      hide: !visibleCols.remarks,
      cellRenderer: (params) => params.value || '-'
    },
    {
      headerName: "Update",
      field: "actions",
      width: 120,
      minWidth: 100,
      pinned: 'right',
      headerClass: 'text-center',
      cellClass: 'text-center',
      hide: !visibleCols.actions,
      cellRenderer: (params) => {
        const p = params.data;
        if (!p) return null;
        return (
          <div className="flex items-center justify-center space-x-1.5 h-full">
            <button
              type="button"
              onClick={() => handleOpenDetailModal(p)}
              title="View Project Details"
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenGalleryModal(p)}
              title="View Media Gallery"
              className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
            {isOrgUser && (
              <button
                type="button"
                onClick={() => onEdit(p)}
                title="Edit Project"
                className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-2xs transition cursor-pointer flex items-center justify-center"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      }
    }
  ], [currentPage, pageSize, onEdit, isOrgUser, visibleCols]);

  // Export Columns matching user's table format
  const exportColumns = useMemo(() => [
    { key: 'sno', label: 'S.No', render: (_, __, i) => i + 1 },
    ...(!isOrgUser ? [{ key: 'organisation_name', label: 'Organization Name' }] : []),
    { key: 'financial_year', label: 'Financial Year' },
    { key: 'project_name', label: 'Name of the Project' },
    { key: 'project_value', label: 'Project Value(Rs. In Lakhs)', render: (v) => v != null && v !== '' ? Number(v).toLocaleString() : '-' },
    { key: 'project_status', label: 'Project Status' },
    { key: 'completed_on', label: 'Completed On', render: (v) => v ? String(v).split('T')[0] : '-' },
    { key: 'remarks', label: 'Remarks' },
  ], [isOrgUser]);

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Sub-Tabs Row matching CA / GMIS style */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 select-none">
        <button
          onClick={() => handleTabChange('all')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          ALL ({allCount})
        </button>
        <button
          onClick={() => handleTabChange('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'active' || activeTab === 'pending'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          ACTIVE ({activeCount})
        </button>
        <button
          onClick={() => handleTabChange('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          COMPLETED ({completedCount})
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Search, Filters and Actions Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* Left Action Tools: Filter Toggle Button */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-xs cursor-pointer ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-[#0f417a] text-[#0f417a] dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="hidden lg:block flex-1" />

          {/* Right Action Tools: Search, Rows, Total, Copy, Export, Add New */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Project, Org..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Row Count Selector */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Total Records Counter */}
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredProjects.length}</span>
            </div>

            {/* Column Visibility Dropdown */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen(!colDropdownOpen)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
                    <button
                      type="button"
                      onClick={() => setVisibleCols({
                        sno: true,
                        org: true,
                        financial_year: true,
                        project_name: true,
                        project_value: true,
                        project_status: true,
                        completed_on: true,
                        remarks: true,
                        actions: true,
                      })}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                  {[
                    { key: 'sno', label: 'S.No' },
                    ...(!isOrgUser ? [{ key: 'org', label: 'Organization Name' }] : []),
                    { key: 'financial_year', label: 'Financial Year' },
                    { key: 'project_name', label: 'Name of the Project' },
                    { key: 'project_value', label: 'Project Value (in Lakhs)' },
                    { key: 'project_status', label: 'Project Status' },
                    { key: 'completed_on', label: 'Completed On' },
                    { key: 'remarks', label: 'Remarks' },
                    { key: 'actions', label: 'Update / Actions' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[key]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <CopyButton
              data={filteredProjects}
              columns={exportColumns}
              color="#0f417a"
              triggerNotification={triggerNotification}
            />

            {/* Export Dropdown */}
            <ExportDropdown
              data={filteredProjects}
              columns={exportColumns}
              fileName="CSR_Projects_List"
              title="CSR Projects List"
              color="#0f417a"
              hoverColor="#1e5ea8"
              triggerNotification={triggerNotification}
            />

            {/* Add New Button */}
            {isOrgUser && (
              <button
                onClick={onAddNew}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#0f417a] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer select-none"
              >
                <Plus className="h-4 w-4" />
                <span>Add CSR Project</span>
              </button>
            )}
          </div>

        </div>

        {/* Collapsible Filter Panel (matching GMIS DataList) */}
        {showFilterPanel && (
          <div className="bg-slate-50/90 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter CSR Project Records
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* 1. Organisation Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Organization
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => { setSelectedOrg(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Organisations ({organisations.length})</option>
                  {organisations.map((org) => (
                    <option key={org.organisation_id} value={org.organisation_id}>
                      {org.organisation_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Financial Year Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Financial Year
                </label>
                <select
                  value={selectedFY}
                  onChange={(e) => { setSelectedFY(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Financial Years</option>
                  {FINANCIAL_YEARS.map((fy) => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
              </div>

              {/* 3. CSR Focus Area Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  CSR Focus Area
                </label>
                <select
                  value={selectedFocus}
                  onChange={(e) => { setSelectedFocus(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer truncate"
                >
                  <option value="">All Focus Areas</option>
                  {CSR_FOCUS_AREAS.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* 4. Project Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Project Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">
                    {activeTab === 'active' ? 'All Active Statuses' : activeTab === 'completed' ? 'Completed' : 'All Statuses'}
                  </option>
                  {availableStatuses.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        )}

        {/* Blue Themed AG Grid Table matching CA / GMIS module */}
        <div className="w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-xs dark:border-slate-800">
          <Table
            rowData={paginatedProjects}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            color="#0f417a"
            onGridReady={(params) => setGridApi(params.api)}
            defaultColDef={{
              minWidth: 90,
              filter: false,
              sortable: true,
              resizable: true
            }}
          />

          {/* Server-Side Pagination Bar */}
          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={filteredProjects.length}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            onNextPage={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            color="#0f417a"
          />
        </div>

      </div>

      {/* Project Details Modal */}
      {selectedProjectForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border-l-4 border-l-[#0f417a]">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white z-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  CSR Project Overview
                </h3>
                <p className="text-[10px] text-blue-200 font-semibold mt-0.5">
                  {selectedProjectForView.organisation_name} • {selectedProjectForView.financial_year}
                </p>
              </div>
              <button
                onClick={() => setSelectedProjectForView(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Project Info Card */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  {selectedProjectForView.project_name}
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Value</span>
                    <span className="font-black text-slate-800 dark:text-slate-100">
                      ₹{selectedProjectForView.project_value != null ? Number(selectedProjectForView.project_value).toFixed(2) : '-'} Cr
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                    <span className="font-bold text-[#0f417a] dark:text-blue-400">
                      {selectedProjectForView.project_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Physical %</span>
                    <span className="font-black text-emerald-600">
                      {selectedProjectForView.physical_progress != null ? `${selectedProjectForView.physical_progress}%` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Financial %</span>
                    <span className="font-black text-blue-600">
                      {selectedProjectForView.financial_progress != null ? `${selectedProjectForView.financial_progress}%` : '-'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Received From</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {selectedProjectForView.project_received_from || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Beneficiaries</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {selectedProjectForView.target_beneficiaries || '-'}
                    </span>
                  </div>
                </div>

                {selectedProjectForView.impact_possible_outcome && (
                  <div className="pt-2 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Impact / Outcome</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {selectedProjectForView.impact_possible_outcome}
                    </p>
                  </div>
                )}
              </div>

              {/* Multi-Year Expenditures */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Yearly Expenditure Breakdown
                </h5>
                {loadingExpenditures ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading expenditures...</div>
                ) : projectExpenditures.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs text-slate-400 text-center">
                    No yearly expenditure records logged.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Financial Year</th>
                          <th className="py-2 px-3 text-right">Expenditure Cost (₹ Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {projectExpenditures.map((exp, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold">{exp.year}</td>
                            <td className="py-2 px-3 text-right font-black text-slate-800 dark:text-slate-100">
                              ₹{Number(exp.csr_expenditure_cost).toFixed(2)} Cr
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Completion Document Download */}
              {selectedProjectForView.project_completion_doc && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#0f417a] dark:text-blue-300">
                    <FileText className="h-4 w-4" />
                    <span>Completion Document: {selectedProjectForView.project_completion_doc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(selectedProjectForView.project_completion_doc)}
                    className="flex items-center space-x-1 px-3 py-1 bg-[#0f417a] text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              )}

            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedProjectForView(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Media Gallery Preview Modal */}
      {selectedProjectForGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            
            <div className="sticky top-0 bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-4 flex items-center justify-between text-white z-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  Project Photo Gallery
                </h3>
                <p className="text-[10px] text-purple-200 font-semibold mt-0.5">
                  {selectedProjectForGallery.project_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedProjectForGallery(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              {loadingGallery ? (
                <div className="py-12 text-center text-slate-400 font-semibold">
                  Loading gallery photos...
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold">
                  No photos uploaded for this project.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {galleryImages.map((img, idx) => (
                    <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-2 bg-slate-50 dark:bg-slate-950 space-y-2">
                      <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                        {img.file_name || `Photo ${idx + 1}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedProjectForGallery(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
