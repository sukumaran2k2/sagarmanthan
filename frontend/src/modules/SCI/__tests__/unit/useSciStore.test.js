/* global describe, it, expect, beforeEach */
import { useSciStore, SCI_SECTION_IDS } from '../../store/useSciStore';
import { resetAllStores } from '../../../../stores/resetRegistry';

const state = () => useSciStore.getState();

describe('SCI store', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('has one list slice and one set of actions per section', () => {
    expect(SCI_SECTION_IDS).toHaveLength(13);
    SCI_SECTION_IDS.forEach((id) => {
      expect(state()[id]).toMatchObject({ currentPage: 1, pageSize: 10, financialYear: '', searchTerm: '', visibleCols: null });
      expect(typeof state()[`${id}Actions`].setCurrentPage).toBe('function');
    });
  });

  it('setCurrentPage accepts a value or an updater function (pager buttons)', () => {
    const { shipDryDockingActions } = state();
    shipDryDockingActions.setCurrentPage(2);
    shipDryDockingActions.setCurrentPage((p) => p + 1);
    expect(state().shipDryDocking.currentPage).toBe(3);
  });

  it('returns to page 1 when the year, the debounced search or the page size changes', () => {
    const { timeVoyageBulkActions } = state();
    timeVoyageBulkActions.setCurrentPage(3);
    timeVoyageBulkActions.setFilters({ financialYear: '2024-2025' });
    expect(state().timeVoyageBulk).toMatchObject({ currentPage: 1, financialYear: '2024-2025' });

    timeVoyageBulkActions.setCurrentPage(2);
    timeVoyageBulkActions.setDebouncedSearch('');
    expect(state().timeVoyageBulk.currentPage).toBe(2); // unchanged search (debounce on mount) keeps the page
    timeVoyageBulkActions.setDebouncedSearch('2023');
    expect(state().timeVoyageBulk.currentPage).toBe(1);

    timeVoyageBulkActions.setCurrentPage(2);
    timeVoyageBulkActions.setPageSize(25);
    expect(state().timeVoyageBulk).toMatchObject({ currentPage: 1, pageSize: 25 });
  });

  it('keeps each section separate', () => {
    state().manningOwnedShipsActions.setSearchTerm('2022');
    state().manningOwnedShipsActions.setVisibleCols({ financial_year: false });
    expect(state().vesselAvailOwnShips).toMatchObject({ searchTerm: '', visibleCols: null });
    expect(state().manningOwnedShips).toMatchObject({ searchTerm: '2022', visibleCols: { financial_year: false } });
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().vesselProcurementActions.setFilters({ financialYear: '2026-2027' });
    state().vesselProcurementActions.setCurrentPage(4);
    resetAllStores();
    expect(state().vesselProcurement).toMatchObject({ financialYear: '', currentPage: 1 });
  });
});
