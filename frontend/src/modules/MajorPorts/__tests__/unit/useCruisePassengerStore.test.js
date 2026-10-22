/* global jest, describe, it, expect, beforeEach */
import { useCruisePassengerStore } from '../../store/useCruisePassengerStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchCruisePassengerMasters } from '../../api';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';

jest.mock('../../api', () => ({
  fetchCruisePassengerMasters: jest.fn(),
}));

const state = () => useCruisePassengerStore.getState();

beforeEach(() => {
  resetAllStores();
  fetchCruisePassengerMasters.mockReset();
});

describe('useCruisePassengerStore', () => {
  it('opens Actuals on the current financial year and Targets on every year', () => {
    expect(state().actuals.fiscalYear).toBe(currentFinancialYear());
    expect(state().targets.fiscalYear).toBe('');
    expect(state().actuals.currentPage).toBe(1);
  });

  it('returns to page 1 when a filter or the page size changes', () => {
    state().actualsActions.setCurrentPage(4);
    state().actualsActions.setFilters({ month: '6' });
    expect(state().actuals).toMatchObject({ month: '6', currentPage: 1 });

    state().targetsActions.setCurrentPage(3);
    state().targetsActions.setPageSize(50);
    expect(state().targets).toMatchObject({ pageSize: 50, currentPage: 1 });
  });

  it('resets filters back to the current financial year', () => {
    state().actualsActions.setFilters({ fiscalYear: '', month: '6', organisationId: '9' });
    state().actualsActions.resetFilters();
    expect(state().actuals).toMatchObject({ fiscalYear: currentFinancialYear(), month: '', organisationId: '' });
  });

  it('loads the organisations once', async () => {
    fetchCruisePassengerMasters.mockResolvedValue({
      data: { organisations: [{ organisation_id: 2, organisation_name: 'Cochin Port Authority' }] },
    });
    await state().loadMasters();
    await state().loadMasters();
    expect(fetchCruisePassengerMasters).toHaveBeenCalledTimes(1);
    expect(state().organisations).toHaveLength(1);
  });

  it('reports a failed load and clears everything on logout', async () => {
    fetchCruisePassengerMasters.mockRejectedValue(new Error('offline'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await state().loadMasters();
    expect(state().mastersError).toBe('Cruise and passenger traffic reference data');

    state().actualsActions.setFilters({ month: '5' });
    resetAllStores();
    expect(state().mastersError).toBeNull();
    expect(state().actuals.month).toBe('');
    console.error.mockRestore();
  });
});
