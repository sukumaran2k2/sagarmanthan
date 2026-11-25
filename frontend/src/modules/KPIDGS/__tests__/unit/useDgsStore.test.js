/* global describe, it, expect, beforeEach */
import { useDgsStore, DGS_STORED_LIST_SLUGS } from '../../store/useDgsStore';
import { resetAllStores } from '../../../../stores/resetRegistry';

const state = () => useDgsStore.getState();
const DEFAULTS = { year: true, month: true, type_name: true, Action: true };

describe('KPI DGS store', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('has one empty list slot per stored section (K-2.3.1, K-2.3.2, K-2.4, K-2.6.1, K-2.6.2, K-2.7.1 and K-2.7.2)', () => {
    expect(DGS_STORED_LIST_SLUGS).toEqual([
      'exam-monthly-performance',
      'exam-overall-performance',
      'entry-exit-of-candidates',
      'flag-state-inspection-mmd-wise',
      'flag-state-inspection-vessel-wise',
      'port-state-inspection-mmd-wise',
      'port-state-inspection-vessel-wise',
    ]);
    DGS_STORED_LIST_SLUGS.forEach((slug) => {
      expect(state().lists[slug]).toEqual({
        searchTerm: '', filters: { year: '', month: '', type: '', mmd: '' }, showFilterPanel: false, tab: '', visibleCols: null,
      });
    });
  });

  it('keeps the chosen tab through Reset', () => {
    state().setListTab('entry-exit-of-candidates', '2');
    state().setListFilter('entry-exit-of-candidates', 'year', '2026');
    state().resetListFilters('entry-exit-of-candidates');
    expect(state().lists['entry-exit-of-candidates']).toMatchObject({ tab: '2', filters: { year: '', month: '', type: '' } });
    expect(state().lists['exam-monthly-performance'].tab).toBe('');
  });

  it('keeps each section\'s filters and panel separate', () => {
    state().setListFilter('exam-overall-performance', 'type', '1');
    state().toggleListFilterPanel('exam-overall-performance');
    expect(state().lists['exam-overall-performance'].filters).toEqual({ year: '', month: '', type: '1', mmd: '' });
    expect(state().lists['exam-overall-performance'].showFilterPanel).toBe(true);
    expect(state().lists['exam-monthly-performance'].filters).toEqual({ year: '', month: '', type: '', mmd: '' });
    expect(state().lists['exam-monthly-performance'].showFilterPanel).toBe(false);
  });

  it('Reset clears the filters and the search but leaves the panel open', () => {
    state().setListFilter('exam-monthly-performance', 'year', '2026');
    state().setListSearch('exam-monthly-performance', 'x');
    state().toggleListFilterPanel('exam-monthly-performance');
    state().resetListFilters('exam-monthly-performance');
    expect(state().lists['exam-monthly-performance']).toMatchObject({
      searchTerm: '', filters: { year: '', month: '', type: '', mmd: '' }, showFilterPanel: true,
    });
  });

  it('keeps each section\'s search separate', () => {
    state().setListSearch('exam-monthly-performance', '2026');
    expect(state().lists['exam-monthly-performance'].searchTerm).toBe('2026');
    expect(state().lists['exam-overall-performance'].searchTerm).toBe('');
  });

  it('applies the first column change on top of the Data List defaults', () => {
    state().setListVisibleCols('exam-overall-performance', (prev) => ({ ...prev, type_name: false }), DEFAULTS);
    expect(state().lists['exam-overall-performance'].visibleCols).toEqual({ ...DEFAULTS, type_name: false });
    expect(state().lists['exam-monthly-performance'].visibleCols).toBeNull();
  });

  it('builds later column changes on the saved map, not the defaults', () => {
    state().setListVisibleCols('exam-overall-performance', (prev) => ({ ...prev, type_name: false }), DEFAULTS);
    state().setListVisibleCols('exam-overall-performance', (prev) => ({ ...prev, month: false }), DEFAULTS);
    expect(state().lists['exam-overall-performance'].visibleCols).toEqual({ ...DEFAULTS, type_name: false, month: false });
  });

  it('accepts a plain map as well as an updater', () => {
    state().setListVisibleCols('exam-monthly-performance', { year: false }, DEFAULTS);
    expect(state().lists['exam-monthly-performance'].visibleCols).toEqual({ year: false });
  });

  it('is cleared on logout (resetAllStores)', () => {
    state().setListSearch('exam-monthly-performance', 'x');
    state().setListVisibleCols('exam-monthly-performance', { year: false }, DEFAULTS);
    state().setListFilter('exam-monthly-performance', 'month', '4');
    resetAllStores();
    expect(state().lists['exam-monthly-performance']).toEqual({
      searchTerm: '', filters: { year: '', month: '', type: '', mmd: '' }, showFilterPanel: false, tab: '', visibleCols: null,
    });
  });
});
