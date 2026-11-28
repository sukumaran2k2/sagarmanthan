/* global describe, test, expect */
import {
  TONE,
  STATUS,
  cellTone,
  cellText,
  capexWeekOfDay,
  calendarWeekOfDay,
  formatFinancialYear,
  countTones,
} from '../../utils/dataEntryStatus';

const v = (value, type) => (type ? { value, type } : { value });

describe('date and month cells: current or previous month is up to date', () => {
  const today = '2026-11-28';

  test.each([
    ['2026-11-01', TONE.CURRENT],
    ['2026-10-01', TONE.CURRENT],
    ['2026-09-30', TONE.OVERDUE],
    ['2025-11-28', TONE.OVERDUE],
  ])('date %s -> %s', (value, tone) => {
    expect(cellTone(v(value), 'date', today)).toBe(tone);
  });

  test('January accepts the previous December', () => {
    expect(cellTone(v('2025-12-15'), 'date', '2026-01-03')).toBe(TONE.CURRENT);
    expect(cellTone(v('2025-11-30'), 'date', '2026-01-03')).toBe(TONE.OVERDUE);
  });

  test('month values', () => {
    expect(cellTone(v('2026-10'), 'month', today)).toBe(TONE.CURRENT);
    expect(cellTone(v('2026-09'), 'month', today)).toBe(TONE.OVERDUE);
  });
});

describe('financial-year cells (KPI of DGS, CSL, DGLL, SCI, IMU)', () => {
  test('current or previous FY is up to date', () => {
    expect(cellTone(v('2025-04-01', 'fy'), 'month', '2026-11-28')).toBe(TONE.CURRENT); // FY 2025-26
    expect(cellTone(v('2025-03-31', 'fy'), 'month', '2026-11-28')).toBe(TONE.OVERDUE); // FY 2024-25
    // In March 2026 (FY 2025-26) a date in FY 2024-25 is still the previous FY
    expect(cellTone(v('2024-06-10', 'fy'), 'month', '2026-03-31')).toBe(TONE.CURRENT);
  });

  test('is written as the financial year', () => {
    expect(formatFinancialYear('2026-02-10')).toBe('FY 2025-26');
    expect(formatFinancialYear('2026-04-01')).toBe('FY 2026-27');
    expect(cellText(v('2026-04-01', 'fy'), 'month')).toBe('FY 2026-27');
  });
});

describe('Capex weeks', () => {
  test('week of day', () => {
    expect([1, 7, 8, 14, 15, 21, 22, 31].map(capexWeekOfDay)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  test('current or previous week of the same month', () => {
    const today = '2026-11-16'; // week 3
    expect(cellTone(v('2026-11-W3'), 'week', today)).toBe(TONE.CURRENT);
    expect(cellTone(v('2026-11-W2'), 'week', today)).toBe(TONE.CURRENT);
    expect(cellTone(v('2026-11-W1'), 'week', today)).toBe(TONE.OVERDUE);
    expect(cellTone(v('2026-10-W4'), 'week', today)).toBe(TONE.OVERDUE);
  });

  test('in week 1, last month\'s week 4 is the previous week (also across the year end)', () => {
    expect(cellTone(v('2026-10-W4'), 'week', '2026-11-05')).toBe(TONE.CURRENT);
    expect(cellTone(v('2026-10-W3'), 'week', '2026-11-05')).toBe(TONE.OVERDUE);
    expect(cellTone(v('2025-12-W4'), 'week', '2026-01-02')).toBe(TONE.CURRENT);
  });
});

describe('E-Office / Attendance calendar weeks', () => {
  test('week of day counts calendar rows (November 2026 starts on a Sunday)', () => {
    expect(calendarWeekOfDay(2026, 11, 1)).toBe(1);
    expect(calendarWeekOfDay(2026, 11, 8)).toBe(2);
    expect(calendarWeekOfDay(2026, 11, 30)).toBe(5);
    // August 2026 starts on a Saturday: the 2nd is already week 2
    expect(calendarWeekOfDay(2026, 8, 2)).toBe(2);
  });

  test('current or previous week', () => {
    const today = '2026-11-28'; // week 4
    expect(cellTone(v('2026-11-W4'), 'eofficeWeek', today)).toBe(TONE.CURRENT);
    expect(cellTone(v('2026-11-W3'), 'eofficeWeek', today)).toBe(TONE.CURRENT);
    expect(cellTone(v('2026-11-W1'), 'eofficeWeek', today)).toBe(TONE.OVERDUE);
  });

  test('in week 1, the last week of last month is the previous week', () => {
    // 1 Nov 2026 is week 1; October 2026 has 5 calendar weeks
    expect(cellTone(v('2026-10-W5'), 'eofficeWeek', '2026-11-01')).toBe(TONE.CURRENT);
    expect(cellTone(v('2026-10-W4'), 'eofficeWeek', '2026-11-01')).toBe(TONE.OVERDUE);
  });
});

describe('status cells', () => {
  test('tones', () => {
    expect(cellTone({ status: STATUS.NOT_APPLICABLE }, 'date', '2026-11-28')).toBe(TONE.NEUTRAL);
    expect(cellTone({ status: STATUS.NONE_ACTIVE }, 'date', '2026-11-28')).toBe(TONE.NEUTRAL);
    expect(cellTone({ status: STATUS.NO_DATA }, 'date', '2026-11-28')).toBe(TONE.OVERDUE);
    expect(cellTone({ status: STATUS.UNAVAILABLE }, 'date', '2026-11-28')).toBe(TONE.UNAVAILABLE);
    expect(cellTone(undefined, 'date', '2026-11-28')).toBe(TONE.OVERDUE);
  });

  test('wording: the row can override a status', () => {
    expect(cellText({ status: STATUS.NONE_ACTIVE }, 'date', { NONE_ACTIVE: 'No pending references' }))
      .toBe('No pending references');
    expect(cellText({ status: STATUS.NOT_APPLICABLE }, 'date')).toBe('Not applicable');
    expect(cellText({ status: STATUS.NO_DATA }, 'date')).toBe('No data entered');
  });
});

describe('values are written out', () => {
  test.each([
    [{ value: '2026-11-03' }, 'date', '03 Nov 2026'],
    [{ value: '2026-09' }, 'month', 'September 2026'],
    [{ value: '2026-11-W2' }, 'week', 'Week 2, November 2026'],
    [{ value: '2026-10-W5' }, 'eofficeWeek', 'Week 5, October 2026'],
  ])('%j as %s -> %s', (cell, type, text) => {
    expect(cellText(cell, type)).toBe(text);
  });
});

test('countTones', () => {
  const counts = countTones(
    [{ value: '2026-11-01' }, { value: '2025-01-01' }, { status: 'NOT_APPLICABLE' }],
    'date',
    '2026-11-28'
  );
  expect(counts).toEqual({ current: 1, overdue: 1, neutral: 1, unavailable: 0 });
});
