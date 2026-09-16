import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Download, Copy, Check } from 'lucide-react';
import * as am5exporting from '@amcharts/amcharts5/plugins/exporting';

// Small three-dot menu that sits in the corner of a chart, offering PNG/JPG
// download and copy-to-clipboard. Built on amCharts5's own Exporting plugin
// rather than a manual canvas/html2canvas approach, since the chart's root
// already knows how to rasterize itself correctly (fonts, gradients, etc.)
// amCharts5's exporting plugin does not support SVG output, only PNG/JPG --
// confirmed against its type definitions -- so this menu is PNG/JPG/Copy only.
export default function ChartExportMenu({ chartRoot, fileName = 'chart', color = '#0f417a' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);
  const exportingRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getExporting = () => {
    if (!chartRoot) return null;
    if (!exportingRef.current) {
      exportingRef.current = am5exporting.Exporting.new(chartRoot, {
        pngOptions: { quality: 1 },
        jpgOptions: { quality: 0.92 },
      });
    }
    return exportingRef.current;
  };

  const handleDownload = async (format) => {
    const exporting = getExporting();
    if (!exporting) return;
    try {
      await exporting.download(format, { filePrefix: fileName });
    } catch (err) {
      console.error(`Error exporting chart as ${format}:`, err);
    }
    setIsOpen(false);
  };

  const handleCopy = async () => {
    const exporting = getExporting();
    if (!exporting) return;
    try {
      const canvas = await exporting.getCanvas({ quality: 1 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch (err) {
          console.error('Error copying chart image to clipboard:', err);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error rendering chart for copy:', err);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        title="Chart options"
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <button
            type="button"
            onClick={() => handleDownload('png')}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-transparent text-left"
          >
            <Download className="h-4 w-4" style={{ color }} />
            <span>Download as PNG</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload('jpg')}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-transparent text-left"
          >
            <Download className="h-4 w-4" style={{ color }} />
            <span>Download as JPG</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border-none bg-transparent text-left border-t border-slate-100 dark:border-slate-800"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" style={{ color }} />}
            <span>{copied ? 'Copied!' : 'Copy image to clipboard'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
