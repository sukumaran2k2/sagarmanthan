import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { createListActions, listState } from './listSlice';
import {
  fetchVesselsBuilt, fetchShipBuildingOrders, fetchShipDeliveryPerformance,
  fetchCapacityUtilization, fetchFabricationOfSteels, fetchShipsRepaired,
} from '../api';

/**
 * KPI CSL store.
 * Keeps what must survive switching section or tab: each section's Data List search,
 * financial year, pagination and column visibility, plus each section's list of
 * financial years (loaded once).
 * The record being edited travels with the route (location.state); fetched rows stay
 * in the module shell.
 */

// Section id -> list fetcher (used here only to load each section's financial years)
const YEAR_SOURCES = {
  vesselsBuilt: fetchVesselsBuilt,
  shipBuildingOrders: fetchShipBuildingOrders,
  shipDelivery: fetchShipDeliveryPerformance,
  capacityUtilization: fetchCapacityUtilization,
  fabricationOfSteels: fetchFabricationOfSteels,
  shipsRepaired: fetchShipsRepaired,
};
export const CSL_SECTION_IDS = Object.keys(YEAR_SOURCES);

// visibleCols: null until the user changes it, so each Data List supplies its own default columns
const filterDefaults = () => ({ financialYear: '' });
const sectionState = () => ({ ...listState(filterDefaults()), visibleCols: null });

const createInitialState = () => ({
  ...Object.fromEntries(CSL_SECTION_IDS.map((id) => [id, sectionState()])),
  years: {}, // section id -> financial years, newest first
});

export const useCslStore = create((set, get) => ({
  ...createInitialState(),

  // One set of list actions per section, e.g. vesselsBuiltActions.setCurrentPage(2)
  ...Object.fromEntries(CSL_SECTION_IDS.map((id) => [`${id}Actions`, createListActions(id, filterDefaults, set, get)])),

  // Financial years for a section's dropdown, fetched once per section
  loadYears: async (sectionId) => {
    const fetcher = YEAR_SOURCES[sectionId];
    if (!fetcher || get().years[sectionId]) return;
    set((state) => ({ years: { ...state.years, [sectionId]: [] } })); // marks it as loading
    try {
      const res = await fetcher(1, { page: 1, limit: 100 });
      const years = [...new Set((res.data?.data || []).map((r) => r.financial_year).filter(Boolean))].sort().reverse();
      set((state) => ({ years: { ...state.years, [sectionId]: years } }));
    } catch (err) {
      console.error(`Failed to load CSL financial years (${sectionId}):`, err);
      // Allow a retry next time the section opens
      set((state) => {
        const years = { ...state.years };
        delete years[sectionId];
        return { years };
      });
    }
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useCslStore.getState().reset());
