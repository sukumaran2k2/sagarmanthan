/* global describe, it, expect, beforeEach */
import { useEOfficeStore, DEFAULT_FILTERS, selectFilters, selectSearchTerm, selectReportPeriod } from '../../store/useEOfficeStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { CATEGORIES, calendarYear, rowWeek, totalsRow, validateEOfficeRows } from '../../utils/eOfficeUtils';

const state = () => useEOfficeStore.getState();

describe('E-Office store', () => {
  beforeEach(() => resetAllStores());

  it('starts with default filters and no report period for every sheet', () => {
    expect(selectFilters('file-pendency')(state())).toEqual(DEFAULT_FILTERS);
    expect(selectSearchTerm('file-disposal')(state())).toBe('');
    expect(selectReportPeriod('receipt-pendency')(state())).toBeNull();
    expect(state().pageSize).toBe(10);
  });

  it('keeps each sheet’s filters and report period separate', () => {
    state().setFilters('file-pendency', { month: 'June' });
    state().setReportPeriod('file-disposal', { month: 'May', year: '2026', week: 2 });
    expect(selectFilters('file-pendency')(state())).toEqual({ ...DEFAULT_FILTERS, month: 'June' });
    expect(selectFilters('file-disposal')(state())).toEqual(DEFAULT_FILTERS);
    expect(selectReportPeriod('file-disposal')(state())).toEqual({ month: 'May', year: '2026', week: 2 });
    expect(selectReportPeriod('file-pendency')(state())).toBeNull();
  });

  it('resetFilters clears that sheet’s filters and search only', () => {
    state().setFilters('file-pendency', { wing: 'Ports' });
    state().setSearchTerm('file-pendency', 'AD01');
    state().setSearchTerm('file-disposal', 'X');
    state().resetFilters('file-pendency');
    expect(selectFilters('file-pendency')(state())).toEqual(DEFAULT_FILTERS);
    expect(selectSearchTerm('file-pendency')(state())).toBe('');
    expect(selectSearchTerm('file-disposal')(state())).toBe('X');
  });

  it('logout reset restores defaults', () => {
    state().setPageSize(50);
    state().setShowFilterPanel((open) => !open);
    resetAllStores();
    expect(state()).toMatchObject({ pageSize: 10, showFilterPanel: false, filters: {}, reportPeriods: {} });
  });
});

describe('E-Office utils', () => {
  it('stores the calendar year: January-March fall in the second year of the FY', () => {
    expect(calendarYear('2026-2027', 'November')).toBe(2026);
    expect(calendarYear('2026-2027', 'January')).toBe(2027);
  });

  it('reads the week from either week column name', () => {
    expect(rowWeek({ Week: 'Week 3' })).toBe(3);
    expect(rowWeek({ WeekName: 'Week 5' })).toBe(5);
  });

  it('totals only the count columns', () => {
    const rows = [
      { 'Emp ID': 'A1', '0-3 Days': 1, 'Total Pendency': 4, 'Greater than 30 days': 2 },
      { 'Emp ID': 'A2', '0-3 Days': 2, 'Total Pendency': 3, 'Greater Than 30 days': 1 },
    ];
    expect(totalsRow(CATEGORIES['file-pendency'].columns, rows)).toMatchObject({
      EmpName: 'Total', Days0to3: 3, Over30: 3, TotalPendency: 7,
    });
    expect(totalsRow(CATEGORIES['file-pendency'].columns, rows)).not.toHaveProperty('Wing');
  });

  it('rejects number Emp Ids and duplicates, as 2.0 did', () => {
    const issues = validateEOfficeRows([
      { 'Emp Id': 101, 'Count of Transactions': 1, 'Counts of Files': 1 },
      { 'Emp Id': 'AD1', 'Count of Transactions': 1, 'Counts of Files': 1 },
      { 'Emp Id': 'AD1', 'Count of Transactions': 1, 'Counts of Files': 1 },
    ], 'file-disposal');
    expect(issues.map((i) => i.field)).toEqual(['Emp Id', 'Emp Id (duplicates)']);
  });
});
