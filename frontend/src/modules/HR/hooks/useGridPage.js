import { useCallback, useEffect, useRef } from 'react';
import { useLatestRef } from './usePagedList';

/**
 * Keeps an ag-grid's own (client-side) page in step with the HR store, so the list reopens on
 * the same page after switching HR pages, and goes back to page 1 when a filter changes
 * (the store resets currentPage; ag-grid alone would stay on its old page). Spread onto <Table>:
 *   const gridPage = useGridPage(currentPage, actions.setCurrentPage);
 *   <Table pagination ... {...gridPage} />
 *
 * The store is the source of truth: its page is applied to the grid once rows are rendered and
 * whenever it changes; the grid's own Prev / Next / page clicks are written back to the store.
 * Page events are ignored until the stored page has been applied (the grid reports page 1
 * while it is still empty).
 */
export function useGridPage(currentPage, setCurrentPage) {
  const apiRef = useRef(null);
  const syncedRef = useRef(false);
  const pageRef = useLatestRef(currentPage);

  const applyStoredPage = useCallback((api) => {
    const total = api.paginationGetTotalPages();
    const target = Math.min(Math.max(0, (pageRef.current || 1) - 1), Math.max(0, total - 1));
    if (api.paginationGetCurrentPage() !== target) api.paginationGoToPage(target);
  }, [pageRef]);

  const onFirstDataRendered = useCallback((params) => {
    apiRef.current = params.api;
    // Applied after the grid has built its pages for the first rows
    setTimeout(() => {
      if (!params.api.isDestroyed?.()) applyStoredPage(params.api);
      syncedRef.current = true;
    }, 0);
  }, [applyStoredPage]);

  // A filter change resets the store to page 1 (and a restored page arrives here too)
  useEffect(() => {
    const api = apiRef.current;
    if (api && syncedRef.current && !api.isDestroyed?.()) applyStoredPage(api);
  }, [currentPage, applyStoredPage]);

  const onPaginationChanged = useCallback((params) => {
    if (!syncedRef.current || !params?.api) return;
    // Only page moves by the user are written back; a data change (new filter results) is not,
    // since the store has already chosen the page for it
    if (params.newData || params.newPage === false) return;
    const page = params.api.paginationGetCurrentPage() + 1;
    if (page !== pageRef.current) setCurrentPage(page);
  }, [pageRef, setCurrentPage]);

  return { onFirstDataRendered, onPaginationChanged };
}
