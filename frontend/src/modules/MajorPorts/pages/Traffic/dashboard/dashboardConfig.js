import { FY_MONTHS, currentFinancialYear } from '../trafficConstants';

/**
 * KPI Traffic & Port Performance dashboard — a copy of the earlier portal's
 * trafficDashboard.html: same panels, cards, titles, fields and drill-downs.
 *
 * Data sources (one request each, shared by all panels):
 *   traffic     = getKPITrafficDashboard      cargo   = getKPICargoDashboard
 *   performance = getAllTrafficDashboardKPIs  coastal = getTrafficCoastalCommodityWise
 * A card reads `${base}_current`, `${base}_last`, `${base}_yoy` unless it lists its fields.
 * Drill types open the matching "Detail of KPI" page:
 *   traffic → drill/traffic, cargo → drill/cargo, performance → drill/performance, coastal → drill/coastal
 */

export const DATA_SOURCES = ['traffic', 'cargo', 'performance', 'coastal'];

const card = (title, icon, source, base, options = {}) => ({
  title,
  icon,
  source,
  fields: options.fields || { current: `${base}_current`, last: `${base}_last`, yoy: `${base}_yoy` },
  format: options.format || 'F2',
  reverse: Boolean(options.reverse),
  drill: { type: options.drillType, kpi: options.kpi ?? base },
});

const coastal = (title, icon, key, kpi, format) => card(title, icon, 'coastal', null, {
  fields: { current: `${key}.current_total`, last: `${key}.last_total`, yoy: `${key}.yoy_percent` },
  drillType: 'coastal',
  kpi,
  format,
});

const CALL_SIZES = [
  ['less_than_251', '( < 250)'], ['251_to_500', '(251 - 500)'], ['501_to_1000', '(501-1000)'],
  ['1001_to_1500', '(1001-1500)'], ['1501_to_2000', '(1501-2000)'], ['2001_to_2500', '(2001-2500)'],
  ['2501_to_3000', '(2501-3000)'], ['3001_to_4000', '(3001-4000)'], ['4001_to_6000', '(4001-6000)'],
  ['greater_than_6000', '(>6000)'],
];
const CALL_SIZE_ICONS = ['clock', 'line', 'down', 'up'];
const callSizeIcon = (index) => CALL_SIZE_ICONS[index % CALL_SIZE_ICONS.length];

