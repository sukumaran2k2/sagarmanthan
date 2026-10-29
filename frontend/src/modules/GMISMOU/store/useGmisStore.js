import { create } from 'zustand';
import { fetchOrganisations, fetchMouCategoryNames, fetchGmisNavicVibhas } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * GMIS & IMW MoU module store.
 * Holds state that should survive switching between the module's tabs:
 *  - reference data (organisations, MoU categories, VIBHAS / NAVIC cells), loaded once
 *  - Data List summit, status tab, filters, search, pagination, filter panel and columns
 *  - the selected report and its organisation filter
 *
 * The MoU being edited is NOT kept here; it travels with the route
 * (location.state.item). Fetched rows stay in the pages.
 */
export const DEFAULT_VISIBLE_COLS = {
  sNo: true,
  org: true,
  event: true,
  name: true,
  party2: true,
  nature: true,
  navic: true,
  category: true,
  amount: true,
  revisedAmount: true,
  status: true,
  physicalProgress: true,
  physicalDate: false,
  financialProgress: true,
  financialDate: false,
  mouBrief: false,
  remarks: false,
  nextSteps: false,
  reasonForDropping: false,
  document: true,
};

// '' = all. The summit is chosen with the tabs above the list, the rest in the filter panel.
const DEFAULT_FILTERS = { organisation: '', category: '', navic: '', nature: '' };

const initialState = {
  // Reference data
  organisations: [],
  categories: [],
  navicCells: [],
  lookupsLoaded: false,

  // Data List
  summit: '', // '' = all summits
  statusTab: 'all', // 'all' | 'yet_to_start' | 'under_implementation' | 'completed' | 'dropped'
  filters: DEFAULT_FILTERS,
  searchTerm: '',
  debouncedSearch: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
  visibleCols: DEFAULT_VISIBLE_COLS,

  // Report
  selectedReport: 'report-1',
  reportOrganisation: '', // Report 1.5 only; '' = all
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useGmisStore = create((set, get) => ({
  ...initialState,

  setSummit: (summit) => set({ summit, currentPage: 1 }),
  setStatusTab: (statusTab) => set({ statusTab, currentPage: 1 }),
  setFilters: (changes) => set((state) => ({ filters: { ...state.filters, ...changes }, currentPage: 1 })),
  // Clears the panel filters and the summit tab
  resetFilters: () => set({ filters: DEFAULT_FILTERS, summit: '', currentPage: 1 }),

  setSearchTerm: (searchTerm) => set({ searchTerm }),
  // The debounce also fires on mount; skip it when nothing changed so the page is kept
  setDebouncedSearch: (debouncedSearch) => {
    if (get().debouncedSearch === debouncedSearch) return;
    set({ debouncedSearch, currentPage: 1 });
  },

  setShowFilterPanel: (updater) => set((state) => ({ showFilterPanel: resolve(updater, state.showFilterPanel) })),

  // Prev/Next buttons pass an updater function
  setCurrentPage: (updater) => set((state) => ({ currentPage: resolve(updater, state.currentPage) })),
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  setVisibleCols: (updater) => set((state) => ({ visibleCols: resolve(updater, state.visibleCols) })),

  // The organisation filter belongs to Report 1.5, so another report clears it
  setSelectedReport: (selectedReport) => set({ selectedReport, reportOrganisation: '' }),
  setReportOrganisation: (reportOrganisation) => set({ reportOrganisation }),

  // Fetch the reference lists once; a failed list is retried next time
  loadLookups: async () => {
    if (get().lookupsLoaded) return;
    set({ lookupsLoaded: true });
    const results = await Promise.allSettled([fetchOrganisations(), fetchMouCategoryNames(), fetchGmisNavicVibhas()]);
    const list = (r) => (r.status === 'fulfilled' && Array.isArray(r.value.data) ? r.value.data : []);
    const failed = results.filter((r) => r.status === 'rejected');
    failed.forEach((r) => console.error('Failed to load GMIS reference lists:', r.reason));
    const [organisations, categories, navicCells] = results.map(list);
    set({ organisations, categories, navicCells, lookupsLoaded: failed.length === 0 });
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useGmisStore.getState().reset());
