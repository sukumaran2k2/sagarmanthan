import { canonicalizeIssueType, isCompletedParliamentaryIssue, STAGE_REMARK_FIELDS } from './stageHelpers';

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

function stageDateColumn(dbRemark) {
  return String(dbRemark).replace(/_remarks$/, '_date');
}

export function summarizeStageRemarks(row = {}) {
  const parts = STAGE_REMARK_FIELDS.map(({ dbRemark }) =>
    String(row[dbRemark] || '').trim()
  ).filter(Boolean);
  if (parts.length) return parts.join('; ');
  return String(row.remarks || '').trim();
}

export function mapIssueListRow(row) {
  return {
    id: row.parliamentary_issue_id,
    subject: row.subject || '',
    wing: row.wing_name || '',
    wingId: row.wing,
    division: row.division_name || '',
    divisionId: row.division,
    issueType: row.parliamentary_issue_type || row.parlia_issue_type || '',
    status: row.parlia_stage_name || '',
    isCompleted: isCompletedParliamentaryIssue(row),
    remarks: summarizeStageRemarks(row),
    lastUpdated: row.updated_date
      ? toDateInput(row.updated_date)
      : row.created_date
        ? toDateInput(row.created_date)
        : '--',
    createdBy: row.created_by,
  };
}

export function mapIssueToForm(row) {
  if (!row) return null;

  const wingIds = String(row.comment_soughted_wings || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const form = {
    parliamentaryIssueID: row.parliamentary_issue_id,
    wing: row.wing != null ? String(row.wing) : '',
    division: row.division != null ? String(row.division) : '',
    parliamentarySubject: row.subject || '',
    fileNumber: row.file_number || '',
    issueType: canonicalizeIssueType(row.parliamentary_issue_type) || row.parliamentary_issue_type || '',
    assuranceNumber: row.assurance_number || '',
    parliamentHouse: row.parliament_house || '',
    nameOfMP: row.name_of_mp || '',
    extensionSought: toDateInput(row.extension_sought_date),
    wings: wingIds,
  };

  STAGE_REMARK_FIELDS.forEach(({ dateKey, remarkKey, dbRemark }) => {
    form[dateKey] = toDateInput(row[stageDateColumn(dbRemark)]);
    form[remarkKey] = row[dbRemark] || '';
  });

  return form;
}