// Sidebar order follows the earlier portal, with Overall moved to the top
export const DASHBOARD_PANELS = [
  { id: 'overall', label: 'Overall', icon: 'bars', heading: 'Overall KPI Summary', type: 'overall' },
  {
    id: 'traffic-cargo',
    label: 'Traffic',
    icon: 'ship',
    heading: 'Traffic',
    sub: 'Overview of traffic and throughput',
    sections: [{
      cards: [
        card('Total Traffic (In MMT)', 'ship', 'traffic', 'total_traffic', { drillType: 'traffic', kpi: 'traffic' }),
        card('Traffic - Container (In MMT)', 'up', 'cargo', null, {
          fields: { current: 'total_traffic_container_current', last: 'total_traffic_container_last', yoy: 'total_traffic_yoy_container' },
          drillType: 'cargo', kpi: 'total_traffic_container',
        }),
        card('Traffic - Dry Bulk (In MMT)', 'clock', 'cargo', null, {
          fields: { current: 'total_traffic_current_dry', last: 'total_traffic_last_dry', yoy: 'total_traffic_yoy_dry' },
          drillType: 'cargo', kpi: 'total_traffic_dry',
        }),
        card('Traffic - Break Bulk (In MMT)', 'line', 'cargo', null, {
          fields: { current: 'total_traffic_break_current', last: 'total_traffic_break_last', yoy: 'total_traffic_yoy_break' },
          drillType: 'cargo', kpi: 'total_traffic_break',
        }),
        card('Traffic - Liquid Bulk (In MMT)', 'down', 'cargo', null, {
          fields: { current: 'total_traffic_liquid_current', last: 'total_traffic_liquid_last', yoy: 'total_traffic_yoy_liquid' },
          drillType: 'cargo', kpi: 'total_traffic_liquid',
        }),
        card('Traffic - Container (In 000 TEUs)', 'down', 'cargo', null, {
          fields: { current: 'total_traffic_container_teus_current', last: 'total_traffic_container_teus_last', yoy: 'total_traffic_yoy_container_teus' },
          drillType: 'cargo', kpi: 'total_traffic_container_teus',
        }),
        coastal('Total Coastal Traffic (In MMT)', 'ship', 'total_coastal_traffic', 'total-coastal-traffic'),
        coastal('Coastal Traffic - Container (In MMT)', 'up', 'container_tonnes', 'coastal_traffic_container'),
        coastal('Coastal Traffic - Dry Bulk (In MMT)', 'clock', 'dry', 'coastal_traffic_dry'),
        coastal('Coastal Traffic - Break Bulk (In MMT)', 'line', 'break_bulk', 'coastal_traffic_break'),
        coastal('Coastal Traffic - Liquid Bulk (In MMT)', 'down', 'liquid', 'coastal_traffic_liquid'),
        coastal('Coastal Traffic - Container (In 000 TEUs)', 'down', 'container_teus', 'coastal_traffic_container_teus', 'WN'),
      ],
    }],
  },
  {
    id: 'avg-trt',
    label: 'Turnaround Time',
    icon: 'line',
    heading: 'Turnaround time',
    sections: [
      {
        title: 'Average TRT',
        cards: [
          card('Average TRT - Overall (In Hours)', 'clock', 'traffic', 'avg_trt', { reverse: true, drillType: 'traffic' }),
          card('Average Container TRT (In Hours)', 'up', 'cargo', 'avg_container_trt', { reverse: true, drillType: 'cargo', kpi: 'avg_container' }),
          card('Average Dry Bulk TRT (In Hours)', 'clock', 'cargo', 'avg_dry_bulk_trt', { reverse: true, drillType: 'cargo', kpi: 'avg_dry' }),
          card('Average Break Bulk TRT (In Hours)', 'line', 'cargo', 'avg_break_bulk_trt', { reverse: true, drillType: 'cargo', kpi: 'avg_break' }),
          card('Average Liquid Bulk TRT (In Hours)', 'down', 'cargo', 'avg_liquid_bulk_trt', { reverse: true, drillType: 'cargo', kpi: 'avg_liquid' }),
        ],
      },
      {
        title: 'Median TRT',
        cards: [
          card('Median TRT - Overall (In Hours)', 'line', 'traffic', 'median_trt', { reverse: true, drillType: 'traffic' }),
          card('Median Container TRT (In Hours)', 'up', 'cargo', 'median_container_trt', { reverse: true, drillType: 'cargo', kpi: 'median_container' }),
          card('Median Dry Bulk TRT (In Hours)', 'clock', 'cargo', 'median_dry_bulk_trt', { reverse: true, drillType: 'cargo', kpi: 'median_dry' }),
          card('Median Break Bulk TRT (In Hours)', 'line', 'cargo', 'median_break_bulk_trt', { reverse: true, drillType: 'cargo', kpi: 'median_break' }),
          card('Median Liquid Bulk TRT (In Hours)', 'down', 'cargo', 'median_liquid_bulk_trt', { reverse: true, drillType: 'cargo', kpi: 'median_liquid' }),
        ],
      },
      {
        title: 'Average Container TRT - Call Size',
        cards: CALL_SIZES.map(([range, label], i) => card(
          `Average Container TRT - Call Size ${label} (In Hours)`, callSizeIcon(i), 'performance', `avg_container_trt_${range}`,
          { reverse: true, drillType: 'performance' }
        )),
      },
      {
        title: 'Average Container TRT - Call Size (As per CPPI)',
        cards: CALL_SIZES.map(([range, label], i) => card(
          `Average Container TRT - Call Size ${label} (In Hours) (As per CPPI)`, callSizeIcon(i), 'performance', `avg_${range}_cppi`,
          { reverse: true, drillType: 'performance', kpi: `avg_container_trt_${range}_cppi` }
        )),
      },
    ],
  },
  {
    id: 'osbd',
    label: 'Output per Ship Berth Day',
    icon: 'industry',
    heading: 'Output per Ship Berth Day',
    sub: 'Output per Ship Berth Day',
    sections: [{
      cards: [
        card('Output per Ship Berth Day – Overall (In tonnes)', 'industry', 'traffic', 'osbd', { format: 'WN', drillType: 'traffic' }),
        card('Output per Ship Berth Day – Container (In tonnes)', 'up', 'cargo', 'container_osbd', { format: 'WN', drillType: 'cargo', kpi: 'osbd_container' }),
        card('Output per Ship Berth Day – Dry bulk (In tonnes)', 'clock', 'cargo', 'dry_bulk_osbd', { format: 'WN', drillType: 'cargo', kpi: 'osbd_dry' }),
        card('Output per Ship Berth Day – Break bulk (In tonnes)', 'line', 'cargo', 'break_bulk_osbd', { format: 'WN', drillType: 'cargo', kpi: 'osbd_break' }),
        card('Output per Ship Berth Day – Liquid Bulk (In tonnes)', 'down', 'cargo', 'liquid_bulk_osbd', { format: 'WN', drillType: 'cargo', kpi: 'osbd_liquid' }),
        card('Output per Ship Berth Day – Container (In TEUs)', 'clock', 'performance', 'osbd_container_teus', { format: 'WN', drillType: 'performance' }),
      ],
    }],
  },
  {
    id: 'dwell-time',
    label: 'Dwell Time',
    icon: 'anchor',
    heading: 'Dwell Time',
    sub: 'Dwell Time',
    sections: [{
      cards: [
        card('Dwell Time – Import (in hours)', 'down', 'traffic', 'import_dwell', { reverse: true, drillType: 'traffic' }),
        card('Dwell Time – Export (in hours)', 'up', 'traffic', 'export_dwell', { reverse: true, drillType: 'traffic' }),
      ],
    }],
  },
  {
    id: 'cargo-handling',
    label: 'Efficiency',
    icon: 'boxes',
    heading: 'Efficiency',
    sub: 'Cargo handling efficiency in Tons/Min',
    sections: [
      {
        title: 'Loading Efficiency',
        small: true,
        cards: [
          card('Gross Crane Productivity (Moves/Hr)', 'gears', 'traffic', 'gross_crane_productivity', { drillType: 'traffic', kpi: 'gross_crane' }),
          card('Loading Dry Bulk Efficiency (Tons/Min)', 'industry', 'traffic', 'loading_dry_bulk_efficiency', { drillType: 'traffic', kpi: 'loading_dry' }),
          card('Loading Break Bulk Efficiency (Tons/Min)', 'down', 'traffic', 'loading_break_bulk_efficiency', { drillType: 'traffic', kpi: 'loading_break' }),
          card('Loading Liquid Bulk Efficiency (Tons/Min)', 'droplet', 'traffic', 'loading_liquid_bulk_efficiency', { drillType: 'traffic', kpi: 'loading_liquid' }),
        ],
      },
      {
        title: 'Unloading Efficiency',
        small: true,
        cards: [
          card('Unloading Dry Bulk Efficiency (Tons/Min)', 'truck', 'traffic', 'unloading_dry_bulk_efficiency', { drillType: 'traffic', kpi: 'unloading_dry' }),
          card('Unloading Break Bulk Efficiency (Tons/Min)', 'industry', 'traffic', 'unloading_break_bulk_efficiency', { drillType: 'traffic', kpi: 'unloading_break' }),
          card('Unloading Liquid Bulk Efficiency (Tons/Min)', 'droplet', 'traffic', 'unloading_liquid_bulk_efficiency', { drillType: 'traffic', kpi: 'unloading_liquid' }),
        ],
      },
    ],
  },
  {
    id: 'pre-berthing-port',
    label: 'Pre-Berthing Time',
    icon: 'clock',
    heading: 'Pre-Berthing Time',
    sub: 'Pre-Berthing Time',
    sections: [
      {
        cards: [
          ['Overall', 'clock', 'total_port', 'total_port'],
          ['Dry Bulk', 'clock', 'average_dry_bulk_port', 'dry_bulk_port'],
          ['Break Bulk', 'line', 'average_break_bulk_port', 'break_bulk_port'],
          ['Liquid Bulk', 'down', 'average_liquid_bulk_port', 'liquid_bulk_port'],
          ['Container', 'up', 'average_container_port', 'container_port'],
        ].map(([name, icon, base, kpi]) => card(`Pre-Berthing Time – Hours (Under Port A/c) – ${name}`, icon, 'performance', base,
          { reverse: true, drillType: 'performance', kpi })),
      },
      {
        cards: [
          ['Overall', 'clock', 'total_non_port', 'total_non_port'],
          ['Dry Bulk', 'clock', 'average_dry_bulk_non_port', 'dry_bulk_non_port'],
          ['Break Bulk', 'line', 'average_break_bulk_non_port', 'break_bulk_non_port'],
          ['Liquid Bulk', 'down', 'average_liquid_bulk_non_port', 'liquid_bulk_non_port'],
          ['Container', 'up', 'average_container_non_port', 'container_non_port'],
        ].map(([name, icon, base, kpi]) => card(`Pre-Berthing Time – Hours (Non-Port A/c) – ${name}`, icon, 'performance', base,
          { reverse: true, drillType: 'performance', kpi })),
      },
    ],
  },
  {
    id: 'idle-time',
    label: 'Idle Time',
    icon: 'hourglass',
    heading: 'Idle Time',
    sub: 'Idle Time',
    sections: [{
      cards: [
        ['Idle Time – Overall (In Percentage)', 'clock', 'overall_average_idle_time'],
        ['Idle Time - Dry Bulk (In Percentage)', 'clock', 'average_dry_bulk_idle_time'],
        ['Idle Time - Break Bulk (In Percentage)', 'line', 'average_break_bulk_idle_time'],
        ['Idle Time - Liquid Bulk (In Percentage)', 'down', 'average_liquid_bulk_idle_time'],
        ['Idle Time – Container (In Percentage)', 'up', 'average_container_idle_time'],
      ].map(([title, icon, base]) => card(title, icon, 'performance', base, { reverse: true, drillType: 'performance' })),
    }],
  },
  {
    id: 'vessels',
    label: 'Vessels Handled',
    icon: 'ferry',
    heading: 'Vessels Handled',
    sub: 'Vessel handled counts',
    sections: [
      {
        cards: [
          ['Total Sailed Vessel Handled (In Numbers)', 'clock', 'total_sailed_vessel_handled'],
          ['Dry Bulk Vessel Handled (In Numbers)', 'clock', 'dry_bulk_vessel_handled'],
          ['Break Bulk Vessel Handled (In Numbers)', 'line', 'break_bulk_vessel_handled'],
          ['Liquid Bulk Vessel Handled (In Numbers)', 'down', 'liquid_bulk_vessel_handled'],
          ['Container Vessel Handled (In Numbers)', 'up', 'container_vessel_handled'],
        ].map(([title, icon, base]) => card(title, icon, 'performance', base, { format: 'WN', drillType: 'performance' })),
      },
      {
        cards: [
          ['Parcel Size – Overall', 'clock', 'total_parcel_time', 'total_parcel_time'],
          ['Parcel Size – Dry Bulk', 'clock', 'average_dry_bulk_parcel_size', 'dry_bulk_parcel_size'],
          ['Parcel Size – Break Bulk', 'line', 'average_break_bulk_parcel_size', 'break_bulk_parcel_size'],
          ['Parcel Size – Liquid Bulk', 'down', 'average_liquid_bulk_parcel_size', 'liquid_bulk_parcel_size'],
          ['Parcel Size – Container', 'up', 'average_container_parcel_size', 'container_parcel_size'],
        ].map(([title, icon, base, kpi]) => card(title, icon, 'performance', base, { format: 'WN', drillType: 'performance', kpi })),
      },
    ],
  },
  { id: 'new-section', label: 'Traffic KPI Summary', icon: 'info', heading: 'Traffic KPI Summary', type: 'summary' },
];

