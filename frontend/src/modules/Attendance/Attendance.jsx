import { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  UserCheck, 
  ChevronLeft, 
  ChevronDown,
  Filter,
  Search,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Users,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import Table from '../../components/Table';
import ExportDropdown from '../../components/ExportDropdown';
import CopyButton from '../../components/CopyButton';
import AttendanceKpiHeader from './components/AttendanceKpiHeader';
import AttendanceToolbar from './components/AttendanceToolbar';
import AttendanceUploadView from './components/AttendanceUploadView';
import AttendanceDataListView from './components/AttendanceDataListView';
import AttendanceFilesHistoryView from './components/AttendanceFilesHistoryView';
import {
  colorFromString,
  getInits,
  formatTimeStr,
  calculateWorkingHoursDifference,
  validateAttendanceHeaders,
  validateAttendanceRows,
} from './utils/attendanceUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function AttendanceView({ triggerNotification }) {
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const subTabParam = params.get('subtab') || params.get('tab');
    return subTabParam && ['upload', 'data', 'report', 'files'].includes(subTabParam)
      ? subTabParam
      : null;
  };

  const updateUrlParams = (newSubTab) => {
    const params = new URLSearchParams(window.location.search);
    params.set('subtab', newSubTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ subTab: newSubTab }, '', newUrl);
  };

  const [subTab, setSubTabState] = useState(() => {
    const sTab = getUrlParams();
    return sTab || 'upload';
  });

  const setSubTab = (sTab) => {
    setSubTabState(sTab);
    updateUrlParams(sTab);
  };

  useEffect(() => {
    const handlePopState = () => {
      const pSubTab = getUrlParams();
      if (pSubTab) setSubTabState(pSubTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data lists from DB
  const [filesList, setFilesList] = useState([]);
  const [employeeRows, setEmployeeRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // The most recently uploaded file's data, identified by the highest
  // File_Id present in employeeRows itself. filesList intentionally isn't
  // used for this: it's fetched from a different table (tbl_attendance)
  // than employeeRows (tbl_employee_attendance, linked to
  // tbl_emp_attendance_file), so the two have no shared ID space -- an
  // earlier version of this cross-referenced them and always resolved to
  // no match. File_Id is an auto-incrementing key, so its max value here
  // reliably identifies the latest upload's rows.
  const latestFileId = useMemo(() => {
    if (!employeeRows || employeeRows.length === 0) return null;
    let maxId = null;
    employeeRows.forEach(r => {
      const fid = Number(r.File_Id ?? r.File_ID ?? r.file_id);
      if (!isNaN(fid) && (maxId === null || fid > maxId)) maxId = fid;
    });
    return maxId;
  }, [employeeRows]);

  // Upload states & file data preview
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [fileValidationError, setFileValidationError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadFinancialYear, setUploadFinancialYear] = useState('');
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadWeek, setUploadWeek] = useState('');

 

  // Styled confirm modal, replacing window.confirm() for the upload-replace
  // and delete-file prompts so they match the app's visual language instead
  // of the browser's native dialog.
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const askConfirm = (message, onConfirm) => {
    setConfirmModal({ open: true, message, onConfirm });
  };
  const closeConfirm = () => setConfirmModal({ open: false, message: '', onConfirm: null });

  // View Data tab filter states
  const [dataFilterWing, setDataFilterWing] = useState('All');
  const [dataFilterMonth, setDataFilterMonth] = useState('All');
  const [dataFilterYear, setDataFilterYear] = useState('All');
  const [dataFilterWeek, setDataFilterWeek] = useState('All');

  // ---- ABSTRACT REPORT TAB STATE ----
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState('July');
  const [reportYear, setReportYear] = useState('2026');
  const [reportWeek, setReportWeek] = useState(2);

  // ---- DRILL DOWN REPLACE-UI STATE (NO OVERLAY) ----
  const [reportViewMode, setReportViewMode] = useState('summary'); // 'summary' | 'detail'
  const [detailData, setDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');

  // Page limit for tables
  const [pageSize, setPageSize] = useState(15);
  const gridRef = useRef(null);
  const [fetchError, setFetchError] = useState(null);

  // In-memory data cache
  const attendanceCache = useRef({});

    // Routes through the app-wide Notification system (App.jsx's
  // triggerNotification) instead of a separate local toast -- this module
  // previously had its own solid-color pill toast because AttendanceView
  // was never passed triggerNotification as a prop, unlike every other
  // module. Keeping the showToast(msg, color) call signature here means
  // none of the ~20 existing call sites below need to change.
  const TOAST_COLOR_TYPE = {
    '#10B981': 'success',
    '#EF4444': 'error',
    '#F59E0B': 'warning',
  };
  const showToast = (msg, color = '#3B82F6') => {
    const type = TOAST_COLOR_TYPE[color] || 'success';
    // The old pill toast needed a leading emoji for visual context; the
    // shared Notification component already conveys that via its icon, so
    // strip it to match how the rest of the app calls triggerNotification.
    const cleanMsg = msg.replace(/^(⚠️?|❌|✅|🗑️?|📈|📄|📋)\s*/u, '');
    if (triggerNotification) {
      triggerNotification(cleanMsg, type);
    }
  };

  // ---- FETCH FROM DATABASE WITH IN-MEMORY CACHING ----
  const fetchFilesAndData = (forceRefresh = false) => {
    const cacheKey = "files_data";

    if (!forceRefresh && attendanceCache.current[cacheKey]) {
      setFilesList(attendanceCache.current[cacheKey].filesList);
      setEmployeeRows(attendanceCache.current[cacheKey].employeeRows);
      setFetchError(null);
      setLoading(false);
      return;
    }

    setFilesList([]);
    setEmployeeRows([]);
    setFetchError(null);
    setLoading(true);
    
    const p1 = axios.get(`${API_BASE_URL}/attendance`)
      .then(res => (Array.isArray(res.data) ? res.data : res.data?.rowData) || [])
      .catch(() => axios.get(`${API_BASE_URL}/employee-attendance-file`).then(res => res.data?.rowData || res.data || []).catch(() => []));

    const p2 = axios.get(`${API_BASE_URL}/employee-attendance-view`)
      .then(res => {
        const rows = (Array.isArray(res.data) ? res.data : res.data?.rowData) || [];
        if (rows.length > 0) return rows;
        return axios.get(`${API_BASE_URL}/excelData`).then(r => r.data || []).catch(() => []);
      })
      .catch(() => axios.get(`${API_BASE_URL}/excelData`).then(res => res.data || []).catch(() => []));

    Promise.all([p1, p2])
      .then(([files, rows]) => {
        setFilesList(files);
        setEmployeeRows(rows);
        attendanceCache.current[cacheKey] = { filesList: files, employeeRows: rows };
      })
      .catch(() => {
        setFetchError("Failed to connect to attendance database server");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFilesAndData();

    axios.get(`${API_BASE_URL}/employee-attendance-check`)
      .then(res => {
        const data = res.data;
        if (data && data.length > 0) {
          const latestMonth = data[0].Month || 'July';
          const latestYear = String(data[0].Year || '2026');
          const latestWeek = Number(data[0].Week || 2);
          
          setReportMonth(latestMonth);
          setReportYear(latestYear);
          setReportWeek(latestWeek);
          
          handleFetchReport(latestMonth, latestYear, latestWeek);
        } else {
          handleFetchReport();
        }
      })
      .catch(err => {
        console.error("Latest file parameters fetch error:", err);
        handleFetchReport();
      });
  }, []);

  const handleFetchReport = (
    targetMonth = reportMonth,
    targetYear = reportYear,
    targetWeek = reportWeek,
    forceRefresh = false,
  ) => {
    const cacheKey = `report_${targetMonth}_${targetYear}_${targetWeek}`;

    if (!forceRefresh && attendanceCache.current[cacheKey]) {
      setReportData(attendanceCache.current[cacheKey]);
      setReportViewMode('summary');
      setFetchError(null);
      setReportLoading(false);
      return;
    }

    setReportData([]);
    setFetchError(null);
    setReportLoading(true);
    setReportViewMode('summary');

    axios.get(`${API_BASE_URL}/employee-attendance-weekone-report/${targetMonth}/${targetYear}/${targetWeek}`)
      .then(res => {
        const data = res.data.rowData || res.data || [];
        setReportData(data);
        attendanceCache.current[cacheKey] = data;
      })
      .catch(err => {
        console.error("Report fetch error:", err);
        setReportData([]);
        if (err.response?.status !== 404) {
          setFetchError(err.response?.data?.message || err.message || "Failed to fetch attendance report");
        }
      })
      .finally(() => setReportLoading(false));
  };

  const [selectedWing, setSelectedWing] = useState('');

  const mapColumnToBackendType = (colName) => {
    if (!colName) return 'noOfEmp';
    const c = colName.toLowerCase();
    if (c.includes('before') && (c.includes('9:30') || c.includes('in'))) return 'beforeIn';
    if (c.includes('after') && (c.includes('9:30') || c.includes('in'))) return 'afterIn';
    if (c.includes('before') && (c.includes('5:30') || c.includes('out'))) return 'beforeOut';
    if (c.includes('less than') || c.includes('8 1/2') || c.includes('8.5')) return 'avgWorkCount';
    if (c.includes('average working hours')) return 'avgWorkHours';
    return 'noOfEmp';
  };

  const filterRowsByColumnCriteria = (rows, colName) => {
    if (!colName || colName === 'Wing' || colName === 'Wing Name' || colName === 'All' || colName.includes('Number Of Employees') || colName.includes('Total Monitored')) {
      return rows;
    }
    const c = colName.toLowerCase();

    // 1. Before 9:30 AM
    if (c.includes('before') && (c.includes('9:30') || c.includes('in'))) {
      return rows.filter(r => {
        const inTime = formatTimeStr(r.InTimeAvg || r['In Time Avg'] || r.InTime || r.in_time || r['In Time']);
        if (inTime && inTime.includes(':')) {
          const [h, m] = inTime.split(':').map(Number);
          return h < 9 || (h === 9 && m < 30);
        }
        return false;
      });
    }

    // 2. After 9:30 AM
    if (c.includes('after') && (c.includes('9:30') || c.includes('in'))) {
      return rows.filter(r => {
        const inTime = formatTimeStr(r.InTimeAvg || r['In Time Avg'] || r.InTime || r.in_time || r['In Time']);
        if (inTime && inTime.includes(':')) {
          const [h, m] = inTime.split(':').map(Number);
          return h > 9 || (h === 9 && m >= 30);
        }
        return false;
      });
    }

    // 3. Out Time Before 5:30 PM (17:30:00)
    if (c.includes('before') && (c.includes('5:30') || c.includes('out'))) {
      return rows.filter(r => {
        const outTime = formatTimeStr(r.OutTimeAvg || r['Out Time Avg'] || r.OutTime || r.out_time || r['Out Time']);
        if (outTime && outTime.includes(':')) {
          const [h, m] = outTime.split(':').map(Number);
          return h < 17 || (h === 17 && m < 30);
        }
        return false;
      });
    }

    // 4. Average Working Hours Less than 8 1/2 hrs
    if (c.includes('less than') || c.includes('8 1/2') || c.includes('8.5')) {
      return rows.filter(r => {
        const workStr = formatTimeStr(r.WorkingHours || r['Working Hours'] || r.AverageWorkingHours || r['Average Working Hours']);
        if (workStr && workStr.includes(':')) {
          const [h, m, s] = workStr.split(':').map(Number);
          const totalSec = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
          return totalSec < 30600;
        }
        return false;
      });
    }

    return rows;
  };

  const handleCellClick = (param1, field, colHeader, cellValue) => {
    let data, colName, val;
    if (param1 && param1.data) {
      data = param1.data;
      colName = param1.colDef ? (param1.colDef.headerName || param1.column?.getColId()) : field;
      val = param1.value !== undefined ? param1.value : data[colName];
    } else {
      data = param1;
      colName = colHeader || field;
      val = cellValue;
    }

    if (!data) return;
    const wingName = data.Wing || data['Wing Name'] || data.wing_name || data.organization_name;
    if (!wingName || wingName === 'Total' || wingName === 'Summary') return;

    setSelectedWing(wingName);
    const columnName = colName || 'All';
    const targetCount = (typeof val === 'number') ? val : parseInt(val, 10);
    const typeParam = mapColumnToBackendType(columnName);
    const wingParam = data.WingID || data.wing_id || wingName;
    const weekNum = String(reportWeek).replace(/[^0-9]/g, '') || '1';

    const cacheKey = `detail_${reportYear}_${reportMonth}_${wingParam}_${typeParam}_${weekNum}_${targetCount || 'all'}`;

    setDetailTitle(`Form No.: 1.3B - Detailed - Attendance Sheet`);
    setReportViewMode('detail');

    if (attendanceCache.current[cacheKey]) {
      setDetailData(attendanceCache.current[cacheKey]);
      return;
    }

    setDetailData([]);
    setDetailLoading(true);

    axios.get(`${API_BASE_URL}/employee-attendance-weekone-detail/${reportYear}/${reportMonth}/${encodeURIComponent(wingParam)}/0/${typeParam}/${weekNum}`)
      .then(res => {
        const rows = res.data.rowData || res.data || [];
        if (rows.length > 0) {
          // Render the exact database records returned by SQL WHERE clause
          setDetailData(rows);
          attendanceCache.current[cacheKey] = rows;
        } else {
          // Fallback local filtering if DB query returns empty
          const normWing = String(wingName).toLowerCase().trim();
          let wingRows = employeeRows.filter(r => {
            const w = String(r.Wing || r.wing_name || r.organization_name || r.Division || r.division_name || '').toLowerCase().trim();
            return w.includes(normWing) || normWing.includes(w);
          });
          if (wingRows.length === 0) wingRows = employeeRows;

          let processed = filterRowsByColumnCriteria(wingRows, columnName);
          if (!isNaN(targetCount) && targetCount > 0 && processed.length > targetCount) {
            processed = processed.slice(0, targetCount);
          }
          setDetailData(processed);
          attendanceCache.current[cacheKey] = processed;
        }
      })
      .catch(err => {
        console.error("Detail report fetch error:", err);
        const normWing = String(wingName).toLowerCase().trim();
        let wingRows = employeeRows.filter(r => {
          const w = String(r.Wing || r.wing_name || r.organization_name || r.Division || r.division_name || '').toLowerCase().trim();
          return w.includes(normWing) || normWing.includes(w);
        });
        if (wingRows.length === 0) wingRows = employeeRows;

        let processed = filterRowsByColumnCriteria(wingRows, columnName);
        if (!isNaN(targetCount) && targetCount > 0 && processed.length > targetCount) {
          processed = processed.slice(0, targetCount);
        }
        setDetailData(processed);
        attendanceCache.current[cacheKey] = processed;
      })
      .finally(() => setDetailLoading(false));
  };

  const activeReportData = useMemo(() => {
    if (!searchTerm.trim()) return reportData;
    const term = searchTerm.toLowerCase();
    return reportData.filter(row => 
      Object.values(row).some(val => String(val || '').toLowerCase().includes(term))
    );
  }, [reportData, searchTerm]);

  const availableWings = useMemo(() => {
    const wings = new Set(employeeRows.map(r => r.Wing).filter(Boolean));
    return ['All', ...Array.from(wings)];
  }, [employeeRows]);

  const availableMonths = useMemo(() => {
    const months = new Set(employeeRows.map(r => r.Month).filter(Boolean));
    return ['All', ...Array.from(months)];
  }, [employeeRows]);

  const availableYears = useMemo(() => {
    const years = new Set(employeeRows.map(r => String(r.Year)).filter(Boolean));
    return ['All', ...Array.from(years)];
  }, [employeeRows]);

  const availableWeeks = useMemo(() => {
    const weeks = new Set(employeeRows.map(r => r.week ?? r.Week).filter(v => v !== undefined && v !== null && v !== '').map(String));
    return ['All', ...Array.from(weeks).sort((a, b) => Number(a) - Number(b))];
  }, [employeeRows]);

  const filteredEmployeeRows = useMemo(() => {
    const anyFilterActive = dataFilterWing !== 'All' || dataFilterMonth !== 'All' || dataFilterYear !== 'All' || dataFilterWeek !== 'All';

    // Default view: only the most recently uploaded file's rows. Once any
    // filter is set, search across the full historical dataset instead.
    let result = (!anyFilterActive && latestFileId !== null)
      ? employeeRows.filter(r => Number(r.File_Id ?? r.File_ID ?? r.file_id) === latestFileId)
      : employeeRows;

    if (dataFilterWing !== 'All') {
      result = result.filter(r => r.Wing === dataFilterWing || r.wing_name === dataFilterWing);
    }
    if (dataFilterMonth !== 'All') {
      result = result.filter(r => r.Month === dataFilterMonth);
    }
    if (dataFilterYear !== 'All') {
      result = result.filter(r => String(r.Year) === String(dataFilterYear));
    }
    if (dataFilterWeek !== 'All') {
      result = result.filter(r => String(r.week ?? r.Week) === String(dataFilterWeek));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(val => String(val || '').toLowerCase().includes(term))
      );
    }

    return result;
  }, [employeeRows, latestFileId, dataFilterWing, dataFilterMonth, dataFilterYear, dataFilterWeek, searchTerm]);

  const totalEmployeesStat = useMemo(() => {
    if (subTab === 'report' && reportData.length > 0) {
      const totalRow = reportData.find(r => r.Wing === 'Total');
      const wingRows = reportData.filter(r => r.Wing && r.Wing !== 'Total');
      const wingsCount = wingRows.length;
      const wingLabel = wingsCount ? `Across ${wingsCount} wing${wingsCount > 1 ? 's' : ''}` : 'This period';

      if (totalRow && totalRow['Total Monitored Employees']) {
        return { empCount: totalRow['Total Monitored Employees'], wingCount: wingLabel };
      }
      const sum = reportData.reduce((acc, r) => acc + (Number(r['Total Monitored Employees']) || 0), 0);
      if (sum > 0) return { empCount: sum, wingCount: wingLabel };
    }
    const empIds = new Set(filteredEmployeeRows.map(r => r.EmpId || r['Emp Id']).filter(Boolean));
    const empCount = empIds.size > 0 ? empIds.size : filteredEmployeeRows.length;
    const wingsCount = new Set(filteredEmployeeRows.map(r => r.Wing).filter(Boolean)).size;
    return { empCount, wingCount: wingsCount ? `Across ${wingsCount} wing${wingsCount > 1 ? 's' : ''}` : 'From latest upload' };
  }, [subTab, reportData, filteredEmployeeRows]);

  const avgWorkingHoursFormatted = useMemo(() => {
    if (subTab === 'report' && reportData.length > 0) {
      const totalRow = reportData.find(r => r.Wing === 'Total');
      if (totalRow && totalRow['Avg Working Hours (HH:MM:SS)']) {
        return formatTimeStr(totalRow['Avg Working Hours (HH:MM:SS)']);
      }
    }
    if (filteredEmployeeRows.length === 0) return '08:15:00';
    let totalSec = 0;
    let count = 0;
    filteredEmployeeRows.forEach(r => {
      const inTime = r.InTimeAvg || r['In Time Avg'] || r.InTime || r.in_time || r['In Time'];
      const outTime = r.OutTimeAvg || r['Out Time Avg'] || r.OutTime || r.out_time || r['Out Time'];
      const rawWorkHours = r.WorkingHours || r['Working Hours'] || r.working_hours;

      const timeStr = calculateWorkingHoursDifference(inTime, outTime, rawWorkHours);
      if (timeStr && timeStr.includes(':')) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3 && !isNaN(parts[0])) {
          totalSec += parts[0] * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
          count++;
        }
      }
    });
    if (count === 0) return '08:15:00';
    const avgSec = Math.round(totalSec / count);
    const h = String(Math.floor(avgSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((avgSec % 3600) / 60)).padStart(2, '0');
    const s = String(avgSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [subTab, reportData, filteredEmployeeRows]);

  const earlyCheckoutRate = useMemo(() => {
    if (filteredEmployeeRows.length === 0) return '0%';
    let earlyCount = 0;
    let validCount = 0;
    filteredEmployeeRows.forEach(r => {
      const outTime = formatTimeStr(r.OutTimeAvg || r['Out Time Avg']);
      if (outTime && outTime.includes(':')) {
        validCount++;
        const [h, m] = outTime.split(':').map(Number);
        if (h < 17 || (h === 17 && m <= 30)) earlyCount++;
      }
    });
    if (validCount === 0) return '0%';
    return `${Math.round((earlyCount / validCount) * 100)}%`;
  }, [filteredEmployeeRows]);

  const punctualArrivalRate = useMemo(() => {
    if (subTab === 'report' && reportData.length > 0) {
      const totalRow = reportData.find(r => r.Wing === 'Total');
      if (totalRow) {
        const before930 = Number(totalRow['In-Time Before 09:30 AM']) || 0;
        const totalMon = Number(totalRow['Total Monitored Employees']) || 0;
        if (totalMon > 0) return `${Math.round((before930 / totalMon) * 100)}%`;
      }
    }
    if (filteredEmployeeRows.length === 0) return '92.4%';
    let onTimeCount = 0;
    let validCount = 0;
    filteredEmployeeRows.forEach(r => {
      const inTime = formatTimeStr(r.InTimeAvg || r['In Time Avg']);
      if (inTime && inTime.includes(':')) {
        validCount++;
        const [h, m] = inTime.split(':').map(Number);
        if (h < 9 || (h === 9 && m <= 30)) onTimeCount++;
      }
    });
    if (validCount === 0) return '92.4%';
    return `${Math.round((onTimeCount / validCount) * 100)}%`;
  }, [subTab, reportData, filteredEmployeeRows]);

  const pinnedBottomRowData = useMemo(() => {
    if (subTab === 'report') {
      const totalRow = reportData.find(r => r.Wing === 'Total');
      return totalRow ? [totalRow] : [];
    }
    if (filteredEmployeeRows.length === 0) return [];
    return [{
      EmpId: 'Total',
      EmpName: `${filteredEmployeeRows.length} Employees Total`,
      Wing: 'All Wings',
      Division: 'All Divisions',
      Designation: 'Summary',
      AttendanceMarked: '—',
      WorkingHours: avgWorkingHoursFormatted,
      InTimeAvg: '—',
      OutTimeAvg: '—'
    }];
  }, [subTab, reportData, filteredEmployeeRows, avgWorkingHoursFormatted]);

  const showKpiCards = (subTab === 'report' || subTab === 'data') && reportViewMode !== 'detail';

  const reportColDefs = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    const sample = reportData[0];
    return Object.keys(sample).map(key => {
      const isWing = key.toLowerCase().includes('wing');
      
      return {
        headerName: key,
        field: key,
        flex: isWing ? 2 : 1,
        minWidth: isWing ? 180 : 120,
        filter: true,
        sortable: true,
        pinned: isWing ? 'left' : null,
        cellClass: (params) => {
          if (params.data && params.data.Wing === 'Total') {
            return 'font-black text-slate-900 bg-slate-100 text-center flex items-center justify-center';
          }
          if (isWing) return 'font-semibold text-[#0f417a] text-left flex items-center cursor-pointer hover:underline';
          return 'text-slate-700 text-center flex items-center justify-center cursor-pointer hover:bg-amber-50/80 font-bold';
        },
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return '—';
          const colKey = key.toLowerCase();
          if (colKey === "year" || colKey.includes("emp") || colKey === "s.no" || colKey === "id") {
            return String(params.value).replace(/,/g, "");
          }
          if (typeof params.value === 'number') return params.value.toLocaleString();
          return formatTimeStr(params.value);
        },
        onCellClicked: (params) => {
          if (!params || !params.data) return;
          const wingName = params.data.Wing || params.data['Wing Name'] || params.data.wing_name;
          if (wingName && wingName !== 'Total') {
            handleCellClick(params.data, params.colDef.field, params.colDef.headerName);
          }
        }
      };
    });
  }, [reportData, employeeRows]);

  const detailColDefs = useMemo(() => {
    if (!detailData || detailData.length === 0) return [];
    const sample = detailData[0];
    const keys = Object.keys(sample);
    return [
      {
        headerName: 'S.No',
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : 1),
        width: 70,
        pinned: 'left',
        cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
      },
      ...keys.map((key) => {
        const isEmp = key.toLowerCase().includes('name') || key.toLowerCase().includes('emp');
        const isWorkHours = key.toLowerCase().includes('working') || key.toLowerCase().includes('work');

        return {
          headerName: key,
          field: key,
          flex: isEmp ? 2 : 1,
          minWidth: isEmp ? 180 : 120,
          filter: true,
          sortable: true,
          cellClass: (params) => {
            if (isEmp) return 'font-semibold text-slate-800 text-left flex items-center';
            return 'text-slate-700 text-center flex items-center justify-center';
          },
          valueGetter: isWorkHours
            ? (params) => {
                if (!params || !params.data) return '—';
                const r = params.data;
                const inTime = r.InTimeAvg || r['In Time Avg'] || r.InTime || r.in_time || r['In Time'];
                const outTime = r.OutTimeAvg || r['Out Time Avg'] || r.OutTime || r.out_time || r['Out Time'];
                const val = r[key];
                return calculateWorkingHoursDifference(inTime, outTime, val);
              }
            : undefined,
          valueFormatter: isWorkHours ? undefined : (params) => formatTimeStr(params.value),
        };
      }),
    ];
  }, [detailData]);

  const employeeColDefs = useMemo(() => {
    return [
      {
        headerName: 'S.No',
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : 1),
        width: 70,
        pinned: 'left',
        cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
      },
      {
        field: 'EmpId',
        headerName: 'Emp ID',
        width: 110,
        cellClass: 'font-bold text-[#0f417a] text-center flex items-center justify-center',
        valueGetter: (params) => {
          if (!params || !params.data) return '—';
          const r = params.data;
          return r.EmpId || r['Emp Id'] || r.Emp_Id || r.emp_id || '—';
        },
      },
      {
        field: 'EmpName',
        headerName: 'Employee Name',
        flex: 2,
        minWidth: 180,
        cellClass: 'font-semibold text-slate-800 flex items-center',
        valueGetter: (params) => {
          if (!params || !params.data) return '—';
          const r = params.data;
          return r.EmpName || r['Emp Name'] || r.Emp_Name || r.emp_name || '—';
        },
      },
      {
        field: 'Wing',
        headerName: 'Wing',
        flex: 1.5,
        minWidth: 140,
        cellClass: 'text-slate-700 font-medium flex items-center',
        valueGetter: (params) => {
          if (!params || !params.data) return '—';
          const r = params.data;
          return r.Wing || r['Wing Name'] || r.wing_name || r.organization_name || '—';
        },
      },
      {
        field: 'Division',
        headerName: 'Division',
        flex: 1.5,
        minWidth: 140,
        cellClass: 'text-slate-600 font-medium flex items-center',
        valueGetter: (params) => {
          if (!params || !params.data) return '—';
          const r = params.data;
          return r.Division || r['Division Name'] || r.division_name || '—';
        },
      },
      {
        field: 'Designation',
        headerName: 'Designation',
        flex: 1.5,
        minWidth: 150,
        cellClass: 'text-slate-600 font-medium flex items-center',
        valueGetter: (params) => {
          if (!params || !params.data) return '—';
          const r = params.data;
          return r.Designation || r.designation || '—';
        },
      },
      {
        field: 'AttendanceMarked',
        headerName: 'Days Marked',
        width: 120,
        cellClass: 'text-center font-bold text-slate-700 flex items-center justify-center',
        valueGetter: (params) => {
          if (!params || !params.data) return 0;
          const r = params.data;
          return r.AttendanceMarked || r['No. of days Attendance Marked'] || r.No_of_days_Attendance_Marked || r['Days Attendance Marked'] || 0;
        },
      },
      {
        field: 'WorkingHours',
        headerName: 'Avg Work Hours',
        width: 140,
        cellClass: 'text-center font-bold text-slate-800 flex items-center justify-center',
        valueGetter: (params) => {
          if (!params || !params.data) return '—';
          const r = params.data;
          const inTime = r.InTimeAvg || r['In Time Avg'] || r.In_Time_Avg || r.InTime || r.in_time || r['In Time'];
          const outTime = r.OutTimeAvg || r['Out Time Avg'] || r.Out_Time_Avg || r.OutTime || r.out_time || r['Out Time'];
          const workHours = r.WorkingHours || r['Working Hours'] || r.Average_Working_Hours || r.AverageWorkingHours || r['Average Working Hours'] || r.working_hours;

          return calculateWorkingHoursDifference(inTime, outTime, workHours);
        },
      },
      {
        field: 'InTimeAvg',
        headerName: 'In Time Avg',
        width: 130,
        cellClass: 'text-center font-medium text-emerald-700 flex items-center justify-center',
        valueGetter: (params) => {
          if (!params || !params.data) return '—';
          const r = params.data;
          return r.InTimeAvg || r['In Time Avg'] || r.In_Time_Avg || r.InTime || r.in_time || r['In Time'] || '—';
        },
        valueFormatter: (params) => formatTimeStr(params.value),
      },
      {
        field: 'OutTimeAvg',
        headerName: 'Out Time Avg',
        width: 130,
        cellClass: 'text-center font-medium text-slate-600 flex items-center justify-center',
        valueGetter: (params) => {
          if (!params || !params.data) return '—';
          const r = params.data;
          return r.OutTimeAvg || r['Out Time Avg'] || r.Out_Time_Avg || r.OutTime || r.out_time || r['Out Time'] || '—';
        },
        valueFormatter: (params) => formatTimeStr(params.value),
      },
    ];
  }, []);

  const historyColDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 70,
      pinned: 'left',
      cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
    },
    {
      field: 'file_name',
      headerName: 'File Name',
      flex: 3,
      minWidth: 260,
      cellClass: 'font-semibold flex items-center text-left',
      valueGetter: (params) => params.data['File Name'] || params.data.file_name || params.data.File_name || 'Attendance_Spreadsheet.xlsx',
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
      field: 'uploaded_by',
      headerName: 'Uploaded By',
      flex: 2,
      minWidth: 160,
      cellClass: 'text-slate-700 font-medium text-left flex items-center',
      valueGetter: (params) => params.data['Uploaded By'] || params.data.Uploaded_By || params.data.uploaded_by || 'Admin',
    },
    {
      field: 'date_of_upload',
      headerName: 'Date of Upload',
      flex: 2,
      minWidth: 160,
      cellClass: 'text-slate-600 font-medium text-center flex items-center justify-center',
      valueGetter: (params) => params.data['Date of Upload'] || params.data.date_of_upload || params.data.Date_of_Upload || '—',
    },
    {
      headerName: 'Actions',
      width: 120,
      cellClass: 'text-center flex items-center justify-center gap-2',
      cellRenderer: (params) => {
        const fName = params.data['File Name'] || params.data.file_name || params.data.File_name;
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
  ], []);

  const previewColDefs = useMemo(() => {
    if (!previewRows || previewRows.length === 0) return [];
    return Object.keys(previewRows[0]).map(key => ({
      headerName: key,
      field: key,
      flex: 1,
      minWidth: 120,
      cellClass: 'text-slate-700 font-semibold text-center flex items-center justify-center',
      valueFormatter: (params) => formatTimeStr(params.value),
    }));
  }, [previewRows]);

  const handleFileSelect = (file) => {
    if (!file) {
      setSelectedFile(null);
      setPreviewRows([]);
      setFileValidationError('');
      return;
    }

    setSelectedFile(file);
    setFileValidationError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          setPreviewRows([]);
          setFileValidationError('The selected file contains no data rows.');
          showToast('⚠ Selected file is empty', '#F59E0B');
          return;
        }

        const headerCheck = validateAttendanceHeaders(rows[0]);
        if (!headerCheck.valid) {
          setPreviewRows([]);
          setFileValidationError(headerCheck.missing.map(field => ({
            field,
            message: 'Required column not found in the uploaded file. Please use the official Attendance_Sample.xlsx format.',
          })));
          showToast(`❌ Template Validation Failed: Missing ${headerCheck.missing.join(', ')}`, '#EF4444');
          return;
        }

        const validRows = rows.filter(r => r && Object.keys(r).length > 0 && (r['Emp Id'] || r['EmpId'] || r['Emp Name'] || r['EmpName']));

        const rowIssues = validateAttendanceRows(validRows);
        if (rowIssues.length > 0) {
          setPreviewRows([]);
          setFileValidationError(rowIssues);
          showToast(`❌ ${rowIssues.length} validation issue${rowIssues.length > 1 ? 's' : ''} found in file`, '#EF4444');
          return;
        }

        setPreviewRows(validRows);
        showToast(`✅ Template Validated! Loaded ${validRows.length} rows preview`, '#10B981');
      } catch (err) {
        console.error("Preview parse error:", err);
        setPreviewRows([]);
        setFileValidationError('Could not read or parse the selected spreadsheet file.');
        showToast('⚠ Could not parse file preview', '#F59E0B');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const finishUploadSuccess = (month, year, week) => {
    setSelectedFile(null);
    setPreviewRows([]);
    setUploadFinancialYear('');
    setUploadMonth('');
    setUploadWeek('');
    setFileValidationError('');
    attendanceCache.current = {};
    fetchFilesAndData(true);

    if (month && year && week) {
      setReportMonth(month);
      setReportYear(year);
      setReportWeek(week);
      setDataFilterMonth(month);
      setDataFilterYear(year);
      handleFetchReport(month, year, week, true);
    }

    setSubTab('data');
  };

  const executeAttendanceUpload = (existingFileId, monthVal, yearVal, weekVal) => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('financialYear', yearVal);
    formData.append('month', monthVal);
    formData.append('week', weekVal);
    formData.append('userID', 1);

    const uploadRequest = existingFileId
        ? (() => {
            formData.append('fileId', existingFileId);
            return axios.put(`${API_BASE_URL}/attend-employee`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        })()
        : axios.post(`${API_BASE_URL}/employee-attendance`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

    uploadRequest
    .then(res => {
      showToast(existingFileId ? '✅ Attendance sheet updated successfully' : '✅ Attendance sheet uploaded and stored successfully', '#10B981');
      finishUploadSuccess(monthVal, yearVal, weekVal);
    })
    .catch(err => {
      console.warn("Primary endpoint returned:", err.response?.status, err.response?.data);
      if (existingFileId) {
        // No legacy fallback exists for the update path -- surface the
        // error directly instead of silently retrying against the create
        // endpoint, which would produce a duplicate File_Id.
        const errMsg = err.response?.data?.error || '❌ File update failed.';
        setFileValidationError(errMsg);
        showToast(errMsg, '#EF4444');
        return;
      }
      // Fallback to standard /attendance upload & storecsv endpoints
      const fallbackFormData = new FormData();
      fallbackFormData.append('file', selectedFile);
      
      return axios.post(`${API_BASE_URL}/attendance`, fallbackFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      .then(res => {
        const id = res.data.id || res.data.fileId;
        if (id) {
          return axios.post(`${API_BASE_URL}/attendance/storecsv/${id}`);
        }
      })
      .then(() => {
        showToast('✅ Attendance sheet uploaded and stored successfully', '#10B981');
        finishUploadSuccess(monthVal, yearVal, weekVal);
      })
      .catch(fallbackErr => {
        console.error("Fallback upload error:", fallbackErr);
        const errMsg = err.response?.data?.error || fallbackErr.response?.data?.error || '❌ File upload failed. Missing or Mismatched headers.';
        setFileValidationError(errMsg);
        showToast(errMsg, '#EF4444');
      });
    })
    .finally(() => setUploading(false));
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadFinancialYear) { showToast('⚠ Please select Financial Year', '#F59E0B'); return; }
    if (!uploadMonth) { showToast('⚠ Please select Month', '#F59E0B'); return; }
    if (!uploadWeek) { showToast('⚠ Please select Week', '#F59E0B'); return; }
    if (!selectedFile) { showToast('⚠ Please select an Excel file', '#F59E0B'); return; }
    if (fileValidationError) {
      const errMsg = Array.isArray(fileValidationError)
        ? `${fileValidationError.length} validation issue${fileValidationError.length > 1 ? 's' : ''} in file`
        : fileValidationError;
      showToast(`❌ Cannot upload: ${errMsg}`, '#EF4444');
      return;
    }

    const yearVal = uploadFinancialYear.split('-')[0] || '2026';
    const monthVal = uploadMonth;
    const weekVal = uploadWeek;

    // If a file already exists for this exact Year/Month/Week, route this
    // upload through the update endpoint (which replaces that file's rows)
    // instead of always creating a brand-new File_Id for the same period.
    const existingMatch = employeeRows.find(r =>
        String(r.Year) === String(yearVal) &&
        r.Month === monthVal &&
        String(r.week) === String(weekVal)
    );
    const existingFileId = existingMatch ? existingMatch.File_Id : null;

    if (existingFileId) {
        askConfirm(
            `A file already exists for ${monthVal} ${yearVal}, Week ${weekVal}. Uploading will replace all existing attendance data for this period. Continue?`,
            () => {
                setUploading(true);
                executeAttendanceUpload(existingFileId, monthVal, yearVal, weekVal);
            }
        );
        return;
    }

    setUploading(true);
    executeAttendanceUpload(existingFileId, monthVal, yearVal, weekVal);
  };

  const handleDownloadFile = (id, fileName) => {
    axios.get(`${API_BASE_URL}/attendance/download/${id}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || 'attendance_file.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => {
        console.error("Download error:", err);
        showToast('❌ Failed to download file', '#EF4444');
      });
  };

    const handleDeleteFile = (id) => {
    askConfirm("Deleting the file will also delete all attendance records parsed from it. Continue?", () => {
      axios.delete(`${API_BASE_URL}/attendance/${id}`)
        .then(() => {
          showToast('🗑️ File record deleted successfully', '#10B981');
          attendanceCache.current = {};
          fetchFilesAndData(true);
        })
        .catch(err => {
          console.error("Delete error:", err);
          showToast('❌ Failed to delete record', '#EF4444');
        });
    });
  };

  const handleDownloadSample = () => {
    axios.get(`${API_BASE_URL}/attendance/downloadSampleDocument`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Attendance_Sample.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => {
        console.error("Sample download error:", err);
        showToast('❌ Download failed. Serving default template.', '#EF4444');
      });
  };

  const handleExportExcel = () => {
    const dataset = subTab === 'report' ? activeReportData : filteredEmployeeRows;
    if (!dataset || dataset.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    XLSX.writeFile(workbook, `Attendance_${reportMonth}_${reportYear}.xlsx`);
    showToast('📈 Exported report to Excel successfully!', '#10B981');
  };

  const handleExportPdf = () => {
    const dataset = subTab === 'report' ? activeReportData : filteredEmployeeRows;
    if (!dataset || dataset.length === 0) return;
    showToast('📄 Preparing PDF print preview...', '#3B82F6');
    const printWindow = window.open('', '_blank');
    const headers = Object.keys(dataset[0]);
    
    let headersHtml = '';
    headers.forEach(h => {
      headersHtml += `<th style="border:1px solid #cbd5e1; padding:8px 12px; background:#0f417a; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase;">${h}</th>`;
    });

    let rowsHtml = '';
    dataset.forEach((row, i) => {
      const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
      rowsHtml += `<tr style="background:${bg}">`;
      headers.forEach(h => {
        let val = row[h] !== undefined ? row[h] : '';
        rowsHtml += `<td style="border:1px solid #cbd5e1; padding:8px 12px; font-size:11px; color:#334155;">${val}</td>`;
      });
      rowsHtml += '</tr>';
    });

    const htmlContent = `
      <html>
        <head>
          <title>Attendance Report - ${reportMonth} ${reportYear}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 20px; }
            h1 { font-size: 16px; font-weight: 800; color: #0f417a; margin-bottom: 4px; }
            p { font-size: 11px; color: #64748b; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()} | ${reportMonth} ${reportYear}</p>
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
    const dataset = subTab === 'report' ? activeReportData : filteredEmployeeRows;
    if (!dataset || dataset.length === 0) return;
    const headers = Object.keys(dataset[0]);
    const rowsText = dataset.map(r => headers.map(h => r[h] !== undefined ? r[h] : '').join('\t'));
    const tsv = [headers.join('\t'), ...rowsText].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('📋 Report copied to clipboard!', '#10B981');
    });
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 relative">
      <style>{`
        .yp-pro-grid .ag-header,
        .yp-pro-grid .ag-header-cell,
        .yp-pro-grid .ag-header-group-cell {
          background-color: #4b2424 !important;
          color: #ffffff !important;
        }
        .yp-pro-grid .ag-header-cell-text {
          color: #ffffff !important;
          font-weight: 800 !important;
        }

        .yp-pro-grid .ag-floating-bottom-row {
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

      {/* Page Title & Subtitle + Sub-Tabs & User Manual in Header Line */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 px-4 md:px-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Employee Attendance Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Monitor punctuality, daily work duration, and wing-wise attendance parameters.
          </p>
        </div>

        {/* Sub-tabs (Upload > View Files > DataList > Report) & User Manual */}
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 select-none">
            <button
              type="button"
              onClick={() => setSubTab('upload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'upload'
                  ? 'bg-[#0f417a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload Attendance
            </button>

            <button
              type="button"
              onClick={() => setSubTab('files')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'files'
                  ? 'bg-[#0f417a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              View Files
            </button>

            <button
              type="button"
              onClick={() => setSubTab('data')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'data'
                  ? 'bg-[#0f417a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DataList
            </button>

            <button
              type="button"
              onClick={() => setSubTab('report')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'report'
                  ? 'bg-[#0f417a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Report
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSample}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer flex-shrink-0 select-none"
            title="Download User Manual excel template"
          >
            <span>User Manual</span>
          </button>
        </div>
      </div>

      {/* Top KPI Header Cards */}
      {showKpiCards && (
        <AttendanceKpiHeader
          totalEmployeesStat={totalEmployeesStat}
          avgWorkingHoursFormatted={avgWorkingHoursFormatted}
          punctualArrivalRate={punctualArrivalRate}
          earlyCheckoutRate={earlyCheckoutRate}
        />
      )}

      {/* Main Content Area depending on Sub-Tab */}
      <div className="w-full px-4 md:px-6">
        {subTab === 'upload' && (
          <AttendanceUploadView
            handleUploadSubmit={handleUploadSubmit}
            uploadFinancialYear={uploadFinancialYear}
            setUploadFinancialYear={setUploadFinancialYear}
            uploadMonth={uploadMonth}
            setUploadMonth={setUploadMonth}
            uploadWeek={uploadWeek}
            setUploadWeek={setUploadWeek}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            handleFileSelect={handleFileSelect}
            uploading={uploading}
            fileValidationError={fileValidationError}
            setFileValidationError={setFileValidationError}
            previewRows={previewRows}
            setPreviewRows={setPreviewRows}
            previewColDefs={previewColDefs}
            onDownloadSample={handleDownloadSample}
          />
        )}

        {subTab === 'data' && (
          <AttendanceDataListView
            dataFilterWing={dataFilterWing}
            setDataFilterWing={setDataFilterWing}
            dataFilterMonth={dataFilterMonth}
            setDataFilterMonth={setDataFilterMonth}
            dataFilterYear={dataFilterYear}
            setDataFilterYear={setDataFilterYear}
            dataFilterWeek={dataFilterWeek}
            setDataFilterWeek={setDataFilterWeek}
            availableWings={availableWings}
            availableMonths={availableMonths}
            availableYears={availableYears}
            availableWeeks={availableWeeks}
            handleCopyData={handleCopyData}
            handleExportExcel={handleExportExcel}
            handleExportPdf={handleExportPdf}
            pageSize={pageSize}
            setPageSize={setPageSize}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            fetchError={fetchError}
            fetchFilesAndData={fetchFilesAndData}
            loading={loading}
            filteredEmployeeRows={filteredEmployeeRows}
            employeeColDefs={employeeColDefs}
            pinnedBottomRowData={pinnedBottomRowData}
          />
        )}

        {subTab === 'files' && (
          <AttendanceFilesHistoryView
            filesList={filesList}
            pageSize={pageSize}
            setPageSize={setPageSize}
            historyColDefs={historyColDefs}
            loading={loading}
          />
        )}

        {subTab === 'report' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Top Header Line in Detailed Mode: Back Button + Centered Form Title Heading */}
            {reportViewMode === 'detail' && (
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200/80 pb-3.5 -mt-1 select-none min-h-[50px]">
                <button
                  type="button"
                  onClick={() => setReportViewMode('summary')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer flex items-center space-x-1.5 font-bold text-xs shadow-2xs self-start md:self-auto flex-shrink-0 z-10"
                >
                  <ChevronLeft size={16} />
                  <span>Back to Abstract Summary</span>
                </button>

                <div className="text-center w-full md:absolute md:inset-x-0 md:top-0 space-y-0.5 pointer-events-none">
                  <h2 className="text-lg font-black text-slate-900 tracking-wide font-display">
                    Form No.: 1.3B - Detailed - Attendance Sheet
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-extrabold">
                    <span className="text-[#0f417a]">For {selectedWing || 'Administration'} (Wing)</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-semibold">(Report For the Week({reportWeek}) - {reportMonth} - {reportYear})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Report Filters Panel inside Table Section */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 transition-all shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2 text-slate-800 font-extrabold text-xs uppercase tracking-wide mr-1 select-none">
                    <Filter size={14} className="text-[#0f417a]" />
                    <span>Report Filters:</span>
                  </div>

                  {/* Month Filter */}
                  <div className="relative">
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer shadow-2xs"
                    >
                      <option value="January">January</option>
                      <option value="February">February</option>
                      <option value="March">March</option>
                      <option value="April">April</option>
                      <option value="May">May</option>
                      <option value="June">June</option>
                      <option value="July">July</option>
                      <option value="August">August</option>
                      <option value="September">September</option>
                      <option value="October">October</option>
                      <option value="November">November</option>
                      <option value="December">December</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Year Filter */}
                  <div className="relative">
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(e.target.value)}
                      className="text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer shadow-2xs"
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Week Filter */}
                  <div className="relative">
                    <select
                      value={reportWeek}
                      onChange={(e) => setReportWeek(Number(e.target.value))}
                      className="text-xs pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 cursor-pointer shadow-2xs"
                    >
                      <option value={1}>Week 1</option>
                      <option value={2}>Week 2</option>
                      <option value={3}>Week 3</option>
                      <option value={4}>Week 4</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Fetch Button */}
                <button
                  type="button"
                  onClick={() => handleFetchReport(reportMonth, reportYear, reportWeek, true)}
                  className="px-4 py-2 bg-[#0f417a] hover:bg-[#0c3361] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Fetch Report</span>
                </button>
              </div>
            </div>

            {reportViewMode === 'detail' ? (
              <div className="space-y-6 animate-fade-in">
                {/* Copy Button, Export Dropdown, Page Size Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 ml-auto">
                    <CopyButton onCopy={handleCopyData} color="#4b2424" hoverBg="#fdf8f6" />
                    <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#4b2424" hoverColor="#381b1b" />
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                      <span>Show</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold focus:outline-none text-slate-700 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span>entries</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Abstract Summary Report (Week {
                    reportWeek}, {reportMonth} {reportYear})
                  </h3>
                </div>

                <div className="flex items-center space-x-3">
                  <CopyButton onCopy={handleCopyData} color="#4b2424" hoverBg="#fdf8f6" />
                  <ExportDropdown onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} color="#4b2424" hoverColor="#381b1b" />
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold focus:outline-none text-slate-700 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span>entries</span>
                  </div>
                </div>
              </div>
            )}

            {fetchError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-800 animate-fade-in shadow-xs">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <div className="font-extrabold text-xs uppercase tracking-wide">Data Fetch Failure</div>
                    <div className="text-xs text-rose-600 font-medium">{fetchError}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchReport(reportMonth, reportYear, reportWeek, true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5 flex-shrink-0 shadow-xs"
                >
                  <RefreshCw size={14} />
                  <span>Retry Fetch</span>
                </button>
              </div>
            )}

            <div className="relative min-h-[350px] yp-pro-grid ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-hidden">
              {reportViewMode === 'summary' ? (
                <Table 
                  ref={gridRef}
                  rowData={activeReportData}
                  columnDefs={reportColDefs}
                  loading={reportLoading || detailLoading}
                  pagination={true}
                  paginationPageSize={pageSize}
                  domLayout="autoHeight"
                  pinnedBottomRowData={pinnedBottomRowData}
                  onCellClicked={handleCellClick}
                  color="#4b2424"
                />
              ) : (
                <Table 
                  ref={gridRef}
                  rowData={detailData}
                  columnDefs={detailColDefs}
                  loading={reportLoading || detailLoading}
                  pagination={true}
                  paginationPageSize={pageSize}
                  domLayout="autoHeight"
                  color="#4b2424"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
