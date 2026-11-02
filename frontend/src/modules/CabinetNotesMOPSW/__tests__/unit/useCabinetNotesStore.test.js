/* global jest, describe, it, expect, beforeEach */
import { useCabinetNotesStore, DEFAULT_VISIBLE_COLS } from '../../store/useCabinetNotesStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchWings, fetchDivisions, fetchCabinetStages } from '../../api';

jest.mock('../../api', () => ({
  fetchWings: jest.fn(),
  fetchDivisions: jest.fn(),
  fetchCabinetStages: jest.fn(),
}));

const state = () => useCabinetNotesStore.getState();

describe('Cabinet Notes MoPSW store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('starts on the Active tab, no filters, page 1, filter panel closed, all columns shown', () => {
    expect(state()).toMatchObject({
      category: 'active',
      filters: { wingId: 'All', divisionId: 'All', status: 'All' },
      searchTerm: '',
      currentPage: 1,
      pageSize: 10,
      showFilterPanel: false,
      visibleCols: DEFAULT_VISIBLE_COLS,
      reportView: 'wing',
    });
  });

  it('returns to page 1 on a filter change, and a new wing clears the division', () => {
    state().setFilters({ wingId: '3', divisionId: '7' });
    state().setCurrentPage(4);
    state().setFilters({ wingId: '5' });
    expect(state()).toMatchObject({ filters: { wingId: '5', divisionId: 'All', status: 'All' }, currentPage: 1 });
  });

  it('switching to Completed clears the stage filter (completed notes have no stage) and returns to page 1', () => {
    state().setFilters({ status: 'Draft Note', wingId: '2' });
    state().setCurrentPage(3);
    state().setCategory('completed');
    expect(state()).toMatchObject({ category: 'completed', filters: { wingId: '2', status: 'All' }, currentPage: 1 });
  });

  it('resetFilters keeps the search; the debounced search only resets the page when it changes', () => {
    state().setSearchTerm('port');
    state().setFilters({ wingId: '2' });
    state().resetFilters();
    expect(state()).toMatchObject({ searchTerm: 'port', filters: { wingId: 'All' } });

    state().setCurrentPage(2);
    state().setDebouncedSearch('');
    expect(state().currentPage).toBe(2);
    state().setDebouncedSearch('port');
    expect(state()).toMatchObject({ debouncedSearch: 'port', currentPage: 1 });
  });

  it('page, page size, filter panel and columns accept values or updater functions', () => {
    state().setCurrentPage((p) => p + 2);
    expect(state().currentPage).toBe(3);
    state().setPageSize(25);
    expect(state()).toMatchObject({ pageSize: 25, currentPage: 1 });
    state().setShowFilterPanel((open) => !open);
    expect(state().showFilterPanel).toBe(true);
    state().setVisibleCols((cols) => ({ ...cols, remarks: false }));
    expect(state().visibleCols.remarks).toBe(false);
  });

  it('loads wings, divisions and stages once, and retries if any failed', async () => {
    fetchWings.mockResolvedValue({ data: [{ wing_id: 1 }] });
    fetchDivisions.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ data: [{ division_id: 9 }] });
    fetchCabinetStages.mockResolvedValue({ data: [{ id: 1 }] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await state().loadLookups();
    expect(state()).toMatchObject({ wings: [{ wing_id: 1 }], divisions: [], lookupsLoaded: false });
    await state().loadLookups();
    await state().loadLookups();
    expect(state()).toMatchObject({ divisions: [{ division_id: 9 }], stages: [{ id: 1 }], lookupsLoaded: true });
    expect(fetchWings).toHaveBeenCalledTimes(2);
    console.error.mockRestore();
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().setCategory('completed');
    state().setReportView('division');
    state().setShowFilterPanel(true);
    resetAllStores();
    expect(state()).toMatchObject({ category: 'active', reportView: 'wing', showFilterPanel: false, wings: [] });
  });
});
