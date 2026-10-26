// Data List → CSV (opens in Excel), with the same columns and S.No as exportDataListToPdf.
// For lists paged in the browser: the grid only holds the page on show, so its own
// exportDataAsCsv would miss the other pages. Pass every filtered row instead.
//
// Usage:
//   exportDataListToCsv({
//     columnLabels: COLUMN_LABELS,   // { field: 'Display Name' }
//     visibleCols,                   // { field: true/false }
//     rowData: filteredData,
//     fileName: 'sci_time_voyage_bulk',
//   });
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function exportDataListToCsv({ columnLabels = {}, visibleCols = {}, rowData = [], fileName = 'data_list' }) {
  const fields = Object.keys(columnLabels).filter((f) => visibleCols[f]);
  const lines = [
    ['S.No', ...fields.map((f) => columnLabels[f])],
    ...rowData.map((row, i) => [i + 1, ...fields.map((f) => row[f])]),
  ];
  // BOM so Excel reads UTF-8 (₹, names) correctly
  const csv = '﻿' + lines.map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default exportDataListToCsv;
