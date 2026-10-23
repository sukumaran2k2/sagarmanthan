/* global jest, describe, it, expect, beforeEach */
import { useCslStore, CSL_SECTION_IDS } from '../../store/useCslStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchVesselsBuilt } from '../../api';

jest.mock('../../api', () => ({
  fetchVesselsBuilt: jest.fn(),
  fetchShipBuildingOrders: jest.fn(),
  fetchShipDeliveryPerformance: jest.fn(),
  fetchCapacityUtilization: jest.fn(),
  fetchFabricationOfSteels: jest.fn(),
  fetchShipsRepaired: jest.fn(),
}));

const state = () => useCslStore.getState();

describe('CSL store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('has one list slice and one set of actions per section', () => {
    expect(CSL_SECTION_IDS).toHaveLength(6);
    CSL_SECTION_IDS.forEach((id) => {
      expect(state()[id]).toMatchObject({ currentPage: 1, pageSize: 10, financialYear: '', searchTerm: '', visibleCols: null });
      expect(typeof state()[`${id}Actions`].setCurrentPage).toBe('function');
    });
  });

  it('setCurrentPage accepts a value or an updater function (pager buttons)', () => {
    const { vesselsBuiltActions } = state();
    vesselsBuiltActions.setCurrentPage(3);
    vesselsBuiltActions.setCurrentPage((p) => p + 1);
    expect(state().vesselsBuilt.currentPage).toBe(4);
  });

  it('returns to page 1 when the financial year or the debounced search changes', () => {
    const { shipsRepairedActions } = state();
    shipsRepairedActions.setCurrentPage(3);
    shipsRepairedActions.setFilters({ financialYear: '2025-2026' });
    expect(state().shipsRepaired).toMatchObject({ currentPage: 1, financialYear: '2025-2026' });

    shipsRepairedActions.setCurrentPage(2);
    shipsRepairedActions.setDebouncedSearch('');
    expect(state().shipsRepaired.currentPage).toBe(2); // unchanged search (debounce on mount) keeps the page
    shipsRepairedActions.setDebouncedSearch('Q4');
    expect(state().shipsRepaired).toMatchObject({ currentPage: 1, debouncedSearch: 'Q4' });
  });

  it('keeps the financial year and the search separate', () => {
    const { shipBuildingOrdersActions } = state();
    shipBuildingOrdersActions.setSearchTerm('Q4');
    shipBuildingOrdersActions.setFilters({ financialYear: '2025-2026' });
    expect(state().shipBuildingOrders).toMatchObject({ searchTerm: 'Q4', financialYear: '2025-2026' });
  });

  it('keeps each section separate', () => {
    state().capacityUtilizationActions.setCurrentPage(5);
    state().capacityUtilizationActions.setVisibleCols({ financial_year: false });
    expect(state().vesselsBuilt).toMatchObject({ currentPage: 1, visibleCols: null });
    expect(state().capacityUtilization.visibleCols).toEqual({ financial_year: false });
  });

  it('loads a section\'s financial years once, newest first, and retries after a failure', async () => {
    fetchVesselsBuilt.mockResolvedValue({ data: { data: [{ financial_year: '2024-2025' }, { financial_year: '2026-2027' }, { financial_year: '2024-2025' }] } });
    await state().loadYears('vesselsBuilt');
    await state().loadYears('vesselsBuilt');
    expect(fetchVesselsBuilt).toHaveBeenCalledTimes(1);
    expect(state().years.vesselsBuilt).toEqual(['2026-2027', '2024-2025']);

    resetAllStores();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchVesselsBuilt.mockRejectedValueOnce(new Error('down'));
    await state().loadYears('vesselsBuilt');
    expect(state().years.vesselsBuilt).toBeUndefined();
    console.error.mockRestore();
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().fabricationOfSteelsActions.setFilters({ financialYear: '2026-2027' });
    state().fabricationOfSteelsActions.setSearchTerm('May');
    resetAllStores();
    expect(state().fabricationOfSteels).toMatchObject({ financialYear: '', searchTerm: '', currentPage: 1 });
    expect(state().years).toEqual({});
  });
});
