import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  RefreshCw,
  RotateCcw,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Search,
  X,
} from 'lucide-react';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import { fetchCapexSummaryReport } from '../../api';
import { getCapexReportAsOnMeta, mapCapexSummaryReportRows } from '../../utils/capexUtils';

const BRAND = '#4b2424';
const BRAND_HOVER = '#6b3535';
const BRAND_SOFT = '#8c4242';
const ACCENT = '#f5eeea';
const BORDER = '#e8d5c8';

const FY_OPTIONS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023'];

function fmt(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '0.00';
  return Number(num).toFixed(2);
}

export default function CapexMinistrySummaryReport({ showToast }) {
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const reportMeta = useMemo(() => getCapexReportAsOnMeta(selectedYear), [selectedYear]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCapexSummaryReport(selectedYear);
      setRows(mapCapexSummaryReportRows(res.data || {}));
    } catch (err) {
      console.error(err);
      setRows([]);
      showToast?.('❌ Failed to load Capex summary report', '#EF4444');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showToast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const orgNames = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.organisation_name).filter(Boolean))).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    let list = rows;
    if (selectedOrgFilter !== 'ALL') {
      list = list.filter((r) => r.organisation_name === selectedOrgFilter);
    }
    if (quickFilter.trim()) {
      const term = quickFilter.toLowerCase();
      list = list.filter((r) =>
        String(r.organisation_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [rows, selectedOrgFilter, quickFilter]);

  const totals = useMemo(() => {
    const be = filteredRows.reduce((s, r) => s + (Number(r.be) || 0), 0);
    const exp = filteredRows.reduce((s, r) => s + (Number(r.exp) || 0), 0);
    const pct = be > 0 ? (exp * 100) / be : 0;
    return { be, exp, pct };
  }, [filteredRows]);

  const hasActiveFilters =
    selectedYear !== '2026-2027' ||
    selectedOrgFilter !== 'ALL' ||
    Boolean(quickFilter.trim());

  const handleResetFilters = () => {
    setSelectedYear('2026-2027');
    setSelectedOrgFilter('ALL');
    setQuickFilter('');
  };

  const handleCopy = () => {
    const header = ['SNo', 'Organisation', 'Total BE', 'Total Expenditure', '% of BE Achieved', 'Status'];
    const lines = [
      header.join('\t'),
      ...filteredRows.map((r, i) =>
        [
          i + 1,
          r.organisation_name,
          fmt(r.be),
          fmt(r.exp),
          r.pctLabel,
          r.status?.label || '',
        ].join('\t')
      ),
      ['', 'Total', fmt(totals.be), fmt(totals.exp), fmt(totals.pct), ''].join('\t'),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      showToast?.('📋 Capex summary report copied!', BRAND);
    });
  };

  const handleExportExcel = () => {
    const data = filteredRows.map((r, i) => ({
      SNo: i + 1,
      Organisation: r.organisation_name,
      'Total BE (In Crores)': Number(fmt(r.be)),
      'Total Expenditure (In Crores)': Number(fmt(r.exp)),
      '% of BE Achieved': Number(r.pctLabel),
      Status: r.status?.label || '',
    }));
    data.push({
      SNo: '',
      Organisation: 'Total',
      'Total BE (In Crores)': Number(fmt(totals.be)),
      'Total Expenditure (In Crores)': Number(fmt(totals.exp)),
      '% of BE Achieved': Number(fmt(totals.pct)),
      Status: '',
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capex Summary');
    XLSX.writeFile(wb, `Capex_Summary_Report_${selectedYear}.xlsx`);
    showToast?.('📊 Capex summary exported to Excel!', BRAND);
  };

  const handleExportPdf = () => {
    showToast?.('📄 Opening print for Capex summary…', BRAND);
    window.print();
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-[26px] py-5 border border-[#eadede] rounded-2xl bg-gradient-to-r from-[#fdfcfc] to-[#f7f3f3] shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} style={{ color: BRAND_SOFT }} strokeWidth={2.5} />
              <span
                className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold"
                style={{ color: BRAND_SOFT }}
              >
                Capex Module
              </span>
            </div>
            <h3 className="m-0 text-xl font-bold tracking-wide" style={{ color: BRAND }}>
              Summary Report — Yearly Capex Review ({selectedYear})
            </h3>
            <div
              className="flex items-center gap-2 mt-1.5 text-xs font-semibold"
              style={{ color: BRAND_SOFT }}
            >
              <span>
                As on date: <strong style={{ color: BRAND }}>{reportMeta.asOnDateStr}</strong>
              </span>
              <span style={{ color: '#eadede' }}>•</span>
              <span>
                {reportMeta.reportPeriodLabel} —{' '}
                <strong style={{ color: BRAND }}>{reportMeta.reportPeriodValue}</strong>
              </span>

            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative w-60">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: BRAND_SOFT }}
            />
            <input
              type="text"
              placeholder="Search organisation..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-[13.5px] font-medium rounded-[9px] outline-none border border-[#eadede] bg-white"
              style={{ color: BRAND }}
            />
            {quickFilter ? (
              <button
                type="button"
                onClick={() => setQuickFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0.5"
                style={{ color: BRAND_SOFT }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <CopyButton
            onCopy={handleCopy}
            color={BRAND}
            hoverBg="#f7f3f3"
            className="!rounded-[9px] !py-[9px] !px-[16px]"
          />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            color={BRAND}
            hoverColor={BRAND_HOVER}
          />
          <button
            type="button"
            onClick={fetchSummary}
            className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] bg-white border border-[#eadede] text-slate-500 hover:text-[#4b2424] hover:border-[#4b2424] transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${BORDER}`, background: '#fcf9f7' }}
      >
        <button
          type="button"
          onClick={() => setIsFilterOpen((o) => !o)}
          className="w-full px-[18px] py-3 flex items-center justify-between text-xs font-extrabold cursor-pointer"
          style={{ background: ACCENT, color: BRAND, border: 'none' }}
        >
          <div className="flex items-center gap-2">
            <Filter size={15} color={BRAND} />
            <span>Filter Report Parameters</span>
            {hasActiveFilters ? (
              <span className="px-2 py-0.5 bg-[#4b2424] text-white text-[10px] rounded-full font-bold">
                Active
              </span>
            ) : null}
          </div>
          {isFilterOpen ? (
            <ChevronUp size={16} color={BRAND} />
          ) : (
            <ChevronDown size={16} color={BRAND} />
          )}
        </button>

        {isFilterOpen ? (
          <div
            className="p-4 space-y-3 bg-white"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-[11.5px] font-extrabold mb-1.5"
                  style={{ color: BRAND }}
                >
                  Financial Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-[10px] font-bold outline-none cursor-pointer"
                  style={{
                    background: '#fcf9f7',
                    border: '1px solid #d7c4b7',
                    color: BRAND,
                  }}
                >
                  {FY_OPTIONS.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-[11.5px] font-extrabold mb-1.5"
                  style={{ color: BRAND }}
                >
                  Organisation
                </label>
                <select
                  value={selectedOrgFilter}
                  onChange={(e) => setSelectedOrgFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-[10px] font-bold outline-none cursor-pointer"
                  style={{
                    background: '#fcf9f7',
                    border: '1px solid #d7c4b7',
                    color: BRAND,
                  }}
                >
                  <option value="ALL">All Organisations</option>
                  {orgNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasActiveFilters ? (
              <div className="flex justify-end pt-2 border-t border-[#eadede]">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer inline-flex items-center gap-1.5"
                  style={{ background: ACCENT, color: BRAND }}
                >
                  <RotateCcw size={12} />
                  Reset Filters
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className="bg-white rounded-2xl shadow-sm overflow-hidden relative"
        style={{ border: `1px solid ${BORDER}` }}
      >
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <span className="text-xs font-bold" style={{ color: BRAND }}>
              Loading summary…
            </span>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" id="capexSummaryTable">
            <thead>
              <tr className="text-white text-center uppercase tracking-wider" style={{ background: BRAND }}>
                <th className="p-3 border border-[#6b3535]">SNo</th>
                <th className="p-3 border border-[#6b3535] text-left">Organisation</th>
                <th className="p-3 border border-[#6b3535]">Total BE (In Crores)</th>
                <th className="p-3 border border-[#6b3535]">Total Expenditure (In Crores)</th>
                <th className="p-3 border border-[#6b3535]">% of BE Achieved</th>
                <th className="p-3 border border-[#6b3535]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-slate-500 font-semibold border border-[#eadede]"
                  >
                    No Capex summary data for the selected filters.
                  </td>
                </tr>
              ) : null}
              {filteredRows.map((row, idx) => (
                <tr
                  key={`${row.organisation_id || row.organisation_name}-${idx}`}
                  className="text-center border-b border-[#eadede] hover:bg-[#fcf9f7]"
                >
                  <td className="p-2.5 border border-[#eadede] font-semibold text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="p-2.5 border border-[#eadede] text-left font-bold text-[#4b2424]">
                    {row.organisation_name}
                  </td>
                  <td className="p-2.5 border border-[#eadede] font-semibold">{fmt(row.be)}</td>
                  <td className="p-2.5 border border-[#eadede] font-semibold">{fmt(row.exp)}</td>
                  <td className="p-2.5 border border-[#eadede] font-black text-[#4b2424]">
                    {row.pctLabel}
                  </td>
                  <td className={`p-2.5 border border-[#eadede] ${row.status.bg}`}>
                    <span
                      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold ${row.status.text}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                      {row.status.label}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRows.length > 0 ? (
                <tr className="font-black text-white text-center" style={{ background: BRAND }}>
                  <td className="p-2.5 border border-[#6b3535]" />
                  <td className="p-2.5 border border-[#6b3535] text-left uppercase">Total</td>
                  <td className="p-2.5 border border-[#6b3535]">{fmt(totals.be)}</td>
                  <td className="p-2.5 border border-[#6b3535]">{fmt(totals.exp)}</td>
                  <td className="p-2.5 border border-[#6b3535]">{fmt(totals.pct)}</td>
                  <td className="p-2.5 border border-[#6b3535]" />
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> 75–100% Good
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> 50–&lt;75% Moderate
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &lt;50% Low
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> &gt;100% Above BE
        </span>
      </div>
    </div>
  );
}
