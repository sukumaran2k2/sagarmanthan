import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { fetchGemReport } from "../api";
import { getGemReportAsOnMeta } from "../utils/gemUtils";

export default function GEMReportView({ showToast, viewMode = 'ministry' }) {
  const [selectedYear, setSelectedYear] = useState("2026-2027");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [orgFilter, setOrgFilter] = useState("ALL");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const fetchReportData = useCallback(
    async (fy) => {
      setLoading(true);
      try {
        const res = await fetchGemReport(fy);
        if (res.data && res.data.gemReport) {
          setReportData(res.data.gemReport);
        } else if (Array.isArray(res.data)) {
          setReportData(res.data);
        } else {
          setReportData([]);
        }
      } catch (err) {
        console.warn("GeM Report API error:", err.message);
        showToast?.("❌ Failed to load GEM report", "#EF4444");
        setReportData([]);
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReportData(selectedYear);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchReportData, selectedYear]);

  const uniqueGroupList = useMemo(() => {
    const groups = reportData
      .map((r) => r.display_group)
      .filter((name) => name && name.trim() !== "");
    return Array.from(new Set(groups)).sort();
  }, [reportData]);

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

  const reportMeta = useMemo(() => getGemReportAsOnMeta(selectedYear), [selectedYear]);

  let totalGoodsPlanned = 0, totalServicePlanned = 0, totalWorksPlanned = 0, totalGrandPlanned = 0;
  let totalGoodsGem = 0, totalServiceGem = 0, totalWorksGem = 0, totalGrandGem = 0, totalOutsideGem = 0;

  filteredData.forEach((r) => {
    const gp = Number(r.goods_procurement_potential) || 0;
    const sp = Number(r.service_procurement_potential) || 0;
    const wp = Number(r.works_procurement_potential) || 0;
    const planTot = Number(r.planned_procurement) || 0;

    const gg = Number(r.products) || 0;
    const sg = Number(r.services) || 0;
    const wg = Number(r.works) || 0;
    const actTot = Number(r.grand_total) || 0;
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

  let serialNo = 1;

  return (
    <div className="space-y-6 animate-fade-in select-none">
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
              <span>As on date: <strong style={{ color: "#4b2424" }}>{reportMeta.asOnDateStr}</strong></span>
              <span style={{ color: "#eadede" }}>•</span>
              <span>{reportMeta.reportPeriodLabel} — <strong style={{ color: "#4b2424" }}>{reportMeta.reportPeriodValue}</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

              {viewMode !== 'org' && (
                <>
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
                      {uniqueGroupList.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </div>

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
                </>
              )}

            </div>

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

      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #d7c4b7", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 260px)", minHeight: "400px", position: "relative" }}>
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 40,
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#4b2424" }}>
                Loading report...
              </span>
            </div>
          )}
          <table id="gemReportTable" style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 30, background: "#4b2424", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <tr style={{ background: "#4b2424", color: "#fff", textAlign: "center", fontWeight: 800 }}>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d", width: "48px" }} rowSpan={2}>S.No</th>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d", minWidth: "240px" }} rowSpan={2}>Organization Name</th>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d" }} colSpan={4}>
                  Planned Procurement through GeM {selectedYear}
                </th>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d" }} colSpan={4}>
                  Actual Procurement through GeM {reportMeta.tableUptoDateStr}
                </th>
                <th style={{ padding: "10px", border: "1px solid #5c2d2d", minWidth: "140px" }} rowSpan={2}>Procurement outside GeM</th>
              </tr>
              <tr style={{ background: "#5c2d2d", color: "#fff", textAlign: "center", fontWeight: 800 }}>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>Products</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>Services</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>Works</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>Grand Total</th>

                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>Products</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>Services</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>Works</th>
                <th style={{ padding: "8px", border: "1px solid #6e3939" }}>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => {
                const groupName = row.display_group;
                const prevGroupName = idx > 0 ? filteredData[idx - 1]?.display_group : null;
                const showGroupHeader = viewMode !== 'org' && Boolean(groupName && groupName !== prevGroupName);

                const gp = Number(row.goods_procurement_potential || 0);
                const sp = Number(row.service_procurement_potential || 0);
                const wp = Number(row.works_procurement_potential || 0);
                const planTot = Number(row.planned_procurement || 0);

                const gg = Number(row.products || 0);
                const sg = Number(row.services || 0);
                const wg = Number(row.works || 0);
                const actTot = Number(row.grand_total || 0);
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
            {viewMode !== 'org' && (
              <tfoot>
                <tr style={{ background: "#f5eeea", color: "#4b2424", fontWeight: 900, textAlign: "center", borderTop: "2px solid #4b2424" }}>
                  <td style={{ padding: "10px", border: "1px solid #d7c4b7" }} colSpan={2}>Grand Total</td>
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
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
