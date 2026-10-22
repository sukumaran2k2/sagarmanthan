/**
 * "Detail of KPI" drill-downs, copied from the earlier portal's detail pages:
 *   traffic     ← detailedKPIDashboard.html            (Total Traffic, TRT, Dwell, OSBD, Efficiency cards)
 *   cargo       ← detailedKPICargoDashboard.html       (cargo-group cards)
 *   performance ← detailedKPITrafficDashboard.html     (Call Size, PBD, Idle, Vessels cards)
 *   coastal     ← detailedKPITrafficCommodityDashboard.html
 *   cargoWise   ← drilledTrafficCargoWise.html         (opened from the cargo / coastal toggles)
 */

const TITLES = {
  traffic: {
    container_trt: 'KPI - Container TRT (in Hours)',
    import_dwell: 'KPI - Import Dwell Time (in Hours)',
    export_dwell: 'KPI - Export Dwell Time (in Hours)',
    osbd: 'KPI - OSBD - Overall (in MT)',
    traffic: 'KPI - Total Traffic (in MMT)',
    avg_trt: 'KPI - Average TRT - Overall (In Hours)',
    median_trt: 'KPI - Median TRT - Overall (In Hours)',
    gross_crane: 'KPI - Gross Crane Productivity (Moves/Hr)',
    loading_dry: 'KPI - Loading Dry Bulk Efficiency (Tons/Min)',
    loading_break: 'KPI - Loading Break Bulk Efficiency (Tons/Min)',
    loading_liquid: 'KPI - Loading Liquid Bulk Efficiency (Tons/Min)',
    unloading_dry: 'KPI - Unloading Dry Bulk Efficiency (Tons/Min)',
    unloading_break: 'KPI - Unloading Break Bulk Efficiency (Tons/Min)',
    unloading_liquid: 'KPI - Unloading Liquid Bulk Efficiency (Tons/Min)',
  },
  cargo: {
    median_dry: 'Median Dry Bulk TRT (In Hours)',
    median_break: 'Median Break Bulk TRT (In Hours)',
    median_liquid: 'Median Liquid Bulk TRT (In Hours)',
    median_container: 'Median Container TRT (In Hours)',
    avg_dry: 'Average Dry Bulk TRT (In Hrs)',
    avg_break: 'Average Break Bulk TRT (In Hrs)',
    avg_liquid: 'Average Liquid Bulk TRT (In Hrs)',
    avg_container: 'Average Container TRT (In Hrs)',
    osbd_dry: 'OSBD - Dry Bulk (In Tonnes)',
    osbd_break: 'OSBD - Break Bulk (In Tonnes)',
    osbd_liquid: 'OSBD - Liquid Bulk (In Tonnes)',
    osbd_container: 'OSBD - Container Bulk (In Tonnes)',
    total_traffic_dry: 'Traffic - Dry Bulk (In MMT)',
    total_traffic_break: 'Traffic - Break Bulk (In MMT)',
    total_traffic_liquid: 'Traffic - Liquid Bulk (In MMT)',
    total_traffic_container: 'Traffic - Container (In MMT)',
    total_traffic_container_teus: 'Traffic - Container (In TEUs)',
  },
  performance: {
    osbd_container_teus: 'KPI - Output per Ship Berth Day – Container (In TEUs)',
    dry_bulk_vessel_handled: 'KPI - Dry Bulk Vessel Handled (In Numbers)',
    break_bulk_vessel_handled: 'KPI - Break Bulk Vessel Handled (In Numbers)',
    liquid_bulk_vessel_handled: 'KPI - Liquid Bulk Vessel Handled (In Numbers)',
    total_sailed_vessel_handled: 'KPI - Total Vessel Handled (In Numbers)',
    container_vessel_handled: 'KPI - Container Vessel Handled (In Numbers)',
    average_dry_bulk_idle_time: 'KPI - Idle Time - Dry Bulk',
    average_break_bulk_idle_time: 'KPI - Idle Time - Break Bulk',
    average_liquid_bulk_idle_time: 'KPI - Idle Time - Liquid Bulk',
    average_container_idle_time: 'KPI - Idle Time – Container',
    overall_average_idle_time: 'KPI - Idle Time – Overall (In Percentage)',
    dry_bulk_parcel_size: 'KPI - Parcel Size – Dry Bulk',
    break_bulk_parcel_size: 'KPI - Parcel Size – Break Bulk',
    liquid_bulk_parcel_size: 'KPI - Parcel Size – Liquid Bulk',
    container_parcel_size: 'KPI - Parcel Size – Container',
    total_parcel_time: 'KPI - Parcel Size – Overall',
    dry_bulk_port: 'KPI - Pre-Berthing Time – Hours (Under Port A/c) - Dry Bulk',
    break_bulk_port: 'KPI - Pre-Berthing Time – Hours (Under Port A/c) - Break Bulk',
    liquid_bulk_port: 'KPI - Pre-Berthing Time – Hours (Under Port A/c) – Liquid Bulk',
    container_port: 'KPI - Pre-Berthing Time – Hours (Under Port A/c) – Container',
    total_port: 'KPI - Pre-Berthing Time – Hours (Under Port A/c) – Overall',
    dry_bulk_non_port: 'KPI - Pre-Berthing Time – Hours (Non-Port A/c) – Dry Bulk',
    break_bulk_non_port: 'KPI - Pre-Berthing Time – Hours (Non-Port A/c) – Break Bulk',
    liquid_bulk_non_port: 'KPI - Pre-Berthing Time – Hours (Non-Port A/c) – Liquid Bulk',
    container_non_port: 'KPI - Pre-Berthing Time – Hours (Non-Port A/c) – Container',
    total_non_port: 'KPI - Pre-Berthing Time – Hours (Non-Port A/c) – Overall',
  },
  coastal: {
    coastal_traffic_dry: 'Coastal Traffic - Dry Bulk (In MMT)',
    'total-coastal-traffic': 'Coastal Total Traffic (in MMT)',
    coastal_traffic_container: 'Coastal Traffic - Container (In MMT)',
    coastal_traffic_break: 'Coastal Traffic - Break Bulk (In MMT)',
    coastal_traffic_liquid: 'Coastal Traffic - Liquid Bulk (In MMT)',
    coastal_traffic_container_teus: 'Coastal Traffic - Container TEUs (In 000 TEUs)',
  },
};

