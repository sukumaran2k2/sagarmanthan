import * as XLSX from 'xlsx';

const EXPORT_HEADERS = [
  'Organization ID',
  'Organization Name',
  'Project Id',
  'Sub Project Id',
  'Project Name',
  'Sagarmala Project Id',
  'Sub Sagarmala Project Id',
  'Year',
  'Financial Year',
  'Month',
  'GBS Components (In Cr.)',
  'IEBR Components (In Cr.)',
  'PPP Components (In Cr.)',
  'Loan Components (In Cr.)',
  'Multilateral Components (In Cr.)',
  'State Govt.Fund Components (In Cr.)',
  'PMMSY Components (In Cr.)',
  'Sagarmala Components (In Cr.)',
  'Others Components (In Cr.)',
  'Financial Progress',
  'Expenditure Date',
];

function formatExpenditureDate(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function cell(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
  }
  return '';
}

function mapExportRow(row) {
  return [
    cell(row, 'Organization ID'),
    cell(row, 'Organization Name'),
    cell(row, 'Project Id'),
    cell(row, 'Sub Project Id'),
    cell(row, 'Project Name'),
    cell(row, 'Sagarmala Project Id'),
    cell(row, 'Sub Sagarmala Project Id', 'sub_sagarmala_project_id'),
    cell(row, 'Year'),
    cell(row, 'Financial Year'),
    cell(row, 'Month'),
    cell(row, 'GBS Components (In Cr.)'),
    cell(row, 'IEBR Components (In Cr.)'),
    cell(row, 'PPP Components (In Cr.)'),
    cell(row, 'Loan Components (In Cr.)'),
    cell(row, 'Multilateral Components (In Cr.)'),
    cell(row, 'State Govt.Fund Components (In Cr.)'),
    cell(row, 'PMMSY Components (In Cr.)'),
    cell(row, 'Sagarmala Components (In Cr.)'),
    cell(row, 'Others Components (In Cr.)'),
    cell(row, 'Financial Progress'),
    formatExpenditureDate(cell(row, 'Expenditure Date')),
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
  return `Expenditure Logs ${day}-${month}-${year} ${hours}:${minutes}:${seconds}.xlsx`;
}

export function buildExpenditureLogsWorkbook(rows = []) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const data = sourceRows.map(mapExportRow);
  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenditure Logs');
  return { workbook, rowCount: sourceRows.length };
}

export function downloadExpenditureLogsExcel(rows = []) {
  const { workbook, rowCount } = buildExpenditureLogsWorkbook(rows);
  XLSX.writeFile(workbook, buildExportFileName());
  return rowCount;
}
