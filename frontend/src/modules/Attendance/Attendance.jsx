import { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  UserCheck, 
  ChevronLeft, 
  ChevronDown, 
  FileSpreadsheet, 
  FileCheck, 
  Search,
  Calendar,
  Upload,
  Download,
  Trash2,
  X,
  TrendingUp,
  RefreshCw,
  Users,
  Edit3,
  Check
} from 'lucide-react';
import Table from '../../components/Table';
import ExportDropdown from '../../components/ExportDropdown';
import CopyButton from '../../components/CopyButton';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function colorFromString(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

// Formats initials for employee avatar badges
function getInits(n) {
  return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
}

// Formats full ISO datetime string, decimal numbers, or time strings to clean time string "09:30:00"
function formatTimeStr(val) {
  if (val === null || val === undefined || val === '') return '—';

  // Handle numeric float or integer values (e.g. 8.5, -8.5, or 0.354 day fraction)
  if (typeof val === 'number') {
    if (isNaN(val)) return '—';
    const absVal = Math.abs(val);
    if (absVal === 0) return '00:00:00';
    // If Excel fraction of day (e.g. 0.354)
    if (absVal > 0 && absVal < 1) {
      const totalSeconds = Math.round(absVal * 24 * 60 * 60);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    // If decimal hours (e.g. 8.5)
    if (absVal <= 24) {
      const totalSeconds = Math.round(absVal * 3600);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return String(absVal);
  }

  if (typeof val === 'string') {
    let cleanVal = val.trim();
    // Strip leading minus sign if present
    if (cleanVal.startsWith('-')) {
      cleanVal = cleanVal.substring(1).trim();
    }
    if (cleanVal.includes('T')) {
      const parts = cleanVal.split('T');
      if (parts[1]) {
        return parts[1].slice(0, 8);
      }
    } else if (cleanVal.includes(' ')) {
      const parts = cleanVal.split(' ');
      if (parts[1]) {
        return parts[1].slice(0, 8);
      }
    }
    // Check if string is a numeric representation (e.g., "-8.5" or "8.5")
    const parsedNum = Number(cleanVal);
    if (!isNaN(parsedNum) && cleanVal.indexOf(':') === -1) {
      return formatTimeStr(parsedNum);
    }
    return cleanVal || '—';
  }

  // Handle Date objects
  if (val instanceof Date) {
    return val.toTimeString().split(' ')[0];
  }
  return String(val);
}

export default function AttendanceView() {
  const [subTab, setSubTab] = useState('report'); // 'report' | 'data' | 'files' | 'upload'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data lists from DB
  const [filesList, setFilesList] = useState([]);
  const [employeeRows, setEmployeeRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Upload states & file data preview
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadFinancialYear, setUploadFinancialYear] = useState('');
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadWeek, setUploadWeek] = useState('');

  // Toast notification states
  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState('#3B82F6');
  const [toastVisible, setToastVisible] = useState(false);

  // View Data tab filter states
  const [dataFilterWing, setDataFilterWing] = useState('All');
  const [dataFilterMonth, setDataFilterMonth] = useState('All');
  const [dataFilterYear, setDataFilterYear] = useState('All');
  const [viewDataReportType, setViewDataReportType] = useState('monthly'); // 'monthly' | 'yearly'

  // Update employee record modal state
  const [editRecord, setEditRecord] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // ---- ABSTRACT REPORT TAB STATE ----
  const [reportType, setReportType] = useState('weekly'); // 'weekly' | 'yearly'
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

  const showToast = (msg, color = '#3B82F6') => {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // ---- FETCH FROM DATABASE ----
  const fetchFilesAndData = () => {
    setLoading(true);
    
    // Fetch uploaded files list
    const p1 = axios.get(`${API_BASE_URL}/attendance`)
      .then(res => setFilesList(res.data || []))
      .catch(err => console.error("Error fetching files list:", err));

    // Fetch parsed employee excel rows
    const p2 = axios.get(`${API_BASE_URL}/excelData`)
      .then(res => setEmployeeRows(res.data || []))
      .catch(err => console.error("Error fetching employee attendance rows:", err));

    Promise.all([p1, p2]).finally(() => setLoading(false));
  };

  // ---- CONNECT WITH DB (CHECK LATEST FILE) ----
  // Runs once on mount to find the latest uploaded parameters in DB
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
          
          // Fetch abstract report for these parameters
          setReportLoading(true);
          axios.get(`${API_BASE_URL}/employee-attendance-weekone-report/${latestMonth}/${latestYear}/${latestWeek}`)
            .then(r => setReportData(r.data.rowData || []))
            .catch(e => console.error("Report fetch error:", e))
            .finally(() => setReportLoading(false));
        } else {
          // Fallback if no records found in DB yet
          handleFetchReport();
        }
      })
      .catch(err => {
        console.error("Latest file parameters fetch error:", err);
        // Fallback to fetch report with initial state
        handleFetchReport();
      });
  }, []);

  // Fetch report based on user filter selections
  const handleFetchReport = () => {
    setReportLoading(true);
    setReportViewMode('summary'); // Switch back to summary when fetching new parameters
    axios.get(`${API_BASE_URL}/employee-attendance-weekone-report/${reportMonth}/${reportYear}/${reportWeek}`)
      .then(res => {
        setReportData(res.data.rowData || []);
      })
      .catch(err => {
        console.error("Report fetch error:", err);
        setReportData([]);
        showToast("⚠ No data available for this selection", "#F59E0B");
      })
      .finally(() => {
        setReportLoading(false);
      });
  };

  // Dynamically populate Year Dropdown Options matching the logic in old code
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2022; y <= currentYear + 1; y++) {
      years.push(String(y));
    }
    return years.reverse(); // Newest first
  }, []);

  // ---- KPI CARD METRICS ----
  const avgAttendancePct = useMemo(() => {
    if (employeeRows.length === 0) return '—';
    const totalDaysMarked = employeeRows.reduce((acc, row) => acc + (row.AttendanceMarked || 0), 0);
    const avg = (totalDaysMarked / (employeeRows.length * 30)) * 100;
    return avg.toFixed(2) + '%';
  }, [employeeRows]);

  const avgDaysPresent = useMemo(() => {
    if (employeeRows.length === 0) return '—';
    const sum = employeeRows.reduce((acc, row) => acc + (row.AttendanceMarked || 0), 0);
    return (sum / employeeRows.length).toFixed(1) + ' Days';
  }, [employeeRows]);

  // Aggregate yearly report rows from employee database records
  const yearlyReportRows = useMemo(() => {
    if (!employeeRows || employeeRows.length === 0) return [];
    
    // Filter employee rows by selected year
    const yearFiltered = employeeRows.filter(r => String(r.Year || '') === String(reportYear));
    if (yearFiltered.length === 0) return [];

    const wingMap = {};
    yearFiltered.forEach(r => {
      const wing = r.Wing || 'Unassigned';
      if (!wingMap[wing]) {
        wingMap[wing] = {
          Wing: wing,
          empIds: new Set(),
          hoursSum: 0,
          hoursCount: 0,
          less8Count: 0,
          before930Count: 0,
          after930Count: 0,
          before530Count: 0,
        };
      }
      const item = wingMap[wing];
      if (r.EmpId) item.empIds.add(r.EmpId);
      
      const hrs = parseFloat(r.WorkingHours) || 0;
      if (hrs > 0) {
        item.hoursSum += hrs;
        item.hoursCount += 1;
      }
      if (hrs > 0 && hrs < 8.5) item.less8Count += 1;
      
      const inTime = r.InTimeAvg || '';
      const outTime = r.OutTimeAvg || '';
      if (inTime) {
        const timePart = formatTimeStr(inTime);
        if (timePart < '09:30:00') item.before930Count += 1;
        else item.after930Count += 1;
      }
      if (outTime) {
        const timePart = formatTimeStr(outTime);
        if (timePart < '17:30:00') item.before530Count += 1;
      }
    });

    return Object.values(wingMap).map(w => ({
      Wing: w.Wing,
      'Number Of Employees': w.empIds.size || 1,
      'Average Working Hours': w.hoursCount > 0 ? parseFloat((w.hoursSum / w.hoursCount).toFixed(1)) : 0,
      'Number Of Employees - Average Working Hours Less Than 8 1/2 hrs': w.less8Count,
      'Number Of Employees InTime Before 9:30AM': w.before930Count,
      'Number Of Employees InTime After 9:30AM': w.after930Count,
      'Number Of Employees OutTime before 5:30PM': w.before530Count,
    }));
  }, [employeeRows, reportYear]);

  // Active report data depending on report mode (Weekly vs Yearly)
  const activeReportData = useMemo(() => {
    if (reportType === 'yearly') {
      return yearlyReportRows;
    }
    return reportData;
  }, [reportType, yearlyReportRows, reportData]);

  // ---- REPORT AGGREGATES ----
  const aggregates = useMemo(() => {
    if (!activeReportData || activeReportData.length === 0) return null;
    let totalEmployees = 0;
    let sumHours = 0;
    let countHours = 0;
    let totalLess8 = 0;
    let totalBefore930 = 0;
    let totalAfter930 = 0;
    let totalBefore530 = 0;

    activeReportData.forEach(row => {
      const emp = Number(row['Number Of Employees']) || 0;
      const hrs = parseFloat(row['Average Working Hours']) || 0;
      totalEmployees += emp;
      if (hrs > 0) {
        sumHours += hrs * emp;
        countHours += emp;
      }
      totalLess8 += Number(row['Number Of Employees - Average Working Hours Less Than 8 1/2 hrs']) || 0;
      totalBefore930 += Number(row['Number Of Employees InTime Before 9:30AM']) || 0;
      totalAfter930 += Number(row['Number Of Employees InTime After 9:30AM']) || 0;
      totalBefore530 += Number(row['Number Of Employees OutTime before 5:30PM']) || 0;
    });

    const avgHours = countHours > 0 ? (sumHours / countHours).toFixed(1) : '0.0';
    return {
      totalEmployees,
      avgHours,
      totalLess8,
      totalBefore930,
      totalAfter930,
      totalBefore530
    };
  }, [activeReportData]);

  // ---- FILE DATA PREVIEW PARSER ----
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (!file) {
      setPreviewRows([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        setPreviewRows(rows || []);
        if (rows && rows.length > 0) {
          showToast(`📊 Loaded preview of ${rows.length} rows from spreadsheet`, "#3B82F6");
        }
      } catch (err) {
        console.error("Preview parse error:", err);
        setPreviewRows([]);
        showToast("⚠ Could not parse file preview", "#F59E0B");
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return filesList;
    return filesList.filter(f => 
      (f.file_name || '').toLowerCase().includes(q) ||
      (f.date_of_upload || '').toLowerCase().includes(q)
    );
  }, [filesList, searchTerm]);

  // Dynamic Wing options derived from employee records
  const wingOptions = useMemo(() => {
    const wings = new Set(employeeRows.map(r => r.Wing).filter(Boolean));
    return Array.from(wings).sort();
  }, [employeeRows]);

  const filteredEmployeeRows = useMemo(() => {
    let result = employeeRows;

    if (dataFilterWing !== 'All') {
      result = result.filter(r => String(r.Wing || '').toLowerCase() === dataFilterWing.toLowerCase());
    }

    if (viewDataReportType === 'monthly' && dataFilterMonth !== 'All') {
      result = result.filter(r => String(r.Month || '').toLowerCase() === dataFilterMonth.toLowerCase());
    }

    if (dataFilterYear !== 'All') {
      result = result.filter(r => String(r.Year || '') === String(dataFilterYear));
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(r => 
        (r.EmpName || '').toLowerCase().includes(q) ||
        (r.Designation || '').toLowerCase().includes(q) ||
        (r.Wing || '').toLowerCase().includes(q) ||
        (r.Division || '').toLowerCase().includes(q) ||
        String(r.EmpId).toLowerCase().includes(q)
      );
    }

    return result;
  }, [employeeRows, viewDataReportType, dataFilterWing, dataFilterMonth, dataFilterYear, searchTerm]);

  // ---- FILE ACTIONS ----
  const handleDownloadFile = (id, fileName) => {
    axios.get(`${API_BASE_URL}/attendance/download/${id}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || 'attendance.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => {
        console.error("Download error:", err);
        showToast("❌ Failed to download file", "#EF4444");
      });
  };

  const handleDeleteFile = (id) => {
    if (!window.confirm("Deleting the record will also delete all employee rows parsed from this file. Are you sure you want to delete?")) return;
    
    axios.delete(`${API_BASE_URL}/attendance/${id}`)
      .then(() => {
        showToast("✅ Attendance record deleted successfully", "#10B981");
        fetchFilesAndData();
        setReportData([]); // clear report cache
      })
      .catch(err => {
        console.error("Delete error:", err);
        showToast("❌ Failed to delete record", "#EF4444");
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
        console.error("Template download error:", err);
        showToast("❌ Failed to download sample template", "#EF4444");
      });
  };

  // ---- COPY REPORT TO CLIPBOARD (YP REPLICATED ENGINE) ----
  const handleCopy = () => {
    if (!gridRef.current?.api) return;
    let tsv = '';
    const activeCols = (reportViewMode === 'summary' ? reportColDefs : detailColDefs)
      .filter(c => c.headerName && c.field !== 'S.No');
    tsv += activeCols.map(c => c.headerName).join('\t') + '\n';
    
    let index = 1;
    gridRef.current.api.forEachNodeAfterFilterAndSort((node) => {
      const row = node.data;
      if (!row) return;
      const rowTsv = activeCols.map(col => {
        let val = '';
        if (col.field === 'S.No') val = index++;
        else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
        else val = row[col.field] !== undefined ? row[col.field] : '';
        val = String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
        return val;
      }).join('\t');
      tsv += rowTsv + '\n';
    });
    
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('📋 Report copied to clipboard!', '#10B981');
    }).catch(err => {
      console.error('Copy failed', err);
    });
  };

  // ---- EXPORT REPORT TO EXCEL / PDF (YP REPLICATED ENGINE) ----
  const handleExport = (type) => {
    const title = reportViewMode === 'summary' 
      ? `Form_1.3A_Abstract_Attendance_Week_${reportWeek}_${reportMonth}_${reportYear}`
      : detailTitle.replace(/\s+/g, '_');

    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `${title}_export.csv`
        });
        showToast('📈 Report exported to CSV successfully!', '#10B981');
      }
    } else if (type === 'PDF') {
      showToast('📄 Preparing PDF document...', '#4b2424');
      const printWindow = window.open('', '_blank');
      const cols = reportViewMode === 'summary' ? reportColDefs : detailColDefs;

      let headersHtml = '';
      cols.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid #4b2424; padding:10px 14px; text-align:left; background:#4b2424; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      const activeRows = reportViewMode === 'summary' ? reportData : detailData;
      activeRows.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8faf6';
        rowsHtml += `<tr style="background:${bg}">`;
        cols.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S.No') val = i + 1;
            else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
            else val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      // Include totals row for summary print layout
      if (reportViewMode === 'summary' && aggregates) {
        rowsHtml += `<tr style="background:#f1f5f9; font-weight:800; border-top: 2px solid #D3D6D9;">
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;"></td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">Total</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalEmployees}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.avgHours}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalLess8}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalBefore930}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalAfter930}</td>
          <td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424; text-align:center;">${aggregates.totalBefore530}</td>
        </tr>`;
      }

      printWindow.document.write(`<html><head><title>${title.replace(/_/g, ' ')}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#4b2424;padding:24px}h1{font-size:18px;margin-bottom:4px;color:#4b2424}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${title.replace(/_/g, ' ')}</h1><p style="font-size:11px;color:#657386;margin:0 0 20px">Generated on: ${new Date().toLocaleDateString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
      printWindow.document.close();
    }
  };

  // ---- EXPORT RAW EMPLOYEE DATA TO EXCEL / PDF (MATCHING SCREENSHOT ACTION) ----
  const handleExportRawData = (type) => {
    const title = `Employee_Attendance_Raw_Records_${reportMonth}_${reportYear}`;
    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `${title}_export.csv`
        });
        showToast('📈 Raw data exported to CSV successfully!', '#10B981');
      }
    } else if (type === 'PDF') {
      showToast('📄 Preparing PDF document...', '#4b2424');
      const printWindow = window.open('', '_blank');
      const cols = colDefs;

      let headersHtml = '';
      cols.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid #4b2424; padding:10px 14px; text-align:left; background:#4b2424; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredEmployeeRows.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8faf6';
        rowsHtml += `<tr style="background:${bg}">`;
        cols.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S.No') val = i + 1;
            else if (col.valueFormatter) val = col.valueFormatter({ value: row[col.field], data: row });
            else val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`<html><head><title>${title.replace(/_/g, ' ')}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#4b2424;padding:24px}h1{font-size:18px;margin-bottom:4px;color:#4b2424}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${title.replace(/_/g, ' ')}</h1><p style="font-size:11px;color:#657386;margin:0 0 20px">Generated on: ${new Date().toLocaleDateString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
      printWindow.document.close();
    }
  };

  // ---- EXPORT UPLOAD HISTORY FILE LIST TO EXCEL / PDF (MATCHING SCREENSHOT ACTION) ----
  const handleExportHistory = (type) => {
    const title = 'History_Of_Employee_Attendance_File_Uploaded';
    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `${title}_export.csv`
        });
        showToast('📈 Upload history exported to CSV successfully!', '#10B981');
      }
    } else if (type === 'PDF') {
      showToast('📄 Preparing PDF document...', '#4b2424');
      const printWindow = window.open('', '_blank');
      const cols = historyColDefs.filter(c => c.headerName !== 'Actions');

      let headersHtml = '';
      cols.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border:1px solid #4b2424; padding:10px 14px; text-align:left; background:#4b2424; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredFiles.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8faf6';
        rowsHtml += `<tr style="background:${bg}">`;
        cols.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S.No') val = i + 1;
            else if (col.field === 'file_name') val = row.file_name;
            else if (col.headerName === 'Uploaded By') val = 'Sandeep Gupta';
            else if (col.field === 'date_of_upload') val = formatDate(row.date_of_upload);
            rowsHtml += `<td style="border:1px solid #D3D6D9; padding:8px 14px; font-size:12px; color:#4b2424;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`<html><head><title>${title.replace(/_/g, ' ')}</title><style>body{font-family:'Inter',system-ui,sans-serif;color:#4b2424;padding:24px}h1{font-size:18px;margin-bottom:4px;color:#4b2424}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><h1>${title.replace(/_/g, ' ')}</h1><p style="font-size:11px;color:#657386;margin:0 0 20px">Generated on: ${new Date().toLocaleDateString()}</p><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
      printWindow.document.close();
    }
  };

  // ---- DRILL DOWN REPLACE-UI ACTION (NO OVERLAYS) ----
  const handleCellClick = (row, type, label) => {
    setDetailTitle(`${label} - ${row.Wing}`);
    setDetailLoading(true);
    setReportViewMode('detail'); // Swap summary table view with detail table view directly in page
    
    axios.get(`${API_BASE_URL}/employee-attendance-weekone-detail/${reportYear}/${reportMonth}/${row.WingID}/null/${type}/${reportWeek}`)
      .then(res => {
        setDetailData(res.data.rowData || []);
      })
      .catch(err => {
        console.error("Detail error:", err);
        setDetailData([]);
        showToast("⚠ No detail data available", "#F59E0B");
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  // ---- UPLOAD FLOW ----
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadFinancialYear) { showToast("⚠ Please select Financial Year", "#F59E0B"); return; }
    if (!uploadMonth) { showToast("⚠ Please select Month", "#F59E0B"); return; }
    if (!uploadWeek) { showToast("⚠ Please select Week", "#F59E0B"); return; }
    if (!selectedFile) { showToast("⚠ Please select an Excel file", "#F59E0B"); return; }
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("financialYear", uploadFinancialYear);
    formData.append("month", uploadMonth);
    formData.append("week", uploadWeek);
    
    axios.post(`${API_BASE_URL}/attendance`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
      .then(res => {
        const id = res.data.id;
        showToast("📁 Parsing file and storing spreadsheet rows...", "#3B82F6");
        return axios.post(`${API_BASE_URL}/attendance/storecsv/${id}`);
      })
      .then(() => {
        showToast("✅ Attendance sheets uploaded and stored successfully", "#10B981");
        setSelectedFile(null);
        setPreviewRows([]);
        setUploadFinancialYear('');
        setUploadMonth('');
        setUploadWeek('');
        fetchFilesAndData();
        setReportData([]); // clear report cache
        setSubTab('files'); // Switch to history view to see uploaded file listed
      })
      .catch(err => {
        console.error("Upload error:", err);
        showToast(err.response?.data?.error || "❌ File upload failed. Check spreadsheet format.", "#EF4444");
      })
      .finally(() => {
        setUploading(false);
      });
  };

  // Helper date formatter to dd/mm/yyyy
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // ---- AG GRID COLUMNS FOR RAW EMPLOYEE RECORDS (MATCHING SCREENSHOT LAYOUT) ----
  const colDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => params.node.rowIndex + 1, 
      width: 65, 
      minWidth: 65,
      pinned: 'left', 
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' 
    },
    { 
      field: 'EmpId', 
      headerName: 'EMP ID', 
      flex: 1.4,
      minWidth: 125, 
      pinned: 'left', 
      cellClass: 'font-mono font-bold text-slate-800 flex items-center justify-center' 
    },
    { 
      field: 'EmpName', 
      headerName: 'EMP Name', 
      flex: 2.8,
      minWidth: 230, 
      cellClass: 'font-extrabold text-slate-900 flex items-center text-left',
      cellRenderer: (params) => (
        <div className="flex items-center gap-2 truncate">
          <div className="avatar flex-shrink-0" style={{ 
            background: colorFromString(params.value || ''), 
            width: '26px', 
            height: '26px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            fontWeight: 700, 
            fontSize: '.65rem' 
          }}>
            {getInits(params.value || '')}
          </div>
          <span className="truncate">{params.value}</span>
        </div>
      )
    },
    { field: 'Designation', headerName: 'Designation', flex: 2, minWidth: 180, cellClass: 'flex items-center text-left' },
    { field: 'Wing', headerName: 'Wing', flex: 1.6, minWidth: 150, cellClass: 'flex items-center text-left' },
    { field: 'Division', headerName: 'Division', flex: 1.6, minWidth: 150, cellClass: 'flex items-center text-left' },
    { 
      field: 'AttendanceMarked', 
      headerName: 'Days Attendance Marked', 
      flex: 2.2, 
      minWidth: 210, 
      wrapHeaderText: true,
      autoHeaderHeight: true,
      type: 'numericColumn', 
      cellClass: 'text-center font-bold text-slate-700 flex items-center justify-center' 
    },
    { 
      field: 'WorkingHours', 
      headerName: 'Average Working Hours', 
      flex: 2.1, 
      minWidth: 200, 
      wrapHeaderText: true,
      autoHeaderHeight: true,
      type: 'numericColumn', 
      cellClass: 'text-center font-bold text-blue-700 flex items-center justify-center', 
      valueFormatter: (params) => formatTimeStr(params.value) 
    },
    { 
      field: 'InTimeAvg', 
      headerName: 'In Time Avg', 
      flex: 1.6, 
      minWidth: 150, 
      type: 'numericColumn', 
      cellClass: 'text-center font-medium text-emerald-600 flex items-center justify-center', 
      valueFormatter: (params) => formatTimeStr(params.value) 
    },
    { 
      field: 'OutTimeAvg', 
      headerName: 'Out Time Avg', 
      flex: 1.6, 
      minWidth: 150, 
      type: 'numericColumn', 
      cellClass: 'text-center font-medium text-amber-600 flex items-center justify-center', 
      valueFormatter: (params) => formatTimeStr(params.value) 
    },
    { field: 'Month', headerName: 'Month', flex: 1.3, minWidth: 120, cellClass: 'text-center flex items-center justify-center' },
    { field: 'Year', headerName: 'Year', flex: 1.1, minWidth: 100, cellClass: 'text-center flex items-center justify-center' },
    { 
      field: 'Week', 
      headerName: 'Week', 
      flex: 1.3, 
      minWidth: 120, 
      cellClass: 'text-center flex items-center justify-center',
      valueFormatter: (params) => params.value ? `Week ${params.value}` : ''
    },
    {
      headerName: 'Actions',
      width: 120,
      minWidth: 120,
      pinned: 'right',
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          onClick={() => {
            setEditRecord({ 
              ...params.data,
              InTimeAvg: formatTimeStr(params.data.InTimeAvg),
              OutTimeAvg: formatTimeStr(params.data.OutTimeAvg),
              WorkingHours: formatTimeStr(params.data.WorkingHours)
            });
            setEditModalOpen(true);
          }}
          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#0f417a] font-bold rounded-lg text-xs border border-blue-200 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
          title="Update Employee Record"
        >
          <Edit3 size={13} />
          <span>Update</span>
        </button>
      )
    }
  ], []);

  // Dynamic column definitions for View Data table (skips Month & Week columns when Year-wise Report mode is selected)
  const activeDataColDefs = useMemo(() => {
    if (viewDataReportType === 'yearly') {
      return colDefs.filter(c => c.field !== 'Month' && c.field !== 'Week');
    }
    return colDefs;
  }, [colDefs, viewDataReportType]);

  // Dynamic column definitions for file preview table
  const previewColDefs = useMemo(() => {
    if (!previewRows || previewRows.length === 0) return [];
    const firstRow = previewRows[0] || {};
    const keys = Object.keys(firstRow);
    return keys.map((key) => ({
      field: key,
      headerName: key,
      flex: key.toLowerCase().includes('name') ? 2.5 : 1.4,
      minWidth: 140,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellClass: 'flex items-center text-xs font-semibold text-slate-800'
    }));
  }, [previewRows]);

  // ---- AG GRID COLUMNS FOR WEEKLY ABSTRACT SUMMARY REPORT (FLEX STRETCHED) ----
  const reportColDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => {
        if (params.data && params.data.Wing === 'Total') return '';
        return params.node.rowIndex + 1;
      }, 
      width: 65, 
      minWidth: 65,
      pinned: 'left', 
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' 
    },
    { 
      field: 'Wing', 
      headerName: 'Wing', 
      flex: 2.2,
      minWidth: 180, 
      pinned: 'left', 
      cellClass: 'font-semibold text-slate-800 flex items-center text-left' 
    },
    { 
      field: 'Number Of Employees', 
      headerName: 'Employees', 
      flex: 1.3,
      minWidth: 130, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-slate-900 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'noOfEmp', 'Number Of Employees')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Average Working Hours', 
      headerName: 'Avg Working Hours', 
      flex: 1.5,
      minWidth: 150, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-blue-700 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'avgWorkHours', 'Average Working Hours')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Number Of Employees - Average Working Hours Less Than 8 1/2 hrs', 
      headerName: 'Avg Hours < 8.5', 
      flex: 1.6,
      minWidth: 160, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-slate-900 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'avgWorkCount', 'Avg Working Hours < 8.5 hrs')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Number Of Employees InTime Before 9:30AM', 
      headerName: 'InTime Before 9:30 AM', 
      flex: 1.7,
      minWidth: 170, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-emerald-600 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'beforeIn', 'InTime Before 9:30 AM')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Number Of Employees InTime After 9:30AM', 
      headerName: 'InTime After 9:30 AM', 
      flex: 1.7,
      minWidth: 170, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-amber-600 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'afterIn', 'InTime After 9:30 AM')}>
            {params.value || 0}
          </span>
        );
      }
    },
    { 
      field: 'Number Of Employees OutTime before 5:30PM', 
      headerName: 'OutTime Before 5:30 PM', 
      flex: 1.7,
      minWidth: 170, 
      cellClass: (params) => params.data && params.data.Wing === 'Total' 
        ? 'text-center flex items-center justify-center font-black text-slate-900 animate-none'
        : 'text-center flex items-center justify-center font-bold text-blue-600 hover:underline cursor-pointer',
      cellRenderer: (params) => {
        if (params.data && params.data.Wing === 'Total') return <span>{params.value}</span>;
        return (
          <span onClick={() => handleCellClick(params.data, 'beforeOut', 'OutTime Before 5:30 PM')}>
            {params.value || 0}
          </span>
        );
      }
    }
  ], [reportMonth, reportYear, reportWeek, aggregates]);

  // ---- AG GRID COLUMNS FOR DRILL DOWN EMPLOYEE DETAIL LIST (FLEX STRETCHED) ----
  const detailColDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => params.node.rowIndex + 1, 
      width: 65, 
      minWidth: 65,
      pinned: 'left', 
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' 
    },
    { 
      field: 'EMP ID', 
      headerName: 'Emp ID', 
      flex: 1.2,
      minWidth: 110, 
      pinned: 'left', 
      cellClass: 'font-mono font-bold text-slate-800 flex items-center justify-center' 
    },
    { 
      field: 'EMP Name', 
      headerName: 'Employee Name', 
      flex: 2.2,
      minWidth: 200, 
      cellClass: 'font-extrabold text-slate-900 flex items-center text-left'
    },
    { field: 'Designation', headerName: 'Designation', flex: 1.6, minWidth: 150, cellClass: 'flex items-center text-left' },
    { 
      headerName: 'Wing / Division', 
      flex: 2,
      minWidth: 180, 
      cellClass: 'flex items-center text-left',
      valueGetter: (params) => {
        const wing = params.data.Wing || '';
        const div = params.data.Division || '';
        return div && div !== '-' ? `${wing} / ${div}` : wing;
      }
    },
    { field: 'No of days Attendance Marked', headerName: 'Days Marked', flex: 1.3, minWidth: 130, type: 'numericColumn', cellClass: 'text-center font-bold text-slate-700 flex items-center justify-center' },
    { field: 'Average Working Hours', headerName: 'Avg Working Hours', flex: 1.5, minWidth: 150, type: 'numericColumn', cellClass: 'text-center font-bold text-blue-700 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) },
    { field: 'In Time Avg', headerName: 'Avg In-Time', flex: 1.3, minWidth: 130, type: 'numericColumn', cellClass: 'text-center font-medium text-emerald-600 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) },
    { field: 'Out Time Avg', headerName: 'Avg Out-Time', flex: 1.3, minWidth: 130, type: 'numericColumn', cellClass: 'text-center font-medium text-amber-600 flex items-center justify-center', valueFormatter: (params) => formatTimeStr(params.value) }
  ], []);

  // ---- AG GRID COLUMNS FOR UPLOADED FILE HISTORY (MATCHING SCREENSHOT LAYOUT) ----
  const historyColDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => params.node.rowIndex + 1, 
      width: 60, 
      minWidth: 60,
      pinned: 'left', 
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' 
    },
    { 
      field: 'file_name', 
      headerName: 'File Name', 
      flex: 3,
      minWidth: 250,
      cellClass: 'font-semibold flex items-center text-left',
      cellRenderer: (params) => (
        <span 
          onClick={() => handleDownloadFile(params.data.id, params.value)}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1.5"
          title="Download File"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <span className="truncate">{params.value}</span>
        </span>
      )
    },
    {
      headerName: 'Uploaded By',
      flex: 2,
      minWidth: 150,
      cellClass: 'flex items-center text-left text-slate-700 font-medium',
      valueGetter: () => 'Sandeep Gupta'
    },
    { 
      field: 'date_of_upload', 
      headerName: 'Date of Upload', 
      flex: 2,
      minWidth: 150,
      cellClass: 'text-center flex items-center justify-center font-medium text-slate-700',
      valueFormatter: (params) => formatDate(params.value)
    },
    {
      headerName: 'Actions',
      width: 110,
      minWidth: 110,
      cellClass: 'text-center flex items-center justify-center gap-1.5',
      cellRenderer: (params) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDownloadFile(params.data.id, params.data.file_name)}
            className="p-1.5 hover:bg-blue-50 text-[#0f417a] rounded-md transition cursor-pointer"
            title="Download Spreadsheet"
          >
            <Download size={15} />
          </button>
          <button
            onClick={() => handleDeleteFile(params.data.id)}
            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition cursor-pointer"
            title="Delete Record"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ], []);

  // Pinned Bottom Totals Row for summary grid
  const pinnedBottomRowData = useMemo(() => {
    if (!aggregates) return [];
    return [{
      Wing: 'Total',
      'Number Of Employees': aggregates.totalEmployees,
      'Average Working Hours': parseFloat(aggregates.avgHours),
      'Number Of Employees - Average Working Hours Less Than 8 1/2 hrs': aggregates.totalLess8,
      'Number Of Employees InTime Before 9:30AM': aggregates.totalBefore930,
      'Number Of Employees InTime After 9:30AM': aggregates.totalAfter930,
      'Number Of Employees OutTime before 5:30PM': aggregates.totalBefore530
    }];
  }, [aggregates]);

  // Determine if top KPI cards should show
  const showKpiCards = useMemo(() => {
    // Show KPI cards ONLY on the main report tab in summary view mode
    return subTab === 'report' && reportViewMode === 'summary';
  }, [subTab, reportViewMode]);

  return (
    <div className="w-full py-4 animate-fade-in text-slate-800 relative">

      {/* Page Heading Row styled with caption in Sagarmanthan Navy Blue (#0f417a) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none px-4 md:px-6 text-left">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Employee Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Manage, parse and monitor employee weekly abstract reports, history uploads, and raw database records.
          </p>
        </div>

        {/* Internal nav tabs on the heading line (replicated brand layout pattern) */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
            <button 
              onClick={() => setSubTab('upload')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'upload' ? 'bg-[#0f417a] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer'}`}
            >
              Upload
            </button>
            <button 
              onClick={() => setSubTab('data')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'data' ? 'bg-[#0f417a] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer'}`}
            >
              Data List
            </button>
            <button 
              onClick={() => { setSubTab('report'); setReportViewMode('summary'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'report' ? 'bg-[#0f417a] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer'}`}
            >
              Report
            </button>
            <button 
              onClick={() => setSubTab('files')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'files' ? 'bg-[#0f417a] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer'}`}
            >
              View Files
            </button>
          </div>

          <button 
            onClick={handleDownloadSample}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            title="Download User Manual excel template"
          >
            <span>User Manual</span>
          </button>
        </div>
      </div>

      {/* KPI Overviews - Hidden when deepdown inside report details */}
      {showKpiCards && (
        <div className="px-4 md:px-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Attendance</span>
                <span className="text-2xl font-black text-[#0f417a] block mt-1">{avgAttendancePct}</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Across all spreadsheet inputs</span>
              </div>
              <div className="p-3.5 bg-blue-50 text-[#0f417a] rounded-xl border border-blue-100">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Uploaded Files</span>
                <span className="text-2xl font-black text-slate-900 block mt-1">{filesList.length}</span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Available for download</span>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Days Marked</span>
                <span className="text-2xl font-black text-amber-700 block mt-1">{avgDaysPresent}</span>
                <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Approved month-wise</span>
              </div>
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container taking absolute full width of parent viewport */}
      {subTab !== 'upload' && (
        <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl shadow-sm overflow-hidden w-full">
          {/* Dynamic content depending on active sub-tab */}
          {subTab === 'report' && (
            /* Report View styled exactly like YP module Reports.jsx page (YP Brown Theme stays on for Report view) */
            <div className="space-y-0">
              
              {/* Unified Header & Toolbar mimicking YP Reports */}
              <div style={{
                background: 'linear-gradient(to right, #fdfcfc, #f7f3f3)',
                padding: '20px 26px',
                borderBottom: '1px solid #eadede',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                
                {/* Back Button or Filters selection */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {reportViewMode === 'detail' ? (
                    <button 
                      onClick={() => setReportViewMode('summary')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#fff', border: '1px solid #eadede',
                        padding: '8px 14px', borderRadius: '9px',
                        fontSize: '11.5px', fontWeight: 'bold', color: '#4b2424',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fcf9f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back to Abstract</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <label style={{ fontSize: '9px', fontWeight: '800', color: '#8c4242', textTransform: 'uppercase', marginBottom: '3px' }}>Month</label>
                        <select 
                          value={reportMonth} 
                          onChange={(e) => setReportMonth(e.target.value)}
                          style={{
                            background: '#fff', border: '1px solid #eadede',
                            padding: '7px 14px', borderRadius: '8px',
                            fontSize: '11px', fontWeight: 'bold', color: '#4b2424',
                            cursor: 'pointer', minWidth: '100px'
                          }}
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
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <label style={{ fontSize: '9px', fontWeight: '800', color: '#8c4242', textTransform: 'uppercase', marginBottom: '3px' }}>Year</label>
                        <select 
                          value={reportYear} 
                          onChange={(e) => setReportYear(e.target.value)}
                          style={{
                            background: '#fff', border: '1px solid #eadede',
                            padding: '7px 14px', borderRadius: '8px',
                            fontSize: '11px', fontWeight: 'bold', color: '#4b2424',
                            cursor: 'pointer', minWidth: '85px'
                          }}
                        >
                          {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <label style={{ fontSize: '9px', fontWeight: '800', color: '#8c4242', textTransform: 'uppercase', marginBottom: '3px' }}>Week</label>
                        <select 
                          value={reportWeek} 
                          onChange={(e) => setReportWeek(Number(e.target.value))}
                          style={{
                            background: '#fff', border: '1px solid #eadede',
                            padding: '7px 14px', borderRadius: '8px',
                            fontSize: '11px', fontWeight: 'bold', color: '#4b2424',
                            cursor: 'pointer', minWidth: '90px'
                          }}
                        >
                          <option value={1}>Week 1</option>
                          <option value={2}>Week 2</option>
                          <option value={3}>Week 3</option>
                          <option value={4}>Week 4</option>
                          <option value={5}>Week 5</option>
                        </select>
                      </div>

                      <button 
                        onClick={handleFetchReport}
                        style={{
                          alignSelf: 'flex-end', height: '31px',
                          background: '#4b2424', color: '#fff', border: 'none',
                          padding: '0 16px', borderRadius: '8px',
                          fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                          transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#6b3535'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#4b2424'}
                      >
                        <RefreshCw size={12} className={reportLoading ? 'animate-spin' : ''} />
                        <span>Fetch Report</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Title display */}
                <div style={{ flex: 1, textAlign: 'center', pointerEvents: 'none' }}>
                  <h3 style={{
                    fontSize: '12.5px', fontWeight: '900', color: '#4b2424',
                    textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0
                  }}>
                    {reportViewMode === 'summary' 
                      ? (reportType === 'yearly' 
                          ? `FORM 1.3A: Total Yearly Abstract Attendance Report (${reportYear})`
                          : `FORM 1.3A: Abstract Attendance - Week ${reportWeek} (${reportMonth} ${reportYear})`
                        )
                      : `Detail View: ${detailTitle}`
                    }
                  </h3>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  
                  {/* Total count badge */}
                  <div style={{
                    background: '#fcf8f8', border: '1px solid #ebdada',
                    padding: '7px 14px', borderRadius: '9px',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <span style={{ fontSize: 12.5, color: '#8c4242', fontWeight: 600 }}>
                      Total <strong style={{ color: '#4b2424', fontFamily: "'JetBrains Mono', monospace" }}>{reportViewMode === 'summary' ? activeReportData.length : detailData.length}</strong>
                    </span>
                  </div>

                  {/* Copy button component */}
                  <CopyButton
                    onCopy={handleCopy}
                    color="#4b2424"
                    hoverBg="#f7f3f3"
                    className="!rounded-[9px] !py-[8px] !px-[14px]"
                  />

                  {/* Export dropdown component */}
                  <ExportDropdown
                    onExportExcel={() => handleExport('Excel')}
                    onExportPdf={() => handleExport('PDF')}
                    color="#4b2424"
                    hoverColor="#6b3535"
                  />

                  {/* Refresh button */}
                  <button
                    onClick={reportViewMode === 'summary' ? handleFetchReport : () => handleCellClick({Wing: detailTitle.split(' - ')[1]}, '', detailTitle.split(' - ')[0])}
                    style={{
                      display: 'flex', alignItems: 'center', justifycontent: 'center',
                      width: 36, height: 36, borderRadius: 9,
                      background: '#fff', border: '1px solid #E4E6E2',
                      cursor: 'pointer', color: '#657386',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4b2424'; e.currentTarget.style.color = '#4b2424'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E4E6E2'; e.currentTarget.style.color = '#657386'; }}
                    title="Refresh Table Data"
                  >
                    <RefreshCw className={`h-4 w-4 ${reportLoading || detailLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

              </div>

              {/* Table Area */}
              <div className="yp-pro-grid ag-theme-quartz w-full border-b border-slate-200">
                {reportViewMode === 'summary' ? (
                  <Table 
                    ref={gridRef}
                    rowData={activeReportData}
                    columnDefs={reportColDefs}
                    pagination={true}
                    paginationPageSize={pageSize}
                    domLayout="autoHeight"
                    pinnedBottomRowData={pinnedBottomRowData}
                    autoSizeStrategy={{
                      type: 'fitGridWidth',
                      defaultMinWidth: 50
                    }}
                    color="#4b2424"
                  />
                ) : (
                  <Table 
                    ref={gridRef}
                    rowData={detailData}
                    columnDefs={detailColDefs}
                    pagination={true}
                    paginationPageSize={pageSize}
                    domLayout="autoHeight"
                    loading={detailLoading}
                    autoSizeStrategy={{
                      type: 'fitGridWidth',
                      defaultMinWidth: 50
                    }}
                    color="#4b2424"
                  />
                )}
              </div>

            </div>
          )}

          {subTab === 'data' && (
            /* View Raw Employee Data rendered with top filter toolbar & FULL width Table Component */
            <div className="space-y-0 pt-0">
              {/* Top Filter Toolbar with Radio Buttons, Wing, Month, Year dropdowns & Search */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200">
                
                {/* Left Side: Radio buttons & Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Radio buttons for View Data Mode (Monthly View vs Year-wise Report) */}
                  <div className="flex items-center space-x-3 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-bold text-[#0f417a] select-none">
                      <input
                        type="radio"
                        name="viewDataReportTypeRadio"
                        value="monthly"
                        checked={viewDataReportType === 'monthly'}
                        onChange={() => setViewDataReportType('monthly')}
                        className="w-3.5 h-3.5 accent-[#0f417a] cursor-pointer"
                      />
                      <span>Monthly View</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-bold text-[#0f417a] select-none">
                      <input
                        type="radio"
                        name="viewDataReportTypeRadio"
                        value="yearly"
                        checked={viewDataReportType === 'yearly'}
                        onChange={() => {
                          setViewDataReportType('yearly');
                          setDataFilterMonth('All');
                        }}
                        className="w-3.5 h-3.5 accent-[#0f417a] cursor-pointer"
                      />
                      <span>Year-wise Report</span>
                    </label>
                  </div>

                  {/* Wing Filter */}
                  <div className="flex flex-col items-start">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase mb-1">Wing</label>
                    <select
                      value={dataFilterWing}
                      onChange={(e) => setDataFilterWing(e.target.value)}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer min-w-[110px]"
                    >
                      <option value="All">All Wings</option>
                      {wingOptions.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month Filter (Skipped / Hidden when Year-wise Report is selected) */}
                  {viewDataReportType === 'monthly' && (
                    <div className="flex flex-col items-start">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase mb-1">Month</label>
                      <select
                        value={dataFilterMonth}
                        onChange={(e) => setDataFilterMonth(e.target.value)}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer min-w-[100px]"
                      >
                        <option value="All">All Months</option>
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
                    </div>
                  )}

                  {/* Year Filter */}
                  <div className="flex flex-col items-start">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase mb-1">Year</label>
                    <select
                      value={dataFilterYear}
                      onChange={(e) => setDataFilterYear(e.target.value)}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer min-w-[85px]"
                    >
                      <option value="All">All Years</option>
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {(dataFilterWing !== 'All' || dataFilterMonth !== 'All' || dataFilterYear !== 'All') && (
                    <button
                      onClick={() => {
                        setDataFilterWing('All');
                        setDataFilterMonth('All');
                        setDataFilterYear('All');
                      }}
                      className="self-end px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Right Side: Search employee input, Update Data & Export button */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search employee attendance..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-xs pl-8 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>

                  {/* Top Toolbar Update & Sync Button */}
                  <button
                    onClick={() => {
                      fetchFilesAndData();
                      showToast("✅ Data list updated & synced from database", "#10B981");
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#0f417a] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Update & Sync Data List"
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : "text-[#0f417a]"} />
                    <span>Update Data</span>
                  </button>

                  <ExportDropdown 
                    onExportExcel={() => handleExportRawData('Excel')}
                    onExportPdf={() => handleExportRawData('PDF')}
                    color="#0f417a"
                    hoverColor="#0c3361"
                  />
                </div>
              </div>

              <div className="attendance-pro-grid ag-theme-quartz w-full border-b border-slate-200">
                <Table 
                  ref={gridRef}
                  rowData={filteredEmployeeRows}
                  columnDefs={activeDataColDefs}
                  pagination={true}
                  paginationPageSize={pageSize}
                  domLayout="autoHeight"
                  quickFilterText={searchTerm}
                  autoSizeStrategy={{
                    type: 'fitGridWidth',
                    defaultMinWidth: 110
                  }}
                  color="#0f417a"
                />
              </div>
            </div>
          )}

          {subTab === 'files' && (
            /* View History Files rendered in AG Grid layout matching user's screenshot */
            <div className="space-y-0 pt-0">
              {/* Top Toolbar with Search and Export button on the right */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 pb-4 bg-slate-50/40 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Uploaded Attendance Files Log
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="relative max-w-xs w-full">
                    <input
                      type="text"
                      placeholder="Search uploaded files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-xs pl-8 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>

                  <ExportDropdown 
                    onExportExcel={() => handleExportHistory('Excel')}
                    onExportPdf={() => handleExportHistory('PDF')}
                    color="#0f417a"
                    hoverColor="#0c3361"
                  />
                </div>
              </div>

              <div className="attendance-pro-grid ag-theme-quartz w-full border-b border-slate-200">
                <Table 
                  ref={gridRef}
                  rowData={filteredFiles}
                  columnDefs={historyColDefs}
                  pagination={true}
                  paginationPageSize={pageSize}
                  domLayout="autoHeight"
                  quickFilterText={searchTerm}
                  autoSizeStrategy={{
                    type: 'fitGridWidth',
                    defaultMinWidth: 50
                  }}
                  color="#0f417a"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'upload' && (
        /* Inline File Upload Form Panel with Financial Year, Month, Week & File Picker (Full Width matching table layout) */
        <div className="p-4 sm:p-6 text-left font-sans animate-fade-in w-full">
          <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-left">
            <div className="flex items-center space-x-3 pb-4 mb-6 border-b border-slate-150">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-[#0f417a] flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-inner">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide font-display">
                  Upload Attendance Sheet
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Select period parameters and choose spreadsheet file to upload.
                </p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-6 w-full">
              {/* Period selection inputs grid matching full container width */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {/* Financial Year Dropdown */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Financial Year<span className="text-rose-500 ml-0.5">*</span>
                  </label>
                  <select
                    required
                    value={uploadFinancialYear}
                    onChange={(e) => setUploadFinancialYear(e.target.value)}
                    className="w-full text-xs px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer shadow-sm"
                  >
                    <option value="">--Select Financial Year--</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2022-2023">2022-2023</option>
                  </select>
                </div>

                {/* Month Dropdown */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Month<span className="text-rose-500 ml-0.5">*</span>
                  </label>
                  <select
                    required
                    value={uploadMonth}
                    onChange={(e) => setUploadMonth(e.target.value)}
                    className="w-full text-xs px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer shadow-sm"
                  >
                    <option value="">--Select Month--</option>
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
                </div>

                {/* Week Dropdown */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Week<span className="text-rose-500 ml-0.5">*</span>
                  </label>
                  <select
                    required
                    value={uploadWeek}
                    onChange={(e) => setUploadWeek(e.target.value)}
                    className="w-full text-xs px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer shadow-sm"
                  >
                    <option value="">--Select Week--</option>
                    <option value="1">Week 1</option>
                    <option value="2">Week 2</option>
                    <option value="3">Week 3</option>
                    <option value="4">Week 4</option>
                    <option value="5">Week 5</option>
                  </select>
                </div>
              </div>

              {/* Select Excel File To Upload & Action Buttons on the exact same line */}
              <div className="pt-2 w-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Excel File To Upload:<span className="text-rose-500 ml-0.5">*</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                  {/* File Selector Input with reduced width */}
                  <div className="w-full sm:w-96 max-w-md">
                    <label className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition-all shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 truncate">
                        <FileSpreadsheet className="h-4 w-4 text-[#0f417a] flex-shrink-0" />
                        <span className="truncate">
                          {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : 'Choose .xlsx or .csv file'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#0f417a] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex-shrink-0 ml-2">
                        Browse
                      </span>
                      <input
                        type="file"
                        accept=".csv, .xlsx"
                        required
                        onChange={(e) => handleFileSelect(e.target.files[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Reset & Upload File Buttons pushed to far right */}
                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewRows([]);
                        setUploadFinancialYear('');
                        setUploadMonth('');
                        setUploadWeek('');
                      }}
                      className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 hover:bg-slate-50 transition-all cursor-pointer h-[42px] flex-1 sm:flex-none"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-6 py-2.5 bg-[#0f417a] hover:bg-[#0c3361] text-white rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer h-[42px] flex-1 sm:flex-none"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          <span>Upload File</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* File Data Preview Table rendered down below upload inputs before confirming upload */}
            {previewRows.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200 w-full animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                        File Data Preview ({previewRows.length} Rows)
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Verify spreadsheet contents below before confirming upload.
                      </p>
                    </div>
                  </div>

                  <span className="self-start sm:self-auto px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 shadow-2xs">
                    Ready for Upload
                  </span>
                </div>

                {/* AG Grid Preview Table */}
                <div className="attendance-pro-grid ag-theme-quartz w-full border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <Table 
                    rowData={previewRows}
                    columnDefs={previewColDefs}
                    pagination={true}
                    paginationPageSize={10}
                    domLayout="autoHeight"
                    autoSizeStrategy={{
                      type: 'fitGridWidth',
                      defaultMinWidth: 100
                    }}
                    color="#0f417a"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Employee Record Modal */}
      {editModalOpen && editRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-[#0f417a] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-5 w-5 text-blue-200" />
                <h3 className="font-bold text-sm">Update Employee Record</h3>
              </div>
              <button 
                onClick={() => setEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Employee ID</label>
                  <input
                    type="text"
                    disabled
                    value={editRecord.EmpId || ''}
                    className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={editRecord.EmpName || ''}
                    onChange={(e) => setEditRecord(prev => ({ ...prev, EmpName: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Designation</label>
                  <input
                    type="text"
                    value={editRecord.Designation || ''}
                    onChange={(e) => setEditRecord(prev => ({ ...prev, Designation: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Wing</label>
                  <input
                    type="text"
                    value={editRecord.Wing || ''}
                    onChange={(e) => setEditRecord(prev => ({ ...prev, Wing: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Division</label>
                  <input
                    type="text"
                    value={editRecord.Division || ''}
                    onChange={(e) => setEditRecord(prev => ({ ...prev, Division: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Days Marked</label>
                  <input
                    type="number"
                    value={editRecord.AttendanceMarked || 0}
                    onChange={(e) => setEditRecord(prev => ({ ...prev, AttendanceMarked: Number(e.target.value) }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">In Time Avg</label>
                  <input
                    type="text"
                    placeholder="HH:MM:SS"
                    value={editRecord.InTimeAvg || ''}
                    onChange={(e) => setEditRecord(prev => ({ ...prev, InTimeAvg: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Out Time Avg</label>
                  <input
                    type="text"
                    placeholder="HH:MM:SS"
                    value={editRecord.OutTimeAvg || ''}
                    onChange={(e) => setEditRecord(prev => ({ ...prev, OutTimeAvg: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-amber-700"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmployeeRows(prev => prev.map(r => (r.id === editRecord.id || (r.EmpId && r.EmpId === editRecord.EmpId)) ? editRecord : r));
                  setEditModalOpen(false);
                  showToast(`✅ Saved updates for ${editRecord.EmpName || 'Employee'}`, "#10B981");
                }}
                className="px-5 py-2 bg-[#0f417a] hover:bg-[#0c3361] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast box */}
      <div className={`toast-box ${toastVisible ? 'show' : ''}`}>
        <div className="tdot" style={{ background: toastColor }}></div>
        <span>{toastMsg}</span>
      </div>

    </div>
  );
}
