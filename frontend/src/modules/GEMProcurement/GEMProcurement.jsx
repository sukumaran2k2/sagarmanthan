import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Coins,
  Calendar,
  Edit,
  ShoppingBag,
  Wrench,
  Briefcase,
} from "lucide-react";

import InternalNavigation from "../../components/InternalNavigation";
import GEMKpiCards from "./components/GEMKpiCards";
import GEMDataListView from "./components/GEMDataListView";
import GEMAddTargetModal from "./components/GEMAddTargetModal";
import GEMMonthlyDataModal from "./components/GEMMonthlyDataModal";
import GEMReportView from "./components/GEMReportView";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function getLoggedInUser() {
  try {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function GEMProcurementView() {
  const [activeTab, setActiveTab] = useState("total"); // Default tab "total"
  const [viewMode, setViewMode] = useState("ministry"); // "ministry" | "org"
  const [selectedOrgId, setSelectedOrgId] = useState("1");
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [filterYear, setFilterYear] = useState("2026-2027");
  const [filterOrg, setFilterOrg] = useState("");

  const [goodsData, setGoodsData] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [worksData, setWorksData] = useState([]);
  const [totalData, setTotalData] = useState([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Toast State
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("#10B981");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg, color = "#10B981") => {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  useEffect(() => {
    const user = getLoggedInUser();
    if (user) {
      const roleId = Number(user.roleId || user.role_id || user.role);
      const orgId = user.organisationId || user.organisation_id || user.orgId;

      if (roleId === 6 || roleId === 7) {
        setViewMode("org");
        if (orgId) setSelectedOrgId(String(orgId));
      } else {
        setViewMode("ministry");
      }
    }

    fetchOrganisations();
    fetchAllGemData();
  }, []);

  const fetchOrganisations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/data-entry-capex`);
      if (res.data && res.data.organisations) {
        setOrganisations(res.data.organisations);
      } else if (Array.isArray(res.data)) {
        setOrganisations(res.data);
      }
    } catch (err) {
      setOrganisations([
        { organisation_id: 1, organisation_name: "Syama Prasad Mookerjee Port Authority, Kolkata" },
        { organisation_id: 2, organisation_name: "Paradip Port Authority" },
        { organisation_id: 3, organisation_name: "Visakhapatnam Port Authority" },
        { organisation_id: 4, organisation_name: "V.O. Chidambaranar Port Authority" },
        { organisation_id: 5, organisation_name: "Cochin Port Authority" },
        { organisation_id: 6, organisation_name: "New Mangalore Port Authority" },
        { organisation_id: 7, organisation_name: "Mormugao Port Authority" },
        { organisation_id: 8, organisation_name: "Mumbai Port Authority" },
        { organisation_id: 9, organisation_name: "Jawaharlal Nehru Port Authority" },
        { organisation_id: 10, organisation_name: "Deendayal Port Authority" },
      ]);
    }
  };

  const fetchAllGemData = async () => {
    setLoading(true);
    try {
      const userID = 1;
      const [gRes, sRes, wRes, tRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/gem-procurement-goods/${userID}`),
        axios.get(`${API_BASE_URL}/gem-procurement-service/${userID}`),
        axios.get(`${API_BASE_URL}/gem-procurement-work/${userID}`),
        axios.get(`${API_BASE_URL}/gem-procurement-total`),
      ]);

      if (gRes.status === "fulfilled") setGoodsData(gRes.value.data || []);
      if (sRes.status === "fulfilled") setServicesData(sRes.value.data || []);
      if (wRes.status === "fulfilled") setWorksData(wRes.value.data || []);
      if (tRes.status === "fulfilled") setTotalData(tRes.value.data || []);
    } catch (err) {
      console.error("Fetch GeM Data error:", err);
      showToast("❌ Failed to load GeM Procurement dataset", "#EF4444");
    } finally {
      setLoading(false);
    }
  };

  // Map organisation names to total data if missing from backend record
  const processedTotalData = useMemo(() => {
    if (!totalData || totalData.length === 0) {
      // Fallback calculation from goods + services + works if backend total empty
      const map = new Map();
      const processItem = (item) => {
        const orgName = item.organisation_name || "Organisation";
        const fy = item.goods_financial_year || item.service_financial_year || item.works_financial_year || "2026-2027";
        const orgId = item.goods_organisation_id || item.service_organisation_id || item.works_organisation_id || item.organisation_id || "1";
        const key = `${orgId}_${fy}`;

        if (!map.has(key)) {
          map.set(key, {
            organisation_id: orgId,
            organisation_name: orgName,
            goods_financial_year: fy,
            total_procurement_potential: 0,
            eight_months_proportional_target: 0,
            total_procurement_through_gem: 0,
            total_procurement_outside_gem: 0,
          });
        }

        const entry = map.get(key);
        entry.total_procurement_potential += Number(item.goods_procurement_potential || item.service_procurement_potential || item.works_procurement_potential || 0);
        entry.eight_months_proportional_target += Number(item.eight_months_proportional_target || 0);
        entry.total_procurement_through_gem += Number(item.procurement_through_gem || item.total_gem || 0);
        entry.total_procurement_outside_gem += Number(item.procurement_outside_gem || item.total_outside || 0);
      };

      goodsData.forEach(processItem);
      servicesData.forEach(processItem);
      worksData.forEach(processItem);

      return Array.from(map.values());
    }

    return totalData.map((row) => {
      const orgId = row.common_organisation_id || row.organisation_id;
      const orgObj = organisations.find((o) => String(o.organisation_id || o.id) === String(orgId));
      const orgName = row.organisation_name || (orgObj ? orgObj.organisation_name || orgObj.name : `Organisation ${orgId}`);

      return {
        ...row,
        organisation_id: orgId,
        organisation_name: orgName,
        goods_financial_year: row.common_financial_year || row.financial_year || row.goods_financial_year || "2026-2027",
        goods_procurement_potential: Number(row.total_procurement_potential || row.planned_procurement || 0),
        eight_months_proportional_target: Number(row.eight_months_proportional_target || row.proportional_target || 0),
        procurement_through_gem: Number(row.total_procurement_through_gem || row.procurement_through_gem || 0),
        procurement_outside_gem: Number(row.total_procurement_outside_gem || row.procurement_outside_gem || 0),
      };
    });
  }, [totalData, goodsData, servicesData, worksData, organisations]);

  const currentCategoryData = useMemo(() => {
    if (activeTab === "goods") return goodsData;
    if (activeTab === "services") return servicesData;
    if (activeTab === "works") return worksData;

    // Total tab returns processed total dataset
    return processedTotalData;
  }, [activeTab, goodsData, servicesData, worksData, processedTotalData]);

  const selectedOrgObj = useMemo(() => {
    return organisations.find((o) => String(o.organisation_id || o.id) === String(selectedOrgId));
  }, [organisations, selectedOrgId]);

  const filteredData = useMemo(() => {
    let result = currentCategoryData;

    if (viewMode === "org" && selectedOrgId) {
      result = result.filter(
        (row) =>
          String(row.goods_organisation_id || row.service_organisation_id || row.works_organisation_id || row.common_organisation_id || row.organisation_id) === String(selectedOrgId) ||
          (selectedOrgObj &&
            String(row.organisation_name || "").toLowerCase().includes(
              String(selectedOrgObj.organisation_name || selectedOrgObj.name || "").toLowerCase()
            ))
      );
    } else if (filterOrg) {
      result = result.filter((row) =>
        String(row.organisation_name || "").toLowerCase().includes(filterOrg.toLowerCase())
      );
    }

    if (filterYear) {
      result = result.filter(
        (row) =>
          String(
            row.goods_financial_year || row.service_financial_year || row.works_financial_year || row.common_financial_year || ""
          ).trim() === filterYear.trim()
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val || "").toLowerCase().includes(term)
        )
      );
    }

    return result;
  }, [currentCategoryData, viewMode, selectedOrgId, selectedOrgObj, filterYear, filterOrg, searchTerm]);

  const [visibleCols, setVisibleCols] = useState({
    "Sl.No": true,
    "Organisation": true,
    "Financial Year": true,
    "Planned Total Procurement": true,
    "5 Months Proportional Target": true,
    "Procurement Through GEM": true,
    "Procurement Outside GEM": true,
    "Last Updated Date": true,
    "Update": true,
  });

  const colDefs = useMemo(() => {
    const allDefs = [
      {
        headerName: "Sl.No",
        key: "Sl.No",
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : 1),
        flex: 0.6,
        minWidth: 70,
        pinned: "left",
        cellClass: "font-bold text-slate-500 text-center flex items-center justify-center",
        hide: visibleCols["Sl.No"] === false,
      },
      {
        field: "organisation_name",
        headerName: "Organisation",
        key: "Organisation",
        flex: 2,
        minWidth: 220,
        cellClass: "font-bold text-slate-800 text-left flex items-center",
        hide: visibleCols["Organisation"] === false,
        valueGetter: (params) => {
          if (!params.data) return "—";
          if (params.data.organisation_name) return params.data.organisation_name;
          if (params.data.Organisation_Name) return params.data.Organisation_Name;
          if (params.data.org_name) return params.data.org_name;
          if (params.data.name) return params.data.name;

          const orgId =
            params.data.common_organisation_id ||
            params.data.goods_organisation_id ||
            params.data.service_organisation_id ||
            params.data.works_organisation_id ||
            params.data.organisation_id ||
            params.data.capex_organisation_id ||
            params.data.org_id ||
            params.data.id;

          const foundOrg = organisations.find(
            (o) => String(o.organisation_id || o.id) === String(orgId)
          );
          return foundOrg ? foundOrg.organisation_name || foundOrg.name : "—";
        },
      },
      {
        headerName: "Financial Year",
        key: "Financial Year",
        flex: 1.2,
        minWidth: 130,
        cellClass: "font-semibold text-slate-700 text-center flex items-center justify-center",
        hide: visibleCols["Financial Year"] === false,
        valueGetter: (params) =>
          params.data.goods_financial_year ||
          params.data.service_financial_year ||
          params.data.works_financial_year ||
          params.data.common_financial_year ||
          "2026-2027",
      },
      {
        headerName: "Planned Total Procurement (In Crore)",
        key: "Planned Total Procurement",
        flex: 2,
        minWidth: 220,
        cellClass: "font-black text-[#0f417a] text-center flex items-center justify-center",
        hide: visibleCols["Planned Total Procurement"] === false,
        valueGetter: (params) => {
          const val =
            params.data.goods_procurement_potential ||
            params.data.service_procurement_potential ||
            params.data.works_procurement_potential ||
            params.data.total_procurement_potential ||
            params.data.planned_procurement ||
            0;
          return Number(val).toFixed(2);
        },
      },
      {
        headerName: "5 Months Proportional Target",
        key: "5 Months Proportional Target",
        flex: 1.8,
        minWidth: 180,
        cellClass: "font-bold text-sky-700 text-center flex items-center justify-center",
        hide: visibleCols["5 Months Proportional Target"] === false,
        valueGetter: (params) => {
          const planned =
            params.data.goods_procurement_potential ||
            params.data.service_procurement_potential ||
            params.data.works_procurement_potential ||
            params.data.total_procurement_potential ||
            params.data.planned_procurement ||
            0;
          const propVal =
            params.data.five_months_proportional_target ||
            params.data.eight_months_proportional_target ||
            params.data.proportional_target ||
            (Number(planned) / 12) * 5;
          return Number(propVal).toFixed(3);
        },
      },
      {
        headerName: "Procurement Through GEM (In Crore)",
        key: "Procurement Through GEM",
        flex: 2,
        minWidth: 200,
        cellClass: `font-black text-emerald-700 text-center flex items-center justify-center ${
          activeTab !== "total" ? "cursor-pointer hover:underline" : ""
        }`,
        hide: visibleCols["Procurement Through GEM"] === false,
        cellRenderer: (params) => {
          const val =
            params.data?.total_procurement_through_gem ??
            params.data?.procurement_through_gem ??
            params.data?.total_gem ??
            0;
          if (activeTab === "total") {
            return <span>₹{Number(val).toFixed(2)}</span>;
          }
          return (
            <div
              onClick={() => {
                setSelectedRecord(params.data);
                setIsMonthlyModalOpen(true);
              }}
              className="text-emerald-700 font-black underline cursor-pointer flex items-center justify-center gap-1.5"
              title="Click to update monthly GeM realizations"
            >
              <span>₹{Number(val).toFixed(2)}</span>
            </div>
          );
        },
      },
      {
        headerName: "Procurement Outside GEM (In Crore)",
        key: "Procurement Outside GEM",
        flex: 2,
        minWidth: 200,
        cellClass: "font-bold text-slate-700 text-center flex items-center justify-center",
        hide: visibleCols["Procurement Outside GEM"] === false,
        valueGetter: (params) => {
          const val =
            params.data?.total_procurement_outside_gem ??
            params.data?.procurement_outside_gem ??
            params.data?.total_outside ??
            0;
          return Number(val).toFixed(2);
        },
      },
      {
        field: "updated_date",
        headerName: "Last Updated Date",
        key: "Last Updated Date",
        flex: 1.4,
        minWidth: 140,
        cellClass: "text-slate-600 font-semibold text-center flex items-center justify-center",
        hide: visibleCols["Last Updated Date"] === false,
        valueGetter: (params) => {
          const date =
            params.data.updated_date ||
            params.data.last_updated_date ||
            params.data.updated_at ||
            params.data.created_at;
          return date ? String(date).slice(0, 10) : "--";
        },
      },
    ];

    if (activeTab !== "total") {
      allDefs.push({
        headerName: "Update",
        key: "Update",
        flex: 1,
        minWidth: 90,
        cellClass: "text-center flex items-center justify-center",
        hide: visibleCols["Update"] === false,
        cellRenderer: (params) => (
          <button
            onClick={() => {
              setSelectedRecord(params.data);
              setIsMonthlyModalOpen(true);
            }}
            className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition cursor-pointer shadow-xs flex items-center justify-center"
            title="Edit Procurement Realization"
          >
            <Edit size={14} />
          </button>
        ),
      });
    }

    let finalDefs = allDefs.filter((col) => !col.hide);
    if (viewMode === "org") {
      finalDefs = finalDefs.filter((col) => col.field !== "organisation_name");
    }
    return finalDefs;
  }, [organisations, activeTab, visibleCols, viewMode]);

  const pinnedBottomRowData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    let plannedSum = 0;
    let targetSum = 0;
    let gemSum = 0;
    let outsideSum = 0;

    filteredData.forEach((row) => {
      plannedSum += Number(row.goods_procurement_potential || row.service_procurement_potential || row.works_procurement_potential || row.total_procurement_potential || row.planned_procurement) || 0;
      targetSum += Number(row.eight_months_proportional_target || row.proportional_target) || 0;
      gemSum += Number(row.procurement_through_gem || row.total_procurement_through_gem || row.total_gem) || 0;
      outsideSum += Number(row.procurement_outside_gem || row.total_procurement_outside_gem || row.total_outside) || 0;
    });

    return [
      {
        isSummaryRow: true,
        organisation_name: "Total",
        goods_financial_year: "Total Summary",
        planned_procurement: plannedSum,
        proportional_target: targetSum,
        procurement_through_gem: gemSum,
        procurement_outside_gem: outsideSum,
      },
    ];
  }, [filteredData]);

  const handleAddSubmit = async (payload) => {
    let endpoint = `${API_BASE_URL}/gem-procurement-goods`;
    if (activeTab === "services") endpoint = `${API_BASE_URL}/gem-procurement-service`;
    if (activeTab === "works") endpoint = `${API_BASE_URL}/gem-procurement-work`;

    const body = {
      userID: 1,
      financialYear: payload.financialYear,
      organisationId: payload.organisationId,
      [`${activeTab === "works" ? "works" : activeTab === "services" ? "service" : "goods"}ProcurementPotential`]: payload.plannedPotential,
    };

    try {
      const res = await axios.post(endpoint, body);
      if (res.status === 201 || res.status === 200) {
        showToast(`✅ GeM ${activeTab} target allocation added successfully!`, "#10B981");
        fetchAllGemData();
      }
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.message || `Failed to add GeM ${activeTab} target.`;
      showToast(`❌ ${serverMsg}`, "#EF4444");
      throw new Error(serverMsg);
    }
  };

  const handleCopyData = () => {
    if (!filteredData || filteredData.length === 0) return;
    const text = filteredData
      .map(
        (r) =>
          `${r.organisation_name || ""}\tGeM:${r.procurement_through_gem || r.total_procurement_through_gem || 0}\tOutside:${r.procurement_outside_gem || r.total_procurement_outside_gem || 0}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    showToast("📋 GeM Procurement data copied to clipboard!", "#10B981");
  };

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GeM_Procurement");
    XLSX.writeFile(wb, `GeM_Procurement_${activeTab}.xlsx`);
    showToast("📊 GeM data exported to Excel!", "#10B981");
  };

  const handleExportPdf = () => {
    showToast("📄 PDF export ready. Print via browser dialog.", "#3B82F6");
    window.print();
  };

  const categoryTitleCap = activeTab === "total" ? "Total GEM Procurements" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast popup */}
      {toastVisible && (
        <div
          className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-white font-bold text-xs shadow-xl transition-all duration-300 flex items-center space-x-2 animate-bounce select-none"
          style={{ backgroundColor: toastColor }}
        >
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Title & Subtitle with InternalNavigation on heading line */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            GeM Procurement
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Track Government e-Marketplace (GeM) procurement targets, proportional monthly realizations, and compliance across Goods, Services, and Works.
          </p>
        </div>

        <InternalNavigation
          tabs={
            viewMode === "org"
              ? [
                  { id: "total", label: "Total", icon: Coins },
                  { id: "goods", label: "Goods", icon: ShoppingBag },
                  { id: "services", label: "Services", icon: Briefcase },
                  { id: "works", label: "Works", icon: Wrench },
                ]
              : [
                  { id: "total", label: "Total", icon: Coins },
                  { id: "goods", label: "Goods", icon: ShoppingBag },
                  { id: "services", label: "Services", icon: Briefcase },
                  { id: "works", label: "Works", icon: Wrench },
                  { id: "report", label: "Report", icon: Calendar },
                ]
          }
          currentTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
        />
      </div>

      {/* Main Content Area */}
      {["total", "goods", "services", "works"].includes(activeTab) && (
        <>
          <GEMKpiCards data={filteredData} activeCategory={categoryTitleCap} />
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <GEMDataListView
              categoryTitle={categoryTitleCap}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              pageSize={pageSize}
              setPageSize={setPageSize}
              filteredData={filteredData}
              colDefs={colDefs}
              pinnedBottomRowData={pinnedBottomRowData}
              loading={loading}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              handleCopyData={handleCopyData}
              handleExportExcel={handleExportExcel}
              handleExportPdf={handleExportPdf}
              organisations={organisations}
              filterYear={filterYear}
              setFilterYear={setFilterYear}
              visibleCols={visibleCols}
              setVisibleCols={setVisibleCols}
              filterOrg={filterOrg}
              setFilterOrg={setFilterOrg}
              viewMode={viewMode}
            />
          </div>
        </>
      )}

      {activeTab === "report" && <GEMReportView showToast={showToast} />}

      {/* Modals */}
      <GEMAddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        organisations={organisations}
        categoryTitle={categoryTitleCap}
        existingData={activeTab === "goods" ? goodsData : activeTab === "services" ? servicesData : worksData}
      />

      <GEMMonthlyDataModal
        isOpen={isMonthlyModalOpen}
        onClose={() => setIsMonthlyModalOpen(false)}
        record={selectedRecord}
        categoryType={activeTab === "works" ? "work" : activeTab === "services" ? "service" : "goods"}
        showToast={showToast}
      />
    </div>
  );
}
