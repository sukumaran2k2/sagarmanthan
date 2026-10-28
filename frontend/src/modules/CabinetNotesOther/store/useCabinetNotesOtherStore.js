import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { fetchDropdownAllValues, fetchMinistryList, fetchWings } from '../api';

/**
 * Cabinet Notes - Other Ministry store.
 * Keeps what must survive switching between the module's tabs (and leaving the module):
 *  - reference data (ministries, stages, wings), loaded once and shared by the Data List,
 *    Input Form and Reports, which used to fetch them separately
 *  - the open tab (dashboard / add / list / report)
 *  - the Data List's category, filters, search, filter panel, pagination and column visibility
 *  - the Reports page's report type, ministry filter, filter panel and drill-down path
 * visibleCols holds only the user's changes; the Data List merges them over its own defaults.
 * The record being edited and the fetched notes stay in component state (as in HR).
 */

export const SUB_TABS = ['dashboard', 'add', 'list', 'report'];

export const REPORT_TITLES = {
  stagewise: 'Report No.: 6.2 - Abstract - Cabinet Notes from Other Ministry',
  pendency: 'Report No.: 6.2 - Pendency (Abstract) - Cabinet Notes/Bills from other Ministry',
};

const summaryPath = (type) => [{ type: 'summary', title: REPORT_TITLES[type] }];

// category: 'active' | 'completed'; ministry and stage are names ('' = all)
const listFilterDefaults = () => ({ ministry: '', stage: '' });

const createInitialState = () => ({
  ministries: [],
  stages: [],
  wings: [],
  loadingMasters: false,
  mastersLoaded: false,
  mastersError: null,

  activeSubTab: 'dashboard',

  list: {
    ...listFilterDefaults(),
    category: 'active',
    searchTerm: '',
    showFilterPanel: false,
    currentPage: 1,
    pageSize: 10,
    visibleCols: {},
  },

  report: {
    type: 'stagewise', // 'stagewise' | 'pendency'
    ministry: '',
    filterOpen: true,
    drillDownPath: summaryPath('stagewise'),
  },
});

// Accept a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

const asRows = (res) => (Array.isArray(res?.data) ? res.data : []);

export const useCabinetNotesOtherStore = create((set, get) => {
  const patch = (key, changes) => set((state) => ({ [key]: { ...state[key], ...changes } }));
  const update = (key, field, updater) =>
    set((state) => ({ [key]: { ...state[key], [field]: resolve(updater, state[key][field]) } }));

  return {
    ...createInitialState(),

    setActiveSubTab: (activeSubTab) => {
      if (SUB_TABS.includes(activeSubTab)) set({ activeSubTab });
    },

    // The list filters in the browser, so search applies as the user types (no debounce).
    // Every filter or search change returns to page 1.
    listActions: {
      setSearchTerm: (searchTerm) => patch('list', { searchTerm, currentPage: 1 }),
      setFilters: (changes) => patch('list', { ...changes, currentPage: 1 }),
      // Stages differ between Active and Completed, so a new category clears the stage
      setCategory: (category) => patch('list', { category, stage: '', currentPage: 1 }),
      setShowFilterPanel: (updater) => update('list', 'showFilterPanel', updater),
      setCurrentPage: (updater) => update('list', 'currentPage', updater),
      setPageSize: (pageSize) => patch('list', { pageSize, currentPage: 1 }),
      resetFilters: () => patch('list', { ...listFilterDefaults(), searchTerm: '', currentPage: 1 }),
      setVisibleCols: (updater) => update('list', 'visibleCols', updater),
    },

    reportActions: {
      // A new report starts from its summary with no ministry filter
      setType: (type) => patch('report', { type, ministry: '', drillDownPath: summaryPath(type) }),
      setMinistry: (ministry) => patch('report', { ministry }),
      setFilterOpen: (updater) => update('report', 'filterOpen', updater),
      setDrillDownPath: (updater) => update('report', 'drillDownPath', updater),
    },

    // Restore defaults (called on logout so nothing carries over to the next session)
    reset: () => set(createInitialState()),

    /** Ministries, stages and wings, loaded once. A failed list is retried on the next call. */
    loadMasters: async () => {
      const { loadingMasters, mastersLoaded } = get();
      if (loadingMasters || mastersLoaded) return;

      set({ loadingMasters: true, mastersError: null });
      const [ministriesRes, stagesRes, wingsRes] = await Promise.allSettled([
        fetchMinistryList(),
        fetchDropdownAllValues('mmt_cabinet_ministry_stage'),
        fetchWings(),
      ]);
      const failed = [ministriesRes, stagesRes, wingsRes].filter((r) => r.status === 'rejected');
      failed.forEach((r) => console.error('Failed to load Cabinet Notes reference data:', r.reason));
      set({
        ministries: ministriesRes.status === 'fulfilled' ? asRows(ministriesRes.value) : [],
        stages: stagesRes.status === 'fulfilled' ? asRows(stagesRes.value) : [],
        wings: wingsRes.status === 'fulfilled' ? asRows(wingsRes.value) : [],
        loadingMasters: false,
        mastersLoaded: failed.length === 0,
        mastersError: failed.length > 0 ? 'Cabinet Notes reference data' : null,
      });
    },
  };
});

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useCabinetNotesOtherStore.getState().reset());
