/* global describe, it, expect */
import {
  INPUT_FIELDS,
  TARGET_FIELDS,
  buildPayload,
  columnLabel,
  fieldLabel,
  renewableExceedsTotal,
  toFormValues,
  validateValues,
} from '../../pages/RenewableEnergy/renewableEnergyConfig';

describe('renewableEnergyConfig', () => {
  it('keeps the earlier portal fields, labels and hints in MWh', () => {
    expect(INPUT_FIELDS.map(fieldLabel)).toEqual([
      'Total Electrical Energy Consumption (MWh)',
      'Total Renewable Energy Consumption (MWh)',
    ]);
    expect(INPUT_FIELDS.map(columnLabel)).toEqual(['Total Electrical Energy (MWh)', 'Total Renewable Energy (MWh)']);
    expect([...INPUT_FIELDS, ...TARGET_FIELDS].map((f) => f.hint))
      .toEqual(Array(3).fill('(Including self-generated + grid procurement)'));
    expect(TARGET_FIELDS.map(fieldLabel)).toEqual(['Target Total Renewable Energy Consumption (MWh)']);
  });

  it('flags, without refusing, renewable consumption above the total', () => {
    const values = { electrical_energy_consumption: '1405.06', renewable_energy_consumption: '1530.61' };
    expect(renewableExceedsTotal(values)).toBe(true);
    expect(validateValues(INPUT_FIELDS, values)).toEqual({});
    expect(renewableExceedsTotal({ electrical_energy_consumption: '10', renewable_energy_consumption: '10' })).toBe(false);
  });

  it('accepts numbers of zero or more with at most two decimals', () => {
    expect(validateValues(INPUT_FIELDS, {
      electrical_energy_consumption: '',
      renewable_energy_consumption: '-1',
    })).toEqual({
      electrical_energy_consumption: 'Required',
      renewable_energy_consumption: 'Cannot be negative',
    });
    expect(validateValues(INPUT_FIELDS, {
      electrical_energy_consumption: '12.345',
      renewable_energy_consumption: 'abc',
    })).toEqual({
      electrical_energy_consumption: 'Use at most 2 decimal places',
      renewable_energy_consumption: 'Enter a number',
    });
    expect(validateValues(INPUT_FIELDS, {
      electrical_energy_consumption: '1.13',
      renewable_energy_consumption: '0',
    })).toEqual({});
  });

  it('converts between saved rows, form strings and the payload', () => {
    const form = toFormValues(INPUT_FIELDS, { electrical_energy_consumption: 1160.81, renewable_energy_consumption: null });
    expect(form).toEqual({ electrical_energy_consumption: '1160.81', renewable_energy_consumption: '' });
    expect(buildPayload(INPUT_FIELDS, { ...form, renewable_energy_consumption: '96.5' })).toEqual({
      electrical_energy_consumption: 1160.81,
      renewable_energy_consumption: 96.5,
    });
  });
});
