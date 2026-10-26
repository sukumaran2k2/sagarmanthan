/* global describe, it, expect */
import {
  ACTUAL_GROUPS,
  CRUISE_FIELDS,
  INPUT_FIELDS,
  TARGET_FIELDS,
  activeFields,
  buildPayload,
  computeDerived,
  savedFerryAnswer,
  toFormValues,
  validateValues,
} from '../../pages/CruisePassengerTraffic/cruisePassengerConfig';

describe('cruisePassengerConfig', () => {
  it('keeps the earlier portal fields, with the totals beside the cruise values', () => {
    expect(INPUT_FIELDS.map((f) => f.label)).toEqual([
      'Total Cruise Vessel Calls - Domestic', 'Total Cruise Vessel Calls - International',
      'Total Cruise Passengers - Domestic', 'Total Cruise Passengers - International',
      'Total Ferry Calls', 'Total Ferry Passengers',
    ]);
    expect(ACTUAL_GROUPS.flatMap((g) => g.fields).filter((f) => f.computed).map((f) => f.key))
      .toEqual(['total_cruise_vessel_calls', 'total_cruise_passengers']);
    expect(TARGET_FIELDS.map((f) => f.key)).toEqual(['target_cruise_vessel_calls', 'target_ferry_calls']);
  });

  it('asks for ferry values only when the port handles passenger ferries', () => {
    expect(activeFields(false)).toEqual(CRUISE_FIELDS);
    expect(activeFields(true)).toEqual(INPUT_FIELDS);
  });

  it('reads the saved ferry answer, inferring it for older records', () => {
    expect(savedFerryAnswer({ handles_passenger_ferry: false, total_ferry_calls: 3 })).toBe(false);
    expect(savedFerryAnswer({ handles_passenger_ferry: true })).toBe(true);
    expect(savedFerryAnswer({ handles_passenger_ferry: null, total_ferry_calls: 0 })).toBe(true);
    expect(savedFerryAnswer({ handles_passenger_ferry: null, total_ferry_calls: null })).toBeNull();
    expect(savedFerryAnswer(null)).toBeNull();
  });

  it('adds up the cruise totals once both values are entered', () => {
    expect(computeDerived({
      total_cruise_vessel_domestic: '2', total_cruise_vessel_international: '3',
      total_cruise_passengers_domestic: '100', total_cruise_passengers_international: '',
    })).toEqual({ total_cruise_vessel_calls: 5, total_cruise_passengers: null });
  });

  it('accepts whole numbers of zero or more only', () => {
    const errors = validateValues(CRUISE_FIELDS, {
      total_cruise_vessel_domestic: '',
      total_cruise_vessel_international: '-1',
      total_cruise_passengers_domestic: '2.5',
      total_cruise_passengers_international: '0',
    });
    expect(errors).toEqual({
      total_cruise_vessel_domestic: 'Required',
      total_cruise_vessel_international: 'Cannot be negative',
      total_cruise_passengers_domestic: 'Enter a whole number',
    });
  });

  it('converts between saved rows, form strings and the payload', () => {
    const form = toFormValues(INPUT_FIELDS, { total_cruise_vessel_domestic: 4, total_ferry_calls: null });
    expect(form.total_cruise_vessel_domestic).toBe('4');
    expect(form.total_ferry_calls).toBe('');
    expect(buildPayload(CRUISE_FIELDS, { ...form, total_cruise_vessel_international: '1' })).toEqual({
      total_cruise_vessel_domestic: 4,
      total_cruise_vessel_international: 1,
      total_cruise_passengers_domestic: null,
      total_cruise_passengers_international: null,
    });
  });
});