// ---- Overall table ("Cargo Category Wise KPIs (YoY) – Overall") ----------------------
// Cell = [source, base] read as base_last / base_current / base_yoy, or explicit fields.
const cell = (source, base) => ({ source, last: `${base}_last`, current: `${base}_current`, yoy: `${base}_yoy` });
const cellOf = (source, last, current, yoy) => ({ source, last, current, yoy });

export const OVERALL_COLUMNS = ['Dry Bulk', 'Break Bulk', 'Liquid Bulk', 'Container', 'Overall'];

export const OVERALL_ROWS = [
  {
    label: 'Cargo Traffic (MT)', format: 'F2',
    cells: [
      cellOf('cargo', 'total_traffic_last_dry', 'total_traffic_current_dry', 'total_traffic_yoy_dry'),
      cellOf('cargo', 'total_traffic_break_last', 'total_traffic_break_current', 'total_traffic_yoy_break'),
      cellOf('cargo', 'total_traffic_liquid_last', 'total_traffic_liquid_current', 'total_traffic_yoy_liquid'),
      cellOf('cargo', 'total_traffic_container_last', 'total_traffic_container_current', 'total_traffic_yoy_container'),
      cell('traffic', 'total_traffic'),
    ],
  },
  {
    label: 'No. of Vessels', format: 'WN',
    cells: ['dry_bulk', 'break_bulk', 'liquid_bulk', 'container'].map((g) => cell('performance', `${g}_vessel_handled`))
      .concat(cell('performance', 'total_sailed_vessel_handled')),
  },
  {
    label: 'Loading', format: 'F2',
    cells: [cell('traffic', 'loading_dry_bulk_efficiency'), cell('traffic', 'loading_break_bulk_efficiency'), cell('traffic', 'loading_liquid_bulk_efficiency'), null, null],
  },
  {
    label: 'Unloading', format: 'F2',
    cells: [cell('traffic', 'unloading_dry_bulk_efficiency'), cell('traffic', 'unloading_break_bulk_efficiency'), cell('traffic', 'unloading_liquid_bulk_efficiency'), null, null],
  },
  // Overall-only rows sit under Overall (the earlier page showed them under Container by mistake)
  { label: 'GCP', format: 'F2', cells: [null, null, null, null, cell('traffic', 'gross_crane_productivity')] },
  {
    label: 'Idle Time', format: 'F2', reverse: true,
    cells: ['dry_bulk', 'break_bulk', 'liquid_bulk', 'container'].map((g) => cell('performance', `average_${g}_idle_time`))
      .concat(cell('performance', 'overall_average_idle_time')),
  },
  {
    label: 'OSBD', format: 'WN',
    cells: [cell('cargo', 'dry_bulk_osbd'), cell('cargo', 'break_bulk_osbd'), cell('cargo', 'liquid_bulk_osbd'), cell('cargo', 'container_osbd'), cell('traffic', 'osbd')],
  },
  {
    label: 'Parcel Size', format: 'WN',
    cells: ['dry_bulk', 'break_bulk', 'liquid_bulk', 'container'].map((g) => cell('performance', `average_${g}_parcel_size`))
      .concat(cell('performance', 'total_parcel_time')),
  },
  {
    label: 'Median TRT', format: 'F2', reverse: true,
    cells: ['dry_bulk', 'break_bulk', 'liquid_bulk'].map((g) => cell('cargo', `median_${g}_trt`))
      .concat(cell('cargo', 'median_container_trt'), cell('traffic', 'median_trt')),
  },
  { label: 'Export Dwell Time', format: 'F2', reverse: true, cells: [null, null, null, null, cell('traffic', 'export_dwell')] },
  { label: 'Import Dwell Time', format: 'F2', reverse: true, cells: [null, null, null, null, cell('traffic', 'import_dwell')] },
  {
    label: 'Preberthing Detention (PBD) – Port', format: 'F2', reverse: true,
    cells: ['dry_bulk', 'break_bulk', 'liquid_bulk', 'container'].map((g) => cell('performance', `average_${g}_port`))
      .concat(cell('performance', 'total_port')),
  },
  {
    label: 'Preberthing Detention (PBD) – Non-Port', format: 'F2', reverse: true,
    cells: ['dry_bulk', 'break_bulk', 'liquid_bulk', 'container'].map((g) => cell('performance', `average_${g}_non_port`))
      .concat(cell('performance', 'total_non_port')),
  },
];

