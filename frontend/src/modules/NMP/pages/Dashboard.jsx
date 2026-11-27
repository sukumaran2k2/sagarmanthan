import { useMemo, useState, useRef, useEffect } from 'react';
import { Landmark, TrendingUp, Target, FileSignature, Check, ChevronDown, AlertTriangle, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

/* ----------------------------------------------------------------------------
 * Static demo data - mirrors the reference dashboard exactly, including the
 * published totals (rounded from the underlying decimals, so they are stored
 * rather than re-derived from the visible row values).
 * -------------------------------------------------------------------------- */

const STAGES = [
  { key: 'signed', label: 'Agreement signed / leased', color: '#17386b' },
  { key: 'nit', label: 'NIT issued / in process', color: '#2f7fd1' },
  { key: 'identified', label: 'Identified only', color: '#a9cef5' },
];

const CURRENT_FY = 'FY26-27';

const YEAR_ROWS = [
  { year: 'FY25-26', signed: 1672, nit: 3, identified: null, tmv: 1675, pSigned: 49, pNit: 1, pIdentified: null, pTotal: 50 },
  { year: 'FY26-27', signed: 10586, nit: 17905, identified: 15132, tmv: 43624, pSigned: 3, pNit: 28, pIdentified: 12, pTotal: 43 },
  { year: 'FY27-28', signed: null, nit: 1048, identified: 25218, tmv: 26266, pSigned: null, pNit: 2, pIdentified: 35, pTotal: 37 },
  { year: 'FY28-29', signed: null, nit: 1862, identified: 20068, tmv: 21930, pSigned: null, pNit: 1, pIdentified: 20, pTotal: 21 },
  { year: 'FY29-30', signed: null, nit: 1862, identified: 15047, tmv: 16909, pSigned: null, pNit: 1, pIdentified: 19, pTotal: 20 },
];

const YEAR_TOTAL = { signed: 12258, nit: 22680, identified: 75465, tmv: 110404, pSigned: 52, pNit: 33, pIdentified: 86, pTotal: 171 };

const PORT_ROWS = [
  { port: 'Deendayal', signed: 392, nit: 1853, identified: 57682, total: 59927 },
  { port: 'Mumbai', signed: 29, nit: 10065, identified: null, total: 10094 },
  { port: 'JNPA', signed: null, nit: null, identified: null, total: null },
  { port: 'Mormugao', signed: null, nit: null, identified: null, total: null },
  { port: 'New Mangalore', signed: 485, nit: 175, identified: 125, total: 785 },
  { port: 'Cochin', signed: 770, nit: 406, identified: 5408, total: 6584 },
  { port: 'V.O. Chidambaranar', signed: 10323, nit: 10067, identified: 10831, total: 31221 },
  { port: 'Chennai', signed: null, nit: null, identified: 536, total: 536 },
  { port: 'Kamarajar', signed: 3, nit: null, identified: null, total: 3 },
  { port: 'Visakhapatnam', signed: 256, nit: 115, identified: 883, total: 1254 },
  { port: 'Paradip', signed: null, nit: null, identified: null, total: null },
  { port: 'SMP Kolkata', signed: null, nit: null, identified: null, total: null },
];

const PORT_TOTAL = { signed: 12258, nit: 22681, identified: 75465, total: 110404 };

const STAT_CARDS = [
  {
    key: 'past',
    label: 'Past monetised land, active leases',
    value: YEAR_TOTAL.signed,
    sub: YEAR_TOTAL.pSigned + ' parcels',
    icon: Landmark,
    gradient: 'from-[#12325f] to-[#2b6ba8]',
  },
  {
    key: 'pipeline',
    label: 'NMP pipeline, FY25-26 to FY29-30',
    value: YEAR_TOTAL.tmv,
    sub: YEAR_TOTAL.pTotal + ' parcels',
    icon: TrendingUp,
    gradient: 'from-[#0d7f99] to-[#3fc9d4]',
  },
  {
    key: 'target',
    label: 'FY26-27 target (current year)',
    value: 43624,
    sub: '43 parcels',
    icon: Target,
    gradient: 'from-[#e2912b] to-[#f5c45e]',
  },
  {
    key: 'nit',
    label: 'NITs issued (pipeline tenders)',
    value: YEAR_TOTAL.nit,
    sub: YEAR_TOTAL.pNit + ' parcels',
    icon: FileSignature,
    gradient: 'from-[#6b32c2] to-[#a06ae8]',
  },
];

const ORGANISATIONS = ['Deendayal', 'Mumbai', 'JNPA', 'Mormugao', 'New Mangalore', 'Cochin', 'V.O. Chidambaranar', 'Chennai', 'Kamarajar', 'Visakhapatnam', 'Paradip', 'SMP Kolkata'];
const TARGET_YEARS = ['FY 2025-2026', 'FY 2026-2027', 'FY 2027-2028', 'FY 2028-2029', 'FY 2029-2030'];
const CATEGORIES = ['Agreement signed / leased', 'NIT issued / in process', 'Identified only'];
const NIT_OPTIONS = ['NIT issued', 'NIT not issued'];

/* -- helpers -------------------------------------------------------------- */

const DASH = '–';
const RUPEE = '₹';
const HEADER_BG = 'linear-gradient(90deg,#0f417a 0%,#1a73e8 100%)';

const fmt = (v) => (v == null ? DASH : Number(v).toLocaleString('en-IN'));
const axisFmt = (v) => Number(v).toLocaleString('en-IN');

const thNum = 'px-3 py-3 text-right text-[11px] font-bold text-white leading-snug';
const thText = 'px-4 py-3 text-left text-[11px] font-bold text-white leading-snug whitespace-nowrap';
const tdNum = 'px-3 py-2.5 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300';
const tdNumStrong = 'px-3 py-2.5 text-right text-xs tabular-nums font-bold text-slate-800 dark:text-slate-100';
const tdText = 'px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap';
const ftNum = 'px-3 py-3 text-right text-xs tabular-nums font-extrabold text-slate-800 dark:text-slate-100';
const ftText = 'px-4 py-3 text-left text-xs font-extrabold text-slate-800 dark:text-slate-100';
const rowCls = 'bg-white dark:bg-slate-900 even:bg-slate-50/70 dark:even:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-slate-800/70 transition-colors';
const ftRowCls = 'bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600';

function FilterSelect({ label, value, onChange, placeholder, options }) {
  const filled = !!value;
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none pl-3 pr-14 h-9 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border shadow-xs outline-none transition focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 cursor-pointer ${filled ? 'border-emerald-400 dark:border-emerald-600' : 'border-slate-200 dark:border-slate-700'}`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {filled && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white">
              <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div className="text-center">
      <h2 className="text-base sm:text-lg font-extrabold text-[#17306b] dark:text-slate-100 tracking-tight">{children}</h2>
      <div className="mx-auto mt-1.5 h-[3px] w-12 rounded-full bg-gradient-to-r from-[#0f417a] to-[#1a73e8]" />
      {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

function Panel({ children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function ChartCard({ title, children, fileName = 'chart', legend = [], notify }) {
  const bodyRef = useRef(null);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#0f417a] to-[#1a73e8] flex-shrink-0" />
          <h3 className="text-xs font-extrabold text-[#17306b] dark:text-slate-100 uppercase tracking-wide truncate">{title}</h3>
        </div>
        <ExportMenu
          options={[
            { label: 'Chart as JPG', onClick: () => runExport(() => exportChartAsJpg(bodyRef.current, fileName, title, legend), notify, 'Chart downloaded as JPG.') },
            { label: 'Chart as PDF', onClick: () => runExport(() => exportChartAsPdf(bodyRef.current, fileName, title, legend), notify, 'Chart downloaded as PDF.') },
          ]}
        />
      </div>
      <div ref={bodyRef} className="h-[330px] text-slate-500 dark:text-slate-400">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  fontSize: 11,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 24px rgba(15,65,122,0.12)',
  padding: '8px 10px',
};

const legendStyle = { fontSize: 11, paddingTop: 8 };

// ── Export helpers ───────────────────────────────────────────────────────────

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

const isDarkMode = () => document.documentElement.classList.contains('dark');

const downloadDataUrl = (dataUrl, filename) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// NOTE: we deliberately do NOT use html2canvas here. This app is on Tailwind v4,
// whose palette compiles to oklch() colors, and html2canvas@1.4.1 throws on
// oklch(). So images are built directly: tables are drawn from their data, and
// charts are rasterised from their own self-contained SVG.

// Scale a canvas onto an A4 jsPDF page (title on top), preserving aspect ratio.
async function canvasToPdf(canvas, fileName, title) {
  const { default: jsPDF } = await import('jspdf');
  const landscape = canvas.width >= canvas.height;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;
  let y = margin;
  if (title) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title.replace(/₹/g, 'Rs.'), pageW / 2, y + 4, { align: 'center' });
    y += 22;
  }
  const maxW = pageW - margin * 2;
  const maxH = pageH - y - margin;
  let w = maxW;
  let h = (canvas.height / canvas.width) * w;
  if (h > maxH) { h = maxH; w = (canvas.width / canvas.height) * h; }
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - w) / 2, y, w, h);
  doc.save(`${fileName}_${stamp()}.pdf`);
}

// Draw a data table onto a canvas: brand header band, alternating rows, grid.
function tableDataToCanvas(headers, rows, { scale = 2, maxColW = 240 } = {}) {
  const dark = isDarkMode();
  const pad = 10, rowH = 30, headH = 36;
  const bodyFont = '13px Arial, sans-serif';
  const headFont = 'bold 12px Arial, sans-serif';

  const meas = document.createElement('canvas').getContext('2d');
  const colW = headers.map((h, c) => {
    meas.font = headFont;
    let w = meas.measureText(String(h ?? '')).width;
    meas.font = bodyFont;
    for (const r of rows) w = Math.max(w, meas.measureText(String(r[c] ?? '')).width);
    return Math.min(Math.ceil(w) + pad * 2, maxColW);
  });
  const tableW = colW.reduce((a, b) => a + b, 0);
  const tableH = headH + rows.length * rowH;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(tableW * scale));
  canvas.height = Math.max(1, Math.round(tableH * scale));
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = dark ? '#0f172a' : '#ffffff';
  ctx.fillRect(0, 0, tableW, tableH);

  // header band
  ctx.fillStyle = '#0f417a';
  ctx.fillRect(0, 0, tableW, headH);
  ctx.fillStyle = '#ffffff';
  ctx.font = headFont;
  let x = 0;
  headers.forEach((h, c) => {
    ctx.textAlign = c === 0 ? 'left' : 'center';
    const tx = c === 0 ? x + pad : x + colW[c] / 2;
    ctx.fillText(String(h ?? ''), tx, headH / 2, colW[c] - pad);
    x += colW[c];
  });

  // body rows
  ctx.font = bodyFont;
  let y = headH;
  rows.forEach((r, ri) => {
    ctx.fillStyle = ri % 2 ? (dark ? '#1e293b' : '#f5f7fa') : (dark ? '#0f172a' : '#ffffff');
    ctx.fillRect(0, y, tableW, rowH);
    x = 0;
    r.forEach((cell, c) => {
      ctx.fillStyle = dark ? '#cbd5e1' : '#334155';
      ctx.textAlign = c === 0 ? 'left' : 'center';
      const tx = c === 0 ? x + pad : x + colW[c] / 2;
      ctx.fillText(String(cell ?? ''), tx, y + rowH / 2, colW[c] - pad);
      x += colW[c];
    });
    y += rowH;
  });

  // grid lines
  ctx.strokeStyle = dark ? '#334155' : '#e2e8f0';
  ctx.lineWidth = 1;
  x = 0;
  colW.forEach((w) => { x += w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, tableH); ctx.stroke(); });
  for (let i = 0, yy = headH; i <= rows.length; i++, yy += rowH) {
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(tableW, yy); ctx.stroke();
  }
  return canvas;
}

// Rasterise a Recharts SVG (self-contained) to a canvas, with title + legend.
async function chartSvgToCanvas(container, { title, legend = [], scale = 2 } = {}) {
  const svg = container?.querySelector('svg');
  if (!svg) throw new Error('Chart is not ready yet.');
  const rect = svg.getBoundingClientRect();
  const w = Math.ceil(rect.width) || 600;
  const h = Math.ceil(rect.height) || 330;

  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.setAttribute('color', isDarkMode() ? '#cbd5e1' : '#334155'); // resolves currentColor
  clone.style.fontFamily = 'Arial, sans-serif';

  const xml = new XMLSerializer().serializeToString(clone);
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('Could not render the chart image.'));
    img.src = src;
  });

  const dark = isDarkMode();
  const titleH = title ? 34 : 0;
  const legendH = legend.length ? 30 : 0;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = (h + titleH + legendH) * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = dark ? '#0f172a' : '#ffffff';
  ctx.fillRect(0, 0, w, h + titleH + legendH);
  ctx.textBaseline = 'middle';

  let y = 0;
  if (title) {
    ctx.fillStyle = dark ? '#e2e8f0' : '#17306b';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, titleH / 2);
    y = titleH;
  }
  ctx.drawImage(img, 0, y, w, h);

  if (legend.length) {
    const ly = y + h + legendH / 2;
    ctx.font = '12px Arial, sans-serif';
    const items = legend.map((it) => ({ ...it, tw: ctx.measureText(it.label).width + 22 }));
    const total = items.reduce((a, it) => a + it.tw + 12, -12);
    let lx = Math.max(8, (w - total) / 2);
    for (const it of items) {
      ctx.fillStyle = it.color;
      ctx.beginPath(); ctx.arc(lx + 5, ly, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark ? '#cbd5e1' : '#334155';
      ctx.textAlign = 'left';
      ctx.fillText(it.label, lx + 16, ly);
      lx += it.tw + 12;
    }
  }
  return canvas;
}

function exportTableAsJpg(headers, rows, fileName) {
  const canvas = tableDataToCanvas(headers, rows);
  downloadDataUrl(canvas.toDataURL('image/jpeg', 0.95), `${fileName}_${stamp()}.jpg`);
}

async function exportChartAsJpg(container, fileName, title, legend) {
  const canvas = await chartSvgToCanvas(container, { title, legend });
  downloadDataUrl(canvas.toDataURL('image/jpeg', 0.95), `${fileName}_${stamp()}.jpg`);
}

async function exportChartAsPdf(container, fileName, title, legend) {
  const canvas = await chartSvgToCanvas(container, { title, legend });
  await canvasToPdf(canvas, fileName, title);
}

async function exportTableAsExcel(headers, rows, fileName, sheetName) {
  const mod = await import('xlsx');
  const XLSX = mod.utils ? mod : mod.default;
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${fileName}_${stamp()}.xlsx`);
}

