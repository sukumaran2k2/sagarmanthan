import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchCapexYoYReport } from '../../api';
import { getCapexReportAsOnMeta } from '../../utils/capexUtils';

const BRAND = '#4b2424';
const BRAND_HOVER = '#6b3535';
const BRAND_SOFT = '#8c4242';
const ACCENT = '#f5eeea';
const BORDER = '#e8d5c8';

function fmt(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '0.00';
  return Number(num).toFixed(2);
}

function YearCells({ cell, total = false }) {
  if (total) {
    return (
      <>
        <td className="p-2.5 border border-[#6b3535] text-right">{fmt(cell.be)}</td>
        <td className="p-2.5 border border-[#6b3535] text-right">{fmt(cell.exp)}</td>
        <td className="p-2.5 border border-[#6b3535] text-right underline">{fmt(cell.pct)}</td>
      </>
    );
  }

  return (
    <>
      <td className="p-2 border border-[#eadede] text-right">{fmt(cell.be)}</td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(cell.exp)}</td>
      <td className="p-2 border border-[#eadede] text-right font-black text-[#4b2424] bg-[#f7f3f3]">
        {fmt(cell.pct)}
      </td>
    </>
  );
}

export default function CapexMinistryYoYReport({ showToast }) {
  const [financialYears, setFinancialYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const currentFy = financialYears[financialYears.length - 1] || '';
  const { asOnDateStr, reportMonthStr } = useMemo(
    () => getCapexReportAsOnMeta(currentFy),
    [currentFy]
  );

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCapexYoYReport();
      const payload = res.data || {};
      setFinancialYears(Array.isArray(payload.financialYears) ? payload.financialYears : []);
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      console.error(err);
      setFinancialYears([]);
      setRows([]);
      showToast?.('❌ Failed to load Capex year-on-year report', '#EF4444');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  const yearTotals = useMemo(() => {
    const totals = {};
    financialYears.forEach((fy) => {
      const be = filteredRows.reduce((s, r) => s + (Number(r.years?.[fy]?.be) || 0), 0);
      const exp = filteredRows.reduce((s, r) => s + (Number(r.years?.[fy]?.exp) || 0), 0);
      totals[fy] = {
        be,
        exp,
        pct: be > 0 ? (exp * 100) / be : 0,
      };
    });
    return totals;
  }, [filteredRows, financialYears]);

  const hasActiveFilters =
    selectedOrgFilter !== 'ALL' || Boolean(quickFilter.trim());

  const handleResetFilters = () => {
    setSelectedOrgFilter('ALL');
    setQuickFilter('');
  };

  const handleCopy = () => {
    const header = [
      'SNo',
      'Organisation',
      ...financialYears.flatMap((fy) => [
        `${fy} BE`,
        `${fy} Expenditure`,
        `${fy} % of BE`,
      ]),
    ];
    const lines = [
      header.join('\t'),
      ...filteredRows.map((r, i) =>
        [
          i + 1,
          r.organisation_name,
          ...financialYears.flatMap((fy) => {
            const cell = r.years?.[fy] || {};
            return [fmt(cell.be), fmt(cell.exp), fmt(cell.pct)];
          }),
        ].join('\t')
      ),
      [
        '',
        'Total',
        ...financialYears.flatMap((fy) => {
          const t = yearTotals[fy] || {};
          return [fmt(t.be), fmt(t.exp), fmt(t.pct)];
        }),
      ].join('\t'),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      showToast?.('📋 Capex year-on-year report copied!', BRAND);
    });
  };

  const handleExportExcel = () => {
    const data = filteredRows.map((r, i) => {
      const row = {
        SNo: i + 1,
        Organisation: r.organisation_name,
      };
      financialYears.forEach((fy) => {
        const cell = r.years?.[fy] || {};
        row[`${fy} Budget Estimate`] = Number(fmt(cell.be));
        row[`${fy} Actual Expenditure`] = Number(fmt(cell.exp));
        row[`${fy} % of BE Achieved`] = Number(fmt(cell.pct));
      });
      return row;
    });

    const totalRow = { SNo: '', Organisation: 'Total' };
    financialYears.forEach((fy) => {
      const t = yearTotals[fy] || {};
      totalRow[`${fy} Budget Estimate`] = Number(fmt(t.be));
      totalRow[`${fy} Actual Expenditure`] = Number(fmt(t.exp));
      totalRow[`${fy} % of BE Achieved`] = Number(fmt(t.pct));
    });
    data.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capex YoY');
    XLSX.writeFile(wb, 'Capex_Year_on_Year_Report.xlsx');
    showToast?.('📊 Capex year-on-year exported to Excel!', BRAND);
  };

  const handleExportPdf = () => {
    showToast?.('📄 Opening print for Capex year-on-year…', BRAND);
    window.print();
  };

  const colSpan = 2 + financialYears.length * 3;

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
              1.3 Year-on-Year — Organisation Capex Performance
            </h3>
            <div
              className="flex items-center gap-2 mt-1.5 text-xs font-semibold"
              style={{ color: BRAND_SOFT }}
            >
              <span>
                As on date: <strong style={{ color: BRAND }}>{asOnDateStr}</strong>
              </span>
              <span style={{ color: '#eadede' }}>•</span>
              <span>
                Report for the month — <strong style={{ color: BRAND }}>{reportMonthStr}</strong>
              </span>
              {financialYears.length ? (
                <>
                  <span style={{ color: '#eadede' }}>•</span>
                  <span>
                    FYs:{' '}
                    <strong style={{ color: BRAND }}>
                      {financialYears[0]} to {financialYears[financialYears.length - 1]}
                    </strong>
                  </span>
                </>
              ) : null}
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
              className="w-full pl-9 pr-8 py-2 text-[13.5px] font-medium rounded-[9px] outline-none border border-[#eadede] bg-white transition focus:ring-[3px] focus:ring-[#4b2424]/10"
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
            onClick={fetchReport}
            className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] bg-white border border-[#eadede] text-slate-500 hover:text-[#4b2424] hover:border-[#4b2424] transition cursor-pointer"
            title="Refresh Data"
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
          className="w-full px-[18px] py-3 flex items-center justify-between text-xs font-extrabold cursor-pointer transition"
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
            className="p-4 space-y-3 animate-fade-in text-left bg-white"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer inline-flex items-center gap-1.5"
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
        className="p-3.5 rounded-xl text-xs font-bold text-left"
        style={{ background: '#fcf9f7', border: `1px solid ${BORDER}`, color: BRAND }}
      >
        Note : Financial years are listed from FY 2022-2023 through the current FY (starts every
        April). New years appear automatically once that financial year begins.
      </div>

      <div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] min-h-[400px] relative">
          <table
            id="capexYoYTable"
            className="w-full text-xs text-slate-800 border-collapse min-w-[900px]"
          >
            <thead className="sticky top-0 z-30 shadow-sm">
              <tr className="text-white text-center font-extrabold" style={{ background: BRAND }}>
                <th className="p-2.5 border border-[#6b3535] w-12" rowSpan={2}>
                  S.No
                </th>
                <th className="p-2.5 border border-[#6b3535] min-w-[220px]" rowSpan={2}>
                  Name of the Organization
                </th>
                {financialYears.map((fy) => (
                  <th key={fy} className="p-2.5 border border-[#6b3535]" colSpan={3}>
                    {fy}
                  </th>
                ))}
              </tr>
              <tr
                className="text-white text-center font-extrabold text-[11px]"
                style={{ background: BRAND }}
              >
                {financialYears.map((fy) => (
                  <Fragment key={`${fy}-sub`}>
                    <th className="p-2 border border-[#6b3535]">Budget Estimate</th>
                    <th className="p-2 border border-[#6b3535]">Actual Expenditure</th>
                    <th className="p-2 border border-[#6b3535]">% of BE Achieved</th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={colSpan || 5}
                    className="p-8 text-center text-sm font-semibold text-slate-500 border border-[#eadede]"
                  >
                    Loading year-on-year Capex data…
                  </td>
                </tr>
              ) : null}

              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan || 5}
                    className="p-8 text-center text-sm font-semibold text-slate-500 border border-[#eadede]"
                  >
                    No Capex year-on-year data found.
                  </td>
                </tr>
              ) : null}

              {!loading &&
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.organisation_id || row.organisation_name}
                    className="hover:bg-[#fcf9f7] transition border-b border-[#eadede]"
                  >
                    <td className="p-2 border border-[#eadede] text-center font-semibold text-slate-700">
                      {idx + 1}
                    </td>
                    <td className="p-2 border border-[#eadede] font-bold text-[#4b2424] text-left">
                      {row.organisation_name}
                    </td>
                    {financialYears.map((fy) => {
                      const cell = row.years?.[fy] || { be: 0, exp: 0, pct: 0 };
                      return (
                        <YearCells key={`${row.organisation_id}-${fy}`} cell={cell} />
                      );
                    })}
                  </tr>
                ))}

              {!loading && filteredRows.length > 0 ? (
                <tr
                  className="text-white font-black text-xs border-t-4"
                  style={{ background: BRAND, borderColor: '#2c1313' }}
                >
                  <td className="p-2.5 border border-[#6b3535] text-center" />
                  <td className="p-2.5 border border-[#6b3535] text-left uppercase tracking-wider">
                    Total
                  </td>
                  {financialYears.map((fy) => {
                    const t = yearTotals[fy] || { be: 0, exp: 0, pct: 0 };
                    return (
                      <YearCells key={`total-${fy}`} cell={t} total />
                    );
                  })}
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
