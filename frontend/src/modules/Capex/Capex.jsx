import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Download, Edit, Calendar, Plus, RefreshCw, Layers, LayoutDashboard, FilePieChart } from "lucide-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

import CapexKpiCards from "./components/CapexKpiCards";
import CapexDataListView from "./components/CapexDataListView";
import CapexAddTargetModal from "./components/CapexAddTargetModal";
import CapexEditTargetModal from "./components/CapexEditTargetModal";
import CapexMonthlyDataModal from "./components/CapexMonthlyDataModal";
import CapexForm32Report from "./components/CapexForm32Report";
import CapexDashboardView from "./components/CapexDashboardView";
import CapexOrgDashboardView from "./components/CapexOrgDashboardView";
import InternalNavigation from "../../components/InternalNavigation";

import { formatCurrencyINR, calculateCapexExpenditurePercentage } from "./utils/capexUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

ModuleRegistry.registerModules([AllCommunityModule]);

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

export default function CapexView() {
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard", "data", "report"
  const [viewMode, setViewMode] = useState("ministry"); // "ministry" | "org"
  const [selectedOrgId, setSelectedOrgId] = useState("1");
  const [capexData, setCapexData] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [selectedYear, setSelectedYear] = useState("2026-2027");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

      // Role 6 & 7 are Organization Senior Officer and Nodal Officer
      if (roleId === 6 || roleId === 7) {
        setViewMode("org");
        if (orgId) {
          setSelectedOrgId(String(orgId));
        }
      } else {
        setViewMode("ministry");
      }
    }
    fetchCapexData();
    fetchOrganisations();
  }, []);

  const fetchCapexData = async () => {
    setLoading(true);
    try {
      const userID = 1; // Admin default
      const res = await axios.get(`${API_BASE_URL}/capex/${userID}`);
      setCapexData(res.data || []);
    } catch (err) {
      console.error("Fetch Capex data error:", err);
      showToast("❌ Failed to load Capex data from server", "#EF4444");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganisations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/data-entry-capex`);
      if (res.data && res.data.organisations) {
        setOrganisations(res.data.organisations);
      } else if (Array.isArray(res.data)) {
        setOrganisations(res.data);
      }
    } catch (err) {
      console.warn("Organisations fetch fallback:", err.message);
      // Default fallback port organizations
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
        { organisation_id: 11, organisation_name: "Inland Waterways Authority of India (IWAI)" },
      ]);
    }
  };

  const handleAddSubmit = async (payload) => {
    const userID = 1;
    const body = { userID, ...payload };
    const res = await axios.post(`${API_BASE_URL}/capex`, body);
    if (res.status === 201 || res.status === 200) {
      showToast("✅ Capex target submitted successfully!", "#10B981");
      fetchCapexData();
    }
  };

  const [filterYear, setFilterYear] = useState("2026-2027");
  const [filterOrg, setFilterOrg] = useState("");

  const handleEditSubmit = async (payload) => {
    const res = await axios.post(`${API_BASE_URL}/capex-edit`, payload);
    if (res.status === 200) {
      showToast("✅ Capex planned expense target updated!", "#10B981");
      fetchCapexData();
    }
  };

  const selectedOrgObj = useMemo(() => {
    return organisations.find((o) => String(o.organisation_id || o.id) === String(selectedOrgId));
  }, [organisations, selectedOrgId]);

  const filteredData = useMemo(() => {
    let result = capexData;

    if (viewMode === "org" && selectedOrgId) {
      result = result.filter(
        (row) =>
          String(row.capex_organisation_id) === String(selectedOrgId) ||
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
        (row) => String(row.capex_financial_year || "").trim() === filterYear.trim()
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
  }, [capexData, viewMode, selectedOrgId, selectedOrgObj, filterYear, filterOrg, searchTerm]);

  const colDefs = useMemo(() => {
    const allDefs = [
      {
        headerName: "S.No",
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : 1),
        flex: 0.6,
        minWidth: 70,
        pinned: "left",
        cellClass: "font-bold text-slate-500 text-center flex items-center justify-center",
      },
      {
        field: "organisation_name",
        headerName: "Organisation",
        flex: 2,
        minWidth: 220,
        cellClass: "font-bold text-slate-800 text-left flex items-center",
        valueGetter: (params) =>
          params.data.organisation_name || params.data.Organisation_Name || "Organisation",
      },
      {
        field: "capex_financial_year",
        headerName: "Financial Year",
        flex: 1.2,
        minWidth: 130,
        cellClass: "font-semibold text-slate-700 text-center flex items-center justify-center",
        valueFormatter: (params) => (params.value ? String(params.value).replace(/,/g, "") : "—"),
      },
      {
        field: "capex_total_value",
        headerName: "Total Planned Expenditure (In Crore)",
        flex: 2,
        minWidth: 220,
        cellClass: "font-black text-[#0f417a] text-center flex items-center justify-center",
        valueFormatter: (params) => (params.value !== undefined && params.value !== null ? Number(params.value).toFixed(2) : "0.00"),
      },
      {
        field: "total_capex_expenditure",
        headerName: "Actual Expenditure (In Crore)",
        flex: 2,
        minWidth: 200,
        cellClass: "font-black text-blue-700 text-center flex items-center justify-center cursor-pointer hover:underline",
        cellRenderer: (params) => (
          <div
            onClick={() => {
              setSelectedRecord(params.data);
              setIsMonthlyModalOpen(true);
            }}
            className="text-blue-700 font-black underline cursor-pointer flex items-center justify-center gap-1.5"
            title="Click to view/edit monthly expenditure breakdown"
          >
            <span>{params.value !== undefined && params.value !== null ? Number(params.value).toFixed(2) : "0.00"}</span>
          </div>
        ),
      },
      {
        headerName: "% Expenditure Of BE",
        flex: 1.5,
        minWidth: 160,
        cellClass: "font-bold text-slate-800 text-center flex items-center justify-center",
        valueGetter: (params) => {
          if (!params.data) return "0.00";
          const pct = calculateCapexExpenditurePercentage(
            params.data.total_capex_expenditure,
            params.data.capex_total_value
          );
          return `${pct}`;
        },
      },
      {
        field: "updated_date",
        headerName: "Last Updated Date",
        flex: 1.5,
        minWidth: 150,
        cellClass: "text-slate-600 font-semibold text-center flex items-center justify-center",
        valueGetter: (params) =>
          params.data.updated_date
            ? String(params.data.updated_date).slice(0, 10)
            : "—",
      },
      {
        headerName: "Update",
        flex: 1,
        minWidth: 90,
        cellClass: "text-center flex items-center justify-center",
        cellRenderer: (params) => (
          <button
            onClick={() => {
              setSelectedRecord(params.data);
              setIsMonthlyModalOpen(true);
            }}
            className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition cursor-pointer shadow-xs flex items-center justify-center"
            title="Edit Expenditure"
          >
            <Edit size={14} />
          </button>
        ),
      },
    ];

    // Hide Organisation column for Organization View
    if (viewMode === "org") {
      return allDefs.filter((col) => col.field !== "organisation_name");
    }
    return allDefs;
  }, [viewMode]);

  const pinnedBottomRowData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    let plannedSum = 0;
    let actualSum = 0;
    filteredData.forEach((row) => {
      plannedSum += Number(row.capex_total_value) || 0;
      actualSum += Number(row.total_capex_expenditure) || 0;
    });
    const pctSum = calculateCapexExpenditurePercentage(actualSum, plannedSum);

    return [
      {
        isSummaryRow: true,
        organisation_name: "Total",
        capex_financial_year: "Total Summary",
        capex_total_value: plannedSum,
        total_capex_expenditure: actualSum,
        expenditure_percentage: pctSum,
      },
    ];
  }, [filteredData]);

  // Export handlers
  const handleCopyData = () => {
    if (!filteredData || filteredData.length === 0) return;
    const text = filteredData
      .map(
        (r) =>
          `${r.organisation_name || ""}\t${r.capex_financial_year || ""}\t${r.capex_total_value || 0}\t${r.total_capex_expenditure || 0}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    showToast("📋 Capex table data copied to clipboard!", "#10B981");
  };

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Capex_Data");
    XLSX.writeFile(wb, "Capex_Data_List.xlsx");
    showToast("📊 Capex data exported to Excel!", "#10B981");
  };

  const handleExportPdf = () => {
    showToast("📄 PDF export ready. Print via browser dialog.", "#3B82F6");
    window.print();
  };

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
            Capex Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Monitor Capital Expenditure allocations (GBS, Internal Resources, PPP) and track monthly target realizations across major port authorities.
          </p>
        </div>

        <InternalNavigation
          tabs={
            viewMode === "org"
              ? [
                  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                  { id: "data", label: "Datalist", icon: Layers },
                ]
              : [
                  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                  { id: "data", label: "Datalist", icon: Layers },
                  { id: "report", label: "Report", icon: Calendar },
                ]
          }
          currentTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
        />
      </div>



      {/* Main Content Area */}
      {activeTab === "dashboard" && (
        viewMode === "ministry" ? (
          <CapexDashboardView showToast={showToast} />
        ) : (
          <CapexOrgDashboardView
            organisations={organisations}
            selectedOrgId={selectedOrgId}
            setSelectedOrgId={setSelectedOrgId}
            showToast={showToast}
          />
        )
      )}

      {activeTab === "data" && (
        <>
          <CapexKpiCards data={filteredData} />
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <CapexDataListView
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
              filterOrg={filterOrg}
              setFilterOrg={setFilterOrg}
              viewMode={viewMode}
            />
          </div>
        </>
      )}

      {activeTab === "report" && <CapexForm32Report showToast={showToast} />}

      {/* Modals */}
      <CapexAddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        organisations={organisations}
      />

      <CapexEditTargetModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleEditSubmit}
        initialRecord={selectedRecord}
      />

      <CapexMonthlyDataModal
        isOpen={isMonthlyModalOpen}
        onClose={() => setIsMonthlyModalOpen(false)}
        capexRecord={selectedRecord}
        showToast={showToast}
      />
    </div>
  );
}
