/* global describe, it, expect, beforeEach */
import { useAttendanceStore, DEFAULT_VISIBLE_COLS } from '../../store/useAttendanceStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { calendarYear, toSeconds, validateAttendanceRows } from '../../utils/attendanceUtils';
import { kpisFromRows, kpisFromReport } from '../../utils/attendanceKpis';

const state = () => useAttendanceStore.getState();

describe('Attendance store', () => {
  beforeEach(() => resetAllStores());

  it('starts with no filters, no report period, all columns shown', () => {
    expect(state()).toMatchObject({
      filters: { wing: 'All', month: 'All', year: 'All', week: 'All' },
      searchTerm: '',
      pageSize: 10,
      visibleCols: DEFAULT_VISIBLE_COLS,
      reportPeriod: null,
    });
  });

  it('filters merge, and reset clears filters and search', () => {
    state().setFilters({ month: 'June' });
    state().setFilters({ year: '2026' });
    state().setSearchTerm('AD03');
    expect(state().filters).toMatchObject({ month: 'June', year: '2026', week: 'All' });
    state().resetFilters();
    expect(state()).toMatchObject({ filters: { month: 'All', year: 'All' }, searchTerm: '' });
  });

  it('report period merges changes; logout resets it', () => {
    state().setReportPeriod({ month: 'June', year: '2026', week: 4 });
    state().setReportPeriod({ week: 2 });
    expect(state().reportPeriod).toEqual({ month: 'June', year: '2026', week: 2 });
    resetAllStores();
    expect(state().reportPeriod).toBeNull();
  });
});

describe('Attendance helpers', () => {
  it('January to March belong to the year a financial year ends', () => {
    expect(calendarYear('2025-2026', 'November')).toBe(2025);
    expect(calendarYear('2025-2026', 'January')).toBe(2026);
    expect(calendarYear('2025-2026', 'March')).toBe(2026);
    expect(calendarYear('2025-2026', 'April')).toBe(2025);
  });

  it('accepts code Emp Ids like AD03 (as 2.0 did); flags only empty and duplicate ones', () => {
    const row = (id) => ({ 'Emp Id': id, 'In Time Avg': '09:10:00', 'Out Time Avg': '18:00:00', 'Average Working Hours': '08:50:00' });
    expect(validateAttendanceRows([row('AD03'), row('ASO02'), row(4001)])).toEqual([]);
    const issues = validateAttendanceRows([row('AD03'), row(''), row('AD03')]);
    expect(issues.map((i) => i.field)).toEqual(['Emp Id', 'Emp Id (duplicates)']);
  });

  it('00:00:00 counts as no time recorded', () => {
    expect(toSeconds('1970-01-01T00:00:00.000Z')).toBeNull();
    expect(toSeconds('1970-01-01T09:15:00.000Z')).toBe(9 * 3600 + 15 * 60);
  });

  it('cards show — instead of made-up values when there is nothing to measure', () => {
    expect(kpisFromRows([])).toMatchObject({ avgWorkingHours: '—', punctualRate: '—', earlyCheckoutRate: '—' });
    expect(kpisFromReport([])).toMatchObject({ avgWorkingHours: '—', punctualRate: '—', earlyCheckoutRate: '—' });
  });

  it('row cards leave out unrecorded times', () => {
    const rows = [
      { Emp_Id: 'A', wing_name: 'Ports', In_Time_Avg: '1970-01-01T09:00:00.000Z', Out_Time_Avg: '1970-01-01T17:00:00.000Z', Average_Working_Hours: '1970-01-01T08:00:00.000Z' },
      { Emp_Id: 'B', wing_name: 'Ports', In_Time_Avg: '1970-01-01T10:00:00.000Z', Out_Time_Avg: '1970-01-01T18:00:00.000Z', Average_Working_Hours: '1970-01-01T08:00:00.000Z' },
      { Emp_Id: 'C', wing_name: 'IWT', In_Time_Avg: '1970-01-01T00:00:00.000Z', Out_Time_Avg: '1970-01-01T00:00:00.000Z', Average_Working_Hours: '1970-01-01T00:00:00.000Z' },
    ];
    expect(kpisFromRows(rows)).toEqual({
      employees: { empCount: 3, wingCount: 'Across 2 wings' },
      avgWorkingHours: '08:00:00',
      punctualRate: '50%',
      earlyCheckoutRate: '50%',
    });
  });

  it('report cards weight wing averages by employees', () => {
    const rows = [
      { Wing: 'Ports', 'Number Of Employees': 10, 'Average Working Hours': 8, 'Number Of Employees InTime Before 9:30AM': 8, 'Number Of Employees OutTime before 5:30PM': 2 },
      { Wing: 'IWT', 'Number Of Employees': 30, 'Average Working Hours': 9, 'Number Of Employees InTime Before 9:30AM': 12, 'Number Of Employees OutTime before 5:30PM': 6 },
    ];
    expect(kpisFromReport(rows)).toEqual({
      employees: { empCount: 40, wingCount: 'Across 2 wings' },
      avgWorkingHours: '08:45:00',
      punctualRate: '50%',
      earlyCheckoutRate: '20%',
    });
  });
});
