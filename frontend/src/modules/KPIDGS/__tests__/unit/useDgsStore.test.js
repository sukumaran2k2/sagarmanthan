/* global describe, it, expect, beforeEach */
import { useDgsStore, DGS_STORED_LIST_SLUGS } from '../../store/useDgsStore';
import { resetAllStores } from '../../../../stores/resetRegistry';

const state = () => useDgsStore.getState();
const DEFAULTS = { year: true, month: true, type_name: true, Action: true };

describe('KPI DGS store', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('has one empty list slot per stored section (K-2.3.1 and K-2.3.2)', () => {
    expect(DGS_STORED_LIST_SLUGS).toEqual(['exam-monthly-performance', 'exam-overall-performance']);
    DGS_STORED_LIST_SLUGS.forEach((slug) => {
      expect(state().lists[slug]).toEqual({ searchTerm: '', visibleCols: null });
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
    resetAllStores();
    expect(state().lists['exam-monthly-performance']).toEqual({ searchTerm: '', visibleCols: null });
  });
});
