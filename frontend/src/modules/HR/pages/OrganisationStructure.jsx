import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';
// Shared client: sends the login token and refreshes it (HR routes require login)
import { axiosInstance as axios } from '../../../api';
import {
  Plus,
  Search,
  X,
  ChevronDown,
  Edit3,
  Filter,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { isOrganisationUser, getSessionOrganisationId, getSessionClaims } from '../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';
import { useHrStore } from '../store/useHrStore';
import { useDebouncedSearch } from '../hooks/usePagedList';
import { useGridPage } from '../hooks/useGridPage';
import { createTableExporter } from '../utils/exportTable';
import { DeleteActionButton, EditActionButton, ModalButtons } from '../components/HrFormControls';
import { HrFilterPanel, DeptPostClassFilters } from '../components/HrFilterPanel';
import { classChangeUpdate, useDeptPosts, useHrDepartments } from '../hooks/useHrFilterOptions';
import { MAX_DELETION_REASON, readStrengthConflict, validateDeletionReason } from '../utils/postStrength';
import ReducePostStrengthModal from '../components/ReducePostStrengthModal';

export default function OrganisationStructure({ notify }) {
  const [posts, setPosts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View Mode
  const isMinistryView = useMemo(() => !isOrganisationUser(), []);

  // Filters, search, paging and column visibility live in the HR store
  const {
    selectedOrg, selectedDept, selectedClass, selectedPostName, searchTerm, debouncedSearch,
    showFilterPanel, currentPage, pageSize, visibleCols } = useHrStore(useShallow((state) => ({
    selectedOrg: state.orgStructure.organisationId,
    selectedDept: state.orgStructure.departmentId,
    selectedClass: state.orgStructure.className,
    selectedPostName: state.orgStructure.postId,
    searchTerm: state.orgStructure.searchTerm,
    debouncedSearch: state.orgStructure.debouncedSearch,
    showFilterPanel: state.orgStructure.showFilterPanel,
    currentPage: state.orgStructure.currentPage,
    pageSize: state.orgStructure.pageSize,
    visibleCols: state.orgStructure.visibleCols })));
  const actions = useHrStore((state) => state.orgStructureActions);
  const organisations = useHrStore((state) => state.organisations);
  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);
  const gridPage = useGridPage(currentPage, actions.setCurrentPage);

  const activeFiltersCount = useMemo(() => {
    return [
      selectedOrg,
      selectedDept,
      selectedClass,
      selectedPostName
    ].filter(Boolean).length;
  }, [selectedOrg, selectedDept, selectedClass, selectedPostName]);

  // Column visibility dropdown (the visible columns themselves live in the store)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Lowering strength: the server's list of vacant post codes to choose from (409 SELECT_POST_CODES)
  const [strengthConflict, setStrengthConflict] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteReasonError, setDeleteReasonError] = useState('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    departmentId: '',
    classId: '',
    postName: '',
    sanctionedStrength: 1,
    payscaleRange: '',
    organisationId: ''
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch departments & classes
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, classRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/get-organisation-structure-departments`),
          axios.get(`${API_BASE_URL}/get-organisation-structure-classes`)
        ]);
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
        setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      } catch (err) {
        console.error('Error fetching master dropdowns:', err);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch Posts. Only the latest request may update state (stale-response guard).
  const latestRequestRef = useRef(0);
  const fetchPosts = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const claims = getSessionClaims() || {};
      // Organisation users get their own (the server pins it); ministry users the chosen organisation id
      const orgId = !isMinistryView ? (getSessionOrganisationId() || claims.organisationId) : (selectedOrg || 'all');
      const url = `${API_BASE_URL}/get-organisation-structure-posts/${orgId}`;
      const res = await axios.get(url);
      if (isStale()) return;
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (isStale()) return;
      console.error('Error fetching organisation structure posts:', err);
      setError('Failed to load organisation structure posts');
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [selectedOrg, isMinistryView]);

  useEffect(() => {
    // Deferred a tick so the load's setState does not run synchronously in the effect
    const timer = setTimeout(fetchPosts, 0);
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  // Filter options as on Vacancy Management: the department master of the organisation, the posts
  // of the chosen department (ministry users pick an organisation first) and the fixed class list
  const filterOrgId = isMinistryView ? selectedOrg : (getSessionOrganisationId() || getSessionClaims()?.organisationId || '');
  const filterDepartments = useHrDepartments(filterOrgId);
  const { deptPosts, posts: filterPosts } = useDeptPosts(selectedDept, filterOrgId, selectedClass);

  // Filtered rows
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (selectedOrg && String(post.organisation_id) !== String(selectedOrg)) return false;
      if (selectedDept && String(post.department_id ?? '').trim() !== selectedDept) return false;
      if (selectedClass && post.class_name !== selectedClass) return false;
      if (selectedPostName && String(post.post_id) !== String(selectedPostName)) return false;

      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const match =
          (post.post_name && post.post_name.toLowerCase().includes(term)) ||
          (post.department_name && post.department_name.toLowerCase().includes(term)) ||
          (post.class_name && post.class_name.toLowerCase().includes(term)) ||
          (post.post_id && post.post_id.toLowerCase().includes(term)) ||
          (post.organisation_name && post.organisation_name.toLowerCase().includes(term));
        if (!match) return false;
      }
      return true;
    });
  }, [posts, selectedOrg, selectedDept, selectedClass, selectedPostName, debouncedSearch]);

  // Reset Filters
  const handleResetFilters = () => {
    actions.resetFilters();
    actions.setSearchTerm('');
    notify?.(COMMON_TOASTS.filtersReset());
  };

  // Open Add Post Modal
  // Kept for the "Add Post" button (posts are added from Input Form > Add Post for now)
  // eslint-disable-next-line no-unused-vars
  const handleOpenAddModal = () => {
    const claims = getSessionClaims() || {};
    const defaultOrgId = getSessionOrganisationId() || claims.organisationId || 1;
    setFormData({
      departmentId: departments[0]?.department_id || '',
      classId: classes[0]?.class_id || 1,
      postName: '',
      sanctionedStrength: 1,
      payscaleRange: '',
      organisationId: defaultOrgId
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Post Modal
  const handleOpenEditModal = (row) => {
    setSelectedPost(row);
    setFormData({
      departmentId: row.department_id || '',
      classId: row.class_id || 1,
      postName: row.post_name || '',
      sanctionedStrength: row.sanctioned_strength || 1,
      payscaleRange: row.payscale_range || '',
      organisationId: row.organisation_id || 1
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (row) => {
    setSelectedPost(row);
    setDeleteReason('');
    setDeleteReasonError('');
    setIsDeleteModalOpen(true);
  };

  // Submit Add Post
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.postName.trim()) {
      notify?.(HR_TOASTS.postNameRequired());
      return;
    }
    if (!formData.departmentId) {
      notify?.(HR_TOASTS.departmentRequired());
      return;
    }

    setIsSubmitting(true);
    try {
      const claims = getSessionClaims() || {};
      const orgId = !isMinistryView
        ? (getSessionOrganisationId() || claims.organisationId || 1)
        : (formData.organisationId || getSessionOrganisationId() || claims.organisationId || 1);

      await axios.post(`${API_BASE_URL}/add-organisation-structure-post`, {
        organisationId: orgId,
        departmentId: formData.departmentId,
        classId: formData.classId,
        postName: formData.postName.trim(),
        sanctionedStrength: parseInt(formData.sanctionedStrength, 10) || 1,
        payscaleRange: formData.payscaleRange.trim()
      });

      notify?.(HR_TOASTS.postAdded(formData.postName.trim()));
      setIsAddModalOpen(false);
      fetchPosts();
    } catch (err) {
      console.error('Error adding post:', err);
      notify?.(HR_TOASTS.postAddFailed(getErrorMessage(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Post
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPost) return;
    if (!formData.postName.trim()) {
      notify?.(HR_TOASTS.postNameRequired());
      return;
    }

    setIsSubmitting(true);
    try {
      await savePostEdit();
      notify?.(HR_TOASTS.postUpdated(formData.postName.trim()));
      closeEdit();
    } catch (err) {
      // Lowering strength: the user picks which vacant post codes go (legacy behaviour)
      const conflict = readStrengthConflict(err);
      if (conflict) {
        setStrengthConflict(conflict);
      } else {
        console.error('Error updating post:', err);
        notify?.(HR_TOASTS.postUpdateFailed(getErrorMessage(err)));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const savePostEdit = (reduction = {}) =>
    axios.put(`${API_BASE_URL}/update-organisation-structure-post/${selectedPost.post_id}`, {
      postName: formData.postName.trim(),
      classId: formData.classId,
      sanctionedStrength: parseInt(formData.sanctionedStrength, 10),
      payscaleRange: formData.payscaleRange.trim(),
      ...reduction
    });

  const closeEdit = () => {
    setStrengthConflict(null);
    setIsEditModalOpen(false);
    setSelectedPost(null);
    fetchPosts();
  };

  // Reduce strength with the chosen vacant post codes and remarks (archived, then deleted)
  const handleReduceConfirm = async (postCodesToDelete, reason) => {
    setIsSubmitting(true);
    try {
      await savePostEdit({ postCodesToDelete, reason });
      notify?.(HR_TOASTS.postStrengthReduced(formData.postName.trim(), postCodesToDelete.length));
      closeEdit();
    } catch (err) {
      const conflict = readStrengthConflict(err);
      if (conflict) setStrengthConflict(conflict); // codes changed meanwhile: show the fresh list
      else notify?.(HR_TOASTS.postUpdateFailed(getErrorMessage(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete Post
  const handleDeleteSubmit = async () => {
    if (!selectedPost) return;
    const reasonError = validateDeletionReason(deleteReason);
    setDeleteReasonError(reasonError);
    if (reasonError) return;
    setIsSubmitting(true);
    try {
      await axios.delete(`${API_BASE_URL}/delete-organisation-structure-post/${selectedPost.post_id}`, {
        data: { reason: deleteReason.trim() }
      });
      notify?.(HR_TOASTS.postDeleted());
      setIsDeleteModalOpen(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
      notify?.(HR_TOASTS.postDeleteFailed(getErrorMessage(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle column visibility toggling
  const handleToggleColumn = (field) => {
    actions.setVisibleCols(prev => ({
      ...prev,
      [field]: prev[field] === false
    }));
  };

  // Column Definitions
  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'S.No',
        field: 'sno',
        width: 75,
        minWidth: 70,
        pinned: 'left',
        cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full text-center">
            {params.node.rowIndex + 1}
          </div>
        )
      },
      {
        headerName: 'Post Name',
        field: 'post_name',
        minWidth: 240,
        flex: 2,
        wrapText: true,
        autoHeight: true,
        cellClass: 'font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-center text-center whitespace-normal break-words',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full text-center py-1">
            <span className="font-semibold text-slate-800 dark:text-slate-100">{params.value}</span>
          </div>
        )
      },
      {
        headerName: 'Department',
        field: 'department_name',
        minWidth: 200,
        flex: 1.5,
        wrapText: true,
        autoHeight: true,
        cellClass: 'text-slate-700 dark:text-slate-300 flex items-center justify-center text-center whitespace-normal break-words',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full text-center py-1">
            {params.value || '--'}
          </div>
        )
      },
      {
        headerName: 'Class / Group',
        field: 'class_name',
        minWidth: 130,
        flex: 1,
        cellClass: 'flex items-center justify-center text-center',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full flex items-center justify-center">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
              {params.value || '--'}
            </span>
          </div>
        )
      },
      {
        headerName: 'Sanctioned Strength',
        field: 'sanctioned_strength',
        minWidth: 150,
        flex: 1,
        cellClass: 'flex items-center justify-center text-center font-bold text-slate-800 dark:text-slate-100',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full flex items-center justify-center">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
              {params.value ?? 0}
            </span>
          </div>
        )
      }
    ];

    if (isMinistryView) {
      cols.splice(2, 0, {
        headerName: 'Organisation',
        field: 'organisation_name',
        minWidth: 200,
        flex: 1.5,
        wrapText: true,
        autoHeight: true,
        cellClass: 'text-slate-700 dark:text-slate-300 flex items-center justify-center text-center whitespace-normal break-words',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full text-center py-1">
            {params.value || '--'}
          </div>
        )
      });
    }

    // Actions Column
    cols.push({
      headerName: 'Action',
      field: 'actions',
      width: 120,
      minWidth: 110,
      pinned: 'right',
      cellClass: 'flex items-center justify-center text-center',
      headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
      cellRenderer: (params) => (
        <div className="flex items-center justify-center gap-1">
          <EditActionButton label="Edit Post" onClick={() => handleOpenEditModal(params.data)} />
          <DeleteActionButton label="Delete Post" onClick={() => handleOpenDeleteModal(params.data)} />
        </div>
      )
    });

    return cols.filter(col => visibleCols[col.field] !== false);
  }, [isMinistryView, visibleCols]);

  // Copy / Export: the rows on the current page, same columns as before
  const pageStart = (currentPage - 1) * pageSize;
  const runExport = (kind) => createTableExporter({
    loadRows: () => filteredPosts.slice(pageStart, pageStart + pageSize),
    serialStart: pageStart,
    getColumns: () => [
      { field: 'post_name', label: 'Post Name' },
      ...(isMinistryView ? [{ field: 'organisation_name', label: 'Organisation' }] : []),
      { field: 'department_name', label: 'Department' },
      { field: 'class_name', label: 'Class / Group' },
      { field: 'sanctioned_strength', label: 'Sanctioned Strength' },
    ],
    notify,
    isBusy: loading,
    title: `Organisation Structure (Page ${currentPage})`,
    fileName: `Organisation_Structure_Page_${currentPage}`,
    label: 'Organisation structure' })[kind]();

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Main Table Section */}
      <div className="module-card space-y-4">

        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">

          {/* Left: Filter Toggle Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel(prev => !prev)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Right: Entries, Total, Search, Column Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">

            {/* 1. Show Entries */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
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

            {/* 2. Total Count */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredPosts.length}
            </div>

            {/* 3. Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => actions.setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 4. Column Visibility */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {columnDefs.filter(c => c.field && c.field !== 'actions' && c.field !== 'sno').map(col => (
                    <label
                      key={col.field}
                      className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none"
                    >
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

            {/* 5. Copy / 6. Export: the current page */}
            <CopyButton onCopy={() => runExport('copy')} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => runExport('excel')} onExportPdf={() => runExport('pdf')} color="#0f417a" hoverColor="#1d5594" chevron />
          </div>
        </div>

        {/* Filter Panel (shared HR design) */}
        <div className={showFilterPanel ? 'px-4 pt-4' : ''}>
          <HrFilterPanel show={showFilterPanel} columns={isMinistryView ? 4 : 3}>
            <DeptPostClassFilters
              organisations={isMinistryView ? organisations : undefined}
              organisationId={selectedOrg}
              onOrganisationChange={(value) => actions.setFilters({ organisationId: value, departmentId: '', postId: '' })}
              departments={filterDepartments}
              departmentId={selectedDept}
              onDepartmentChange={(value) => actions.setFilters({ departmentId: value, postId: '' })}
              posts={filterPosts}
              postId={selectedPostName}
              onPostChange={(value) => actions.setFilters({ postId: value })}
              needsOrganisation={isMinistryView && !selectedOrg}
              className={selectedClass}
              onClassChange={(value) => actions.setFilters(classChangeUpdate(value, selectedPostName, deptPosts))}
            />
          </HrFilterPanel>
        </div>

        {/* Table Content */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f417a] dark:border-blue-400"></div>
              <span className="text-xs font-medium text-slate-500">Loading organisation structure...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-rose-500">
              <span className="text-xs font-medium">{error}</span>
              <button
                type="button"
                onClick={fetchPosts}
                className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <Table
              columnDefs={columnDefs}
              rowData={filteredPosts}
              pagination={true}
              paginationPageSize={pageSize}
              {...gridPage}
              defaultColDef={{
                minWidth: 120,
                flex: 1,
                filter: true,
                sortable: true,
                resizable: true,
                cellClass: 'text-center flex items-center justify-center',
                headerClass: 'text-center [&_.ag-header-cell-label]:justify-center' }}
              domLayout="autoHeight"
            />
          )}
        </div>

      </div>

      {/* Add Post Modal */}
      {isAddModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-in my-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Post</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Create a new post in the organisation structure</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">

              {/* Department */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.departmentId}
                  onChange={e => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Class / Group <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.classId}
                  onChange={e => setFormData(prev => ({ ...prev, classId: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {classes.map(c => (
                    <option key={c.class_id} value={c.class_id}>
                      Class {c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Post Name */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Post Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Personnel Officer"
                  value={formData.postName}
                  onChange={e => setFormData(prev => ({ ...prev, postName: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Sanctioned Strength */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Sanctioned Strength <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.sanctionedStrength}
                  onChange={e => setFormData(prev => ({ ...prev, sanctionedStrength: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Payscale Range */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Payscale Range <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50000-160000"
                  value={formData.payscaleRange}
                  onChange={e => setFormData(prev => ({ ...prev, payscaleRange: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <ModalButtons
                  onCancel={() => setIsAddModalOpen(false)}
                  busy={isSubmitting}
                  submitType="submit"
                  submitLabel="Save Post"
                  busyLabel="Saving..."
                />
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Post Modal */}
      {isEditModalOpen && selectedPost && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-in my-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Post</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update post information and strength</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">

              {/* Department (Readonly info) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Department:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPost.department_name}</span>
                </div>
              </div>

              {/* Post Name */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Post Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.postName}
                  onChange={e => setFormData(prev => ({ ...prev, postName: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Class */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Class / Group <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.classId}
                  onChange={e => setFormData(prev => ({ ...prev, classId: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {classes.map(c => (
                    <option key={c.class_id} value={c.class_id}>
                      Class {c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sanctioned Strength */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Sanctioned Strength <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  required
                  value={formData.sanctionedStrength}
                  onChange={e => setFormData(prev => ({ ...prev, sanctionedStrength: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {Number(formData.sanctionedStrength) < Number(selectedPost?.sanctioned_strength) && (
                  <p className="mt-1 text-2xs text-amber-600 dark:text-amber-400">
                    Reducing strength: you will choose which vacant post codes to delete and give remarks.
                  </p>
                )}
              </div>

              {/* Payscale Range */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Payscale Range <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50000-160000"
                  value={formData.payscaleRange}
                  onChange={e => setFormData(prev => ({ ...prev, payscaleRange: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <ModalButtons
                  onCancel={() => setIsEditModalOpen(false)}
                  busy={isSubmitting}
                  submitType="submit"
                  submitLabel="Update Post"
                  busyLabel="Updating..."
                />
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Reduce strength: choose the vacant post codes to delete, with remarks */}
      {strengthConflict && selectedPost && (
        <ReducePostStrengthModal
          key={`${strengthConflict.currentStrength}-${strengthConflict.requestedStrength}-${strengthConflict.vacantPosts.length}`}
          postName={formData.postName.trim() || selectedPost.post_name}
          conflict={strengthConflict}
          isSubmitting={isSubmitting}
          onConfirm={handleReduceConfirm}
          onCancel={() => setStrengthConflict(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedPost && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Post</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Confirm post removal</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{selectedPost.post_name}"</span>?
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
                <strong>Warning:</strong> This will delete this post and its vacant post slots. Posts with active assigned employees cannot be deleted.
              </div>
              <div>
                <label htmlFor="delete-post-reason" className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Reason for deletion <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="delete-post-reason"
                  rows={2}
                  maxLength={MAX_DELETION_REASON}
                  value={deleteReason}
                  onChange={e => { setDeleteReason(e.target.value); setDeleteReasonError(''); }}
                  disabled={isSubmitting}
                  placeholder="e.g. Post abolished as per order no. ..."
                  className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border ${
                    deleteReasonError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                  } rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                />
                <div className="flex justify-between text-2xs mt-0.5">
                  <span className="text-rose-500">{deleteReasonError}</span>
                  <span className="text-slate-400">{deleteReason.length}/{MAX_DELETION_REASON}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
              <ModalButtons
                onCancel={() => setIsDeleteModalOpen(false)}
                onSubmit={handleDeleteSubmit}
                busy={isSubmitting}
                submitVariant="danger"
                submitLabel="Delete Post"
                busyLabel="Deleting..."
              />
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
