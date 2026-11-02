import { allFilters, patchNamespace, resolve } from '../helpers';

/** Dashboard view: the seven analytics filters and whether the filter panel is open. */
export const DASHBOARD_FILTER_KEYS = [
  'vision', 'wing', 'org', 'vibhas', 'priority', 'mivChapter', 'makvTheme',
];

export const createInitialDashboardState = () => ({
  dashboard: {
    filters: allFilters(DASHBOARD_FILTER_KEYS),
    showFilterPanel: true, // the dashboard opens with its filters visible
  },
});

export const createDashboardSlice = (set) => ({
  ...createInitialDashboardState(),

  setDashboardFilter: (key, value) =>
    patchNamespace(set, 'dashboard', (d) => ({ filters: { ...d.filters, [key]: value } })),

  setDashboardFilterPanel: (updater) =>
    patchNamespace(set, 'dashboard', (d) => ({ showFilterPanel: resolve(updater, d.showFilterPanel) })),

  resetDashboardFilters: () =>
    patchNamespace(set, 'dashboard', { filters: allFilters(DASHBOARD_FILTER_KEYS) }),
});
