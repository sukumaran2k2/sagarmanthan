import { create } from 'zustand';
import { fetchWings, fetchDivisions } from '../api';

/**
 * Consultant Appointment Module Zustand Store
 * Centralizes state management across InputForm, DataList, and Reports:
 *  - Active tab / routing view
 *  - Form edit data (preserves edit state across views)
 *  - Cached reference metadata (Wings and Divisions)
 *  - DataList filters, search term, stage filter, pagination, drilldown appointment
 */
export const useCaStore = create((set, get) => ({
  // Navigation / View State
  activeTab: 'data-list', // 'data-list' | 'input-form' | 'reports'
  editData: null,

  // Reference Metadata
  wings: [],
  divisions: [],
  loadingMetadata: false,

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
  drilldownAppointment: null,

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

  setSelectedStage: (selectedStage) => set({ 
    selectedStage, 
    currentPage: 1 
  }),

  setShowFilterPanel: (updater) => set((state) => ({
    showFilterPanel: typeof updater === 'function' ? updater(state.showFilterPanel) : updater
  })),

  setCurrentPage: (currentPage) => set({ currentPage }),

  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  setDrilldownAppointment: (apt) => set({ drilldownAppointment: apt }),

  resetFilters: () => set({
    selectedWing: '',
    selectedDivision: '',
    selectedStage: '',
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
      console.error("Failed to load CA wings & divisions in store:", err);
      set({ loadingMetadata: false });
    }
  }
}));
