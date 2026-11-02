/* global jest, describe, it, expect, beforeEach */
import { useImuStore, IMU_SECTION_IDS } from '../../store/useImuStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchResearch } from '../../api';

jest.mock('../../api', () => ({
  fetchStudentEnrollment: jest.fn(),
  fetchNewCourseUpgradation: jest.fn(),
  fetchFacilities: jest.fn(),
  fetchPartnership: jest.fn(),
  fetchResearch: jest.fn(),
}));

const state = () => useImuStore.getState();

describe('IMU store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('has one list slice and one set of actions per section', () => {
    expect(IMU_SECTION_IDS).toHaveLength(6);
    IMU_SECTION_IDS.forEach((id) => {
      expect(state()[id]).toMatchObject({ currentPage: 1, pageSize: 10, financialYear: '', searchTerm: '', visibleCols: null });
      expect(typeof state()[`${id}Actions`].setCurrentPage).toBe('function');
    });
  });

  it('setCurrentPage accepts a value or an updater function (pager buttons)', () => {
    const { researchActions } = state();
    researchActions.setCurrentPage(3);
    researchActions.setCurrentPage((p) => p + 1);
    expect(state().research.currentPage).toBe(4);
  });

  it('returns to page 1 when the financial year or the debounced search changes', () => {
    const { facilitiesActions } = state();
    facilitiesActions.setCurrentPage(3);
    facilitiesActions.setFilters({ financialYear: '2025-2026' });
    expect(state().facilities).toMatchObject({ currentPage: 1, financialYear: '2025-2026' });

    facilitiesActions.setCurrentPage(2);
    facilitiesActions.setDebouncedSearch('');
    expect(state().facilities.currentPage).toBe(2); // unchanged search (debounce on mount) keeps the page
    facilitiesActions.setDebouncedSearch('2024');
    expect(state().facilities).toMatchObject({ currentPage: 1, debouncedSearch: '2024' });
  });

  it('keeps Final Year Pass % search, page size and page (paged in the browser)', () => {
    const { finalYearPassPercentageActions } = state();
    finalYearPassPercentageActions.setSearchTerm('B.Tech');
    finalYearPassPercentageActions.setPageSize(20);
    finalYearPassPercentageActions.setCurrentPage(2);
    expect(state().finalYearPassPercentage).toMatchObject({ searchTerm: 'B.Tech', pageSize: 20, currentPage: 2 });
  });

  it('keeps each section separate', () => {
    state().partnershipActions.setCurrentPage(5);
    state().partnershipActions.setVisibleCols({ financial_year: false });
    expect(state().studentEnrollment).toMatchObject({ currentPage: 1, visibleCols: null });
    expect(state().partnership.visibleCols).toEqual({ financial_year: false });
  });

  it('loads a section\'s financial years once, newest first, and retries after a failure', async () => {
    fetchResearch.mockResolvedValue({ data: { data: [{ financial_year: '2024-2025' }, { financial_year: '2025-2026' }, { financial_year: '2024-2025' }] } });
    await state().loadYears('research');
    await state().loadYears('research');
    expect(fetchResearch).toHaveBeenCalledTimes(1);
    expect(fetchResearch).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(state().years.research).toEqual(['2025-2026', '2024-2025']);

    resetAllStores();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchResearch.mockRejectedValueOnce(new Error('down'));
    await state().loadYears('research');
    expect(state().years.research).toBeUndefined();
    console.error.mockRestore();
  });

  it('does not fetch years for Final Year Pass % (no financial year)', async () => {
    await state().loadYears('finalYearPassPercentage');
    expect(state().years.finalYearPassPercentage).toBeUndefined();
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().studentEnrollmentActions.setFilters({ financialYear: '2026-2027' });
    state().studentEnrollmentActions.setSearchTerm('2026');
    resetAllStores();
    expect(state().studentEnrollment).toMatchObject({ financialYear: '', searchTerm: '', currentPage: 1 });
    expect(state().years).toEqual({});
  });
});
