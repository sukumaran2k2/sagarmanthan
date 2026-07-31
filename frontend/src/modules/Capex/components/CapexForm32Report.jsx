import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { FileSpreadsheet, FileText, RefreshCw, Filter, ChevronDown, ChevronUp, Search, RotateCcw } from "lucide-react";
import ExportDropdown from "../../../components/ExportDropdown";
import CopyButton from "../../../components/CopyButton";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function CapexForm32Report({ showToast }) {
  const [selectedYear, setSelectedYear] = useState("2026-2027");
  const [categoryFilter, setCategoryFilter] = useState("ALL"); // ALL, MAJOR, SHIPPING, OTHER
  const [searchOrgTerm, setSearchOrgTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const [reportData, setReportData] = useState({
    majorPorts: [],
    shippingsectorOrganisations: [],
    otherOrganisations: [],
  });

  useEffect(() => {
    fetchReportData(selectedYear);
  }, [selectedYear]);

  const fetchReportData = async (year) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/capex-report/${year}`);
      if (res.data) {
        setReportData({
          majorPorts: res.data.majorPorts || [],
          shippingsectorOrganisations: res.data.shippingsectorOrganisations || [],
          otherOrganisations: res.data.otherOrganisations || [],
        });
      }
    } catch (err) {
      console.error("Error fetching Capex Report Form 3.2 data:", err);
      if (showToast) showToast("❌ Failed to fetch Capex Form 3.2 report data", "#EF4444");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (num) => {
    if (num === null || num === undefined || isNaN(num) || num === "NA") return "0.00";
    return Number(num).toFixed(2);
  };

  // Default fallback organization lists if backend returns un-sorted array
  const defaultMajorPorts = [
    { id: 1, name: "Chennai Port Authority" },
    { id: 2, name: "Cochin Port Authority" },
    { id: 5, name: "Deendayal Port Authority" },
    { id: 9, name: "Jawaharlal Nehru Port Authority" },
    { id: 3, name: "Kamarajar Port Limited" },
    { id: 7, name: "Mormugao Port Authority" },
    { id: 8, name: "Mumbai Port Authority" },
    { id: 6, name: "New Mangalore Port Authority" },
    { id: 10, name: "Paradip Port Authority" },
    { id: 54, name: "SMPA - Kolkata Dock System" },
    { id: 55, name: "Visakhapatnam Port Authority" },
    { id: 12, name: "V.O. Chidambaranar Port Authority" },
    { id: 11, name: "SMPA - Haldia Dock Complex" },
    { id: 74, name: "Vadhavan Port Project Ltd" },
  ];

  const defaultShippingOrgs = [
    { id: 18, name: "Cochin Shipyard Limited" },
    { id: 15, name: "Shipping Corporation of India" },
    { id: 66, name: "Shipping Corporation of India Land and Assets Limited" },
    { id: 22, name: "Sagarmala Finance Corporation Limited" },
    { id: 20, name: "Indian Port Rail & Ropeway Corporation Ltd" },
    { id: 27, name: "Dredging Corporation of India" },
  ];

  const defaultOtherOrgs = [
    { id: 17, name: "Inland Waterways Authority of India" },
    { id: 56, name: "Sagarmala (ALW)" },
    { id: 19, name: "Directorate General of Lighthouses and Lightships" },
    { id: 21, name: "Directorate General of Shipping, Mumbai" },
    { id: 25, name: "Indian Maritime University" },
    { id: 23, name: "Andaman Lakshadweep Harbour Works" },
    { id: 57, name: "Secretariat-Economic Service (Capital)" },
  ];

  // Process category rows and calculate exact category sums
  const processCategoryData = (itemsList, defaultList, filterSearchTerm = "") => {
    let list = itemsList && itemsList.length > 0 ? itemsList : [];
    
    if (list.length === 0) {
      list = defaultList.map((d) => ({
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
      }));
    }

    if (filterSearchTerm.trim()) {
      const term = filterSearchTerm.toLowerCase();
      list = list.filter((item) =>
        String(item.organisation_name || "").toLowerCase().includes(term)
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
      const totalBE = parseFloat(item.capex_total_value) || (gbs + iebr + ppp);

      const expGBS = parseFloat(item.total_GBS) || 0;
      const expIEBR = parseFloat(item.total_IEBR) || 0;
      const expIRpct = iebr > 0 ? (expIEBR * 100) / iebr : parseFloat(item.exp_ir) || 0;
      const expPPP = parseFloat(item.total_PPP) || 0;
      const expPPPpct = ppp > 0 ? (expPPP * 100) / ppp : parseFloat(item.exp_ppp) || 0;

      const expTotal = (expGBS + expIEBR + expPPP) || parseFloat(item.total_Capex) || 0;
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
        gbs, iebr, ppp, totalBE,
        expGBS, expIEBR, expIRpct, expPPP, expPPPpct, expTotal, expPct,
      };
    });

    const categoryIRpct = capexIebrSum > 0 ? (totalIebrSum * 100) / capexIebrSum : 0;
    const categoryPPPpct = capexPppSum > 0 ? (totalPppSum * 100) / capexPppSum : 0;
    const categoryTotalPct = capexTotalSum > 0 ? (totalGbsIebrPppSum * 100) / capexTotalSum : 0;

    return {
      rows,
      totals: {
        capexGbsSum,
        capexIebrSum,
        capexPppSum,
        capexTotalSum,
        totalGbsSum,
        totalIebrSum,
        categoryIRpct,
        totalPppSum,
        categoryPPPpct,
        totalGbsIebrPppSum,
        categoryTotalPct,
      },
    };
  };

  const majorCategory = useMemo(
    () => processCategoryData(reportData.majorPorts, defaultMajorPorts, searchOrgTerm),
    [reportData.majorPorts, searchOrgTerm]
  );

  const shippingCategory = useMemo(
    () => processCategoryData(reportData.shippingsectorOrganisations, defaultShippingOrgs, searchOrgTerm),
    [reportData.shippingsectorOrganisations, searchOrgTerm]
  );

  const otherCategory = useMemo(
    () => processCategoryData(reportData.otherOrganisations, defaultOtherOrgs, searchOrgTerm),
    [reportData.otherOrganisations, searchOrgTerm]
  );

  // Grand Totals across A + B + C
  const grandGbsBE = majorCategory.totals.capexGbsSum + shippingCategory.totals.capexGbsSum + otherCategory.totals.capexGbsSum;
  const grandIebrBE = majorCategory.totals.capexIebrSum + shippingCategory.totals.capexIebrSum + otherCategory.totals.capexIebrSum;
  const grandPppBE = majorCategory.totals.capexPppSum + shippingCategory.totals.capexPppSum + otherCategory.totals.capexPppSum;
  const grandTotalBE = majorCategory.totals.capexTotalSum + shippingCategory.totals.capexTotalSum + otherCategory.totals.capexTotalSum;

  const grandGbsExp = majorCategory.totals.totalGbsSum + shippingCategory.totals.totalGbsSum + otherCategory.totals.totalGbsSum;
  const grandIebrExp = majorCategory.totals.totalIebrSum + shippingCategory.totals.totalIebrSum + otherCategory.totals.totalIebrSum;
  const grandIebrPct = grandIebrBE > 0 ? (grandIebrExp * 100) / grandIebrBE : 0;

  const grandPppExp = majorCategory.totals.totalPppSum + shippingCategory.totals.totalPppSum + otherCategory.totals.totalPppSum;
  const grandPppPct = grandPppBE > 0 ? (grandPppExp * 100) / grandPppBE : 0;

  const grandTotalExp = majorCategory.totals.totalGbsIebrPppSum + shippingCategory.totals.totalGbsIebrPppSum + otherCategory.totals.totalGbsIebrPppSum;
  const grandTotalPct = grandTotalBE > 0 ? (grandTotalExp * 100) / grandTotalBE : 0;

  // Header dates
  const startYear = selectedYear.split("-")[0] || "2026";
  const asOnDateStr = `28-06-${startYear}`;
  const reportMonthStr = `June ${startYear}`;

  const handleCopyReport = () => {
    const table = document.getElementById("capexForm32Table");
    if (!table) return;
    let tsv = "";
    for (let row of table.rows) {
      let rowData = [];
      for (let cell of row.cells) {
        rowData.push(cell.innerText.replace(/\n/g, " ").trim());
      }
      tsv += rowData.join("\t") + "\n";
    }
    navigator.clipboard.writeText(tsv).then(() => {
      if (showToast) showToast("📋 Form 3.2 Report copied to clipboard!", "#10B981");
    });
  };

  const handleExportExcel = () => {
    const tableEl = document.getElementById("capexForm32Table");
    if (!tableEl) return;
    const wb = XLSX.utils.table_to_book(tableEl, { sheet: "Form 3.2 Capex" });
    XLSX.writeFile(wb, `Form_3.2_Capital_Outlay_${selectedYear}.xlsx`);
    if (showToast) showToast("📊 Exported Form 3.2 Capex Report to Excel!", "#10B981");
  };

  const handleExportPdf = () => {
    if (showToast) showToast("📄 Opening browser print for Form 3.2 Report...", "#3B82F6");
    window.print();
  };

  const handleResetFilters = () => {
    setSelectedYear("2026-2027");
    setCategoryFilter("ALL");
    setSearchOrgTerm("");
  };

  let rowCounter = 1;

  const showMajor = categoryFilter === "ALL" || categoryFilter === "MAJOR";
  const showShipping = categoryFilter === "ALL" || categoryFilter === "SHIPPING";
  const showOther = categoryFilter === "ALL" || categoryFilter === "OTHER";

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* Header Banner in Warm Brown */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8dcd5] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Dates - Left Aligned */}
          <div className="text-left space-y-1">
            <h2 className="text-xl font-black text-[#4b2424] tracking-tight">
              Form No.: 3.2 - Capital Outlay and Expenditure of MoPSW {selectedYear ? `(${selectedYear})` : "(All Financial Years)"}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs font-extrabold text-[#5c3a3a]">
              <div>
                Financial Year: <span className="underline text-[#4b2424] font-black">{selectedYear ? selectedYear : "All Financial Years"}</span>
              </div>
              <div>
                As On Date: <span className="underline text-[#4b2424] font-black">{asOnDateStr}</span>
              </div>
              <div>
                (Report for the Month - <span className="underline text-[#4b2424] font-black">{reportMonthStr}</span>)
              </div>
            </div>
          </div>

          {/* Top Right Controls: Copy & Export Dropdown */}
          <div className="flex items-center space-x-3 self-start md:self-auto">
            <button
              onClick={() => fetchReportData(selectedYear)}
              className="p-2 bg-[#f4ebe6] hover:bg-[#e8dcd5] border border-[#d7c4b7] rounded-xl text-[#4b2424] transition cursor-pointer"
              title="Refresh Report Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <CopyButton onCopy={handleCopyReport} color="#4b2424" />
            <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#4b2424" hoverColor="#381b1b" />
          </div>
        </div>

        {/* Collapsible Filter Section */}
        <div className="border border-[#e8d5c8] rounded-xl overflow-hidden bg-[#fcf9f7]">
          {/* Toggle Header */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full px-4 py-3 bg-[#f5eeea] hover:bg-[#ebdcd0] transition flex items-center justify-between text-xs font-extrabold text-[#4b2424] cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Filter size={15} className="text-[#4b2424]" />
              <span>Report Filters & Controls</span>
              {(categoryFilter !== "ALL" || searchOrgTerm || selectedYear !== "2026-2027") && (
                <span className="px-2 py-0.5 bg-[#4b2424] text-white text-[10px] rounded-full font-bold">
                  Active Filters
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-[#6e3939] font-bold">
                {isFilterOpen ? "Collapse" : "Expand Filters"}
              </span>
              {isFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {/* Collapsible Filter Body */}
          {isFilterOpen && (
            <div className="p-4 space-y-4 border-t border-[#e8d5c8] bg-white animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Financial Year Select */}
                <div>
                  <label className="block text-xs font-extrabold text-[#4b2424] mb-1">
                    Financial Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#fcf9f7] border border-[#d7c4b7] rounded-xl font-bold text-[#4b2424] focus:outline-none focus:ring-2 focus:ring-[#8c5757]/30 cursor-pointer"
                  >
                    <option value="">Show All</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2022-2023">2022-2023</option>
                  </select>
                </div>

                {/* Section Filter */}
                <div>
                  <label className="block text-xs font-extrabold text-[#4b2424] mb-1">
                    Organization Category Section
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#fcf9f7] border border-[#d7c4b7] rounded-xl font-bold text-[#4b2424] focus:outline-none focus:ring-2 focus:ring-[#8c5757]/30 cursor-pointer"
                  >
                    <option value="ALL">Show All Sections (A + B + C)</option>
                    <option value="MAJOR">Section A: Major Ports Only</option>
                    <option value="SHIPPING">Section B: Shipping Sector & Others</option>
                    <option value="OTHER">Section C: Other Organisations</option>
                  </select>
                </div>

                {/* Search Organization */}
                <div>
                  <label className="block text-xs font-extrabold text-[#4b2424] mb-1">
                    Search Organization
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type organisation name..."
                      value={searchOrgTerm}
                      onChange={(e) => setSearchOrgTerm(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 bg-[#fcf9f7] border border-[#d7c4b7] rounded-xl font-bold text-[#4b2424] focus:outline-none focus:ring-2 focus:ring-[#8c5757]/30"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8c5757]" />
                  </div>
                </div>
              </div>

              {/* Filter Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-[#f4ebe6] hover:bg-[#e8dcd5] text-[#4b2424] rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw size={12} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Brown Note Banner */}
        <div className="p-3.5 bg-[#fbf4ee] border border-[#e8d5c8] rounded-xl text-[#5c2d2d] text-xs font-bold text-left">
          Note : The Total value has been computed by aggregating the GBS, IR, and PPP components, reported under the respective Budget Estimates (BE) and Actual Expenditure categories.
        </div>
      </div>

      {/* Form 3.2 Brown Theme Table */}
      <div className="bg-white rounded-2xl border border-[#d7c4b7] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table id="capexForm32Table" className="w-full text-xs text-slate-800 border-collapse">
            <thead>
              {/* Header Row 1 - YP Brown (#4b2424) */}
              <tr className="bg-[#4b2424] text-white text-center font-extrabold border-b border-[#381b1b]">
                <th className="p-2.5 border border-[#5c2d2d] w-12" rowSpan={3}>S.No</th>
                <th className="p-2.5 border border-[#5c2d2d] min-w-[240px]" rowSpan={3}>Name of the Organization</th>
                <th className="p-2.5 border border-[#5c2d2d]" colSpan={4} rowSpan={2}>BE {selectedYear}</th>
                <th className="p-2.5 border border-[#5c2d2d]" colSpan={6}>(in crore)<br/>Expenditure (Upto month)</th>
                <th className="p-2.5 border border-[#5c2d2d]" rowSpan={2}>% Expenditure</th>
              </tr>

              {/* Header Row 2 */}
              <tr className="bg-[#4b2424] text-white text-center font-extrabold border-b border-[#381b1b]">
                <th className="p-2 border border-[#5c2d2d]" colSpan={6}>Expenditure (Upto 30/06/{startYear})</th>
              </tr>

              {/* Header Row 3 */}
              <tr className="bg-[#4b2424] text-white text-center font-extrabold border-b border-[#381b1b] text-[11px]">
                <th className="p-2 border border-[#5c2d2d]">GBS</th>
                <th className="p-2 border border-[#5c2d2d]">IR</th>
                <th className="p-2 border border-[#5c2d2d]">PPP</th>
                <th className="p-2 border border-[#5c2d2d]">Total</th>

                <th className="p-2 border border-[#5c2d2d]">GBS</th>
                <th className="p-2 border border-[#5c2d2d]">IR</th>
                <th className="p-2 border border-[#5c2d2d]">% Exp of BE (IR)</th>
                <th className="p-2 border border-[#5c2d2d]">PPP</th>
                <th className="p-2 border border-[#5c2d2d]">% Exp of BE (PPP)</th>
                <th className="p-2 border border-[#5c2d2d]">Total</th>

                <th className="p-2 border border-[#5c2d2d]">% Exp of BE</th>
              </tr>

              {/* Number Indexes (1) to (13) - Sand Cream (#e8dcd5) */}
              <tr className="bg-[#e8dcd5] text-[#4b2424] font-black text-center text-[10px] border-b border-[#c8b5a8]">
                <th className="p-1 border border-[#c8b5a8]">(1)</th>
                <th className="p-1 border border-[#c8b5a8]">(2)</th>
                <th className="p-1 border border-[#c8b5a8]">(3)</th>
                <th className="p-1 border border-[#c8b5a8]">(4)</th>
                <th className="p-1 border border-[#c8b5a8]">(5)</th>
                <th className="p-1 border border-[#c8b5a8]">(6)</th>
                <th className="p-1 border border-[#c8b5a8]">(7)</th>
                <th className="p-1 border border-[#c8b5a8]">(8)</th>
                <th className="p-1 border border-[#c8b5a8]">(9)</th>
                <th className="p-1 border border-[#c8b5a8]">(10)</th>
                <th className="p-1 border border-[#c8b5a8]">(11)</th>
                <th className="p-1 border border-[#c8b5a8]">(12)</th>
                <th className="p-1 border border-[#c8b5a8]">(13)</th>
              </tr>
            </thead>

            <tbody>
              {/* SECTION A: Major Ports */}
              {showMajor && (
                <>
                  <tr className="bg-[#f5eeea] font-black text-[#4b2424] text-center border-b border-[#d8c7bc]">
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc] font-black text-left uppercase tracking-wide">A. Major Ports</td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                  </tr>
                  {majorCategory.rows.map((row) => {
                    const sNo = rowCounter++;
                    return (
                      <tr key={`mp-${sNo}`} className="hover:bg-[#fbf7f4] transition border-b border-slate-200">
                        <td className="p-2 border border-slate-200 text-center font-semibold text-slate-700">{sNo}</td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-800 text-left">{row.organisation_name}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.gbs)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.iebr)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.ppp)}</td>
                        <td className="p-2 border border-slate-200 text-right font-extrabold text-[#4b2424]">{fmt(row.totalBE)}</td>

                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expGBS)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expIEBR)}</td>
                        <td className="p-2 border border-slate-200 text-right font-semibold text-[#6e3939]">{fmt(row.expIRpct)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expPPP)}</td>
                        <td className="p-2 border border-slate-200 text-right font-semibold text-[#6e3939]">{fmt(row.expPPPpct)}</td>
                        <td className="p-2 border border-slate-200 text-right font-extrabold text-[#4b2424]">{fmt(row.expTotal)}</td>

                        <td className="p-2 border border-slate-200 text-right font-black text-[#4b2424]">{fmt(row.expPct)}</td>
                      </tr>
                    );
                  })}
                  {/* TOTAL (A) */}
                  <tr className="bg-[#ebdcd0] font-black text-[#3b1a1a] border-t-2 border-[#bfa99b] border-b border-[#bfa99b]">
                    <td className="p-2 border border-[#caa995] text-center"></td>
                    <td className="p-2 border border-[#caa995] text-left font-black">TOTAL (A)</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(majorCategory.totals.capexGbsSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(majorCategory.totals.capexIebrSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(majorCategory.totals.capexPppSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(majorCategory.totals.capexTotalSum)}</td>

                    <td className="p-2 border border-[#caa995] text-right">{fmt(majorCategory.totals.totalGbsSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(majorCategory.totals.totalIebrSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(majorCategory.totals.categoryIRpct)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(majorCategory.totals.totalPppSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(majorCategory.totals.categoryPPPpct)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(majorCategory.totals.totalGbsIebrPppSum)}</td>

                    <td className="p-2 border border-[#caa995] text-right font-black text-[#4b2424]">{fmt(majorCategory.totals.categoryTotalPct)}</td>
                  </tr>
                </>
              )}

              {/* SECTION B: Shipping Sector & Others */}
              {showShipping && (
                <>
                  <tr className="bg-[#f5eeea] font-black text-[#4b2424] text-center border-b border-[#d8c7bc]">
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc] font-black text-left uppercase tracking-wide">B. Shipping Sector & Others</td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                  </tr>
                  {shippingCategory.rows.map((row) => {
                    const sNo = rowCounter++;
                    return (
                      <tr key={`ss-${sNo}`} className="hover:bg-[#fbf7f4] transition border-b border-slate-200">
                        <td className="p-2 border border-slate-200 text-center font-semibold text-slate-700">{sNo}</td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-800 text-left">{row.organisation_name}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.gbs)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.iebr)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.ppp)}</td>
                        <td className="p-2 border border-slate-200 text-right font-extrabold text-[#4b2424]">{fmt(row.totalBE)}</td>

                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expGBS)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expIEBR)}</td>
                        <td className="p-2 border border-slate-200 text-right font-semibold text-[#6e3939]">{fmt(row.expIRpct)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expPPP)}</td>
                        <td className="p-2 border border-slate-200 text-right font-semibold text-[#6e3939]">{fmt(row.expPPPpct)}</td>
                        <td className="p-2 border border-slate-200 text-right font-extrabold text-[#4b2424]">{fmt(row.expTotal)}</td>

                        <td className="p-2 border border-slate-200 text-right font-black text-[#4b2424]">{fmt(row.expPct)}</td>
                      </tr>
                    );
                  })}
                  {/* TOTAL (B) */}
                  <tr className="bg-[#ebdcd0] font-black text-[#3b1a1a] border-t-2 border-[#bfa99b] border-b border-[#bfa99b]">
                    <td className="p-2 border border-[#caa995] text-center"></td>
                    <td className="p-2 border border-[#caa995] text-left font-black">TOTAL (B)</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(shippingCategory.totals.capexGbsSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(shippingCategory.totals.capexIebrSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(shippingCategory.totals.capexPppSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(shippingCategory.totals.capexTotalSum)}</td>

                    <td className="p-2 border border-[#caa995] text-right">{fmt(shippingCategory.totals.totalGbsSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(shippingCategory.totals.totalIebrSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(shippingCategory.totals.categoryIRpct)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(shippingCategory.totals.totalPppSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(shippingCategory.totals.categoryPPPpct)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(shippingCategory.totals.totalGbsIebrPppSum)}</td>

                    <td className="p-2 border border-[#caa995] text-right font-black text-[#4b2424]">{fmt(shippingCategory.totals.categoryTotalPct)}</td>
                  </tr>
                </>
              )}

              {/* SECTION C: Other Organisations */}
              {showOther && (
                <>
                  <tr className="bg-[#f5eeea] font-black text-[#4b2424] text-center border-b border-[#d8c7bc]">
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc] font-black text-left uppercase tracking-wide">C. Other Organisations</td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                    <td className="p-2 border border-[#d8c7bc]"></td>
                  </tr>
                  {otherCategory.rows.map((row) => {
                    const sNo = rowCounter++;
                    return (
                      <tr key={`oo-${sNo}`} className="hover:bg-[#fbf7f4] transition border-b border-slate-200">
                        <td className="p-2 border border-slate-200 text-center font-semibold text-slate-700">{sNo}</td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-800 text-left">{row.organisation_name}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.gbs)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.iebr)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.ppp)}</td>
                        <td className="p-2 border border-slate-200 text-right font-extrabold text-[#4b2424]">{fmt(row.totalBE)}</td>

                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expGBS)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expIEBR)}</td>
                        <td className="p-2 border border-slate-200 text-right font-semibold text-[#6e3939]">{fmt(row.expIRpct)}</td>
                        <td className="p-2 border border-slate-200 text-right">{fmt(row.expPPP)}</td>
                        <td className="p-2 border border-slate-200 text-right font-semibold text-[#6e3939]">{fmt(row.expPPPpct)}</td>
                        <td className="p-2 border border-slate-200 text-right font-extrabold text-[#4b2424]">{fmt(row.expTotal)}</td>

                        <td className="p-2 border border-slate-200 text-right font-black text-[#4b2424]">{fmt(row.expPct)}</td>
                      </tr>
                    );
                  })}
                  {/* TOTAL (C) */}
                  <tr className="bg-[#ebdcd0] font-black text-[#3b1a1a] border-t-2 border-[#bfa99b] border-b border-[#bfa99b]">
                    <td className="p-2 border border-[#caa995] text-center"></td>
                    <td className="p-2 border border-[#caa995] text-left font-black">TOTAL (C)</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(otherCategory.totals.capexGbsSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(otherCategory.totals.capexIebrSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(otherCategory.totals.capexPppSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(otherCategory.totals.capexTotalSum)}</td>

                    <td className="p-2 border border-[#caa995] text-right">{fmt(otherCategory.totals.totalGbsSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(otherCategory.totals.totalIebrSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(otherCategory.totals.categoryIRpct)}</td>
                    <td className="p-2 border border-[#caa995] text-right">{fmt(otherCategory.totals.totalPppSum)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(otherCategory.totals.categoryPPPpct)}</td>
                    <td className="p-2 border border-[#caa995] text-right font-black">{fmt(otherCategory.totals.totalGbsIebrPppSum)}</td>

                    <td className="p-2 border border-[#caa995] text-right font-black text-[#4b2424]">{fmt(otherCategory.totals.categoryTotalPct)}</td>
                  </tr>
                </>
              )}

              {/* GRAND TOTAL (A+B+C) in Deep Rich YP Brown (#4b2424) */}
              {categoryFilter === "ALL" && (
                <tr className="bg-[#4b2424] text-white font-black text-xs border-t-4 border-[#2c1313]">
                  <td className="p-2.5 border border-[#5c2d2d] text-center"></td>
                  <td className="p-2.5 border border-[#5c2d2d] text-left font-black uppercase tracking-wider">Total (A+B+C)</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandGbsBE)}</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandIebrBE)}</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandPppBE)}</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandTotalBE)}</td>

                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandGbsExp)}</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandIebrExp)}</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandIebrPct)}</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandPppExp)}</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandPppPct)}</td>
                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black">{fmt(grandTotalExp)}</td>

                  <td className="p-2.5 border border-[#5c2d2d] text-right font-black underline">{fmt(grandTotalPct)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
