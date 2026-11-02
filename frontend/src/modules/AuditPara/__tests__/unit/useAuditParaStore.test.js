/* global jest, describe, it, expect, beforeEach */
import { useAuditParaStore } from '../../store/useAuditParaStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchWings, fetchDivisions } from '../../api';

jest.mock('../../api', () => ({
  fetchWings: jest.fn(),
  fetchDivisions: jest.fn(),
}));

const state = () => useAuditParaStore.getState();

describe('Audit Para store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('setCurrentPage accepts a value or an updater function (Prev/Next buttons)', () => {
    state().setCurrentPage(3);
    expect(state().currentPage).toBe(3);
    state().setCurrentPage((prev) => prev + 1);
    expect(state().currentPage).toBe(4);
  });

  it('goes back to page 1 on any filter, search or page size change', () => {
    const changes = [
      () => state().setSearchTerm('5.1'),
      () => state().setSelectedWing('Ports'),
      () => state().setSelectedDivision('PD-III'),
      () => state().setSelectedCategory('Draft Para'),
      () => state().setSelectedStatus('Dropped'),
      () => state().setPageSize(20),
    ];
    changes.forEach((change) => {
      state().setCurrentPage(3);
      change();
      expect(state().currentPage).toBe(1);
    });
  });

  it('resetFilters clears the filters but keeps the search text and page size', () => {
    state().setSearchTerm('cag');
    state().setPageSize(20);
    state().setSelectedWing('Ports');
    state().setSelectedCategory('Draft Para');
    state().resetFilters();
    expect(state()).toMatchObject({
      selectedWing: '', selectedDivision: '', selectedCategory: '', selectedStatus: '',
      searchTerm: 'cag', pageSize: 20, currentPage: 1,
    });
  });

  it('keeps the report view, category and search separately from the list', () => {
    state().setReportView('division');
    state().setReportCategory('Draft Para');
    state().setReportSearch('ports');
    expect(state()).toMatchObject({ reportView: 'division', reportCategory: 'Draft Para', reportSearch: 'ports', currentPage: 1 });
  });

  it('loads wings and divisions once, and records a failure', async () => {
    fetchWings.mockResolvedValue({ data: [{ wing_id: 1, wing_name: 'Ports' }] });
    fetchDivisions.mockResolvedValue({ data: [{ division_id: 2, division_name: 'PD-III' }] });
    await state().loadWingsAndDivisions();
    await state().loadWingsAndDivisions();
    expect(fetchWings).toHaveBeenCalledTimes(1);
    expect(state()).toMatchObject({ wings: [{ wing_name: 'Ports' }], divisions: [{ division_name: 'PD-III' }], metadataError: null });

    resetAllStores();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchWings.mockRejectedValue(new Error('down'));
    await state().loadWingsAndDivisions();
    expect(state()).toMatchObject({ wings: [], metadataError: 'Failed to load wings and divisions.' });
    console.error.mockRestore();
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().setSearchTerm('cag');
    state().setSelectedWing('Ports');
    state().setVisibleCols((cols) => ({ ...cols, remarks: false }));
    state().setReportView('all');
    resetAllStores();
    expect(state()).toMatchObject({
      searchTerm: '', selectedWing: '', currentPage: 1, pageSize: 10, showFilterPanel: false, reportView: 'wing',
    });
    expect(state().visibleCols.remarks).toBe(true);
  });
});
