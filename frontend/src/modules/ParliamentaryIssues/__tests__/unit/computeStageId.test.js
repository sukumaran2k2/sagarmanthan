import { buildDrilldownStageMap, computeStageId } from '../../utils/stageHelpers';

const stages = [
  { parlia_stage_id: 0, parlia_issue_type: 'Assurance', parlia_stage_name: 'No Status' },
  { parlia_stage_id: 1, parlia_issue_type: 'Assurance', parlia_stage_name: 'Received At Ministry' },
  { parlia_stage_id: 2, parlia_issue_type: 'Assurance', parlia_stage_name: 'Comments Sought' },
  { parlia_stage_id: 5, parlia_issue_type: 'Assurance', parlia_stage_name: 'Implementation Report Furnished/Request for dropping' },
  { parlia_stage_id: 6, parlia_issue_type: 'Assurance', parlia_stage_name: 'Matter Disposed' },
  { parlia_stage_id: 7, parlia_issue_type: 'Matter raised in Zero Hours', parlia_stage_name: 'No Status' },
  { parlia_stage_id: 8, parlia_issue_type: 'Matter raised in Zero Hours', parlia_stage_name: 'Received At Ministry' },
  { parlia_stage_id: 11, parlia_issue_type: 'Matter raised in Zero Hours', parlia_stage_name: 'Comments Received' },
  { parlia_stage_id: 12, parlia_issue_type: 'Matter raised in Zero Hours', parlia_stage_name: 'Replay sent' },
  { parlia_stage_id: 25, parlia_issue_type: 'PSC Report', parlia_stage_name: 'No Status' },
  { parlia_stage_id: 26, parlia_issue_type: 'PSC Report', parlia_stage_name: 'Received At Ministry' },
  { parlia_stage_id: 29, parlia_issue_type: 'PSC Report', parlia_stage_name: 'Replay sent' },
];

describe('computeStageId', () => {
  it('returns 0 when there are no stages', () => {
    expect(computeStageId({ issueType: 'Assurance' }, [])).toBe('0');
  });

  it('returns Assurance No Status when nothing is marked yet', () => {
    expect(computeStageId({ issueType: 'Assurance' }, stages)).toBe('0');
  });

  it('returns Assurance Received At Ministry when received date is present', () => {
    expect(
      computeStageId({ issueType: 'Assurance', receivedDate: '2026-01-15' }, stages)
    ).toBe('1');
  });

  it('returns Assurance Matter Disposed when disposed date is present', () => {
    expect(
      computeStageId(
        {
          issueType: 'Assurance',
          receivedDate: '2026-01-15',
          matterDisposedDate: '2026-03-01',
        },
        stages
      )
    ).toBe('6');
  });

  it('returns Zero Hours Replay sent when reply date is present', () => {
    expect(
      computeStageId(
        {
          issueType: 'Matter Raised In Zero Hours',
          receivedDate: '2026-01-15',
          replySendDate: '2026-02-01',
        },
        stages
      )
    ).toBe('12');
  });

  it('returns PSC Received At Ministry when received date is present', () => {
    expect(
      computeStageId({ issueType: 'PSC Report', receivedDate: '2026-01-15' }, stages)
    ).toBe('26');
  });
});

describe('buildDrilldownStageMap', () => {
  it('uses Assurance master ids 1-6', () => {
    const map = buildDrilldownStageMap(stages, 'Assurance');
    expect(map['Received At Ministry']).toBe(1);
    expect(map['Matter Disposed']).toBe(6);
  });

  it('uses positional 1-5 for matter types to match report drilldown', () => {
    const map = buildDrilldownStageMap(stages, 'Matter Raised In Zero Hours');
    expect(map['Received At Ministry']).toBe(1);
    expect(map['Comments Received']).toBe(2);
    expect(map['Replay sent']).toBe(3);
    expect(map['Reply sent']).toBe(3);
  });

  it('uses positional 1-4 for PSC Report', () => {
    const map = buildDrilldownStageMap(stages, 'PSC Report');
    expect(map['Received At Ministry']).toBe(1);
    expect(map['Replay sent']).toBe(2);
  });

  it('maps Implementation Report header used by the grid', () => {
    const map = buildDrilldownStageMap(stages, 'Assurance');
    expect(map['Implementation Report Furnished / Request For Dropping']).toBe(5);
  });
});
