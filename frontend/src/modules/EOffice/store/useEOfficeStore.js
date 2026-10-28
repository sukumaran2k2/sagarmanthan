import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * E-Office module store.
 * Holds state that should survive switching between the module's tabs, kept
 * per category (file-pendency / receipt-pendency / file-disposal):
 *  - DataList filters (wing / month / year / week) and search
 *  - the report period (month / year / week); absent until the latest uploaded
 *    period has been looked up
 * plus the shared filter-panel toggle and page size.
 *
 * Fetched rows stay in the pages.
 */
export const DEFAULT_FILTERS = { wing: 'All', month: 'All', year: 'All', week: 'All' };

const initialState = {
  filters: {}, // { [category]: { wing, month, year, week } }
  searchTerms: {}, // { [category]: text }
  reportPeriods: {}, // { [category]: { month, year, week } }
  showFilterPanel: false,
  pageSize: 10,
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useEOfficeStore = create((set) => ({
  ...initialState,

  setFilters: (category, changes) => set((state) => ({
    filters: { ...state.filters, [category]: { ...DEFAULT_FILTERS, ...state.filters[category], ...changes } },
  })),
  resetFilters: (category) => set((state) => ({
    filters: { ...state.filters, [category]: DEFAULT_FILTERS },
    searchTerms: { ...state.searchTerms, [category]: '' },
  })),
  setSearchTerm: (category, term) => set((state) => ({ searchTerms: { ...state.searchTerms, [category]: term } })),
  setShowFilterPanel: (updater) => set((state) => ({ showFilterPanel: resolve(updater, state.showFilterPanel) })),
  setPageSize: (pageSize) => set({ pageSize }),

  setReportPeriod: (category, changes) => set((state) => ({
    reportPeriods: { ...state.reportPeriods, [category]: { ...state.reportPeriods[category], ...changes } },
  })),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Readers that fall back to the defaults for a category not touched yet
export const selectFilters = (category) => (state) => state.filters[category] || DEFAULT_FILTERS;
export const selectSearchTerm = (category) => (state) => state.searchTerms[category] || '';
export const selectReportPeriod = (category) => (state) => state.reportPeriods[category] || null;

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useEOfficeStore.getState().reset());
