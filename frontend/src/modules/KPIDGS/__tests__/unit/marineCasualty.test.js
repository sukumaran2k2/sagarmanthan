/* global describe, it, expect */
import { CASUALTY_TABS } from '../../components/marineCasualtyColumns';
import { activeTabOf, rowsInTab } from '../../data/listTabs';
import { EXAM_FILTER_FIELDS, filterExamRows, yearOptionsFrom } from '../../data/examListFilters';
import { MARINE_SHEETS, YEAR_WISE_COUNTS, sumCounts } from '../../data/marineCasualty';

const ROWS = [
  { year: 2025, casualty_type: 'Other Casualty', total_incidents: 40 },
  { year: 2025, casualty_type: 'Marine Casualty', total_incidents: 104 },
  { year: 2024, casualty_type: 'Marine Casualty', total_incidents: 90 },
  { year: 2024, casualty_type: 'Other Casualty', total_incidents: 31 },
];

describe('K-2.5 Marine Casualty Data List', () => {
  it('tabs are Marine first, then Other, whatever order the rows come in', () => {
    expect(CASUALTY_TABS.options(ROWS)).toEqual([
      { value: 'Marine Casualty', label: 'Marine Casualty' },
      { value: 'Other Casualty', label: 'Other Casualty' },
    ]);
  });

  it('shows the first tab until one is picked, and only that casualty type', () => {
    const active = activeTabOf(CASUALTY_TABS, ROWS, '');
    expect(active).toBe('Marine Casualty');
    expect(rowsInTab(CASUALTY_TABS, ROWS, active).map((r) => r.year)).toEqual([2025, 2024]);
    expect(rowsInTab(CASUALTY_TABS, ROWS, 'Other Casualty')).toHaveLength(2);
  });

  it('a tab with no rows left falls back to the first', () => {
    const marineOnly = ROWS.filter((r) => r.casualty_type === 'Marine Casualty');
    expect(activeTabOf(CASUALTY_TABS, marineOnly, 'Other Casualty')).toBe('Marine Casualty');
  });

  it('every K-2.5 list filters by year', () => {
    [...Object.keys(MARINE_SHEETS), 'marine-casualty-yearwise'].forEach((slug) => {
      expect(EXAM_FILTER_FIELDS[slug]).toEqual(['year']);
    });
    const fields = EXAM_FILTER_FIELDS['marine-casualty-vessel-wise'];
    expect(filterExamRows(ROWS, 'marine-casualty-vessel-wise', fields, { year: '2024' })).toHaveLength(2);
    expect(yearOptionsFrom(ROWS).map((o) => o.value)).toEqual(['2025', '2024']);
  });
});

describe('K-2.5 sheets and counts', () => {
  it('each sheet section names its backend sheet', () => {
    expect(Object.values(MARINE_SHEETS).map((c) => c.sheet)).toEqual(['incident-types', 'countries', 'vessels']);
  });

  it('year-wise has the old portal\'s seven counts', () => {
    expect(YEAR_WISE_COUNTS.map((c) => c.column)).toEqual([
      'accidental_death', 'missing_desertion', 'natural_death', 'suicides', 'injuries', 'man_overboard', 'missing_onboard',
    ]);
  });

  it('totals count blanks as 0', () => {
    expect(sumCounts(['3', '', null, 4, undefined, '0'])).toBe(7);
  });
});
