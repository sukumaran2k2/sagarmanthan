import React from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';

export default function ExportButtons({ onExportExcel, onExportPdf, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <button
        onClick={onExportExcel}
        type="button"
        className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30"
      >
        <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
        <span>Export to Excel</span>
      </button>
      <button
        onClick={onExportPdf}
        type="button"
        className="inline-flex items-center space-x-2 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100/50 transition cursor-pointer dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30"
      >
        <Download className="h-4 w-4 text-rose-600 dark:text-rose-500" />
        <span>Export to PDF</span>
      </button>
    </div>
  );
}
