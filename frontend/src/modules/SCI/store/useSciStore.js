import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { createListActions, listState } from './listSlice';

/**
 * KPI SCI store.
 * Keeps what must survive switching section or tab: each section's Data List search,
 * financial year, pagination and column visibility. SCI lists return every row, so
 * each Data List filters and pages in the browser (its year dropdown comes from the rows).
 * The record being edited travels with the route (location.state); fetched rows stay
 * in the module shell.
 */

export const SCI_SECTION_IDS = [
  'vesselAvailOwnShips', 'timeVoyageBulk', 'timeVoyageTanker', 'timeVoyageOffshore', 'vesselAvailLiner',
  'vesselProcurement', 'secondhandVesselProcurement', 'shipDryDocking', 'repairAndMaintenance',
  'saleAndRecycling', 'saleAndGreenRecycling', 'manningOwnedShips', 'shipManagementBusiness',
];

// visibleCols: null until the user changes it, so each Data List supplies its own default columns
const filterDefaults = () => ({ financialYear: '' });
const sectionState = () => ({ ...listState(filterDefaults()), visibleCols: null });

const createInitialState = () => Object.fromEntries(SCI_SECTION_IDS.map((id) => [id, sectionState()]));

export const useSciStore = create((set, get) => ({
  ...createInitialState(),

  // One set of list actions per section, e.g. timeVoyageBulkActions.setCurrentPage(2)
  ...Object.fromEntries(SCI_SECTION_IDS.map((id) => [`${id}Actions`, createListActions(id, filterDefaults, set, get)])),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useSciStore.getState().reset());