async function exportTableAsPdf(headers, rows, fileName, title) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title.replace(/₹/g, 'Rs.'), pageW / 2, 30, { align: 'center' });
  autoTable(doc, {
    head: [headers.map((h) => String(h).replace(/₹/g, 'Rs.'))],
    body: rows,
    startY: 44,
    styles: { fontSize: 8, cellPadding: 4, halign: 'center', valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: [15, 65, 122], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { halign: 'left' } },
    margin: { left: 24, right: 24 },
  });
  doc.save(`${fileName}_${stamp()}.pdf`);
}

// Runs an export, then toasts success or failure (when a notifier is available).
const runExport = async (fn, notify, okMsg) => {
  try {
    await fn();
    notify?.(okMsg, 'success');
  } catch (err) {
    console.error('NMP dashboard export failed:', err);
    notify?.('Export failed. Please try again.', 'error');
  }
};

// ── Table export data (headers + rows, incl. the Total row) ───────────────────

const YEAR_EXPORT_HEADERS = [
  'Target year', 'Agreement signed / leased (₹ cr)', 'NIT issued / in process (₹ cr)',
  'Identified only (₹ cr)', 'Total TMV (₹ cr)', 'Parcels: signed / leased',
  'Parcels: NIT / in process', 'Parcels: identified only', 'Parcels: total',
];
const yearRaw = [
  ...YEAR_ROWS.map((r) => [r.year, r.signed, r.nit, r.identified, r.tmv, r.pSigned, r.pNit, r.pIdentified, r.pTotal]),
  ['Total', YEAR_TOTAL.signed, YEAR_TOTAL.nit, YEAR_TOTAL.identified, YEAR_TOTAL.tmv, YEAR_TOTAL.pSigned, YEAR_TOTAL.pNit, YEAR_TOTAL.pIdentified, YEAR_TOTAL.pTotal],
];
const YEAR_EXCEL_ROWS = yearRaw.map((row) => row.map((v) => (v == null ? '' : v)));
const YEAR_PDF_ROWS = yearRaw.map((row) => row.map((v, i) => (i === 0 ? v : fmt(v))));

