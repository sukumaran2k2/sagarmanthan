import * as XLSX from 'xlsx';
import { exportDataListToPdf } from '../../../utils/exportReportPdf';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';

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

/**
 * Every row of a server-paged list for `params` (its filters and search), fetched 100 at a time
 * (the server's page cap). Copy / Excel / PDF use it so they cover the whole filtered list, as
 * the legacy pages did, not only the page on screen.
 */
export async function fetchAllRows(request, params, { maxPages = 500 } = {}) {
  const rows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await request({ ...params, page, limit: 100 });
    const { data, pagination } = res?.data || {};
    if (Array.isArray(data)) rows.push(...data);
    if (!Array.isArray(data) || !data.length || page >= (Number(pagination?.totalPages) || 0)) break;
  }
  return rows;
}

export const safeFileName = (name) => String(name || 'export').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');

function writeClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('Clipboard is not available'));
}

export function exportRowsToExcel(rows, columns, { sheetName = 'Sheet1', fileName = 'export', serialStart = 0 } = {}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsToSheetObjects(rows, columns, serialStart)), sheetName.slice(0, 31));
  const file = `${safeFileName(fileName)}.xlsx`;
  XLSX.writeFile(wb, file);
  return file;
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
  return `${safeFileName(fileName)}.pdf`;
}

/**
 * Wires Copy / Excel / PDF to the rows on screen (`loadRows` may also return a promise).
 * isBusy: while a page is still loading nothing is copied or exported, so the output always
 * matches the table. notify(toast) (useNotifier) reports empty data, success and failures.
 */
export function createTableExporter({
  loadRows, getColumns, notify, title, fileName, sheetName, label = 'Table', isBusy = false, serialStart = 0,
}) {
  const withRows = async (action, run) => {
    if (isBusy) {
      notify?.(COMMON_TOASTS.tableNotReady(action));
      return;
    }
    let rows;
    try {
      rows = await loadRows();
    } catch (err) {
      notify?.(COMMON_TOASTS.loadFailed(label));
      console.error(getErrorMessage(err) || err);
      return;
    }
    if (!rows?.length) {
      notify?.(HR_TOASTS.noDataToExport());
      return;
    }
    await run(rows, getColumns());
  };

  return {
    copy: () =>
      withRows('copy', (rows, columns) =>
        writeClipboard(rowsToTsv(rows, columns, serialStart))
          .then(() => notify?.(COMMON_TOASTS.copySuccess(rows.length)))
          .catch(() => notify?.(COMMON_TOASTS.copyFailed()))
      ),
    // Write the file first: notify?.(...) would skip its argument when no notifier is passed
    excel: () => withRows('export', (rows, columns) => {
      const file = exportRowsToExcel(rows, columns, { sheetName: sheetName || label, fileName, serialStart });
      notify?.(COMMON_TOASTS.excelExported(file));
    }),
    pdf: () => withRows('export', (rows, columns) => {
      const file = exportRowsToPdf(rows, columns, { title, fileName, serialStart });
      notify?.(COMMON_TOASTS.excelExported(file));
    }),
  };
}
