/**
 * KPI Major Ports — Financial Parameters fields, as on the earlier portal's form.
 * The server holds the same list (controllers/KPI/financialParameterEntry.js) and is the
 * one that stores the calculated values.
 *
 * kind "amount": zero or more; "signed": may be negative (an operating loss).
 * computed: shown read-only, calculated from the other values.
 */

const amount = (key, label, unit) => ({ key, label, unit, kind: 'amount', required: true });
const profit = (key, label, unit, required = false) => ({ key, label, unit, kind: 'signed', required });
const computed = (key, label, unit) => ({ key, label, unit, computed: true });

export const ACTUAL_GROUPS = [
  {
    id: 'incomeExpenditure',
    title: 'Income & Expenditure',
    unit: 'In Cr.',
    fields: [
      amount('operating_income', 'Operating Income', 'In Cr.'),
      amount('operating_expenditure', 'Operating Expenditure', 'In Cr.'),
      amount('total_income', 'Total Income', 'In Cr.'),
      amount('total_expenditure', 'Total Expenditure', 'In Cr.'),
    ],
  },
  {
    id: 'surplus',
    title: 'Surplus & Operating Ratio',
    note: 'Calculated from the income and expenditure above.',
    fields: [
      computed('operating_surplus', 'Operating Surplus', 'In Cr.'),
      computed('net_surplus', 'Net Surplus', 'In Cr.'),
      computed('operating_ratio', 'Operating Ratio', '%'),
    ],
  },
  {
    id: 'costProfit',
    title: 'Handling Cost & Operating Profit',
    note: 'Operating profit may be negative for a loss.',
    fields: [
      amount('per_tonne_handling_cost', 'Per Tonne Handling Cost', 'In Rupees'),
      profit('operating_profit_tonne', 'Operating Profit / Tonne', 'in INR Crs/Tonne', true),
      profit('teu_container', 'Operating Profit / TEU of Container', 'in INR Crs/TEU'),
      profit('tonne_dry_bulk', 'Operating Profit / Tonne of Dry Bulk', 'in INR Crs/Tonne'),
      profit('tonne_break_bulk', 'Operating Profit / Tonne of Break Bulk', 'in INR Crs/Tonne'),
      profit('tonne_liquid_bulk', 'Operating Profit / Tonne of Liquid Bulk', 'in INR Crs/Tonne'),
    ],
  },
];

export const ACTUAL_FIELDS = ACTUAL_GROUPS.flatMap((g) => g.fields);
export const INPUT_FIELDS = ACTUAL_FIELDS.filter((f) => !f.computed);

/** Financial-year targets set by the Ministry (keys as the API returns them). */
export const TARGET_FIELDS = [
  profit('target_operating_profit', 'Target Operating Profit / Tonne', 'in INR Crs/Tonne', true),
  profit('target_teu_container', 'Target Operating Profit / TEU of Container', 'in INR Crs/TEU', true),
  profit('target_tonof_drybulk', 'Target Operating Profit / Tonne of Dry Bulk', 'in INR Crs/Tonne', true),
  profit('target_tonof_breakbulk', 'Target Operating Profit / Tonne of Break Bulk', 'in INR Crs/Tonne', true),
  profit('target_tonof_liquidbulk', 'Target Operating Profit / Tonne of Liquid Bulk', 'in INR Crs/Tonne', true),
  profit('target_operating_surplus', 'Target Operating Surplus', 'In Cr.', true),
];

export const fieldLabel = (field) => `${field.label} (${field.unit})`;

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';
const toNumber = (value) => (isBlank(value) ? null : Number(value));
const round2 = (n) => Math.round(n * 100) / 100;

/** Saved values (numbers or null) → form strings. */
export function toFormValues(fields, row = {}) {
  return Object.fromEntries(fields.map((f) => [f.key, isBlank(row?.[f.key]) ? '' : String(row[f.key])]));
}

/** Operating surplus, net surplus and operating ratio; null while their inputs are incomplete. */
export function computeDerived(values) {
  const n = (key) => {
    const v = toNumber(values[key]);
    return Number.isFinite(v) ? v : null;
  };
  const income = n('operating_income');
  const expenditure = n('operating_expenditure');
  const totalIncome = n('total_income');
  const totalExpenditure = n('total_expenditure');
  return {
    operating_surplus: income !== null && expenditure !== null ? round2(income - expenditure) : null,
    net_surplus: totalIncome !== null && totalExpenditure !== null ? round2(totalIncome - totalExpenditure) : null,
    operating_ratio: income > 0 && expenditure !== null ? round2((expenditure * 100) / income) : null,
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
    else if (f.kind === 'amount' && n < 0) errors[f.key] = 'Cannot be negative';
  });
  return errors;
}

/** Form strings → { key: number | null } for the given (non-computed) fields. */
export function buildPayload(fields, values) {
  return Object.fromEntries(fields.filter((f) => !f.computed).map((f) => [f.key, toNumber(values[f.key])]));
}
