/**
 * KPI Major Ports — Port Performance fields.
 *
 * Mirrors backend/src/controllers/KPI/portPerformanceFields.js: the same 14 input steps and
 * the same columns per step and per Actuals view. This file adds what the UI needs on top:
 * labels, units and the definitions the earlier portal showed in its info tooltips.
 *
 * field: { key (DB column), label (short, inside its group), fullLabel (lists and exports), kind }
 * kind: 'decimal' | 'count' (whole number) | 'percent' (0–100), checked again by the server
 */

const CARGO_TYPES = [
  { id: 'dry_bulk', label: 'Dry Bulk' },
  { id: 'break_bulk', label: 'Break Bulk' },
  { id: 'liquid_bulk', label: 'Liquid Bulk' },
  { id: 'container', label: 'Container' },
];

export const CALL_SIZES = [
  { id: 'less_than_251', label: 'Up to 250' },
  { id: '251_to_500', label: '251 – 500' },
  { id: '501_to_1000', label: '501 – 1000' },
  { id: '1001_to_1500', label: '1001 – 1500' },
  { id: '1501_to_2000', label: '1501 – 2000' },
  { id: '2001_to_2500', label: '2001 – 2500' },
  { id: '2501_to_3000', label: '2501 – 3000' },
  { id: '3001_to_4000', label: '3001 – 4000' },
  { id: '4001_to_6000', label: '4001 – 6000' },
  { id: 'greater_than_6000', label: 'Above 6000' },
];

const UNITS = {
  hours: 'Hours',
  tonnes: 'Tonnes',
  teus: 'TEUs',
  percent: '%',
  number: 'Numbers',
  tonnesPerMinute: 'Tonnes / Minute',
  movesPerHour: 'Moves / Hour',
  thousandTonnes: "'000 Tonnes",
};

const withUnit = (text, unit) => (unit ? `${text} (${unit})` : text);

const field = (key, label, fullLabel, kind = 'decimal', unit) => ({ key, label, fullLabel: withUnit(fullLabel, unit), kind, unit });

/** Dry / Break / Liquid / Container (+ Overall) fields from a column pattern like 'average_{cargo}_trt'. */
function cargoFields(pattern, prefix, { unit, kind = 'decimal', overall, overallLabel = 'Overall', cargo = CARGO_TYPES } = {}) {
  const list = cargo.map((c) => field(pattern.replace('{cargo}', c.id), c.label, `${prefix} - ${c.label}`, kind, unit));
  if (overall) list.push(field(overall, overallLabel, `${prefix} - ${overallLabel}`, kind, unit));
  return list;
}

/** One field per container call size from a column pattern like 'avg_container_trt_{size}'. */
function callSizeFields(pattern, prefix, { unit, kind = 'decimal' } = {}) {
  return CALL_SIZES.map((s) => field(pattern.replace('{size}', s.id), s.label, `${prefix} - Call Size ${s.label}`, kind, unit));
}

// layout: 'cargo' = labelled inputs in a grid; 'callSize' = one row of 10 call-size cells
const group = (title, fields, { layout = 'cargo', view, unit, sumOf } = {}) => ({ title, fields, layout, view, unit, sumOf });

