/* global jest, describe, it, expect, beforeEach */
import { useCapexStore } from '../../store/useCapexStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchCapexDataEntry } from '../../api';

jest.mock('../../api', () => ({
  fetchCapexDataEntry: jest.fn(),
}));

const state = () => useCapexStore.getState();

describe('Capex store', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
  });

  it('starts with the same defaults the module had before', () => {
    expect(state()).toMatchObject({
      organisations: [],
      searchTerm: '',
      debouncedSearch: '',
      page: 1,
      pageSize: 10,
      filterYear: '2026-2027',
      filterOrg: '',
      showFilterPanel: false,
      visibleCols: {},
      dashboardYear: null,
      dashboardGroupId: 'all',
      dashboardOrganisationId: 'all',
      activeReport: 'detailed',
    });
  });

  it('setters accept values or updater functions, like useState', () => {
    state().setPage(3);
    state().setPage((p) => p + 1);
    expect(state().page).toBe(4);
    state().setShowFilterPanel((open) => !open);
    expect(state().showFilterPanel).toBe(true);
    state().setVisibleCols((cols) => ({ ...cols, organisation_name: false }));
    expect(state().visibleCols).toEqual({ organisation_name: false });
    state().setDashboardYear((picked) => picked ?? '2025-2026');
    state().setDashboardYear((picked) => picked ?? '2024-2025');
    expect(state().dashboardYear).toBe('2025-2026');
  });

  it('setters change only their own field (page resets stay in the page)', () => {
    state().setPage(5);
    state().setFilterYear('2024-2025');
    state().setSearchTerm('port');
    expect(state()).toMatchObject({ page: 5, filterYear: '2024-2025', searchTerm: 'port' });
  });

  it('loads organisations once, and retries if the load failed', async () => {
    fetchCapexDataEntry
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({ data: { organisations: [{ organisation_id: 1 }] } });
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await state().loadOrganisations();
    expect(state()).toMatchObject({ organisations: [], organisationsLoaded: false });
    await state().loadOrganisations();
    await state().loadOrganisations();
    expect(state()).toMatchObject({ organisations: [{ organisation_id: 1 }], organisationsLoaded: true });
    expect(fetchCapexDataEntry).toHaveBeenCalledTimes(2);
    console.warn.mockRestore();
  });

  it('accepts an organisations list returned as a plain array', async () => {
    fetchCapexDataEntry.mockResolvedValue({ data: [{ id: 7 }] });
    await state().loadOrganisations();
    expect(state().organisations).toEqual([{ id: 7 }]);
  });

  it('resetAllStores restores defaults (logout)', async () => {
    fetchCapexDataEntry.mockResolvedValue({ data: [{ id: 7 }] });
    await state().loadOrganisations();
    state().setFilterOrg('7');
    state().setDashboardYear('2025-2026');
    state().setActiveReport('yoy');
    resetAllStores();
    expect(state()).toMatchObject({
      organisations: [],
      organisationsLoaded: false,
      filterOrg: '',
      dashboardYear: null,
      activeReport: 'detailed',
    });
  });
});
