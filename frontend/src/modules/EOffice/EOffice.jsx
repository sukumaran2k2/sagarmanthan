import { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Download, Trash2, FileSpreadsheet, AlertCircle } from "lucide-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// Extracted Sub-Components
import EOfficeCategoryHeader from "./components/EOfficeCategoryHeader";
import EOfficeToolbar from "./components/EOfficeToolbar";
import EOfficeUploadView from "./components/EOfficeUploadView";
import EOfficeDataListView from "./components/EOfficeDataListView";
import EOfficeReportView from "./components/EOfficeReportView";
import EOfficeFilesHistoryView from "./components/EOfficeFilesHistoryView";

// Extracted Utilities
import {
formatTimeStr,
  validateEOfficeHeaders,
  validateEOfficeRows,
  getKpiPrefix,
  getReportTitle,
} from "./utils/eOfficeUtils";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function EOfficeView({ initialKpi, triggerNotification }) {
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const kpiParam = params.get("kpi") || params.get("category");
    const subTabParam = params.get("subtab") || params.get("tab");
    return {
      kpi:
        kpiParam &&
        ["file-pendency", "receipt-pendency", "file-disposal"].includes(kpiParam)
          ? kpiParam
          : null,
      subTab:
        subTabParam && ["upload", "data", "report", "files"].includes(subTabParam)
          ? subTabParam
          : null,
    };
  };

  const updateUrlParams = (newKpi, newSubTab) => {
    const params = new URLSearchParams(window.location.search);
    if (newKpi) params.set("kpi", newKpi);
    if (newSubTab) params.set("subtab", newSubTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ kpi: newKpi, subTab: newSubTab }, "", newUrl);
  };

  const [selectedKpi, setSelectedKpi] = useState(() => {
    const { kpi } = getUrlParams();
    return kpi || initialKpi || "file-pendency";
  });

  const [subTab, setSubTab] = useState(() => {
    const { subTab: sTab } = getUrlParams();
    return sTab || "upload";
  });

  // Global Filter States
  const [month, setMonth] = useState("July");
  const [year, setYear] = useState("2026");
  const [week, setWeek] = useState("Week 3");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
  const [pageSize, setPageSize] = useState(10);

  // Drill Down Detailed Report States
  const [reportViewMode, setReportViewMode] = useState("summary");
  const [selectedWing, setSelectedWing] = useState("");
  const [detailData, setDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleCategorySelect = (kpi) => {
    setSelectedKpi(kpi);
    updateUrlParams(kpi, subTab);
  };

  const handleSubTabSelect = (sTab) => {
    setSubTab(sTab);
    updateUrlParams(activeKpi, sTab);
  };

  // Sync browser Back/Forward popstate to state
  useEffect(() => {
    const handlePopState = () => {
      const { kpi: pKpi, subTab: pSubTab } = getUrlParams();
      if (pKpi) setSelectedKpi(pKpi);
      if (pSubTab) setSubTab(pSubTab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync prop changes to state
  useEffect(() => {
    if (initialKpi) {
      setSelectedKpi(initialKpi);
    }
  }, [initialKpi]);

  // DB Data States
  const [reportRows, setReportRows] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // In-memory data cache
  const dataCache = useRef({});

    // Routes through the app-wide Notification system (App.jsx's
  // triggerNotification) instead of a separate local toast -- this module
  // previously had its own solid-color pill toast because EOfficeView was
  // never passed triggerNotification as a prop, unlike every other module.
  // Keeping the showToast(msg, color) call signature here means none of the
  // ~22 existing call sites below need to change.
  const TOAST_COLOR_TYPE = {
    '#10B981': 'success',
    '#EF4444': 'error',
    '#F59E0B': 'warning',
  };
  const showToast = (msg, color = "#3B82F6") => {
    const type = TOAST_COLOR_TYPE[color] || 'success';
    // The old pill toast needed a leading emoji for visual context; the
    // shared Notification component already conveys that via its icon, so
    // strip it to match how the rest of the app calls triggerNotification.
    const cleanMsg = msg.replace(/^(⚠️?|❌|✅|🗑️?|📈|📄|📋)\s*/u, '');
    if (triggerNotification) {
      triggerNotification(cleanMsg, type);
    }
  };

  // Styled confirm modal, replacing window.confirm() for the upload-replace
  // and delete-file prompts so they match the app's visual language instead
  // of the browser's native dialog.
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const askConfirm = (message, onConfirm) => {
    setConfirmModal({ open: true, message, onConfirm });
  };
  const closeConfirm = () => setConfirmModal({ open: false, message: '', onConfirm: null });
  // Per-category upload states map so each category (File Pendency, Receipt Pendency, File Disposal) preserves its own uploaded file preview & form selections when switching tabs
  const [categoryUploadStates, setCategoryUploadStates] = useState({
    "file-pendency": {
      selectedFile: null,
      previewRows: [],
      fileValidationError: "",
      uploadFinancialYear: "",
      uploadMonth: "",
      uploadWeek: "",
    },
    "receipt-pendency": {
      selectedFile: null,
      previewRows: [],
      fileValidationError: "",
      uploadFinancialYear: "",
      uploadMonth: "",
      uploadWeek: "",
    },
    "file-disposal": {
      selectedFile: null,
      previewRows: [],
      fileValidationError: "",
      uploadFinancialYear: "",
      uploadMonth: "",
      uploadWeek: "",
    },
  });

  const [uploading, setUploading] = useState(false);

  const activeKpi = selectedKpi || initialKpi || "file-pendency";

  const activeUploadState = categoryUploadStates[activeKpi] || {
    selectedFile: null,
    previewRows: [],
    fileValidationError: "",
    uploadFinancialYear: "",
    uploadMonth: "",
    uploadWeek: "",
  };

  const updateActiveUploadState = (fields) => {
    setCategoryUploadStates((prev) => ({
      ...prev,
      [activeKpi]: {
        ...(prev[activeKpi] || {}),
        ...fields,
      },
    }));
  };

  // ---- FETCH FROM DATABASE WITH IN-MEMORY CACHING ----
  const fetchEOfficeData = (
    kpi = activeKpi,
    targetMonth = month,
    targetYear = year,
    targetWeek = week,
    forceRefresh = false,
  ) => {
    const prefix = getKpiPrefix(kpi);
    const weekNum =
      typeof targetWeek === "string"
        ? parseInt(targetWeek.replace(/\D/g, ""), 10) || 3
        : targetWeek;

    const cacheKey = `${prefix}_${subTab}_${targetYear}_${targetMonth}_${weekNum}`;

    if (!forceRefresh && dataCache.current[cacheKey]) {
      const cached = dataCache.current[cacheKey];
      if (subTab === "report" || subTab === "upload") setReportRows(cached);
      else if (subTab === "data") setRawRows(cached);
      else if (subTab === "files") setFilesList(cached);
      setFetchError(null);
      setLoading(false);
      return;
    }

    setReportRows([]);
    setRawRows([]);
    setFilesList([]);
    setFetchError(null);
    setLoading(true);

    const promises = [];

    if (subTab === "report" || subTab === "upload") {
      promises.push(
        axios
          .get(
            `${API_BASE_URL}/${prefix}-report/${targetYear}/${targetMonth}/${weekNum}`,
          )
          .then((res) => {
            const data = res.data.rowData || res.data || [];
            setReportRows(data);
            dataCache.current[cacheKey] = data;
          })
          .catch((err) => {
            console.warn(`Abstract report fetch note (${prefix}):`, err.message);
            setReportRows([]);
            if (err.response?.status !== 404) {
              setFetchError(err.response?.data?.message || err.message || "Failed to fetch report data");
            }
          }),
      );
    }

    if (subTab === "data") {
      promises.push(
        axios
          .get(`${API_BASE_URL}/${prefix}-all`)
          .then((res) => {
            const data = res.data.rowData || res.data || [];
            setRawRows(data);
            dataCache.current[cacheKey] = data;
          })
          .catch((err) => {
            console.warn(`Raw data list fetch note (${prefix}):`, err.message);
            setRawRows([]);
            if (err.response?.status !== 404) {
              setFetchError(err.response?.data?.message || err.message || "Failed to fetch data list");
            }
          }),
      );
    }

    if (subTab === "files") {
      promises.push(
        axios
          .get(`${API_BASE_URL}/${prefix}-History`)
          .then((res) => {
            const data = res.data.rowData || res.data || [];
            setFilesList(data);
            dataCache.current[cacheKey] = data;
          })
          .catch((err) => {
            console.warn(`Files history fetch note (${prefix}):`, err.message);
            setFilesList([]);
            if (err.response?.status !== 404) {
              setFetchError(err.response?.data?.message || err.message || "Failed to fetch upload history");
            }
          }),
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  };

  useEffect(() => {
    const prefix = getKpiPrefix(activeKpi);
    axios
      .get(`${API_BASE_URL}/${prefix}-check`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const latest = res.data[0];
          const latestMonth = latest.Month || month;
          const latestYear = String(latest.Year || year);
          const latestWeekVal = latest.Week !== undefined ? latest.Week : latest.week;
          const latestWeek = latestWeekVal ? `Week ${latestWeekVal}` : week;

          setMonth(latestMonth);
          setYear(latestYear);
          setWeek(latestWeek);

          fetchEOfficeData(activeKpi, latestMonth, latestYear, latestWeek);
        } else {
          fetchEOfficeData(activeKpi, month, year, week);
        }
      })
      .catch((err) => {
        console.warn(`Check latest fetch note (${prefix}):`, err.message);
        fetchEOfficeData(activeKpi, month, year, week);
      });
  }, [activeKpi, subTab]);

  const handleFetchReportClick = () => {
    fetchEOfficeData(activeKpi, month, year, week, true);
    showToast(
      `📊 Fetched ${getReportTitle(activeKpi)} for ${week}, ${month} ${year}`,
      "#10B981",
    );
  };

  const activeDataset = useMemo(() => {
    if (subTab === "data") return rawRows;
    return reportRows;
  }, [subTab, rawRows, reportRows]);

  const colDefs = useMemo(() => {
    if (!activeDataset || activeDataset.length === 0) return [];
    const sample = activeDataset[0];
    const keys = Object.keys(sample);

    return keys.map((key) => {
      const isWingCol =
        key.toLowerCase().includes("wing") ||
        key.toLowerCase().includes("section");
      const isNumeric = typeof sample[key] === "number";

      return {
        headerName: key,
        field: key,
        flex: isWingCol ? 2 : 1,
        minWidth: isWingCol ? 180 : 110,
        filter: true,
        sortable: true,
        pinned: isWingCol ? "left" : null,
        cellClass: (params) => {
          if (params.data && params.data.Wing === "Total") {
            return "font-black text-slate-900 bg-slate-100 text-center flex items-center justify-center";
          }
          if (isWingCol) return "font-semibold text-slate-800 text-left flex items-center";
          if (isNumeric) return "font-bold text-slate-700 text-center flex items-center justify-center";
          return "text-slate-600 text-center flex items-center justify-center";
        },
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return "—";
          const colKey = key.toLowerCase();
          if (colKey === "year" || colKey.includes("emp") || colKey === "s.no" || colKey === "id") {
            return String(params.value).replace(/,/g, "");
          }
          if (typeof params.value === "number") return params.value.toLocaleString();
          return formatTimeStr(params.value);
        },
      };
    });
  }, [activeDataset]);

  const pinnedBottomRowData = useMemo(() => {
    if (!activeDataset || activeDataset.length === 0) return [];
    const sample = activeDataset[0];
    const keys = Object.keys(sample);
    const totalsRow = {};

    keys.forEach((key, index) => {
      if (index === 0 || key.toLowerCase().includes("wing")) {
        totalsRow[key] = "Total";
      } else {
        const sum = activeDataset.reduce((acc, row) => {
          const val = Number(row[key]);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
        totalsRow[key] = sum;
      }
    });

    return [totalsRow];
  }, [activeDataset]);

  const handleCellClick = (params) => {
    if (!params || !params.data) return;
    const row = params.data;
    const wingName = row["Wing Name"] || row.Wing || row.wing_name || row["Wing"];
    if (!wingName || wingName === "Total" || wingName === "Summary") return;

    setSelectedWing(wingName);
    setReportViewMode("detail");
    setDetailLoading(true);

    const cacheKey = `eoffice_detail_${activeKpi}_${wingName}_${month}_${year}_${week}`;
    if (dataCache.current[cacheKey]) {
      setDetailData(dataCache.current[cacheKey]);
      setDetailLoading(false);
      return;
    }

    const weekNum = week.replace(/[^0-9]/g, "") || "3";
    let endpoint = "";
    if (activeKpi === "file-pendency") endpoint = `/get-file-pendence-report/${year}/${month}/${weekNum}`;
    else if (activeKpi === "receipt-pendency") endpoint = `/get-receipt-pendence-report/${year}/${month}/${weekNum}`;
    else endpoint = `/get-file-disposal-report/${year}/${month}/${weekNum}`;

    axios.get(`${API_BASE_URL}${endpoint}`)
      .then(res => {
        const rows = res.data?.rowData || res.data || [];
        const wingRows = rows.filter(r => 
          (r.Wing && r.Wing.toLowerCase() === String(wingName).toLowerCase()) ||
          (r.wing_name && r.wing_name.toLowerCase() === String(wingName).toLowerCase()) ||
          (r.division_name && r.division_name.toLowerCase() === String(wingName).toLowerCase())
        );
        const finalRows = wingRows.length > 0 ? wingRows : rows;
        setDetailData(finalRows);
        dataCache.current[cacheKey] = finalRows;
      })
      .catch(() => {
        const fallback = rawRows.filter(r => 
          (r.Wing && r.Wing.toLowerCase() === String(wingName).toLowerCase()) ||
          (r.wing_name && r.wing_name.toLowerCase() === String(wingName).toLowerCase())
        );
        setDetailData(fallback);
      })
      .finally(() => setDetailLoading(false));
  };

  const detailColDefs = useMemo(() => {
    if (!detailData || detailData.length === 0) return [];
    return Object.keys(detailData[0]).map((key) => {
      const colKey = key.toLowerCase();
      const isYearOrId = colKey === "year" || colKey.includes("emp") || colKey === "s.no" || colKey === "id";
      return {
        headerName: key,
        field: key,
        flex: 1,
        minWidth: 120,
        sortable: true,
        filter: true,
        cellClass: "font-semibold text-slate-700 text-center flex items-center justify-center",
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return "—";
          if (isYearOrId) return String(params.value).replace(/,/g, "");
          if (typeof params.value === "number") return params.value.toLocaleString();
          return formatTimeStr(params.value);
        },
      };
    });
  }, [detailData]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return activeDataset;
    const term = searchTerm.toLowerCase();
    return activeDataset.filter((row) =>
      Object.values(row).some((val) =>
        String(val || "").toLowerCase().includes(term),
      ),
    );
  }, [activeDataset, searchTerm]);

  const previewColDefs = useMemo(() => {
    const pRows = activeUploadState.previewRows;
    if (!pRows || pRows.length === 0) return [];
    return Object.keys(pRows[0]).map((key) => {
      const colKey = key.toLowerCase();
      const isYearOrId = colKey === "year" || colKey.includes("emp") || colKey === "s.no" || colKey === "id";
      return {
        headerName: key,
        field: key,
        flex: 1,
        minWidth: 120,
        cellClass: "text-slate-700 font-semibold text-center flex items-center justify-center",
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return "—";
          if (isYearOrId) return String(params.value).replace(/,/g, "");
          return formatTimeStr(params.value);
        },
      };
    });
  }, [activeUploadState.previewRows]);

  const historyColDefs = useMemo(
    () => [
      {
        headerName: "S.No",
        valueGetter: (params) => params.node.rowIndex + 1,
        width: 70,
        pinned: "left",
        cellClass: "font-bold text-slate-500 text-center flex items-center justify-center",
      },
      {
        field: "File Name",
        headerName: "File Name",
        flex: 3,
        minWidth: 260,
        cellClass: "font-semibold flex items-center text-left",
        valueGetter: (params) =>
          params.data["File Name"] ||
          params.data.file_name ||
          params.data.File_name ||
          "EOffice_Spreadsheet.xlsx",
        cellRenderer: (params) => (
          <div
            onClick={() => handleDownloadFile(params.data.id, params.value)}
            className="text-[#0f417a] hover:underline cursor-pointer flex items-center gap-2 truncate"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="truncate">{params.value}</span>
          </div>
        ),
      },
      {
        field: "Uploaded By",
        headerName: "Uploaded By",
        flex: 2,
        minWidth: 160,
        cellClass: "text-slate-700 font-medium text-left flex items-center",
        valueGetter: (params) =>
          params.data["Uploaded By"] ||
          params.data.Uploaded_By ||
          params.data.uploaded_by ||
          "Admin",
      },
      {
        field: "Date of Upload",
        headerName: "Date of Upload",
        flex: 2,
        minWidth: 160,
        cellClass: "text-slate-600 font-medium text-center flex items-center justify-center",
        valueGetter: (params) =>
          params.data["Date of Upload"] ||
          params.data.date_of_upload ||
          params.data.Date_of_Upload ||
          "—",
      },
      {
        headerName: "Actions",
        width: 120,
        cellClass: "text-center flex items-center justify-center gap-2",
        cellRenderer: (params) => {
          const fName =
            params.data["File Name"] ||
            params.data.file_name ||
            params.data.File_name;
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleDownloadFile(params.data.id, fName)}
                className="p-1.5 hover:bg-blue-50 text-[#0f417a] rounded-lg transition cursor-pointer"
                title="Download File"
              >
                <Download size={15} />
              </button>
              <button
                onClick={() => handleDeleteFile(params.data.id)}
                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition cursor-pointer"
                title="Delete Record"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const handleFileSelect = (file) => {
    if (!file) {
      updateActiveUploadState({
        selectedFile: null,
        previewRows: [],
        fileValidationError: "",
      });
      return;
    }

    updateActiveUploadState({
      selectedFile: file,
      fileValidationError: "",
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          updateActiveUploadState({
            previewRows: [],
            fileValidationError: "The selected file contains no data rows.",
          });
          showToast("⚠ Selected file is empty", "#F59E0B");
          return;
        }

        const headerCheck = validateEOfficeHeaders(rows[0], activeKpi);
        if (!headerCheck.valid) {
          updateActiveUploadState({
            previewRows: [],
            fileValidationError: headerCheck.missing.map((field) => ({
              field,
              message: "Required column not found in the uploaded file. Please use the official E-Office Sample Template format.",
            })),
          });
          showToast(`❌ Template Validation Failed: Missing ${headerCheck.missing.join(", ")}`, "#EF4444");
          return;
        }

        const validRows = rows.filter(
          (r) =>
            r &&
            Object.keys(r).length > 0 &&
            Object.values(r).some(
              (val) => val !== null && val !== undefined && String(val).trim() !== "",
            ),
        );

        const rowIssues = validateEOfficeRows(validRows, activeKpi);
        if (rowIssues.length > 0) {
          updateActiveUploadState({
            previewRows: [],
            fileValidationError: rowIssues,
          });
          showToast(`❌ ${rowIssues.length} validation issue${rowIssues.length > 1 ? "s" : ""} found in file`, "#EF4444");
          return;
        }

        updateActiveUploadState({
          previewRows: validRows,
          fileValidationError: "",
        });
        showToast(`✅ Template Validated! Loaded ${validRows.length} rows preview`, "#10B981");
      } catch (err) {
        console.error("Preview parse error:", err);
        updateActiveUploadState({
          previewRows: [],
          fileValidationError: "Could not read or parse the selected spreadsheet file.",
        });
        showToast("⚠ Could not parse file preview", "#F59E0B");
      }
    };
    reader.readAsArrayBuffer(file);
  };

    const executeEOfficeUpload = (prefix, formData, existingFileId, uploadMonth, uploadWeek) => {
    const uploadRequest = existingFileId
      ? (() => {
          formData.append("fileId", existingFileId);
          return axios.put(`${API_BASE_URL}/${prefix}-update`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        })()
      : axios.post(`${API_BASE_URL}/${prefix}-create`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

    uploadRequest
      .then(() => {
        showToast(existingFileId ? "✅ E-Office sheet updated successfully" : "✅ E-Office sheet uploaded and stored successfully", "#10B981");
        updateActiveUploadState({
          selectedFile: null,
          previewRows: [],
          fileValidationError: "",
          uploadFinancialYear: "",
          uploadMonth: "",
          uploadWeek: "",
        });
        dataCache.current = {};
        fetchEOfficeData(activeKpi, uploadMonth, year, uploadWeek, true);
        setSubTab("files");
      })
      .catch((err) => {
        console.error("Upload error:", err);
        showToast(err.response?.data?.error || "❌ File upload failed. Check spreadsheet format.", "#EF4444");
      })
      .finally(() => setUploading(false));
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    const { uploadFinancialYear, uploadMonth, uploadWeek, selectedFile, fileValidationError } = activeUploadState;
    if (!uploadFinancialYear) { showToast("⚠ Please select Financial Year", "#F59E0B"); return; }
    if (!uploadMonth) { showToast("⚠ Please select Month", "#F59E0B"); return; }
    if (!uploadWeek) { showToast("⚠ Please select Week", "#F59E0B"); return; }
    if (!selectedFile) { showToast("⚠ Please select an Excel file", "#F59E0B"); return; }
    if (fileValidationError) {
      const errMsg = Array.isArray(fileValidationError)
        ? `${fileValidationError.length} validation issue${fileValidationError.length > 1 ? "s" : ""} in file`
        : fileValidationError;
      showToast(`❌ Cannot upload: ${errMsg}`, "#EF4444");
      return;
    }

    const prefix = getKpiPrefix(activeKpi);
    const buildFormData = () => {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("Year", uploadFinancialYear);
      formData.append("financialYear", uploadFinancialYear);
      formData.append("month", uploadMonth);
      formData.append("week", uploadWeek);
      formData.append("userID", 1);
      return formData;
    };

    setUploading(true);

    // Probe with a create attempt first. The backend returns 409 with a
    // replaceFileID when a record already exists for this exact
    // Year/Month/Week -- previously that error message was shown as a
    // plain toast with no way to actually act on it, so duplicate uploads
    // had no real path to succeed.
    axios
      .post(`${API_BASE_URL}/${prefix}-create`, buildFormData(), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(() => {
        showToast("✅ E-Office sheet uploaded and stored successfully", "#10B981");
        updateActiveUploadState({
          selectedFile: null,
          previewRows: [],
          fileValidationError: "",
          uploadFinancialYear: "",
          uploadMonth: "",
          uploadWeek: "",
        });
        dataCache.current = {};
        fetchEOfficeData(activeKpi, uploadMonth, year, uploadWeek, true);
        setSubTab("files");
        setUploading(false);
      })
      .catch((err) => {
        const replaceFileID = err.response?.data?.replaceFileID;
        if (err.response?.status === 409 && replaceFileID) {
          setUploading(false);
          askConfirm(
            `A file already exists for ${uploadMonth} ${uploadFinancialYear}, Week ${uploadWeek}. Uploading will replace all existing data for this period. Continue?`,
            () => {
              setUploading(true);
              executeEOfficeUpload(prefix, buildFormData(), replaceFileID, uploadMonth, uploadWeek);
            }
          );
          return;
        }
        console.error("Upload error:", err);
        showToast(err.response?.data?.error || "❌ File upload failed. Check spreadsheet format.", "#EF4444");
        setUploading(false);
      });
  };

  const handleDownloadFile = (id, fileName) => {
    const prefix = getKpiPrefix(activeKpi);
    axios
      .get(`${API_BASE_URL}/${prefix}/download/${id}`, { responseType: "blob" })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName || "eoffice_file.xlsx");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.error("Download error:", err);
        showToast("❌ Failed to download file", "#EF4444");
      });
  };

  // Downloads the sample template matching the currently active KPI's
  // required columns (each KPI has genuinely different headers, confirmed
  // against the backend's requiredHeaders checks -- so this always
  // resolves to the correct file for whichever tab is open).
  const handleDownloadSample = () => {
    const prefix = getKpiPrefix(activeKpi);
    const sampleFileNames = {
      "file-pendancy": "File_Pendency_Sample.xlsx",
      "receipt-pendancy": "Receipt_Pendency_Sample.xlsx",
      "file-disposal": "File_Disposal_Sample.xlsx",
    };
    const fileName = sampleFileNames[prefix] || "Sample_Template.xlsx";
    axios
      .get(`${API_BASE_URL}/${prefix}/download-sample`, { responseType: "blob" })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.error("Sample download error:", err);
        showToast("❌ Failed to download sample template", "#EF4444");
      });
  };

    const handleDeleteFile = (id) => {
    askConfirm("Deleting the file will also delete all records parsed from it. Continue?", () => {
      const prefix = getKpiPrefix(activeKpi);
      axios
        .delete(`${API_BASE_URL}/${prefix}/delete/${id}`)
        .then(() => {
          showToast("🗑️ File record deleted successfully", "#10B981");
          dataCache.current = {};
          fetchEOfficeData(activeKpi, month, year, week, true);
        })
        .catch((err) => {
          console.error("Delete error:", err);
          showToast("❌ Failed to delete record", "#EF4444");
        });
    });
  };

  const handleExportExcel = () => {
    if (!activeDataset || activeDataset.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(activeDataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EOffice Report");
    XLSX.writeFile(workbook, `EOffice_${activeKpi}_${month}_${year}.xlsx`);
    showToast("📈 Exported report to Excel successfully!", "#10B981");
  };

  const handleExportPdf = () => {
    if (!activeDataset || activeDataset.length === 0) return;
    showToast("📄 Preparing PDF print preview...", "#3B82F6");
    const printWindow = window.open("", "_blank");
    const headers = Object.keys(activeDataset[0]);

    let headersHtml = "";
    headers.forEach((h) => {
      headersHtml += `<th style="border:1px solid #cbd5e1; padding:8px 12px; background:#0f417a; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase;">${h}</th>`;
    });

    let rowsHtml = "";
    activeDataset.forEach((row, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
      rowsHtml += `<tr style="background:${bg}">`;
      headers.forEach((h) => {
        let val = row[h] !== undefined ? row[h] : "";
        rowsHtml += `<td style="border:1px solid #cbd5e1; padding:8px 12px; font-size:11px; color:#334155;">${val}</td>`;
      });
      rowsHtml += "</tr>";
    });

    const htmlContent = `
      <html>
        <head>
          <title>${getReportTitle(activeKpi)}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 20px; }
            h1 { font-size: 16px; font-weight: 800; color: #0f417a; margin-bottom: 4px; }
            p { font-size: 11px; color: #64748b; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>${getReportTitle(activeKpi)}</h1>
          <p>Generated on: ${new Date().toLocaleDateString()} | ${week}, ${month} ${year}</p>
          <table>
            <thead><tr>${headersHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCopyData = () => {
    if (!activeDataset || activeDataset.length === 0) return;
    const headers = Object.keys(activeDataset[0]);
    const rowsText = activeDataset.map((r) =>
      headers.map((h) => (r[h] !== undefined ? r[h] : "")).join("\t"),
    );
    const tsv = [headers.join("\t"), ...rowsText].join("\n");
    navigator.clipboard.writeText(tsv).then(() => {
      showToast("📋 Report copied to clipboard!", "#10B981");
    });
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 relative">
      <style>{`
        .eoffice-blue-grid .ag-header,
        .eoffice-blue-grid .ag-header-cell,
        .eoffice-blue-grid .ag-header-group-cell {
          background-color: #0f417a !important;
          color: #ffffff !important;
        }
        .eoffice-blue-grid .ag-header-cell-text {
          color: #ffffff !important;
          font-weight: 800 !important;
        }

        .eoffice-brown-grid .ag-header,
        .eoffice-brown-grid .ag-header-cell,
        .eoffice-brown-grid .ag-header-group-cell {
          background-color: #5c2424 !important;
          color: #ffffff !important;
        }
        .eoffice-brown-grid .ag-header-cell-text {
          color: #ffffff !important;
          font-weight: 800 !important;
        }

        .eoffice-blue-grid .ag-floating-bottom-row,
        .eoffice-brown-grid .ag-floating-bottom-row {
          background-color: #f8fafc !important;
          font-weight: 900 !important;
          border-top: 2px solid #cbd5e1 !important;
        }

        @keyframes indeterminateProgress {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(0%) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(1); }
        }
        .animate-indeterminate-progress {
          animation: indeterminateProgress 1.4s infinite ease-in-out;
          transform-origin: left;
        }
      `}</style>

  


      {/* Styled Confirm Modal (replaces window.confirm) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border-l-4 border-amber-400 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  closeConfirm();
                  if (cb) cb();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Page Title & Subtitle + Category Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            E-Office Management
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Track departmental file pendency, receipt processing, and disposal performance across all wings.
          </p>
        </div>

        <EOfficeCategoryHeader
          activeKpi={activeKpi}
          setSelectedKpi={handleCategorySelect}
        />
      </div>

      {/* Row 2: Navigation Toolbar & User Manual */}
      <EOfficeToolbar
        getReportTitle={getReportTitle}
        activeKpi={activeKpi}
        week={week}
        month={month}
        year={year}
        subTab={subTab}
        setSubTab={handleSubTabSelect}
        showToast={showToast}
        onDownloadSample={handleDownloadSample}
      />

      {/* Dynamic Sub-Tab Views */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        {subTab === "upload" && (
          <EOfficeUploadView
            handleUploadSubmit={handleUploadSubmit}
            uploadFinancialYear={activeUploadState.uploadFinancialYear}
            setUploadFinancialYear={(val) => updateActiveUploadState({ uploadFinancialYear: val })}
            uploadMonth={activeUploadState.uploadMonth}
            setUploadMonth={(val) => updateActiveUploadState({ uploadMonth: val })}
            uploadWeek={activeUploadState.uploadWeek}
            setUploadWeek={(val) => updateActiveUploadState({ uploadWeek: val })}
            selectedFile={activeUploadState.selectedFile}
            setSelectedFile={(file) => updateActiveUploadState({ selectedFile: file })}
            handleFileSelect={handleFileSelect}
            uploading={uploading}
            fileValidationError={activeUploadState.fileValidationError}
            setFileValidationError={(err) => updateActiveUploadState({ fileValidationError: err })}
            previewRows={activeUploadState.previewRows}
            setPreviewRows={(rows) => updateActiveUploadState({ previewRows: rows })}
            previewColDefs={previewColDefs}
            onDownloadSample={handleDownloadSample}
          />
        )}

        {subTab === "data" && (
          <EOfficeDataListView
            handleCopyData={handleCopyData}
            handleExportExcel={handleExportExcel}
            handleExportPdf={handleExportPdf}
            pageSize={pageSize}
            setPageSize={setPageSize}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            fetchError={fetchError}
            fetchEOfficeData={fetchEOfficeData}
            loading={loading}
            filteredData={filteredData}
            colDefs={colDefs}
            pinnedBottomRowData={pinnedBottomRowData}
          />
        )}

        {subTab === "report" && (
          <EOfficeReportView
            isFilterCollapsed={isFilterCollapsed}
            setIsFilterCollapsed={setIsFilterCollapsed}
            month={month}
            setMonth={setMonth}
            year={year}
            setYear={setYear}
            week={week}
            setWeek={setWeek}
            handleFetchReportClick={handleFetchReportClick}
            handleCopyData={handleCopyData}
            handleExportExcel={handleExportExcel}
            handleExportPdf={handleExportPdf}
            pageSize={pageSize}
            setPageSize={setPageSize}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            loading={loading}
            filteredData={filteredData}
            colDefs={colDefs}
            pinnedBottomRowData={pinnedBottomRowData}
          />
        )}

        {subTab === "files" && (
          <EOfficeFilesHistoryView
            filesList={filesList}
            pageSize={pageSize}
            setPageSize={setPageSize}
            historyColDefs={historyColDefs}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
