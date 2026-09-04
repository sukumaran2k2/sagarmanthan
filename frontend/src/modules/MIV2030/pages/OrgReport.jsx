import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FileText,
  Building2,
  FolderTree,
  BarChart3,
  Layers,
  RefreshCw,
  Search,
  Download,
  ChevronDown,
} from "lucide-react";

import { AgGridReact } from "ag-grid-react";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

import * as XLSX from "xlsx";

import Loader from "../../../components/Loader";
import { getCurrentUserId } from "../../../utils/authSession";

import {
  getMIVOrgWisePerformanceReport,
  getThemeWiseMIVPerformanceReport,
  getCategoryWiseMIVPerformanceReport,
  getSummaryReportOverdueInitiatives,
  detailedReportDelayedOverdueInitiatives,
} from "../api";


/* ============================================================
   REUSABLE AG GRID
   ============================================================ */

const ReportGrid = ({
  rows = [],
  columnDefs = [],
  loading = false,
  height = 520,
}) => {
  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,

    minWidth: 100,

    wrapHeaderText: true,
    autoHeaderHeight: true,

    cellStyle: {
      display: "flex",
      alignItems: "center",
      fontSize: "12px",
    },
  };

  return (
    <>
      <style>
  {`
    /* =====================================================
       AG GRID HEADER - BROWN BACKGROUND
       ===================================================== */

    .ag-theme-miv-report .ag-header {
      background: #4b2424 !important;
    }

    /* Normal column headers */
    .ag-theme-miv-report .ag-header-cell {
      background: #4b2424 !important;
      color: #ffffff !important;
      font-weight: 700 !important;
    }

    /* =====================================================
       HEADER TEXT - WHITE
       ===================================================== */

    .ag-theme-miv-report .ag-header-cell-text {
      color: #ffffff !important;
      font-weight: 700 !important;
    }

    .ag-theme-miv-report .ag-header-cell-label {
      color: #ffffff !important;
    }

    /* =====================================================
       GROUP HEADER
       "Stage wise Initiatives Count"
       ===================================================== */

    .ag-theme-miv-report .ag-header-group-cell {
      background: #4b2424 !important;
      color: #ffffff !important;
    }

    .ag-theme-miv-report .ag-header-group-cell-label {
      color: #ffffff !important;
      justify-content: center !important;
    }

    .ag-theme-miv-report .ag-header-group-text {
      color: #ffffff !important;
      font-weight: 700 !important;
    }

    /* =====================================================
       AG GRID 3-DOT / MENU / FILTER ICONS - WHITE
       ===================================================== */

    .ag-theme-miv-report .ag-header-cell-menu-button {
      color: #ffffff !important;
      opacity: 1 !important;
    }

    .ag-theme-miv-report .ag-header-cell-menu-button .ag-icon {
      color: #ffffff !important;
    }

    .ag-theme-miv-report .ag-header-cell-filter-button {
      color: #ffffff !important;
      opacity: 1 !important;
    }

    .ag-theme-miv-report .ag-header-cell-filter-button .ag-icon {
      color: #ffffff !important;
    }

    /* All AG Grid header icons */
    .ag-theme-miv-report .ag-header .ag-icon {
      color: #ffffff !important;
      fill: #ffffff !important;
    }

    .ag-theme-miv-report .ag-header .ag-header-icon {
      color: #ffffff !important;
      fill: #ffffff !important;
    }

    /* SVG icons */
    .ag-theme-miv-report .ag-header svg {
      color: #ffffff !important;
      fill: #ffffff !important;
      stroke: #ffffff !important;
    }

    /* =====================================================
       HOVER
       ===================================================== */

    .ag-theme-miv-report .ag-header-cell:hover {
      background: #5b2d2d !important;
    }

    .ag-theme-miv-report .ag-header-group-cell:hover {
      background: #5b2d2d !important;
    }
  `}
</style>

      <div
        className="ag-theme-alpine ag-theme-miv-report w-full rounded-md overflow-hidden border border-slate-300"
        style={{
          width: "100%",
          height: `${height}px`,
        }}
      >
        <AgGridReact
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}

          pagination={true}
          paginationPageSize={14}
          paginationPageSizeSelector={[10, 14, 20, 50, 100]}

          animateRows={true}
          suppressCellFocus={true}

          loading={loading}
          overlayNoRowsTemplate="No records found."

          rowHeight={42}
          headerHeight={68}

          suppressMenuHide={false}

          enableCellTextSelection={true}
        />
      </div>
    </>
  );
};


