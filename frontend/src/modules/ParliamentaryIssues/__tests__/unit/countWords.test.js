import { countWords } from '../../utils/stageHelpers';

describe('countWords', () => {
  it('counts words and treats empty input as 0', () => {
    expect(countWords('Port safety query')).toBe(3);
    expect(countWords('  one   two  ')).toBe(2);
    expect(countWords('')).toBe(0);
    expect(countWords(null)).toBe(0);
  });
});
