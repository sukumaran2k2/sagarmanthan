/* global jest, describe, it, expect, beforeEach */
import { useGmisStore, DEFAULT_VISIBLE_COLS } from '../../store/useGmisStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchOrganisations, fetchMouCategoryNames, fetchGmisNavicVibhas } from '../../api';

jest.mock('../../api', () => ({
  fetchOrganisations: jest.fn(),
  fetchMouCategoryNames: jest.fn(),
  fetchGmisNavicVibhas: jest.fn(),
}));

const state = () => useGmisStore.getState();
const NO_FILTERS = { organisation: '', category: '', navic: '', nature: '' };

describe('GMIS & IMW MoU store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('starts on all summits and all MoUs, no filters, page 1, default columns, Report 1.1', () => {
    expect(state()).toMatchObject({
      summit: '',
      statusTab: 'all',
      filters: NO_FILTERS,
      searchTerm: '',
      debouncedSearch: '',
      currentPage: 1,
      pageSize: 10,
      showFilterPanel: false,
      visibleCols: DEFAULT_VISIBLE_COLS,
      selectedReport: 'report-1',
      reportOrganisation: '',
    });
  });

  it('summit, status tab and filters return to page 1', () => {
    state().setCurrentPage(3);
    state().setSummit('GMIS 2023');
    expect(state()).toMatchObject({ summit: 'GMIS 2023', currentPage: 1 });
    state().setCurrentPage(2);
    state().setStatusTab('dropped');
    expect(state()).toMatchObject({ statusTab: 'dropped', currentPage: 1 });
    state().setCurrentPage(2);
    state().setFilters({ organisation: '7' });
    expect(state()).toMatchObject({ filters: { ...NO_FILTERS, organisation: '7' }, currentPage: 1 });
  });

  it('typing keeps the page; the debounced search returns to page 1 only when it changes', () => {
    state().setCurrentPage(4);
    state().setSearchTerm('port');
    expect(state()).toMatchObject({ searchTerm: 'port', currentPage: 4 });
    state().setDebouncedSearch('');
    expect(state().currentPage).toBe(4);
    state().setDebouncedSearch('port');
    expect(state()).toMatchObject({ debouncedSearch: 'port', currentPage: 1 });
  });

  it('resetFilters clears the panel filters and the summit, keeps the search and status tab', () => {
    state().setSearchTerm('vizag');
    state().setStatusTab('completed');
    state().setSummit('GMIS 2021');
    state().setFilters({ category: 'Ports', nature: 'National' });
    state().resetFilters();
    expect(state()).toMatchObject({ searchTerm: 'vizag', statusTab: 'completed', summit: '', filters: NO_FILTERS });
  });

  it('page, page size, filter panel and columns accept values or updater functions', () => {
    state().setCurrentPage((p) => p + 1);
    expect(state().currentPage).toBe(2);
    state().setPageSize(25);
    expect(state()).toMatchObject({ pageSize: 25, currentPage: 1 });
    state().setShowFilterPanel((open) => !open);
    expect(state().showFilterPanel).toBe(true);
    state().setVisibleCols((cols) => ({ ...cols, nextSteps: true }));
    expect(state().visibleCols.nextSteps).toBe(true);
  });

  it('switching report clears the Report 1.5 organisation filter', () => {
    state().setSelectedReport('report-5');
    state().setReportOrganisation('Cochin Port');
    state().setSelectedReport('report-2');
    expect(state()).toMatchObject({ selectedReport: 'report-2', reportOrganisation: '' });
  });

  it('loads the reference lists once, and retries if any failed', async () => {
    fetchOrganisations.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ data: [{ organisation_id: 1 }] });
    fetchMouCategoryNames.mockResolvedValue({ data: [{ mou_category_id: 2 }] });
    fetchGmisNavicVibhas.mockResolvedValue({ data: [{ navic_name: 'Cell' }] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await state().loadLookups();
    expect(state()).toMatchObject({ organisations: [], categories: [{ mou_category_id: 2 }], lookupsLoaded: false });
    await state().loadLookups();
    await state().loadLookups();
    expect(state()).toMatchObject({ organisations: [{ organisation_id: 1 }], navicCells: [{ navic_name: 'Cell' }], lookupsLoaded: true });
    expect(fetchOrganisations).toHaveBeenCalledTimes(2);
    console.error.mockRestore();
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().setSummit('GMIS 2025');
    state().setStatusTab('dropped');
    state().setSelectedReport('report-6');
    state().setSearchTerm('x');
    resetAllStores();
    expect(state()).toMatchObject({ summit: '', statusTab: 'all', selectedReport: 'report-1', searchTerm: '', organisations: [] });
  });
});
