import { create } from 'zustand';
import { fetchWings, fetchDivisions } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

const initialState = {
  wings: [],
  divisions: [],
  loadingMetadata: false,
  metadataError: null,

  activeCategory: 'active',
  searchTerm: '',
  debouncedSearch: '',
  selectedWing: 'All',
  selectedDivision: 'All',
  selectedStage: 'All',
  showFilterPanel: false,
  pageSize: 10,
  viewMode: 'table',
  visibleCols: {
    subject: true,
    wing: true,
    division: true,
    stage: true,
    refNumber: true,
    receivedFrom: true,
    remarks: false,
    deadline: false,
    lastUpdated: true,
  },
};

const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useVipStore = create((set, get) => ({
  ...initialState,

  setActiveCategory: (activeCategory) => set({ activeCategory, selectedStage: 'All' }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),

  setDebouncedSearch: (debouncedSearch) => {
    if (get().debouncedSearch === debouncedSearch) return;
    set({ debouncedSearch });
  },

  setSelectedWing: (selectedWing) => set({
    selectedWing,
    selectedDivision: 'All',
  }),

  setSelectedDivision: (selectedDivision) => set({ selectedDivision }),
  setSelectedStage: (selectedStage) => set({ selectedStage }),

  setShowFilterPanel: (updater) => set((state) => ({
    showFilterPanel: resolve(updater, state.showFilterPanel),
  })),

  setPageSize: (pageSize) => set({ pageSize }),
  setViewMode: (viewMode) => set({ viewMode }),

  setVisibleCols: (updater) => set((state) => ({
    visibleCols: resolve(updater, state.visibleCols),
  })),

  resetFilters: () => set({
    selectedWing: 'All',
    selectedDivision: 'All',
    selectedStage: 'All',
  }),

  reset: () => set(initialState),

  loadWingsAndDivisions: async () => {
    const { wings, divisions, loadingMetadata } = get();
    if ((wings.length > 0 && divisions.length > 0) || loadingMetadata) return;

    set({ loadingMetadata: true, metadataError: null });
    const [wRes, dRes] = await Promise.allSettled([fetchWings(), fetchDivisions()]);
    const failed = [wRes, dRes].filter(r => r.status === 'rejected');
    failed.forEach(r => console.error('Failed to load VIP wings & divisions:', r.reason));

    set({
      wings: wRes.status === 'fulfilled' ? (wRes.value.data || []) : wings,
      divisions: dRes.status === 'fulfilled' ? (dRes.value.data || []) : divisions,
      loadingMetadata: false,
      metadataError: failed.length > 0 ? 'Failed to load wings and divisions.' : null,
    });
  },
}));

registerStoreReset(() => useVipStore.getState().reset());
