/* global describe, it, expect */
import {
  DWELL_UPLOAD_RULES,
  DWELL_VALUE_COLUMNS,
  checkDwellFile,
} from '../../pages/PortPerformance/dwellTimeConfig';
import { ENTRY_SECTIONS, PORT_PERFORMANCE_SECTIONS } from '../../pages/PortPerformance/portPerformanceConfig';

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

describe('input form steps', () => {
  it('keeps all 14 steps, with Dwell Time view only and not counted as a saved step', () => {
    expect(PORT_PERFORMANCE_SECTIONS).toHaveLength(14);
    expect(PORT_PERFORMANCE_SECTIONS.filter((s) => s.viewOnly).map((s) => s.id)).toEqual(['dwellTime']);
    expect(ENTRY_SECTIONS).toHaveLength(13);
    expect(ENTRY_SECTIONS.some((s) => s.id === 'dwellTime')).toBe(false);
  });
});
