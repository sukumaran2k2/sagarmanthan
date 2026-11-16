/* global describe, it, expect, jest, beforeEach */
import { useVipStore, REPORT_SUMMARIES } from '../../store/useVipStore';
import { resetAllStores } from '../../../../stores/resetRegistry';

jest.mock('../../api', () => ({
  fetchWings: jest.fn(() => Promise.resolve({ data: [] })),
  fetchDivisions: jest.fn(() => Promise.resolve({ data: [] })),
}));

const state = () => useVipStore.getState();
const report = () => useVipStore.getState().report;

describe('VIP Reference report state', () => {
  beforeEach(() => resetAllStores());

  it('opens on the abstract wing-wise summary with no filter', () => {
    expect(report()).toMatchObject({ type: 'abstract', wingFilter: '', filterOpen: false });
    expect(report().abstractPath).toEqual([REPORT_SUMMARIES.abstract]);
    expect(report().pendencyPath).toEqual([REPORT_SUMMARIES.pendency]);
  });

  it('clears the wing filter when switching report mode', () => {
    state().setReportWingFilter('3');
    expect(report().wingFilter).toBe('3');

    state().setReportType('pendency');
    expect(report()).toMatchObject({ type: 'pendency', wingFilter: '' });
  });

  it('drills into whichever mode is open and keeps the other trail intact', () => {
    const wingView = { type: 'detail', source: 'abstractWingDetail', wingId: 7, title: 'Ports' };
    state().setReportPath((path) => [...path, wingView]);
    expect(report().abstractPath).toHaveLength(2);
    expect(report().pendencyPath).toHaveLength(1);

    state().setReportType('pendency');
    state().setReportPath((path) => [...path, { type: 'detail', source: 'pendencyWingDetail' }]);
    expect(report().pendencyPath).toHaveLength(2);
    // The abstract trail is still where the user left it
    expect(report().abstractPath).toHaveLength(2);
    expect(report().abstractPath[1]).toEqual(wingView);
  });

  it('toggles the filter panel with a value or an updater', () => {
    state().setReportFilterOpen(true);
    expect(report().filterOpen).toBe(true);
    state().setReportFilterOpen((open) => !open);
    expect(report().filterOpen).toBe(false);
  });

  it('hands back fresh nested state on reset, not the same objects', () => {
    const firstReport = report();
    state().setReportType('pendency');
    state().setReportPath((path) => [...path, { type: 'detail' }]);
    state().setVisibleCols((cols) => ({ ...cols, wing: false }));

    resetAllStores();

    expect(report()).toMatchObject({ type: 'abstract', wingFilter: '' });
    expect(report().pendencyPath).toHaveLength(1);
    expect(state().visibleCols.wing).toBe(true);
    // A reset session must not share the object the previous one was handed
    expect(report()).not.toBe(firstReport);
  });
});
