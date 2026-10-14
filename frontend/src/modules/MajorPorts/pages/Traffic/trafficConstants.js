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

export const TRAFFIC_CELL_DIMENSIONS = TRAFFIC_CATEGORIES.flatMap((category) =>
  TRAFFIC_DIRECTIONS.flatMap((direction) =>
    TRAFFIC_FLAG_TYPES.map((flag) => ({
      categoryId: category.id,
      directionId: direction.id,
      flagTypeId: flag.id,
      categoryName: category.name,
      directionName: direction.name,
      flagTypeName: flag.name,
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

export const MONTH_NAME_TO_NUM = Object.fromEntries(
  FY_MONTHS.map((m) => [m.label.toLowerCase(), m.value])
);

export const MONTH_NUM_TO_NAME = Object.fromEntries(
  FY_MONTHS.map((m) => [m.value, m.label])
);

// commodity_id 28 = TEU; 27 = container tonnes (not TEU)
export const TEU_COMMODITY_IDS = new Set([28]);

export const CONTAINER_TEU_COMMODITY_ID = 28;

export function trafficDimensionColKey(dim) {
  return `${dim.categoryName}_${dim.directionName}_${dim.flagTypeName}`;
}

export function buildFinancialYearOptions(span = 8) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const options = [];
  for (let i = 0; i < span; i += 1) {
    const y = startYear - i + 2;
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

export const LIST_VIEW_MODES = [
  { id: 'actuals', label: 'Actuals' },
  { id: 'targets', label: 'Targets' },
];

export const ACTUALS_SUB_VIEWS = [
  { id: 'periods', label: 'Period Summary' },
  { id: 'commodity', label: 'Commodity Data' },
  { id: 'roro', label: 'Ro-Ro / Ro-Pax' },
];
