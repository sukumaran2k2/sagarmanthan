/* global describe, it, expect, jest, beforeEach, require */
import { REPORT_TITLES, useCabinetNotesOtherStore } from '../../store/useCabinetNotesOtherStore';
import { resetAllStores } from '../../../../stores/resetRegistry';

jest.mock('../../api', () => ({
  fetchMinistryList: jest.fn(() => Promise.resolve({ data: [{ ministry_id: 1, ministry_name: 'Ministry of Finance' }] })),
  fetchDropdownAllValues: jest.fn(() => Promise.resolve({ data: [{ cab_ministry_stage_id: 1, cab_ministry_stage_name: 'Received' }] })),
  fetchWings: jest.fn(() => Promise.resolve({ data: [{ wing_id: 1, wing_name: 'Ports' }] })),
}));
const api = require('../../api');

const state = () => useCabinetNotesOtherStore.getState();
const list = () => state().listActions;
const report = () => state().reportActions;

describe('Cabinet Notes - Other Ministry store', () => {
  beforeEach(() => resetAllStores());

  it('opens on the dashboard with the Active list on page 1', () => {
    expect(state().activeSubTab).toBe('dashboard');
    expect(state().list).toMatchObject({ category: 'active', currentPage: 1, pageSize: 10, visibleCols: {} });
    expect(state().report.drillDownPath).toEqual([{ type: 'summary', title: REPORT_TITLES.stagewise }]);
  });

  it('accepts only known tabs', () => {
    state().setActiveSubTab('report');
    state().setActiveSubTab('unknown');
    expect(state().activeSubTab).toBe('report');
  });

  it('goes back to page 1 on any filter, search or page size change', () => {
    list().setCurrentPage(4);
    list().setFilters({ ministry: 'Ministry of Finance' });
    expect(state().list).toMatchObject({ currentPage: 1, ministry: 'Ministry of Finance' });

    list().setCurrentPage(3);
    list().setSearchTerm('rail');
    expect(state().list).toMatchObject({ currentPage: 1, searchTerm: 'rail' });

    list().setCurrentPage(2);
    list().setPageSize(25);
    expect(state().list).toMatchObject({ currentPage: 1, pageSize: 25 });
  });

  it('clears the stage filter when switching between Active and Completed', () => {
    list().setFilters({ stage: 'Received', ministry: 'Ministry of Finance' });
    list().setCategory('completed');
    expect(state().list).toMatchObject({ category: 'completed', stage: '', ministry: 'Ministry of Finance' });
  });

  it('starts a new report from its summary with no ministry filter', () => {
    report().setMinistry('1');
    report().setDrillDownPath((path) => [...path, { type: 'detail', title: 'Detail', ministryId: 1 }]);
    expect(state().report.drillDownPath).toHaveLength(2);
    report().setType('pendency');
    expect(state().report).toMatchObject({ type: 'pendency', ministry: '' });
    expect(state().report.drillDownPath).toEqual([{ type: 'summary', title: REPORT_TITLES.pendency }]);
  });

  it('loads ministries, stages and wings once', async () => {
    [api.fetchMinistryList, api.fetchDropdownAllValues, api.fetchWings].forEach((fn) => fn.mockClear());
    await state().loadMasters();
    await state().loadMasters();
    expect(api.fetchMinistryList).toHaveBeenCalledTimes(1);
    expect(api.fetchDropdownAllValues).toHaveBeenCalledWith('mmt_cabinet_ministry_stage');
    expect(state().ministries).toHaveLength(1);
    expect(state().stages).toHaveLength(1);
    expect(state().wings[0].wing_name).toBe('Ports');
  });

  it('retries the reference data after a failed load', async () => {
    api.fetchWings.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await state().loadMasters();
    expect(state()).toMatchObject({ mastersLoaded: false, mastersError: 'Cabinet Notes reference data' });
    await state().loadMasters();
    expect(state()).toMatchObject({ mastersLoaded: true, mastersError: null });
    expect(state().wings).toHaveLength(1);
    spy.mockRestore();
  });

  it('resets everything on logout', () => {
    state().setActiveSubTab('list');
    list().setVisibleCols({ remarks: true });
    report().setType('pendency');
    resetAllStores();
    expect(state().activeSubTab).toBe('dashboard');
    expect(state().list.visibleCols).toEqual({});
    expect(state().report.type).toBe('stagewise');
  });
});
