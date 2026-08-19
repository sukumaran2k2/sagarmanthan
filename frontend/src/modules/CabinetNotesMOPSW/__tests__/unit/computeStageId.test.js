/**
 * computeStageId: highest stage with a date wins.
 */
import { computeStageId, buildStageDrilldownMap, lookupStageDrilldownId } from '../../utils/stageHelpers';

describe('computeStageId', () => {
  it('returns 0 when no dates are set', () => {
    expect(computeStageId({})).toBe('0');
  });

  it('returns 1 when only preliminary DCN prepared has a date', () => {
    expect(computeStageId({ preliDcnPreparedDate: '2026-01-10' })).toBe('1');
  });

  it('returns highest dated stage (completed)', () => {
    expect(
      computeStageId({
        preliDcnPreparedDate: '2026-01-10',
        onHoldDate: '2026-02-01',
        completedDate: '2026-03-01',
      })
    ).toBe('10');
  });

  it('returns DCM stage 11 when that is the highest dated stage', () => {
    expect(
      computeStageId({
        preliDcnPreparedDate: '2026-01-10',
        dcmbeenApprovedDate: '2026-01-20',
      })
    ).toBe('11');
  });
});

describe('lookupStageDrilldownId', () => {
  it('maps report headers to master stage ids', () => {
    const map = buildStageDrilldownMap([
      { mopsw_stage_id: 11, mopsw_stage_name: 'DCM Been Approved' },
      { mopsw_stage_id: 7, mopsw_stage_name: 'Advance copy sent to PMO' },
    ]);
    expect(lookupStageDrilldownId(map, 'DCM Been Approved')).toBe(11);
    expect(lookupStageDrilldownId(map, 'Has DCM been approved?')).toBe(11);
    expect(lookupStageDrilldownId(map, 'Advance copy sent to PMO')).toBe(7);
    expect(lookupStageDrilldownId(map, 'Preliminary DCN Approved by Minister')).toBe(2);
  });
});
