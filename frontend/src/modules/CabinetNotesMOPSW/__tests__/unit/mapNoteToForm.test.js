/**
 * mapNoteToForm: turns an API row into edit form fields.
 */
import { mapNoteToForm } from '../../utils/mapNote';

describe('mapNoteToForm', () => {
  it('maps API fields used by the edit form', () => {
    const row = {
      cabinet_notes_mopsw_id: 5,
      wing: 1,
      division: 2,
      subject: 'Subject',
      remarks: 'r',
      pre_dcn_prepared_date: '2026-01-10T00:00:00.000Z',
      pre_dcn_prepared_remarks: 'prep',
      completed_date: null,
    };

    expect(mapNoteToForm(row)).toMatchObject({
      mopswCabinetID: 5,
      wing: '1',
      division: '2',
      preliDcnPreparedDate: '2026-01-10',
      preliDcnPreparedRemark: 'prep',
      completedDate: '',
    });
  });

  it('returns null when there is no row', () => {
    expect(mapNoteToForm(null)).toBeNull();
  });
});
