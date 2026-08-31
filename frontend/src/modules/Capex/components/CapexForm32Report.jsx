import React, { useState, useEffect, useMemo } from 'react';
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
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { fetchCapexReport } from '../api';
import { getSessionOrganisationId } from '../../../utils/authSession';
import { getCapexReportAsOnMeta, getCapexStatusMeta } from '../utils/capexUtils';

const BRAND = '#4b2424';
const BRAND_HOVER = '#6b3535';
const BRAND_SOFT = '#8c4242';
const ACCENT = '#f5eeea';
const BORDER = '#e8d5c8';

const DEFAULT_MAJOR_PORTS = [
  { id: 1, name: 'Chennai Port Authority' },
  { id: 2, name: 'Cochin Port Authority' },
  { id: 5, name: 'Deendayal Port Authority' },
  { id: 9, name: 'Jawaharlal Nehru Port Authority' },
  { id: 3, name: 'Kamarajar Port Limited' },
  { id: 7, name: 'Mormugao Port Authority' },
  { id: 8, name: 'Mumbai Port Authority' },
  { id: 6, name: 'New Mangalore Port Authority' },
  { id: 10, name: 'Paradip Port Authority' },
  { id: 54, name: 'SMPA - Kolkata Dock System' },
  { id: 55, name: 'Visakhapatnam Port Authority' },
  { id: 12, name: 'V.O. Chidambaranar Port Authority' },
  { id: 11, name: 'SMPA - Haldia Dock Complex' },
  { id: 74, name: 'Vadhavan Port Project Ltd' },
];

const DEFAULT_SHIPPING_ORGS = [
  { id: 18, name: 'Cochin Shipyard Limited' },
  { id: 15, name: 'Shipping Corporation of India' },
  { id: 66, name: 'Shipping Corporation of India Land and Assets Limited' },
  { id: 22, name: 'Sagarmala Finance Corporation Limited' },
  { id: 20, name: 'Indian Port Rail & Ropeway Corporation Ltd' },
  { id: 27, name: 'Dredging Corporation of India' },
];

const DEFAULT_OTHER_ORGS = [
  { id: 17, name: 'Inland Waterways Authority of India' },
  { id: 56, name: 'Sagarmala (ALW)' },
  { id: 19, name: 'Directorate General of Lighthouses and Lightships' },
  { id: 21, name: 'Directorate General of Shipping, Mumbai' },
  { id: 25, name: 'Indian Maritime University' },
  { id: 23, name: 'Andaman Lakshadweep Harbour Works' },
  { id: 57, name: 'Secretariat-Economic Service (Capital)' },
];

function fmt(num) {
  if (num === null || num === undefined || isNaN(num) || num === 'NA') return '0.00';
  return Number(num).toFixed(2);
}

function emptyRow(d) {
  return {
        organisation_id: d.id,
        organisation_name: d.name,
        capex_gbs_value: 0,
        capex_iebr_value: 0,
        capex_ppp_value: 0,
        capex_total_value: 0,
        total_GBS: 0,
        total_IEBR: 0,
        exp_ir: 0,
        total_PPP: 0,
        exp_ppp: 0,
        total_Capex: 0,
  };
}

