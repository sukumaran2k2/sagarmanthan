/* global jest, describe, it, expect, beforeEach */
import { useYpStore } from '../../../modules/YoungProfessionals/store/useYpStore';
import { useCaStore } from '../../../modules/ConsultantAppointment/store/useCaStore';
import { resetAllStores } from '../../resetRegistry';
import { fetchWings as fetchYpWings, fetchDivisions as fetchYpDivisions } from '../../../modules/YoungProfessionals/api';

jest.mock('../../../modules/YoungProfessionals/api', () => ({
  fetchWings: jest.fn(),
  fetchDivisions: jest.fn(),
}));
jest.mock('../../../modules/ConsultantAppointment/api', () => ({
  fetchWings: jest.fn(),
  fetchDivisions: jest.fn(),
}));

beforeEach(() => resetAllStores());

describe.each([
  ['useYpStore', useYpStore],
  ['useCaStore', useCaStore],
])('%s', (_name, store) => {
  it('setCurrentPage accepts a value or an updater function (Prev/Next buttons)', () => {
    store.getState().setCurrentPage(3);
    expect(store.getState().currentPage).toBe(3);

    store.getState().setCurrentPage(prev => Math.min(5, prev + 1));
    expect(store.getState().currentPage).toBe(4);

    store.getState().setCurrentPage(prev => Math.max(1, prev - 1));
    expect(store.getState().currentPage).toBe(3);
  });

  it('keeps the current page when the debounced search did not change (remount)', () => {
    store.getState().setCurrentPage(3);
    store.getState().setDebouncedSearch('');
    expect(store.getState().currentPage).toBe(3);
  });

  it('returns to page 1 when the debounced search changes', () => {
    store.getState().setCurrentPage(3);
    store.getState().setDebouncedSearch('port');
    expect(store.getState().debouncedSearch).toBe('port');
    expect(store.getState().currentPage).toBe(1);
  });

  it('resetFilters clears filters but keeps the search text', () => {
    store.getState().setSearchTerm('port');
    store.getState().setSelectedWing('Ports');
    store.getState().setSelectedDivision('PD-I');
    store.getState().resetFilters();

    const state = store.getState();
    expect(state.selectedWing).toBe('');
    expect(state.selectedDivision).toBe('');
    expect(state.searchTerm).toBe('port');
  });

  it('resetAllStores restores defaults (logout)', () => {
    store.getState().setSearchTerm('port');
    store.getState().setSelectedWing('Ports');
    store.getState().setCurrentPage(4);
    store.getState().setShowFilterPanel(true);

    resetAllStores();

    const state = store.getState();
    expect(state.searchTerm).toBe('');
    expect(state.selectedWing).toBe('');
    expect(state.currentPage).toBe(1);
    expect(state.showFilterPanel).toBe(false);
  });

  it('does not keep edit or drilldown records in the store', () => {
    const state = store.getState();
    expect(state).not.toHaveProperty('editData');
    expect(state).not.toHaveProperty('drilldownAppointment');
  });
});

describe('useYpStore.loadWingsAndDivisions', () => {
  it('caches wings and divisions on success', async () => {
    fetchYpWings.mockResolvedValue({ data: [{ wing_id: 1, wing_name: 'Ports' }] });
    fetchYpDivisions.mockResolvedValue({ data: [{ division_id: 2, wing_id: 1, division_name: 'PD-I' }] });

    await useYpStore.getState().loadWingsAndDivisions();

    const state = useYpStore.getState();
    expect(state.wings).toHaveLength(1);
    expect(state.divisions).toHaveLength(1);
    expect(state.metadataError).toBeNull();
    expect(state.loadingMetadata).toBe(false);
  });

  it('surfaces an error instead of failing silently', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchYpWings.mockRejectedValue(new Error('network'));
    fetchYpDivisions.mockResolvedValue({ data: [] });

    await useYpStore.getState().loadWingsAndDivisions();

    expect(useYpStore.getState().metadataError).toBeTruthy();
    expect(useYpStore.getState().loadingMetadata).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
