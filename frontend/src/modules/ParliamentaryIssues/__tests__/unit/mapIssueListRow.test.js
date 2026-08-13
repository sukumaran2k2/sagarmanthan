/**
 * mapIssueListRow: turns an API row into list/table fields.
 */
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
      lastUpdated: '2026-03-15',
    });
  });
});
