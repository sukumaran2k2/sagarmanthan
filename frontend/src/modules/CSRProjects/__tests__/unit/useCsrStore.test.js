/* global jest, describe, it, expect, beforeEach */
import { useCsrStore, DEFAULT_PROJECT_COLS, DEFAULT_FUND_COLS } from '../../store/useCsrStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchOrganisations, fetchClusters } from '../../api';
import { FINANCIAL_YEARS } from '../../utils/constants';
import { reportsFor, resolveReport } from '../../utils/reports';

jest.mock('../../api', () => ({
  fetchOrganisations: jest.fn(),
  fetchClusters: jest.fn(),
}));

const state = () => useCsrStore.getState();

describe('CSR Projects store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('starts on every project, no filters, page 1, filter panels closed, all columns shown', () => {
    expect(state()).toMatchObject({
      category: 'all',
      filters: { organisation: '', financialYear: '', focus: '', status: '' },
      searchTerm: '',
      currentPage: 1,
      pageSize: 10,
      showFilterPanel: false,
      visibleCols: DEFAULT_PROJECT_COLS,
      fundFilters: { organisation: '', financialYear: '' },
      fundPage: 1,
      fundVisibleCols: DEFAULT_FUND_COLS,
      dashboardFilters: { cluster: 0, organisation: 0, financialYear: 'all', focus: 0 },
      reportType: null,
    });
  });

  it('project search and filters return to page 1', () => {
    state().setCurrentPage(3);
    state().setSearchTerm('school');
    expect(state()).toMatchObject({ searchTerm: 'school', currentPage: 1 });
    state().setCurrentPage(2);
    state().setFilters({ focus: '2' });
    expect(state()).toMatchObject({ filters: { focus: '2', status: '' }, currentPage: 1 });
  });

  it('a status filter that does not fit the new category is cleared', () => {
    state().setFilters({ status: 'Completed' });
    state().setCategory('completed');
    expect(state().filters.status).toBe('Completed');
    state().setCategory('active');
    expect(state().filters.status).toBe('');
    state().setFilters({ status: 'Approved by Board' });
    state().setCategory('all');
    expect(state().filters.status).toBe('Approved by Board');
    state().setCategory('completed');
    expect(state()).toMatchObject({ filters: { status: '' }, currentPage: 1 });
  });

  it('reset clears the project filters and search', () => {
    state().setSearchTerm('port');
    state().setFilters({ organisation: '12', financialYear: '2025-2026' });
    state().resetFilters();
    expect(state()).toMatchObject({ searchTerm: '', filters: { organisation: '', financialYear: '' }, currentPage: 1 });
  });

  it('fund list state is separate from the project list', () => {
    state().setFundSearch('2024');
    state().setFundFilters({ financialYear: '2024-2025' });
    state().setFundPage((p) => p + 2);
    expect(state()).toMatchObject({ fundSearch: '2024', fundFilters: { financialYear: '2024-2025' }, fundPage: 3, searchTerm: '', currentPage: 1 });
    state().setFundPageSize(25);
    expect(state()).toMatchObject({ fundPageSize: 25, fundPage: 1 });
    state().resetFundFilters();
    expect(state()).toMatchObject({ fundSearch: '', fundFilters: { organisation: '', financialYear: '' } });
  });

  it('dashboard filters merge, and reset restores every filter', () => {
    state().setDashboardFilters({ financialYear: '2025-2026' });
    state().setDashboardFilters({ focus: 2 });
    expect(state().dashboardFilters).toEqual({ cluster: 0, organisation: 0, financialYear: '2025-2026', focus: 2 });
    state().resetDashboardFilters();
    expect(state().dashboardFilters).toEqual({ cluster: 0, organisation: 0, financialYear: 'all', focus: 0 });
  });

  it('each report starts on its own filters; the organisation-wise fund report on the current year', () => {
    state().setReportType('fund-org-trend-report');
    state().setReportOrg('12');
    state().setReportType('fund-org-wise-report');
    expect(state()).toMatchObject({ reportType: 'fund-org-wise-report', reportFY: FINANCIAL_YEARS[0], reportOrg: '' });
    state().setReportType('projects-focus-wise-summary');
    expect(state().reportFY).toBe('all');
  });

  it('organisation users only get the organisation-facing reports', () => {
    expect(reportsFor(false)).toHaveLength(6);
    expect(reportsFor(true).map((r) => r.id)).toEqual(['fund-org-trend-report', 'projects-year-wise-summary', 'projects-focus-wise-summary']);
    expect(resolveReport('fund-year-wise-report', true).id).toBe('fund-org-trend-report');
    expect(resolveReport(null, false).id).toBe('fund-year-wise-report');
    expect(resolveReport('projects-org-wise-summary', false).id).toBe('projects-org-wise-summary');
  });

  it('each user type sees the numbers and names from the approved report list (R-16)', () => {
    expect(reportsFor(false).map((r) => r.title.match(/C\.S\.R ([\d.]+)/)[1])).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5', '1.6']);
    expect(reportsFor(true).map((r) => r.title)).toEqual([
      'Report No.: C.S.R 1.1 - CSR Fund - Summary Report',
      'Report No.: C.S.R 1.2 - Financial Year-wise CSR Projects Summary',
      'Report No.: C.S.R 1.3 - CSR Focus/Project Area-wise CSR Projects Summary',
    ]);
    expect(resolveReport('fund-org-trend-report', true).label).toBe('CSR Fund - Summary Report');
    expect(resolveReport('fund-org-trend-report', false).label).toBe('Organisation-wise CSR Fund Trend');
    expect(reportsFor(true).some((r) => 'org' in r)).toBe(false);
  });

  it('page, filter panels and columns accept values or updater functions', () => {
    state().setShowFilterPanel((open) => !open);
    state().setFundShowFilterPanel(true);
    expect(state()).toMatchObject({ showFilterPanel: true, fundShowFilterPanel: true });
    state().setVisibleCols((cols) => ({ ...cols, remarks: false }));
    state().setFundVisibleCols((cols) => ({ ...cols, net_profit: false }));
    expect(state().visibleCols.remarks).toBe(false);
    expect(state().fundVisibleCols.net_profit).toBe(false);
  });

  it('loads organisations and clusters once, and retries if either failed', async () => {
    fetchOrganisations.mockRejectedValueOnce(new Error('down')).mockResolvedValue([{ organisation_id: 12 }]);
    fetchClusters.mockResolvedValue([{ hr_cluster_id: 1 }]);

    await state().loadLookups();
    expect(state()).toMatchObject({ organisations: [], clusters: [{ hr_cluster_id: 1 }], lookupsLoaded: false });
    await state().loadLookups();
    await state().loadLookups();
    expect(state()).toMatchObject({ organisations: [{ organisation_id: 12 }], lookupsLoaded: true });
    expect(fetchOrganisations).toHaveBeenCalledTimes(2);
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().setCategory('completed');
    state().setReportType('projects-org-wise-summary');
    state().setFundSearch('x');
    resetAllStores();
    expect(state()).toMatchObject({ category: 'all', reportType: null, fundSearch: '', organisations: [] });
  });
});
