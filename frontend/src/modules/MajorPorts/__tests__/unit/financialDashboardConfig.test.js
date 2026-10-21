/* global describe, it, expect */
import {
  FINANCIAL_CARDS,
  financialCard,
  splitFinancialDrillRows,
} from '../../pages/FinancialParameters/dashboard/financialDashboardConfig';

const row = (organisation_id, organisation_name) => ({ organisation_id, organisation_name, current_fy_ytd: 1 });

// The detail endpoint returns organisations and the two totals ordered by name
const ROWS = [
  row(1, 'Chennai Port Authority'),
  row(0, 'Overall Total'),
  row(55, 'PWD, GOA'),
  row(10, 'Paradip Port Authority'),
  row(0, 'SMPA Total'),
  row(54, 'Tamil Nadu Maritime Board'),
];
const names = (list) => list.map((r) => r.organisation_name);

describe('financial dashboard config', () => {
  it('has the eight cards of the earlier Financial Dashboard, in order', () => {
    expect(FINANCIAL_CARDS.map((c) => c.kpi)).toEqual([
      'operating_income', 'operating_expenditure', 'total_income', 'total_expenditure',
      'operating_surplus', 'net_surplus', 'operating_ratio', 'per_tonne_handling_cost',
    ]);
    expect(financialCard('operating_income')).toMatchObject({
      title: 'Operating Income (In Cr.)',
      fields: { current: 'op_income_current', last: 'op_income_last', yoy: 'op_income_yoy' },
    });
    expect(financialCard('operating_ratio').fields.current).toBe('op_ratio_current');
  });

  it('colours YoY like the earlier page: ▼ green only for expenditure and total income', () => {
    expect(FINANCIAL_CARDS.filter((c) => c.reverse).map((c) => c.kpi))
      .toEqual(['operating_expenditure', 'total_income', 'total_expenditure']);
    expect(financialCard('per_tonne_handling_cost').title).toBe('Per Tonne Handling Cost (In Cr.)');
  });

  it('lists all organisations with the SMPA docks and both totals pinned below', () => {
    const { rows, pinned } = splitFinancialDrillRows(ROWS, 0);
    expect(names(rows)).toEqual(['Chennai Port Authority', 'Paradip Port Authority']);
    expect(names(pinned)).toEqual(['Tamil Nadu Maritime Board', 'PWD, GOA', 'SMPA Total', 'Overall Total']);
  });

  it('shows the SMPA docks and SMPA Total for the SMPA group', () => {
    const { rows, pinned } = splitFinancialDrillRows(ROWS, 4);
    expect(names(rows)).toEqual(['Tamil Nadu Maritime Board', 'PWD, GOA', 'SMPA Total']);
    expect(pinned).toEqual([]);
  });

  it('shows only the organisation itself when one is chosen', () => {
    const { rows, pinned } = splitFinancialDrillRows([row(10, 'Paradip Port Authority'), row(0, 'Overall Total'), row(0, 'SMPA Total')], 10);
    expect(names(rows)).toEqual(['Paradip Port Authority']);
    expect(pinned).toEqual([]);
  });
});
