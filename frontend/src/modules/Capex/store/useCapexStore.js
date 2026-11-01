import { create } from 'zustand';
import { fetchCapexDataEntry } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * Capex module store.
 * Holds state that should survive leaving the module and coming back:
 *  - reference data (organisations), loaded once
 *  - Data List search, financial year / organisation filters, page, page size,
 *    filter panel and column visibility
 *  - Dashboard financial year / organisation type / organisation filters
 *  - the selected report tab
 *
 * Every setter takes a value or an updater function, like React's setState, so
 * the pages call them exactly as they called their useState setters. The page
 * resets (back to page 1 on a new search or filter) stay in the pages.
 * Fetched rows and the record being edited stay in component state.
 */
const DASHBOARD_ALL = 'all';

const initialState = {
  // Reference data
  organisations: [],
  organisationsLoaded: false,

  // Data List
  searchTerm: '',
  debouncedSearch: '',
  page: 1,
  pageSize: 10,
  filterYear: '2026-2027',
  filterOrg: '',
  showFilterPanel: false,
  visibleCols: {}, // filled in by the list view as columns appear; false = hidden

  // Dashboard (null year = not picked yet; the dashboard defaults it once its filters load)
  dashboardYear: null,
  dashboardGroupId: DASHBOARD_ALL,
  dashboardOrganisationId: DASHBOARD_ALL,

  // Reports
  activeReport: 'detailed',
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

// A setter for one field that behaves like a useState setter
const setter = (set, key) => (updater) => set((state) => ({ [key]: resolve(updater, state[key]) }));

export const useCapexStore = create((set, get) => ({
  ...initialState,

  setSearchTerm: setter(set, 'searchTerm'),
  setDebouncedSearch: setter(set, 'debouncedSearch'),
  setPage: setter(set, 'page'),
  setPageSize: setter(set, 'pageSize'),
  setFilterYear: setter(set, 'filterYear'),
  setFilterOrg: setter(set, 'filterOrg'),
  setShowFilterPanel: setter(set, 'showFilterPanel'),
  setVisibleCols: setter(set, 'visibleCols'),

  setDashboardYear: setter(set, 'dashboardYear'),
  setDashboardGroupId: setter(set, 'dashboardGroupId'),
  setDashboardOrganisationId: setter(set, 'dashboardOrganisationId'),

  setActiveReport: setter(set, 'activeReport'),

  // Fetch organisations once; a failed load is retried next time
  loadOrganisations: async () => {
    if (get().organisationsLoaded) return;
    set({ organisationsLoaded: true });
    try {
      const res = await fetchCapexDataEntry();
      if (res.data?.organisations) {
        set({ organisations: res.data.organisations });
      } else if (Array.isArray(res.data)) {
        set({ organisations: res.data });
      }
    } catch (err) {
      console.warn('Organisations fetch fallback:', err.message);
      set({ organisations: [], organisationsLoaded: false });
    }
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useCapexStore.getState().reset());
