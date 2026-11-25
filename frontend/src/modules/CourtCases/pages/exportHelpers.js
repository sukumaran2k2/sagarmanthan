import * as XLSX from "xlsx";

// stop spreadsheet formula injection
export const safeCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return ["=", "+", "-", "@"].some((t) => s.trim().startsWith(t)) ? `'${s}` : s;
};

export const stamp = () => new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");

// headers: string[]   rows: any[][]
export function exportExcel({ headers, rows, fileName, sheetName = "Sheet1" }) {
  const data = rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, safeCell(r[i])])));
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  ws["!cols"] = headers.map((h, i) => ({
    wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${fileName} ${stamp()}.xlsx`);
}

export async function exportPdf({ title, headers, rows, fileName }) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 40, 56);
  autoTable(doc, {
    startY: 70,
    head: [headers],
    body: rows.map((r) => r.map((v) => String(v ?? ""))),
    styles: { fontSize: 8, cellPadding: 4, halign: "center" },
    headStyles: { fillColor: [40, 64, 143], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });
  doc.save(`${fileName} ${stamp()}.pdf`);
}