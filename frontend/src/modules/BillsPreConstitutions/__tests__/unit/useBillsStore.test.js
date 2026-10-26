/* global jest, describe, it, expect, beforeEach */
import { useBillsStore, DEFAULT_VISIBLE_COLS } from '../../store/useBillsStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchWings, fetchDivisions } from '../../api';

jest.mock('../../api', () => ({
  fetchWings: jest.fn(),
  fetchDivisions: jest.fn(),
}));

const state = () => useBillsStore.getState();

describe('Bills / Pre-Constitutions Act store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('starts on Active bills, no filters, page 1, filter panel closed, all columns shown', () => {
    expect(state()).toMatchObject({
      category: 'active',
      filters: { wing: '', division: '', stage: '' },
      searchTerm: '',
      currentPage: 1,
      pageSize: 10,
      showFilterPanel: false,
      visibleCols: DEFAULT_VISIBLE_COLS,
      reportView: 'wing',
    });
  });

  it('search and filters return to page 1 (the list filters in the browser, no debounce)', () => {
    state().setCurrentPage(3);
    state().setSearchTerm('shipping');
    expect(state()).toMatchObject({ searchTerm: 'shipping', currentPage: 1 });
    state().setCurrentPage(2);
    state().setFilters({ wing: '4' });
    expect(state()).toMatchObject({ filters: { wing: '4', division: '', stage: '' }, currentPage: 1 });
  });

  it('switching to Disposed clears the stage filter and returns to page 1', () => {
    state().setFilters({ stage: 'Bill Passed', division: '9' });
    state().setCurrentPage(2);
    state().setCategory('disposed');
    expect(state()).toMatchObject({ category: 'disposed', filters: { division: '9', stage: '' }, currentPage: 1 });
  });

  it('resetFilters keeps the search', () => {
    state().setSearchTerm('port');
    state().setFilters({ wing: '2', stage: 'Draft' });
    state().resetFilters();
    expect(state()).toMatchObject({ searchTerm: 'port', filters: { wing: '', division: '', stage: '' } });
  });

  it('page, page size, filter panel and columns accept values or updater functions', () => {
    state().setCurrentPage((p) => p + 1);
    expect(state().currentPage).toBe(2);
    state().setPageSize(20);
    expect(state()).toMatchObject({ pageSize: 20, currentPage: 1 });
    state().setShowFilterPanel((open) => !open);
    expect(state().showFilterPanel).toBe(true);
    state().setVisibleCols((cols) => ({ ...cols, stage: false }));
    expect(state().visibleCols.stage).toBe(false);
  });

  it('loads wings and divisions once, and retries if either failed', async () => {
    fetchWings.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ data: [{ wing_id: 1 }] });
    fetchDivisions.mockResolvedValue({ data: [{ division_id: 2 }] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await state().loadLookups();
    expect(state()).toMatchObject({ wings: [], divisions: [{ division_id: 2 }], lookupsLoaded: false });
    await state().loadLookups();
    await state().loadLookups();
    expect(state()).toMatchObject({ wings: [{ wing_id: 1 }], lookupsLoaded: true });
    expect(fetchWings).toHaveBeenCalledTimes(2);
    console.error.mockRestore();
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().setCategory('disposed');
    state().setReportView('all');
    state().setSearchTerm('x');
    resetAllStores();
    expect(state()).toMatchObject({ category: 'active', reportView: 'wing', searchTerm: '', wings: [] });
  });
});
