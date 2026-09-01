import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  RefreshCw,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import ExportDropdown from '../../../../components/ExportDropdown';
import CopyButton from '../../../../components/CopyButton';
import { fetchCapexList } from '../../api';
import { getSessionOrganisationId } from '../../../../utils/authSession';
import {
  getCapexReportAsOnMeta,
  getCapexStatusMeta,
} from '../../utils/capexUtils';

const BRAND = '#4b2424';
const BRAND_HOVER = '#6b3535';
const BRAND_SOFT = '#8c4242';
const ACCENT = '#f5eeea';
const BORDER = '#e8d5c8';

function fmt(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '0.00';
  return Number(num).toFixed(2);
}

export default function CapexOrgSummaryReport({ showToast }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const orgId = getSessionOrganisationId();

  const asOnMeta = useMemo(() => getCapexReportAsOnMeta('2026-2027'), []);

  const fetchSummary = useCallback(async () => {
    if (!orgId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchCapexList({
        organisationId: orgId,
        all: true,
        page: 1,
        limit: 500,
      });
      const payload = res.data || {};
      const list = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      const mapped = list
        .map((item) => {
          const be = parseFloat(item.capex_total_value) || 0;
          const exp = parseFloat(item.total_capex_expenditure) || 0;
          const pct = be > 0 ? (exp * 100) / be : 0;
          return {
            fy: item.capex_financial_year || '—',
            organisation_name: item.organisation_name || '—',
            be,
            exp,
            pct,
            pctLabel: pct.toFixed(2),
            status: getCapexStatusMeta(pct),
          };
        })
        .sort((a, b) => String(b.fy).localeCompare(String(a.fy)));

      setRows(mapped);
    } catch (err) {
      console.error(err);
      setRows([]);
      showToast?.('❌ Failed to load organisation Capex summary', '#EF4444');
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const totals = useMemo(() => {
    const be = rows.reduce((s, r) => s + (Number(r.be) || 0), 0);
    const exp = rows.reduce((s, r) => s + (Number(r.exp) || 0), 0);
    const pct = be > 0 ? (exp * 100) / be : 0;
    return { be, exp, pct };
  }, [rows]);

  const handleCopy = () => {
    const lines = [
      ['SNo', 'Financial Year', 'Total BE', 'Total Expenditure', '% of BE Achieved', 'Status'].join(
        '\t'
      ),
      ...rows.map((r, i) =>
        [i + 1, r.fy, fmt(r.be), fmt(r.exp), r.pctLabel, r.status?.label || ''].join('\t')
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      showToast?.('📋 Organisation Capex summary copied!', BRAND);
    });
  };

  const handleExportExcel = () => {
    const data = rows.map((r, i) => ({
      SNo: i + 1,
      'Financial Year': r.fy,
      'Total BE (In Crores)': Number(fmt(r.be)),
      'Total Expenditure (In Crores)': Number(fmt(r.exp)),
      '% of BE Achieved': Number(r.pctLabel),
      Status: r.status?.label || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Org Capex Summary');
    XLSX.writeFile(wb, 'Capex_Org_Summary_Report.xlsx');
    showToast?.('📊 Organisation Capex summary exported!', BRAND);
  };

  const orgLabel = rows[0]?.organisation_name || 'Your organisation';

  return (
    <div className="space-y-4 animate-fade-in select-none">
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-[26px] py-5 border border-[#eadede] rounded-2xl bg-gradient-to-r from-[#fdfcfc] to-[#f7f3f3] shadow-sm">
        <div className="flex-1 min-w-[280px]">
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
            Summary Report — Yearly Capex Review
          </h3>
          <div
            className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-semibold"
            style={{ color: BRAND_SOFT }}
          >
            <span>
              Organisation: <strong style={{ color: BRAND }}>{orgLabel}</strong>
            </span>
            <span style={{ color: '#eadede' }}>•</span>
            <span>
              As on date:{' '}
              <strong style={{ color: BRAND }}>{asOnMeta.asOnDateStr}</strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <CopyButton
            onCopy={handleCopy}
            color={BRAND}
            hoverBg="#f7f3f3"
            className="!rounded-[9px] !py-[9px] !px-[16px]"
          />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={() => {
              showToast?.('📄 Opening print…', BRAND);
              window.print();
            }}
            color={BRAND}
            hoverColor={BRAND_HOVER}
          />
          <button
            type="button"
            onClick={fetchSummary}
            className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] bg-white border border-[#eadede] text-slate-500 hover:text-[#4b2424] hover:border-[#4b2424] transition cursor-pointer"
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
          </div>
          {isFilterOpen ? (
            <ChevronUp size={16} color={BRAND} />
          ) : (
            <ChevronDown size={16} color={BRAND} />
          )}
        </button>
        {isFilterOpen ? (
          <div
            className="p-4 bg-white text-xs font-semibold text-slate-600"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            Showing all financial years with Capex targets for your organisation.
            <button
              type="button"
              onClick={fetchSummary}
              className="ml-3 inline-flex items-center gap-1 font-extrabold cursor-pointer"
              style={{ color: BRAND }}
            >
              <RotateCcw size={12} />
              Refresh
            </button>
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
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-white text-center uppercase tracking-wider" style={{ background: BRAND }}>
                <th className="p-3 border border-[#6b3535]">SNo</th>
                <th className="p-3 border border-[#6b3535]">Financial Year</th>
                <th className="p-3 border border-[#6b3535]">Total BE (In Crores)</th>
                <th className="p-3 border border-[#6b3535]">Total Expenditure (In Crores)</th>
                <th className="p-3 border border-[#6b3535]">% of BE Achieved</th>
                <th className="p-3 border border-[#6b3535]">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-slate-500 font-semibold border border-[#eadede]"
                  >
                    No Capex targets found for your organisation.
                  </td>
                </tr>
              ) : null}
              {rows.map((row, idx) => (
                <tr
                  key={`${row.fy}-${idx}`}
                  className="text-center border-b border-[#eadede] hover:bg-[#fcf9f7]"
                >
                  <td className="p-2.5 border border-[#eadede] font-semibold text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="p-2.5 border border-[#eadede] font-bold text-[#4b2424]">
                    {row.fy}
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
              {rows.length > 0 ? (
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
    </div>
  );
}
