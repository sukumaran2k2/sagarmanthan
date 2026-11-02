/* global describe, it, expect */
import {
  ALL_FIELDS,
  DATA_LIST_VIEWS,
  PORT_PERFORMANCE_SECTIONS,
  buildSectionPayload,
  groupKpiTypes,
  isPercentKpi,
  kpiLabel,
  sectionFields,
  sumGroupParts,
  toFormValues,
  validateSection,
  validateValue,
  viewColumnGroups,
} from '../../pages/PortPerformance/portPerformanceConfig';

const section = (id) => PORT_PERFORMANCE_SECTIONS.find((s) => s.id === id);
const fill = (s, value = '1') => Object.fromEntries(sectionFields(s).map((f) => [f.key, value]));

describe('port performance steps', () => {
  it('keeps the 14 tabs of the earlier portal, in order', () => {
    expect(PORT_PERFORMANCE_SECTIONS.map((s) => s.label)).toEqual([
      'Average Turnaround Time', 'Median Turnaround Time', 'YTD Median Turnaround Time',
      'Average Ship Berth Day Output', 'Effective OSBD', 'Percentage of Idle Time at Berth',
      'Pre-Berthing Waiting Time', 'Vessels Handled', 'Port Dwell Time (Container)',
      'Loading / Unloading Efficiency', 'Gross Crane Productivity', 'Average Container Size',
      'Average Container TRT (as per CPPI)', 'Cargo Handled by Sailed Vessels',
    ]);
  });

  it('has 134 unique fields with full labels', () => {
    expect(ALL_FIELDS).toHaveLength(134);
    expect(new Set(ALL_FIELDS.map((f) => f.key)).size).toBe(134);
    ALL_FIELDS.forEach((f) => expect(f.fullLabel.length).toBeGreaterThan(f.label.length - 1));
  });

  it('has the earlier field counts per step', () => {
    const counts = Object.fromEntries(PORT_PERFORMANCE_SECTIONS.map((s) => [s.id, sectionFields(s).length]));
    expect(counts).toEqual({
      avgTrt: 15, medianTrt: 15, ytdMedianTrt: 15, osbd: 6, effectiveOsbd: 6, idleTime: 5, preBerthing: 10,
      vessels: 15, dwellTime: 2, efficiency: 6, craneProductivity: 2, containerSize: 10, cppiTrt: 10, cargoHandled: 17,
    });
  });

  it('shows every field in exactly one Actuals view', () => {
    const inViews = DATA_LIST_VIEWS.flatMap((v) => viewColumnGroups(v.id).flatMap((g) => g.fields.map((f) => f.key)));
    expect(inViews.sort()).toEqual(ALL_FIELDS.map((f) => f.key).sort());
  });
});

describe('validation', () => {
  it('accepts blank, zero and positive numbers', () => {
    const decimal = { kind: 'decimal' };
    expect(validateValue(decimal, '')).toBeNull();
    expect(validateValue(decimal, '0')).toBeNull();
    expect(validateValue(decimal, '12.75')).toBeNull();
  });

  it('rejects negatives, text, fractions for counts and percentages above 100', () => {
    expect(validateValue({ kind: 'decimal' }, '-1')).toMatch(/negative/i);
    expect(validateValue({ kind: 'decimal' }, 'abc')).toMatch(/number/i);
    expect(validateValue({ kind: 'decimal' }, '99999999999')).toMatch(/too large/i);
    expect(validateValue({ kind: 'count' }, '2.5')).toMatch(/whole/i);
    expect(validateValue({ kind: 'percent' }, '100.5')).toMatch(/100/);
  });

  it('needs every value of a step before it is saved, as in the earlier portal', () => {
    const dwell = section('dwellTime');
    const partial = validateSection(dwell, { export_dwell_time: '10', import_dwell_time: '' });
    expect(partial.missing).toBe(1);
    expect(partial.fieldErrors).toEqual({ import_dwell_time: 'Required' });

    expect(validateSection(dwell, fill(dwell)).fieldErrors).toEqual({});
  });

  it('only checks the number format when moving between steps', () => {
    const dwell = section('dwellTime');
    expect(validateSection(dwell, { export_dwell_time: '', import_dwell_time: '' }, { requireAll: false }).fieldErrors).toEqual({});
    expect(validateSection(dwell, { export_dwell_time: '-4', import_dwell_time: '' }, { requireAll: false }).fieldErrors)
      .toEqual({ export_dwell_time: 'Cannot be negative' });
  });

  it('flags a fractional vessel count and an idle time over 100%', () => {
    const vessels = section('vessels');
    expect(validateSection(vessels, { ...fill(vessels), dry_bulk_vessel_handled: '3.5' }).fieldErrors)
      .toEqual({ dry_bulk_vessel_handled: 'Whole number only' });
    const idle = section('idleTime');
    expect(validateSection(idle, { ...fill(idle), overall_average_idle_time: '120' }).fieldErrors)
      .toEqual({ overall_average_idle_time: 'Cannot exceed 100%' });
  });
});

describe('payloads', () => {
  it('sends only the step columns, as numbers', () => {
    const crane = section('craneProductivity');
    expect(buildSectionPayload(crane, { ...toFormValues(), gross_crane_productivity: '24.5', total_moves: '1200', export_dwell_time: '9' }))
      .toEqual({ gross_crane_productivity: 24.5, total_moves: 1200 });
  });

  it('turns server values into form text, blanks for missing', () => {
    const form = toFormValues({ average_trt_overall: 36.25, total_moves: 0, osbd_overall: null });
    expect(form.average_trt_overall).toBe('36.25');
    expect(form.total_moves).toBe('0');
    expect(form.osbd_overall).toBe('');
    expect(Object.keys(form)).toHaveLength(134);
  });

  it('adds up the parts of a total, leaving out TEUs', () => {
    const loaded = section('cargoHandled').groups.find((g) => g.title === 'Cargo loaded');
    const values = {
      dry_bulk_cargo_loaded: '1', break_bulk_cargo_loaded: '2', liquid_bulk_cargo_loaded: '3',
      container_bulk_cargo_loaded: '4', container_bulk_cargo_loaded_teu: '500', total_cargo_loaded: '10',
    };
    expect(sumGroupParts(loaded, values)).toBe(10);
    expect(sumGroupParts(loaded, {})).toBeNull();
    expect(sumGroupParts(section('dwellTime').groups[0], values)).toBeNull();
  });
});

describe('targets', () => {
  const types = [
    { kpi_type_id: 1, kpi_name: 'Target Avg Vessel TRT (In Hours)' },
    { kpi_type_id: 11, kpi_name: 'Target Idle Time to Total Time (in %)' },
    { kpi_type_id: 32, kpi_name: 'Target Traffic - Dry Bulk (In MMT)' },
    { kpi_type_id: 99, kpi_name: 'Target Something New' },
  ];

  it('groups the KPI types and keeps unknown ones under Other', () => {
    expect(groupKpiTypes(types).map((g) => [g.title, g.types.map((t) => t.kpi_type_id)])).toEqual([
      ['Turnaround Time', [1]],
      ['Waiting, Dwell & Idle Time', [11]],
      ['Traffic', [32]],
      ['Other', [99]],
    ]);
  });

  it('drops the "Target" prefix and spots percentage KPIs', () => {
    expect(kpiLabel(types[0])).toBe('Avg Vessel TRT (In Hours)');
    expect(isPercentKpi(types[1])).toBe(true);
    expect(isPercentKpi(types[0])).toBe(false);
  });
});
