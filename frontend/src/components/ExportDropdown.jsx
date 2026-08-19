import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';

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
  className = ''
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
    return (data && data.length > 0) ? data : rows;
  };

  const handleExcel = () => {
    setIsOpen(false);
    if (typeof onExportExcel === 'function') {
      onExportExcel();
      return;
    }

    const rowList = getEffectiveRows();
    if (!rowList || rowList.length === 0) {
      triggerNotification?.('No data available to export.');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    if (headers && headers.length > 0) {
      csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';
    }

    rowList.forEach(row => {
      if (Array.isArray(row)) {
        const line = row.map(cell => {
          let str = String(cell ?? '');
          if (str.startsWith('"') && str.endsWith('"')) {
            str = str.slice(1, -1).replace(/""/g, '"');
          }
          return `"${str.replace(/"/g, '""')}"`;
        });
        csvContent += line.join(',') + '\r\n';
      } else if (typeof row === 'object' && row !== null) {
        const line = Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`);
        csvContent += line.join(',') + '\r\n';
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerNotification?.(`Report exported to Excel (CSV) successfully!`);
  };

  const handlePdf = () => {
    setIsOpen(false);
    if (typeof onExportPdf === 'function') {
      onExportPdf();
      return;
    }

    const rowList = getEffectiveRows();
    if (!rowList || rowList.length === 0) {
      triggerNotification?.('No data available to print.');
      return;
    }

    triggerNotification?.('Preparing PDF document...');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let headersHtml = '';
    if (headers && headers.length > 0) {
      headers.forEach(h => {
        headersHtml += `<th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:left;background:#0f417a;color:#fff;font-size:11px;font-weight:bold;text-transform:uppercase;">${h}</th>`;
      });
    }

    let rowsHtml = '';
    rowList.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      rowsHtml += `<tr style="background:${bg};">`;
      if (Array.isArray(row)) {
        row.forEach(cell => {
          let str = String(cell ?? '');
          if (str.startsWith('"') && str.endsWith('"')) {
            str = str.slice(1, -1).replace(/""/g, '"');
          }
          rowsHtml += `<td style="border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;">${str}</td>`;
        });
      } else if (typeof row === 'object' && row !== null) {
        Object.values(row).forEach(v => {
          rowsHtml += `<td style="border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;">${String(v ?? '')}</td>`;
        });
      }
      rowsHtml += '</tr>';
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; padding: 24px; }
          h1 { font-size: 16px; color: #0f417a; margin-bottom: 4px; font-weight: 800; text-transform: uppercase; }
          p { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Ministry of Ports, Shipping and Waterways | Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        <table>
          ${headersHtml ? `<thead><tr>${headersHtml}</tr></thead>` : ''}
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: color,
          transition: 'background-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (hoverColor) e.currentTarget.style.backgroundColor = hoverColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = color;
        }}
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
        title="Export options"
      >
        <span>Export</span>
        <span className="text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <button
            type="button"
            onClick={handleExcel}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-none text-left transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>CSV (Excel)</span>
          </button>
          <button
            type="button"
            onClick={handlePdf}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-none text-left transition"
          >
            <Download className="h-4 w-4 text-rose-600" />
            <span>Print / PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
