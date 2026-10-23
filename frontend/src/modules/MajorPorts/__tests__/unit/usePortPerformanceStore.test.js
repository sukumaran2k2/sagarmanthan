/* global jest, describe, it, expect, beforeEach */
import { usePortPerformanceStore } from '../../store/usePortPerformanceStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchPortPerformanceMasters } from '../../api';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';

jest.mock('../../api', () => ({
  fetchPortPerformanceMasters: jest.fn(),
}));

const state = () => usePortPerformanceStore.getState();

beforeEach(() => {
  resetAllStores();
  fetchPortPerformanceMasters.mockReset();
});

describe('usePortPerformanceStore', () => {
  it('opens Actuals on the turnaround view of the current financial year', () => {
    expect(state().actuals.activeView).toBe('turnaround');
    expect(state().actuals.fiscalYear).toBe(currentFinancialYear());
    expect(state().targets.fiscalYear).toBe('');
    expect(state().access.status).toBe('ACTIVE');
  });

  it('returns to page 1 when the view, a filter or the access status changes', () => {
    state().actualsActions.setCurrentPage(4);
    state().actualsActions.setActiveView('callSize');
    expect(state().actuals.activeView).toBe('callSize');
    expect(state().actuals.currentPage).toBe(1);

    state().targetsActions.setCurrentPage(3);
    state().targetsActions.setFilters({ organisationId: 'overall' });
    expect(state().targets.currentPage).toBe(1);

    state().accessActions.setCurrentPage(2);
    state().accessActions.setStatus('REVOKED');
    expect(state().access).toMatchObject({ status: 'REVOKED', currentPage: 1 });
  });

  it('resets filters back to the current financial year, keeping the view', () => {
    state().actualsActions.setActiveView('productivity');
    state().actualsActions.setFilters({ fiscalYear: '', month: '6', organisationId: '9' });
    state().actualsActions.resetFilters();
    expect(state().actuals).toMatchObject({
      activeView: 'productivity', fiscalYear: currentFinancialYear(), month: '', organisationId: '',
    });
  });

  it('toggles column visibility per list', () => {
    state().actualsActions.setVisibleCols((prev) => ({ ...prev, average_trt_overall: false }));
    expect(state().actuals.visibleCols).toEqual({ average_trt_overall: false });
    expect(state().targets.visibleCols).toEqual({ last_updated: false });
  });

  it('loads the reference data once, and again after a failure', async () => {
    fetchPortPerformanceMasters.mockRejectedValueOnce(new Error('down'));
    await state().loadMasters();
    expect(state().mastersError).toBe('Port performance reference data');

    fetchPortPerformanceMasters.mockResolvedValue({
      data: { organisations: [{ organisation_id: 9, organisation_name: 'JNPA' }], kpiTypes: [{ kpi_type_id: 1, kpi_name: 'Target Avg Vessel TRT' }] },
    });
    await state().loadMasters();
    await state().loadMasters();
    expect(fetchPortPerformanceMasters).toHaveBeenCalledTimes(2);
    expect(state()).toMatchObject({ mastersError: null, mastersLoaded: true });
    expect(state().kpiTypes).toHaveLength(1);
  });

  it('forgets everything on logout', () => {
    usePortPerformanceStore.setState({ organisations: [{ organisation_id: 9 }], mastersLoaded: true });
    state().actualsActions.setFilters({ month: '5' });
    resetAllStores();
    expect(state()).toMatchObject({ organisations: [], mastersLoaded: false });
    expect(state().actuals.month).toBe('');
  });
});