// ---- Traffic KPI Summary --------------------------------------------------------------
// Commodity codes are the earlier portal's: 4 Container (MMT), 5 Container (TEUs), 2 Dry, 3 Break, 1 Liquid, 6 Overall
export const SUMMARY_COMMODITIES = [
  { value: '4', label: 'Container(In MMT)' },
  { value: '5', label: 'Container(In TEUs)' },
  { value: '2', label: 'Dry Bulk(In MMT)', groupId: 2 },
  { value: '3', label: 'Break Bulk(In MMT)', groupId: 3 },
  { value: '1', label: 'Liquid Bulk(In MMT)', groupId: 1 },
  { value: '6', label: 'Overall(In MMT)' },
];

// split: Loaded / Un-Loaded / Total; derived Total = rounded Loaded + Un-Loaded
export const SUMMARY_GROUPS = [
  { id: 'exim', label: 'Direct EXIM', split: true, loaded: 'exim_loaded', unloaded: 'exim_unloaded' },
  { id: 'coastal', label: 'Direct Coastal', split: true, loaded: 'coastal_loaded', unloaded: 'coastal_unloaded' },
  { id: 'transshipment', label: 'Total Transshipment', split: true, loaded: 'transshipment_loaded', unloaded: 'transshipment_unloaded' },
  { id: 'cargo', label: 'Total Cargo', split: true, loaded: 'total_cargo_loaded', unloaded: 'total_cargo_unloaded' },
  { id: 'roRo', label: 'Ro-Ro Traffic', split: false, value: 'ro_ro_traffic' },
  { id: 'roPax', label: 'RO-Pax Traffic', split: false, value: 'ro_pax_traffic' },
  {
    id: 'totalCoastal',
    label: 'Total Coastal (Direct Coastal + Coastal Transhipment + (Coastal + International/2))',
    split: true,
    loaded: 'total_coastal_loaded',
    unloaded: 'total_coastal_unloaded',
  },
];

