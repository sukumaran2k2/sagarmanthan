import { STAGE_FIELDS, emptyForm, isCompletedCabinetNote } from './stageHelpers';

function toDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  } catch {
    return '';
  }
}

const DB_DATE_KEYS = {
  preliDcnPrepared: ['pre_dcn_prepared_date'],
  preliDcnApproved: ['pre_dcn_approved_date', 'pre_dcn__approved_date'],
  circulatedForImc: ['cirucalted_for_imc_date', 'circulated_for_imc_date'],
  imcCommentsRec: ['imc_comments_rec_date'],
  finalDcnPrepared: ['final_dcn_prepared_date'],
  finalDcnApproved: ['final_dcn_approved_date'],
  dcmbeenApproved: ['dcmbeen_approved_date', 'dcm_been_approved_date'],
  advanceCopySentToPmo: ['advance_copy_sent_to_pmo_date'],
  cabinetApproved: ['cabinet_approved_date'],
  onHold: ['on_hold_date'],
  completed: ['completed_date'],
};

const DB_REMARK_KEYS = {
  preliDcnPrepared: ['pre_dcn_prepared_remarks'],
  preliDcnApproved: ['pre_dcn_approved_remarks', 'pre_dcn__approved_remarks'],
  circulatedForImc: ['cirucalted_for_imc_remarks', 'circulated_for_imc_remarks'],
  imcCommentsRec: ['imc_comments_rec_remarks'],
  finalDcnPrepared: ['final_dcn_prepared_remarks'],
  finalDcnApproved: ['final_dcn_approved_remarks'],
  dcmbeenApproved: ['dcmbeen_approved_remarks', 'dcm_been_approved_remarks'],
  advanceCopySentToPmo: ['advance_copy_sent_to_pmo_remarks'],
  cabinetApproved: ['cabinet_approved_remarks'],
  onHold: ['on_hold_remarks'],
  completed: ['completed_remarks'],
};

function firstValue(row, keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
}

export function mapNoteListRow(row) {
  return {
    id: row.cabinet_notes_mopsw_id,
    subject: row.subject || '',
    wing: row.wing_name || '',
    wingId: row.wing,
    division: row.division_name || '',
    divisionId: row.division,
    status: row.mopsw_stage_name || '',
    isCompleted: isCompletedCabinetNote(row),
    remarks: String(row.remarks || '').trim(),
    docCount: Number(row.doc_count) || 0,
    lastUpdated: row.updated_date
      ? toDateInput(row.updated_date)
      : row.created_date
        ? toDateInput(row.created_date)
        : '--',
    createdBy: row.created_by,
    raw: row,
  };
}

export function mapNoteToForm(row) {
  if (!row) return null;

  const form = emptyForm();
  form.mopswCabinetID = row.cabinet_notes_mopsw_id;
  form.wing = row.wing != null ? String(row.wing) : '';
  form.division = row.division != null ? String(row.division) : '';
  form.subject = row.subject || '';
  form.remarks = row.remarks || '';

  STAGE_FIELDS.forEach((s) => {
    const dateVal = firstValue(row, DB_DATE_KEYS[s.key] || []);
    const remarkVal = firstValue(row, DB_REMARK_KEYS[s.key] || []);
    const dateStr = toDateInput(dateVal);
    form[s.dateKey] = dateStr;
    form[s.remarkKey] = remarkVal || '';
  });

  return form;
}
