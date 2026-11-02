import { create } from 'zustand';
import { fetchRenewableEnergyMasters } from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { currentFinancialYear } from '../pages/Traffic/trafficConstants';
import { createListActions, listState } from './listSlice';

/**
 * KPI Major Ports — Renewable Energy store.
 * Keeps what must survive switching between the section's tabs:
 *  - reference data (organisations), loaded once
 *  - filters, search, pagination and column visibility of each list
 *    (actuals = Actuals, targets = Targets)
 *
 * The record being edited is NOT kept here; it travels with the route
 * (location.state). Fetched rows stay in each page's local state.
 */

// Actuals open on the current financial year; "All Years" is one click away
const actualsFilterDefaults = () => ({ fiscalYear: currentFinancialYear(), month: '', organisationId: '' });

const targetsFilterDefaults = () => ({ fiscalYear: '', organisationId: '' });

const createInitialState = () => ({
  organisations: [],
  loadingMasters: false,
  mastersLoaded: false,
  mastersError: null,

  actuals: { ...listState(actualsFilterDefaults()), visibleCols: {} },
  targets: { ...listState(targetsFilterDefaults()), visibleCols: {} },
});

export const useRenewableEnergyStore = create((set, get) => ({
  ...createInitialState(),

  actualsActions: createListActions('actuals', actualsFilterDefaults, set, get),
  targetsActions: createListActions('targets', targetsFilterDefaults, set, get),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),

  loadMasters: async () => {
    const { mastersLoaded, loadingMasters } = get();
    if (mastersLoaded || loadingMasters) return;

    set({ loadingMasters: true, mastersError: null });
    try {
      const { data } = await fetchRenewableEnergyMasters();
      set({
        organisations: data?.organisations || [],
        loadingMasters: false,
        mastersLoaded: true,
      });
    } catch (err) {
      console.error('Failed to load renewable energy reference data:', err);
      set({ loadingMasters: false, mastersError: 'Renewable energy reference data' });
    }
  },
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useRenewableEnergyStore.getState().reset());
