import { useState, useEffect, useRef } from 'react';
import { MoreVertical, FileSpreadsheet, Printer } from 'lucide-react';
import { exportRowsToFile } from '../utils/exportGridReport';

// Kebab export menu for dashboard tables: Excel (.xlsx) / PDF files.
export default function TableExportMenu({ headers, rows, fileName, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  // Excel (.xlsx) and PDF straight to a file: no print dialog or new tab
  const download = (type) => {
    setIsOpen(false);
    if (!rows?.length) return;
    exportRowsToFile(type, { title, headers, rows, fileName });
  };
  return (
    <div className="relative inline-block" ref={menuRef}>
      <button type="button" onClick={() => setIsOpen((v) => !v)} title="Export options" className="flex items-center justify-center w-8 h-8 rounded-lg text-white/90 hover:bg-white/10 transition cursor-pointer">
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <button type="button" onClick={() => download('excel')} className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer text-left">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /><span>Excel (.xlsx)</span>
          </button>
          <button type="button" onClick={() => download('pdf')} className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer text-left border-t border-slate-100 dark:border-slate-800">
            <Printer className="h-4 w-4 text-rose-600" /><span>PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
