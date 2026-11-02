/* global jest, describe, it, expect, beforeEach */
import { useTrafficStore } from '../../store/useTrafficStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchTrafficMasters } from '../../api';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';

jest.mock('../../api', () => ({
  fetchTrafficMasters: jest.fn(),
}));

beforeEach(() => resetAllStores());

describe.each([
  ['actuals', 'actualsActions'],
  ['targets', 'targetsActions'],
  ['access', 'accessActions'],
])('useTrafficStore %s list', (sliceKey, actionsKey) => {
  const slice = () => useTrafficStore.getState()[sliceKey];
  const actions = () => useTrafficStore.getState()[actionsKey];

  it('setCurrentPage accepts a value or an updater function (Prev/Next buttons)', () => {
    actions().setCurrentPage(3);
    expect(slice().currentPage).toBe(3);

    actions().setCurrentPage((prev) => Math.min(5, prev + 1));
    expect(slice().currentPage).toBe(4);

    actions().setCurrentPage((prev) => Math.max(1, prev - 1));
    expect(slice().currentPage).toBe(3);
  });

  it('keeps the current page when the debounced search did not change (remount)', () => {
    actions().setCurrentPage(3);
    actions().setDebouncedSearch('');
    expect(slice().currentPage).toBe(3);
  });

  it('returns to page 1 when the debounced search changes', () => {
    actions().setCurrentPage(3);
    actions().setDebouncedSearch('chennai');
    expect(slice().debouncedSearch).toBe('chennai');
    expect(slice().currentPage).toBe(1);
  });

  it('returns to page 1 when a filter or the page size changes', () => {
    actions().setCurrentPage(4);
    actions().setFilters({ organisationId: '9' });
    expect(slice().organisationId).toBe('9');
    expect(slice().currentPage).toBe(1);

    actions().setCurrentPage(4);
    actions().setPageSize(50);
    expect(slice().pageSize).toBe(50);
    expect(slice().currentPage).toBe(1);
  });

  it('only changes its own list', () => {
    const others = ['actuals', 'targets', 'access'].filter((k) => k !== sliceKey);
    actions().setCurrentPage(7);
    others.forEach((k) => expect(useTrafficStore.getState()[k].currentPage).toBe(1));
  });

  it('resetFilters clears filters but keeps the search text', () => {
    actions().setSearchTerm('port');
    actions().setFilters({ organisationId: '9', fiscalYear: '2020-2021' });
    actions().resetFilters();
    expect(slice().organisationId).toBe('');
    expect(slice().searchTerm).toBe('port');
  });

  it('resetAllStores restores defaults (logout)', () => {
    actions().setSearchTerm('port');
    actions().setFilters({ organisationId: '9' });
    actions().setCurrentPage(4);
    actions().setShowFilterPanel(true);

    resetAllStores();

    expect(slice().searchTerm).toBe('');
    expect(slice().organisationId).toBe('');
    expect(slice().currentPage).toBe(1);
    expect(slice().showFilterPanel).toBe(false);
  });
});

describe('useTrafficStore Data List defaults', () => {
  it('opens on the current financial year and returns to it on reset', () => {
    const { actuals, actualsActions } = useTrafficStore.getState();
    expect(actuals.fiscalYear).toBe(currentFinancialYear());

    actualsActions.setFilters({ fiscalYear: '' });
    expect(useTrafficStore.getState().actuals.fiscalYear).toBe('');

    actualsActions.resetFilters();
    expect(useTrafficStore.getState().actuals.fiscalYear).toBe(currentFinancialYear());
  });

  it('switching the view returns to page 1 and keeps the filters', () => {
    const { actualsActions } = useTrafficStore.getState();
    actualsActions.setFilters({ month: '5' });
    actualsActions.setCurrentPage(3);
    actualsActions.setActiveView('commodity');

    const { actuals } = useTrafficStore.getState();
    expect(actuals.activeView).toBe('commodity');
    expect(actuals.currentPage).toBe(1);
    expect(actuals.month).toBe('5');
  });

  it('does not keep the period being edited in the store', () => {
    const state = useTrafficStore.getState();
    expect(state).not.toHaveProperty('editData');
    expect(state.actuals).not.toHaveProperty('editData');
  });
});

describe('useTrafficStore.loadMasters', () => {
  it('loads reference data once and caches it', async () => {
    fetchTrafficMasters.mockResolvedValue({
      data: {
        commodityGroups: [{ commodity_group_id: 4, commodity_group_name: 'Container' }],
        commodities: [{ commodity_id: 28, commodity_group_id: 4, commodity_name: 'Container (In 000 TEUs)' }],
        organisations: [{ organisation_id: 9, organisation_name: 'JNPA' }],
      },
    });

    await useTrafficStore.getState().loadMasters();
    await useTrafficStore.getState().loadMasters();

    const state = useTrafficStore.getState();
    expect(fetchTrafficMasters).toHaveBeenCalledTimes(1);
    expect(state.commodities).toHaveLength(1);
    expect(state.organisations).toHaveLength(1);
    expect(state.mastersError).toBeNull();
    expect(state.loadingMasters).toBe(false);
  });

  it('surfaces an error instead of failing silently', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchTrafficMasters.mockRejectedValue(new Error('network'));

    await useTrafficStore.getState().loadMasters();

    expect(useTrafficStore.getState().mastersError).toBeTruthy();
    expect(useTrafficStore.getState().loadingMasters).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('useTrafficStore Targets list', () => {
  it('hides Last Updated until switched on, and Show All brings it back', () => {
    const { targetsActions } = useTrafficStore.getState();
    expect(useTrafficStore.getState().targets.visibleCols).toEqual({ last_updated: false });

    targetsActions.setVisibleCols({});
    expect(useTrafficStore.getState().targets.visibleCols).toEqual({});

    useTrafficStore.getState().reset();
    expect(useTrafficStore.getState().targets.visibleCols).toEqual({ last_updated: false });
  });
});
