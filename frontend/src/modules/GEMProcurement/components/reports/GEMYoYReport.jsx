import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { RefreshCw, Search, X, TrendingUp } from 'lucide-react';
import CopyButton from '../../../../components/CopyButton';
import ExportDropdown from '../../../../components/ExportDropdown';
import { fetchGemYoYReport } from '../../api';
import { getCurrentFinancialYear, getGemReportAsOnMeta } from '../../utils/gemUtils';

const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');

export default function GEMYoYReport({ showToast }) {
  const [financialYears, setFinancialYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [quickFilter, setQuickFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const reportMeta = useMemo(
    () => getGemReportAsOnMeta(getCurrentFinancialYear()),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGemYoYReport();
      setFinancialYears(Array.isArray(res.data?.financialYears) ? res.data.financialYears : []);
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
      setFinancialYears([]);
      setRows([]);
      showToast?.('❌ Failed to load GeM year-on-year report', '#EF4444');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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

  const totalsByYear = useMemo(() => {
    const totals = {};
    financialYears.forEach((fy) => {
      const planned = filteredRows.reduce((s, r) => s + (Number(r.years?.[fy]?.planned_procurement) || 0), 0);
      const through = filteredRows.reduce((s, r) => s + (Number(r.years?.[fy]?.through_gem) || 0), 0);
      const outside = filteredRows.reduce((s, r) => s + (Number(r.years?.[fy]?.outside_gem) || 0), 0);
      totals[fy] = {
        planned,
        through,
        outside,
        pct: planned > 0 ? (through * 100) / planned : 0,
      };
    });
    return totals;
  }, [filteredRows, financialYears]);

  const handleCopy = async () => {
    const header = [
      'S.No',
      'Organisation',
      ...financialYears.flatMap((fy) => [
        `${fy} Planned`,
        `${fy} Through GeM`,
        `${fy} Outside GeM`,
        `${fy} % Achieved`,
      ]),
    ];

    const lines = [
      header.join('\t'),
      ...filteredRows.map((r, i) =>
        [
          i + 1,
          r.organisation_name || '',
          ...financialYears.flatMap((fy) => {
            const cell = r.years?.[fy] || {};
            return [
              fmt(cell.planned_procurement),
              fmt(cell.through_gem),
              fmt(cell.outside_gem),
              fmt(cell.pct),
            ];
          }),
        ].join('\t')
      ),
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    showToast?.('📋 GeM YoY report copied', '#4b2424');
  };

  const handleExportExcel = () => {
    const data = filteredRows.map((r, i) => {
      const row = {
        'S.No': i + 1,
        Organisation: r.organisation_name,
      };
      financialYears.forEach((fy) => {
        const cell = r.years?.[fy] || {};
        row[`${fy} Planned`] = Number(fmt(cell.planned_procurement));
        row[`${fy} Through GeM`] = Number(fmt(cell.through_gem));
        row[`${fy} Outside GeM`] = Number(fmt(cell.outside_gem));
        row[`${fy} % Achieved`] = Number(fmt(cell.pct));
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GeM YoY');
    XLSX.writeFile(wb, 'GeM_Year_on_Year_Report.xlsx');
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
              Year-on-Year Report — GeM Procurement Review
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

      <div className="flex justify-between flex-wrap gap-2">
        <div className="text-xs font-semibold text-slate-600">
          Year-on-Year organisation performance (Planned vs Through GeM vs Outside GeM)
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

      <div className="overflow-x-auto border border-[#d7c4b7] rounded-xl relative min-h-[320px]">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <span className="text-xs font-bold text-[#4b2424]">Loading report...</span>
          </div>
        ) : null}
        <table className="w-full text-xs border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-[#4b2424] text-white text-center">
              <th className="p-2 border border-[#6b3535]" rowSpan={2}>S.No</th>
              <th className="p-2 border border-[#6b3535]" rowSpan={2}>Organisation</th>
              {financialYears.map((fy) => (
                <th key={fy} className="p-2 border border-[#6b3535]" colSpan={4}>{fy}</th>
              ))}
            </tr>
            <tr className="bg-[#5c2d2d] text-white text-center">
              {financialYears.map((fy) => (
                <Fragment key={`${fy}-sub`}>
                  <th className="p-2 border border-[#6b3535]">Planned</th>
                  <th className="p-2 border border-[#6b3535]">Through GeM</th>
                  <th className="p-2 border border-[#6b3535]">Outside GeM</th>
                  <th className="p-2 border border-[#6b3535]">% Achieved</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-slate-500" colSpan={2 + financialYears.length * 4}>No data</td>
              </tr>
            ) : null}
            {filteredRows.map((r, i) => (
              <tr key={`${r.organisation_id}-${i}`} className="hover:bg-[#fcf9f7]">
                <td className="p-2 border border-[#eadede] text-center">{i + 1}</td>
                <td className="p-2 border border-[#eadede] font-bold">{r.organisation_name}</td>
                {financialYears.map((fy) => {
                  const c = r.years?.[fy] || {};
                  return (
                    <Fragment key={`${r.organisation_id}-${fy}`}>
                      <td className="p-2 border border-[#eadede] text-center">{fmt(c.planned_procurement)}</td>
                      <td className="p-2 border border-[#eadede] text-center">{fmt(c.through_gem)}</td>
                      <td className="p-2 border border-[#eadede] text-center">{fmt(c.outside_gem)}</td>
                      <td className="p-2 border border-[#eadede] text-center font-bold">{fmt(c.pct)}</td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {filteredRows.length > 0 ? (
            <tfoot>
              <tr className="bg-[#f5eeea] font-black text-center">
                <td className="p-2 border border-[#d7c4b7]" colSpan={2}>Total</td>
                {financialYears.map((fy) => {
                  const t = totalsByYear[fy] || {};
                  return (
                    <Fragment key={`tot-${fy}`}>
                      <td className="p-2 border border-[#d7c4b7]">{fmt(t.planned)}</td>
                      <td className="p-2 border border-[#d7c4b7]">{fmt(t.through)}</td>
                      <td className="p-2 border border-[#d7c4b7]">{fmt(t.outside)}</td>
                      <td className="p-2 border border-[#d7c4b7]">{fmt(t.pct)}</td>
                    </Fragment>
                  );
                })}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
