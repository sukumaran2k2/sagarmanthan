/**
 * "Data Entry Report" downloads (Excel and PDF), laid out like the old portal's report:
 * title and "As on" date, then each section as its own table with the green / red / grey cells.
 *
 * buildReportSections() turns the GET /home-dashboard payload into plain tables; both file
 * writers use it, so the two files always hold the same thing.
 */
import XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TONE, cellText, cellTone, formatDay } from './dataEntryStatus';
import {
  CARD_STATUS_TEXT,
  ORGANISATION_GROUPS,
  ORGANISATION_ROW_CONFIG,
  WING_ROW_CONFIG,
} from '../config/dashboardModules';

export const REPORT_TITLE = 'Sagarmanthan Data Entry Status';

// The old report's colours
const TONE_COLOURS = {
  [TONE.CURRENT]: { fill: 'A9D08E', text: '24460C' },
  [TONE.OVERDUE]: { fill: 'F4CCCC', text: '981010' },
  [TONE.NEUTRAL]: { fill: 'D9D9D9', text: '000000' },
  [TONE.UNAVAILABLE]: { fill: 'FFF2CC', text: '7F6000' },
};
const HEADER = { fill: '0F417A', text: 'FFFFFF' };
const SECTION = { fill: 'D9EAF7', text: '0B1661' };

const statusCell = (cell, type, asOn, statusText) => ({
  text: cellText(cell, type, statusText),
  tone: cellTone(cell, type, asOn),
});

/** Every table of the report: { title, head: string[], body: Array<Array<string | {text, tone}>> }. */
export function buildReportSections(data) {
  const { asOn, cards, wings, organisations, view } = data;
  const sections = [];

  if (cards?.length) {
    sections.push({
      title: 'I. File Upload Modules',
      head: ['S.No', 'Module Name', 'Last Upload'],
      body: cards.map((c, i) => [String(i + 1), c.label, statusCell(c.cell, 'eofficeWeek', asOn, CARD_STATUS_TEXT)]),
    });
  }

  if (wings?.rows.length) {
    sections.push({
      title: 'II. Data Entry Modules (Wing-wise)',
      head: ['S.No', 'Module Name', ...wings.columns.map((w) => w.name)],
      body: wings.rows.map((row, i) => [
        String(i + 1),
        row.label,
        ...wings.columns.map((w) => statusCell(row.cells[w.id], row.type, asOn, WING_ROW_CONFIG[row.key]?.statusText)),
      ]),
    });
  }

  if (organisations?.rows.length) {
    const orgRows = (columns) =>
      organisations.rows.map((row, i) => [
        String(i + 1),
        row.label,
        ...columns.map((o) => statusCell(row.cells[o.id], row.type, asOn, ORGANISATION_ROW_CONFIG[row.key]?.statusText)),
      ]);

    if (view === 'MINISTRY') {
      const prefix = wings ? 'III' : 'I';
      ORGANISATION_GROUPS.forEach((group) => {
        const columns = organisations.columns.filter((c) => c.group === group.key);
        if (!columns.length) return;
        sections.push({
          title: `${prefix}. Organisation Modules - ${group.label}`,
          head: ['S.No', 'Module Name', ...columns.map((o) => o.shortName)],
          body: orgRows(columns),
        });
      });
    } else {
      const org = organisations.columns[0];
      sections.push({
        title: `Organisation Modules - ${org?.name || ''}`,
        head: ['S.No', 'Module Name', 'Last Update'],
        body: orgRows(organisations.columns),
      });
    }
  }

  return sections;
}

const fileStamp = (asOn) => (asOn || '').replace(/-/g, '');
const asOnText = (asOn) => `As on ${formatDay(asOn)}`;
const LEGEND = [
  { tone: TONE.CURRENT, text: 'Up to date (updated in the current or previous period)' },
  { tone: TONE.OVERDUE, text: 'Update due (older, or nothing entered yet)' },
  { tone: TONE.NEUTRAL, text: 'Not applicable / nothing pending' },
];

// ---------------------------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------------------------

const border = { style: 'thin', color: { rgb: 'BFBFBF' } };
const BORDER = { top: border, bottom: border, left: border, right: border };
const style = ({ fill, text, bold = false, align = 'center', size = 10 }) => ({
  font: { bold, sz: size, color: { rgb: text } },
  fill: fill ? { patternType: 'solid', fgColor: { rgb: fill } } : undefined,
  alignment: { horizontal: align, vertical: 'center', wrapText: true },
  border: BORDER,
});

