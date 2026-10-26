import { create } from 'zustand';
import { fetchWings, fetchDivisions, fetchParliamentaryStages } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * Parliamentary Issues module store.
 * Holds state that should survive switching between the module's tabs:
 *  - reference data (wings, divisions, stages), loaded once
 *  - Data List category (Active / Completed), filters, search, pagination,
 *    filter panel and column visibility
 *  - Report issue-type tab and view (wing / division / both)
 *
 * The issue being edited is NOT kept here; it travels with the route
 * (location.state.item). Fetched issues stay in component state.
 */
const DEFAULT_FILTERS = { wingId: 'All', divisionId: 'All', issueType: 'All', status: 'All' };

export const DEFAULT_VISIBLE_COLS = {
  subject: true,
  wing: true,
  division: true,
  issueType: true,
  status: true,
  remarks: true,
  lastUpdated: true,
  actions: true,
};

const initialState = {
  // Reference data
  wings: [],
  divisions: [],
  stages: [],
  lookupsLoaded: false,

  // Data List ('All' = no filter)
  category: 'active', // 'active' | 'completed'
  filters: DEFAULT_FILTERS,
  searchTerm: '',
  debouncedSearch: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
  visibleCols: DEFAULT_VISIBLE_COLS,

  // Report
  reportView: 'wing', // 'wing' | 'division' | 'all'
  reportTabId: null, // issue type tab; null = the first one
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useParliamentaryStore = create((set, get) => ({
  ...initialState,

  setSearchTerm: (searchTerm) => set({ searchTerm }),
  // The debounce also fires on mount; skip it when nothing changed so the page is kept
  setDebouncedSearch: (debouncedSearch) => {
    if (get().debouncedSearch === debouncedSearch) return;
    set({ debouncedSearch, currentPage: 1 });
  },

  // Any filter change returns to page 1; a new wing clears the division
  setFilters: (changes) => set((state) => ({
    filters: {
      ...state.filters,
      ...changes,
      ...('wingId' in changes && !('divisionId' in changes) ? { divisionId: 'All' } : {}),
    },
    currentPage: 1,
  })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS, currentPage: 1 }),

  // Completed issues have no stage or type to filter by
  setCategory: (category) => set((state) => ({
    category,
    filters: { ...state.filters, status: 'All', issueType: category === 'completed' ? 'All' : state.filters.issueType },
    currentPage: 1,
  })),

  setShowFilterPanel: (updater) => set((state) => ({ showFilterPanel: resolve(updater, state.showFilterPanel) })),

  // Prev/Next buttons pass an updater function
  setCurrentPage: (updater) => set((state) => ({ currentPage: resolve(updater, state.currentPage) })),
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  setVisibleCols: (updater) => set((state) => ({ visibleCols: resolve(updater, state.visibleCols) })),

  setReportView: (reportView) => set({ reportView }),
  setReportTabId: (reportTabId) => set({ reportTabId }),

  // Fetch wings, divisions and stages once; a failed list is retried next time
  loadLookups: async () => {
    if (get().lookupsLoaded) return;
    set({ lookupsLoaded: true });
    const [wRes, dRes, sRes] = await Promise.allSettled([fetchWings(), fetchDivisions(), fetchParliamentaryStages()]);
    const list = (r) => (r.status === 'fulfilled' && Array.isArray(r.value.data) ? r.value.data : []);
    const failed = [wRes, dRes, sRes].filter((r) => r.status === 'rejected');
    failed.forEach((r) => console.error('Failed to load Parliamentary Issues wings, divisions or stages:', r.reason));
    set({ wings: list(wRes), divisions: list(dRes), stages: list(sRes), lookupsLoaded: failed.length === 0 });
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useParliamentaryStore.getState().reset());
