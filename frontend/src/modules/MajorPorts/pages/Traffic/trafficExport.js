import * as XLSX from 'xlsx';
import { exportDataListToPdf } from '../../../../utils/exportReportPdf';

/**
 * Copy / Excel / PDF for the Traffic lists, driven by the same column spec as the grid:
 *   [{ field, label, exportValue?: (row) => value }]
 * Only the rows on screen (current page) are exported, like the other Data Lists.
 */

function cellValue(column, row) {
  const value = column.exportValue ? column.exportValue(row) : row[column.field];
  return value === null || value === undefined ? '' : value;
}

export function copyRowsToClipboard(columns, rows) {
  const header = columns.map((c) => c.label).join('\t');
  const lines = rows.map((row) => columns.map((c) => cellValue(c, row)).join('\t'));
  return navigator.clipboard.writeText([header, ...lines].join('\n'));
}

/** Writes an .xlsx file and returns its name. */
export function downloadExcel(columns, rows, baseName, sheetName = 'Data') {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.label, cellValue(c, row)]))
  );
  const sheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  const fileName = `${baseName}.xlsx`;
  XLSX.writeFile(book, fileName);
  return fileName;
}

export function downloadPdf(title, columns, rows, baseName) {
  const columnLabels = Object.fromEntries(columns.map((c) => [c.field, c.label]));
  const visibleCols = Object.fromEntries(columns.map((c) => [c.field, true]));
  const rowData = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.field, cellValue(c, row)]))
  );
  exportDataListToPdf({ title, columnLabels, visibleCols, rowData, fileName: baseName });
}
