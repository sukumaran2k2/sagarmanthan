import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { deleteOrganisationStructurePost, fetchOrganisationStructureClasses, fetchOrganisationStructurePosts, updateOrganisationStructurePost } from '../../api';
import Table from '../../../../components/Table';
import { isOrganisationUser, getSessionOrganisationId, getSessionClaims } from '../../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { HR_TOASTS } from '../../toastMessages';
import { useHrStore } from '../../store/useHrStore';
import { useDebouncedSearch } from '../../hooks/usePagedList';
import { useGridPage } from '../../hooks/useGridPage';
import { createTableExporter } from '../../utils/exportTable';
import { DeleteActionButton, EditActionButton } from '../../components/HrFormControls';
import { HrFilterPanel, DeptPostClassFilters } from '../../components/HrFilterPanel';
import { HrColumnPicker, HrCopyExport, HrFilterToggle, HrRowsSelect, HrSearchBox, HrTotalBadge } from '../../components/HrListToolbar';
import { classChangeUpdate, useDeptPosts, useHrDepartments } from '../../hooks/useHrFilterOptions';
import { readStrengthConflict, validateDeletionReason } from './postStrength';
import ReducePostStrengthModal from './components/ReducePostStrengthModal';
import EditPostModal from './components/EditPostModal';
import DeletePostModal from './components/DeletePostModal';

export default function OrganisationStructure({ permissions, notify }) {
  // Edit / Delete follow the user's HR rights (view-only admins never change data)
  const canEditPost = !!permissions?.canEdit && !permissions?.isViewOnlyAdmin;
  const canDeletePost = !!permissions?.canRemove && !permissions?.isViewOnlyAdmin;
  const [posts, setPosts] = useState([]);
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

  // Modals
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

  // Fetch classes (for the edit form)
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const classRes = await fetchOrganisationStructureClasses();
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
      const res = await fetchOrganisationStructurePosts(orgId);
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

  // Open Edit Post Modal
  const handleOpenEditModal = (row) => {
    setSelectedPost(row);
    setFormData({
      departmentId: row.department_id || '',
      classId: row.class_id || 1,
      postName: row.post_name || '',
      sanctionedStrength: row.sanctioned_strength || 1,
      payscaleRange: row.payscale_range || '',
      organisationId: row.organisation_id ?? ''
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
    updateOrganisationStructurePost(selectedPost.post_id, {
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
      await deleteOrganisationStructurePost(selectedPost.post_id, deleteReason.trim());
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

  // Column Definitions (all columns; the grid shows the visible ones)
  const allColumnDefs = useMemo(() => {
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

    // Actions Column (only for users who may change posts)
    if (canEditPost || canDeletePost) cols.push({
      headerName: 'Action',
      field: 'actions',
      width: 120,
      minWidth: 110,
      pinned: 'right',
      cellClass: 'flex items-center justify-center text-center',
      headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
      cellRenderer: (params) => (
        <div className="flex items-center justify-center gap-1">
          {canEditPost && <EditActionButton label="Edit Post" onClick={() => handleOpenEditModal(params.data)} />}
          {canDeletePost && <DeleteActionButton label="Delete Post" onClick={() => handleOpenDeleteModal(params.data)} />}
        </div>
      )
    });

    return cols;
  }, [isMinistryView, canEditPost, canDeletePost]);
  const columnDefs = useMemo(
    () => allColumnDefs.filter(col => visibleCols[col.field] !== false),
    [allColumnDefs, visibleCols]
  );

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

          <div className="flex flex-wrap items-center gap-2.5">
            <HrFilterToggle
              open={showFilterPanel}
              activeCount={activeFiltersCount}
              onToggle={() => actions.setShowFilterPanel(prev => !prev)}
              onReset={handleResetFilters}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <HrRowsSelect value={pageSize} onChange={actions.setPageSize} />
            <HrTotalBadge count={filteredPosts.length} />
            <HrSearchBox value={searchTerm} onChange={actions.setSearchTerm} />
            <HrColumnPicker
              columns={allColumnDefs
                .filter(c => c.field && c.field !== 'actions' && c.field !== 'sno')
                .map(c => ({ key: c.field, label: c.headerName, visible: visibleCols[c.field] !== false }))}
              onToggle={handleToggleColumn}
            />
            {/* Copy / Export: the current page */}
            <HrCopyExport onCopy={() => runExport('copy')} onExcel={() => runExport('excel')} onPdf={() => runExport('pdf')} />
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

      {/* Edit Post Modal */}
      {isEditModalOpen && selectedPost && (
        <EditPostModal
          classes={classes}
          formData={formData}
          handleEditSubmit={handleEditSubmit}
          isSubmitting={isSubmitting}
          selectedPost={selectedPost}
          setFormData={setFormData}
          setIsEditModalOpen={setIsEditModalOpen}
        />
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
      {isDeleteModalOpen && selectedPost && (
        <DeletePostModal
          deleteReason={deleteReason}
          deleteReasonError={deleteReasonError}
          handleDeleteSubmit={handleDeleteSubmit}
          isSubmitting={isSubmitting}
          selectedPost={selectedPost}
          setDeleteReason={setDeleteReason}
          setDeleteReasonError={setDeleteReasonError}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
        />
      )}

    </div>
  );
}
