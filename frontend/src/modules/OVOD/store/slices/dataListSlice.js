import { allFilters, patchNamespace, resolve } from '../helpers';

/**
 * Data List view: status tab, 10 dropdown filters, search, pagination and column visibility.
 * The fetched rows stay in the component; the list is filtered and paged on the client.
 */
export const DATALIST_FILTER_KEYS = [
  'wing', 'org', 'goalA1', 'interventionA2', 'actionA3',
  'goalB1', 'interventionB2', 'actionB3', 'stage', 'vibhas',
];

export const createInitialDataListState = () => ({
  dataList: {
    activeTab: 'all', // 'all' | 'active' | 'completed' | 'dropped'
    filters: allFilters(DATALIST_FILTER_KEYS),
    searchTerm: '',
    currentPage: 1,
    pageSize: 10,
    showFilterPanel: false,
    colVisibility: {
      sno: true, org: true, a1: true, a2: true, a3: true,
      b1: true, b2: true, b3: true, status: true, date: true, actions: true,
    },
  },
});

export const createDataListSlice = (set) => ({
  ...createInitialDataListState(),

  // Every change that alters the visible rows returns to page 1
  setDataListTab: (activeTab) => patchNamespace(set, 'dataList', { activeTab, currentPage: 1 }),

  setDataListFilter: (key, value) =>
    patchNamespace(set, 'dataList', (dl) => ({ filters: { ...dl.filters, [key]: value }, currentPage: 1 })),

  setDataListSearch: (searchTerm) => patchNamespace(set, 'dataList', { searchTerm, currentPage: 1 }),

  // Accepts a number or an updater, because the pager's Prev/Next pass `prev => …`
  setDataListPage: (updater) =>
    patchNamespace(set, 'dataList', (dl) => ({ currentPage: resolve(updater, dl.currentPage) })),

  setDataListPageSize: (pageSize) => patchNamespace(set, 'dataList', { pageSize, currentPage: 1 }),

  setDataListFilterPanel: (updater) =>
    patchNamespace(set, 'dataList', (dl) => ({ showFilterPanel: resolve(updater, dl.showFilterPanel) })),

  toggleDataListColumn: (key) =>
    patchNamespace(set, 'dataList', (dl) => ({ colVisibility: { ...dl.colVisibility, [key]: !dl.colVisibility[key] } })),

  // Reset clears the search text as well, as the Data List always did
  resetDataListFilters: () =>
    patchNamespace(set, 'dataList', { filters: allFilters(DATALIST_FILTER_KEYS), searchTerm: '', currentPage: 1 }),
});
