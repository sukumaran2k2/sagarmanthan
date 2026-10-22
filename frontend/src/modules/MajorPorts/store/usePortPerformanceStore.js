import { create } from 'zustand';
import { fetchPortPerformanceMasters } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { currentFinancialYear } from '../pages/Traffic/trafficConstants';
import { DATA_LIST_VIEWS } from '../pages/PortPerformance/portPerformanceConfig';
import { createListActions, listState } from './listSlice';

/**
 * KPI Major Ports — Port Performance store.
 * Keeps what must survive switching between the Port Performance tabs:
 *  - reference data (organisations, target KPI types), loaded once
 *  - filters, search, pagination and column visibility of each list
 *    (actuals = Actuals, targets = Targets, access = Entry Access)
 *
 * The period or target being edited is NOT kept here; it travels with the route
 * (location.state). Fetched rows stay in each page's local state.
 */

// Actuals open on the current financial year; "All Years" is one click away
const actualsFilterDefaults = () => ({ fiscalYear: currentFinancialYear(), month: '', organisationId: '' });

const targetsFilterDefaults = () => ({ fiscalYear: '', organisationId: '' });

const accessFilterDefaults = () => ({ fiscalYear: '', organisationId: '' });

const createInitialState = () => ({
  organisations: [],
  kpiTypes: [],
  loadingMasters: false,
  mastersLoaded: false,
  mastersError: null,

  actuals: { ...listState(actualsFilterDefaults()), activeView: DATA_LIST_VIEWS[0].id, visibleCols: {} },
  // Last Updated is hidden until switched on, as in the Traffic targets list
  targets: { ...listState(targetsFilterDefaults()), visibleCols: { last_updated: false } },
  access: { ...listState(accessFilterDefaults()), status: 'ACTIVE' },
});

export const usePortPerformanceStore = create((set, get) => ({
  ...createInitialState(),

  actualsActions: {
    ...createListActions('actuals', actualsFilterDefaults, set, get),
    setActiveView: (activeView) =>
      set((state) => ({ actuals: { ...state.actuals, activeView, currentPage: 1 } })),
  },

  targetsActions: createListActions('targets', targetsFilterDefaults, set, get),

  accessActions: {
    ...createListActions('access', accessFilterDefaults, set, get),
    setStatus: (status) => set((state) => ({ access: { ...state.access, status, currentPage: 1 } })),
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),

  loadMasters: async () => {
    const { mastersLoaded, loadingMasters } = get();
    if (mastersLoaded || loadingMasters) return;

    set({ loadingMasters: true, mastersError: null });
    try {
      const { data } = await fetchPortPerformanceMasters();
      set({
        organisations: data?.organisations || [],
        kpiTypes: data?.kpiTypes || [],
        loadingMasters: false,
        mastersLoaded: true,
      });
    } catch (err) {
      console.error('Failed to load port performance reference data:', err);
      set({ loadingMasters: false, mastersError: 'Port performance reference data' });
    }
  },
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => usePortPerformanceStore.getState().reset());
