import { exportRowsToFile } from '../../../utils/exportGridReport';

// Copy / Excel / PDF for a DGS Data List, the portal's standard exports (as CSL / Capex):
// what the grid shows, i.e. visible columns in order, every row after search, filters and sort
// (all pages, not only the current one), each cell as displayed (month names, "75.00%", "--").
// The S.No column is numbered here and action columns are left out.

const SKIP_HEADERS = ['S.No', 'Action', 'Actions', 'Update'];

/** { headers, rows } read from an ag-Grid api, or null when the grid is not ready yet. */
export function readGridForExport(api) {
  if (!api) return null;
  const columns = api.getAllDisplayedColumns()
    .filter((col) => !SKIP_HEADERS.includes(col.getColDef().headerName));
  const headers = ['S.No', ...columns.map((col) => col.getColDef().headerName || '')];
  const rows = [];
  api.forEachNodeAfterFilterAndSort((node) => {
    if (!node.data) return;
    rows.push([
      rows.length + 1,
      ...columns.map((col) => {
        const shown = api.getCellValue({ rowNode: node, colKey: col, useFormatter: true });
        return shown === null || shown === undefined ? '' : shown;
      }),
    ]);
  });
  return { headers, rows };
}

/** Tab-separated text for the clipboard (pastes into Excel as a table). */
export function toClipboardText({ headers, rows }) {
  return [headers, ...rows].map((line) => line.join('\t')).join('\n');
}

/** Saves the grid as .xlsx or .pdf (title + "As on" date on top). Returns the file name. */
export function saveGridFile(type, grid, { title, fileName }) {
  return exportRowsToFile(type, { title, headers: grid.headers, rows: grid.rows, fileName });
}