const VISIBILITY_METRICS = [
  'exim_loaded', 'exim_unloaded', 'coastal_loaded', 'coastal_unloaded', 'transshipment_loaded', 'transshipment_unloaded',
  'ro_ro_traffic', 'ro_pax_traffic', 'total_coastal_loaded', 'total_coastal_unloaded',
];

// ---- helpers ----------------------------------------------------------------------------

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function yoyPercent(current, last) {
  const l = Number(last);
  if (!Number.isFinite(l) || l === 0) return null;
  return ((Number(current || 0) - l) * 100) / l;
}

/** Reads "a.b" paths from an API response. */
export function readPath(source, path) {
  if (!source || !path) return undefined;
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), source);
}

/** F2 = two decimals; WN = whole number with Indian grouping ("-" when missing). */
export function formatValue(value, format) {
  if (format === 'WN') {
    const n = Number(value);
    return value == null || Number.isNaN(n) ? '-' : Math.round(n).toLocaleString('en-IN');
  }
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

/** "2026-2027" → "FY26-27" */
export function shortFiscalYear(fiscalYear) {
  const match = String(fiscalYear || '').match(/^(\d{4})-(\d{4})$/);
  return match ? `FY${match[1].slice(2)}-${match[2].slice(2)}` : String(fiscalYear || '');
}

export function previousFiscalYear(fiscalYear) {
  const start = Number(String(fiscalYear).slice(0, 4)) - 1;
  return `${start}-${start + 1}`;
}

/** Labels on every card: the selected year, or the running one when none is chosen. */
export function fiscalYearLabels(fiscalYear, today = new Date()) {
  const current = fiscalYear || currentFinancialYear(today);
  return { current: shortFiscalYear(current), last: shortFiscalYear(previousFiscalYear(current)) };
}

const FISCAL_ORDER = FY_MONTHS.map((m) => m.value);
const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "All Months (FY April-March)": the running year stops at the last completed month. */
export function allMonthsFor(fiscalYear, today = new Date()) {
  const year = fiscalYear || currentFinancialYear(today);
  if (year !== currentFinancialYear(today)) return [...FISCAL_ORDER];
  const month = today.getMonth() + 1;
  const completed = month >= 4 ? month - 4 : month + 8;
  return FISCAL_ORDER.slice(0, Math.max(1, completed));
}

export function sortFiscalMonths(months = []) {
  return [...months].sort((a, b) => FISCAL_ORDER.indexOf(a) - FISCAL_ORDER.indexOf(b));
}

/**
 * Period caption under the Overall and KPI Summary titles (the earlier updateFYText), e.g.
 * "Apr to Sep 2025 & Apr to Sep 2026"; months listed when they are not a run.
 */
export function describePeriod(fiscalYear, months = [], today = new Date()) {
  const fy = fiscalYear || currentFinancialYear(today);
  const start = Number(fy.slice(0, 4));
  const end = start + 1;
  const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
  const isCurrent = fy === currentFinancialYear(today);
  const sideFor = (offset) => {
    const s = start - offset;
    const e = end - offset;
    if (!months.length || (months.length === 12 && isCurrent)) return `Apr to ${SHORT_MONTH[prevMonth - 1]} ${s}`;
    if (months.length === 12) return `Apr to Dec ${s}, Jan to Mar ${e}`;
    const aprDec = months.filter((m) => m >= 4).sort((a, b) => a - b);
    const janMar = months.filter((m) => m <= 3).sort((a, b) => a - b);
    const parts = [];
    if (aprDec.length) {
      const run = aprDec.length > 1 && aprDec.every((m, i) => i === 0 || m === aprDec[i - 1] + 1);
      parts.push(run
        ? `${SHORT_MONTH[aprDec[0] - 1]} to ${SHORT_MONTH[aprDec[aprDec.length - 1] - 1]} ${s}`
        : `${aprDec.map((m) => SHORT_MONTH[m - 1]).join(', ')} ${s}`);
    }
    if (janMar.length) parts.push(`${janMar.map((m) => SHORT_MONTH[m - 1]).join(', ')} ${e}`);
    return parts.join(', ');
  };
  return `${sideFor(1)} & ${sideFor(0)}`;
}

/** Total of a Loaded / Un-Loaded pair, rounded the way the earlier page did. */
export function totalMetric(loaded = {}, unloaded = {}) {
  const last = round2(round2(loaded.last_total) + round2(unloaded.last_total));
  const current = round2(round2(loaded.current_total) + round2(unloaded.current_total));
  return { last_total: last, current_total: current, yoy_percent: last ? round2(((current - last) * 100) / last) : null };
}

export function hasSummaryData(org) {
  return VISIBILITY_METRICS.some((key) => Number(org[key]?.current_total) || Number(org[key]?.last_total));
}

/** Sums organisations into one row (SMPA Total / Grand Total). Total Cargo = EXIM + Coastal + Transshipment. */
export function sumSummaryOrganisations(orgs, name) {
  const sumKey = (key) => {
    const last = orgs.reduce((acc, o) => acc + round2(o[key]?.last_total), 0);
    const current = orgs.reduce((acc, o) => acc + round2(o[key]?.current_total), 0);
    return { last_total: last, current_total: current, yoy_percent: yoyPercent(current, last) };
  };
  const row = { organisation_id: null, organisation_name: name };
  SUMMARY_GROUPS.forEach((g) => {
    if (g.split) {
      if (g.id === 'cargo') return;
      row[g.loaded] = sumKey(g.loaded);
      row[g.unloaded] = sumKey(g.unloaded);
    } else {
      row[g.value] = sumKey(g.value);
    }
  });
  const add = (side) => {
    const parts = ['exim', 'coastal', 'transshipment'].map((p) => row[`${p}_${side}`]);
    const last = parts.reduce((acc, p) => acc + p.last_total, 0);
    const current = parts.reduce((acc, p) => acc + p.current_total, 0);
    return { last_total: last, current_total: current, yoy_percent: yoyPercent(current, last) };
  };
  row.total_cargo_loaded = add('loaded');
  row.total_cargo_unloaded = add('unloaded');
  return row;
}

/** Visible organisation rows, then SMPA Total (when SMPA docks exist) and Grand Total. */
export function buildSummaryRows(organisations = []) {
  const visible = organisations.filter(hasSummaryData);
  if (!visible.length) return { rows: [], totals: [] };
  const smpa = organisations.filter((o) => /smpa/i.test(o.organisation_name || ''));
  const totals = [];
  if (smpa.length) totals.push(sumSummaryOrganisations(smpa, 'SMPA Total'));
  totals.push(sumSummaryOrganisations(organisations, 'Grand Total'));
  return { rows: visible, totals };
}