const PORT_EXPORT_HEADERS = [
  'Port', 'Agreement signed / leased (₹ cr)', 'NIT issued / in process (₹ cr)', 'Identified only (₹ cr)', 'Total (₹ cr)',
];
const portRaw = [
  ...PORT_ROWS.map((r) => [r.port, r.signed, r.nit, r.identified, r.total]),
  ['Total', PORT_TOTAL.signed, PORT_TOTAL.nit, PORT_TOTAL.identified, PORT_TOTAL.total],
];
const PORT_EXCEL_ROWS = portRaw.map((row) => row.map((v) => (v == null ? '' : v)));
const PORT_PDF_ROWS = portRaw.map((row) => row.map((v, i) => (i === 0 ? v : fmt(v))));

// ── Export dropdown ──────────────────────────────────────────────────────────

function ExportMenu({ options, label = 'Export' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#0f417a] dark:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" /> {label} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 z-40 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => { setOpen(false); o.onClick(); }}
              className="flex items-center gap-2 w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-none bg-transparent"
            >
              <Download className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 flex-shrink-0" /> {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NmpDashboard({ triggerNotification }) {
  const [organisation, setOrganisation] = useState('');
  const [targetYear, setTargetYear] = useState('FY 2026-2027');
  const [category, setCategory] = useState('');
  const [nit, setNit] = useState('');

  const yearChartData = useMemo(
    () => YEAR_ROWS.map((r) => ({ name: r.year, signed: r.signed || 0, nit: r.nit || 0, identified: r.identified || 0 })),
    [],
  );

  const portChartData = useMemo(
    () => PORT_ROWS.map((r) => ({ name: r.port, signed: r.signed || 0, nit: r.nit || 0, identified: r.identified || 0 })),
    [],
  );

  return (
    <div className="space-y-7 animate-fade-in">

      {/*
        Every figure below comes from the static demo data at the top of this file, not from the
        database. This notice stays until the dashboard is wired to live endpoints.
      */}
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3"
      >
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
            Mock-up dashboard
          </p>
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-0.5">
            The figures shown here are sample data for layout purposes only. Live data will be
            shown soon &mdash; we are working on it.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FilterSelect label="Organisation" value={organisation} onChange={setOrganisation} placeholder="--Organisation--" options={ORGANISATIONS} />
          <FilterSelect label="Target Year" value={targetYear} onChange={setTargetYear} placeholder="--Select year--" options={TARGET_YEARS} />
          <FilterSelect label="Category" value={category} onChange={setCategory} placeholder="--Select category--" options={CATEGORIES} />
          <FilterSelect label="NIT" value={nit} onChange={setNit} placeholder="--Select category--" options={NIT_OPTIONS} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 px-4 py-4`}
            >
              <span className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 ring-1 ring-white/25 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[22px] font-extrabold text-white leading-none tabular-nums">
                    {RUPEE}{fmt(card.value)}
                    <span className="ml-1 text-[11px] font-bold opacity-75">cr</span>
                  </div>
                  <div className="text-[11px] font-semibold text-white/90 mt-1.5 leading-snug">{card.label}</div>
                  <div className="inline-block mt-1.5 px-1.5 py-0.5 rounded-md bg-white/15 text-[10px] font-bold text-white/85">{card.sub}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline by target year */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1" />
          <SectionTitle>NMP Pipeline by Target Year</SectionTitle>
          <div className="flex-1 flex justify-end">
            <ExportMenu
              label="Export table"
              options={[
                { label: 'Table as Excel', onClick: () => runExport(() => exportTableAsExcel(YEAR_EXPORT_HEADERS, YEAR_EXCEL_ROWS, 'NMP_Pipeline_By_Target_Year', 'Pipeline by Year'), triggerNotification, 'Table downloaded as Excel.') },
                { label: 'Table as PDF', onClick: () => runExport(() => exportTableAsPdf(YEAR_EXPORT_HEADERS, YEAR_PDF_ROWS, 'NMP_Pipeline_By_Target_Year', 'NMP Pipeline by Target Year'), triggerNotification, 'Table downloaded as PDF.') },
                { label: 'Table as JPG', onClick: () => runExport(() => exportTableAsJpg(YEAR_EXPORT_HEADERS, YEAR_PDF_ROWS, 'NMP_Pipeline_By_Target_Year'), triggerNotification, 'Table downloaded as JPG.') },
              ]}
            />
          </div>
        </div>
        <Panel>
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr style={{ background: HEADER_BG }}>
                <th className={thText}>Target year</th>
                <th className={thNum}>Agreement signed /<br />leased ({RUPEE} cr)</th>
                <th className={thNum}>NIT issued /<br />in process ({RUPEE} cr)</th>
                <th className={thNum}>Identified only<br />({RUPEE} cr)</th>
                <th className={thNum}>Total TMV<br />({RUPEE} cr)</th>
                <th className={thNum}>Parcels:<br />signed / leased</th>
                <th className={thNum}>Parcels:<br />NIT / in process</th>
                <th className={thNum}>Parcels:<br />identified only</th>
                <th className={thNum}>Parcels:<br />total</th>
              </tr>
            </thead>
            <tbody>
              {YEAR_ROWS.map((row) => (
                <tr key={row.year} className={rowCls}>
                  <td className={tdText}>
                    {row.year}
                    {row.year === CURRENT_FY && (
                      <span className="ml-1.5 align-middle px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        current
                      </span>
                    )}
                  </td>
                  <td className={tdNum}>{fmt(row.signed)}</td>
                  <td className={tdNum}>{fmt(row.nit)}</td>
                  <td className={tdNum}>{fmt(row.identified)}</td>
                  <td className={tdNumStrong}>{fmt(row.tmv)}</td>
                  <td className={tdNum}>{fmt(row.pSigned)}</td>
                  <td className={tdNum}>{fmt(row.pNit)}</td>
                  <td className={tdNum}>{fmt(row.pIdentified)}</td>
                  <td className={tdNumStrong}>{fmt(row.pTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={ftRowCls}>
                <td className={ftText}>Total</td>
                <td className={ftNum}>{fmt(YEAR_TOTAL.signed)}</td>
                <td className={ftNum}>{fmt(YEAR_TOTAL.nit)}</td>
                <td className={ftNum}>{fmt(YEAR_TOTAL.identified)}</td>
                <td className={ftNum}>{fmt(YEAR_TOTAL.tmv)}</td>
                <td className={ftNum}>{fmt(YEAR_TOTAL.pSigned)}</td>
                <td className={ftNum}>{fmt(YEAR_TOTAL.pNit)}</td>
                <td className={ftNum}>{fmt(YEAR_TOTAL.pIdentified)}</td>
                <td className={ftNum}>{fmt(YEAR_TOTAL.pTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </Panel>
      </div>

      {/* Pipeline by port */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1" />
          <SectionTitle sub={`TMV (${RUPEE} crore), FY25-26 to FY29-30, by stage.`}>
            Pipeline value by port (all ports, other filters apply)
          </SectionTitle>
          <div className="flex-1 flex justify-end">
            <ExportMenu
              label="Export table"
              options={[
                { label: 'Table as Excel', onClick: () => runExport(() => exportTableAsExcel(PORT_EXPORT_HEADERS, PORT_EXCEL_ROWS, 'NMP_Pipeline_By_Port', 'Pipeline by Port'), triggerNotification, 'Table downloaded as Excel.') },
                { label: 'Table as PDF', onClick: () => runExport(() => exportTableAsPdf(PORT_EXPORT_HEADERS, PORT_PDF_ROWS, 'NMP_Pipeline_By_Port', 'Pipeline value by Port'), triggerNotification, 'Table downloaded as PDF.') },
                { label: 'Table as JPG', onClick: () => runExport(() => exportTableAsJpg(PORT_EXPORT_HEADERS, PORT_PDF_ROWS, 'NMP_Pipeline_By_Port'), triggerNotification, 'Table downloaded as JPG.') },
              ]}
            />
          </div>
        </div>
        <Panel>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr style={{ background: HEADER_BG }}>
                <th className={thText}>Port</th>
                <th className={thNum}>Agreement signed / leased ({RUPEE} cr)</th>
                <th className={thNum}>NIT issued / in process ({RUPEE} cr)</th>
                <th className={thNum}>Identified only ({RUPEE} cr)</th>
                <th className={thNum}>Total ({RUPEE} cr)</th>
              </tr>
            </thead>
            <tbody>
              {PORT_ROWS.map((row) => (
                <tr key={row.port} className={rowCls}>
                  <td className={`${tdText} text-[#17306b] dark:text-slate-200`}>{row.port}</td>
                  <td className={tdNum}>{fmt(row.signed)}</td>
                  <td className={tdNum}>{fmt(row.nit)}</td>
                  <td className={tdNum}>{fmt(row.identified)}</td>
                  <td className={tdNumStrong}>{fmt(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={ftRowCls}>
                <td className={ftText}>Total</td>
                <td className={ftNum}>{fmt(PORT_TOTAL.signed)}</td>
                <td className={ftNum}>{fmt(PORT_TOTAL.nit)}</td>
                <td className={ftNum}>{fmt(PORT_TOTAL.identified)}</td>
                <td className={ftNum}>{fmt(PORT_TOTAL.total)}</td>
              </tr>
            </tfoot>
          </table>
        </Panel>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={`NMP pipeline TMV by target year (${RUPEE} crore)`} fileName="NMP_TMV_By_Target_Year" legend={STAGES} notify={triggerNotification}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearChartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }} />
              <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} tickFormatter={axisFmt} width={56} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [axisFmt(v), n]} cursor={{ fill: 'currentColor', fillOpacity: 0.05 }} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              {STAGES.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="tmv"
                  fill={s.color}
                  maxBarSize={64}
                  radius={i === STAGES.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Pipeline TMV by port (${RUPEE} crore)`} fileName="NMP_TMV_By_Port" legend={STAGES} notify={triggerNotification}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={portChartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.12} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} tickFormatter={axisFmt} />
              <YAxis type="category" dataKey="name" width={122} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [axisFmt(v), n]} cursor={{ fill: 'currentColor', fillOpacity: 0.05 }} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              {STAGES.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="tmv"
                  fill={s.color}
                  maxBarSize={14}
                  radius={i === STAGES.length - 1 ? [0, 4, 4, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
