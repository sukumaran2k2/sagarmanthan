import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import { fetchAbolishedPostsPage } from '../../api';
import { HrFilterPanel, DeptPostClassFilters } from '../../components/HrFilterPanel';
import { classChangeUpdate, useDeptPosts, useHrDepartments } from '../../hooks/useHrFilterOptions';
import { COMMON_TOASTS } from '../../../../utils/notify';
import { HR_TOASTS } from '../../toastMessages';
import { useDebouncedSearch, usePagedList } from '../../hooks/usePagedList';
import { useHrStore } from '../../store/useHrStore';
import { alignHrColumns } from '../../utils/tableAlignment';
import { createTableExporter } from '../../utils/exportTable';
import { PostCodeTag } from '../../components/HrFormControls';
import ViewAbolishedPostDetails from './PostDetails';
import { formatDate } from '../../utils/dates';
import { HrColumnPicker, HrCopyExport, HrFilterToggle, HrRowsSelect, HrSearchBox, HrTotalBadge } from '../../components/HrListToolbar';


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
    'Date of Arise in Vacancy': formatDate(row.date_of_arise_in_vacancy, 0),
    'Last Updated Date': row.updated_date ? String(row.updated_date).slice(0, 10) : '--',
    Status: status.label,
    StatusColor: status.color,
    StatusTargetView: status.targetView,
    RevivalStageId: row.revival_stage_id,
    _raw: row,
  };
};

// 2.0 columns offered in Visibility, unticked until the user ticks them
const HIDDEN_BY_DEFAULT = new Set(['Class', 'Date of Arise in Vacancy', 'Last Updated Date']);
const isShown = (visibleCols, field) => visibleCols[field] ?? !HIDDEN_BY_DEFAULT.has(field);

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
  const list = useHrStore(useShallow((state) => state.abolished));
  const actions = useHrStore((state) => state.abolishedActions);
  const {
    organisationId: selectedOrg, departmentId: selectedDept, postId: selectedPostName,
    className: selectedClass, searchTerm, debouncedSearch, showFilterPanel, currentPage, pageSize,
  } = list;
  const organisations = useHrStore((state) => state.organisations);
  // Post opened from its post code or status button (details / revival request view)
  const [selectedPostForDetails, setSelectedPostForDetails] = useState(null);

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
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isModalOpen]);

  // Organisation scope is applied on the server.
  const canLoad = isMinistryView || Boolean(orgId);

  // An organisation user without an organisation in the token cannot be scoped; nothing is loaded.
  useEffect(() => {
    if (!canLoad) notifyRef.current?.(HR_TOASTS.sessionExpired());
  }, [canLoad]);

  // Filter options as on Vacancy Management: department master, posts of the chosen department
  // (ministry users pick an organisation first), fixed class list
  const filterOrgId = isMinistryView ? selectedOrg : orgId;
  const filterDepartments = useHrDepartments(filterOrgId);
  const { deptPosts, posts: filterPosts } = useDeptPosts(selectedDept, filterOrgId, selectedClass);

  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);

  // One params object is the request: page, limit and only the filters that are set.
  // Organisation users are scoped to their own organisation on the server.
  const params = useMemo(() => {
    const query = { page: currentPage, limit: pageSize };
    if (isMinistryView && selectedOrg) query.organisationId = selectedOrg;
    if (selectedDept) query.departmentId = selectedDept;
    if (selectedPostName) query.postId = selectedPostName;
    if (selectedClass) query.className = selectedClass;
    if (debouncedSearch) query.search = debouncedSearch;
    return query;
  }, [currentPage, pageSize, isMinistryView, selectedOrg, selectedDept, selectedPostName, selectedClass, debouncedSearch]);

  const onListError = useCallback(
    (err) => {
      console.error(err);
      notifyRef.current?.(COMMON_TOASTS.loadFailed('Abolished posts'));
    },
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

  // Column visibility lives in the store (only the user's changes; all shown by default)
  const visibleCols = list.visibleCols;
  const handleToggleColumn = (field) => {
    actions.setVisibleCols(prev => ({ ...prev, [field]: !isShown(prev, field) }));
  };

  // All columns; the grid shows the visible ones
  const allColumnDefs = useMemo(() => {
    const cols = [
      {
        field: 'sNo',
        headerName: 'S.No',
        minWidth: 70, maxWidth: 90,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500',
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
      { field: 'Class', headerName: 'Class', minWidth: 110, cellClass: 'text-center', headerClass: 'text-center' },
      { field: 'Date of Arise in Vacancy', headerName: 'Date of Arise in Vacancy', minWidth: 170, cellClass: 'text-center', headerClass: 'text-center' },
      { field: 'Last Updated Date', headerName: 'Last Updated Date', minWidth: 150, cellClass: 'text-center', headerClass: 'text-center' },
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

    return cols;
  }, [isMinistryView, canRequestRevival]);
  const columnDefs = useMemo(() => allColumnDefs.filter(col => {
    if (col.field === 'sNo') return true;
    if (col.field) return isShown(visibleCols, col.field);
    return true;
  }), [allColumnDefs, visibleCols]);

  // Copy / Export: every row matching the filters, visible data columns only.
  // Built on click: it reads the notifier ref, which must not happen during render.
  const runExport = (kind) => createTableExporter({
    loadRows: () => pageRows,
    isBusy: busy,
    serialStart,
    getColumns: () => columnDefs
      .filter((c) => c.field && !NON_DATA_FIELDS.has(c.field))
      .map((c) => ({ field: c.field, label: c.headerName })),
    notify: (toast) => notifyRef.current?.(toast),
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
        permissions={permissions}
        notify={notify}
      />
    );
  }

  return (

    <div className="space-y-6 animate-fade-in">

      {/* Main Content Card */}
      <div className="module-card space-y-4">

        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 relative">

          <div className="flex flex-wrap items-center gap-2.5">
            <HrFilterToggle
              open={showFilterPanel}
              activeCount={activeFiltersCount}
              onToggle={() => actions.setShowFilterPanel(prev => !prev)}
              onReset={clearFilters}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <HrRowsSelect value={pageSize} onChange={actions.setPageSize} />
            <HrTotalBadge count={totalCount} />
            <HrSearchBox value={searchTerm} onChange={actions.setSearchTerm} />
            <HrColumnPicker
              columns={allColumnDefs
                .filter(c => c.field && c.field !== 'sNo')
                .map(c => ({ key: c.field, label: c.headerName, visible: isShown(visibleCols, c.field) }))}
              onToggle={handleToggleColumn}
            />
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

        {/* Data Table Area */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800 min-h-[400px]">
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
                        notify?.(HR_TOASTS.revivalRemarksRequired());
                        return;
                      }
                      if (revokeRemarks === 'Approved by ministry for revival') {
                        if (!revokeDate) { notify?.(HR_TOASTS.revivalDateRequired()); return; }
                        if (!revokeFile) { notify?.(HR_TOASTS.revivalDocumentRequired()); return; }
                      }
                      setIsBusy(true);
                      // TODO: Call submit API. Until then, say so instead of reporting a success.
                      setTimeout(() => {
                        notify?.(HR_TOASTS.revivalRequestRecorded());
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
