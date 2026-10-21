/* global jest, describe, it, expect, beforeEach */
import { useFinancialParametersStore } from '../../store/useFinancialParametersStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchFinancialParameterMasters } from '../../api';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';

jest.mock('../../api', () => ({
  fetchFinancialParameterMasters: jest.fn(),
}));

const state = () => useFinancialParametersStore.getState();

beforeEach(() => {
  resetAllStores();
  fetchFinancialParameterMasters.mockReset();
});

describe('useFinancialParametersStore', () => {
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

  it('keeps column visibility per list', () => {
    state().actualsActions.setVisibleCols((prev) => ({ ...prev, net_surplus: false }));
    expect(state().actuals.visibleCols).toEqual({ net_surplus: false });
    expect(state().targets.visibleCols).toEqual({});
  });

  it('loads the reference data once, and again after a failure', async () => {
    fetchFinancialParameterMasters.mockRejectedValueOnce(new Error('down'));
    await state().loadMasters();
    expect(state().mastersError).toBe('Financial parameter reference data');

    fetchFinancialParameterMasters.mockResolvedValue({
      data: { organisations: [{ organisation_id: 9, organisation_name: 'JNPA' }] },
    });
    await state().loadMasters();
    await state().loadMasters();
    expect(fetchFinancialParameterMasters).toHaveBeenCalledTimes(2);
    expect(state().organisations).toHaveLength(1);
    expect(state().mastersError).toBeNull();
  });

  it('forgets everything on logout', async () => {
    fetchFinancialParameterMasters.mockResolvedValue({ data: { organisations: [{ organisation_id: 9 }] } });
    await state().loadMasters();
    state().actualsActions.setFilters({ month: '6' });
    resetAllStores();
    expect(state().organisations).toEqual([]);
    expect(state().mastersLoaded).toBe(false);
    expect(state().actuals.month).toBe('');
  });
});
