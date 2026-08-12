/**
 * mapIssueToForm: turns an API row into edit form fields.
 */
import { mapIssueToForm } from '../mapIssue';

describe('mapIssueToForm', () => {
  it('maps API fields used by the edit form', () => {
    const row = {
      parliamentary_issue_id: 42,
      subject: 'Port safety query',
      wing: 3,
      parliamentary_issue_type: 'Assurance',
      received_at_ministry: 1,
      comment_soughted_wings: '1, 2',
    };

    expect(mapIssueToForm(row)).toMatchObject({
      parliamentaryIssueID: 42,
      wing: '3',
      issueType: 'Assurance',
      received: 'Yes',
      wings: ['1', '2'],
    });
  });

  it('returns null when there is no row', () => {
    expect(mapIssueToForm(null)).toBeNull();
  });
});
