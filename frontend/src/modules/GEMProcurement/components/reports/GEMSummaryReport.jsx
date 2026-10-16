import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { RefreshCw, Search, X, TrendingUp } from 'lucide-react';
import CopyButton from '../../../../components/CopyButton';
import ExportDropdown from '../../../../components/ExportDropdown';
import { fetchGemSummaryReport } from '../../api';
import { getGemReportAsOnMeta } from '../../utils/gemUtils';

const FY_OPTIONS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023'];

const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');

export default function GEMSummaryReport({ showToast, viewMode = 'ministry' }) {
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');

  const reportMeta = useMemo(() => getGemReportAsOnMeta(selectedYear), [selectedYear]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGemSummaryReport(selectedYear);
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setRows(data);
    } catch (err) {
      console.error(err);
      setRows([]);
      showToast?.('❌ Failed to load GeM summary report', '#EF4444');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filteredRows = useMemo(() => {
    if (!quickFilter.trim()) return rows;
    const term = quickFilter.toLowerCase();
    return rows.filter((r) =>
      `${r.organisation_name || ''} ${r.display_group || ''}`.toLowerCase().includes(term)
    );
  }, [rows, quickFilter]);

  const totals = useMemo(() => {
    const planned = filteredRows.reduce((s, r) => s + (Number(r.planned_procurement) || 0), 0);
    const through = filteredRows.reduce((s, r) => s + (Number(r.through_gem) || 0), 0);
    const outside = filteredRows.reduce((s, r) => s + (Number(r.outside_gem) || 0), 0);
    const pct = planned > 0 ? (through * 100) / planned : 0;
    return { planned, through, outside, pct };
  }, [filteredRows]);

  const handleCopy = async () => {
    const lines = [
      ['S.No', 'Organisation', 'Planned', 'Through GeM', 'Outside GeM', '% Achieved'].join('\t'),
      ...filteredRows.map((r, i) =>
        [
          i + 1,
          r.organisation_name || '',
          fmt(r.planned_procurement),
          fmt(r.through_gem),
          fmt(r.outside_gem),
          fmt(r.pct),
        ].join('\t')
      ),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast?.('📋 GeM summary copied', '#4b2424');
  };

  const handleExportExcel = () => {
    const data = filteredRows.map((r, i) => ({
      'S.No': i + 1,
      Organisation: r.organisation_name,
      'Planned Procurement': Number(fmt(r.planned_procurement)),
      'Through GeM': Number(fmt(r.through_gem)),
      'Outside GeM': Number(fmt(r.outside_gem)),
      '% Achieved': Number(fmt(r.pct)),
    }));
    if (viewMode !== 'org') {
      data.push({
        'S.No': '',
        Organisation: 'Total',
        'Planned Procurement': Number(fmt(totals.planned)),
        'Through GeM': Number(fmt(totals.through)),
        'Outside GeM': Number(fmt(totals.outside)),
        '% Achieved': Number(fmt(totals.pct)),
      });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GeM Summary');
    XLSX.writeFile(wb, `GeM_Summary_Report_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-[26px] py-5 border border-[#eadede] rounded-2xl bg-gradient-to-r from-[#fdfcfc] to-[#f7f3f3] shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} style={{ color: '#8c4242' }} strokeWidth={2.5} />
              <span className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold" style={{ color: '#8c4242' }}>
                GeM Procurement Module
              </span>
            </div>
            <h3 className="m-0 text-xl font-bold tracking-wide" style={{ color: '#4b2424' }}>
              Summary Report — Yearly GeM Review ({selectedYear})
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold" style={{ color: '#8c4242' }}>
              <span>
                As on date: <strong style={{ color: '#4b2424' }}>{reportMeta.asOnDateStr}</strong>
              </span>
              <span style={{ color: '#eadede' }}>•</span>
              <span>
                {reportMeta.reportPeriodLabel} — <strong style={{ color: '#4b2424' }}>{reportMeta.reportPeriodValue}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs px-3 py-2 border border-[#d7c4b7] rounded-lg font-semibold"
          >
            {FY_OPTIONS.map((fy) => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c4242]" />
            <input
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              placeholder="Search organisation"
              className="w-full pl-9 pr-8 py-2 text-xs border border-[#eadede] rounded-lg"
            />
            {quickFilter ? (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setQuickFilter('')}>
                <X size={12} />
              </button>
            ) : null}
          </div>
          <CopyButton onCopy={handleCopy} color="#4b2424" hoverBg="#f7f3f3" />
          <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={() => window.print()} color="#4b2424" hoverColor="#6b3535" />
          <button onClick={load} className="w-9 h-9 border border-[#eadede] rounded-lg inline-flex items-center justify-center">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-[#d7c4b7] rounded-xl relative min-h-[280px]">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <span className="text-xs font-bold text-[#4b2424]">Loading report...</span>
          </div>
        ) : null}
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#4b2424] text-white text-center">
              <th className="p-2 border border-[#6b3535]">S.No</th>
              <th className="p-2 border border-[#6b3535] text-left">Organisation</th>
              <th className="p-2 border border-[#6b3535]">Planned</th>
              <th className="p-2 border border-[#6b3535]">Through GeM</th>
              <th className="p-2 border border-[#6b3535]">Outside GeM</th>
              <th className="p-2 border border-[#6b3535]">% Achieved</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredRows.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-slate-500">No data</td></tr>
            ) : null}
            {filteredRows.map((r, i) => (
              <tr key={`${r.organisation_id}-${i}`} className="hover:bg-[#fcf9f7]">
                <td className="p-2 border border-[#eadede] text-center">{i + 1}</td>
                <td className="p-2 border border-[#eadede] font-bold text-left">{r.organisation_name}</td>
                <td className="p-2 border border-[#eadede] text-center">{fmt(r.planned_procurement)}</td>
                <td className="p-2 border border-[#eadede] text-center">{fmt(r.through_gem)}</td>
                <td className="p-2 border border-[#eadede] text-center">{fmt(r.outside_gem)}</td>
                <td className="p-2 border border-[#eadede] text-center font-bold">{fmt(r.pct)}</td>
              </tr>
            ))}
          </tbody>
          {filteredRows.length > 0 && viewMode !== 'org' ? (
            <tfoot>
              <tr className="bg-[#f5eeea] font-black text-center">
                <td className="p-2 border border-[#d7c4b7]" colSpan={2}>Total</td>
                <td className="p-2 border border-[#d7c4b7]">{fmt(totals.planned)}</td>
                <td className="p-2 border border-[#d7c4b7]">{fmt(totals.through)}</td>
                <td className="p-2 border border-[#d7c4b7]">{fmt(totals.outside)}</td>
                <td className="p-2 border border-[#d7c4b7]">{fmt(totals.pct)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