/** The 14 input steps of the earlier portal, in the same order. */
export const PORT_PERFORMANCE_SECTIONS = [
  {
    id: 'avgTrt',
    label: 'Average Turnaround Time',
    short: 'Avg TRT',
    definition: 'The total time spent by a vessel at the port from pilot boarding after readiness to berth till pilot de-boarding for departure from the reporting station. It excludes pre-berthing waiting time and includes navigation time (inward and outward), stay at working and non-working berths and shifting time.',
    groups: [
      group('By cargo type', cargoFields('average_{cargo}_trt', 'Average TRT', { unit: UNITS.hours, overall: 'average_trt_overall' }), { view: 'turnaround', unit: UNITS.hours }),
      group('Container TRT by call size', callSizeFields('avg_container_trt_{size}', 'Average Container TRT', { unit: UNITS.hours }), { layout: 'callSize', view: 'callSize', unit: UNITS.hours }),
    ],
  },
  {
    id: 'medianTrt',
    label: 'Median Turnaround Time',
    short: 'Median TRT',
    definition: 'The median time spent by vessels within port limits. The median is used instead of the average so that vessels with exceptionally long or short stays do not distort the figure.',
    groups: [
      group('By cargo type', cargoFields('median_{cargo}_trt', 'Median TRT', { unit: UNITS.hours, overall: 'median_trt_overall' }), { view: 'turnaround', unit: UNITS.hours }),
      group('Container TRT by call size', callSizeFields('median_container_trt_{size}', 'Median Container TRT', { unit: UNITS.hours }), { layout: 'callSize', view: 'callSize', unit: UNITS.hours }),
    ],
  },
  {
    id: 'ytdMedianTrt',
    label: 'YTD Median Turnaround Time',
    short: 'YTD Median TRT',
    definition: 'Year to date: from April of the financial year up to the month being entered. For June, enter the median for April – June.',
    groups: [
      group('By cargo type', cargoFields('ytd_median_{cargo}_trt', 'YTD Median TRT', { unit: UNITS.hours, overall: 'ytd_median_trt_overall' }), { view: 'turnaround', unit: UNITS.hours }),
      group('Container TRT by call size', callSizeFields('ytd_median_container_trt_{size}', 'YTD Median Container TRT', { unit: UNITS.hours }), { layout: 'callSize', view: 'callSize', unit: UNITS.hours }),
    ],
  },
  {
    id: 'osbd',
    label: 'Average Ship Berth Day Output',
    short: 'OSBD',
    definition: 'Aggregate cargo handled divided by the total number of berth days spent by cargo ships in the period.',
    groups: [
      group('Output per ship berth day', [
        ...cargoFields('{cargo}_osbd', 'OSBD', { unit: UNITS.tonnes, overall: 'osbd_overall' }),
        field('container_osbd_teus', 'Container (TEUs)', 'OSBD - Container', 'decimal', UNITS.teus),
      ], { view: 'berthOutput' }),
    ],
  },
  {
    id: 'effectiveOsbd',
    label: 'Effective OSBD',
    short: 'Effective OSBD',
    definition: 'Aggregate cargo handled divided by the berth days spent by cargo ships, excluding idle time at working berths and time at non-working berths.',
    groups: [
      group('Effective output per ship berth day', [
        ...cargoFields('effective_{cargo}_osbd', 'Effective OSBD', { unit: UNITS.tonnes, overall: 'effective_osbd_overall' }),
        field('effective_container_osbd_teus', 'Container (TEUs)', 'Effective OSBD - Container', 'decimal', UNITS.teus),
      ], { view: 'berthOutput' }),
    ],
  },
  {
    id: 'idleTime',
    label: 'Percentage of Idle Time at Berth',
    short: 'Idle Time',
    definition: 'The total idle time spent by cargo ships at berths, as a percentage of the total time spent at berths.',
    groups: [
      group('Idle time at berth', cargoFields('average_{cargo}_idle_time', 'Idle Time at Berth', {
        unit: UNITS.percent, kind: 'percent', overall: 'overall_average_idle_time',
      }), { view: 'timeAtPort', unit: UNITS.percent }),
    ],
  },
  {
    id: 'preBerthing',
    label: 'Pre-Berthing Waiting Time',
    short: 'Pre-Berthing',
    definition: 'Port account: from the ship confirming readiness to pilot boarding for berthing. Non-port account: from arrival at the anchorage till the ship confirms readiness for pilot boarding.',
    groups: [
      group('On port account', cargoFields('average_{cargo}_waiting_time_port', 'Pre-Berthing Time (Port A/c)', {
        unit: UNITS.hours, overall: 'overall_waiting_time_port',
      }), { view: 'timeAtPort', unit: UNITS.hours }),
      group('On non-port account', cargoFields('average_{cargo}_waiting_time_non_port', 'Pre-Berthing Time (Non-Port A/c)', {
        unit: UNITS.hours, overall: 'overall_waiting_time_non_port',
      }), { view: 'timeAtPort', unit: UNITS.hours }),
    ],
  },
  {
    id: 'vessels',
    label: 'Vessels Handled',
    short: 'Vessels',
    definition: 'Number of vessels handled in the month, by cargo type and, for container vessels, by call size.',
    groups: [
      group('By cargo type', cargoFields('{cargo}_vessel_handled', 'Vessels Handled', {
        unit: UNITS.number, kind: 'count', overall: 'total_sailed_vessel_handled', overallLabel: 'Total Sailed',
      }), { view: 'vesselsCargo', unit: UNITS.number, sumOf: { total: 'total_sailed_vessel_handled' } }),
      group('Container vessels by call size', callSizeFields('vessel_container_{size}', 'Container Vessels Handled', {
        unit: UNITS.number, kind: 'count',
      }), { layout: 'callSize', view: 'callSize', unit: UNITS.number }),
    ],
  },
  {
    id: 'dwellTime',
    label: 'Port Dwell Time (Container)',
    short: 'Dwell Time',
    definition: 'Time spent by a container inside the port before it is gated out (import) or loaded on a vessel (export).',
    groups: [
      group('Total dwell time', [
        field('export_dwell_time', 'Export', 'Dwell Time - Export', 'decimal', UNITS.hours),
        field('import_dwell_time', 'Import', 'Dwell Time - Import', 'decimal', UNITS.hours),
      ], { view: 'timeAtPort', unit: UNITS.hours }),
    ],
  },
  {
    id: 'efficiency',
    label: 'Loading / Unloading Efficiency',
    short: 'Efficiency',
    definition: 'Total cargo loaded or unloaded divided by the total time taken (in minutes) for loading or discharging.',
    groups: [
      group('Loading efficiency', cargoFields('{cargo}_efficiency', 'Loading Efficiency', {
        unit: UNITS.tonnesPerMinute, cargo: CARGO_TYPES.slice(0, 3),
      }), { view: 'productivity', unit: UNITS.tonnesPerMinute }),
      group('Unloading efficiency', cargoFields('unloading_{cargo}_efficiency', 'Unloading Efficiency', {
        unit: UNITS.tonnesPerMinute, cargo: CARGO_TYPES.slice(0, 3),
      }), { view: 'productivity', unit: UNITS.tonnesPerMinute }),
    ],
  },
  {
    id: 'craneProductivity',
    label: 'Gross Crane Productivity',
    short: 'Crane Productivity',
    definition: 'Total moves divided by total gross crane hours.',
    groups: [
      group('Gross crane productivity', [
        field('gross_crane_productivity', 'Gross Crane Moves', 'Gross Crane Productivity', 'decimal', UNITS.movesPerHour),
        field('total_moves', 'Total Moves', 'Total Moves', 'count', UNITS.number),
      ], { view: 'productivity' }),
    ],
  },
  {
    id: 'containerSize',
    label: 'Average Container Size',
    short: 'Container Size',
    definition: 'Average container size handled per vessel call, by call size.',
    groups: [
      group('Average container size by call size', callSizeFields('avg_{size}', 'Average Container Size'), { layout: 'callSize', view: 'callSize' }),
    ],
  },
  {
    id: 'cppiTrt',
    label: 'Average Container TRT (as per CPPI)',
    short: 'CPPI TRT',
    definition: 'As per the Container Port Performance Index (CPPI): the time from the ship arriving at the port (port limits or waiting zone, whichever comes first) until it leaves the berth after finishing cargo operations.',
    groups: [
      group('Container TRT (CPPI) by call size', callSizeFields('avg_{size}_cppi', 'Average Container TRT (CPPI)', { unit: UNITS.hours }), { layout: 'callSize', view: 'callSize', unit: UNITS.hours }),
    ],
  },
  {
    id: 'cargoHandled',
    label: 'Cargo Handled by Sailed Vessels',
    short: 'Cargo Handled',
    definition: 'Cargo handled is the total of cargo loaded and cargo unloaded by the vessels that sailed in the month.',
    groups: [
      group('Cargo handled', cargoFields('{cargo}_cargo_handled', 'Cargo Handled', {
        unit: UNITS.thousandTonnes, overall: 'total_cargo_handled', overallLabel: 'Total',
      }), { view: 'vesselsCargo', unit: UNITS.thousandTonnes, sumOf: { total: 'total_cargo_handled' } }),
      group('Cargo loaded', [
        ...cargoFields('{cargo}_cargo_loaded', 'Cargo Loaded', { unit: UNITS.thousandTonnes, cargo: CARGO_TYPES.slice(0, 3) }),
        field('container_bulk_cargo_loaded', 'Container', 'Cargo Loaded - Container', 'decimal', UNITS.thousandTonnes),
        field('total_cargo_loaded', 'Total', 'Cargo Loaded - Total', 'decimal', UNITS.thousandTonnes),
        field('container_bulk_cargo_loaded_teu', 'Container (TEUs)', 'Cargo Loaded - Container', 'decimal', UNITS.teus),
      ], { view: 'vesselsCargo', unit: UNITS.thousandTonnes, sumOf: { total: 'total_cargo_loaded', exclude: ['container_bulk_cargo_loaded_teu'] } }),
      group('Cargo unloaded', [
        ...cargoFields('{cargo}_cargo_unloaded', 'Cargo Unloaded', { unit: UNITS.thousandTonnes, cargo: CARGO_TYPES.slice(0, 3) }),
        field('container_bulk_cargo_unloaded', 'Container', 'Cargo Unloaded - Container', 'decimal', UNITS.thousandTonnes),
        field('total_cargo_unloaded', 'Total', 'Cargo Unloaded - Total', 'decimal', UNITS.thousandTonnes),
        field('container_bulk_cargo_unloaded_teu', 'Container (TEUs)', 'Cargo Unloaded - Container', 'decimal', UNITS.teus),
      ], { view: 'vesselsCargo', unit: UNITS.thousandTonnes, sumOf: { total: 'total_cargo_unloaded', exclude: ['container_bulk_cargo_unloaded_teu'] } }),
    ],
  },
];

