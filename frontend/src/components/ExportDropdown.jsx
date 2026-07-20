import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';

export default function ExportDropdown({
  onExportExcel,
  onExportPdf,
  color = '#4b2424',
  hoverColor = '#6b3535',
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
        className="flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-xs font-bold cursor-pointer shadow-sm"
      >
        <span>Export</span>
        <span className="text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-25 overflow-hidden animate-fade-in">
          <button
            type="button"
            onClick={() => {
              if (onExportExcel) onExportExcel();
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-4.5 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer border-none bg-none text-left"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>CSV (Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onExportPdf) onExportPdf();
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-4.5 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer border-none bg-none text-left"
          >
            <Download className="h-4 w-4 text-rose-600" />
            <span>Print / PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
