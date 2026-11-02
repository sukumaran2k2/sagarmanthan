import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Excel and PDF files for a report grid, laid out like the earlier portal's dashboard exports:
 * title, period line and export date above the table; grouped column headers merged across
 * their columns; total rows (pinned) after the body. The PDF also keeps the grid's cell colours
 * (e.g. the green / red YoY cells), read from each column's cellStyle.
 *
 * columns: ag-Grid column defs (children for groups); hidden leaves (hide: true) are left out.
 * Cell text comes from the column's valueFormatter, so the file shows what the grid shows.
 */

const isGroup = (col) => Array.isArray(col.children) && col.children.length > 0;

function visibleTree(columns) {
  return (columns || [])
    .map((col) => (isGroup(col) ? { ...col, children: visibleTree(col.children) } : col))
    .filter((col) => (isGroup(col) ? col.children.length > 0 : !col.hide && (col.field || col.headerName)));
}

const leaves = (tree) => tree.flatMap((col) => (isGroup(col) ? leaves(col.children) : [col]));
const depthOf = (col) => (isGroup(col) ? 1 + Math.max(...col.children.map(depthOf)) : 1);
const widthOf = (col) => (isGroup(col) ? col.children.reduce((sum, c) => sum + widthOf(c), 0) : 1);
const headerText = (col) => String(col.headerName ?? col.field ?? '');

/** Header grid: one row per group level; each cell knows its column span and row span. */
function headerRows(tree) {
  const depth = Math.max(1, ...tree.map(depthOf));
  const rows = Array.from({ length: depth }, () => []);
  let column = 0;
  const walk = (col, level) => {
    if (isGroup(col)) {
      rows[level].push({ text: headerText(col), col: column, colSpan: widthOf(col), rowSpan: 1 });
      col.children.forEach((child) => walk(child, level + 1));
    } else {
      rows[level].push({ text: headerText(col), col: column, colSpan: 1, rowSpan: depth - level });
      column += 1;
    }
  };
  tree.forEach((col) => walk(col, 0));
  return { rows, depth };
}

function cellText(col, row) {
  const value = col.valueGetter ? safe(() => col.valueGetter({ data: row })) : row?.[col.field];
  const formatted = typeof col.valueFormatter === 'function'
    ? safe(() => col.valueFormatter({ value, data: row }), value)
    : value;
  return formatted === null || formatted === undefined || typeof formatted === 'object' ? '' : formatted;
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** Numbers stay numbers in Excel ("1,234.50" → 1234.5); "12.5 %" and text stay text. */
function excelValue(text) {
  if (typeof text === 'number') return text;
  const plain = String(text).replace(/,/g, '').trim();
  return plain !== '' && /^-?\d+(\.\d+)?$/.test(plain) ? Number(plain) : text;
}

const stamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
};

const cleanName = (name) => String(name || 'Report').replace(/[:/\\?%*|"<>]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_');

const exportedOn = () => `Exported on ${new Date().toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})}`;

/** Writes an .xlsx file and returns its name. */
export function exportGridToExcel({ title, subtitle, columns, rows = [], pinnedRows = [], fileName, sheetName = 'Report' }) {
  const tree = visibleTree(columns);
  const cols = leaves(tree);
  const { rows: header } = headerRows(tree);
  const width = Math.max(1, cols.length);

  const aoa = [[title || 'Report'], ...(subtitle ? [[subtitle]] : []), [exportedOn()], []];
  const headerStart = aoa.length;
  const merges = aoa.slice(0, headerStart - 1).map((_, r) => ({ s: { r, c: 0 }, e: { r, c: width - 1 } }));

  header.forEach((cells, level) => {
    const line = new Array(width).fill('');
    cells.forEach((cell) => {
      line[cell.col] = cell.text;
      if (cell.colSpan > 1 || cell.rowSpan > 1) {
        merges.push({
          s: { r: headerStart + level, c: cell.col },
          e: { r: headerStart + level + cell.rowSpan - 1, c: cell.col + cell.colSpan - 1 },
        });
      }
    });
    aoa.push(line);
  });
  [...rows, ...pinnedRows].forEach((row) => aoa.push(cols.map((col) => excelValue(cellText(col, row)))));

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!merges'] = merges;
  sheet['!cols'] = cols.map((col) => ({ wch: Math.min(45, Math.max(10, headerText(col).length + 2)) }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, String(sheetName).replace(/[[\]:*?/\\]/g, '').slice(0, 31) || 'Report');
  const name = `${cleanName(fileName || title)}_${stamp()}.xlsx`;
  XLSX.writeFile(book, name);
  return name;
}

const hexToRgb = (hex) => {
  const match = String(hex || '').trim().match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return match ? [1, 2, 3].map((i) => parseInt(match[i], 16)) : null;
};

/** Downloads a landscape A4 PDF and returns its name. brand: header colour as "#rrggbb". */
export function exportGridToPdf({ title, subtitle, columns, rows = [], pinnedRows = [], fileName, brand = '#0f417a' }) {
  const tree = visibleTree(columns);
  const cols = leaves(tree);
  const { rows: header } = headerRows(tree);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 28;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(String(title || 'Report'), pageWidth / 2, y, { align: 'center', maxWidth: pageWidth - margin * 2 });
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (subtitle) {
    doc.text(String(subtitle), pageWidth / 2, y, { align: 'center', maxWidth: pageWidth - margin * 2 });
    y += 14;
  }
  doc.setTextColor(110);
  doc.setFontSize(8);
  doc.text(exportedOn(), pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 12;

  const head = header.map((cells) => cells.map((cell) => ({
    content: cell.text, colSpan: cell.colSpan, rowSpan: cell.rowSpan,
  })));
  const all = [...rows, ...pinnedRows];
  const body = all.map((row) => cols.map((col) => String(cellText(col, row))));

  autoTable(doc, {
    head,
    body,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: cols.length > 12 ? 6 : 8, cellPadding: 3, halign: 'center', valign: 'middle', lineWidth: 0.5, lineColor: [210, 214, 220] },
    headStyles: { fillColor: hexToRgb(brand) || [15, 65, 122], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 246] },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = all[data.row.index];
      if (data.row.index >= rows.length) data.cell.styles.fontStyle = 'bold';
      const col = cols[data.column.index];
      if (typeof col?.cellStyle !== 'function') return;
      const style = safe(() => col.cellStyle({ value: row?.[col.field], data: row }), null);
      const fill = hexToRgb(style?.backgroundColor);
      if (fill) data.cell.styles.fillColor = fill;
    },
  });

  const name = `${cleanName(fileName || title)}_${stamp()}.pdf`;
  doc.save(name);
  return name;
}
