import { mapIssueListRow } from '../../utils/mapIssue';

describe('mapIssueListRow', () => {
  it('maps API fields used by the list view', () => {
    const row = {
      parliamentary_issue_id: 42,
      subject: 'Port safety query',
      wing_name: 'Shipping',
      wing: 3,
      division_name: 'Ports',
      division: 7,
      parliamentary_issue_type: 'Assurance',
      parlia_stage_name: 'Comments Sought',
      remarks: 'Follow up',
      updated_date: '2026-03-15T10:00:00.000Z',
      created_by: 99,
    };

    expect(mapIssueListRow(row)).toMatchObject({
      id: 42,
      subject: 'Port safety query',
      wing: 'Shipping',
      issueType: 'Assurance',
      status: 'Comments Sought',
      isCompleted: false,
      remarks: 'Follow up',
      lastUpdated: '2026-03-15',
    });
  });

  it('marks Matter Disposed and Reply Sent rows as completed', () => {
    expect(
      mapIssueListRow({
        parliamentary_issue_id: 1,
        parlia_stage_name: 'Matter Disposed',
      }).isCompleted
    ).toBe(true);

    expect(
      mapIssueListRow({
        parliamentary_issue_id: 2,
        parlia_stage_name: 'Reply sent',
      }).isCompleted
    ).toBe(true);

    expect(
      mapIssueListRow({
        parliamentary_issue_id: 3,
        parlia_stage_name: 'Replay sent',
      }).isCompleted
    ).toBe(true);
  });
});
