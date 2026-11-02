/* global jest, describe, it, expect, beforeEach */
import { useOvodStore } from '../../store/useOvodStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchOrganisations } from '../../api';

jest.mock('../../api', () => ({
  fetchOrganisations: jest.fn(),
}));

const get = () => useOvodStore.getState();

beforeEach(() => {
  resetAllStores();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Data List slice', () => {
  it('starts on the All tab, page 1, with every filter on "show all"', () => {
    const { dataList } = get();
    expect(dataList.activeTab).toBe('all');
    expect(dataList.currentPage).toBe(1);
    expect(dataList.pageSize).toBe(10);
    expect(Object.values(dataList.filters).every((v) => v === '0')).toBe(true);
    expect(Object.keys(dataList.filters)).toHaveLength(10);
  });

  it('setDataListPage accepts a number or an updater function (Prev/Next buttons)', () => {
    get().setDataListPage(3);
    expect(get().dataList.currentPage).toBe(3);

    get().setDataListPage((prev) => Math.min(5, prev + 1));
    expect(get().dataList.currentPage).toBe(4);

    get().setDataListPage((prev) => Math.max(1, prev - 1));
    expect(get().dataList.currentPage).toBe(3);
  });

  it.each([
    ['changing a filter', () => get().setDataListFilter('wing', 'Ports')],
    ['changing the status tab', () => get().setDataListTab('completed')],
    ['typing a search', () => get().setDataListSearch('port')],
    ['changing the page size', () => get().setDataListPageSize(50)],
  ])('returns to page 1 after %s', (_label, act) => {
    get().setDataListPage(4);
    act();
    expect(get().dataList.currentPage).toBe(1);
  });

  it('changing one filter leaves the others alone', () => {
    get().setDataListFilter('wing', 'Ports');
    get().setDataListFilter('stage', 'Completed');
    expect(get().dataList.filters.wing).toBe('Ports');
    expect(get().dataList.filters.stage).toBe('Completed');
    expect(get().dataList.filters.org).toBe('0');
  });

  it('resetDataListFilters clears every filter and the search text', () => {
    get().setDataListFilter('wing', 'Ports');
    get().setDataListSearch('port');
    get().setDataListPage(3);
    get().resetDataListFilters();

    const { dataList } = get();
    expect(Object.values(dataList.filters).every((v) => v === '0')).toBe(true);
    expect(dataList.searchTerm).toBe('');
    expect(dataList.currentPage).toBe(1);
  });

  it('toggles a column without touching the others', () => {
    get().toggleDataListColumn('a1');
    expect(get().dataList.colVisibility.a1).toBe(false);
    expect(get().dataList.colVisibility.a2).toBe(true);
    get().toggleDataListColumn('a1');
    expect(get().dataList.colVisibility.a1).toBe(true);
  });

  it('keeps the page and filters when the list is closed and reopened', () => {
    get().setDataListFilter('wing', 'Ports');
    get().setDataListPage(3);
    // Nothing runs on unmount, so a remount reads the same values
    expect(get().dataList.filters.wing).toBe('Ports');
    expect(get().dataList.currentPage).toBe(3);
  });
});

describe('Dashboard and Intervention List slices', () => {
  it('the dashboard opens with its filter panel visible; the intervention list does not', () => {
    expect(get().dashboard.showFilterPanel).toBe(true);
    expect(get().interventions.showFilterPanel).toBe(false);
  });

  it('keeps the dashboard and intervention filters separate', () => {
    get().setDashboardFilter('wing', '3');
    get().setInterventionFilter('wing', '5');
    expect(get().dashboard.filters.wing).toBe('3');
    expect(get().interventions.filters.wing).toBe('5');
  });

  it('resets the dashboard filters', () => {
    get().setDashboardFilter('vision', '1');
    get().setDashboardFilter('mivChapter', '2');
    get().resetDashboardFilters();
    expect(Object.values(get().dashboard.filters).every((v) => v === '0')).toBe(true);
    expect(Object.keys(get().dashboard.filters)).toHaveLength(7);
  });

  it('the intervention list keeps a page size of 25 and resets filters together with the search', () => {
    expect(get().interventions.pageSize).toBe(25);
    get().setInterventionFilter('status', '4');
    get().setInterventionSearch('port');
    get().resetInterventionFilters();
    expect(get().interventions.filters.status).toBe('0');
    expect(get().interventions.searchTerm).toBe('');
    expect(get().interventions.pageSize).toBe(25);
  });
});

