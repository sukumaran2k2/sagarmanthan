import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { fetchAbolishedPostsPage, fetchAbolishedPostFacets } from '../api';
import { SESSION_EXPIRED_MESSAGE } from '../hooks/useHRPermissions';
import { useDebouncedSearch, usePagedList } from '../hooks/usePagedList';
import { useHrListStore } from '../store/useHrListStore';
import { alignHrColumns } from '../utils/tableAlignment';
import { createTableExporter } from '../utils/exportTable';
import { PostCodeTag } from '../components/HrFormControls';
import ViewAbolishedPostDetails from './ViewAbolishedPostDetails';

const formatDate = (dateStr, addYears = 0) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--';
  if (addYears) d.setFullYear(d.getFullYear() + addYears);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

// Revival status button: label, colour and which details view it opens
const getStatusInfo = (row) => {
  const stageId = Number(row.revival_stage_id || 0);
  if (stageId === 9 || row.order_of_revival_issued_date) {
    return { label: 'Approved by Ministry', color: 'bg-emerald-600 hover:bg-emerald-700 text-white', targetView: 'both' };
  }
  if (stageId === 8 || row.revive_rejection_date_from_doe) {
    return { label: 'Rejected by Ministry', color: 'bg-rose-600 hover:bg-rose-700 text-white', targetView: 'both' };
  }
  if (stageId >= 5 || row.revival_submission_date) {
    return { label: 'Request Sent', color: 'bg-amber-600 hover:bg-amber-700 text-white', targetView: 'request' };
  }
  return { label: 'Request', color: 'bg-blue-600 hover:bg-blue-700 text-white', targetView: 'request' };
};

// Row from /hr/abolished-posts -> the display fields the grid and exports use.
const toDisplayRow = (row) => {
  const status = getStatusInfo(row);
  return {
    Organisation: row.organisation_name || '--',
    Department: row.department_name || '--',
    'Post Name': row.post_name || '--',
    'Post code': row.post_code || '--',
    Class: row.class_name || '--',
    // Abolition date = date of vacancy + 5 years
    'Post Abolition Date': formatDate(row.date_of_arise_in_vacancy, 5),
    Status: status.label,
    StatusColor: status.color,
    StatusTargetView: status.targetView,
    RevivalStageId: row.revival_stage_id,
    _raw: row,
  };
};

// Columns that hold data (exported when visible); the Revoke button column is not.
const NON_DATA_FIELDS = new Set(['sNo', 'Revive abolition']);

