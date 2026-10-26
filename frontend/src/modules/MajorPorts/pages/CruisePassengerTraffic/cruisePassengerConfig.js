/**
 * KPI Major Ports — Cruise and Passenger Traffic fields, as on the earlier portal's form
 * (trafficVessel.html). The server holds the same list (controllers/KPI/cruisePassengerTrafficEntry.js).
 *
 * Every value is a count: a whole number of zero or more.
 * ferry: entered only when the port handles passenger ferries (stored empty otherwise).
 * computed: shown read-only, calculated from the other values.
 */

const count = (key, label, ferry = false) => ({ key, label, kind: 'count', required: true, ferry, digits: 0 });
const computed = (key, label) => ({ key, label, computed: true, digits: 0 });

export const CRUISE_FIELDS = [
  count('total_cruise_vessel_domestic', 'Total Cruise Vessel Calls - Domestic'),
  count('total_cruise_vessel_international', 'Total Cruise Vessel Calls - International'),
  count('total_cruise_passengers_domestic', 'Total Cruise Passengers - Domestic'),
  count('total_cruise_passengers_international', 'Total Cruise Passengers - International'),
];

export const FERRY_FIELDS = [
  count('total_ferry_calls', 'Total Ferry Calls', true),
  count('total_ferry_passengers', 'Total Ferry Passengers', true),
];

export const INPUT_FIELDS = [...CRUISE_FIELDS, ...FERRY_FIELDS];

const [cruiseCallsDomestic, cruiseCallsInternational, cruisePassengersDomestic, cruisePassengersInternational] = CRUISE_FIELDS;

export const ACTUAL_GROUPS = [
  {
    id: 'cruiseCalls',
    title: 'Cruise Vessel Calls',
    fields: [
      cruiseCallsDomestic,
      cruiseCallsInternational,
      computed('total_cruise_vessel_calls', 'Total Cruise Vessel Calls'),
    ],
  },
  {
    id: 'cruisePassengers',
    title: 'Cruise Passengers',
    fields: [
      cruisePassengersDomestic,
      cruisePassengersInternational,
      computed('total_cruise_passengers', 'Total Cruise Passengers'),
    ],
  },
  {
    id: 'ferry',
    title: 'Passenger Ferries',
    ferry: true,
    fields: FERRY_FIELDS,
  },
];

/** Financial-year targets set by the Ministry (keys as the API returns them). */
export const TARGET_FIELDS = [
  count('target_cruise_vessel_calls', 'Target Cruise Vessel Calls'),
  count('target_ferry_calls', 'Target Ferry Calls'),
];

// Labels have no unit: every value is a number of calls or passengers
export const fieldLabel = (field) => field.label;

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';
const toNumber = (value) => (isBlank(value) ? null : Number(value));

/** Saved values (numbers or null) → form strings. */
export function toFormValues(fields, row = {}) {
  return Object.fromEntries(fields.map((f) => [f.key, isBlank(row?.[f.key]) ? '' : String(row[f.key])]));
}

/**
 * The ferry answer of a saved record. Older records may have no answer: they handled ferries
 * when ferry values were saved; otherwise the user has to answer again (null).
 */
export function savedFerryAnswer(row) {
  if (!row) return null;
  if (row.handles_passenger_ferry === true || row.handles_passenger_ferry === false) return row.handles_passenger_ferry;
  return FERRY_FIELDS.some((f) => !isBlank(row[f.key])) ? true : null;
}

/** The fields to fill for a ferry answer: cruise always, ferry only when ferries are handled. */
export const activeFields = (handlesFerry) => (handlesFerry ? INPUT_FIELDS : CRUISE_FIELDS);

/** Total cruise calls and passengers; null while their inputs are incomplete. */
export function computeDerived(values) {
  const n = (key) => {
    const v = toNumber(values[key]);
    return Number.isFinite(v) ? v : null;
  };
  const sum = (a, b) => (n(a) !== null && n(b) !== null ? n(a) + n(b) : null);
  return {
    total_cruise_vessel_calls: sum('total_cruise_vessel_domestic', 'total_cruise_vessel_international'),
    total_cruise_passengers: sum('total_cruise_passengers_domestic', 'total_cruise_passengers_international'),
  };
}

/** { [key]: message } for every invalid or missing value. */
export function validateValues(fields, values) {
  const errors = {};
  fields.forEach((f) => {
    if (f.computed) return;
    const raw = values[f.key];
    if (isBlank(raw)) {
      if (f.required) errors[f.key] = 'Required';
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) errors[f.key] = 'Enter a number';
    else if (n < 0) errors[f.key] = 'Cannot be negative';
    else if (!Number.isInteger(n)) errors[f.key] = 'Enter a whole number';
  });
  return errors;
}

/** Form strings → { key: number | null } for the given (non-computed) fields. */
export function buildPayload(fields, values) {
  return Object.fromEntries(fields.filter((f) => !f.computed).map((f) => [f.key, toNumber(values[f.key])]));
}
