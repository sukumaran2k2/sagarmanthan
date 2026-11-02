import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * Acts & Rules module store.
 * The table is static reference data; only the chosen wing filter is kept, so it
 * survives leaving the page and coming back.
 */
const initialState = {
  wing: 'All', // 'All' or one of WINGS
};

export const useActsAndRulesStore = create((set) => ({
  ...initialState,

  setWing: (wing) => set({ wing }),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useActsAndRulesStore.getState().reset());
