/**
 * computeStageId: picks the stage id to save with an Assurance issue.
 */
import { computeStageId } from '../stageHelpers';

describe('computeStageId', () => {
  const stages = [
    { parlia_stage_id: 10, parlia_issue_type: 'Assurance', parlia_stage_name: 'No Status' },
    { parlia_stage_id: 11, parlia_issue_type: 'Assurance', parlia_stage_name: 'Received At Ministry' },
    { parlia_stage_id: 16, parlia_issue_type: 'Assurance', parlia_stage_name: 'Matter Disposed' },
  ];

  it('returns 0 when there are no stages', () => {
    expect(computeStageId({ issueType: 'Assurance' }, [])).toBe('0');
  });

  it('returns No Status when nothing is marked yet', () => {
    expect(computeStageId({ issueType: 'Assurance' }, stages)).toBe('10');
  });

  it('returns Received At Ministry when received is Yes', () => {
    expect(
      computeStageId({ issueType: 'Assurance', received: 'Yes' }, stages)
    ).toBe('11');
  });
});
