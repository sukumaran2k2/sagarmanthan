import { create } from 'zustand';
import { fetchTrafficMasters } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { currentFinancialYear } from '../pages/Traffic/trafficConstants';

/**
 * KPI Major Ports — Traffic store.
 * Keeps what must survive switching between the Traffic tabs:
 *  - reference data (commodity groups, commodities, organisations), loaded once
 *  - filters, search, pagination and column visibility of each list
 *    (actuals = Actuals, targets = Targets, access = Entry Access)
 *
 * The period being edited is NOT kept here; it travels with the route
 * (location.state.item). Fetched rows stay in each page's local state.
 */

// Actuals open on the current financial year; "All Years" is one click away
const actualsFilterDefaults = () => ({
  fiscalYear: currentFinancialYear(),
  month: '',
  organisationId: '',
  commodityGroupId: '',
  commodityId: '',
});

const targetsFilterDefaults = () => ({ fiscalYear: '', organisationId: '' });

const accessFilterDefaults = () => ({ fiscalYear: '', organisationId: '' });

const listState = (filters) => ({
  ...filters,
  searchTerm: '',
  debouncedSearch: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
});

const createInitialState = () => ({
  commodityGroups: [],
  commodities: [],
  organisations: [],
  loadingMasters: false,
  mastersError: null,

  actuals: { ...listState(actualsFilterDefaults()), activeView: 'period', visibleCols: {} },
  // Last Updated is hidden until switched on, as in the earlier portal
  targets: { ...listState(targetsFilterDefaults()), visibleCols: { last_updated: false } },
  access: { ...listState(accessFilterDefaults()), status: 'ACTIVE' },
});

// Accept a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

/** Same actions for every list; each one only touches its own slice. */
function createListActions(key, filterDefaults, set, get) {
  const patch = (changes) => set((state) => ({ [key]: { ...state[key], ...changes } }));

  return {
    setSearchTerm: (searchTerm) => patch({ searchTerm }),

    // The debounce also fires on mount; skip it when nothing changed so the page is kept
    setDebouncedSearch: (debouncedSearch) => {
      if (get()[key].debouncedSearch === debouncedSearch) return;
      patch({ debouncedSearch, currentPage: 1 });
    },

    // Any filter change returns to page 1
    setFilters: (changes) => patch({ ...changes, currentPage: 1 }),

    setShowFilterPanel: (updater) =>
      set((state) => ({
        [key]: { ...state[key], showFilterPanel: resolve(updater, state[key].showFilterPanel) },
      })),

    setCurrentPage: (updater) =>
      set((state) => ({
        [key]: { ...state[key], currentPage: resolve(updater, state[key].currentPage) },
      })),

    setPageSize: (pageSize) => patch({ pageSize, currentPage: 1 }),

    resetFilters: () => patch({ ...filterDefaults(), currentPage: 1 }),
  };
}

export const useTrafficStore = create((set, get) => ({
  ...createInitialState(),

  actualsActions: {
    ...createListActions('actuals', actualsFilterDefaults, set, get),
    setActiveView: (activeView) =>
      set((state) => ({ actuals: { ...state.actuals, activeView, currentPage: 1 } })),
    setVisibleCols: (updater) =>
      set((state) => ({
        actuals: { ...state.actuals, visibleCols: resolve(updater, state.actuals.visibleCols) },
      })),
  },

  targetsActions: {
    ...createListActions('targets', targetsFilterDefaults, set, get),
    setVisibleCols: (updater) =>
      set((state) => ({
        targets: { ...state.targets, visibleCols: resolve(updater, state.targets.visibleCols) },
      })),
  },

  accessActions: {
    ...createListActions('access', accessFilterDefaults, set, get),
    setStatus: (status) => set((state) => ({ access: { ...state.access, status, currentPage: 1 } })),
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),

  loadMasters: async () => {
    const { commodities, loadingMasters } = get();
    if (commodities.length > 0 || loadingMasters) return;

    set({ loadingMasters: true, mastersError: null });
    try {
      const { data } = await fetchTrafficMasters();
      set({
        commodityGroups: data?.commodityGroups || [],
        commodities: data?.commodities || [],
        organisations: data?.organisations || [],
        loadingMasters: false,
      });
    } catch (err) {
      console.error('Failed to load traffic reference data:', err);
      set({ loadingMasters: false, mastersError: 'Traffic reference data' });
    }
  },
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useTrafficStore.getState().reset());
