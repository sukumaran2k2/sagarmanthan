import { ALL, patchNamespace, resolve } from '../helpers';

/**
 * Performance Report (`reports`) and Data Entry Status Report (`statusReport`).
 * A report's drilldown target stays in the component so it can't reappear stale.
 */
export const createInitialReportsState = () => ({
  reports: {
    activeTab: 'wing', // 'wing' | 'port' | 'org'
    selectedVision: ALL,
    showFilterPanel: false,
  },
  statusReport: {
    activeTab: 'ministry', // 'ministry' | 'organization' | 'vibhas'
    searchQuery: '',
  },
});

export const createReportsSlice = (set, get) => ({
  ...createInitialReportsState(),

  setReportsTab: (activeTab) => patchNamespace(set, 'reports', { activeTab }),

  setReportsVision: (selectedVision) => patchNamespace(set, 'reports', { selectedVision }),

  setReportsFilterPanel: (updater) =>
    patchNamespace(set, 'reports', (r) => ({ showFilterPanel: resolve(updater, r.showFilterPanel) })),

  // Switching to a different sub-report starts with an empty search; re-selecting the same one doesn't
  setStatusReportTab: (activeTab) => {
    if (get().statusReport.activeTab === activeTab) return;
    patchNamespace(set, 'statusReport', { activeTab, searchQuery: '' });
  },

  setStatusReportSearch: (searchQuery) => patchNamespace(set, 'statusReport', { searchQuery }),
});
