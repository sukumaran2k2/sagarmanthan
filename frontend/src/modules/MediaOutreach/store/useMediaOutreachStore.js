import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { fetchOrganisations } from '../api';

/**
 * Media Outreach store.
 * Keeps what must survive switching between the module's tabs and the Input Form:
 *  - reference data (the organisation list), loaded once
 *  - the open media tab (Broadcast / Print / Online / Social Media)
 *  - the Data List's filters, search, filter panel, pagination and column visibility
 *    (shared by the four media tabs, as before)
 * visibleCols holds only the user's changes; the Data List merges them over its own defaults.
 * The record being edited and the fetched records stay in component state (as in HR).
 */

export const MEDIA_LIST_TABS = ['broadcast', 'print_media', 'online', 'social_media'];

// category: 'all' | 'major_port' | 'ministry' | 'non_port'; subOrgId narrows a category to one organisation
const listFilterDefaults = () => ({
  financialYear: '',
  month: '',
  organisationId: '',
  showYearWise: false,
  category: 'all',
  subOrgId: '',
});

const listState = () => ({
  ...listFilterDefaults(),
  searchTerm: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
  visibleCols: {},
});

const createInitialState = () => ({
  organisations: [],
  loadingOrganisations: false,
  organisationsError: null,

  mediaTab: 'broadcast',
  list: listState(),
});

// Accept a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useMediaOutreachStore = create((set, get) => {
  const patchList = (changes) => set((state) => ({ list: { ...state.list, ...changes } }));
  const updateList = (field, updater) =>
    set((state) => ({ list: { ...state.list, [field]: resolve(updater, state.list[field]) } }));

  return {
    ...createInitialState(),

    setMediaTab: (mediaTab) => {
      if (MEDIA_LIST_TABS.includes(mediaTab)) set({ mediaTab });
    },

    // The list filters in the browser, so search applies as the user types (no debounce).
    // Every filter or search change returns to page 1.
    listActions: {
      setSearchTerm: (searchTerm) => patchList({ searchTerm, currentPage: 1 }),
      setFilters: (changes) => patchList({ ...changes, currentPage: 1 }),
      // A new category clears the organisation picked inside the old one
      setCategory: (updater) =>
        set((state) => ({
          list: { ...state.list, category: resolve(updater, state.list.category), subOrgId: '', currentPage: 1 },
        })),
      setShowFilterPanel: (updater) => updateList('showFilterPanel', updater),
      setCurrentPage: (updater) => updateList('currentPage', updater),
      setPageSize: (pageSize) => patchList({ pageSize, currentPage: 1 }),
      // The category cards are not part of the filter panel, so Reset keeps the chosen category
      resetFilters: () =>
        set((state) => ({
          list: { ...state.list, ...listFilterDefaults(), category: state.list.category, searchTerm: '', currentPage: 1 },
        })),
      setVisibleCols: (updater) => updateList('visibleCols', updater),
    },

    // Restore defaults (called on logout so nothing carries over to the next session)
    reset: () => set(createInitialState()),

    /** The organisation list, loaded once. */
    loadOrganisations: async () => {
      const { organisations, loadingOrganisations } = get();
      if (loadingOrganisations || organisations.length > 0) return;

      set({ loadingOrganisations: true, organisationsError: null });
      try {
        const res = await fetchOrganisations();
        set({ organisations: Array.isArray(res.data) ? res.data : [], loadingOrganisations: false });
      } catch (err) {
        console.error('Failed to load Media Outreach organisations:', err);
        set({ loadingOrganisations: false, organisationsError: 'Organisations' });
      }
    },
  };
});

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useMediaOutreachStore.getState().reset());
