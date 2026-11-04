/* global describe, it, expect */
import { formatDate, toYmd } from '../../utils/dates';

describe('HR date helpers', () => {
  it('toYmd pads day and month', () => {
    expect(toYmd(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formatDate shows YYYY-MM-DD, or -- when missing or invalid', () => {
    expect(formatDate(new Date(2024, 2, 5))).toBe('2024-03-05');
    expect(formatDate('')).toBe('--');
    expect(formatDate(null)).toBe('--');
    expect(formatDate('not a date')).toBe('--');
  });

  it('server dates keep their stored calendar day (no time-zone shift); old DD-MM-YYYY values are read', () => {
    expect(formatDate('2024-03-05T23:30:00.000Z')).toBe('2024-03-05');
    expect(formatDate('2024-03-05')).toBe('2024-03-05');
    expect(formatDate('05-03-2024')).toBe('2024-03-05');
    expect(formatDate('05/03/2024')).toBe('2024-03-05');
    expect(formatDate('', 0, '-')).toBe('-');
  });

  it('formatDate can shift by whole years (abolition date = vacancy date + 5 years)', () => {
    expect(formatDate(new Date(2020, 6, 1), 5)).toBe('2025-07-01');
  });
});
