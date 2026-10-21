export const TRAFFIC_COMMODITY_GROUPS = [
  { id: 1, key: 'liquidBulk', label: 'Liquid Bulk' },
  { id: 2, key: 'dryBulk', label: 'Dry Bulk' },
  { id: 3, key: 'breakBulk', label: 'Break Bulk' },
  { id: 4, key: 'container', label: 'Container' },
];

export const TRAFFIC_WIZARD_STEPS = [
  { id: 'roro', label: 'Ro-Ro / Ro-Pax' },
  ...TRAFFIC_COMMODITY_GROUPS.map((g) => ({
    id: g.key,
    label: g.label,
    groupId: g.id,
  })),
];

export const TRAFFIC_CATEGORIES = [
  { id: 1, name: 'Direct Coastal', transhipment: false },
  { id: 2, name: 'Direct Exim', transhipment: false },
  { id: 3, name: 'Coastal', transhipment: true },
  { id: 4, name: 'International', transhipment: true },
  { id: 5, name: 'Coastal + International', transhipment: true },
];

export const TRAFFIC_DIRECTIONS = [
  { id: 1, name: 'Unloaded' },
  { id: 2, name: 'Loaded' },
];

export const TRAFFIC_FLAG_TYPES = [
  { id: 1, name: 'Indian Flag' },
  { id: 2, name: 'Foreign Flag' },
];

// key matches the pivot columns returned by GET /kpi/traffic/actuals?view=commodity
export const TRAFFIC_CELL_DIMENSIONS = TRAFFIC_CATEGORIES.flatMap((category) =>
  TRAFFIC_DIRECTIONS.flatMap((direction) =>
    TRAFFIC_FLAG_TYPES.map((flag) => ({
      key: `c${category.id}_d${direction.id}_f${flag.id}`,
      categoryId: category.id,
      directionId: direction.id,
      flagTypeId: flag.id,
      label: `${category.name} · ${direction.name} · ${flag.name}`,
    }))
  )
);

export const FY_MONTHS = [
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
];

export const MONTH_NUM_TO_NAME = Object.fromEntries(FY_MONTHS.map((m) => [m.value, m.label]));

// commodity_id 28 = Container (In 000 TEUs); 27 = Container (In 000 Tonnes)
export const TEU_COMMODITY_ID = 28;

// Days 1–8 of each month are open for entry; later changes need a ministry unlock
export const ENTRY_WINDOW_LAST_DAY = 8;

export function currentFinancialYear(today = new Date()) {
  const start = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

/** Newest first. ahead = future years to include (targets are set before the year starts). */
export function buildFinancialYearOptions({ back = 6, ahead = 0 } = {}) {
  const start = Number(currentFinancialYear().slice(0, 4));
  const options = [];
  for (let y = start + ahead; y >= start - back; y -= 1) {
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

/** True when the month has not started yet (no actuals can exist for it). */
export function isFuturePeriod(fiscalYear, month, today = new Date()) {
  const startYear = Number(String(fiscalYear).slice(0, 4));
  const m = Number(month);
  if (!startYear || !m) return false;
  const year = m >= 4 ? startYear : startYear + 1;
  return new Date(year, m - 1, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
}

export const DATA_LIST_VIEWS = [
  { id: 'period', label: 'Period Summary' },
  { id: 'commodity', label: 'Commodity Data' },
  { id: 'roro', label: 'Ro-Ro / Ro-Pax' },
];

export const ACCESS_STATUS_TABS = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'REVOKED', label: 'Revoked' },
];
