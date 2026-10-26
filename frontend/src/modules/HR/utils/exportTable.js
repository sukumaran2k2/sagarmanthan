import * as XLSX from 'xlsx';
import { exportDataListToPdf } from '../../../utils/exportReportPdf';

// Copy / Excel / PDF for HR list pages.
// columns: [{ field, label, value?(row) }] — the visible columns, in table order.
// A leading S.No column is always added, numbered from serialStart + 1 (so page 3 of a
// 10-row list starts at 21).

const cellValue = (row, col) => {
  const v = typeof col.value === 'function' ? col.value(row) : row[col.field];
  return v === null || v === undefined ? '' : v;
};

const clean = (v) => String(v).replace(/[\t\r\n]+/g, ' ').trim();

/** Tab-separated text (header + rows) that pastes straight into Excel. */
export function rowsToTsv(rows, columns, serialStart = 0) {
  const header = ['S.No', ...columns.map((c) => c.label)].join('\t');
  const body = rows.map((r, i) => [serialStart + i + 1, ...columns.map((c) => clean(cellValue(r, c)))].join('\t'));
  return [header, ...body].join('\n');
}

/** Plain objects keyed by column label, for XLSX.utils.json_to_sheet. */
export function rowsToSheetObjects(rows, columns, serialStart = 0) {
  return rows.map((r, i) => {
    const out = { 'S.No': serialStart + i + 1 };
    columns.forEach((c) => {
      out[c.label] = cellValue(r, c);
    });
    return out;
  });
}

export const safeFileName = (name) => String(name || 'export').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');

function writeClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('Clipboard is not available'));
}

export function exportRowsToExcel(rows, columns, { sheetName = 'Sheet1', fileName = 'export', serialStart = 0 } = {}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsToSheetObjects(rows, columns, serialStart)), sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${safeFileName(fileName)}.xlsx`);
}

export function exportRowsToPdf(rows, columns, { title, fileName = 'export', serialStart = 0 } = {}) {
  const columnLabels = {};
  const visibleCols = {};
  columns.forEach((c) => {
    columnLabels[c.field] = c.label;
    visibleCols[c.field] = true;
  });
  const rowData = rows.map((r) => {
    const out = {};
    columns.forEach((c) => {
      out[c.field] = cellValue(r, c);
    });
    return out;
  });
  exportDataListToPdf({ title, columnLabels, visibleCols, rowData, fileName: safeFileName(fileName), serialStart });
}

/**
 * Wires Copy / Excel / PDF to the rows on screen (`loadRows` may also return a promise).
 * isBusy: while a page is still loading nothing is copied or exported, so the output always
 * matches the table. notify(message, type) reports empty data, success and failures.
 */
export function createTableExporter({
  loadRows, getColumns, notify, title, fileName, sheetName, label = 'Table', isBusy = false, serialStart = 0,
}) {
  const withRows = async (action) => {
    if (isBusy) {
      notify?.('The table is still loading. Try again in a moment.', 'warning');
      return;
    }
    let rows;
    try {
      rows = await loadRows();
    } catch (err) {
      notify?.(err?.response?.data?.message || 'Failed to load the data.', 'error');
      return;
    }
    if (!rows?.length) {
      notify?.('No data to export.', 'warning');
      return;
    }
    await action(rows, getColumns());
  };

  return {
    copy: () =>
      withRows((rows, columns) =>
        writeClipboard(rowsToTsv(rows, columns, serialStart))
          .then(() => notify?.(`${label} copied to clipboard (${rows.length} rows).`, 'success'))
          .catch(() => notify?.('Failed to copy to clipboard.', 'error'))
      ),
    excel: () => withRows((rows, columns) => exportRowsToExcel(rows, columns, { sheetName: sheetName || label, fileName, serialStart })),
    pdf: () => withRows((rows, columns) => exportRowsToPdf(rows, columns, { title, fileName, serialStart })),
  };
}
