import { create } from 'zustand';
import { fetchTrafficMasters } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { currentFinancialYear } from '../pages/Traffic/trafficConstants';
import { createListActions, listState } from './listSlice';

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

export const useTrafficStore = create((set, get) => ({
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
