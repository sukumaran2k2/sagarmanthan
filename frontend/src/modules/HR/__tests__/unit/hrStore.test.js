/* global describe, it, expect, jest, beforeEach, require */
import { useHrStore, CURRENT_YEAR } from '../../store/useHrStore';

jest.mock('../../api', () => ({
  fetchHrDepartments: jest.fn(() => Promise.resolve({ data: [{ department_id: '001', department_name: 'Marine' }] })),
  fetchMmtDropdown: jest.fn(() => Promise.resolve({ data: [{ organisation_id: 1, organisation_name: 'Chennai Port Authority' }] })),
}));
const api = require('../../api');
import { clearHrCache, dropCache, prefetchCache, readCache, writeCache } from '../../store/hrRequestCache';
import { resetAllStores } from '../../../../stores/resetRegistry';

const state = () => useHrStore.getState();

describe('HR list store', () => {
  beforeEach(() => resetAllStores());

  it('starts every list on page 1 with 10 rows', () => {
    ['employees', 'overview', 'anticipated', 'abolished', 'employeeDatabase', 'orgStructure', 'contractual', 'training']
      .forEach((key) => {
        expect(state()[key].currentPage).toBe(1);
        expect(state()[key].pageSize).toBe(10);
        expect(state()[key].visibleCols).toEqual({});
      });
    expect(state().anticipated.years).toEqual([CURRENT_YEAR]);
  });

  it('goes back to page 1 on a filter change or a new page size', () => {
    state().employeesActions.setCurrentPage(4);
    state().employeesActions.setFilters({ departmentId: '001' });
    expect(state().employees).toMatchObject({ currentPage: 1, departmentId: '001' });

    state().employeesActions.setCurrentPage(3);
    state().employeesActions.setPageSize(25);
    expect(state().employees).toMatchObject({ currentPage: 1, pageSize: 25 });
  });

  it('keeps the page when the debounced search did not change', () => {
    state().abolishedActions.setCurrentPage(5);
    state().abolishedActions.setDebouncedSearch('');
    expect(state().abolished.currentPage).toBe(5);
    state().abolishedActions.setDebouncedSearch('marine');
    expect(state().abolished).toMatchObject({ currentPage: 1, debouncedSearch: 'marine' });
  });

  it('changes only the page on setCurrentPage, and each list has its own slice', () => {
    state().overviewActions.setFilters({ abolishingOnly: true });
    state().overviewActions.setCurrentPage((p) => p + 1);
    expect(state().overview).toMatchObject({ currentPage: 2, abolishingOnly: true });
    expect(state().anticipated.currentPage).toBe(1);
  });

  it('keeps column visibility changes per list and resets them with the filters on logout', () => {
    state().trainingActions.setVisibleCols((prev) => ({ ...prev, Year: false }));
    expect(state().training.visibleCols).toEqual({ Year: false });
    expect(state().contractual.visibleCols).toEqual({});
    resetAllStores();
    expect(state().training.visibleCols).toEqual({});
  });

  it('loads reference data once per organisation', async () => {
    api.fetchHrDepartments.mockClear();
    api.fetchMmtDropdown.mockClear();
    await state().loadMasters(1);
    await state().loadMasters(1);
    expect(api.fetchHrDepartments).toHaveBeenCalledTimes(1);
    expect(api.fetchMmtDropdown).toHaveBeenCalledTimes(1);
    expect(state().departments).toHaveLength(1);
    expect(state().organisations[0].organisation_name).toBe('Chennai Port Authority');
  });

  it('resets everything on logout', () => {
    state().setVacancyTab('anticipated');
    state().employeesActions.setSearchTerm('asha');
    resetAllStores();
    expect(state().vacancyTab).toBe('overview');
    expect(state().employees.searchTerm).toBe('');
  });
});

describe('HR request cache', () => {
  beforeEach(() => clearHrCache());

  it('reads back fresh entries and drops them on demand', () => {
    writeCache('employees:{"page":1}', { rows: [1] });
    expect(readCache('employees:{"page":1}')).toEqual({ value: { rows: [1] }, fresh: true });
    dropCache('employees:{"page":1}');
    expect(readCache('employees:{"page":1}')).toBeNull();
  });

  it('keeps at most 80 entries, dropping the oldest', () => {
    for (let i = 0; i < 85; i += 1) writeCache(`k${i}`, i);
    expect(readCache('k0')).toBeNull();
    expect(readCache('k84').value).toBe(84);
  });

  it('prefetches once per key and stores the result', async () => {
    const fetcher = jest.fn(() => Promise.resolve('page 2'));
    prefetchCache('k', fetcher);
    prefetchCache('k', fetcher);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(readCache('k').value).toBe('page 2');
  });

  it('is cleared on logout', () => {
    writeCache('k', 1);
    resetAllStores();
    expect(readCache('k')).toBeNull();
  });
});
