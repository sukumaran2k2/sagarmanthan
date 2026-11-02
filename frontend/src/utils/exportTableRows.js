import { exportDataListToCsv } from './exportDataListCsv';
import { COMMON_TOASTS } from './notify';

// Copy / Excel / PDF for a table's rows: every row passed in (e.g. all filtered rows,
// not just the grid page on show), with S.No added.
// columns: [{ key, label, value: (row) => text }]
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

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

  if (type === 'excel') {
    exportDataListToCsv({
      columnLabels: Object.fromEntries(columns.map((c) => [c.key, c.label])),
      visibleCols: Object.fromEntries(columns.map((c) => [c.key, true])),
      rowData: values.map((v) => Object.fromEntries(columns.map((c, i) => [c.key, v[i]]))),
      fileName,
    });
    notify(COMMON_TOASTS.excelExported(`${fileName}.csv`));
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    notify(COMMON_TOASTS.popupBlocked());
    return;
  }
  notify(COMMON_TOASTS.pdfPreparing());
  const th = (label) => `<th style="border:1px solid #0f417a; padding:8px 10px; text-align:left; background:#0f417a; color:#fff; font-size:11px;">${escapeHtml(label)}</th>`;
  const td = (v) => `<td style="border:1px solid #e2e8f0; padding:6px 10px; font-size:11px; color:#334155;">${escapeHtml(v)}</td>`;
  const body = values.map((v, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}">${td(i + 1)}${v.map(td).join('')}</tr>`).join('');
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 24px; }
          h1 { font-size: 18px; margin-bottom: 4px; color: #0f417a; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p style="font-size:11px; color:#64748b; margin:0 0 20px;">Generated on: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead><tr>${th('S.No')}${columns.map((c) => th(c.label)).join('')}</tr></thead>
          <tbody>${body}</tbody>
        </table>
        <script>window.onload = function () { window.print(); window.close(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