function processCategoryData(itemsList, defaultList, { orgScoped, selectedOrgFilter, quickFilter }) {
  let list =
    itemsList && itemsList.length > 0
      ? itemsList
      : orgScoped
        ? []
        : defaultList.map(emptyRow);

  if (!orgScoped && selectedOrgFilter && selectedOrgFilter !== 'ALL') {
    list = list.filter(
      (item) =>
        String(item.organisation_name || '').toLowerCase() ===
        selectedOrgFilter.toLowerCase()
    );
  }

  if (quickFilter.trim()) {
    const term = quickFilter.toLowerCase();
      list = list.filter((item) =>
      String(item.organisation_name || '').toLowerCase().includes(term)
      );
    }

    let capexGbsSum = 0;
    let capexIebrSum = 0;
    let capexPppSum = 0;
    let capexTotalSum = 0;
    let totalGbsSum = 0;
    let totalIebrSum = 0;
    let totalPppSum = 0;
    let totalGbsIebrPppSum = 0;

    const rows = list.map((item) => {
      const gbs = parseFloat(item.capex_gbs_value) || 0;
      const iebr = parseFloat(item.capex_iebr_value) || 0;
      const ppp = parseFloat(item.capex_ppp_value) || 0;
    const totalBE = parseFloat(item.capex_total_value) || gbs + iebr + ppp;

      const expGBS = parseFloat(item.total_GBS) || 0;
      const expIEBR = parseFloat(item.total_IEBR) || 0;
      const expIRpct = iebr > 0 ? (expIEBR * 100) / iebr : parseFloat(item.exp_ir) || 0;
      const expPPP = parseFloat(item.total_PPP) || 0;
      const expPPPpct = ppp > 0 ? (expPPP * 100) / ppp : parseFloat(item.exp_ppp) || 0;
    const sumExp = expGBS + expIEBR + expPPP;
    const expTotal = sumExp || parseFloat(item.total_Capex) || 0;
      const expPct = totalBE > 0 ? (expTotal * 100) / totalBE : 0;

      capexGbsSum += gbs;
      capexIebrSum += iebr;
      capexPppSum += ppp;
      capexTotalSum += totalBE;
      totalGbsSum += expGBS;
      totalIebrSum += expIEBR;
      totalPppSum += expPPP;
      totalGbsIebrPppSum += expTotal;

      return {
        ...item,
      gbs,
      iebr,
      ppp,
      totalBE,
      expGBS,
      expIEBR,
      expIRpct,
      expPPP,
      expPPPpct,
      expTotal,
      expPct,
      };
    });

    return {
      rows,
      totals: {
        capexGbsSum,
        capexIebrSum,
        capexPppSum,
        capexTotalSum,
        totalGbsSum,
        totalIebrSum,
      categoryIRpct: capexIebrSum > 0 ? (totalIebrSum * 100) / capexIebrSum : 0,
        totalPppSum,
      categoryPPPpct: capexPppSum > 0 ? (totalPppSum * 100) / capexPppSum : 0,
        totalGbsIebrPppSum,
      categoryTotalPct: capexTotalSum > 0 ? (totalGbsIebrPppSum * 100) / capexTotalSum : 0,
    },
  };
}

function CategoryTotalRow({ label, totals }) {
  const statusMeta = getCapexStatusMeta(totals.categoryTotalPct);

  return (
    <tr className="bg-[#f5eeea] font-black text-[#4b2424] border-y border-[#d7c4b7]">
      <td className="p-2 border border-[#d7c4b7]" />
      <td className="p-2 border border-[#d7c4b7] text-left uppercase">{label}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.capexGbsSum)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.capexIebrSum)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.capexPppSum)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.capexTotalSum)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.totalGbsSum)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.totalIebrSum)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.categoryIRpct)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.totalPppSum)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.categoryPPPpct)}</td>
      <td className="p-2 border border-[#d7c4b7] text-right">{fmt(totals.totalGbsIebrPppSum)}</td>
      <td className={`p-2 border border-[#d7c4b7] text-right ${statusMeta.bg}`}>
        <span className={`font-black ${statusMeta.text}`}>{fmt(totals.categoryTotalPct)}</span>
      </td>
    </tr>
  );
}

function DataRow({ sNo, row }) {
  const statusMeta = getCapexStatusMeta(row.expPct);

  return (
    <tr className="hover:bg-[#fcf9f7] transition border-b border-[#eadede]">
      <td className="p-2 border border-[#eadede] text-center font-semibold text-slate-700">
        {sNo}
      </td>
      <td className="p-2 border border-[#eadede] font-bold text-[#4b2424] text-left">
        {row.organisation_name}
      </td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(row.gbs)}</td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(row.iebr)}</td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(row.ppp)}</td>
      <td className="p-2 border border-[#eadede] text-right font-extrabold text-[#4b2424]">
        {fmt(row.totalBE)}
      </td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(row.expGBS)}</td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(row.expIEBR)}</td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(row.expIRpct)}</td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(row.expPPP)}</td>
      <td className="p-2 border border-[#eadede] text-right">{fmt(row.expPPPpct)}</td>
      <td className="p-2 border border-[#eadede] text-right font-extrabold text-[#4b2424]">
        {fmt(row.expTotal)}
      </td>
      <td className={`p-2 border border-[#eadede] text-right ${statusMeta.bg}`}>
        <span className={`font-black ${statusMeta.text}`}>{fmt(row.expPct)}</span>
      </td>
    </tr>
  );
}

