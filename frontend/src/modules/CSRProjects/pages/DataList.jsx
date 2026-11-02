import { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Search, X, Edit, Eye, ChevronDown, FileText, Image as ImageIcon, Download, Filter } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { fetchCsrProjectsList, fetchCsrExpenditureCost, fetchCsrGalleryFiles, downloadCsrDocument } from '../api';
import { CSR_FOCUS_AREAS, CSR_STATUSES, FINANCIAL_YEARS } from '../utils/constants';
import { exportCsrList, formatDate } from '../utils/listExport';
import { formatCrore } from '../utils/amounts';
import { useCsrStore, DEFAULT_PROJECT_COLS } from '../store/useCsrStore';
import { CSR_TOASTS } from '../toastMessages';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

const isCompleted = (p) => p.project_status === 'Completed';
const statusText = (p) => p.project_status || 'Project yet to start';

// Saves a downloaded blob under its stored name
const saveBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function DataList({ notify, permissions, onEdit }) {
  const { isOrgUser, canEdit } = permissions;

  // Category, filters, search, paging, filter panel and columns are kept in the module store
  const {
    category, filters, searchTerm, currentPage, pageSize, showFilterPanel, visibleCols, organisations,
  } = useCsrStore(useShallow((state) => ({
    category: state.category,
    filters: state.filters,
    searchTerm: state.searchTerm,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    showFilterPanel: state.showFilterPanel,
    visibleCols: state.visibleCols,
    organisations: state.organisations,
  })));
  const actions = useCsrStore(useShallow((state) => ({
    setCategory: state.setCategory,
    setFilters: state.setFilters,
    resetFilters: state.resetFilters,
    setSearchTerm: state.setSearchTerm,
    setShowFilterPanel: state.setShowFilterPanel,
    setCurrentPage: state.setCurrentPage,
    setPageSize: state.setPageSize,
    setVisibleCols: state.setVisibleCols,
  })));

  // The server returns only the projects the user may see (their organisation's, or all for the Ministry)
  const [projects, setProjects] = useState(null); // null while loading
  useEffect(() => {
    let cancelled = false;
    fetchCsrProjectsList()
      .then((res) => {
        if (!cancelled) setProjects(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading CSR projects:', err);
        setProjects([]);
        notify(COMMON_TOASTS.loadFailed('CSR projects'));
      });
    return () => { cancelled = true; };
  }, [notify]);
  const loading = projects === null;
  const rows = useMemo(() => projects || [], [projects]);

  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) setColDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Project details and gallery windows: the project on show, and what was fetched for it
  const [detailProject, setDetailProject] = useState(null);
  const [detailResult, setDetailResult] = useState(null); // { project, expenditures }
  useEffect(() => {
    if (!detailProject) return undefined;
    let cancelled = false;
    fetchCsrExpenditureCost(detailProject.csr_project_id)
      .then((res) => {
        if (!cancelled) setDetailResult({ project: detailProject, expenditures: Array.isArray(res) ? res : [] });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading project expenditures', err);
        setDetailResult({ project: detailProject, expenditures: [] });
        notify(CSR_TOASTS.detailsLoadFailed());
      });
    return () => { cancelled = true; };
  }, [detailProject, notify]);
  const detailLoading = detailResult?.project !== detailProject;
  const expenditures = detailLoading ? [] : detailResult.expenditures;

  const [galleryProject, setGalleryProject] = useState(null);
  const [galleryResult, setGalleryResult] = useState(null); // { project, files }
  useEffect(() => {
    if (!galleryProject) return undefined;
    let cancelled = false;
    fetchCsrGalleryFiles(galleryProject.csr_project_id)
      .then((res) => {
        if (!cancelled) setGalleryResult({ project: galleryProject, files: Array.isArray(res) ? res : [] });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading gallery files', err);
        setGalleryResult({ project: galleryProject, files: [] });
        notify(CSR_TOASTS.detailsLoadFailed());
      });
    return () => { cancelled = true; };
  }, [galleryProject, notify]);
  const galleryLoading = galleryResult?.project !== galleryProject;
  const galleryFiles = galleryLoading ? [] : galleryResult.files;

  const handleDownload = async (fileName) => {
    if (!fileName) {
      notify(COMMON_TOASTS.noDocument());
      return;
    }
    try {
      saveBlob(await downloadCsrDocument(fileName), fileName);
      notify(COMMON_TOASTS.downloadStarted(fileName));
    } catch (err) {
      console.error('Document download failed', err);
      notify(CSR_TOASTS.downloadFailed(getErrorMessage(err)));
    }
  };

  const allCount = rows.length;
  const completedCount = useMemo(() => rows.filter(isCompleted).length, [rows]);
  const countFor = { all: allCount, active: allCount - completedCount, completed: completedCount };

  const availableStatuses = category === 'active'
    ? CSR_STATUSES.filter((s) => s !== 'Completed')
    : category === 'completed' ? ['Completed'] : CSR_STATUSES;

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((p) => {
      if (category === 'completed' && !isCompleted(p)) return false;
      if (category === 'active' && isCompleted(p)) return false;
      if (filters.organisation && String(p.organisation_id) !== String(filters.organisation)) return false;
      if (filters.financialYear && String(p.financial_year) !== filters.financialYear) return false;
      if (filters.focus && String(p.csr_focus) !== String(filters.focus)) return false;
      if (filters.status && statusText(p) !== filters.status) return false;
      if (query) {
        const haystack = [p.project_name, p.organisation_name, p.project_received_from, p.target_beneficiaries, p.remarks]
          .map((v) => String(v || '').toLowerCase());
        if (!haystack.some((v) => v.includes(query))) return false;
      }
      return true;
    });
  }, [rows, category, filters, searchTerm]);

  // Organisation users only ever see their own organisation, so that filter isn't offered to them
  const activeFiltersCount = [!isOrgUser && filters.organisation, filters.financialYear, filters.focus, filters.status].filter(Boolean).length;

  const clearFilters = () => {
    actions.resetFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  // Paged in the browser, so the page is kept in the store
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  // A stored page can be past the end once the data or filters change
  const page = Math.min(currentPage, totalPages);
  const pageRows = useMemo(() => filteredProjects.slice((page - 1) * pageSize, page * pageSize), [filteredProjects, page, pageSize]);

  // Columns by visibility key; the organisation column is for the Ministry view only
  const columnChoices = useMemo(() => [
    { key: 'sno', label: 'S.No' },
    ...(!isOrgUser ? [{ key: 'org', label: 'Organisation Name' }] : []),
    { key: 'financial_year', label: 'Financial Year' },
    { key: 'project_name', label: 'Name of the Project' },
    { key: 'project_value', label: 'Project Value (₹ Cr)' },
    { key: 'project_status', label: 'Project Status' },
    ...(category === 'completed' ? [{ key: 'completed_on', label: 'Completed On' }] : []),
    { key: 'remarks', label: 'Remarks' },
    { key: 'actions', label: 'Update' },
  ], [isOrgUser, category]);

  const columnDefs = useMemo(() => {
    const show = (key) => visibleCols[key] && columnChoices.some((c) => c.key === key);
    const centered = { headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center' };
    return [
      {
        headerName: 'S.No', width: 80, minWidth: 80, maxWidth: 80, pinned: 'left', hide: !show('sno'), ...centered,
        valueGetter: (p) => (page - 1) * pageSize + p.node.rowIndex + 1,
      },
      {
        headerName: 'Organisation Name', field: 'organisation_name', minWidth: 200, flex: 2.2, wrapText: true, autoHeight: true,
        hide: !show('org'), headerClass: 'text-center', cellClass: 'mopsw-wrap-cell text-center font-bold text-[#0f417a] dark:text-blue-400',
      },
      { headerName: 'Financial Year', field: 'financial_year', width: 140, minWidth: 140, hide: !show('financial_year'), ...centered },
      {
        headerName: 'Name of the Project', field: 'project_name', minWidth: 260, flex: 3, wrapText: true, autoHeight: true,
        hide: !show('project_name'), cellClass: 'mopsw-wrap-cell font-semibold',
      },
      {
        headerName: 'Project Value (₹ Cr)', field: 'project_value', minWidth: 140, flex: 1.4, hide: !show('project_value'),
        ...centered, cellClass: 'text-center flex items-center justify-center font-extrabold text-[#0f417a] dark:text-blue-400',
        valueFormatter: (p) => formatCrore(p.value),
      },
      {
        headerName: 'Project Status', field: 'project_status', minWidth: 160, flex: 1.6, hide: !show('project_status'), ...centered,
        valueGetter: (p) => p.data && statusText(p.data),
      },
      {
        headerName: 'Completed On', field: 'completed_on', minWidth: 120, flex: 1.1, hide: !show('completed_on'), ...centered,
        valueFormatter: (p) => formatDate(p.value),
      },
      {
        headerName: 'Remarks', field: 'remarks', minWidth: 200, flex: 2, wrapText: true, autoHeight: true, hide: !show('remarks'),
        headerClass: 'text-center', cellClass: 'mopsw-wrap-cell text-center text-slate-600 dark:text-slate-400',
        valueFormatter: (p) => p.value || '-',
      },
      {
        headerName: 'Update', width: 120, minWidth: 110, pinned: 'right', hide: !show('actions'), sortable: false, ...centered,
        cellRenderer: (p) => p.data && (
          <div className="flex items-center justify-center space-x-1.5 h-full w-full">
            <button type="button" onClick={() => setDetailProject(p.data)} title="View Project Details"
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer">
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setGalleryProject(p.data)} title="View Media Gallery"
              className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition cursor-pointer">
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
            {canEdit && (
              <button type="button" onClick={() => onEdit(p.data)} title="Edit Project"
                className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer">
                <Edit className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ];
  }, [columnChoices, visibleCols, page, pageSize, canEdit, onEdit]);

  // Copy / Excel / PDF: every filtered row, visible data columns
  const exportColumns = useMemo(() => {
    const values = {
      org: (p) => p.organisation_name,
      financial_year: (p) => p.financial_year,
      project_name: (p) => p.project_name,
      project_value: (p) => formatCrore(p.project_value),
      project_status: statusText,
      completed_on: (p) => formatDate(p.completed_on),
      remarks: (p) => p.remarks || '-',
    };
    return columnChoices
      .filter((c) => values[c.key] && visibleCols[c.key])
      .map((c) => ({ ...c, value: values[c.key] }));
  }, [columnChoices, visibleCols]);

  const handleExport = (type) => exportCsrList(type, {
    columns: exportColumns,
    rows: filteredProjects,
    fileName: 'CSR_Projects_List',
    title: 'CSR Projects List',
    notify,
  });

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="module-subtabs-strip">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => actions.setCategory(c.id)}
            className={`module-subtab-btn ${category === c.id ? 'active' : ''}`}
          >
            {c.label} ({countFor[c.id]})
          </button>
        ))}
      </div>

      <div className="module-card space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel((open) => !open)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
            >
              <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search project, organisation, remarks..."
                value={searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button type="button" onClick={() => actions.setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => actions.setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map((sz) => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{loading ? '...' : filteredProjects.length}</span>
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen((open) => !open)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Columns</span>
                    <button type="button" onClick={() => actions.setVisibleCols(DEFAULT_PROJECT_COLS)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                      Show All
                    </button>
                  </div>
                  {columnChoices.map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[key]}
                        onChange={() => actions.setVisibleCols((cols) => ({ ...cols, [key]: !cols[key] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => handleExport('copy')} color="#0f417a" />
            <ExportDropdown onExportExcel={() => handleExport('excel')} onExportPdf={() => handleExport('pdf')} color="#0f417a" hoverColor="#1e5ea8" />
          </div>
        </div>

        {/* Filter panel */}
        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {!isOrgUser && (
                <div>
                  <label className="module-form-label">Organisation</label>
                  <select value={filters.organisation} onChange={(e) => actions.setFilters({ organisation: e.target.value })} className="module-form-select">
                    <option value="">All Organisations</option>
                    {organisations.map((o) => <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="module-form-label">Financial Year</label>
                <select value={filters.financialYear} onChange={(e) => actions.setFilters({ financialYear: e.target.value })} className="module-form-select">
                  <option value="">All Financial Years</option>
                  {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>
              <div>
                <label className="module-form-label">CSR Focus Area</label>
                <select value={filters.focus} onChange={(e) => actions.setFilters({ focus: e.target.value })} className="module-form-select truncate">
                  <option value="">All Focus Areas</option>
                  {CSR_FOCUS_AREAS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="module-form-label">Project Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => actions.setFilters({ status: e.target.value })}
                  disabled={category === 'completed'}
                  className="module-form-select disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                >
                  <option value="">All Statuses</option>
                  {availableStatuses.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="module-datalist-grid">
          <Table
            rowData={pageRows}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            color="#0f417a"
            defaultColDef={{ minWidth: 90, filter: false, sortable: true, resizable: true }}
          />
        </div>

        {totalPages > 1 && (
          <TablePagination
            currentPage={page - 1}
            totalPages={totalPages}
            totalRows={filteredProjects.length}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => actions.setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => actions.setCurrentPage(Math.max(1, page - 1))}
            onNextPage={() => actions.setCurrentPage(Math.min(totalPages, page + 1))}
            color="#0f417a"
          />
        )}
      </div>

      {/* Project details window */}
      {detailProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border-l-4 border-l-[#0f417a]">
            <div className="sticky top-0 bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white z-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-display">CSR Project Overview</h3>
                <p className="text-[10px] text-blue-200 font-semibold mt-0.5">
                  {detailProject.organisation_name} • {detailProject.financial_year}
                </p>
              </div>
              <button type="button" onClick={() => setDetailProject(null)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{detailProject.project_name}</h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Value</span>
                    <span className="font-black text-slate-800 dark:text-slate-100">₹{formatCrore(detailProject.project_value)} Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                    <span className="font-bold text-[#0f417a] dark:text-blue-400">{statusText(detailProject)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Physical %</span>
                    <span className="font-black text-emerald-600">{detailProject.physical_progress != null ? `${detailProject.physical_progress}%` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Financial %</span>
                    <span className="font-black text-blue-600">{detailProject.financial_progress != null ? `${detailProject.financial_progress}%` : '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Received From</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{detailProject.project_received_from || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Beneficiaries</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{detailProject.target_beneficiaries || '-'}</span>
                  </div>
                </div>

                {detailProject.impact_possible_outcome && (
                  <div className="pt-2 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Impact / Outcome</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{detailProject.impact_possible_outcome}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Yearly Expenditure Breakdown</h5>
                {detailLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading expenditures...</div>
                ) : expenditures.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs text-slate-400 text-center">No yearly expenditure records logged.</div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Financial Year</th>
                          <th className="py-2 px-3 text-right">Expenditure (₹ Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {expenditures.map((exp) => (
                          <tr key={exp.csr_expenditure_id ?? exp.year}>
                            <td className="py-2 px-3 font-semibold">{exp.year}</td>
                            <td className="py-2 px-3 text-right font-black text-slate-800 dark:text-slate-100">{formatCrore(exp.csr_expenditure_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {detailProject.project_completion_doc && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#0f417a] dark:text-blue-300 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Completion Document: {detailProject.project_completion_doc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(detailProject.project_completion_doc)}
                    className="flex items-center space-x-1 px-3 py-1 bg-[#0f417a] text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition cursor-pointer flex-shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button type="button" onClick={() => setDetailProject(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery window */}
      {galleryProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-4 flex items-center justify-between text-white z-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-display">Project Photo Gallery</h3>
                <p className="text-[10px] text-purple-200 font-semibold mt-0.5">{galleryProject.project_name}</p>
              </div>
              <button type="button" onClick={() => setGalleryProject(null)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              {galleryLoading ? (
                <div className="py-12 text-center text-slate-400 font-semibold">Loading gallery files...</div>
              ) : galleryFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold">No photos uploaded for this project.</div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {galleryFiles.map((file, idx) => (
                    <li key={file.document_id ?? file.document_name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{file.document_name || `File ${idx + 1}`}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(file.document_name)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer flex-shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button type="button" onClick={() => setGalleryProject(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
