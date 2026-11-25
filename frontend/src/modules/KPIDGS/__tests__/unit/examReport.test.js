/* global describe, it, expect */
import {
  examAsOnDate, examReportMonth, currentFinancialYear, examTotalsRow,
  monthlyTrendChartData, yearlyTrendChartData, NAUTICAL, ENGINEERING, FY_MONTHS,
} from '../../utils/examReport';

describe('K-2.3 report dates (as on the earlier portal)', () => {
  it('as on date is the last day of the month two months back', () => {
    expect(examAsOnDate(new Date(2026, 10, 25))).toBe('30-09-2026');
    expect(examAsOnDate(new Date(2026, 0, 10))).toBe('30-11-2025');
    expect(examAsOnDate(new Date(2026, 3, 30))).toBe('28-02-2026');
  });

  it('report month is the previous month', () => {
    expect(examReportMonth(new Date(2026, 10, 25))).toBe('October 2026');
    expect(examReportMonth(new Date(2026, 0, 31))).toBe('December 2025');
  });

  it('financial year runs April to March', () => {
    expect(currentFinancialYear(new Date(2026, 3, 1))).toBe('2026-2027');
    expect(currentFinancialYear(new Date(2026, 2, 31))).toBe('2025-2026');
  });
});

describe('K-2.3.1 Total row', () => {
  it('adds counts and works pass % out from the summed counts', () => {
    const t = examTotalsRow([
      { candidatesAppearedPy: 10, candidatesPassedPy: 5, passPercentagePy: 50 },
      { candidatesAppearedPy: 20, candidatesPassedPy: 20, passPercentagePy: 100 },
    ]);
    expect(t.candidatesAppearedPy).toBe(30);
    expect(t.candidatesPassedPy).toBe(25);
    expect(t.passPercentagePy).toBe(83.33); // not (50 + 100)
    expect(t._isTotal).toBe(true);
  });

  it('gives 0 % when nobody appeared, and treats null as 0', () => {
    const t = examTotalsRow([{ candidatesAppearedMonth: null, candidatesPassedMonth: null, passPercentageMonth: null }]);
    expect(t.candidatesAppearedMonth).toBe(0);
    expect(t.passPercentageMonth).toBe(0);
  });

  it('has no Total row without rows', () => {
    expect(examTotalsRow([])).toBeNull();
  });
});

describe('K-2.3.2 / K-2.3.3 chart data', () => {
  it('monthly: April to March, missing months as 0', () => {
    const data = monthlyTrendChartData([
      { Category: NAUTICAL, April: 12, May: null },
      { Category: ENGINEERING, April: 7, March: 3 },
    ]);
    expect(data.map((d) => d.category)).toEqual(FY_MONTHS);
    expect(data[0]).toEqual({ category: 'April', nautical: 12, engineering: 7 });
    expect(data[1]).toEqual({ category: 'May', nautical: 0, engineering: 0 });
    expect(data[11]).toEqual({ category: 'March', nautical: 0, engineering: 3 });
  });

  it('yearly: one point per FY column, in backend order', () => {
    const data = yearlyTrendChartData([
      { Category: NAUTICAL, 'FY2014-2015': 4, 'FY2015-2016': null },
      { Category: ENGINEERING, 'FY2014-2015': 2, 'FY2015-2016': 9 },
    ]);
    expect(data).toEqual([
      { category: 'FY2014-2015', nautical: 4, engineering: 2 },
      { category: 'FY2015-2016', nautical: 0, engineering: 9 },
    ]);
    expect(yearlyTrendChartData([])).toEqual([]);
  });
});
