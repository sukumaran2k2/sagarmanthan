import { useMemo, useState } from 'react';
import { Landmark, TrendingUp, Target, FileSignature, Check, ChevronDown, AlertTriangle } from 'lucide-react';
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

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#0f417a] to-[#1a73e8]" />
        <h3 className="text-xs font-extrabold text-[#17306b] dark:text-slate-100 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="h-[330px] text-slate-500 dark:text-slate-400">{children}</div>
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

export default function NmpDashboard() {
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
        <SectionTitle>NMP Pipeline by Target Year</SectionTitle>
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
        <SectionTitle sub={`TMV (${RUPEE} crore), FY25-26 to FY29-30, by stage.`}>
          Pipeline value by port (all ports, other filters apply)
        </SectionTitle>
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
        <ChartCard title={`NMP pipeline TMV by target year (${RUPEE} crore)`}>
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

        <ChartCard title={`Pipeline TMV by port (${RUPEE} crore)`}>
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
