/* global describe, it, expect */
import {
  DWELL_UPLOAD_RULES,
  DWELL_VALUE_COLUMNS,
  checkDwellFile,
  toDwellFormValues,
  toDwellPayload,
  validateDwellRow,
  validateDwellValue,
} from '../../pages/PortPerformance/dwellTimeConfig';
import { PORT_PERFORMANCE_SECTIONS, stepsForPeriod } from '../../pages/PortPerformance/portPerformanceConfig';

const row = (overrides = {}) => ({
  monthly_import: '37.05', monthly_export: '99.56', monthly_overall: '62.24',
  ytd_import: '36.93', ytd_export: '90.01', ytd_overall: '57.06',
  ...overrides,
});

describe('dwell time upload checks', () => {
  it('lists the rules users see before uploading', () => {
    expect(DWELL_UPLOAD_RULES).toHaveLength(9);
    expect(DWELL_UPLOAD_RULES.join(' ')).toMatch(/"SMPA Overall" row/);
    expect(DWELL_VALUE_COLUMNS.map((c) => c.key)).toEqual([
      'monthly_import', 'monthly_export', 'monthly_overall', 'ytd_import', 'ytd_export', 'ytd_overall',
    ]);
  });

  it('accepts Excel files up to 2 MB only', () => {
    expect(checkDwellFile({ name: 'Dwell.XLSX', size: 1000 })).toBeNull();
    expect(checkDwellFile({ name: 'dwell.xls', size: 1000 })).toBeNull();
    expect(checkDwellFile({ name: 'dwell.csv', size: 1000 })).toMatch(/only excel files/i);
    expect(checkDwellFile({ name: 'dwell.xlsx', size: 3 * 1024 * 1024 })).toMatch(/larger than 2 mb/i);
    expect(checkDwellFile({ name: 'dwell.xlsx', size: 0 })).toMatch(/empty/i);
    expect(checkDwellFile(null)).toMatch(/choose/i);
  });
});

describe('dwell time values', () => {
  it('treats blank and "-" as no data, and checks the number range', () => {
    expect(validateDwellValue('')).toBeNull();
    expect(validateDwellValue(' - ')).toBeNull();
    expect(validateDwellValue('12.5')).toBeNull();
    expect(validateDwellValue('abc')).toBe('Enter a number');
    expect(validateDwellValue('-3')).toBe('Cannot be negative');
    expect(validateDwellValue('10001')).toMatch(/at most/i);
  });

  it('needs Overall between Import and Export, for the month and the YTD', () => {
    expect(validateDwellRow(row())).toEqual({});
    expect(validateDwellRow(row({ monthly_overall: '150' }))).toEqual({ monthly_overall: 'Must be between Import and Export' });
    expect(validateDwellRow(row({ ytd_overall: '10' }))).toEqual({ ytd_overall: 'Must be between Import and Export' });
    // No check when a part is missing
    expect(validateDwellRow(row({ monthly_import: '-', monthly_overall: '150' }))).toEqual({});
  });

  it('turns form text into the request values and back', () => {
    const payload = toDwellPayload(row({ ytd_import: '', ytd_export: '-' }));
    expect(payload).toMatchObject({ monthly_import: 37.05, ytd_import: null, ytd_export: null });
    expect(toDwellFormValues({ monthly_import: 37.05, ytd_import: null })).toMatchObject({ monthly_import: '37.05', ytd_import: '' });
  });
});

describe('input form steps', () => {
  it('leaves out Dwell Time unless the period still has it from the form', () => {
    expect(stepsForPeriod()).toHaveLength(PORT_PERFORMANCE_SECTIONS.length - 1);
    expect(stepsForPeriod().some((s) => s.id === 'dwellTime')).toBe(false);
    expect(stepsForPeriod(['dwellTime'])).toHaveLength(PORT_PERFORMANCE_SECTIONS.length);
  });
});
