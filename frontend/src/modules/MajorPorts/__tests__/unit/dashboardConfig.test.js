/* global describe, it, expect */
import {
  DASHBOARD_PANELS,
  allMonthsFor,
  buildSummaryRows,
  describePeriod,
  fiscalYearLabels,
  formatValue,
  readPath,
  shortFiscalYear,
  totalMetric,
} from '../../pages/Traffic/dashboard/dashboardConfig';
import { cargoToggleFor, drillTitle, splitDrillRows } from '../../pages/Traffic/dashboard/drillConfig';

const oct16 = new Date(2026, 9, 16);
const m = (last_total, current_total, yoy_percent = null) => ({ last_total, current_total, yoy_percent });

describe('dashboard layout', () => {
  it('keeps the earlier sidebar panels, with Overall moved to the top', () => {
    expect(DASHBOARD_PANELS.map((p) => p.label)).toEqual([
      'Overall', 'Traffic', 'Turnaround Time', 'Output per Ship Berth Day', 'Dwell Time',
      'Efficiency', 'Pre-Berthing Time', 'Idle Time', 'Vessels Handled', 'Traffic KPI Summary',
    ]);
  });

  it('has the earlier card counts per panel', () => {
    const count = (id) => DASHBOARD_PANELS.find((p) => p.id === id).sections.reduce((n, s) => n + s.cards.length, 0);
    expect(count('traffic-cargo')).toBe(12);
    expect(count('avg-trt')).toBe(30);
    expect(count('osbd')).toBe(6);
    expect(count('dwell-time')).toBe(2);
    expect(count('cargo-handling')).toBe(7);
    expect(count('pre-berthing-port')).toBe(10);
    expect(count('idle-time')).toBe(5);
    expect(count('vessels')).toBe(10);
  });

  it('reads the irregular field names and nested coastal values', () => {
    const traffic = DASHBOARD_PANELS.find((p) => p.id === 'traffic-cargo').sections[0].cards;
    expect(traffic[1].fields).toEqual({ current: 'total_traffic_container_current', last: 'total_traffic_container_last', yoy: 'total_traffic_yoy_container' });
    expect(readPath({ dry: { current_total: 64.45 } }, traffic[8].fields.current)).toBe(64.45);
    expect(traffic[8].drill).toEqual({ type: 'coastal', kpi: 'coastal_traffic_dry' });
  });
});

describe('dashboard formatting', () => {
  it('formats values and labels like the earlier page', () => {
    expect(formatValue(472.716, 'F2')).toBe('472.72');
    expect(formatValue(null, 'F2')).toBe('0.00');
    expect(formatValue(20276.4, 'WN')).toBe('20,276');
    expect(formatValue(null, 'WN')).toBe('-');
    expect(shortFiscalYear('2026-2027')).toBe('FY26-27');
    expect(fiscalYearLabels('', oct16)).toEqual({ current: 'FY26-27', last: 'FY25-26' });
    expect(fiscalYearLabels('2024-2025', oct16)).toEqual({ current: 'FY24-25', last: 'FY23-24' });
  });

  it('applies All Months and writes the period caption', () => {
    expect(allMonthsFor('', oct16)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(allMonthsFor('2025-2026', oct16)).toHaveLength(12);
    expect(describePeriod('', [], oct16)).toBe('Apr to Sep 2025 & Apr to Sep 2026');
    expect(describePeriod('2025-2026', [4, 5, 6, 1], oct16)).toBe('Apr to Jun 2024, Jan 2025 & Apr to Jun 2025, Jan 2026');
    expect(describePeriod('2025-2026', [4, 6], oct16)).toBe('Apr, Jun 2024 & Apr, Jun 2025');
  });
});

describe('Traffic KPI Summary rows', () => {
  it('adds Loaded and Un-Loaded into Total, rounded to two places', () => {
    expect(totalMetric(m(1.004, 2.006), m(2, 3))).toEqual({ last_total: 3, current_total: 5.01, yoy_percent: 67 });
  });

  it('hides empty organisations and appends SMPA Total and Grand Total', () => {
    const orgs = [
      { organisation_id: 54, organisation_name: 'SMPA - Kolkata', exim_loaded: m(1, 2), coastal_loaded: m(1, 1) },
      { organisation_id: 55, organisation_name: 'SMPA - Haldia', exim_loaded: m(2, 2) },
      { organisation_id: 9, organisation_name: 'Paradip Port Authority', exim_loaded: m(0, 0) },
    ];
    const { rows, totals } = buildSummaryRows(orgs);
    expect(rows.map((r) => r.organisation_id)).toEqual([54, 55]);
    expect(totals.map((t) => t.organisation_name)).toEqual(['SMPA Total', 'Grand Total']);
    expect(totals[1].exim_loaded).toMatchObject({ last_total: 3, current_total: 4 });
    // Total Cargo of a total row = EXIM + Coastal + Transshipment
    expect(totals[1].total_cargo_loaded).toMatchObject({ last_total: 4, current_total: 5 });
  });
});

describe('Detail of KPI', () => {
  const rows = [
    { organisation_id: 1, organisation_name: 'Chennai Port Authority' },
    { organisation_id: 4, organisation_name: 'SMPA' },
    { organisation_id: 7, organisation_name: 'Org 7' },
    { organisation_id: 54, organisation_name: 'SMPA - Kolkata' },
    { organisation_id: 55, organisation_name: 'SMPA - Haldia' },
    { organisation_id: null, organisation_name: 'SMPA Total' },
    { organisation_id: null, organisation_name: 'Overall Total' },
  ];

  it('pins the SMPA docks and totals below for all organisations', () => {
    const { rows: normal, pinned } = splitDrillRows(rows, { type: 'traffic', kpi: 'traffic', organisationId: 0 });
    expect(normal.map((r) => r.organisation_name)).toEqual(['Chennai Port Authority', 'SMPA', 'Org 7']);
    expect(pinned.map((r) => r.organisation_name)).toEqual(['SMPA - Kolkata', 'SMPA - Haldia', 'SMPA Total', 'Overall Total']);
  });

  it('drops organisations 7 and 8 for dwell KPIs and the SMPA group row on the other pages', () => {
    expect(splitDrillRows(rows, { type: 'traffic', kpi: 'import_dwell', organisationId: 0 }).rows.map((r) => r.organisation_id)).toEqual([1, 4]);
    expect(splitDrillRows(rows, { type: 'performance', kpi: 'total_port', organisationId: 0 }).rows.map((r) => r.organisation_id)).toEqual([1, 7]);
  });

  it('shows no totals for a single organisation', () => {
    const { rows: normal, pinned } = splitDrillRows(rows.slice(0, 1), { type: 'cargo', kpi: 'avg_dry', organisationId: 1 });
    expect(normal).toHaveLength(1);
    expect(pinned).toEqual([]);
  });

  it('uses the earlier headings and commodity-wise toggles', () => {
    expect(drillTitle('traffic', 'traffic')).toBe('KPI - Total Traffic (in MMT)');
    expect(drillTitle('performance', 'avg_container_trt_less_than_251_cppi')).toBe('KPI - Average Container TRT - Call Size (< 250) (In Hours) - CPPI');
    expect(cargoToggleFor('cargo', 'total_traffic_dry').cargo).toBe('btnfinancialDry');
    expect(cargoToggleFor('coastal', 'coastal_traffic_liquid').cargo).toBe('btnfinancialCoastalLiquid');
    expect(cargoToggleFor('cargo', 'avg_dry')).toBeNull();
  });
});
