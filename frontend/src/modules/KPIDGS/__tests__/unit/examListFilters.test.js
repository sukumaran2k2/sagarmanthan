/* global describe, it, expect */
import {
  EXAM_FILTER_FIELDS, FILTER_MONTH_OPTIONS, countActiveFilters, filterExamRows, yearOptionsFrom,
} from '../../data/examListFilters';

const ROWS = [
  { year: 2026, month: 9, type_id: 1 },
  { year: 2026, month: 9, type_id: 2 },
  { year: 2026, month: 4, type_id: 1 },
  { year: 2025, month: 12, type_id: 2 },
];
const ALL = { year: '', month: '', type: '' };
const OVERALL = EXAM_FILTER_FIELDS['exam-overall-performance'];
const MONTHLY = EXAM_FILTER_FIELDS['exam-monthly-performance'];

describe('K-2.3 Data List filter rules', () => {
  it('offers the old portal filters: 2.3.1 Year + Month, 2.3.2 Year + Month + Type', () => {
    expect(MONTHLY).toEqual(['year', 'month']);
    expect(OVERALL).toEqual(['year', 'month', 'type']);
  });

  it('lists months April to March, as the old filter did', () => {
    expect(FILTER_MONTH_OPTIONS[0]).toEqual({ value: '4', label: 'April' });
    expect(FILTER_MONTH_OPTIONS[11]).toEqual({ value: '3', label: 'March' });
  });

  it('shows every row when no filter is chosen', () => {
    expect(filterExamRows(ROWS, OVERALL, ALL)).toBe(ROWS);
  });

  it('filters by year, month and type together', () => {
    expect(filterExamRows(ROWS, OVERALL, { year: '2026', month: '9', type: '2' }))
      .toEqual([{ year: 2026, month: 9, type_id: 2 }]);
  });

  it('ignores a filter the list does not offer (2.3.1 has no Type)', () => {
    expect(filterExamRows(ROWS, MONTHLY, { ...ALL, year: '2026', type: '2' })).toHaveLength(3);
    expect(countActiveFilters(MONTHLY, { ...ALL, year: '2026', type: '2' })).toBe(1);
  });

  it('offers only years that have data, newest first', () => {
    expect(yearOptionsFrom(ROWS)).toEqual([{ value: '2026', label: '2026' }, { value: '2025', label: '2025' }]);
  });
});
