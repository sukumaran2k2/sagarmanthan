import { create } from 'zustand';
import { fetchWings, fetchDivisions } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * Bills / Pre-Constitutions Act module store.
 * Holds state that should survive switching between the module's tabs:
 *  - reference data (wings and divisions), loaded once
 *  - Data List category (Active / Disposed), filters, search, pagination,
 *    filter panel and column visibility
 *  - Report view (wing / division / both)
 *
 * The bill being edited is NOT kept here; it travels with the route
 * (location.state.item). Fetched bills stay in the module shell.
 */
export const DEFAULT_VISIBLE_COLS = {
  subject: true,
  wing: true,
  division: true,
  stage: true,
};

const DEFAULT_FILTERS = { wing: '', division: '', stage: '' }; // '' = all

const initialState = {
  // Reference data
  wings: [],
  divisions: [],
  lookupsLoaded: false,

  // Data List
  category: 'active', // 'active' | 'disposed'
  filters: DEFAULT_FILTERS,
  searchTerm: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
  visibleCols: DEFAULT_VISIBLE_COLS,

  // Report
  reportView: 'wing', // 'wing' | 'division' | 'all'
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useBillsStore = create((set, get) => ({
  ...initialState,

  // The list filters in the browser, so search applies as the user types (no debounce)
  setSearchTerm: (searchTerm) => set({ searchTerm, currentPage: 1 }),
  setFilters: (changes) => set((state) => ({ filters: { ...state.filters, ...changes }, currentPage: 1 })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS, currentPage: 1 }),

  // Disposed bills have no stage to filter by
  setCategory: (category) => set((state) => ({
    category,
    filters: { ...state.filters, stage: '' },
    currentPage: 1,
  })),

  setShowFilterPanel: (updater) => set((state) => ({ showFilterPanel: resolve(updater, state.showFilterPanel) })),

  // Prev/Next buttons pass an updater function
  setCurrentPage: (updater) => set((state) => ({ currentPage: resolve(updater, state.currentPage) })),
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  setVisibleCols: (updater) => set((state) => ({ visibleCols: resolve(updater, state.visibleCols) })),

  setReportView: (reportView) => set({ reportView }),

  // Fetch wings and divisions once; a failed list is retried next time
  loadLookups: async () => {
    if (get().lookupsLoaded) return;
    set({ lookupsLoaded: true });
    const [wRes, dRes] = await Promise.allSettled([fetchWings(), fetchDivisions()]);
    const list = (r) => (r.status === 'fulfilled' && Array.isArray(r.value.data) ? r.value.data : []);
    const failed = [wRes, dRes].filter((r) => r.status === 'rejected');
    failed.forEach((r) => console.error('Failed to load Bills wings or divisions:', r.reason));
    set({ wings: list(wRes), divisions: list(dRes), lookupsLoaded: failed.length === 0 });
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useBillsStore.getState().reset());