describe('Report slices', () => {
  it('remembers the Performance Report tab and vision', () => {
    get().setReportsTab('org');
    get().setReportsVision('2');
    expect(get().reports.activeTab).toBe('org');
    expect(get().reports.selectedVision).toBe('2');
  });

  it('switching the status sub-report clears the search; re-selecting the same one does not', () => {
    get().setStatusReportSearch('mumbai');
    get().setStatusReportTab('ministry');
    expect(get().statusReport.searchQuery).toBe('mumbai');

    get().setStatusReportTab('vibhas');
    expect(get().statusReport.activeTab).toBe('vibhas');
    expect(get().statusReport.searchQuery).toBe('');
  });
});

describe('organisations (reference data)', () => {
  it('caches the list once and normalises it to ia_id / ia_name', async () => {
    fetchOrganisations.mockResolvedValue([{ ia_id: 7, ia_name: 'Mumbai Port Authority' }]);

    await get().loadOrganisations();
    await get().loadOrganisations();

    expect(fetchOrganisations).toHaveBeenCalledTimes(1);
    expect(get().organisations).toEqual([{ ia_id: 7, ia_name: 'Mumbai Port Authority' }]);
    expect(get().loadingOrganisations).toBe(false);
  });

  it('accepts the older organisation_id / organisation_name field names', async () => {
    fetchOrganisations.mockResolvedValue([{ organisation_id: 3, organisation_name: 'IWAI' }]);
    await get().loadOrganisations();
    expect(get().organisations).toEqual([{ ia_id: 3, ia_name: 'IWAI' }]);
  });

  it('does not start a second request while one is in flight', async () => {
    let finish;
    fetchOrganisations.mockReturnValue(new Promise((resolve) => { finish = resolve; }));

    const first = get().loadOrganisations();
    const second = get().loadOrganisations();
    finish([{ ia_id: 1, ia_name: 'A' }]);
    await Promise.all([first, second]);

    expect(fetchOrganisations).toHaveBeenCalledTimes(1);
  });

  it('does not cache an empty answer, so the next page tries again', async () => {
    fetchOrganisations.mockResolvedValue([]);
    await get().loadOrganisations();
    expect(get().organisations).toEqual([]);

    fetchOrganisations.mockResolvedValue([{ ia_id: 1, ia_name: 'A' }]);
    await get().loadOrganisations();
    expect(get().organisations).toHaveLength(1);
  });

  it('recovers from a failed request', async () => {
    fetchOrganisations.mockRejectedValue(new Error('network'));
    await get().loadOrganisations();
    expect(get().loadingOrganisations).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});

describe('reset and what the store does not hold', () => {
  it('logout (resetAllStores) restores every slice, including cached organisations', async () => {
    fetchOrganisations.mockResolvedValue([{ ia_id: 1, ia_name: 'A' }]);
    await get().loadOrganisations();
    get().setDataListFilter('wing', 'Ports');
    get().setDataListPage(4);
    get().setDashboardFilter('vision', '1');
    get().setInterventionSearch('port');
    get().setReportsTab('port');
    get().setStatusReportSearch('x');

    resetAllStores();

    expect(get().organisations).toEqual([]);
    expect(get().dataList.filters.wing).toBe('0');
    expect(get().dataList.currentPage).toBe(1);
    expect(get().dashboard.filters.vision).toBe('0');
    expect(get().interventions.searchTerm).toBe('');
    expect(get().reports.activeTab).toBe('wing');
    expect(get().statusReport.searchQuery).toBe('');
  });

  it('a reset does not share objects with the previous state', () => {
    get().setDataListFilter('wing', 'Ports');
    const before = get().dataList.filters;
    resetAllStores();
    expect(get().dataList.filters).not.toBe(before);
    expect(before.wing).toBe('Ports');
  });

  it('does not keep the edit record, fetched rows or drilldowns', () => {
    const state = get();
    expect(state).not.toHaveProperty('editData');
    expect(state).not.toHaveProperty('editingItem');
    expect(state).not.toHaveProperty('actionItems');
    expect(state).not.toHaveProperty('drilldownTarget');
  });
});