function SectionHeader({ title }) {
  return (
    <tr className="bg-[#f5eeea] font-black text-[#4b2424] text-center border-b border-[#d7c4b7]">
      <td className="p-2 border border-[#d7c4b7]" />
      <td className="p-2 border border-[#d7c4b7] font-black text-left uppercase tracking-wide">
        {title}
      </td>
      <td className="p-2 border border-[#d7c4b7]" colSpan={11} />
    </tr>
  );
}

export default function CapexForm32Report({ showToast, orgScoped = false }) {
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    majorPorts: [],
    shippingsectorOrganisations: [],
    otherOrganisations: [],
  });

  const fetchReportData = async (year) => {
    setLoading(true);
    try {
      const res = await fetchCapexReport(year);
      if (res.data) {
        let majorPorts = res.data.majorPorts || [];
        let shippingsectorOrganisations = res.data.shippingsectorOrganisations || [];
        let otherOrganisations = res.data.otherOrganisations || [];

        if (orgScoped) {
          const orgId = String(getSessionOrganisationId() || '');
          const onlyOwn = (rows) =>
            rows.filter(
              (r) => String(r.organisation_id || r.capex_organisation_id) === orgId
            );
          majorPorts = onlyOwn(majorPorts);
          shippingsectorOrganisations = onlyOwn(shippingsectorOrganisations);
          otherOrganisations = onlyOwn(otherOrganisations);
        }

        setReportData({
          majorPorts,
          shippingsectorOrganisations,
          otherOrganisations,
        });
      }
    } catch (err) {
      console.error('Error fetching Capex Report Form 3.2 data:', err);
      if (showToast) showToast('❌ Failed to fetch Capex detailed report data', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, orgScoped]);

  const filterOpts = { orgScoped, selectedOrgFilter, quickFilter };

  const majorCategory = useMemo(
    () => processCategoryData(reportData.majorPorts, DEFAULT_MAJOR_PORTS, filterOpts),
    [reportData.majorPorts, selectedOrgFilter, orgScoped, quickFilter]
  );
  const shippingCategory = useMemo(
    () =>
      processCategoryData(
        reportData.shippingsectorOrganisations,
        DEFAULT_SHIPPING_ORGS,
        filterOpts
      ),
    [reportData.shippingsectorOrganisations, selectedOrgFilter, orgScoped, quickFilter]
  );
  const otherCategory = useMemo(
    () => processCategoryData(reportData.otherOrganisations, DEFAULT_OTHER_ORGS, filterOpts),
    [reportData.otherOrganisations, selectedOrgFilter, orgScoped, quickFilter]
  );

  const grandGbsBE =
    majorCategory.totals.capexGbsSum +
    shippingCategory.totals.capexGbsSum +
    otherCategory.totals.capexGbsSum;
  const grandIebrBE =
    majorCategory.totals.capexIebrSum +
    shippingCategory.totals.capexIebrSum +
    otherCategory.totals.capexIebrSum;
  const grandPppBE =
    majorCategory.totals.capexPppSum +
    shippingCategory.totals.capexPppSum +
    otherCategory.totals.capexPppSum;
  const grandTotalBE =
    majorCategory.totals.capexTotalSum +
    shippingCategory.totals.capexTotalSum +
    otherCategory.totals.capexTotalSum;
  const grandGbsExp =
    majorCategory.totals.totalGbsSum +
    shippingCategory.totals.totalGbsSum +
    otherCategory.totals.totalGbsSum;
  const grandIebrExp =
    majorCategory.totals.totalIebrSum +
    shippingCategory.totals.totalIebrSum +
    otherCategory.totals.totalIebrSum;
  const grandIebrPct = grandIebrBE > 0 ? (grandIebrExp * 100) / grandIebrBE : 0;
  const grandPppExp =
    majorCategory.totals.totalPppSum +
    shippingCategory.totals.totalPppSum +
    otherCategory.totals.totalPppSum;
  const grandPppPct = grandPppBE > 0 ? (grandPppExp * 100) / grandPppBE : 0;
  const grandTotalExp =
    majorCategory.totals.totalGbsIebrPppSum +
    shippingCategory.totals.totalGbsIebrPppSum +
    otherCategory.totals.totalGbsIebrPppSum;
  const grandTotalPct = grandTotalBE > 0 ? (grandTotalExp * 100) / grandTotalBE : 0;

  const reportMeta = useMemo(() => getCapexReportAsOnMeta(selectedYear), [selectedYear]);

  const allCapexOrgNames = useMemo(() => {
    const fromApi = [
      ...reportData.majorPorts,
      ...reportData.shippingsectorOrganisations,
      ...reportData.otherOrganisations,
    ]
      .map((o) => o.organisation_name)
      .filter(Boolean);
    const fallback = [
      ...DEFAULT_MAJOR_PORTS.map((o) => o.name),
      ...DEFAULT_SHIPPING_ORGS.map((o) => o.name),
      ...DEFAULT_OTHER_ORGS.map((o) => o.name),
    ];
    return Array.from(new Set(fromApi.length ? fromApi : fallback)).sort();
  }, [reportData]);

  const hasActiveFilters =
    selectedYear !== '2026-2027' ||
    (!orgScoped && selectedOrgFilter !== 'ALL') ||
    Boolean(quickFilter.trim());

  const handleResetFilters = () => {
    setSelectedYear('2026-2027');
    setSelectedOrgFilter('ALL');
    setQuickFilter('');
  };

  const handleCopyReport = () => {
    const table = document.getElementById('capexForm32Table');
    if (!table) return;
    let tsv = '';
    for (const row of table.rows) {
      const rowData = [];
      for (const cell of row.cells) {
        rowData.push(cell.innerText.replace(/\n/g, ' ').trim());
      }
      tsv += `${rowData.join('\t')}\n`;
    }
    navigator.clipboard.writeText(tsv).then(() => {
      if (showToast) showToast('📋 Detailed Capex Report copied to clipboard!', BRAND);
    });
  };

  const handleExportExcel = () => {
    const tableEl = document.getElementById('capexForm32Table');
    if (!tableEl) return;
    const wb = XLSX.utils.table_to_book(tableEl, { sheet: 'Capex Detailed' });
    XLSX.writeFile(wb, `Capex_Detailed_Report_${selectedYear}.xlsx`);
    if (showToast) showToast('📊 Exported Capex Detailed Report to Excel!', BRAND);
  };

  const handleExportPdf = () => {
    if (showToast) showToast('📄 Opening browser print for Capex Detailed Report...', BRAND);
    window.print();
  };

  let rowCounter = 1;

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
              1.2 Detailed Report — Capital Outlay and Expenditure ({selectedYear})
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
            onCopy={handleCopyReport}
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
            onClick={() => fetchReportData(selectedYear)}
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
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${orgScoped ? '' : 'md:grid-cols-2'} gap-4`}
            >
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
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2022-2023">2022-2023</option>
                  </select>
                </div>

              {!orgScoped ? (
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
                    {allCapexOrgNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
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
        Note : The Total value has been computed by aggregating the GBS, IR, and PPP components,
        reported under the respective Budget Estimates (BE) and Actual Expenditure categories.
      </div>

      <div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] min-h-[400px] relative">
          <table id="capexForm32Table" className="w-full text-xs text-slate-800 border-collapse">
            <thead className="sticky top-0 z-30 shadow-sm">
              <tr className="text-white text-center font-extrabold" style={{ background: BRAND }}>
                <th className="p-2.5 border border-[#6b3535] w-12" rowSpan={2}>
                  S.No
                </th>
                <th className="p-2.5 border border-[#6b3535] min-w-[220px]" rowSpan={2}>
                  Name of the Organization
                </th>
                <th className="p-2.5 border border-[#6b3535]" colSpan={4}>
                  Total Budget Estimate (In Crores)
                </th>
                <th className="p-2.5 border border-[#6b3535]" colSpan={6}>
                  {`Actual Expenditure (In Crores) (Upto ${reportMeta.asOnDate})`}
                </th>
                <th className="p-2.5 border border-[#6b3535]" rowSpan={2}>
                  % of BE Achieved
                </th>
              </tr>
              <tr
                className="text-white text-center font-extrabold text-[11px]"
                style={{ background: BRAND }}
              >
                <th className="p-2 border border-[#6b3535]">GBS</th>
                <th className="p-2 border border-[#6b3535]">IR</th>
                <th className="p-2 border border-[#6b3535]">PPP</th>
                <th className="p-2 border border-[#6b3535]">Total</th>
                <th className="p-2 border border-[#6b3535]">GBS</th>
                <th className="p-2 border border-[#6b3535]">IR</th>
                <th className="p-2 border border-[#6b3535]">% Exp of BE (IR)</th>
                <th className="p-2 border border-[#6b3535]">PPP</th>
                <th className="p-2 border border-[#6b3535]">% Exp of BE (PPP)</th>
                <th className="p-2 border border-[#6b3535]">Total</th>
              </tr>
            </thead>

            <tbody>
              {(!orgScoped || majorCategory.rows.length > 0) && (
                <>
                  {!orgScoped && <SectionHeader title="A. Major Ports" />}
                  {majorCategory.rows.map((row) => {
                    const sNo = rowCounter++;
                    return (
                      <DataRow key={`mp-${row.organisation_id || sNo}`} sNo={sNo} row={row} />
                    );
                  })}
                  {!orgScoped && (
                    <CategoryTotalRow label="Total Major Ports (A)" totals={majorCategory.totals} />
                  )}
                </>
              )}

              {(!orgScoped || shippingCategory.rows.length > 0) && (
                <>
                  {!orgScoped && <SectionHeader title="B. Shipping Sector & Others" />}
                  {shippingCategory.rows.map((row) => {
                    const sNo = rowCounter++;
                    return (
                      <DataRow key={`sh-${row.organisation_id || sNo}`} sNo={sNo} row={row} />
                    );
                  })}
                  {!orgScoped && (
                    <CategoryTotalRow
                      label="Total Shipping Sector (B)"
                      totals={shippingCategory.totals}
                    />
                  )}
                </>
              )}

              {(!orgScoped || otherCategory.rows.length > 0) && (
                <>
                  {!orgScoped && <SectionHeader title="C. Other Organisations" />}
                  {otherCategory.rows.map((row) => {
                    const sNo = rowCounter++;
                    return (
                      <DataRow key={`ot-${row.organisation_id || sNo}`} sNo={sNo} row={row} />
                    );
                  })}
                  {!orgScoped && (
                    <CategoryTotalRow
                      label="Total Other Organisations (C)"
                      totals={otherCategory.totals}
                    />
                  )}
                </>
              )}

              {orgScoped &&
              majorCategory.rows.length === 0 &&
              shippingCategory.rows.length === 0 &&
              otherCategory.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="p-6 text-center text-sm font-semibold text-slate-500 border border-[#eadede]"
                  >
                    No Capex data found for your organisation for {selectedYear}.
                  </td>
                </tr>
              ) : null}

              {!orgScoped ? (
                <tr
                  className="text-white font-black text-xs border-t-4"
                  style={{ background: BRAND, borderColor: '#2c1313' }}
                >
                  <td className="p-2.5 border border-[#6b3535] text-center" />
                  <td className="p-2.5 border border-[#6b3535] text-left uppercase tracking-wider">
                    Total (A+B+C)
                  </td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandGbsBE)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandIebrBE)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandPppBE)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandTotalBE)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandGbsExp)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandIebrExp)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandIebrPct)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandPppExp)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandPppPct)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right">{fmt(grandTotalExp)}</td>
                  <td className="p-2.5 border border-[#6b3535] text-right underline">
                    {fmt(grandTotalPct)}
                  </td>
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
