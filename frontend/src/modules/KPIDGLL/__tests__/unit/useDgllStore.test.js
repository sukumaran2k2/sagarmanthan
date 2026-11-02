/* global jest, describe, it, expect, beforeEach */
import { useDgllStore, DGLL_LIST_IDS } from '../../store/useDgllStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchTargetDetails, fetchFinancialPerformance, fetchStates, fetchDistricts } from '../../api';

jest.mock('../../api', () => ({
  fetchStates: jest.fn(),
  fetchDistricts: jest.fn(),
  fetchVtmsIntegration: jest.fn(),
  fetchNaisUptime: jest.fn(),
  fetchNaisIntegration: jest.fn(),
  fetchTouristDestinations: jest.fn(),
  fetchTargetDetails: jest.fn(),
  fetchFinancialPerformance: jest.fn(),
}));

const state = () => useDgllStore.getState();

describe('DGLL store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('has one list slice and one set of actions per list (Tourist Destinations has two)', () => {
    expect(DGLL_LIST_IDS).toHaveLength(7);
    DGLL_LIST_IDS.forEach((id) => {
      expect(state()[id]).toMatchObject({ currentPage: 1, pageSize: 10, searchTerm: '', visibleCols: null });
      expect(typeof state()[`${id}Actions`].setCurrentPage).toBe('function');
    });
    expect(state().lightHouseMaster.status).toBe('active');
    expect(state().vtmsIntegration.financialYear).toBe('');
    expect(state().touristTable).toBe('destination');
  });

  it('returns to page 1 but keeps the search when the Light House status changes', () => {
    const { lightHouseMasterActions } = state();
    lightHouseMasterActions.setSearchTerm('Kovalam');
    lightHouseMasterActions.setCurrentPage(3);
    lightHouseMasterActions.setFilters({ status: 'inactive' });
    expect(state().lightHouseMaster).toMatchObject({ status: 'inactive', currentPage: 1, searchTerm: 'Kovalam' });
  });

  it('returns to page 1 when the year or the debounced search changes', () => {
    const { naisUptimeActions } = state();
    naisUptimeActions.setCurrentPage(3);
    naisUptimeActions.setFilters({ financialYear: '2024-2025' });
    expect(state().naisUptime).toMatchObject({ currentPage: 1, financialYear: '2024-2025' });

    naisUptimeActions.setCurrentPage((p) => p + 1);
    naisUptimeActions.setDebouncedSearch('');
    expect(state().naisUptime.currentPage).toBe(2); // unchanged search (debounce on mount) keeps the page
    naisUptimeActions.setDebouncedSearch('98');
    expect(state().naisUptime).toMatchObject({ currentPage: 1, debouncedSearch: '98' });
  });

  it('keeps the two Tourist Destinations tables separate', () => {
    state().touristDestinationsActions.setCurrentPage(2);
    state().touristTargetsActions.setFilters({ financialYear: '2026-2027' });
    state().setTouristTable('target');
    expect(state().touristTable).toBe('target');
    expect(state().touristDestinations).toMatchObject({ currentPage: 2, financialYear: '' });
    expect(state().touristTargets).toMatchObject({ currentPage: 1, financialYear: '2026-2027' });
  });

  it('loads years from each list\'s own field, once, newest first, and retries after a failure', async () => {
    fetchTargetDetails.mockResolvedValue({ data: { data: [{ year: '2025-2026' }, { year: '2027-2028' }, { year: '2025-2026' }] } });
    await state().loadYears('touristTargets');
    await state().loadYears('touristTargets');
    expect(fetchTargetDetails).toHaveBeenCalledTimes(1);
    expect(fetchTargetDetails).toHaveBeenCalledWith(1, { page: 1, limit: 100 });
    expect(state().years.touristTargets).toEqual(['2027-2028', '2025-2026']);

    fetchFinancialPerformance.mockResolvedValue({ data: { data: [{ financialyear: '2023-2024' }] } });
    await state().loadYears('financialPerformance');
    expect(state().years.financialPerformance).toEqual(['2023-2024']);

    resetAllStores();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchTargetDetails.mockRejectedValueOnce(new Error('down'));
    await state().loadYears('touristTargets');
    expect(state().years.touristTargets).toBeUndefined();
    console.error.mockRestore();
  });

  it('does not fetch years for Light House Master (filtered by status)', async () => {
    await state().loadYears('lightHouseMaster');
    expect(state().years.lightHouseMaster).toBeUndefined();
  });

  it('loads states and districts once, and retries if one failed', async () => {
    fetchStates.mockResolvedValue({ data: [{ state_id: 1 }] });
    fetchDistricts.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ data: [{ district_id: 7 }] });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await state().loadLookups();
    expect(state()).toMatchObject({ states: [{ state_id: 1 }], districts: [], lookupsLoaded: false });
    await state().loadLookups();
    await state().loadLookups();
    expect(state()).toMatchObject({ districts: [{ district_id: 7 }], lookupsLoaded: true });
    expect(fetchDistricts).toHaveBeenCalledTimes(2);
    console.error.mockRestore();
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().lightHouseMasterActions.setFilters({ status: 'inactive' });
    state().setTouristTable('target');
    state().vtmsIntegrationActions.setVisibleCols({ financial_year: false });
    resetAllStores();
    expect(state().lightHouseMaster.status).toBe('active');
    expect(state().touristTable).toBe('destination');
    expect(state().vtmsIntegration.visibleCols).toBeNull();
    expect(state().years).toEqual({});
  });
});
