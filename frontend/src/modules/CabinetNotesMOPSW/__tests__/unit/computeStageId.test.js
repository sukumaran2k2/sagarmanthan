/**
 * computeStageId: highest Yes stage wins (legacy Cabinet Notes MoPSW).
 */
import { computeStageId } from '../../utils/stageHelpers';

describe('computeStageId', () => {
  it('returns 0 when nothing is marked yet', () => {
    expect(computeStageId({})).toBe('0');
  });

  it('returns 1 when only preliminary DCN prepared is Yes', () => {
    expect(computeStageId({ preliDcnPrepared: 'Yes' })).toBe('1');
  });

  it('returns highest Yes stage (completed)', () => {
    expect(
      computeStageId({
        preliDcnPrepared: 'Yes',
        completed: 'Yes',
        onHold: 'Yes',
      })
    ).toBe('11');
  });

  it('returns DCM stage 7 when that is the highest Yes', () => {
    expect(
      computeStageId({
        preliDcnPrepared: 'Yes',
        dcmbeenApproved: 'Yes',
      })
    ).toBe('7');
  });
});
