import { create } from 'zustand';
import { fetchWings, fetchDivisions } from '../api';

/**
 * Young Professionals Module Zustand Store
 * Centralizes state management across InputForm, DataList, and Reports:
 *  - Active tab / routing view
 *  - Form edit data (preserves edit state across views)
 *  - Cached reference metadata (Wings and Divisions)
 *  - DataList filters, search term, pagination, and column visibility
 */
export const useYpStore = create((set, get) => ({
  // Navigation / View State
  activeTab: 'list-view', // 'list-view' | 'input-form' | 'report'
  editData: null,

  // Reference Metadata
  wings: [],
  divisions: [],
  loadingMetadata: false,

  // DataList Filter & Pagination States
  activeStatusTab: 'active', // 'active' | 'relieved'
  searchTerm: '',
  debouncedSearch: '',
  selectedWing: '',
  selectedDivision: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
  visibleCols: {
    name: true,
    role: true,
    wing: true,
    division: true,
  },

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  setEditData: (item) => set({ editData: item }),

  clearEditData: () => set({ editData: null }),

  setActiveStatusTab: (status) => set({ activeStatusTab: status, currentPage: 1 }),

  setSearchTerm: (searchTerm) => set({ searchTerm }),

  setDebouncedSearch: (debouncedSearch) => set({ debouncedSearch, currentPage: 1 }),

  setSelectedWing: (selectedWing) => set({ 
    selectedWing, 
    selectedDivision: '', 
    currentPage: 1 
  }),

  setSelectedDivision: (selectedDivision) => set({ 
    selectedDivision, 
    currentPage: 1 
  }),

  setShowFilterPanel: (updater) => set((state) => ({
    showFilterPanel: typeof updater === 'function' ? updater(state.showFilterPanel) : updater
  })),

  setCurrentPage: (currentPage) => set({ currentPage }),

  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  setVisibleCols: (updater) => set((state) => ({
    visibleCols: typeof updater === 'function' ? updater(state.visibleCols) : updater
  })),

  toggleCol: (colKey) => set((state) => ({
    visibleCols: {
      ...state.visibleCols,
      [colKey]: !state.visibleCols[colKey]
    }
  })),

  resetFilters: () => set({
    selectedWing: '',
    selectedDivision: '',
    searchTerm: '',
    debouncedSearch: '',
    currentPage: 1
  }),

  // Asynchronous action to fetch wings and divisions once and cache them
  loadWingsAndDivisions: async () => {
    const { wings, divisions, loadingMetadata } = get();
    if ((wings.length > 0 && divisions.length > 0) || loadingMetadata) return;

    set({ loadingMetadata: true });
    try {
      const [wRes, dRes] = await Promise.all([
        fetchWings().catch(() => ({ data: [] })),
        fetchDivisions().catch(() => ({ data: [] }))
      ]);
      set({
        wings: wRes.data || [],
        divisions: dRes.data || [],
        loadingMetadata: false
      });
    } catch (err) {
      console.error("Failed to load YP wings & divisions in store:", err);
      set({ loadingMetadata: false });
    }
  }
}));
