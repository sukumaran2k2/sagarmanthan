import { exportRowsToFile } from './exportGridReport';
import { COMMON_TOASTS } from './notify';

// Copy / Excel / PDF for a table's rows: every row passed in (e.g. all filtered rows,
// not just the grid page on show), with S.No added.
// columns: [{ key, label, value: (row) => text }]
export function exportTableRows(type, { columns, rows, fileName, title, notify }) {
  const values = rows.map((row) => columns.map((c) => c.value(row)));

  if (type === 'copy') {
    const clean = (v) => String(v ?? '').replace(/[\t\n]/g, ' ');
    const tsv = [['S.No', ...columns.map((c) => c.label)], ...values.map((v, i) => [i + 1, ...v])]
      .map((line) => line.map(clean).join('\t'))
      .join('\n');
    navigator.clipboard.writeText(tsv).then(
      () => notify(COMMON_TOASTS.copySuccess(rows.length)),
      () => notify(COMMON_TOASTS.copyFailed()),
    );
    return;
  }

  // Excel (.xlsx) and PDF are written straight to a file: no print dialog or new tab, and the
  // header keeps its colour (a printed page drops background colours)
  const name = exportRowsToFile(type === 'pdf' ? 'pdf' : 'excel', {
    title,
    headers: ['S.No', ...columns.map((c) => c.label)],
    rows: values.map((v, i) => [i + 1, ...v]),
    fileName,
  });
  notify(COMMON_TOASTS.excelExported(name));
}
