import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as am5exporting from '@amcharts/amcharts5/plugins/exporting';

// Renders a proper PDF containing just the report's chart(s) and table --
// not the whole page (nav, sidebar, etc.), which is what window.print()
// was doing everywhere before. Chart images come from amCharts5's own
// Exporting plugin (same mechanism ChartExportMenu already uses for
// PNG/JPG), since that renders fonts/gradients correctly, unlike a generic
// html2canvas screenshot of an SVG chart.
//
// Usage:
//   await exportReportToPdf({
//     title: 'Form No. K-4.1 - Abstract - CSL Vessels Built',
//     chartRoots: [chartRoot],              // one or more amCharts5 Root instances, in display order
//     columnDefs: [{ headerName, field }],  // ag-Grid style column defs
//     rowData: [{...}],                     // row objects keyed by field
//     fileName: 'csl_vessels_built_report', // without extension
//   });
export async function exportReportToPdf({
  title,
  chartRoots = [],
  columnDefs = [],
  rowData = [],
  fileName = 'report',
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 32;
  let cursorY = margin;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Report', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const asOnDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`As on date: ${asOnDate}`, pageWidth / 2, cursorY + 12, { align: 'center' });
  doc.setTextColor(0);
  cursorY += 30;

  // Chart(s) -- one image per chart root, stacked vertically, scaled to
  // fit the page width while preserving aspect ratio.
  for (const root of chartRoots) {
    if (!root) continue;
    try {
      const exporting = am5exporting.Exporting.new(root, { pngOptions: { quality: 1 } });
      const canvas = await exporting.getCanvas({ quality: 1 });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;

      // Start a new page if the chart won't fit on the current one
      const pageHeight = doc.internal.pageSize.getHeight();
      if (cursorY + imgHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }

      doc.addImage(imgData, 'PNG', margin, cursorY, imgWidth, imgHeight);
      cursorY += imgHeight + 20;
    } catch (err) {
      console.error('Error rendering chart for PDF export:', err);
    }
  }

  // Table
  if (columnDefs.length && rowData.length) {
    const head = [columnDefs.map((c) => c.headerName || c.field)];
    const body = rowData.map((row) => columnDefs.map((c) => {
      const val = row[c.field];
      return val === null || val === undefined ? '' : String(val);
    }));

    autoTable(doc, {
      head,
      body,
      startY: cursorY,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 5, halign: 'center' },
      headStyles: { fillColor: [75, 36, 36], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 246] },
    });
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  doc.save(`${fileName}_${stamp}.pdf`);
}

// Same idea as exportReportToPdf, but for a Data List (no chart, no report
// title) -- takes the same COLUMN_LABELS + visibleCols shape every DataList
// toolbar already uses for Copy, so no reshaping is needed at the call
// site. Respects column visibility and skips the Actions column
// automatically, since that column is never a key in COLUMN_LABELS.
//
// Usage:
//   exportDataListToPdf({
//     title: 'CSL Vessels Built',
//     columnLabels: COLUMN_LABELS,   // { field: 'Display Name' }
//     visibleCols,                   // { field: true/false }
//     rowData: filteredData,
//     fileName: 'csl_vessels_built',
//   });
export function exportDataListToPdf({
  title,
  columnLabels = {},
  visibleCols = {},
  rowData = [],
  fileName = 'data_list',
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 32;
  let cursorY = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Data List', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const asOnDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`As on date: ${asOnDate}`, pageWidth / 2, cursorY + 12, { align: 'center' });
  doc.setTextColor(0);
  cursorY += 30;

  const fields = Object.keys(columnLabels).filter((f) => visibleCols[f]);
  const head = [['S.No', ...fields.map((f) => columnLabels[f])]];
  const body = rowData.map((row, i) => [
    String(i + 1),
    ...fields.map((f) => {
      const val = row[f];
      return val === null || val === undefined ? '' : String(val);
    }),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: cursorY,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 5, halign: 'center' },
    headStyles: { fillColor: [15, 65, 122], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 246] },
  });

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  doc.save(`${fileName}_${stamp}.pdf`);
}