export default function ListAbolishedPosts({ permissions, notify }) {
  const { isMinistryView, orgId } = permissions;
  const canRequestRevival = permissions.canEdit && !permissions.isViewOnlyAdmin;
  // notify changes identity whenever App re-renders a toast; read it through a ref so a
  // failed load does not refetch (and toast) in a loop.
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  // Filters, search and paging live in the HR list store (they survive switching HR pages)
  const list = useHrListStore((state) => state.abolished);
  const actions = useHrListStore((state) => state.abolishedActions);
  const {
    organisationName: selectedOrg, departmentName: selectedDept, postName: selectedPostName,
    className: selectedClass, searchTerm, debouncedSearch, showFilterPanel, currentPage, pageSize,
  } = list;
  // Post opened from its post code or status button (details / revival request view)
  const [selectedPostForDetails, setSelectedPostForDetails] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRevokePost, setSelectedRevokePost] = useState(null);
  const [revokeRemarks, setRevokeRemarks] = useState('');
  const [revokeDate, setRevokeDate] = useState('');
  const [revokeFile, setRevokeFile] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRevokePost(null);
    setRevokeRemarks('');
    setRevokeDate('');
    setRevokeFile(null);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isModalOpen]);

  // Dropdown values (organisation scope is applied on the server).
  const canLoad = isMinistryView || Boolean(orgId);
  const [facets, setFacets] = useState({ organisations: [], departments: [], posts: [], classes: [] });
  useEffect(() => {
    if (!canLoad) return undefined;
    let alive = true;
    fetchAbolishedPostFacets()
      .then((res) => { if (alive) setFacets({ organisations: [], departments: [], posts: [], classes: [], ...res.data }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [canLoad]);

  // An organisation user without an organisation in the token cannot be scoped; nothing is loaded.
  useEffect(() => {
    if (!canLoad) notifyRef.current?.(SESSION_EXPIRED_MESSAGE, 'error');
  }, [canLoad]);

  const uniqueOrgs = facets.organisations;
  const uniqueDepts = facets.departments;
  const uniqueClasses = facets.classes;
  const uniquePostNames = useMemo(
    () => [...new Set(facets.posts.filter((p) => !selectedDept || p.department === selectedDept).map((p) => p.post))].sort(),
    [facets.posts, selectedDept]
  );

  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);

  // One params object is the request: page, limit and only the filters that are set.
  // Organisation users are scoped to their own organisation on the server.
  const params = useMemo(() => {
    const query = { page: currentPage, limit: pageSize };
    if (isMinistryView && selectedOrg) query.organisationName = selectedOrg;
    if (selectedDept) query.departmentName = selectedDept;
    if (selectedPostName) query.postName = selectedPostName;
    if (!isMinistryView && selectedClass) query.className = selectedClass;
    if (debouncedSearch) query.search = debouncedSearch;
    return query;
  }, [currentPage, pageSize, isMinistryView, selectedOrg, selectedDept, selectedPostName, selectedClass, debouncedSearch]);

  const onListError = useCallback(
    (err) => notifyRef.current?.(err?.response?.data?.message || 'Failed to load abolished posts.', 'error'),
    []
  );
  const { rows, total: totalCount, totalPages, loading, refreshing } = usePagedList({
    scope: 'abolished',
    params,
    request: fetchAbolishedPostsPage,
    onError: onListError,
    enabled: canLoad,
  });
  // Copy / export only what is on screen once the newest page has arrived
  const busy = loading || refreshing;

  // After a change empties the last page, step back to the new last page
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) actions.setCurrentPage(totalPages);
  }, [totalPages, currentPage, actions]);

  // S.No continues across pages
  const serialStart = (currentPage - 1) * pageSize;
  const pageRows = useMemo(
    () => rows.map((row, i) => ({ ...toDisplayRow(row), sNo: serialStart + i + 1 })),
    [rows, serialStart]
  );

  const activeFiltersCount = (selectedOrg ? 1 : 0) + (selectedDept ? 1 : 0) + (selectedPostName ? 1 : 0) + (selectedClass ? 1 : 0);

  const clearFilters = () => {
    actions.resetFilters();
    actions.setSearchTerm('');
  };

  const [visibleCols, setVisibleCols] = useState({});
  const handleToggleColumn = (field) => {
    setVisibleCols(prev => ({ ...prev, [field]: prev[field] === false ? true : false }));
  };

  const columnDefs = useMemo(() => {
    const cols = [
      {
        field: 'sNo',
        headerName: 'S.No',
        minWidth: 70, maxWidth: 90,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500 bg-slate-50',
        headerClass: 'text-center'
      }
    ];

    if (isMinistryView) {
      cols.push(
        { field: 'Organisation', headerName: 'Organisation', minWidth: 200, pinned: 'left', wrapText: true, autoHeight: true, cellClass: 'font-extrabold text-slate-900 text-center whitespace-normal break-words', headerClass: 'text-center' }
      );
    }

    const openDetails = (data, viewMode) => setSelectedPostForDetails({ data, viewMode: viewMode || data?.StatusTargetView || 'request' });

    cols.push(
      { field: 'Department', headerName: 'Department', minWidth: 160, wrapText: true, autoHeight: true, cellClass: 'whitespace-normal break-words', headerClass: 'text-center' },
      { field: 'Post Name', headerName: 'Post Name', minWidth: 200, wrapText: true, autoHeight: true, cellClass: 'font-semibold text-slate-800 dark:text-slate-200 whitespace-normal break-words', headerClass: 'text-center' },
      {
        field: 'Post code', headerName: 'Post code', minWidth: 150, cellClass: 'text-center', headerClass: 'text-center',
        cellRenderer: (p) => (p.value && p.value !== '--' ? (
          <button type="button" onClick={() => openDetails(p.data)} title="View post details" className="cursor-pointer hover:opacity-80">
            <PostCodeTag>{p.value}</PostCodeTag>
          </button>
        ) : null),
      },
      { field: 'Post Abolition Date', headerName: 'Post Abolition Date', minWidth: 170, cellClass: 'text-center font-medium', headerClass: 'text-center' },
      {
        field: 'Status',
        headerName: 'Status',
        minWidth: 200,
        cellClass: 'text-center', headerClass: 'text-center',
        cellRenderer: (params) => {
          const statusText = params.value || 'Request';
          const colorClass = params.data?.StatusColor || 'bg-blue-600 hover:bg-blue-700 text-white';
          return (
            <div className="flex items-center justify-center w-full h-full py-1">
              <button
                type="button"
                onClick={() => openDetails(params.data, params.data?.StatusTargetView)}
                className={`flex items-center space-x-1.5 ${colorClass} text-xs font-semibold px-3 py-1.5 rounded-md shadow-xs transition cursor-pointer`}
                title={`Open ${statusText}`}
              >
                <span>{statusText}</span>
              </button>
            </div>
          );
        }
      }
    );

    if (!isMinistryView) {
      cols.push({
        field: 'Revive abolition',
        headerName: 'Revive abolition',
        minWidth: 160,
        pinned: 'right',
        sortable: false,
        cellClass: 'text-center', headerClass: 'text-center',
        cellRenderer: (params) => {
          if (!canRequestRevival) return null;
          return (
            <div className="flex items-center justify-center w-full h-full py-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedRevokePost(params.data);
                  setIsModalOpen(true);
                }}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-md shadow-xs transition cursor-pointer"
              >
                <span>⟲</span>
                <span>Revoke</span>
              </button>
            </div>
          );
        }
      });
    }

    return cols.filter(col => {
      if (col.field === 'sNo') return true;
      if (col.field) return visibleCols[col.field] !== false;
      return true;
    });
  }, [visibleCols, isMinistryView, canRequestRevival]);

  // Copy / Export: every row matching the filters, visible data columns only.
  // Built on click: it reads the notifier ref, which must not happen during render.
  const runExport = (kind) => createTableExporter({
    loadRows: () => pageRows,
    isBusy: busy,
    serialStart,
    getColumns: () => columnDefs
      .filter((c) => c.field && !NON_DATA_FIELDS.has(c.field))
      .map((c) => ({ field: c.field, label: c.headerName })),
    notify: (msg, type) => notifyRef.current?.(msg, type),
    title: `Abolished Posts (Page ${currentPage})`,
    fileName: `Abolished_Posts_Page_${currentPage}`,
    label: 'Abolished posts',
  })[kind]();

  // Text columns left, numeric/code/date columns centred (see utils/tableAlignment)
  const alignedColumns = useMemo(() => ({ columnDefs: alignHrColumns(columnDefs) }), [columnDefs]);

  if (selectedPostForDetails) {
    const postData = selectedPostForDetails.data || selectedPostForDetails;
    const viewMode = selectedPostForDetails.viewMode || (postData?.StatusTargetView || 'request');
    return (
      <ViewAbolishedPostDetails
        postCode={postData['Post code']}
        initialData={postData}
        initialViewMode={viewMode}
        onBack={() => setSelectedPostForDetails(null)}
      />
    );
  }

  return (

    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 relative">
          
          {/* 1. Left: Collapsible Filter Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel(prev => !prev)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* 2. Right: Rows, Total Count, Search, Column Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            
            {/* Rows Limit */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Show</span>
              <select
                value={pageSize}
                onChange={(e) => actions.setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-[10px] uppercase font-bold text-slate-400">entries</span>
            </div>

            {/* Total Count */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {totalCount}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
              />
              {searchTerm && (
                <button onClick={() => actions.setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Column Visibility */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {columnDefs.filter(c => c.field && c.field !== 'sNo').map(col => (
                    <label key={col.field} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col.field] !== false}
                        onChange={() => handleToggleColumn(col.field)}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col.headerName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => runExport('copy')} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => runExport('excel')} onExportPdf={() => runExport('pdf')} color="#0f417a" hoverColor="#1d5594" chevron />
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <div className={`border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-all duration-300 ease-in-out ${showFilterPanel ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className={`p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
            {isMinistryView && (
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Organisation</label>
                <select
                  value={selectedOrg}
                  onChange={e => actions.setFilters({ organisationName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                >
                  <option value="">-- Show All --</option>
                  {uniqueOrgs.map(org => <option key={org} value={org}>{org}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Department</label>
              <select
                value={selectedDept}
                onChange={e => actions.setFilters({ departmentName: e.target.value, postName: '' })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              >
                <option value="">-- Show All --</option>
                {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">{isMinistryView ? 'Post Name' : 'Post name'}</label>
              <select
                value={selectedPostName}
                onChange={e => actions.setFilters({ postName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              >
                <option value="">-- Show All --</option>
                {uniquePostNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            {!isMinistryView && (
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Class</label>
                <select
                  value={selectedClass}
                  onChange={e => actions.setFilters({ className: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                >
                  <option value="">-- Show All --</option>
                  {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Data Table Area */}
        <div className="p-0 border-t border-slate-200 dark:border-slate-800 flex-1 bg-white dark:bg-slate-900 min-h-[400px]">
          <Table
            columnDefs={alignedColumns.columnDefs}
            rowData={pageRows}
            loading={loading}
            pagination={false}
            enableExport={false}
            defaultColDef={{
              minWidth: 120,
              flex: 1,
              filter: false,
              sortable: true,
              resizable: true,
            }}
            domLayout="autoHeight"
            className="border-none [&_.ag-header]:bg-blue-900 [&_.ag-header-cell-text]:text-white"
          />
          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={totalCount}
            pageSize={pageSize}
            onPageChange={(i) => actions.setCurrentPage(i + 1)}
            onPrevPage={() => actions.setCurrentPage((p) => Math.max(1, p - 1))}
            onNextPage={() => actions.setCurrentPage((p) => Math.min(totalPages, p + 1))}
            color="#0f417a"
          />
        </div>
      </div>

      {/* Revoke Modal Overlay */}
      {isModalOpen && selectedRevokePost
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden"
              onClick={closeModal}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-800">Post Revival</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Submit a revival request for this abolished post.
                  </p>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Post Code</label>
                    <div className="text-sm font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      {selectedRevokePost['Post code']}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Remarks<span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={revokeRemarks}
                      onChange={(e) => {
                        setRevokeRemarks(e.target.value);
                        setRevokeDate('');
                        setRevokeFile(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      disabled={isBusy}
                    >
                      <option value="">Select Remarks</option>
                      <option value="Erroneous Data entry">Erroneous Data entry</option>
                      <option value="Approved by ministry for revival">Approved by ministry for revival</option>
                    </select>
                  </div>

                  {revokeRemarks === 'Approved by ministry for revival' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Date of arise in vacancy<span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={revokeDate}
                          onChange={(e) => setRevokeDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          disabled={isBusy}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Upload Document<span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setRevokeFile(e.target.files[0] || null)}
                          className="w-full rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          disabled={isBusy}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isBusy}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      if (!revokeRemarks) {
                        alert('Please select remarks first.');
                        return;
                      }
                      if (revokeRemarks === 'Approved by ministry for revival') {
                        if (!revokeDate) { alert('Please enter the date of arise in vacancy.'); return; }
                        if (!revokeFile) { alert('Please upload the required document.'); return; }
                      }
                      setIsBusy(true);
                      // TODO: Call submit API
                      setTimeout(() => {
                        alert('Post Revival request submitted successfully!');
                        setIsBusy(false);
                        closeModal();
                      }, 800);
                    }}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isBusy ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
