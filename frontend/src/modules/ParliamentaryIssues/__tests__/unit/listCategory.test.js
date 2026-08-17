import {
  isCompletedStageName,
  isCompletedParliamentaryIssue,
  stageNamesForIssueType,
} from '../../utils/stageHelpers';

const stages = [
  { parlia_stage_id: 10, parlia_issue_type: 'Assurance', parlia_stage_name: 'No Status' },
  { parlia_stage_id: 11, parlia_issue_type: 'Assurance', parlia_stage_name: 'Received At Ministry' },
  { parlia_stage_id: 16, parlia_issue_type: 'Assurance', parlia_stage_name: 'Matter Disposed' },
  { parlia_stage_id: 20, parlia_issue_type: 'PSC Report', parlia_stage_name: 'Comments Sought' },
  { parlia_stage_id: 21, parlia_issue_type: 'PSC Report', parlia_stage_name: 'Reply sent' },
];

describe('isCompletedStageName', () => {
  it('treats Matter Disposed and Reply Sent as completed', () => {
    expect(isCompletedStageName('Matter Disposed')).toBe(true);
    expect(isCompletedStageName('Reply sent')).toBe(true);
    expect(isCompletedStageName('Reply Send')).toBe(true);
    expect(isCompletedStageName('Comments Sought')).toBe(false);
    expect(isCompletedStageName('No Status')).toBe(false);
  });
});

describe('isCompletedParliamentaryIssue', () => {
  it('uses stage name or completion dates', () => {
    expect(isCompletedParliamentaryIssue({ status: 'Comments Sought' })).toBe(false);
    expect(isCompletedParliamentaryIssue({ parlia_stage_name: 'Matter Disposed' })).toBe(true);
    expect(isCompletedParliamentaryIssue({ reply_send_date: '2026-01-01' })).toBe(true);
  });
});

describe('stageNamesForIssueType', () => {
  it('returns stages for the selected issue type and can hide completed', () => {
    expect(stageNamesForIssueType(stages, 'Assurance')).toEqual([
      'No Status',
      'Received At Ministry',
      'Matter Disposed',
    ]);
    expect(stageNamesForIssueType(stages, 'Assurance', { excludeCompleted: true })).toEqual([
      'No Status',
      'Received At Ministry',
    ]);
    expect(stageNamesForIssueType(stages, 'PSC Report', { excludeCompleted: true })).toEqual([
      'Comments Sought',
    ]);
  });
});
