/* global describe, it, expect, beforeEach */
import { useActsAndRulesStore } from '../../store/useActsAndRulesStore';
import { resetAllStores } from '../../../../stores/resetRegistry';

const state = () => useActsAndRulesStore.getState();

describe('Acts & Rules store', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('starts on All wings and keeps the chosen wing', () => {
    expect(state().wing).toBe('All');
    state().setWing('Ports');
    expect(state().wing).toBe('Ports');
  });

  it('resetAllStores goes back to All (logout)', () => {
    state().setWing('DGLL');
    resetAllStores();
    expect(state().wing).toBe('All');
  });
});
