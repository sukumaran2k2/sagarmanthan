import { create } from 'zustand';
import { fetchOrganisationsDropdown } from '../api';
import { getCurrentFinancialYear } from '../utils/gemUtils';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * GEM Procurement module store.
 * Holds state that should survive leaving the module and coming back:
 *  - reference data (organisations), loaded once
 *  - Data List search, financial year / organisation filters, page, page size,
 *    filter panel and column visibility (shared by the Total / Goods /
 *    Services / Works tabs, as before)
 *  - the selected report tab
 *
 * Every setter takes a value or an updater function, like React's setState, so
 * the pages call them exactly as they called their useState setters. The page
 * resets (back to page 1 on a new search, filter or tab) stay in the pages.
 * Fetched rows and the record being edited stay in component state.
 */
const initialState = {
  // Reference data
  organisations: [],
  organisationsLoaded: false,

  // Data List
  searchTerm: '',
  debouncedSearch: '',
  page: 1,
  pageSize: 10,
  filterYear: getCurrentFinancialYear(),
  filterOrg: '',
  showFilterPanel: false,
  visibleCols: {}, // filled in by the list view as columns appear; false = hidden

  // Reports
  activeReport: 'detailed',
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

// A setter for one field that behaves like a useState setter
const setter = (set, key) => (updater) => set((state) => ({ [key]: resolve(updater, state[key]) }));

export const useGemStore = create((set, get) => ({
  ...initialState,

  setSearchTerm: setter(set, 'searchTerm'),
  setDebouncedSearch: setter(set, 'debouncedSearch'),
  setPage: setter(set, 'page'),
  setPageSize: setter(set, 'pageSize'),
  setFilterYear: setter(set, 'filterYear'),
  setFilterOrg: setter(set, 'filterOrg'),
  setShowFilterPanel: setter(set, 'showFilterPanel'),
  setVisibleCols: setter(set, 'visibleCols'),

  setActiveReport: setter(set, 'activeReport'),

  // Fetch organisations once; a failed load is retried next time.
  // Resolves to false when the load failed, so the page can show its error toast.
  loadOrganisations: async () => {
    if (get().organisationsLoaded) return true;
    set({ organisationsLoaded: true });
    try {
      const res = await fetchOrganisationsDropdown();
      const list = Array.isArray(res.data) ? res.data : res.data?.organisations || [];
      set({ organisations: list });
      return true;
    } catch (err) {
      console.error('Failed to load organisations for GEM:', err);
      set({ organisations: [], organisationsLoaded: false });
      return false;
    }
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useGemStore.getState().reset());
