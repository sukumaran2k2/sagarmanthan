import { create } from 'zustand';
import { fetchWings, fetchDivisions } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * Audit Paras module store.
 * Holds state that should survive switching between the module's tabs:
 *  - reference data (wings and divisions), loaded once
 *  - Data List filters, search, pagination, filter panel and column visibility
 *  - Report view, category and search
 *
 * The record being edited is NOT kept here; it travels with the route
 * (location.state.item). Fetched audit paras stay in component state.
 */
const initialState = {
  // Reference data
  wings: [],
  divisions: [],
  loadingMetadata: false,
  metadataError: null,

  // Data List ('' = all)
  searchTerm: '',
  selectedWing: '',
  selectedDivision: '',
  selectedCategory: '',
  selectedStatus: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
  visibleCols: {
    paraNumber: true,
    subject: true,
    wing: true,
    division: true,
    category: true,
    statusSteps: true,
    remarks: true,
    lastUpdated: true,
  },

  // Report
  reportView: 'wing', // 'wing' | 'division' | 'all'
  reportCategory: 'all',
  reportSearch: '',
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useAuditParaStore = create((set, get) => ({
  ...initialState,

  // The list filters in the browser, so search applies as the user types (no debounce)
  setSearchTerm: (searchTerm) => set({ searchTerm, currentPage: 1 }),
  setSelectedWing: (selectedWing) => set({ selectedWing, currentPage: 1 }),
  setSelectedDivision: (selectedDivision) => set({ selectedDivision, currentPage: 1 }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory, currentPage: 1 }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus, currentPage: 1 }),

  setShowFilterPanel: (updater) => set((state) => ({ showFilterPanel: resolve(updater, state.showFilterPanel) })),

  // Prev/Next buttons pass an updater function
  setCurrentPage: (updater) => set((state) => ({ currentPage: resolve(updater, state.currentPage) })),
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  setVisibleCols: (updater) => set((state) => ({ visibleCols: resolve(updater, state.visibleCols) })),

  resetFilters: () => set({
    selectedWing: '',
    selectedDivision: '',
    selectedCategory: '',
    selectedStatus: '',
    currentPage: 1,
  }),

  setReportView: (reportView) => set({ reportView }),
  setReportCategory: (reportCategory) => set({ reportCategory }),
  setReportSearch: (reportSearch) => set({ reportSearch }),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),

  // Fetch wings and divisions once and cache them
  loadWingsAndDivisions: async () => {
    const { wings, divisions, loadingMetadata } = get();
    if ((wings.length > 0 && divisions.length > 0) || loadingMetadata) return;

    set({ loadingMetadata: true, metadataError: null });
    const [wRes, dRes] = await Promise.allSettled([fetchWings(), fetchDivisions()]);
    const failed = [wRes, dRes].filter((r) => r.status === 'rejected');
    failed.forEach((r) => console.error('Failed to load Audit Para wings & divisions:', r.reason));

    set({
      wings: wRes.status === 'fulfilled' ? (wRes.value.data || []) : [],
      divisions: dRes.status === 'fulfilled' ? (dRes.value.data || []) : [],
      loadingMetadata: false,
      metadataError: failed.length > 0 ? 'Failed to load wings and divisions.' : null,
    });
  },
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useAuditParaStore.getState().reset());