export function exportDataEntryExcel(data) {
  const sections = buildReportSections(data);
  const width = Math.max(3, ...sections.map((s) => s.head.length));
  const ws = {};
  const merges = [];
  let r = 0;

  const put = (row, col, value, cellStyle) => {
    ws[XLSX.utils.encode_cell({ r: row, c: col })] = { t: 's', v: String(value ?? ''), s: cellStyle };
  };
  const band = (text, colours, size) => {
    put(r, 0, text, style({ ...colours, bold: true, align: 'left', size }));
    for (let c = 1; c < width; c += 1) put(r, c, '', style(colours));
    merges.push({ s: { r, c: 0 }, e: { r, c: width - 1 } });
    r += 1;
  };

  band(`${REPORT_TITLE} (${asOnText(data.asOn)})`, { fill: '0B1661', text: 'FFFFFF' }, 14);
  r += 1;

  sections.forEach((section) => {
    band(section.title, SECTION, 11);
    section.head.forEach((h, c) => put(r, c, h, style({ ...HEADER, bold: true })));
    r += 1;
    section.body.forEach((row) => {
      row.forEach((value, c) => {
        if (typeof value === 'object') {
          put(r, c, value.text, style(TONE_COLOURS[value.tone]));
        } else {
          put(r, c, value, style({ text: '000000', align: c === 1 ? 'left' : 'center', bold: c === 1 }));
        }
      });
      r += 1;
    });
    r += 1;
  });

  put(r, 0, 'Legend', style({ text: '000000', bold: true, align: 'left' }));
  r += 1;
  LEGEND.forEach((item) => {
    put(r, 0, '', style(TONE_COLOURS[item.tone]));
    put(r, 1, item.text, style({ text: '000000', align: 'left' }));
    r += 1;
  });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: width - 1 } });
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 6 }, { wch: 36 }, ...Array.from({ length: width - 2 }, () => ({ wch: 20 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Entry Status');
  XLSX.writeFile(wb, `Data_Entry_Status_${fileStamp(data.asOn)}.xlsx`);
}

// ---------------------------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------------------------

const hexToRgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function exportDataEntryPdf(data) {
  const sections = buildReportSections(data);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(11, 22, 97);
  doc.text(REPORT_TITLE, pageWidth / 2, 36, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(asOnText(data.asOn), pageWidth / 2, 54, { align: 'center' });

  let y = 76;
  sections.forEach((section) => {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 40;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(11, 22, 97);
    doc.text(section.title, margin, y);

    autoTable(doc, {
      startY: y + 8,
      margin: { left: margin, right: margin },
      theme: 'grid',
      rowPageBreak: 'avoid',
      head: [section.head],
      body: section.body.map((row) => row.map((v) => (typeof v === 'object' ? v.text : v))),
      styles: { fontSize: 7.5, cellPadding: 4, halign: 'center', valign: 'middle', lineWidth: 0.4, lineColor: [191, 191, 191] },
      headStyles: { fillColor: hexToRgb(HEADER.fill), textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 150, halign: 'left', fontStyle: 'bold' } },
      didParseCell: (hook) => {
        if (hook.section !== 'body') return;
        const value = section.body[hook.row.index]?.[hook.column.index];
        if (value && typeof value === 'object') {
          const colours = TONE_COLOURS[value.tone];
          hook.cell.styles.fillColor = hexToRgb(colours.fill);
          hook.cell.styles.textColor = hexToRgb(colours.text);
        }
      },
    });
    y = doc.lastAutoTable.finalY + 26;
  });

  // Legend
  if (y > doc.internal.pageSize.getHeight() - 70) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(8);
  LEGEND.forEach((item, i) => {
    const colours = TONE_COLOURS[item.tone];
    doc.setFillColor(...hexToRgb(colours.fill));
    doc.rect(margin, y + i * 14 - 7, 10, 9, 'F');
    doc.setTextColor(40, 40, 40);
    doc.text(item.text, margin + 16, y + i * 14);
  });

  doc.save(`Data_Entry_Status_${fileStamp(data.asOn)}.pdf`);
}
