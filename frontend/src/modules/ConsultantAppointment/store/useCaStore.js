import { create } from 'zustand';
import { fetchWings, fetchDivisions } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * Consultant Appointment Module Zustand Store
 * Holds state that should survive switching between the module's tabs:
 *  - Cached reference metadata (Wings and Divisions)
 *  - DataList filters, search term, stage filter, and pagination
 *
 * The record being edited travels with the route (location.state.item) and the
 * candidate drilldown is local DataList state, so neither can resurface stale.
 */
const initialState = {
  // Reference Metadata
  wings: [],
  divisions: [],
  loadingMetadata: false,
  metadataError: null,

  // DataList Filter & Pagination States
  activeStatusTab: 'pending', // 'pending' | 'completed'
  searchTerm: '',
  debouncedSearch: '',
  selectedWing: '',
  selectedDivision: '',
  selectedStage: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useCaStore = create((set, get) => ({
  ...initialState,

  // Actions
  setActiveStatusTab: (status) => set({ activeStatusTab: status, currentPage: 1 }),

  setSearchTerm: (searchTerm) => set({ searchTerm }),

  // Only reset pagination when the search actually changed (the debounce also fires on mount)
  setDebouncedSearch: (debouncedSearch) => {
    if (get().debouncedSearch === debouncedSearch) return;
    set({ debouncedSearch, currentPage: 1 });
  },

  setSelectedWing: (selectedWing) => set({
    selectedWing,
    selectedDivision: '',
    currentPage: 1
  }),

  setSelectedDivision: (selectedDivision) => set({
    selectedDivision,
    currentPage: 1
  }),

  setSelectedStage: (selectedStage) => set({
    selectedStage,
    currentPage: 1
  }),

  setShowFilterPanel: (updater) => set((state) => ({
    showFilterPanel: resolve(updater, state.showFilterPanel)
  })),

  setCurrentPage: (updater) => set((state) => ({
    currentPage: resolve(updater, state.currentPage)
  })),

  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  resetFilters: () => set({
    selectedWing: '',
    selectedDivision: '',
    selectedStage: '',
    currentPage: 1
  }),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),

  // Asynchronous action to fetch wings and divisions once and cache them
  loadWingsAndDivisions: async () => {
    const { wings, divisions, loadingMetadata } = get();
    if ((wings.length > 0 && divisions.length > 0) || loadingMetadata) return;

    set({ loadingMetadata: true, metadataError: null });
    const [wRes, dRes] = await Promise.allSettled([fetchWings(), fetchDivisions()]);
    const failed = [wRes, dRes].filter(r => r.status === 'rejected');
    failed.forEach(r => console.error("Failed to load CA wings & divisions:", r.reason));

    set({
      wings: wRes.status === 'fulfilled' ? (wRes.value.data || []) : [],
      divisions: dRes.status === 'fulfilled' ? (dRes.value.data || []) : [],
      loadingMetadata: false,
      metadataError: failed.length > 0 ? 'Failed to load wings and divisions.' : null
    });
  }
}));

registerStoreReset(() => useCaStore.getState().reset());
