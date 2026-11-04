import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';

export default function ExportDropdown({
  onExportExcel,
  onExportPdf,
  headers = [],
  rows = [],
  data = [],
  fileName = 'Report_Export',
  title = 'Report Export',
  triggerNotification,
  color = '#0f417a',
  hoverColor = '#1e3a8a',
  className = '',
  showPdf = true,
  excelLabel = 'Excel (.xlsx)',
  chevron = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEffectiveRows = () => {
    if (data && data.length > 0) return data;
    return typeof rows === 'function' ? rows() : rows;
  };

  // Normalise headers: support both string[] and {label, key}[] formats
  const headerLabels = headers.map(h => (typeof h === 'object' && h !== null ? h.label : h) ?? '');
  const headerKeys   = headers.map(h => (typeof h === 'object' && h !== null ? h.key  : null));
  const hasKeys      = headerKeys.some(k => k !== null);

  const rowValues = (row) => {
    if (Array.isArray(row)) return row;
    if (typeof row !== 'object' || row === null) return [];
    return hasKeys ? headerKeys.map(k => (k != null ? row[k] : '')) : Object.values(row);
  };

  const handleExcel = async () => {
    setIsOpen(false);
    if (typeof onExportExcel === 'function') { onExportExcel(); return; }

    const rowList = getEffectiveRows();
    if (!rowList || rowList.length === 0) {
      triggerNotification?.('No data available to export.', 'warning');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const sheetData = [
        headerLabels,
        ...rowList.map(row => rowValues(row).map(v => String(v ?? '')))
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Auto column width based on max content length (capped at 60)
      const colWidths = headerLabels.map((label, ci) => {
        const maxLen = rowList.reduce((max, row) => {
          const val = String(rowValues(row)[ci] ?? '');
          return Math.max(max, val.length);
        }, label.length);
        return { wch: Math.min(maxLen + 2, 60) };
      });
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${fileName.replace(/\s+/g, '_')}.xlsx`);
      triggerNotification?.('Exported to Excel successfully!', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      triggerNotification?.('Export failed. Please try again.', 'error');
    }
  };

  const handlePdf = async () => {
    setIsOpen(false);
    if (typeof onExportPdf === 'function') { onExportPdf(); return; }

    const rowList = getEffectiveRows();
    if (!rowList || rowList.length === 0) {
      triggerNotification?.('No data available to export.', 'warning');
      return;
    }

    triggerNotification?.('Generating PDF…', 'info');
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });

      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.setFontSize(13);
      doc.setTextColor(15, 65, 122);
      doc.setFont(undefined, 'bold');
      doc.text(title.toUpperCase(), 28, 32);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text(`Ministry of Ports, Shipping and Waterways  |  Generated on: ${dateStr}`, 28, 44);

      autoTable(doc, {
        startY: 54,
        head: [headerLabels],
        body: rowList.map(row => rowValues(row).map(v => String(v ?? ''))),
        styles: {
          fontSize: 6.5,
          cellPadding: 3,
          overflow: 'linebreak',
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [15, 65, 122],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 6.5,
          halign: 'left',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.3,
        margin: { left: 28, right: 28 },
      });

      // Add page numbers after the table is fully rendered
      const totalPages = doc.internal.getNumberOfPages();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${totalPages}`, pageW - 60, pageH - 12);
      }

      doc.save(`${fileName.replace(/\s+/g, '_')}.pdf`);
      triggerNotification?.('PDF exported successfully!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      triggerNotification?.('PDF generation failed. Please try again.', 'error');
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: color, transition: 'background-color 0.15s ease' }}
        onMouseEnter={(e) => { if (hoverColor) e.currentTarget.style.backgroundColor = hoverColor; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = color; }}
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
        title="Export options"
      >
        <span>Export</span>
        {chevron
          ? <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          : <span className="text-[10px]">▼</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <button
            type="button"
            onClick={handleExcel}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-none text-left transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-800 dark:text-white">{excelLabel}</span>
          </button>
          {showPdf && (
            <button
              type="button"
              onClick={handlePdf}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-none text-left transition"
            >
              <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span className="text-slate-800 dark:text-white">Export PDF</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
