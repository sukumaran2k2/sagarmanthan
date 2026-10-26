import { create } from 'zustand';
import { fetchOrganisations, fetchClusters } from '../api';
import { FINANCIAL_YEARS } from '../utils/constants';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * CSR Projects module store.
 * Holds state that should survive switching between the module's tabs:
 *  - reference data (organisations and clusters), loaded once
 *  - Dashboard filters and the selected status card
 *  - CSR Fund Details filters, search, pagination, filter panel and columns
 *  - CSR Project List category (All / Active / Completed), filters, search,
 *    pagination, filter panel and columns
 *  - the selected report and its filters
 *
 * The project being edited is NOT kept here; it travels with the route
 * (location.state.item). Fetched rows stay in the pages.
 */
export const DEFAULT_PROJECT_COLS = {
  sno: true,
  org: true,
  financial_year: true,
  project_name: true,
  project_value: true,
  project_status: true,
  completed_on: true,
  remarks: true,
  actions: true,
};

export const DEFAULT_FUND_COLS = {
  sno: true,
  org: true,
  financial_year: true,
  net_profit: true,
  csr_fund_alloted_year: true,
  opening_balance_csr: true,
  project_expenditure: true,
  csr_fund_balance: true,
  actions: true,
};

const DEFAULT_DASHBOARD_FILTERS = { cluster: 0, organisation: 0, financialYear: 'all', focus: 0 }; // 0 / 'all' = all
const DEFAULT_PROJECT_FILTERS = { organisation: '', financialYear: '', focus: '', status: '' }; // '' = all
const DEFAULT_FUND_FILTERS = { organisation: '', financialYear: '' };

const initialState = {
  // Reference data
  organisations: [],
  clusters: [],
  lookupsLoaded: false,

  // Dashboard
  dashboardFilters: DEFAULT_DASHBOARD_FILTERS,
  drilldownStage: 'all',

  // CSR Fund Details
  fundFilters: DEFAULT_FUND_FILTERS,
  fundSearch: '',
  fundShowFilterPanel: false,
  fundPage: 1,
  fundPageSize: 10,
  fundVisibleCols: DEFAULT_FUND_COLS,

  // CSR Project List
  category: 'all', // 'all' | 'active' | 'completed'
  filters: DEFAULT_PROJECT_FILTERS,
  searchTerm: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
  visibleCols: DEFAULT_PROJECT_COLS,

  // Reports
  reportType: null, // null = the first report the user can see
  reportFY: 'all',
  reportOrg: '',
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useCsrStore = create((set, get) => ({
  ...initialState,

  // Dashboard: a new filter shows every status again
  setDashboardFilters: (changes) => set((state) => ({
    dashboardFilters: { ...state.dashboardFilters, ...changes },
    drilldownStage: 'all',
  })),
  resetDashboardFilters: () => set({ dashboardFilters: DEFAULT_DASHBOARD_FILTERS, drilldownStage: 'all' }),
  setDrilldownStage: (drilldownStage) => set({ drilldownStage }),

  // Fund Details (filters in the browser, so search applies as the user types)
  setFundSearch: (fundSearch) => set({ fundSearch, fundPage: 1 }),
  setFundFilters: (changes) => set((state) => ({ fundFilters: { ...state.fundFilters, ...changes }, fundPage: 1 })),
  resetFundFilters: () => set({ fundFilters: DEFAULT_FUND_FILTERS, fundSearch: '', fundPage: 1 }),
  setFundShowFilterPanel: (updater) => set((state) => ({ fundShowFilterPanel: resolve(updater, state.fundShowFilterPanel) })),
  setFundPage: (updater) => set((state) => ({ fundPage: resolve(updater, state.fundPage) })),
  setFundPageSize: (fundPageSize) => set({ fundPageSize, fundPage: 1 }),
  setFundVisibleCols: (updater) => set((state) => ({ fundVisibleCols: resolve(updater, state.fundVisibleCols) })),

  // Project List
  setSearchTerm: (searchTerm) => set({ searchTerm, currentPage: 1 }),
  setFilters: (changes) => set((state) => ({ filters: { ...state.filters, ...changes }, currentPage: 1 })),
  resetFilters: () => set({ filters: DEFAULT_PROJECT_FILTERS, searchTerm: '', currentPage: 1 }),

  // A status filter that doesn't fit the new category is cleared
  setCategory: (category) => set((state) => {
    const { status } = state.filters;
    const keepStatus = category === 'all'
      || (category === 'completed' ? status === 'Completed' : status !== 'Completed');
    return {
      category,
      filters: keepStatus ? state.filters : { ...state.filters, status: '' },
      currentPage: 1,
    };
  }),

  setShowFilterPanel: (updater) => set((state) => ({ showFilterPanel: resolve(updater, state.showFilterPanel) })),
  setCurrentPage: (updater) => set((state) => ({ currentPage: resolve(updater, state.currentPage) })),
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),
  setVisibleCols: (updater) => set((state) => ({ visibleCols: resolve(updater, state.visibleCols) })),

  // Reports: each report starts on its own default filters (the organisation-wise fund
  // report opens on the current financial year, as before)
  setReportType: (reportType) => set({
    reportType,
    reportFY: reportType === 'fund-org-wise-report' ? FINANCIAL_YEARS[0] : 'all',
    reportOrg: '',
  }),
  setReportFY: (reportFY) => set({ reportFY }),
  setReportOrg: (reportOrg) => set({ reportOrg }),
  resetReportFilters: () => set({ reportFY: 'all', reportOrg: '' }),

  // Fetch organisations and clusters once; a failed list is retried next time
  loadLookups: async () => {
    if (get().lookupsLoaded) return;
    set({ lookupsLoaded: true });
    const [oRes, cRes] = await Promise.allSettled([fetchOrganisations(), fetchClusters()]);
    const list = (r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : null);
    const organisations = list(oRes);
    const clusters = list(cRes);
    set({
      organisations: organisations || [],
      clusters: clusters || [],
      lookupsLoaded: !!organisations && !!clusters,
    });
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useCsrStore.getState().reset());
