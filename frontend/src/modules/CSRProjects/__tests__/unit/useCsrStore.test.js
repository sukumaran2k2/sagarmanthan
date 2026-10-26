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
      drilldownStage: 'all',
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

  it('a dashboard filter change shows every status again', () => {
    state().setDrilldownStage('Completed');
    state().setDashboardFilters({ financialYear: '2025-2026' });
    expect(state()).toMatchObject({ drilldownStage: 'all', dashboardFilters: { financialYear: '2025-2026', organisation: 0 } });
    state().setDrilldownStage('Completed');
    state().resetDashboardFilters();
    expect(state()).toMatchObject({ drilldownStage: 'all', dashboardFilters: { financialYear: 'all' } });
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
