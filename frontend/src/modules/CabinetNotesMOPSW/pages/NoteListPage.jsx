import { useCallback, useEffect, useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X, FileText, Download } from 'lucide-react';
import RestrictedAccess from '../../../components/RestrictedAccess';
import NoteListTable from '../components/NoteListTable';
import {
  deleteCabinetNote,
  downloadNoteDocument,
  fetchCabinetNoteById,
  fetchCabinetNotes,
  fetchNoteDocuments,
} from '../api';
import { mapNoteListRow, mapNoteToForm } from '../utils/mapNote';
import { useCabinetNotesPermissions } from '../hooks/useCabinetNotesPermissions';
import { useCabinetNotesStore } from '../store/useCabinetNotesStore';
import { statusNamesFromStages } from '../utils/stageHelpers';
import { getCurrentUserId } from '../../../utils/authSession';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { CABINET_NOTES_TOASTS } from '../toastMessages';

const EMPTY_PAGINATION = { total: 0, page: 1, limit: 10, totalPages: 0 };
const ALL_FILTERS = { wingId: 'All', divisionId: 'All', status: 'All', search: '' };

export default function NoteListPage({ notify, onEdit, onGoHome }) {
  const permissions = useCabinetNotesPermissions();
  const { canView } = permissions;

  // Reference data and list state from the store, so they survive switching tabs
  const { wings, divisions, stages } = useCabinetNotesStore(useShallow((state) => ({
    wings: state.wings, divisions: state.divisions, stages: state.stages,
  })));
  const {
    category, filters, searchTerm, debouncedSearch, currentPage, pageSize, showFilterPanel, visibleCols,
  } = useCabinetNotesStore(useShallow((state) => ({
    category: state.category,
    filters: state.filters,
    searchTerm: state.searchTerm,
    debouncedSearch: state.debouncedSearch,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    showFilterPanel: state.showFilterPanel,
    visibleCols: state.visibleCols,
  })));
  const actions = useCabinetNotesStore(useShallow((state) => ({
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
  const statusOptions = statusNamesFromStages(stages, { excludeCompleted: true });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [docsTarget, setDocsTarget] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Search applies 300 ms after the user stops typing (and then returns to page 1)
  useEffect(() => {
    const timer = setTimeout(() => actions.setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, actions]);

  // Fetched rows are tagged with the request they answer; a mismatch means it is still loading.
  // Only the latest request may update them (an older response can arrive last).
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState(null);
  const latestRequestRef = useRef(0);
  const requestKey = JSON.stringify([category, filters, debouncedSearch, currentPage, pageSize, reloadKey]);

  useEffect(() => {
    if (!canView) return;
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    fetchCabinetNotes({ page: currentPage, limit: pageSize, category, ...filters, search: debouncedSearch })
      .then((res) => {
        if (isStale()) return;
        const payload = res?.data || {};
        const data = Array.isArray(payload.data) ? payload.data : [];
        setResult({
          key: requestKey,
          rows: data.map(mapNoteListRow),
          pagination: {
            total: Number(payload.pagination?.total) || 0,
            page: Number(payload.pagination?.page) || currentPage,
            limit: Number(payload.pagination?.limit) || pageSize,
            totalPages: Number(payload.pagination?.totalPages) || 0,
          },
        });
      })
      .catch((err) => {
        if (isStale()) return;
        console.error('Error loading cabinet notes:', err);
        setResult({ key: requestKey, rows: [], pagination: { ...EMPTY_PAGINATION, limit: pageSize } });
        notify?.(COMMON_TOASTS.loadFailed('Cabinet notes'));
      });
  }, [requestKey, canView, category, filters, debouncedSearch, currentPage, pageSize, notify]);

  const loading = result?.key !== requestKey;
  const rows = result?.rows ?? [];
  const pagination = result?.pagination ?? { ...EMPTY_PAGINATION, limit: pageSize };

  // Active / Completed tab totals (unfiltered); refreshed after a delete
  const [counts, setCounts] = useState({ active: 0, completed: 0 });
  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    const total = (r) => (r.status === 'fulfilled' ? Number(r.value?.data?.pagination?.total) || 0 : 0);
    Promise.allSettled([
      fetchCabinetNotes({ page: 1, limit: 1, category: 'active', ...ALL_FILTERS }),
      fetchCabinetNotes({ page: 1, limit: 1, category: 'completed', ...ALL_FILTERS }),
    ]).then(([activeRes, completedRes]) => {
      if (!cancelled) setCounts({ active: total(activeRes), completed: total(completedRes) });
    });
    return () => { cancelled = true; };
  }, [canView, reloadKey]);

  // Open the full note (the list row only has summary fields) in the form
  const handleEdit = useCallback(async (row) => {
    try {
      const res = await fetchCabinetNoteById(row.id);
      const record = Array.isArray(res.data) ? res.data[0] : res.data;
      onEdit?.(mapNoteToForm(record));
    } catch (err) {
      console.error(err);
      notify?.(CABINET_NOTES_TOASTS.openFailed(getErrorMessage(err)));
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
      await deleteCabinetNote(deleteTarget.id, getCurrentUserId());
      notify?.(CABINET_NOTES_TOASTS.deleted());
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      notify?.(CABINET_NOTES_TOASTS.deleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  // A deleted row can leave the page empty; step back so the list doesn't look blank
  useEffect(() => {
    if (!loading && rows.length === 0 && currentPage > 1) actions.setCurrentPage(currentPage - 1);
  }, [loading, rows.length, currentPage, actions]);

  const handleDocs = async (row) => {
    setDocsTarget(row);
    setLoadingDocs(true);
    try {
      const res = await fetchNoteDocuments(row.id);
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setDocs([]);
      notify?.(COMMON_TOASTS.loadFailed('The documents'));
    } finally {
      setLoadingDocs(false);
    }
  };

  // The table edits filters and search as one object, as before
  const handleFiltersChange = (next) => {
    if (next.search !== searchTerm) actions.setSearchTerm(next.search);
    const changed = Object.fromEntries(['wingId', 'divisionId', 'status']
      .filter((k) => next[k] !== filters[k]).map((k) => [k, next[k]]));
    if (Object.keys(changed).length) actions.setFilters(changed);
  };

  if (!canView) {
    return (
      <RestrictedAccess moduleName="Cabinet Notes - MoPSW" onGoHome={onGoHome} />
    );
  }

  return (
    <>
      <NoteListTable
        rows={rows}
        loading={loading}
        wings={wings}
        divisions={divisions}
        statusOptions={statusOptions}
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
        onDocs={handleDocs}
        notify={notify}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-700 text-white">
              <h3 className="text-sm font-black uppercase tracking-wider">
                Delete Cabinet Note
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
                Are you sure you want to delete this cabinet note?
              </p>
              {deleteTarget.subject ? (
                <p className="text-sm font-semibold text-slate-900">{deleteTarget.subject}</p>
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

      {docsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-[#0f417a] text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Documents</h3>
                <p className="text-[10px] text-blue-200 font-semibold mt-0.5 truncate max-w-[320px]">
                  {docsTarget.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDocsTarget(null);
                  setDocs([]);
                }}
                className="text-blue-200 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
              {loadingDocs ? (
                <p className="text-xs font-semibold text-slate-500">Loading files…</p>
              ) : docs.length === 0 ? (
                <div className="text-center py-6 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  No files uploaded yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {docs.map((doc) => (
                    <li
                      key={doc.cabinet_notes_mopsw_document || doc.id}
                      className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-[#0f417a] shrink-0" />
                        <p
                          className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
                          title={doc.cabinet_notes_mopsw_document}
                        >
                          {doc.cabinet_notes_mopsw_document}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          downloadNoteDocument(
                            docsTarget.id,
                            doc.cabinet_notes_mopsw_document
                          ).catch(() => notify?.(CABINET_NOTES_TOASTS.downloadFailed()))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#0f417a] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer bg-transparent border border-blue-100 dark:border-blue-900 shrink-0"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
