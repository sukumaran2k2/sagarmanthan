/* global describe, it, expect */
import {
  ACTUAL_FIELDS,
  INPUT_FIELDS,
  TARGET_FIELDS,
  buildPayload,
  computeDerived,
  fieldLabel,
  toFormValues,
  validateValues,
} from '../../pages/FinancialParameters/financialParametersConfig';

const filled = {
  operating_income: '100', operating_expenditure: '40', total_income: '120', total_expenditure: '150',
  per_tonne_handling_cost: '55.5', operating_profit_tonne: '-12.25',
  teu_container: '', tonne_dry_bulk: '3', tonne_break_bulk: '', tonne_liquid_bulk: '1',
};

describe('financial parameters config', () => {
  it('has the earlier portal fields: 10 entered, 3 calculated, 6 targets', () => {
    expect(INPUT_FIELDS.map((f) => f.key)).toEqual([
      'operating_income', 'operating_expenditure', 'total_income', 'total_expenditure',
      'per_tonne_handling_cost', 'operating_profit_tonne',
      'teu_container', 'tonne_dry_bulk', 'tonne_break_bulk', 'tonne_liquid_bulk',
    ]);
    expect(ACTUAL_FIELDS.filter((f) => f.computed).map((f) => f.key))
      .toEqual(['operating_surplus', 'net_surplus', 'operating_ratio']);
    expect(TARGET_FIELDS).toHaveLength(6);
    expect(TARGET_FIELDS.every((f) => f.required)).toBe(true);
    expect(fieldLabel(INPUT_FIELDS[0])).toBe('Operating Income (In Cr.)');
  });

  it('calculates surplus, net surplus and operating ratio like the earlier portal', () => {
    expect(computeDerived(filled)).toEqual({ operating_surplus: 60, net_surplus: -30, operating_ratio: 40 });
    expect(computeDerived({ operating_income: '3', operating_expenditure: '1' }).operating_ratio).toBe(33.33);
  });

  it('leaves a calculated value empty until its inputs are entered, and the ratio when income is zero', () => {
    expect(computeDerived({ operating_income: '10' })).toEqual({ operating_surplus: null, net_surplus: null, operating_ratio: null });
    expect(computeDerived({ operating_income: '0', operating_expenditure: '5' })).toMatchObject({ operating_surplus: -5, operating_ratio: null });
  });

  it('requires the mandatory values and refuses negative amounts, but allows an operating loss', () => {
    expect(validateValues(INPUT_FIELDS, filled)).toEqual({});
    const errors = validateValues(INPUT_FIELDS, { ...filled, operating_income: '', total_expenditure: '-1', tonne_dry_bulk: 'abc' });
    expect(errors).toEqual({ operating_income: 'Required', total_expenditure: 'Cannot be negative', tonne_dry_bulk: 'Enter a number' });
    expect(validateValues(INPUT_FIELDS, { ...filled, teu_container: '-4' })).toEqual({});
  });

  it('sends numbers for entered values and null for blank optional ones, never the calculated values', () => {
    const payload = buildPayload(ACTUAL_FIELDS, filled);
    expect(payload).toMatchObject({ operating_income: 100, operating_profit_tonne: -12.25, teu_container: null });
    expect(payload).not.toHaveProperty('operating_surplus');
    expect(Object.keys(payload)).toHaveLength(10);
  });

  it('turns saved values into form strings', () => {
    expect(toFormValues(INPUT_FIELDS, { operating_income: 69.12, teu_container: null })).toMatchObject({
      operating_income: '69.12', teu_container: '', total_income: '',
    });
  });
});
