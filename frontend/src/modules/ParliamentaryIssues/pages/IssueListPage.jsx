import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import RestrictedAccess from '../../../components/RestrictedAccess';
import IssueListTable from '../components/IssueListTable';
import {
  deleteParliamentaryIssue,
  fetchParliamentaryIssueById,
  fetchParliamentaryIssues,
} from '../api';
import { mapIssueListRow, mapIssueToForm } from '../utils/mapIssue';
import { useParliamentaryPermissions } from '../hooks/useParliamentaryPermissions';
import { useParliamentaryStore } from '../store/useParliamentaryStore';
import { issueTypesFromStages } from '../utils/stageHelpers';
import { getCurrentUserId } from '../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { PARLIAMENTARY_TOASTS } from '../toastMessages';

const EMPTY_PAGINATION = { total: 0, page: 1, limit: 10, totalPages: 0 };
const FILTER_KEYS = ['wingId', 'divisionId', 'issueType', 'status'];

export default function IssueListPage({
  notify,
  onEdit,
  onGoHome,
}) {
  const permissions = useParliamentaryPermissions();
  const { canView } = permissions;

  // Reference data and list state from the store, so they survive switching tabs
  const { wings, divisions, stages } = useParliamentaryStore(useShallow((state) => ({
    wings: state.wings, divisions: state.divisions, stages: state.stages,
  })));
  const {
    category, filters, searchTerm, debouncedSearch, currentPage, pageSize, showFilterPanel, visibleCols,
  } = useParliamentaryStore(useShallow((state) => ({
    category: state.category,
    filters: state.filters,
    searchTerm: state.searchTerm,
    debouncedSearch: state.debouncedSearch,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    showFilterPanel: state.showFilterPanel,
    visibleCols: state.visibleCols,
  })));
  const actions = useParliamentaryStore(useShallow((state) => ({
    setSearchTerm: state.setSearchTerm,
    setDebouncedSearch: state.setDebouncedSearch,
    setFilters: state.setFilters,
    resetFilters: state.resetFilters,
    setCategory: state.setCategory,
    setCurrentPage: state.setCurrentPage,
    setPageSize: state.setPageSize,
    setShowFilterPanel: state.setShowFilterPanel,
    setVisibleCols: state.setVisibleCols,
  })));
  const issueTypeOptions = useMemo(() => issueTypesFromStages(stages), [stages]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Search applies 300 ms after the user stops typing (and then returns to page 1)
  useEffect(() => {
    const timer = setTimeout(() => actions.setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, actions]);

  // Fetched rows are tagged with the request they answer; a mismatch means it is still loading.
  // Only the latest request may update them (an older response can arrive last).
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState(null);
  // The Active / Completed totals come with each page; keep the last ones while the next loads
  const [counts, setCounts] = useState({ active: 0, completed: 0 });
  const latestRequestRef = useRef(0);
  const requestKey = JSON.stringify([category, filters, debouncedSearch, currentPage, pageSize, reloadKey]);

  useEffect(() => {
    if (!canView) return;
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    fetchParliamentaryIssues({ page: currentPage, limit: pageSize, category, ...filters, search: debouncedSearch })
      .then((res) => {
        if (isStale()) return;
        const payload = res?.data || {};
        const data = Array.isArray(payload.data) ? payload.data : [];
        setResult({
          key: requestKey,
          rows: data.map(mapIssueListRow),
          pagination: {
            total: Number(payload.pagination?.total) || 0,
            page: Number(payload.pagination?.page) || currentPage,
            limit: Number(payload.pagination?.limit) || pageSize,
            totalPages: Number(payload.pagination?.totalPages) || 0,
          },
        });
        if (payload.counts) {
          setCounts({
            active: Number(payload.counts.active) || 0,
            completed: Number(payload.counts.completed) || 0,
          });
        }
      })
      .catch((err) => {
        if (isStale()) return;
        console.error('Error loading parliamentary issues:', err);
        setResult({ key: requestKey, rows: [], pagination: { ...EMPTY_PAGINATION, limit: pageSize } });
        notify?.(COMMON_TOASTS.loadFailed('Parliamentary issues'));
      });
  }, [requestKey, canView, category, filters, debouncedSearch, currentPage, pageSize, notify]);

  const loading = result?.key !== requestKey;
  const rows = result?.rows ?? [];
  const pagination = result?.pagination ?? { ...EMPTY_PAGINATION, limit: pageSize };

  // A deleted row can leave the page empty; step back so the list doesn't look blank
  useEffect(() => {
    if (!loading && rows.length === 0 && currentPage > 1) actions.setCurrentPage(currentPage - 1);
  }, [loading, rows.length, currentPage, actions]);

  // Open the full issue (the list row only has summary fields) in the form
  const handleEdit = useCallback(async (row) => {
    try {
      const res = await fetchParliamentaryIssueById(row.id);
      const record = Array.isArray(res.data) ? res.data[0] : res.data;
      onEdit?.(mapIssueToForm(record));
    } catch (err) {
      console.error(err);
      notify?.(PARLIAMENTARY_TOASTS.openFailed(getErrorMessage(err)));
    }
  }, [onEdit, notify]);

  const handleDelete = (row) => {
    if (!permissions.canRemove) return;
    setDeleteTarget(row);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !permissions.canRemove) return;
    setDeleting(true);
    try {
      await deleteParliamentaryIssue(deleteTarget.id, getCurrentUserId());
      notify?.(PARLIAMENTARY_TOASTS.deleted());
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      notify?.(PARLIAMENTARY_TOASTS.deleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  // The table edits filters and search as one object, as before
  const handleFiltersChange = (next) => {
    if (next.search !== searchTerm) actions.setSearchTerm(next.search);
    const changed = Object.fromEntries(FILTER_KEYS
      .filter((k) => next[k] !== filters[k]).map((k) => [k, next[k]]));
    if (Object.keys(changed).length) actions.setFilters(changed);
  };

  if (!canView) {
    return (
      <RestrictedAccess
        moduleName="Parliamentary Issues"
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <>
      <IssueListTable
        rows={rows}
        loading={loading}
        wings={wings}
        divisions={divisions}
        issueTypeOptions={issueTypeOptions}
        stages={stages}
        canEdit={permissions.canEdit}
        canView={permissions.canView}
        canDelete={permissions.canRemove}
        filters={{ ...filters, search: searchTerm }}
        onFiltersChange={handleFiltersChange}
        onResetFilters={actions.resetFilters}
        category={category}
        onCategoryChange={actions.setCategory}
        counts={counts}
        page={currentPage}
        pageSize={pageSize}
        pagination={pagination}
        onPageChange={actions.setCurrentPage}
        onPageSizeChange={actions.setPageSize}
        showFilterPanel={showFilterPanel}
        onShowFilterPanelChange={actions.setShowFilterPanel}
        visibleCols={visibleCols}
        onVisibleColsChange={actions.setVisibleCols}
        onEdit={handleEdit}
        onDelete={handleDelete}
        notify={notify}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-700 text-white">
              <h3 className="text-sm font-black uppercase tracking-wider">
                Delete Parliamentary Issue
              </h3>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="text-rose-200 hover:text-white transition disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete this parliamentary issue?
              </p>
              {deleteTarget.subject ? (
                <p className="text-sm font-semibold text-slate-900">
                  {deleteTarget.subject}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
