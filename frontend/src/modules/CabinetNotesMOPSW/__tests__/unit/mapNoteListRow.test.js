/**
 * mapNoteListRow: turns an API row into list/table fields.
 */
import { mapNoteListRow } from '../../utils/mapNote';

describe('mapNoteListRow', () => {
  it('maps API fields used by the list view', () => {
    const row = {
      cabinet_notes_mopsw_id: 42,
      subject: 'Test note',
      wing_name: 'Ports',
      wing: 3,
      division_name: 'Div A',
      division: 7,
      mopsw_stage_name: 'Completed',
      remarks: 'ok',
      doc_count: 2,
      updated_date: '2026-03-01T00:00:00.000Z',
      created_by: 9,
    };

    expect(mapNoteListRow(row)).toMatchObject({
      id: 42,
      subject: 'Test note',
      wing: 'Ports',
      wingId: 3,
      status: 'Completed',
      docCount: 2,
      lastUpdated: '2026-03-01',
    });
  });
});
