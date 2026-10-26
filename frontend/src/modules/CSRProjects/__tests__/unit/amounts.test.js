/* global describe, it, expect */
import { lakhToCrore, croreToLakh, formatCrore, croreInput } from '../../utils/amounts';

describe('CSR amounts (stored in lakh, shown in crore)', () => {
  it('converts both ways without float noise', () => {
    expect(lakhToCrore(4013)).toBe(40.13);
    expect(croreToLakh('40.13')).toBe(4013);
    expect(croreToLakh('0.005')).toBe(0.5);
    expect(croreToLakh('1.2345')).toBe(123.45);
    expect(croreToLakh(croreInput(1442.07))).toBe(1442.07);
  });

  it('formats crore for display, keeping small project values readable', () => {
    expect(formatCrore(4013)).toBe('40.13');
    expect(formatCrore(0.5)).toBe('0.005');
    expect(formatCrore(1234567)).toBe('12,345.67');
    expect(formatCrore(null)).toBe('-');
    expect(formatCrore('')).toBe('-');
  });

  it('gives form inputs the crore value, empty when missing', () => {
    expect(croreInput(4013)).toBe('40.13');
    expect(croreInput(0)).toBe('0');
    expect(croreInput(null)).toBe('');
  });
});
