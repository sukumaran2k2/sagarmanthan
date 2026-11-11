/* global jest, describe, it, expect, beforeEach */
import { useGemStore } from '../../store/useGemStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchOrganisationsDropdown } from '../../api';
import { getCurrentFinancialYear } from '../../utils/gemUtils';

jest.mock('../../api', () => ({
  fetchOrganisationsDropdown: jest.fn(),
}));

const state = () => useGemStore.getState();

describe('GEM Procurement store', () => {
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
      filterYear: getCurrentFinancialYear(),
      filterOrg: '',
      showFilterPanel: false,
      visibleCols: {},
      activeReport: 'detailed',
    });
  });

  it('setters accept values or updater functions, like useState', () => {
    state().setPage(2);
    state().setPage((p) => p + 1);
    expect(state().page).toBe(3);
    state().setShowFilterPanel((open) => !open);
    expect(state().showFilterPanel).toBe(true);
    state().setVisibleCols((cols) => ({ ...cols, 'Last Updated Date': false }));
    expect(state().visibleCols).toEqual({ 'Last Updated Date': false });
  });

  it('loads organisations once, reports a failure and retries next time', async () => {
    fetchOrganisationsDropdown
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({ data: { organisations: [{ organisation_id: 1 }] } });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(state().loadOrganisations()).resolves.toBe(false);
    expect(state()).toMatchObject({ organisations: [], organisationsLoaded: false });
    await expect(state().loadOrganisations()).resolves.toBe(true);
    await expect(state().loadOrganisations()).resolves.toBe(true);
    expect(state()).toMatchObject({ organisations: [{ organisation_id: 1 }], organisationsLoaded: true });
    expect(fetchOrganisationsDropdown).toHaveBeenCalledTimes(2);
    console.error.mockRestore();
  });

  it('accepts an organisations list returned as a plain array', async () => {
    fetchOrganisationsDropdown.mockResolvedValue({ data: [{ id: 7 }] });
    await state().loadOrganisations();
    expect(state().organisations).toEqual([{ id: 7 }]);
  });

  it('resetAllStores restores defaults (logout)', () => {
    state().setFilterYear('2024-2025');
    state().setSearchTerm('goods');
    state().setActiveReport('yoy');
    resetAllStores();
    expect(state()).toMatchObject({ filterYear: getCurrentFinancialYear(), searchTerm: '', activeReport: 'detailed' });
  });
});
