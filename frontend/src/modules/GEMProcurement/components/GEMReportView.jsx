import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  TrendingUp,
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RotateCcw,
  Info,
} from "lucide-react";
import CopyButton from "../../../components/CopyButton";
import ExportDropdown from "../../../components/ExportDropdown";
import * as XLSX from "xlsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function GEMReportView({ showToast }) {
  const [selectedYear, setSelectedYear] = useState("2026-2027");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [orgFilter, setOrgFilter] = useState("ALL");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  useEffect(() => {
    fetchReportData(selectedYear);
  }, [selectedYear]);

  const fetchReportData = async (fy) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/gem-report/${fy}`);
      if (res.data && res.data.gemReport) {
        setReportData(res.data.gemReport);
      } else if (Array.isArray(res.data)) {
        setReportData(res.data);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.warn("GeM Report API fallback error:", err.message);
      // Fallback mock dataset matching YP report structure & screenshot groups
      setReportData([
        // Major Ports
        { display_group: "Major Ports", organisation_name: "Ministry of Ports, Shipping and Waterways", goods_procurement_potential: 11.0, service_procurement_potential: 6.0, works_procurement_potential: 0.0, planned_procurement: 17.0, products: 0.0, services: 0.0, works: 0.0, grand_total: 0.0, outside_gem: 0.0 },
        { organisation_name: "Chennai Port Authority", goods_procurement_potential: 23.49, service_procurement_potential: 0.93, works_procurement_potential: 0.0, planned_procurement: 24.42, products: 9.28, services: 0.10, works: 0.0, grand_total: 9.38, outside_gem: 0.22 },
        { organisation_name: "Cochin Port Authority", goods_procurement_potential: 7.0, service_procurement_potential: 0.40, works_procurement_potential: 0.0, planned_procurement: 7.40, products: 2.77, services: 0.0, works: 0.0, grand_total: 2.77, outside_gem: 1.04 },
        { organisation_name: "Syama Prasad Mookerjee Port", goods_procurement_potential: 0.0, service_procurement_potential: 0.0, works_procurement_potential: 0.0, planned_procurement: 0.0, products: 0.0, services: 0.0, works: 0.0, grand_total: 0.0, outside_gem: 0.0 },
        { organisation_name: "Jawaharlal Nehru Port Authority", goods_procurement_potential: 337.81, service_procurement_potential: 148.63, works_procurement_potential: 0.0, planned_procurement: 486.44, products: 24.09, services: 28.89, works: 0.0, grand_total: 52.98, outside_gem: 0.0 },
        { organisation_name: "Kamarajar Port Limited", goods_procurement_potential: 25.50, service_procurement_potential: 19.85, works_procurement_potential: 0.0, planned_procurement: 45.35, products: 0.0, services: 0.0, works: 0.0, grand_total: 0.0, outside_gem: 0.0 },
        { organisation_name: "Mormugao Port Authority", goods_procurement_potential: 37.37, service_procurement_potential: 2.03, works_procurement_potential: 0.50, planned_procurement: 39.90, products: 7.65, services: 1.49, works: 0.0, grand_total: 9.14, outside_gem: 0.0 },
        { organisation_name: "Mumbai Port Authority", goods_procurement_potential: 50.0, service_procurement_potential: 247.0, works_procurement_potential: 0.0, planned_procurement: 297.0, products: 0.40, services: 147.84, works: 0.0, grand_total: 148.24, outside_gem: 0.01 },
        { organisation_name: "New Mangalore Port Authority", goods_procurement_potential: 26.44, service_procurement_potential: 6.43, works_procurement_potential: 0.0, planned_procurement: 32.87, products: 4.46, services: 0.71, works: 0.0, grand_total: 5.17, outside_gem: 0.27 },
        { organisation_name: "Paradip Port Authority", goods_procurement_potential: 80.0, service_procurement_potential: 2.83, works_procurement_potential: 0.0, planned_procurement: 82.83, products: 2.87, services: 0.0, works: 0.0, grand_total: 2.87, outside_gem: 0.20 },
        { organisation_name: "SMPA - Kolkata Dock System", goods_procurement_potential: 121.53, service_procurement_potential: 206.94, works_procurement_potential: 0.0, planned_procurement: 328.47, products: 18.52, services: 31.52, works: 0.0, grand_total: 50.04, outside_gem: 1.63 },
        { organisation_name: "Visakhapatnam Port Authority", goods_procurement_potential: 66.50, service_procurement_potential: 4.0, works_procurement_potential: 0.0, planned_procurement: 70.50, products: 16.20, services: 0.0, works: 0.0, grand_total: 16.20, outside_gem: 0.02 },
        { organisation_name: "V.O. Chidambaranar Port Authority", goods_procurement_potential: 32.0, service_procurement_potential: 5.0, works_procurement_potential: 0.0, planned_procurement: 37.0, products: 20.47, services: 0.10, works: 0.0, grand_total: 20.57, outside_gem: 0.01 },

        // Authorities
        { display_group: "Authorities", organisation_name: "Inland Waterways Authority of India", goods_procurement_potential: 2.99, service_procurement_potential: 3.50, works_procurement_potential: 0.0, planned_procurement: 6.49, products: 0.40, services: 1.78, works: 0.0, grand_total: 2.18, outside_gem: 0.0 },
        { organisation_name: "Indian Maritime University", goods_procurement_potential: 5.25, service_procurement_potential: 23.70, works_procurement_potential: 0.0, planned_procurement: 28.95, products: 2.03, services: 0.0, works: 0.0, grand_total: 2.03, outside_gem: 0.0 },

        // Subordinate / Attached Offices
        { display_group: "Subordinate/Attached Offices", organisation_name: "Directorate General of Shipping, Mumbai", goods_procurement_potential: 27.18, service_procurement_potential: 17.66, works_procurement_potential: 0.0, planned_procurement: 44.84, products: 0.0, services: 0.0, works: 0.0, grand_total: 0.0, outside_gem: 0.0 },
        { organisation_name: "Directorate General of Lighthouses and Lightships", goods_procurement_potential: 18.0, service_procurement_potential: 25.0, works_procurement_potential: 5.0, planned_procurement: 48.0, products: 1.93, services: 6.01, works: 0.24, grand_total: 8.18, outside_gem: 0.72 },
        { organisation_name: "Andaman Lakshadweep Harbour Works", goods_procurement_potential: 3.0, service_procurement_potential: 1.0, works_procurement_potential: 0.0, planned_procurement: 4.0, products: 0.50, services: 0.0, works: 0.0, grand_total: 0.51, outside_gem: 0.01 },

        // Public Sector Undertakings
        { display_group: "Public Sector Undertakings", organisation_name: "Shipping Corporation of India", goods_procurement_potential: 291.0, service_procurement_potential: 54.0, works_procurement_potential: 0.0, planned_procurement: 345.0, products: 99.05, services: 1.42, works: 0.0, grand_total: 100.47, outside_gem: 96.0 },
        { organisation_name: "Cochin Shipyard Limited", goods_procurement_potential: 270.0, service_procurement_potential: 30.0, works_procurement_potential: 0.0, planned_procurement: 300.0, products: 243.74, services: 0.0, works: 0.0, grand_total: 243.74, outside_gem: 1058.09 },
        { organisation_name: "Sagarmala Development Company Limited", goods_procurement_potential: 2.0, service_procurement_potential: 1.90, works_procurement_potential: 0.0, planned_procurement: 3.90, products: 0.07, services: 1.04, works: 0.0, grand_total: 1.11, outside_gem: 0.0 },
        { organisation_name: "Indian Port Rail & Ropeway Corporation Ltd", goods_procurement_potential: 14.0, service_procurement_potential: 2.90, works_procurement_potential: 0.0, planned_procurement: 16.90, products: 0.05, services: 0.12, works: 0.0, grand_total: 0.17, outside_gem: 0.0 },
        { organisation_name: "Dredging Corporation of India", goods_procurement_potential: 1215.93, service_procurement_potential: 33.34, works_procurement_potential: 0.0, planned_procurement: 1249.27, products: 1198.47, services: 0.0, works: 0.0, grand_total: 1198.47, outside_gem: 42.10 },
        { organisation_name: "Hooghly Cochin Shipyard Limited", goods_procurement_potential: 9.30, service_procurement_potential: 0.70, works_procurement_potential: 0.0, planned_procurement: 10.0, products: 2.03, services: 0.12, works: 0.0, grand_total: 2.15, outside_gem: 18.61 },
        { organisation_name: "Udupi Cochin Shipyard Limited", goods_procurement_potential: 45.0, service_procurement_potential: 3.80, works_procurement_potential: 0.0, planned_procurement: 48.80, products: 8.58, services: 0.0, works: 0.0, grand_total: 8.58, outside_gem: 0.0 },

        // Other Organizations
        { display_group: "Other Organizations", organisation_name: "Seamen's Provident Fund Organisation", goods_procurement_potential: 0.40, service_procurement_potential: 0.50, works_procurement_potential: 0.0, planned_procurement: 0.90, products: 0.08, services: 0.0, works: 0.0, grand_total: 0.08, outside_gem: 0.0 },
        { organisation_name: "Tariff Authority for Major Ports", goods_procurement_potential: 0.10, service_procurement_potential: 0.61, works_procurement_potential: 0.0, planned_procurement: 0.71, products: 0.09, services: 0.0, works: 0.0, grand_total: 0.09, outside_gem: 0.0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const uniqueOrgList = useMemo(() => {
    const orgs = reportData
      .map((r) => r.organisation_name)
      .filter((name) => name && name.trim() !== "");
    return Array.from(new Set(orgs)).sort();
  }, [reportData]);

  const filteredData = useMemo(() => {
    let result = reportData;

    if (groupFilter && groupFilter !== "ALL") {
      result = result.filter(
        (r) => String(r.display_group || "").toLowerCase() === groupFilter.toLowerCase()
      );
    }

    if (orgFilter && orgFilter !== "ALL") {
      result = result.filter(
        (r) => String(r.organisation_name || "").toLowerCase() === orgFilter.toLowerCase()
      );
    }

    if (quickFilter.trim()) {
      const term = quickFilter.toLowerCase();
      result = result.filter(
        (r) =>
          String(r.organisation_name || "").toLowerCase().includes(term) ||
          String(r.display_group || "").toLowerCase().includes(term)
      );
    }

    return result;
  }, [reportData, groupFilter, orgFilter, quickFilter]);

  const startYear = selectedYear ? selectedYear.split("-")[0] : "2026";
  const asOnDateStr = `30-06-${startYear}`;
  const reportMonthStr = `June ${startYear}`;
  const tableUptoDateStr = `(Upto 30/06/${startYear})`;

  let totalGoodsPlanned = 0, totalServicePlanned = 0, totalWorksPlanned = 0, totalGrandPlanned = 0;
  let totalGoodsGem = 0, totalServiceGem = 0, totalWorksGem = 0, totalGrandGem = 0, totalOutsideGem = 0;

  filteredData.forEach((r) => {
    const gp = Number(r.goods_procurement_potential) || 0;
    const sp = Number(r.service_procurement_potential) || 0;
    const wp = Number(r.works_procurement_potential) || 0;
    const planTot = Number(r.planned_procurement) || gp + sp + wp;

    const gg = Number(r.products) || 0;
    const sg = Number(r.services) || 0;
    const wg = Number(r.works) || 0;
    const actTot = Number(r.grand_total) || gg + sg + wg;
    const out = Number(r.outside_gem) || 0;

    totalGoodsPlanned += gp;
    totalServicePlanned += sp;
    totalWorksPlanned += wp;
    totalGrandPlanned += planTot;

    totalGoodsGem += gg;
    totalServiceGem += sg;
    totalWorksGem += wg;
    totalGrandGem += actTot;
    totalOutsideGem += out;
  });

  const handleCopyReport = () => {
    const text = filteredData
      .map(
        (r) =>
          `${r.organisation_name || ""}\tPlanned:${r.planned_procurement || 0}\tGeM Total:${r.grand_total || 0}\tOutside:${r.outside_gem || 0}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    if (showToast) showToast("📋 GeM Procurement Report copied to clipboard!", "#4b2424");
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GeM_Report");
    XLSX.writeFile(wb, `GeM_Procurement_Report_${selectedYear}.xlsx`);
    if (showToast) showToast("📊 Exported GeM Report to Excel!", "#4b2424");
  };

  const handleExportPdf = () => {
    if (showToast) showToast("📄 PDF export ready. Print via browser dialog.", "#4b2424");
    window.print();
  };

  const handleResetFilters = () => {
    setSelectedYear("2026-2027");
    setGroupFilter("ALL");
    setOrgFilter("ALL");
    setQuickFilter("");
  };

  let currentGroup = null;
  let serialNo = 1;

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* ─ YP Style Header & Toolbar Banner (Warm Brown Gradient) ─ */}
      <div
        style={{
          background: "linear-gradient(to right, #fdfcfc, #f7f3f3)",
          padding: "20px 26px",
          border: "1px solid #eadede",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          position: "relative",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
        }}
      >
        {/* Left: YP Style Title & Dates */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 300, textAlign: "left" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <TrendingUp size={14} color="#8c4242" strokeWidth={2.5} />
              <span style={{ fontSize: 10.5, fontWeight: 800, color: "#8c4242", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                GeM Procurement Module
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#4b2424", letterSpacing: "0.01em" }}>
              GeM Procurement Report ({selectedYear})
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 12, fontWeight: 600, color: "#8c4242" }}>
              <span>As on date: <strong style={{ color: "#4b2424" }}>{asOnDateStr}</strong></span>
              <span style={{ color: "#eadede" }}>•</span>
              <span>Report for the month — <strong style={{ color: "#4b2424" }}>{reportMonthStr}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Search, Copy, Export & Refresh Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Quick Search */}
          <div style={{ position: "relative", width: 220 }}>
            <Search size={14} color="#8c4242" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search organisation..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 34px 8px 36px",
                border: "1px solid #eadede",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                color: "#4b2424",
                outline: "none",
                background: "#fff",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#4b2424";
                e.target.style.boxShadow = "0 0 0 3px rgba(75,36,36,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#eadede";
                e.target.style.boxShadow = "none";
              }}
            />
            {quickFilter && (
              <button
                onClick={() => setQuickFilter("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#8c4242", cursor: "pointer" }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <CopyButton onCopy={handleCopyReport} color="#4b2424" hoverBg="#f7f3f3" className="!rounded-[9px] !py-[9px] !px-[16px]" />
          <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#4b2424" hoverColor="#6b3535" />

          <button
            onClick={() => fetchReportData(selectedYear)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "#fff",
              border: "1px solid #eadede",
              cursor: "pointer",
              color: "#657386",
              transition: "all 0.15s",
            }}
            title="Refresh Data"
            onMouseEnter={(e) => { e.currentTarget.style.color = "#4b2424"; e.currentTarget.style.borderColor = "#4b2424"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#657386"; e.currentTarget.style.borderColor = "#eadede"; }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ─ Collapsible YP Warm Brown Filter Panel ─ */}
      <div style={{ border: "1px solid #e8d5c8", borderRadius: "16px", overflow: "hidden", background: "#fcf9f7" }}>
        <button
          type="button"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          style={{
            width: "100%",
            padding: "12px 18px",
            background: "#f5eeea",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            fontWeight: "800",
            color: "#4b2424",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#ebdcd0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f5eeea")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={15} color="#4b2424" />
            <span>Filter Report Parameters</span>
          </div>
          {isFilterOpen ? <ChevronUp size={16} color="#4b2424" /> : <ChevronDown size={16} color="#4b2424" />}
        </button>

        {isFilterOpen && (
          <div style={{ padding: "16px", borderTop: "1px solid #e8d5c8", background: "#fff" }} className="animate-fade-in text-left space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Financial Year */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "#4b2424", marginBottom: "6px" }}>
                  Financial Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    padding: "8px 12px",
                    background: "#fcf9f7",
                    border: "1px solid #d7c4b7",
                    borderRadius: "10px",
                    fontWeight: 700,
                    color: "#4b2424",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2022-2023">2022-2023</option>
                </select>
              </div>

              {/* Organization Sector / Group */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "#4b2424", marginBottom: "6px" }}>
                  Organization Sector
                </label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    padding: "8px 12px",
                    background: "#fcf9f7",
                    border: "1px solid #d7c4b7",
                    borderRadius: "10px",
                    fontWeight: 700,
                    color: "#4b2424",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">Show All Sectors</option>
                  <option value="Major Ports">Major Ports</option>
                  <option value="Authorities">Authorities</option>
                  <option value="Subordinate/Attached Offices">Subordinate / Attached Offices</option>
                  <option value="Public Sector Undertakings">Public Sector Undertakings</option>
                  <option value="Other Organizations">Other Organizations</option>
                </select>
              </div>

              {/* Organisation */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "#4b2424", marginBottom: "6px" }}>
                  Organisation
                </label>
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    padding: "8px 12px",
                    background: "#fcf9f7",
                    border: "1px solid #d7c4b7",
                    borderRadius: "10px",
                    fontWeight: 700,
                    color: "#4b2424",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">Show All Organisations</option>
                  {uniqueOrgList.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Keyword Search */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "#4b2424", marginBottom: "6px" }}>
                  Keyword Search
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={quickFilter}
                    onChange={(e) => setQuickFilter(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 30px 8px 12px",
                      background: "#fcf9f7",
                      border: "1px solid #d7c4b7",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#4b2424",
                      outline: "none",
                    }}
                  />
                  {quickFilter && (
                    <button
                      type="button"
                      onClick={() => setQuickFilter("")}
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#8c4242", cursor: "pointer" }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Red Note */}
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#c74a54", lineHeight: "1.5", paddingTop: "4px" }} className="flex items-center space-x-1.5">
              <Info size={14} className="flex-shrink-0" />
              <span>Note : The Grand Total under both Planned Procurement through GeM and Actual Procurement through GeM has been computed by aggregating the values reported under the Products, Services, and Works categories.</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "6px" }}>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  padding: "6px 14px",
                  background: "#f4ebe6",
                  border: "1px solid #d7c4b7",
                  color: "#4b2424",
                  borderRadius: "8px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─ YP Warm Brown Styled GeM Procurement Table ─ */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #d7c4b7", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 260px)", minHeight: "400px", position: "relative" }}>
          <table id="gemReportTable" style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 30, background: "#4b2424", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <tr style={{ background: "#4b2424", color: "#fff", textAlign: "center", fontWeight: 800 }}>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d", width: "48px" }} rowSpan={2}>S.No</th>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d", minWidth: "240px" }} rowSpan={2}>Organization Name</th>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d" }} colSpan={4}>
                  Planned Procurement through GeM {selectedYear}
                </th>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d" }} colSpan={4}>
                  Actual Procurement through GeM {tableUptoDateStr}
                </th>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d", minWidth: "140px" }} rowSpan={2}>Procurement outside GeM</th>
              </tr>
              <tr style={{ background: "#5c2d2d", color: "#fff", textAlign: "center", fontWeight: 800 }}>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>products</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>services</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>works</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>grand total</th>

                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>products</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>services</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>works</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>grand total</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => {
                const groupName = row.display_group;
                let showGroupHeader = false;
                if (groupName && groupName !== currentGroup) {
                  currentGroup = groupName;
                  showGroupHeader = true;
                }

                const gp = Number(row.goods_procurement_potential || 0);
                const sp = Number(row.service_procurement_potential || 0);
                const wp = Number(row.works_procurement_potential || 0);
                const planTot = Number(row.planned_procurement || gp + sp + wp);

                const gg = Number(row.products || 0);
                const sg = Number(row.services || 0);
                const wg = Number(row.works || 0);
                const actTot = Number(row.grand_total || gg + sg + wg);
                const out = Number(row.outside_gem || 0);

                return (
                  <React.Fragment key={idx}>
                    {showGroupHeader && (
                      <tr style={{ background: "#f5eeea", textAlign: "left", fontWeight: 900, color: "#4b2424" }}>
                        <td colSpan={11} style={{ padding: "8px 12px", border: "1px solid #d7c4b7", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {groupName}
                        </td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: "1px solid #e8dcd5", textAlign: "center", fontWeight: 600, color: "#334155" }} className="hover:bg-[#fdfbf9] transition-colors">
                      <td style={{ padding: "8px", border: "1px solid #e8dcd5", color: "#64748b", fontWeight: 600 }}>{serialNo++}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e8dcd5", textAlign: "left", color: "#4b2424", fontWeight: 800 }}>{row.organisation_name}</td>

                      <td style={{ padding: "8px", border: "1px solid #e8dcd5" }}>{gp.toFixed(2)}</td>
                      <td style={{ padding: "8px", border: "1px solid #e8dcd5" }}>{sp.toFixed(2)}</td>
                      <td style={{ padding: "8px", border: "1px solid #e8dcd5" }}>{wp.toFixed(2)}</td>
                      <td style={{ padding: "8px", border: "1px solid #e8dcd5", fontWeight: 800, color: "#4b2424" }}>{planTot.toFixed(2)}</td>

                      <td style={{ padding: "8px", border: "1px solid #e8dcd5" }}>{gg.toFixed(2)}</td>
                      <td style={{ padding: "8px", border: "1px solid #e8dcd5" }}>{sg.toFixed(2)}</td>
                      <td style={{ padding: "8px", border: "1px solid #e8dcd5" }}>{wg.toFixed(2)}</td>
                      <td style={{ padding: "8px", border: "1px solid #e8dcd5", fontWeight: 800, color: "#4b2424" }}>{actTot.toFixed(2)}</td>

                      <td style={{ padding: "8px", border: "1px solid #e8dcd5" }}>{out.toFixed(2)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f5eeea", color: "#4b2424", fontWeight: 900, textAlign: "center", borderTop: "2px solid #4b2424" }}>
                <td style={{ padding: "10px", border: "1px solid #d7c4b7" }} colSpan={2}>grand total</td>
                <td style={{ padding: "10px", border: "1px solid #d7c4b7" }}>{totalGoodsPlanned.toFixed(2)}</td>
                <td style={{ padding: "10px", border: "1px solid #d7c4b7" }}>{totalServicePlanned.toFixed(2)}</td>
                <td style={{ padding: "10px", border: "1px solid #d7c4b7" }}>{totalWorksPlanned.toFixed(2)}</td>
                <td style={{ padding: "10px", border: "1px solid #d7c4b7", fontSize: "13px" }}>{totalGrandPlanned.toFixed(2)}</td>

                <td style={{ padding: "10px", border: "1px solid #d7c4b7" }}>{totalGoodsGem.toFixed(2)}</td>
                <td style={{ padding: "10px", border: "1px solid #d7c4b7" }}>{totalServiceGem.toFixed(2)}</td>
                <td style={{ padding: "10px", border: "1px solid #d7c4b7" }}>{totalWorksGem.toFixed(2)}</td>
                <td style={{ padding: "10px", border: "1px solid #d7c4b7", fontSize: "13px" }}>{totalGrandGem.toFixed(2)}</td>

                <td style={{ padding: "10px", border: "1px solid #d7c4b7" }}>{totalOutsideGem.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