export const SECTION_IDS = PORT_PERFORMANCE_SECTIONS.map((s) => s.id);

export const sectionFields = (section) => section.groups.flatMap((g) => g.fields);

export const ALL_FIELDS = PORT_PERFORMANCE_SECTIONS.flatMap(sectionFields);
export const FIELD_BY_KEY = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f]));

/** Actuals views (GET /kpi/port-performance/actuals?view=), each with its column groups. */
export const DATA_LIST_VIEWS = [
  { id: 'turnaround', label: 'Turnaround Time' },
  { id: 'berthOutput', label: 'Berth Day Output' },
  { id: 'timeAtPort', label: 'Idle, Waiting & Dwell' },
  { id: 'vesselsCargo', label: 'Vessels & Cargo' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'callSize', label: 'Container Call Size' },
];

/** [{ title, unit, fields }] header groups of one view: "<step> · <group>" when a step has several. */
export function viewColumnGroups(viewId) {
  return PORT_PERFORMANCE_SECTIONS.flatMap((section) =>
    section.groups
      .filter((g) => g.view === viewId)
      .map((g) => ({
        title: section.groups.length > 1 && g.layout !== 'callSize' ? `${section.label} · ${g.title}` : section.label,
        unit: g.unit,
        fields: g.fields,
      }))
  );
}

