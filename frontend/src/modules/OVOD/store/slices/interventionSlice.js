import { allFilters, patchNamespace, resolve } from '../helpers';

/**
 * Intervention List view: the eight server-side filters, quick search, page size and panel state.
 * The expanded/collapsed tree nodes stay in the component because they depend on the loaded rows.
 */
export const INTERVENTION_FILTER_KEYS = [
  'vision', 'wing', 'org', 'vibhas', 'priority', 'mivChapter', 'makvTheme', 'status',
];

export const createInitialInterventionState = () => ({
  interventions: {
    filters: allFilters(INTERVENTION_FILTER_KEYS),
    searchTerm: '',
    pageSize: 25,
    showFilterPanel: false,
  },
});

export const createInterventionSlice = (set) => ({
  ...createInitialInterventionState(),

  setInterventionFilter: (key, value) =>
    patchNamespace(set, 'interventions', (i) => ({ filters: { ...i.filters, [key]: value } })),

  setInterventionSearch: (searchTerm) => patchNamespace(set, 'interventions', { searchTerm }),

  setInterventionPageSize: (pageSize) => patchNamespace(set, 'interventions', { pageSize }),

  setInterventionFilterPanel: (updater) =>
    patchNamespace(set, 'interventions', (i) => ({ showFilterPanel: resolve(updater, i.showFilterPanel) })),

  resetInterventionFilters: () =>
    patchNamespace(set, 'interventions', { filters: allFilters(INTERVENTION_FILTER_KEYS), searchTerm: '' }),
});