const CALL_SIZE_TITLES = {
  less_than_251: '(< 250)', '251_to_500': '(251 - 500)', '501_to_1000': '(501-1000)', '1001_to_1500': '(1001-1500)',
  '1501_to_2000': '(1501-2000)', '2001_to_2500': '(2001-2500)', '2501_to_3000': '(2501-3000)',
  '3001_to_4000': '(3001-4000)', '4001_to_6000': '(4001-6000)', greater_than_6000: '(>6000)',
};
Object.entries(CALL_SIZE_TITLES).forEach(([range, label]) => {
  const title = `KPI - Average Container TRT - Call Size ${label} (In Hours)`;
  TITLES.performance[`avg_container_trt_${range}`] = title;
  TITLES.performance[`avg_container_trt_${range}_cppi`] = `${title} - CPPI`;
});

// Unit line under the value headers (only where the earlier pages showed one)
const UNITS = {
  traffic: {
    traffic: 'In MMT', total_traffic: 'In MMT', avg_trt: 'In Hours', container_trt: 'In Hours', median_trt: 'In Hours',
    import_dwell: 'In Hours', export_dwell: 'In Hours', osbd: 'In MT',
  },
  cargo: {
    total_traffic_dry: 'In MMT', total_traffic_break: 'In MMT', total_traffic_liquid: 'In MMT', total_traffic_container: 'In MMT',
    osbd_dry: 'In MT', osbd_break: 'In MT', osbd_liquid: 'In MT', osbd_container: 'In MT',
    avg_dry: 'In Hrs', avg_break: 'In Hrs', avg_liquid: 'In Hrs', avg_container: 'In Hrs',
    median_dry: 'In Hours', median_break: 'In Hours', median_liquid: 'In Hours', median_container: 'In Hours',
  },
};

const titleCase = (key) => key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function drillTitle(type, kpi) {
  return TITLES[type]?.[kpi] || titleCase(kpi || '');
}

export function drillUnit(type, kpi) {
  return UNITS[type]?.[kpi] || '';
}