/** Sum of a group's parts (all fields except the total and any excluded), or null when none is filled. */
export function sumGroupParts(groupDef, values) {
  if (!groupDef.sumOf) return null;
  const skip = new Set([groupDef.sumOf.total, ...(groupDef.sumOf.exclude || [])]);
  let filled = 0;
  const sum = groupDef.fields.reduce((acc, f) => {
    if (skip.has(f.key)) return acc;
    const n = Number(values[f.key]);
    if (String(values[f.key] ?? '').trim() === '' || !Number.isFinite(n)) return acc;
    filled += 1;
    return acc + n;
  }, 0);
  return filled ? Number(sum.toFixed(2)) : null;
}

// ---------------------------------------------------------------------------
// Validation and payloads (the server checks the same rules)
// ---------------------------------------------------------------------------

export const MAX_VALUE = 9999999999;

/** Error text for one value, or null. Blank is allowed here; completeness is checked per step. */
export function validateValue(fieldDef, raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return 'Enter a number';
  if (n < 0) return 'Cannot be negative';
  if (n > MAX_VALUE) return 'Value is too large';
  if (fieldDef.kind === 'count' && !Number.isInteger(n)) return 'Whole number only';
  if (fieldDef.kind === 'percent' && n > 100) return 'Cannot exceed 100%';
  return null;
}

