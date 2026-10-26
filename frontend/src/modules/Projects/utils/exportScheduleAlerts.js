import * as XLSX from 'xlsx';

const EXPORT_HEADERS = [
  'Project Id',
  'Sub Project Id',
  'Project Name',
  'Sub Project Name',
  'Stage',
  'Current Step / Milestone',
  'Schedule Status',
  'Days',
  'Details',
];

function daysCaption(status) {
  if (!status || status.days == null) return '';
  if (status.key === 'overdue') return `${status.days} overdue`;
  if (status.key === 'at_risk') return status.days === 0 ? 'due today' : `${status.days} left`;
  return String(status.days);
}

function mapExportRow(alert = {}) {
  return [
    alert.projectId || '',
    alert.subProjectId && alert.subProjectId !== '-1' ? alert.subProjectId : '',
    alert.projectName || '',
    alert.subProjectName && alert.subProjectName !== '-' ? alert.subProjectName : '',
    alert.stage || '',
    alert.stepLabel || '',
    alert.status?.label || '',
    daysCaption(alert.status),
    alert.status?.description || '',
  ];
}

function buildExportFileName() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `Schedule Alerts ${day}-${month}-${year} ${hours}:${minutes}:${seconds}.xlsx`;
}

export function buildScheduleAlertsWorkbook(alerts = []) {
  const sourceRows = Array.isArray(alerts) ? alerts : [];
  const data = sourceRows.map(mapExportRow);
  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule Alerts');
  return { workbook, rowCount: sourceRows.length };
}

export function downloadScheduleAlertsExcel(alerts = []) {
  const { workbook, rowCount } = buildScheduleAlertsWorkbook(alerts);
  XLSX.writeFile(workbook, buildExportFileName());
  return rowCount;
}