// "View Cargo Commodity wise" toggles → commodity-wise drill (cargo code as in the earlier portal)
const CARGO_TOGGLES = {
  cargo: {
    total_traffic_dry: { cargo: 'btnfinancialDry', label: 'View Cargo Commodity wise - Traffic Dry Bulk' },
    total_traffic_break: { cargo: 'btnfinancialBreak', label: 'View Cargo Commodity wise - Traffic Break Bulk' },
    total_traffic_liquid: { cargo: 'btnfinancialLiquid', label: 'View Cargo Commodity wise - Traffic Liquid Bulk' },
  },
  coastal: {
    coastal_traffic_dry: { cargo: 'btnfinancialCoastalDry', label: 'View Cargo Commodity wise - Coastal Traffic Dry Bulk' },
    coastal_traffic_break: { cargo: 'btnfinancialCoastalBreak', label: 'View Cargo Commodity wise - Coastal Traffic Break Bulk' },
    coastal_traffic_liquid: { cargo: 'btnfinancialCoastalLiquid', label: 'View Cargo Commodity wise - Coastal Traffic Liquid Bulk' },
  },
};

export function cargoToggleFor(type, kpi) {
  return CARGO_TOGGLES[type]?.[kpi] || null;
}

const CARGO_WISE_TITLES = {
  btnfinancialDry: 'Detail of KPI- Commodity Wise Traffic - Dry Bulk',
  btnfinancialBreak: 'Detail of KPI- Commodity Wise Traffic - Break Bulk',
  btnfinancialLiquid: 'Detail of KPI- Commodity Wise Traffic - Liquid Bulk',
  btnfinancialCoastalDry: 'Detail of KPI- Commodity Wise Coastal Traffic - Dry Bulk',
  btnfinancialCoastalBreak: 'Detail of KPI- Commodity Wise Coastal Traffic - Break Bulk',
  btnfinancialCoastalLiquid: 'Detail of KPI- Commodity Wise Coastal Traffic - Liquid Bulk',
};

export function cargoWiseTitle(cargo) {
  return CARGO_WISE_TITLES[cargo] || 'Detail of KPI- Commodity Wise Traffic';
}

export const DRILL_PART = {
  traffic: 'drill/traffic',
  cargo: 'drill/cargo',
  performance: 'drill/performance',
  coastal: 'drill/coastal',
  cargoWise: 'drill/cargo-wise',
};

const SMPA_DOCK_IDS = [54, 55];
const TOTAL_NAMES = ['SMPA Total', 'Overall Total'];
// Organisations 7 and 8 do not report these
const NO_DWELL_ORGS = [7, 8];
const NO_DWELL_KPIS = ['import_dwell', 'export_dwell', 'gross_crane'];

/**
 * Splits the server rows the way the earlier pages did: for all organisations the
 * SMPA docks, SMPA Total and Overall Total are pinned below; one organisation shows no totals.
 */
export function splitDrillRows(rows = [], { type, kpi, organisationId }) {
  let list = Array.isArray(rows) ? [...rows] : [];
  if (NO_DWELL_KPIS.includes(kpi)) list = list.filter((r) => !NO_DWELL_ORGS.includes(Number(r.organisation_id)));
  if (type !== 'traffic' && type !== 'cargo') list = list.filter((r) => Number(r.organisation_id) !== 4);

  const isTotal = (r) => TOTAL_NAMES.includes(r.organisation_name);
  const org = Number(organisationId) || 0;
  if (org === 0) {
    const pinned = [
      ...SMPA_DOCK_IDS.map((id) => list.find((r) => Number(r.organisation_id) === id && !isTotal(r))).filter(Boolean),
      ...TOTAL_NAMES.map((name) => list.find((r) => r.organisation_name === name)).filter(Boolean),
    ];
    const normal = list.filter((r) => !pinned.includes(r));
    return { rows: normal, pinned };
  }
  // Organisation 4 stands for the SMPA group: its two docks and SMPA Total only
  if (org === 4) {
    const rowsOf = [
      ...SMPA_DOCK_IDS.map((id) => list.find((r) => Number(r.organisation_id) === id && !isTotal(r))),
      list.find((r) => r.organisation_name === 'SMPA Total'),
    ];
    return { rows: rowsOf.filter(Boolean), pinned: [] };
  }
  return { rows: list.filter((r) => !isTotal(r)), pinned: [] };
}

// The earlier detail pages: green above, red below, grey at zero
export const YOY_BG = { up: '#A9D08E', down: '#F4CCCC', zero: '#D9D9D9' };
export const yoyCellStyle = (params) => {
  const n = Number(params.value);
  const bg = params.value === null || params.value === undefined || params.value === '' || Number.isNaN(n)
    ? null : n > 0 ? YOY_BG.up : n < 0 ? YOY_BG.down : YOY_BG.zero;
  return { justifyContent: 'center', textAlign: 'center', fontWeight: 700, color: bg ? '#000' : undefined, backgroundColor: bg || undefined };
};