/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function MIVReports({
  triggerNotification,
}) {

  /* ============================================================
     STATE
     ============================================================ */

  const [activeTab, setActiveTab] = useState("1.1");

  const [loading, setLoading] = useState(false);

  const [reportRows, setReportRows] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [showExportMenu, setShowExportMenu] =
    useState(false);

  const exportMenuRef = useRef(null);


  /* ============================================================
     TODAY DATE
     ============================================================ */

  const todayDate = useMemo(() => {
    const d = new Date();

    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  }, []);


  /* ============================================================
     CURRENT MONTH
     ============================================================ */

  const currentMonth = useMemo(() => {
    return new Date().toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, []);


  /* ============================================================
     REPORT CONFIGURATION
     ============================================================ */

  const REPORTS = [
    {
      id: "1.1",
      label: "Report 1.1",
      title:
        "Organisation-wise Performance Ranking Report",
      icon: Building2,
    },
    {
      id: "1.2",
      label: "Report 1.2",
      title:
        "Theme-wise Performance Ranking Report",
      icon: FolderTree,
    },
    {
      id: "1.3",
      label: "Report 1.3",
      title:
        "Category-wise Performance Ranking Report",
      icon: BarChart3,
    },
    {
      id: "1.4",
      label: "Report 1.4",
      title:
        "Summary Report - Delayed / Overdue Initiatives",
      icon: Layers,
    },
    {
      id: "1.5",
      label: "Report 1.5",
      title:
        "Detailed Report - Delayed / Overdue Initiatives",
      icon: FileText,
    },
  ];


  /* ============================================================
     ACTIVE REPORT
     ============================================================ */

  const activeReport = REPORTS.find(
    (report) => report.id === activeTab
  );


  /* ============================================================
     CLOSE EXPORT DROPDOWN WHEN CLICKING OUTSIDE
     ============================================================ */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target)
      ) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);


  /* ============================================================
     GET ROWS FROM API RESPONSE
     ============================================================ */

  const getRowsFromResponse = (response) => {

    if (Array.isArray(response?.data?.rows)) {
      return response.data.rows;
    }

    if (Array.isArray(response?.rows)) {
      return response.rows;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  };


  /* ============================================================
     FETCH CURRENT REPORT
     ============================================================ */

  const fetchCurrentReport = async () => {

    setLoading(true);

    setReportRows([]);

    try {

      const userId =
        getCurrentUserId() || 1;

      let response;


      /* ========================================================
         REPORT 1.1
         ORGANISATION-WISE PERFORMANCE
         ======================================================== */

      if (activeTab === "1.1") {

        response =
          await getMIVOrgWisePerformanceReport(
            userId
          );

        console.log(
          "Report 1.1 API Response:",
          response
        );

        const rows =
          getRowsFromResponse(response);

        const formattedRows =
          rows.map((item, index) => ({
            sno: index + 1,

            organisationId:
              item.OrganisationID ??
              item.OrganisationId ??
              item.organisation_id ??
              item.organisationId ??
              null,

            organisationName:
              item.Organisation ??
              item.OrganisationName ??
              item.organisation_name ??
              item.organisationName ??
              "-",

            totalInitiatives: Number(
              item["Total Initiatives"] ??
                item.TotalInitiatives ??
                item.total_initiatives ??
                item.totalInitiatives ??
                0
            ),

            totalInvestment: Number(
              item["Total Investment (Cr.)"] ??
                item.TotalInvestment ??
                item.total_investment ??
                item.totalInvestment ??
                0
            ),

            completed: Number(
              item["Completed"] ??
                item.Completed ??
                item.completed ??
                0
            ),

            progressOn: Number(
              item["In Progress - On Time"] ??
                item.ProgressOn ??
                item.progress_on ??
                item.progressOn ??
                0
            ),

            progressDelayed: Number(
              item["In Progress - Delayed"] ??
                item.ProgressDelayed ??
                item.progress_delayed ??
                item.progressDelayed ??
                0
            ),

            notStarted: Number(
              item["Not Started"] ??
                item.NotStarted ??
                item.not_started ??
                item.notStarted ??
                0
            ),

            performanceScore:
              item.PerformanceScore ??
              item.performance_score ??
              item.performanceScore ??
              item["Performance Score"] ??
              null,
          }));

        setReportRows(formattedRows);
      }


      /* ========================================================
         REPORT 1.2
         THEME-WISE PERFORMANCE
         ======================================================== */

      else if (activeTab === "1.2") {

        response =
          await getThemeWiseMIVPerformanceReport(
            userId
          );

        console.log(
          "Report 1.2 API Response:",
          response
        );

        const rows =
          getRowsFromResponse(response);

        const formattedRows =
          rows.map((item, index) => ({
            sno: index + 1,

            themeId:
              item.ThemeId ??
              item.theme_id ??
              item.themeId ??
              index + 1,

            themeName:
              item.initiative_name ??
              item.InitiativeName ??
              item.ThemeName ??
              item.theme_name ??
              item.themeName ??
              "-",

            totalInitiatives: Number(
              item["Total Initiatives"] ??
                item.TotalInitiatives ??
                item.total_initiatives ??
                item.totalInitiatives ??
                0
            ),

            totalInvestment: Number(
              item["Total Investment (Cr.)"] ??
                item.TotalInvestment ??
                item.total_investment ??
                item.totalInvestment ??
                0
            ),

            completed: Number(
              item["Completed"] ??
                item.Completed ??
                item.completed ??
                0
            ),

            progressOn: Number(
              item["In Progress - On Time"] ??
                item.ProgressOn ??
                item.progress_on ??
                item.progressOn ??
                0
            ),

            progressDelayed: Number(
              item["In Progress - Delayed"] ??
                item.ProgressDelayed ??
                item.progress_delayed ??
                item.progressDelayed ??
                0
            ),

            notStarted: Number(
              item["Not Started"] ??
                item.NotStarted ??
                item.not_started ??
                item.notStarted ??
                0
            ),

            performanceScore:
              item.PerformanceScore ??
              item.performance_score ??
              item.performanceScore ??
              item["Performance Score"] ??
              null,
          }));

        setReportRows(formattedRows);
      }


      /* ========================================================
         REPORT 1.3
         CATEGORY-WISE PERFORMANCE
         ======================================================== */

      else if (activeTab === "1.3") {

        response =
          await getCategoryWiseMIVPerformanceReport(
            userId
          );

        console.log(
          "Report 1.3 API Response:",
          response
        );

        const rows =
          getRowsFromResponse(response);

        const formattedRows =
          rows.map((item, index) => ({
            sno: index + 1,

            categoryId:
              item.CategoryId ??
              item.CategoryID ??
              item.category_id ??
              item.categoryId ??
              index + 1,

            categoryName:
              item.category ??
              item.Category ??
              item.CategoryName ??
              item.category_name ??
              item.categoryName ??
              "-",

            totalInitiatives: Number(
              item["Total Initiatives"] ??
                item.TotalInitiatives ??
                item.total_initiatives ??
                item.totalInitiatives ??
                0
            ),

            totalInvestment: Number(
              item["Total Investment (Cr.)"] ??
                item.TotalInvestment ??
                item.total_investment ??
                item.totalInvestment ??
                0
            ),

            completed: Number(
              item["Completed"] ??
                item.Completed ??
                item.completed ??
                0
            ),

            progressOn: Number(
              item["In Progress - On Time"] ??
                item.ProgressOn ??
                item.progress_on ??
                item.progressOn ??
                0
            ),

            progressDelayed: Number(
              item["In Progress - Delayed"] ??
                item.ProgressDelayed ??
                item.progress_delayed ??
                item.progressDelayed ??
                0
            ),

            notStarted: Number(
              item["Not Started"] ??
                item.NotStarted ??
                item.not_started ??
                item.notStarted ??
                0
            ),

            performanceScore:
              item.PerformanceScore ??
              item.performance_score ??
              item.performanceScore ??
              item["Performance Score"] ??
              null,
          }));

        setReportRows(formattedRows);
      }


      /* ========================================================
         REPORT 1.4
         SUMMARY - DELAYED / OVERDUE
         ======================================================== */

      else if (activeTab === "1.4") {

        response =
          await getSummaryReportOverdueInitiatives(
            userId
          );

        console.log(
          "Report 1.4 API Response:",
          response
        );

        const rows =
          getRowsFromResponse(response);

        const formattedRows =
          rows.map((item, index) => ({
            sno: index + 1,

            organisationId:
              item.OrganisationId ??
              item.OrganisationID ??
              item.organisation_id ??
              item.organisationId ??
              item.OrgId ??
              null,

            organisationName:
              item.OrganisationName ??
              item.Organisation ??
              item.organisation_name ??
              item.organisationName ??
              "-",

            totalDelayed: Number(
              item.TotalDelayedInitiatives ??
                item.TotalDelayed ??
                item.total_delayed_initiatives ??
                item.totalDelayed ??
                0
            ),

            delayedLess6: Number(
              item.DelayedLess6Months ??
                item.DelayedLessThan6Months ??
                item.Delayed_Under_6_Months ??
                item.delayed_less_than_6_months ??
                item.delayed_less_6_months ??
                item.delayedLess6 ??
                0
            ),

            delayed6To12: Number(
              item.Delayed6To12Months ??
                item.Delayed6_12Months ??
                item.Delayed_6_12_Months ??
                item.delayed_6_12_months ??
                item.delayed6To12 ??
                0
            ),

            severelyDelayed: Number(
              item.SeverelyDelayed ??
                item.SeverelyDelayedMoreThan1Year ??
                item.Severely_Delayed ??
                item.severely_delayed ??
                item.severely_delayed_more_than_1_year ??
                item.severelyDelayed ??
                0
            ),

            totalCost: Number(
              item.TotalCost ??
                item.TotalDelayedCost ??
                item.total_cost ??
                item.totalCost ??
                0
            ),
          }));

        setReportRows(formattedRows);
      }


      /* ========================================================
         REPORT 1.5
         DETAILED - DELAYED / OVERDUE
         ======================================================== */

      else if (activeTab === "1.5") {

        response =
          await detailedReportDelayedOverdueInitiatives(
            userId
          );

        console.log(
          "Report 1.5 API Response:",
          response
        );

        const rows =
          getRowsFromResponse(response);

        const formattedRows =
          rows.map((item, index) => ({
            sno: index + 1,

            organisationId:
              item.OrganisationId ??
              item.OrganisationID ??
              item.organisation_id ??
              item.organisationId ??
              null,

            organisationName:
              item.OrganisationName ??
              item.Organisation ??
              item.organisation_name ??
              item.organisationName ??
              "-",

            initiativeId:
              item.InitiativeId ??
              item.InitiativeID ??
              item.initiative_id ??
              item.initiativeId ??
              "-",

            initiativeName:
              item.InitiativeActivityName ??
              item.InitiativeName ??
              item.initiative_activity_name ??
              item.initiative_name ??
              item.initiativeName ??
              "-",

            category:
              item.Category ??
              item.CategoryName ??
              item.category ??
              item.category_name ??
              item.categoryName ??
              "-",

            totalCost: Number(
              item.TotalCost ??
                item.TotalDelayedCost ??
                item.total_cost ??
                item.totalCost ??
                0
            ),

            expectedActualDate:
              item.ExpectedActualCompletionDate ??
              item.ExpectedActualDate ??
              item.ExpectedCompletionDate ??
              item.ActualCompletionDate ??
              item.expected_actual_completion_date ??
              item.expected_actual_date ??
              item.completion_date ??
              item.completionDate ??
              null,

            daysOverdue: Number(
              item.DaysOverdue ??
                item.days_overdue ??
                item.daysOverdue ??
                0
            ),

            reasonForDelay:
              item.ReasonForDelay ??
              item.reason_for_delay ??
              item.reasonForDelay ??
              "-",

            severityStatus:
              item.SeverityStatus ??
              item.Severity ??
              item.severity_status ??
              item.severityStatus ??
              "-",
          }));

        setReportRows(formattedRows);
      }

    } catch (error) {

      console.error(
        `Error loading Report ${activeTab}:`,
        error
      );

      setReportRows([]);

      triggerNotification?.(
        `Unable to load Report ${activeTab}`
      );

    } finally {

      setLoading(false);
    }
  };


  /* ============================================================
     FETCH WHEN TAB CHANGES
     ============================================================ */

  useEffect(() => {

    setSearchTerm("");

    setShowExportMenu(false);

    fetchCurrentReport();

  }, [activeTab]);


  /* ============================================================
     SEARCH
     ============================================================ */

  const filteredRows = useMemo(() => {

    if (!searchTerm.trim()) {
      return reportRows;
    }

    const search =
      searchTerm.trim().toLowerCase();

    return reportRows.filter((row) => {

      const searchableValues = [

        row.organisationName,
        row.organisationId,

        row.themeName,
        row.themeId,

        row.categoryName,
        row.categoryId,

        row.initiativeId,
        row.initiativeName,
        row.category,

        row.reasonForDelay,
        row.severityStatus,

        row.expectedActualDate,
        row.daysOverdue,
      ];

      return searchableValues.some(
        (value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search)
      );
    });

  }, [reportRows, searchTerm]);


  /* ============================================================
     FORMAT NUMBER
     ============================================================ */

  const formatNumber = (value) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "-";
    }

    return Number(value).toLocaleString("en-IN");
  };


  /* ============================================================
     FORMAT INVESTMENT
     ============================================================ */

  const formatInvestment = (value) => {

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      Number(value) === 0
    ) {
      return "-";
    }

    return Number(value).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };


  /* ============================================================
     REPORT 1.1 / 1.2 / 1.3 COLUMN DEFINITIONS
     ============================================================ */

  const performanceColumnDefs = useMemo(() => {

    let nameHeader = "Organisation";
    let nameField = "organisationName";

    if (activeTab === "1.2") {
      nameHeader = "Theme";
      nameField = "themeName";
    }

    if (activeTab === "1.3") {
      nameHeader = "Category";
      nameField = "categoryName";
    }

    return [

      {
        headerName: "S. No.",
        valueGetter: (params) =>
          params.node.rowIndex + 1,
        width: 75,
        minWidth: 75,
        maxWidth: 75,
        sortable: false,
        filter: false,
        pinned: "left",

        cellStyle: {
          justifyContent: "center",
          fontWeight: "600",
        },
      },

      {
        headerName: nameHeader,
        field: nameField,
        minWidth: 240,
        flex: 1,
        pinned: "left",

        cellStyle: {
          fontWeight: "600",
        },
      },

      {
        headerName: "Total Initiatives",
        field: "totalInitiatives",
        minWidth: 140,
        type: "numericColumn",

        valueFormatter: (params) =>
          formatNumber(params.value),
      },

      {
        headerName: "Total Investment (₹ Cr.)",
        field: "totalInvestment",
        minWidth: 175,

        valueFormatter: (params) =>
          formatInvestment(params.value),
      },

      {
        headerName: "Stage wise Initiatives Count",
        marryChildren: true,

        children: [

          {
            headerName: "Completed",
            field: "completed",
            minWidth: 120,

            valueFormatter: (params) =>
              formatNumber(params.value),
          },

          {
            headerName: "Progress - On Time",
            field: "progressOn",
            minWidth: 150,

            valueFormatter: (params) =>
              formatNumber(params.value),
          },

          {
            headerName: "Progress - Delayed",
            field: "progressDelayed",
            minWidth: 155,

            valueFormatter: (params) =>
              formatNumber(params.value),
          },

          {
            headerName: "Not Started",
            field: "notStarted",
            minWidth: 120,

            valueFormatter: (params) =>
              formatNumber(params.value),
          },

        ],
      },

      {
        headerName: "Performance Score",
        field: "performanceScore",
        minWidth: 150,

        cellStyle: {
          fontWeight: "700",
          justifyContent: "center",
        },

        valueFormatter: (params) => {

          if (
            params.value === null ||
            params.value === undefined ||
            params.value === ""
          ) {
            return "-";
          }

          return params.value;
        },
      },

    ];

  }, [activeTab]);


  /* ============================================================
     REPORT 1.4 COLUMN DEFINITIONS
     ============================================================ */

  const overdueSummaryColumnDefs = useMemo(() => {

    return [

      {
        headerName: "S. No.",
        valueGetter: (params) =>
          params.node.rowIndex + 1,

        width: 75,
        minWidth: 75,
        maxWidth: 75,

        filter: false,
        sortable: false,
        pinned: "left",

        cellStyle: {
          justifyContent: "center",
          fontWeight: "600",
        },
      },

      {
        headerName: "Organisation Name",
        field: "organisationName",
        minWidth: 240,
        flex: 1,
        pinned: "left",

        cellStyle: {
          fontWeight: "600",
        },
      },

      {
        headerName: "Total Delayed Initiatives",
        field: "totalDelayed",
        minWidth: 180,

        valueFormatter: (params) =>
          formatNumber(params.value),
      },

      {
        headerName: "Delayed < 6 Months",
        field: "delayedLess6",
        minWidth: 160,

        valueFormatter: (params) =>
          formatNumber(params.value),
      },

      {
        headerName: "Delayed 6–12 Months",
        field: "delayed6To12",
        minWidth: 170,

        valueFormatter: (params) =>
          formatNumber(params.value),
      },

      {
        headerName: "Severely Delayed > 1 Year",
        field: "severelyDelayed",
        minWidth: 190,

        valueFormatter: (params) =>
          formatNumber(params.value),
      },

      {
        headerName: "Total Cost (₹ Cr.)",
        field: "totalCost",
        minWidth: 160,

        valueFormatter: (params) =>
          formatInvestment(params.value),
      },

    ];

  }, []);


  /* ============================================================
     REPORT 1.5 COLUMN DEFINITIONS
     ============================================================ */

  const overdueDetailColumnDefs = useMemo(() => {

    return [

      {
        headerName: "S. No.",
        valueGetter: (params) =>
          params.node.rowIndex + 1,

        width: 75,
        minWidth: 75,
        maxWidth: 75,

        filter: false,
        sortable: false,
        pinned: "left",

        cellStyle: {
          justifyContent: "center",
          fontWeight: "600",
        },
      },

      {
        headerName: "Organisation Name",
        field: "organisationName",
        minWidth: 220,
        pinned: "left",

        cellStyle: {
          fontWeight: "600",
        },
      },

      {
        headerName: "Initiative ID",
        field: "initiativeId",
        minWidth: 130,
      },

      {
        headerName: "Initiative / Activity Name",
        field: "initiativeName",
        minWidth: 300,
        flex: 1,

        wrapText: true,
        autoHeight: true,
      },

      {
        headerName: "Category",
        field: "category",
        minWidth: 160,
      },

      {
        headerName: "Total Cost (₹ Cr.)",
        field: "totalCost",
        minWidth: 150,

        valueFormatter: (params) =>
          formatInvestment(params.value),
      },

      {
        headerName:
          "Expected / Actual Completion Date",
        field: "expectedActualDate",
        minWidth: 210,
      },

      {
        headerName: "Days Overdue",
        field: "daysOverdue",
        minWidth: 130,

        valueFormatter: (params) =>
          formatNumber(params.value),

        cellStyle: {
          justifyContent: "center",
          fontWeight: "600",
        },
      },

      {
        headerName: "Reason for Delay",
        field: "reasonForDelay",
        minWidth: 300,
        flex: 1,

        wrapText: true,
        autoHeight: true,
      },

      {
        headerName: "Severity Status",
        field: "severityStatus",
        minWidth: 160,

        cellStyle: {
          fontWeight: "700",
          justifyContent: "center",
        },
      },

    ];

  }, []);


  /* ============================================================
     RENDER TABLE
     ============================================================ */

  const renderTable = () => {

    if (loading) {
      return (
        <div className="h-[520px] flex items-center justify-center border border-slate-300 rounded-md bg-white">
          <Loader />
        </div>
      );
    }


    switch (activeTab) {

      case "1.1":
      case "1.2":
      case "1.3":

        return (
          <ReportGrid
            rows={filteredRows}
            columnDefs={performanceColumnDefs}
            loading={loading}
            height={520}
          />
        );


      case "1.4":

        return (
          <ReportGrid
            rows={filteredRows}
            columnDefs={overdueSummaryColumnDefs}
            loading={loading}
            height={520}
          />
        );


      case "1.5":

        return (
          <ReportGrid
            rows={filteredRows}
            columnDefs={overdueDetailColumnDefs}
            loading={loading}
            height={550}
          />
        );


      default:
        return null;
    }
  };


  /* ============================================================
     SEARCH PLACEHOLDER
     ============================================================ */

  const searchPlaceholder = (() => {

    switch (activeTab) {

      case "1.2":
        return "Search theme...";

      case "1.3":
        return "Search category...";

      case "1.5":
        return "Search initiative, organisation...";

      case "1.4":
      case "1.1":
      default:
        return "Search organisation...";
    }

  })();


  /* ============================================================
     GET EXPORT DATA
     ============================================================ */

  const getExportData = () => {

    /* ========================================================
       REPORT 1.1
       ======================================================== */

    if (activeTab === "1.1") {

      return {
        headers: [
          "S. No.",
          "Organisation Name",
          "Total Initiatives",
          "Total Investment (₹ Cr.)",
          "Completed",
          "Progress - On Time",
          "Progress - Delayed",
          "Not Started",
          "Performance Score",
        ],

        rows: filteredRows.map(
          (row, index) => [
            index + 1,
            row.organisationName ?? "",
            row.totalInitiatives ?? 0,
            row.totalInvestment ?? 0,
            row.completed ?? 0,
            row.progressOn ?? 0,
            row.progressDelayed ?? 0,
            row.notStarted ?? 0,
            row.performanceScore ?? "",
          ]
        ),
      };
    }


    /* ========================================================
       REPORT 1.2
       ======================================================== */

    if (activeTab === "1.2") {

      return {
        headers: [
          "S. No.",
          "Theme Name",
          "Total Initiatives",
          "Total Investment (₹ Cr.)",
          "Completed",
          "Progress - On Time",
          "Progress - Delayed",
          "Not Started",
          "Performance Score",
        ],

        rows: filteredRows.map(
          (row, index) => [
            index + 1,
            row.themeName ?? "",
            row.totalInitiatives ?? 0,
            row.totalInvestment ?? 0,
            row.completed ?? 0,
            row.progressOn ?? 0,
            row.progressDelayed ?? 0,
            row.notStarted ?? 0,
            row.performanceScore ?? "",
          ]
        ),
      };
    }


    /* ========================================================
       REPORT 1.3
       ======================================================== */

    if (activeTab === "1.3") {

      return {
        headers: [
          "S. No.",
          "Category Name",
          "Total Initiatives",
          "Total Investment (₹ Cr.)",
          "Completed",
          "Progress - On Time",
          "Progress - Delayed",
          "Not Started",
          "Performance Score",
        ],

        rows: filteredRows.map(
          (row, index) => [
            index + 1,
            row.categoryName ?? "",
            row.totalInitiatives ?? 0,
            row.totalInvestment ?? 0,
            row.completed ?? 0,
            row.progressOn ?? 0,
            row.progressDelayed ?? 0,
            row.notStarted ?? 0,
            row.performanceScore ?? "",
          ]
        ),
      };
    }


    /* ========================================================
       REPORT 1.4
       ======================================================== */

    if (activeTab === "1.4") {

      return {
        headers: [
          "S. No.",
          "Organisation Name",
          "Total Delayed Initiatives",
          "Delayed < 6 Months",
          "Delayed 6–12 Months",
          "Severely Delayed > 1 Year",
          "Total Cost (₹ Cr.)",
        ],

        rows: filteredRows.map(
          (row, index) => [
            index + 1,
            row.organisationName ?? "",
            row.totalDelayed ?? 0,
            row.delayedLess6 ?? 0,
            row.delayed6To12 ?? 0,
            row.severelyDelayed ?? 0,
            row.totalCost ?? 0,
          ]
        ),
      };
    }


    /* ========================================================
       REPORT 1.5
       ======================================================== */

    if (activeTab === "1.5") {

      return {
        headers: [
          "S. No.",
          "Organisation Name",
          "Initiative ID",
          "Initiative / Activity Name",
          "Category",
          "Total Cost (₹ Cr.)",
          "Expected / Actual Completion Date",
          "Days Overdue",
          "Reason for Delay",
          "Severity Status",
        ],

        rows: filteredRows.map(
          (row, index) => [
            index + 1,
            row.organisationName ?? "",
            row.initiativeId ?? "",
            row.initiativeName ?? "",
            row.category ?? "",
            row.totalCost ?? 0,
            row.expectedActualDate ?? "",
            row.daysOverdue ?? 0,
            row.reasonForDelay ?? "",
            row.severityStatus ?? "",
          ]
        ),
      };
    }


    return {
      headers: [],
      rows: [],
    };
  };


  /* ============================================================
     CLEAN FILE NAME
     ============================================================ */

  const getFileName = () => {

    const title =
      activeReport?.title ||
      "MIV Report";

    return title
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, "_");
  };


  /* ============================================================
     EXPORT CSV
     ============================================================ */

  const exportCSV = () => {

    const {
      headers,
      rows,
    } = getExportData();

    if (!headers.length) {
      return;
    }


    const escapeCSVValue = (value) => {

      if (
        value === null ||
        value === undefined
      ) {
        return "";
      }

      const stringValue = String(value);

      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(
          /"/g,
          '""'
        )}"`;
      }

      return stringValue;
    };


    const csvContent = [
      headers
        .map(escapeCSVValue)
        .join(","),

      ...rows.map((row) =>
        row
          .map(escapeCSVValue)
          .join(",")
      ),
    ].join("\n");


    const blob = new Blob(
      ["\uFEFF" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );


    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `${getFileName()}_${todayDate}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setShowExportMenu(false);
  };


  /* ============================================================
     EXPORT EXCEL
     ============================================================ */

  const exportExcel = () => {

    const {
      headers,
      rows,
    } = getExportData();

    if (!headers.length) {
      return;
    }


    const worksheetData = [
      headers,
      ...rows,
    ];


    const worksheet =
      XLSX.utils.aoa_to_sheet(
        worksheetData
      );


    /* ========================================================
       COLUMN WIDTHS
       ======================================================== */

    worksheet["!cols"] =
      headers.map((header) => {

        if (
          header.includes(
            "Initiative / Activity"
          )
        ) {
          return { wch: 35 };
        }

        if (
          header.includes(
            "Reason for Delay"
          )
        ) {
          return { wch: 40 };
        }

        if (
          header.includes(
            "Organisation"
          ) ||
          header.includes("Theme") ||
          header.includes("Category")
        ) {
          return { wch: 28 };
        }

        if (
          header.includes("Performance")
        ) {
          return { wch: 18 };
        }

        return { wch: 18 };
      });


    /* ========================================================
       FREEZE HEADER ROW
       ======================================================== */

    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };


    /* ========================================================
       CREATE WORKBOOK
       ======================================================== */

    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Report"
    );


    /* ========================================================
       DOWNLOAD
       ======================================================== */

    XLSX.writeFile(
      workbook,
      `${getFileName()}_${todayDate}.xlsx`
    );


    setShowExportMenu(false);
  };


  /* ============================================================
     COPY TABLE DATA
     ============================================================ */

  const copyReportData = async () => {

    const {
      headers,
      rows,
    } = getExportData();

    if (!headers.length) {
      return;
    }


    const text = [
      headers.join("\t"),

      ...rows.map((row) =>
        row
          .map((value) =>
            value ?? ""
          )
          .join("\t")
      ),

    ].join("\n");


    try {

      await navigator.clipboard.writeText(
        text
      );

      triggerNotification?.(
        "Report data copied successfully"
      );

    } catch (error) {

      console.error(
        "Copy failed:",
        error
      );

      triggerNotification?.(
        "Unable to copy report data"
      );
    }
  };


  /* ============================================================
     MAIN UI
     ============================================================ */

  return (
    <div className="w-full space-y-3">


      {/* ======================================================
          REPORT TABS
          ====================================================== */}

      <div className="w-full bg-white border border-slate-200 rounded-md overflow-hidden">

        <div className="grid grid-cols-5 w-full">

          {REPORTS.map((report) => {

            const Icon = report.icon;

            const isActive =
              activeTab === report.id;

            return (
              <button
                key={report.id}
                type="button"

                onClick={() => {

                  if (
                    activeTab !==
                    report.id
                  ) {

                    setActiveTab(
                      report.id
                    );

                    setSearchTerm("");

                    setShowExportMenu(
                      false
                    );
                  }
                }}

                className={`
                  relative
                  w-full
                  px-3
                  py-2.5
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-xs
                  font-semibold
                  whitespace-nowrap
                  transition-all
                  duration-200
                  cursor-pointer
                  focus:outline-none

                  ${
                    isActive
                      ? "bg-[#f3e6e6] text-[#4b2424]"
                      : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }
                `}
              >

                <Icon
                  className={`
                    w-4
                    h-4
                    flex-shrink-0

                    ${
                      isActive
                        ? "text-[#4b2424]"
                        : "text-slate-400"
                    }
                  `}
                />

                <span>
                  {report.label}
                </span>


                {isActive && (
                  <span
                    className="
                      absolute
                      left-0
                      right-0
                      bottom-0
                      h-[3px]
                      bg-[#4b2424]
                    "
                  />
                )}

              </button>
            );
          })}

        </div>
      </div>


      {/* ======================================================
          REPORT HEADER + ACTIONS
          ====================================================== */}

      <div
        className="
          bg-white
          border
          border-slate-200
          rounded-md
          px-4
          py-3
        "
      >

        <div
          className="
            flex
            flex-col
            xl:flex-row
            xl:items-center
            xl:justify-between
            gap-3
          "
        >


          {/* ==================================================
              LEFT SIDE
              ================================================== */}

          <div className="min-w-0">

            <div className="flex items-center gap-2">

              {activeReport?.icon &&
                React.createElement(
                  activeReport.icon,
                  {
                    size: 18,
                    className:
                      "text-[#4b2424] flex-shrink-0",
                  }
                )}

              <h2
                className="
                  text-sm
                  md:text-base
                  font-bold
                  text-slate-800
                  truncate
                "
              >
                {activeReport?.label}
                {" - "}
                {activeReport?.title}
              </h2>

            </div>


            <div
              className="
                text-[11px]
                text-slate-500
                mt-1
                ml-6
              "
            >

              As On Date:
              {" "}

              <span className="font-semibold text-slate-700">
                {todayDate}
              </span>

              <span className="mx-2">
                |
              </span>

              Report for the Month:
              {" "}

              <span className="font-semibold text-slate-700">
                {currentMonth}
              </span>

            </div>

          </div>


          {/* ==================================================
              RIGHT SIDE ACTIONS
              ================================================== */}

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >


            {/* ==================================================
                SEARCH
                ================================================== */}

            <div className="relative w-[260px]">

              <Search
                className="
                  absolute
                  left-2.5
                  top-2.5
                  w-4
                  h-4
                  text-slate-400
                "
              />

              <input
                type="text"
                value={searchTerm}

                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }

                placeholder={
                  searchPlaceholder
                }

                className="
                  w-full
                  pl-8
                  pr-3
                  py-2
                  border
                  border-slate-300
                  rounded-md
                  text-xs
                  bg-white
                  focus:outline-none
                  focus:ring-1
                  focus:ring-[#4b2424]
                  focus:border-[#4b2424]
                "
              />

            </div>


            {/* ==================================================
                COPY
                ================================================== */}

            <button
              type="button"
              onClick={copyReportData}

              className="
                inline-flex
                items-center
                gap-1.5
                px-3
                py-2
                rounded-md
                border
                border-slate-300
                bg-white
                text-slate-700
                text-xs
                font-semibold
                hover:bg-slate-50
                transition
              "
            >

              <FileText size={15} />

              Copy

            </button>


            {/* ==================================================
                EXPORT DROPDOWN
                ================================================== */}

            <div
              className="relative"
              ref={exportMenuRef}
            >

              <button
                type="button"

                onClick={() =>
                  setShowExportMenu(
                    (prev) => !prev
                  )
                }

                aria-haspopup="menu"
                aria-expanded={
                  showExportMenu
                }

                className="
                  inline-flex
                  items-center
                  gap-1.5
                  px-3
                  py-2
                  rounded-md
                  bg-[#4b2424]
                  text-white
                  text-xs
                  font-semibold
                  hover:bg-[#351818]
                  transition
                "
              >

                <Download size={15} />

                Export

                <ChevronDown
                  size={14}
                  className={`
                    transition-transform
                    ${
                      showExportMenu
                        ? "rotate-180"
                        : ""
                    }
                  `}
                />

              </button>


              {/* ==================================================
                  EXPORT MENU
                  ================================================== */}

              {showExportMenu && (

                <div
                  className="
                    absolute
                    right-0
                    top-full
                    mt-1
                    w-44
                    bg-white
                    border
                    border-slate-200
                    rounded-md
                    shadow-lg
                    z-[1000]
                    overflow-hidden
                  "
                  role="menu"
                >

                  {/* CSV */}

                  <button
                    type="button"

                    onClick={exportCSV}

                    className="
                      w-full
                      flex
                      items-center
                      gap-2
                      px-3
                      py-2.5
                      text-left
                      text-xs
                      font-medium
                      text-slate-700
                      hover:bg-[#f8eeee]
                      hover:text-[#4b2424]
                      transition
                    "
                    role="menuitem"
                  >

                    <FileText
                      size={15}
                      className="text-[#4b2424]"
                    />

                    <span>
                      Export CSV
                    </span>

                  </button>


                  {/* EXCEL */}

                  <button
                    type="button"

                    onClick={exportExcel}

                    className="
                      w-full
                      flex
                      items-center
                      gap-2
                      px-3
                      py-2.5
                      text-left
                      text-xs
                      font-medium
                      text-slate-700
                      hover:bg-[#f8eeee]
                      hover:text-[#4b2424]
                      transition
                    "
                    role="menuitem"
                  >

                    <Download
                      size={15}
                      className="text-[#4b2424]"
                    />

                    <span>
                      Export Excel
                    </span>

                  </button>

                </div>
              )}

            </div>


            {/* ==================================================
                REFRESH
                ================================================== */}

            <button
              type="button"

              onClick={fetchCurrentReport}

              disabled={loading}

              className="
                inline-flex
                items-center
                gap-1.5
                px-3
                py-2
                rounded-md
                bg-[#4b2424]
                text-white
                text-xs
                font-semibold
                hover:bg-[#351818]
                disabled:opacity-50
                disabled:cursor-not-allowed
                transition
              "
            >

              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

            </button>

          </div>

        </div>

      </div>


      {/* ======================================================
          REPORT TABLE
          ====================================================== */}

      <div className="w-full">

        {renderTable()}

      </div>


      {/* ======================================================
          NO DATA MESSAGE
          ====================================================== */}

      {!loading &&
        filteredRows.length === 0 && (
          <div
            className="
              text-center
              text-xs
              text-slate-500
              py-3
            "
          >
            No records found.
          </div>
        )}

    </div>
  );
}