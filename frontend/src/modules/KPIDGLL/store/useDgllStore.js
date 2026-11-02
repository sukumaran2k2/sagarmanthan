import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { createListActions, listState } from './listSlice';
import {
  fetchStates, fetchDistricts,
  fetchVtmsIntegration, fetchNaisUptime, fetchNaisIntegration,
  fetchTouristDestinations, fetchTargetDetails, fetchFinancialPerformance,
} from '../api';

/**
 * KPI DGLL store.
 * Keeps what must survive switching section or tab: each list's search, filters,
 * pagination and column visibility, the Tourist Destinations table on show, each
 * list's financial years (loaded once) and the state / district lookups.
 * The record being edited travels with the route (location.state); fetched rows stay
 * in the module shell.
 */

// The list endpoints take a userID but don't filter by it; 1 matches the module shell.
// Each list's fetcher and the field holding its year (used here only for the year dropdown).
// Light House Master has no year; it filters by status instead.
const YEAR_SOURCES = {
  vtmsIntegration: { fetch: (p) => fetchVtmsIntegration(1, p), field: 'financial_year' },
  naisUptime: { fetch: (p) => fetchNaisUptime(1, p), field: 'financial_year' },
  naisIntegration: { fetch: (p) => fetchNaisIntegration(1, p), field: 'financial_year' },
  touristDestinations: { fetch: (p) => fetchTouristDestinations(1, p), field: 'finacial_year' },
  touristTargets: { fetch: (p) => fetchTargetDetails(1, p), field: 'year' },
  financialPerformance: { fetch: (p) => fetchFinancialPerformance(p), field: 'financialyear' },
};

// One list per section, except Tourist Destinations, which shows two tables
// (destinations and their targets), each with its own list.
export const DGLL_LIST_IDS = [
  'lightHouseMaster', 'vtmsIntegration', 'naisUptime', 'naisIntegration',
  'touristDestinations', 'touristTargets', 'financialPerformance',
];

const filterDefaultsFor = (id) => (id === 'lightHouseMaster' ? () => ({ status: 'active' }) : () => ({ financialYear: '' }));
// visibleCols: null until the user changes it, so each Data List supplies its own default columns
const sectionState = (id) => ({ ...listState(filterDefaultsFor(id)()), visibleCols: null });

const createInitialState = () => ({
  ...Object.fromEntries(DGLL_LIST_IDS.map((id) => [id, sectionState(id)])),
  touristTable: 'destination', // 'destination' | 'target'
  years: {}, // list id -> years, newest first
  states: [],
  districts: [],
  lookupsLoaded: false,
});

export const useDgllStore = create((set, get) => ({
  ...createInitialState(),

  // One set of list actions per list, e.g. vtmsIntegrationActions.setCurrentPage(2)
  ...Object.fromEntries(DGLL_LIST_IDS.map((id) => [`${id}Actions`, createListActions(id, filterDefaultsFor(id), set, get)])),

  setTouristTable: (touristTable) => set({ touristTable }),

  // Years for a list's dropdown, fetched once per list
  loadYears: async (listId) => {
    const source = YEAR_SOURCES[listId];
    if (!source || get().years[listId]) return;
    set((state) => ({ years: { ...state.years, [listId]: [] } })); // marks it as loading
    try {
      const res = await source.fetch({ page: 1, limit: 100 });
      const years = [...new Set((res.data?.data || []).map((r) => r[source.field]).filter(Boolean))].sort().reverse();
      set((state) => ({ years: { ...state.years, [listId]: years } }));
    } catch (err) {
      console.error(`Failed to load DGLL years (${listId}):`, err);
      // Allow a retry next time the list opens
      set((state) => {
        const years = { ...state.years };
        delete years[listId];
        return { years };
      });
    }
  },

  // States and districts for the Light House Master form, fetched once
  loadLookups: async () => {
    if (get().lookupsLoaded) return;
    set({ lookupsLoaded: true });
    const [states, districts] = await Promise.allSettled([fetchStates(), fetchDistricts()]);
    if (states.status === 'fulfilled') set({ states: states.value.data || [] });
    else console.error('Error loading states:', states.reason);
    if (districts.status === 'fulfilled') set({ districts: districts.value.data || [] });
    else console.error('Error loading districts:', districts.reason);
    // Allow a retry next time if either failed
    if (states.status === 'rejected' || districts.status === 'rejected') set({ lookupsLoaded: false });
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useDgllStore.getState().reset());
