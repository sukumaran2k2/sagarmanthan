import { canonicalizeIssueType } from './stageHelpers';

function toDateInput(value) {
  if (!value) return '';
  // Prefer YYYY-MM-DD prefix (matches legacy .slice(0, 10) on SQL dates)
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

// Handles MSSQL bit / Buffer values from the API.
function bitToYesNo(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(value)) {
    return value[0] ? 'Yes' : 'No';
  }
  if (typeof value === 'object' && value?.type === 'Buffer' && Array.isArray(value.data)) {
    return value.data[0] ? 'Yes' : 'No';
  }
  if (value === true || value === 1 || value === '1') return 'Yes';
  if (value === false || value === 0 || value === '0') return 'No';
  const n = String(value).trim().toLowerCase();
  if (n === 'yes' || n === 'true') return 'Yes';
  if (n === 'no' || n === 'false') return 'No';
  return '';
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
    remarks: row.remarks || '',
    lastUpdated: row.updated_date
      ? toDateInput(row.updated_date)
      : row.created_date
        ? toDateInput(row.created_date)
        : '--',
    createdBy: row.created_by,
    raw: row,
  };
}

export function mapIssueToForm(row) {
  if (!row) return null;

  const wingIds = String(row.comment_soughted_wings || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
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
    received: bitToYesNo(row.received_at_ministry),
    receivedDate: toDateInput(row.received_at_ministry_date),
    commentSought: bitToYesNo(row.comment_soughted),
    commentSoughtDate: toDateInput(row.comment_soughted_date),
    wings: wingIds,
    commentsReceived: bitToYesNo(row.comment_received),
    commentsReceivedDate: toDateInput(row.comment_received_date),
    shipping: bitToYesNo(row.shipping),
    shippingDate: toDateInput(row.shipping_date),
    vigilance: bitToYesNo(row.vigilance),
    vigilanceDate: toDateInput(row.vigilance_date),
    ports: bitToYesNo(row.ports),
    portsDate: toDateInput(row.ports_date),
    iwt: bitToYesNo(row.iwt),
    iwtDate: toDateInput(row.iwt_date),
    administration: bitToYesNo(row.administration),
    administrationDate: toDateInput(row.administration_date),
    coordI: bitToYesNo(row.coord_I),
    coordIDate: toDateInput(row.coord_I_date),
    coordII: bitToYesNo(row.coord_II),
    coordIIDate: toDateInput(row.coord_II_date),
    dgll: bitToYesNo(row.dgll_parliament_and_trw),
    dgllDate: toDateInput(row.dgll_parliament_and_trw_date),
    development: bitToYesNo(row.development),
    developmentDate: toDateInput(row.development_date),
    finance: bitToYesNo(row.finance),
    financeDate: toDateInput(row.finance_date),
    sagarmala: bitToYesNo(row.sagarmala),
    sagarmalaDate: toDateInput(row.sagarmala_date),
    extensionTimeSought: bitToYesNo(row.extension_time_soughted),
    extensionTimeSoughtDate: toDateInput(row.extension_time_soughted_date),
    replySend: bitToYesNo(row.reply_send),
    replySendDate: toDateInput(row.reply_send_date),
    debatedInParliament: bitToYesNo(row.debated_in_parliament),
    debatedInParliamentDate: toDateInput(row.debated_in_parliament_date),
    impReportFurnished: bitToYesNo(row.implementation_report_furnished),
    impReportFurnishedDate: toDateInput(row.implementation_report_furnished_date),
    matterDisposed: bitToYesNo(row.matter_disposed),
    matterDisposedDate: toDateInput(row.matter_disposed_date),
    remarks: row.remarks || '',
  };
}
