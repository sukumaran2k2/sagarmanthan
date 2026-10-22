/**
 * KPI Major Ports — Renewable Energy fields, as on the earlier portal's form
 * (addKpiRenewableEnergy.html). The server holds the same list (controllers/KPI/renewableEnergyEntry.js).
 *
 * Every value is energy in MWh: a number of zero or more with at most two decimals.
 * hint: the small line the earlier portal showed under the label.
 * listLabel: the shorter column heading the earlier portal's list used.
 */

const SOURCE_HINT = '(Including self-generated + grid procurement)';

const energy = (key, label, listLabel) => ({
  key, label, listLabel, unit: 'MWh', hint: SOURCE_HINT, kind: 'amount', required: true,
});

export const INPUT_FIELDS = [
  energy('electrical_energy_consumption', 'Total Electrical Energy Consumption', 'Total Electrical Energy'),
  energy('renewable_energy_consumption', 'Total Renewable Energy Consumption', 'Total Renewable Energy'),
];

/** Financial-year target set by the Ministry (key as the API returns it). */
export const TARGET_FIELDS = [
  energy('target_renewable_energy_consumption', 'Target Total Renewable Energy Consumption', 'Target Total Renewable Energy Consumption'),
];

export const fieldLabel = (field) => `${field.label} (${field.unit})`;
export const columnLabel = (field) => `${field.listLabel} (${field.unit})`;

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';
const toNumber = (value) => (isBlank(value) ? null : Number(value));

/** Saved values (numbers or null) → form strings. */
export function toFormValues(fields, row = {}) {
  return Object.fromEntries(fields.map((f) => [f.key, isBlank(row?.[f.key]) ? '' : String(row[f.key])]));
}

/**
 * True when renewable consumption is above the total. Allowed (a port generating more solar power
 * than it uses has reported so), but worth a second look before saving.
 */
export function renewableExceedsTotal(values) {
  const electrical = toNumber(values.electrical_energy_consumption);
  const renewable = toNumber(values.renewable_energy_consumption);
  return Number.isFinite(electrical) && Number.isFinite(renewable) && renewable > electrical;
}

const hasMoreThanTwoDecimals = (n) => Math.abs(n * 100 - Math.round(n * 100)) > 1e-6;

/** { [key]: message } for every invalid or missing value. */
export function validateValues(fields, values) {
  const errors = {};
  fields.forEach((f) => {
    const raw = values[f.key];
    if (isBlank(raw)) {
      if (f.required) errors[f.key] = 'Required';
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) errors[f.key] = 'Enter a number';
    else if (n < 0) errors[f.key] = 'Cannot be negative';
    else if (hasMoreThanTwoDecimals(n)) errors[f.key] = 'Use at most 2 decimal places';
  });
  return errors;
}

/** Form strings → { key: number | null } for the given fields. */
export function buildPayload(fields, values) {
  return Object.fromEntries(fields.map((f) => [f.key, toNumber(values[f.key])]));
}
