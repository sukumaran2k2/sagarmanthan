import { useState, useEffect, useRef } from 'react';
import { MoreVertical, FileSpreadsheet, Printer } from 'lucide-react';

// Kebab export menu for tables (CSV / print), as on the other dashboards.
export default function TableExportMenu({ headers, rows, fileName, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const handleExcel = () => {
    setIsOpen(false);
    const csv = '﻿' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const handlePrint = () => {
    setIsOpen(false);
    const w = window.open('', '_blank');
    if (!w) return;
    const head = headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:8px 10px;background:#4f46e5;color:#fff;font-size:11px;text-transform:uppercase;">${escapeHtml(h)}</th>`).join('');
    const body = rows.map((r, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}">${r.map((v) => `<td style="border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;">${escapeHtml(v)}</td>`).join('')}</tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:-apple-system,sans-serif;color:#1e293b;padding:24px}h1{font-size:16px;color:#6366f1;font-weight:800;text-transform:uppercase}table{width:100%;border-collapse:collapse}</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><script>window.onload=function(){setTimeout(function(){window.print();},300);}</script></body></html>`);
    w.document.close();
  };
  return (
    <div className="relative inline-block" ref={menuRef}>
      <button type="button" onClick={() => setIsOpen((v) => !v)} title="Export options" className="flex items-center justify-center w-8 h-8 rounded-lg text-white/90 hover:bg-white/10 transition cursor-pointer">
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <button type="button" onClick={handleExcel} className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer text-left">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /><span>CSV (Excel)</span>
          </button>
          <button type="button" onClick={handlePrint} className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer text-left border-t border-slate-100 dark:border-slate-800">
            <Printer className="h-4 w-4 text-rose-600" /><span>Print / PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
