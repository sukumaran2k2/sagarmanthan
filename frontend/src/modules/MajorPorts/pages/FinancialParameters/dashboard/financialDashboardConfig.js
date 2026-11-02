/**
 * KPI Financial Dashboard — a copy of the earlier portal's financialDashboard.html (eight
 * cards) and detailedKPIFinancialDashboard.html (organisation-wise detail of one card).
 *
 * Data: GET /kpi/financial-parameters/dashboard/summary returns `${base}_current`,
 * `${base}_last` and `${base}_yoy` for every card; /drill?kpi=<card kpi> returns one row per
 * organisation plus "SMPA Total" and "Overall Total".
 *
 * reverse: ▼ shows green and ▲ red. Same cards as the earlier page's formatYoY(value, true):
 * Operating Expenditure, Total Income and Total Expenditure.
 */

const card = (kpi, base, title, unit, icon, reverse = false) => ({
  kpi,
  title: `${title} (${unit})`,
  heading: `Financial - ${title} (${unit})`,
  unit,
  icon,
  source: 'summary',
  fields: { current: `${base}_current`, last: `${base}_last`, yoy: `${base}_yoy` },
  format: 'F2',
  reverse,
  drill: { type: 'financial', kpi },
});

// Two rows of four, in the earlier page's order
export const FINANCIAL_CARDS = [
  card('operating_income', 'op_income', 'Operating Income', 'In Cr.', 'ship'),
  card('operating_expenditure', 'operating_expenditure', 'Operating Expenditure', 'In Cr.', 'clock', true),
  card('total_income', 'total_income', 'Total Income', 'In Cr.', 'boxes', true),
  card('total_expenditure', 'total_expenditure', 'Total Expenditure', 'In Cr.', 'line', true),
  card('operating_surplus', 'operating_surplus', 'Operating Surplus', 'In Cr.', 'industry'),
  card('net_surplus', 'net_surplus', 'Net Surplus', 'In Cr.', 'down'),
  card('operating_ratio', 'op_ratio', 'Operating Ratio', '%', 'up'),
  card('per_tonne_handling_cost', 'per_tonne_handling_cost', 'Per Tonne Handling Cost', 'In Cr.', 'down'),
];

export const FINANCIAL_DASHBOARD_PANELS = [
  { id: 'financial', label: 'Financial', icon: 'coins', heading: 'Financial', sub: 'Overview of financial performance' },
];

// Tamil Nadu Maritime Board and PWD Goa: listed below the major ports, summed as "SMPA Total"
const SMPA_ORG_IDS = [54, 55];
// The earlier portal shows Syama Prasad Mookerjee Port's choice as the SMPA group
const SMPA_GROUP_ORG_ID = 4;
const TOTAL_ROWS = ['SMPA Total', 'Overall Total'];

const isTotal = (row) => TOTAL_ROWS.includes(row.organisation_name);

/**
 * Splits the detail rows as the earlier page did:
 *  - all organisations: major ports, then pinned SMPA docks, SMPA Total and Overall Total;
 *  - the SMPA group (organisation 4): the two SMPA docks and SMPA Total;
 *  - one organisation: its own row only.
 */
export function splitFinancialDrillRows(rows = [], organisationId = 0) {
  const orgId = Number(organisationId) || 0;
  const byId = (id) => rows.find((r) => Number(r.organisation_id) === id && !isTotal(r));
  const named = (name) => rows.find((r) => r.organisation_name === name);

  if (orgId === SMPA_GROUP_ORG_ID) {
    return { rows: [...SMPA_ORG_IDS.map(byId), named('SMPA Total')].filter(Boolean), pinned: [] };
  }
  if (orgId > 0) return { rows: rows.filter((r) => !isTotal(r)), pinned: [] };
  return {
    rows: rows.filter((r) => !isTotal(r) && !SMPA_ORG_IDS.includes(Number(r.organisation_id))),
    pinned: [...SMPA_ORG_IDS.map(byId), named('SMPA Total'), named('Overall Total')].filter(Boolean),
  };
}

export const financialCard = (kpi) => FINANCIAL_CARDS.find((c) => c.kpi === kpi);
