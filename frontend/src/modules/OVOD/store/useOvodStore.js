import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { createReferenceSlice, createInitialReferenceState } from './slices/referenceSlice';
import { createDataListSlice, createInitialDataListState } from './slices/dataListSlice';
import { createDashboardSlice, createInitialDashboardState } from './slices/dashboardSlice';
import { createInterventionSlice, createInitialInterventionState } from './slices/interventionSlice';
import { createReportsSlice, createInitialReportsState } from './slices/reportsSlice';

/**
 * Drishti Portal (OVOD) Zustand Store
 * One store for the module, composed from one slice per view. Each slice owns a namespace:
 *
 *   reference     organisations (cached once)
 *   dataList      Data List tab, filters, search, page, columns
 *   dashboard     Dashboard filters
 *   interventions Intervention List filters, search, page size
 *   reports       Performance Report tab and vision filter
 *   statusReport  Data Entry Status Report tab and search
 *
 * Not kept here on purpose: the record being edited (travels with the route as
 * location.state.item), fetched rows, form fields, modals and drilldowns.
 *
 * Read it with selectors, never the bare hook:
 *   const dl = useOvodStore(useShallow((s) => s.dataList));
 */
export const useOvodStore = create((set, get) => ({
  ...createReferenceSlice(set, get),
  ...createDataListSlice(set, get),
  ...createDashboardSlice(set, get),
  ...createInterventionSlice(set, get),
  ...createReportsSlice(set, get),

  // Restore every slice to its defaults (called on logout)
  reset: () => set({
    ...createInitialReferenceState(),
    ...createInitialDataListState(),
    ...createInitialDashboardState(),
    ...createInitialInterventionState(),
    ...createInitialReportsState(),
  }),
}));

registerStoreReset(() => useOvodStore.getState().reset());
