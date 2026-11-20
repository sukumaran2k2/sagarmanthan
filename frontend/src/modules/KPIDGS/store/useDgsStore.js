import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * KPI DGS store (one for the whole module, like useCslStore).
 * Keeps what must survive switching section or tab: each section's Data List search text and
 * column visibility, in its own slot keyed by the section slug from data/inputFormIndex.js.
 * The record being edited travels with the route (location.state); fetched rows and form
 * inputs stay in the components.
 *
 * Sections opt in by being listed here; the others keep the table's own (unsaved) state.
 */
export const DGS_STORED_LIST_SLUGS = [
  'exam-monthly-performance', // K-2.3.1
  'exam-overall-performance', // K-2.3.2
];

// visibleCols: null until the user changes it, so the Data List supplies its own default columns
const listSlot = () => ({ searchTerm: '', visibleCols: null });

const createInitialState = () => ({
  lists: Object.fromEntries(DGS_STORED_LIST_SLUGS.map((slug) => [slug, listSlot()])),
});

// Accept a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useDgsStore = create((set) => ({
  ...createInitialState(),

  setListSearch: (slug, searchTerm) =>
    set((state) => ({ lists: { ...state.lists, [slug]: { ...state.lists[slug], searchTerm } } })),

  // `defaults` is the Data List's starting column map, used until the user first changes it
  setListVisibleCols: (slug, updater, defaults) =>
    set((state) => {
      const current = state.lists[slug]?.visibleCols ?? defaults;
      return { lists: { ...state.lists, [slug]: { ...state.lists[slug], visibleCols: resolve(updater, current) } } };
    }),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useDgsStore.getState().reset());
