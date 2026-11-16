import { create } from 'zustand';
import { fetchWings, fetchDivisions } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

// The two report modes each open on their own wing-wise summary
export const REPORT_SUMMARIES = {
  abstract: {
    type: 'summary',
    source: 'abstractWings',
    title: 'Report No.: 5.1A - Abstract ( Wing Wise ) - VIP References',
  },
  pendency: {
    type: 'summary',
    source: 'pendencyWings',
    title: 'Report No.: 5.1A - Pendency ( Wing Wise ) - VIP References',
  },
};

// A factory, not a shared literal: reset() must hand back fresh nested objects, or every
// session after the first would share one visibleCols / report object.
const createInitialState = () => ({
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

  // Which report is open, how it is filtered and how far the user has drilled in, so
  // leaving the Reports tab and coming back reopens the same view rather than resetting
  // to the wing-wise summary. The rows themselves stay in the page and are refetched.
  report: {
    type: 'abstract', // 'abstract' | 'pendency'
    wingFilter: '',
    filterOpen: false,
    abstractPath: [REPORT_SUMMARIES.abstract],
    pendencyPath: [REPORT_SUMMARIES.pendency],
  },
});

const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useVipStore = create((set, get) => ({
  ...createInitialState(),

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

  // A new report mode starts from its own summary with no wing filter
  setReportType: (type) => set((state) => ({
    report: { ...state.report, type, wingFilter: '' },
  })),

  setReportWingFilter: (wingFilter) => set((state) => ({
    report: { ...state.report, wingFilter },
  })),

  setReportFilterOpen: (updater) => set((state) => ({
    report: { ...state.report, filterOpen: resolve(updater, state.report.filterOpen) },
  })),

  // Drills into whichever report mode is open; each keeps its own trail
  setReportPath: (updater) => set((state) => {
    const key = state.report.type === 'pendency' ? 'pendencyPath' : 'abstractPath';
    return { report: { ...state.report, [key]: resolve(updater, state.report[key]) } };
  }),

  reset: () => set(createInitialState()),

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