/**
 * { fieldErrors, missing, isEmpty } for one step.
 * requireAll: saving needs every value of the step, as in the earlier portal.
 */
export function validateSection(section, values, { requireAll = true } = {}) {
  const fieldErrors = {};
  let missing = 0;
  let filled = 0;
  sectionFields(section).forEach((f) => {
    const err = validateValue(f, values[f.key]);
    if (err) fieldErrors[f.key] = err;
    if (String(values[f.key] ?? '').trim() === '') {
      missing += 1;
      if (requireAll) fieldErrors[f.key] = fieldErrors[f.key] || 'Required';
    } else {
      filled += 1;
    }
  });
  return { fieldErrors, missing, isEmpty: filled === 0 };
}

/** Request body values of one step: { column: number } (blank becomes null). */
export function buildSectionPayload(section, values) {
  return Object.fromEntries(sectionFields(section).map((f) => {
    const text = String(values[f.key] ?? '').trim();
    return [f.key, text === '' ? null : Number(text)];
  }));
}

/** Server values ({ column: number | null }) as form text. */
export function toFormValues(values = {}) {
  return Object.fromEntries(ALL_FIELDS.map((f) => [f.key, values[f.key] === null || values[f.key] === undefined ? '' : String(values[f.key])]));
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export const OVERALL_ROW = 'overall';
export const TOTAL_SMPA_ROW = 'total-smpa';

export const AGGREGATE_ROWS = [
  { rowKey: TOTAL_SMPA_ROW, label: 'Total SMPA' },
  { rowKey: OVERALL_ROW, label: 'Overall' },
];

export const orgRowKey = (organisationId) => `org-${organisationId}`;

/** Target KPI groups, matched on mmt_kpi_time_performance_type ids; new types fall under "Other". */
const TARGET_GROUPS = [
  { title: 'Turnaround Time', ids: [1, 12, 24, 25, 26, 27, 2, 20, 21, 22, 23] },
  { title: 'Ship Berth Day Output', ids: [3, 4, 5, 6, 28, 29, 30, 31] },
  { title: 'Waiting, Dwell & Idle Time', ids: [7, 8, 9, 10, 11] },
  { title: 'Productivity & Efficiency', ids: [13, 14, 15, 16, 17, 18, 19] },
  { title: 'Traffic', ids: [32, 33, 34, 35] },
];

/** Strips the leading "Target " the master names carry ("Target OSBD (In Tonnes)" → "OSBD (In Tonnes)"). */
export const kpiLabel = (kpiType) => String(kpiType.kpi_name || '').replace(/^target\s+/i, '').trim();

/** Percent targets (e.g. Idle Time to Total Time (in %)) cannot exceed 100. */
export const isPercentKpi = (kpiType) => /%/.test(kpiType.kpi_name || '');

export function groupKpiTypes(kpiTypes = []) {
  const byId = new Map(kpiTypes.map((t) => [Number(t.kpi_type_id), t]));
  const used = new Set();
  const groups = TARGET_GROUPS.map((g) => ({
    title: g.title,
    types: g.ids.filter((id) => byId.has(id)).map((id) => {
      used.add(id);
      return byId.get(id);
    }),
  }));
  const other = kpiTypes.filter((t) => !used.has(Number(t.kpi_type_id)));
  if (other.length) groups.push({ title: 'Other', types: other });
  return groups.filter((g) => g.types.length);
}
